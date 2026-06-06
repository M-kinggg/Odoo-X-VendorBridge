import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logActivity } from '../utils/logger.js';
import { Resend } from 'resend';

const router = Router();

// Validation Rules
const generateRules = [
  body('po_id').trim().notEmpty().withMessage('Purchase Order ID is required')
];

const updateRules = [
  body('tax_percent').optional().isFloat({ min: 0, max: 100 }).withMessage('Tax percentage must be between 0 and 100'),
  body('status').optional().isIn(['draft', 'sent', 'paid']).withMessage('Invalid invoice status')
];

const emailRules = [
  body('to').isEmail().withMessage('Please enter a valid recipient email'),
  body('subject').trim().notEmpty().withMessage('Subject is required'),
  body('body').trim().notEmpty().withMessage('Email body is required')
];

// GET /api/invoices
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        purchase_orders (
          po_number,
          vendors (name)
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped = (data || []).map(inv => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      po_number: inv.purchase_orders?.po_number || 'N/A',
      vendor_name: inv.purchase_orders?.vendors?.name || 'N/A',
      amount: inv.total,
      status: inv.status,
      created_at: inv.created_at
    }));

    return res.json(mapped);
  } catch (error) {
    console.error('Error fetching invoices list:', error);
    return res.status(500).json({ message: 'Error retrieving invoices list' });
  }
});

// GET /api/invoices/:id
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: inv, error } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        purchase_orders (
          *,
          vendors (*),
          quotations (*)
        )
      `)
      .eq('id', id)
      .single();

    if (error || !inv) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Fetch items from quotation
    const { data: quoteItems } = await supabaseAdmin
      .from('quotation_items')
      .select('*, rfq_items (*)')
      .eq('quotation_id', inv.purchase_orders?.quotation_id);

    return res.json({
      ...inv,
      po: inv.purchase_orders,
      vendor: inv.purchase_orders?.vendors,
      items: quoteItems || []
    });
  } catch (error) {
    console.error('Error fetching invoice details:', error);
    return res.status(500).json({ message: 'Error retrieving invoice details' });
  }
});

// POST /api/invoices (Generate invoice from PO)
router.post('/', [authenticateToken, generateRules], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { po_id } = req.body;

  try {
    // Check if invoice already exists
    const { data: existing } = await supabaseAdmin
      .from('invoices')
      .select('id')
      .eq('po_id', po_id)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ message: 'An invoice has already been generated for this Purchase Order.', invoiceId: existing.id });
    }

    // Fetch PO and Quote total
    const { data: po, error: poError } = await supabaseAdmin
      .from('purchase_orders')
      .select('*, quotations (total_price)')
      .eq('id', po_id)
      .single();

    if (poError || !po) {
      return res.status(404).json({ message: 'Purchase Order reference not found' });
    }

    const subtotal = po.quotations?.total_price || 0.00;
    const taxPercent = 18.00;
    const taxAmount = parseFloat((subtotal * 0.18).toFixed(2));
    const total = parseFloat((subtotal + taxAmount).toFixed(2));
    const invoiceNumber = `INV-2026-${Math.floor(1000 + Math.random() * 9000)}`;

    // Insert invoice
    const { data: inv, error: invError } = await supabaseAdmin
      .from('invoices')
      .insert({
        invoice_number: invoiceNumber,
        po_id,
        tax_percent: taxPercent,
        subtotal,
        tax_amount: taxAmount,
        total,
        status: 'draft',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (invError) throw invError;

    await logActivity(req.user.id, 'GENERATE_INVOICE', 'Invoice', inv.id, `Generated invoice ${invoiceNumber} from PO ID: ${po_id}`);
    return res.status(201).json(inv);
  } catch (error) {
    console.error('Error generating invoice:', error);
    return res.status(500).json({ message: 'Error generating invoice record' });
  }
});

// PUT /api/invoices/:id (Update tax percentage or status)
router.put('/:id', [authenticateToken, updateRules], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { tax_percent, status } = req.body;

  try {
    // Fetch current invoice
    const { data: inv, error: findError } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !inv) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    const updates = {};
    if (status) updates.status = status;
    if (tax_percent !== undefined) {
      const rate = parseFloat(tax_percent);
      const sub = parseFloat(inv.subtotal);
      const tax = parseFloat((sub * (rate / 100)).toFixed(2));
      const tot = parseFloat((sub + tax).toFixed(2));

      updates.tax_percent = rate;
      updates.tax_amount = tax;
      updates.total = tot;
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('invoices')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    await logActivity(req.user.id, 'UPDATE_INVOICE', 'Invoice', id, `Updated invoice parameters (status/tax)`);
    return res.json(updated);
  } catch (error) {
    console.error('Error updating invoice:', error);
    return res.status(500).json({ message: 'Error updating invoice details' });
  }
});

// POST /api/invoices/:id/send-email (HTML invoice email dispatcher using Resend)
router.post('/:id/send-email', [authenticateToken, emailRules], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { to, subject, body } = req.body;
  const resendApiKey = process.env.RESEND_API_KEY;

  if (!resendApiKey) {
    throw new Error('RESEND_API_KEY is not configured. Cannot send email.');
  }

  try {
    // 1. Fetch detailed invoice, PO, vendor and quotation data
    const { data: inv, error: invError } = await supabaseAdmin
      .from('invoices')
      .select(`
        *,
        purchase_orders (
          *,
          vendors (*),
          quotations (*)
        )
      `)
      .eq('id', id)
      .single();

    if (invError || !inv) {
      return res.status(404).json({ message: 'Invoice profile reference not found in database.' });
    }

    // 2. Fetch line items
    const { data: quoteItems } = await supabaseAdmin
      .from('quotation_items')
      .select('*, rfq_items (*)')
      .eq('quotation_id', inv.purchase_orders?.quotation_id);

    // 3. Build HTML Template
    const invoiceDate = new Date(inv.created_at).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const vendor = inv.purchase_orders?.vendors || {};

    const itemsHtml = (quoteItems || []).map(item => `
      <tr style="border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #0f172a;">
        <td style="padding: 12px 0; font-weight: 500;">${item.rfq_items?.product_name || 'N/A'}</td>
        <td style="padding: 12px 0; text-align: center; color: #475569;">${item.rfq_items?.quantity || 1} ${item.rfq_items?.unit || 'pcs'}</td>
        <td style="padding: 12px 0; text-align: right; color: #475569;">$${parseFloat(item.unit_price).toFixed(2)}</td>
        <td style="padding: 12px 0; text-align: right; font-weight: 500;">$${parseFloat(item.total_price).toFixed(2)}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; color: #0f172a; line-height: 1.5;">
        <!-- Header / Logo -->
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 30px; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px;">
          <div style="width: 32px; height: 32px; background-color: #2563eb; border-radius: 8px; display: inline-block; vertical-align: middle; text-align: center; line-height: 32px; color: white; font-weight: bold; font-size: 16px;">VB</div>
          <span style="font-size: 20px; font-weight: 800; tracking-tight: -0.05em; color: #0f172a;">VendorBridge ERP</span>
        </div>
        
        <h2 style="font-size: 24px; font-weight: 800; color: #0f172a; margin-top: 0; margin-bottom: 8px;">Invoice Issued</h2>
        <p style="color: #475569; font-size: 14px; margin-top: 0; margin-bottom: 24px;">Invoice details generated on ${invoiceDate}</p>

        <!-- Invoice Details Row -->
        <div style="display: flex; justify-content: space-between; gap: 20px; margin-bottom: 30px; background-color: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <div>
            <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; tracking-wider: 0.05em;">Invoice Number</p>
            <p style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;">${inv.invoice_number}</p>
          </div>
          <div>
            <p style="margin: 0 0 4px 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; tracking-wider: 0.05em;">Purchase Order</p>
            <p style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;">${inv.purchase_orders?.po_number || 'N/A'}</p>
          </div>
        </div>

        <!-- Billing details -->
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; tracking-wider: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">Billing Details</h3>
          <table style="width: 100%; font-size: 14px;">
            <tr>
              <td style="padding: 4px 0; color: #64748b; width: 140px;">Vendor Name:</td>
              <td style="padding: 4px 0; font-weight: 600;">${vendor.name || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;">GST Number:</td>
              <td style="padding: 4px 0; font-family: monospace; font-weight: 600;">${vendor.gst_number || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Contact Representative:</td>
              <td style="padding: 4px 0;">${vendor.contact_name || 'N/A'} (${vendor.contact_email || 'N/A'})</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #64748b;">Phone Number:</td>
              <td style="padding: 4px 0;">${vendor.contact_phone || 'N/A'}</td>
            </tr>
          </table>
        </div>

        <!-- Line items table -->
        <div style="margin-bottom: 30px;">
          <h3 style="font-size: 12px; text-transform: uppercase; color: #64748b; font-weight: 700; tracking-wider: 0.05em; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px; margin-bottom: 12px;">Invoice Line Items</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0; text-align: left; color: #475569; font-size: 11px; text-transform: uppercase; font-weight: 700;">
                <th style="padding: 10px 0;">Description</th>
                <th style="padding: 10px 0; text-align: center;">Qty</th>
                <th style="padding: 10px 0; text-align: right;">Unit Price</th>
                <th style="padding: 10px 0; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
        </div>

        <!-- Financial Summary -->
        <div style="width: 240px; margin-left: auto; margin-bottom: 40px;">
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Subtotal:</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600;">$${parseFloat(inv.subtotal).toFixed(2)}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; color: #64748b;">Tax (${parseFloat(inv.tax_percent)}%):</td>
              <td style="padding: 8px 0; text-align: right; font-weight: 600;">$${parseFloat(inv.tax_amount).toFixed(2)}</td>
            </tr>
            <tr style="border-top: 2px solid #0f172a;">
              <td style="padding: 12px 0; font-weight: 800; font-size: 16px;">Total Due:</td>
              <td style="padding: 12px 0; text-align: right; font-weight: 800; font-size: 16px; color: #2563eb;">$${parseFloat(inv.total).toFixed(2)}</td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 12px; color: #64748b; text-align: center;">
          <p style="margin: 0 0 4px 0;"><strong>VendorBridge Procurement & Vendor Management Corp.</strong></p>
          <p style="margin: 0 0 16px 0;">100 ERP Way, Suite 400, Corporate Towers</p>
          <p style="margin: 0; color: #94a3b8;">This is an automated invoice dispatch system. For support, please reply to this email or contact support@vendorbridge.com.</p>
        </div>
      </div>
    `;

    // 4. Dispatch email via Resend
    const resend = new Resend(resendApiKey);
    const { data: emailData, error: emailError } = await resend.emails.send({
      from: 'VendorBridge <onboarding@resend.dev>',
      to,
      subject: `VendorBridge Invoice Issued: ${inv.invoice_number}`,
      html: htmlContent
    });

    if (emailError) {
      console.error('Resend API Error:', emailError.message);
      return res.status(500).json({ message: `Resend Email dispatch failed: ${emailError.message}` });
    }

    console.log(`📩 Resend Email Dispatch Success. Message ID: ${emailData?.id}`);
    await logActivity(req.user.id, 'EMAIL_INVOICE', 'Invoice', id, `Dispatched invoice email ${inv.invoice_number} to: ${to}`);
    return res.json({ message: 'Invoice email successfully dispatched via Resend API.', recipient: to, messageId: emailData?.id });
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return res.status(500).json({ message: 'Error sending invoice email notification' });
  }
});

export default router;
