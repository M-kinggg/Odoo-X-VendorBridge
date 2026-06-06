import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logActivity } from '../utils/logger.js';

const router = Router();

// Validation Rules
const approvalRequestRules = [
  body('rfq_id').trim().notEmpty().withMessage('RFQ ID is required'),
  body('quotation_id').trim().notEmpty().withMessage('Quotation ID is required')
];

const approvalActionRules = [
  body('action').isIn(['approved', 'rejected']).withMessage('Action must be approved or rejected'),
  body('remarks').trim().custom((value, { req }) => {
    if (req.body.action === 'rejected' && (!value || value.length === 0)) {
      throw new Error('Remarks are required when rejecting a quotation.');
    }
    return true;
  })
];

// GET /api/approvals (filter by status)
router.get('/', authenticateToken, async (req, res) => {
  const { status } = req.query;

  try {
    let query = supabaseAdmin
      .from('approvals')
      .select(`
        *,
        rfqs (title),
        quotations (total_price, vendors (name))
      `);

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;

    // Re-map for the UI
    const mapped = (data || []).map(a => ({
      id: a.id,
      rfq_title: a.rfqs?.title || 'Unknown RFQ',
      vendor_name: a.quotations?.vendors?.name || 'Unknown Vendor',
      quoted_amount: a.quotations?.total_price || 0.00,
      status: a.status,
      created_at: a.created_at
    }));

    return res.json(mapped);
  } catch (error) {
    console.error('Error fetching approvals:', error);
    return res.status(500).json({ message: 'Error retrieving approval listings' });
  }
});

// GET /api/approvals/:id
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: approval, error } = await supabaseAdmin
      .from('approvals')
      .select(`
        *,
        rfqs (*),
        quotations (*, vendors (*))
      `)
      .eq('id', id)
      .single();

    if (error || !approval) {
      return res.status(404).json({ message: 'Approval request not found' });
    }

    // Fetch quotation line items
    const { data: quoteItems } = await supabaseAdmin
      .from('quotation_items')
      .select('*, rfq_items (*)')
      .eq('quotation_id', approval.quotation_id);

    return res.json({
      ...approval,
      quotation: {
        ...approval.quotations,
        vendor: approval.quotations?.vendors,
        items: quoteItems || []
      }
    });
  } catch (error) {
    console.error('Error fetching approval detail:', error);
    return res.status(500).json({ message: 'Error retrieving approval details' });
  }
});

// POST /api/approvals (initiate approval from selected quotation)
router.post('/', [authenticateToken, authorizeRole(['admin', 'procurement_officer']), approvalRequestRules], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { rfq_id, quotation_id } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('approvals')
      .insert({
        rfq_id,
        quotation_id,
        approver_id: req.user.id,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity(req.user.id, 'INITIATE_APPROVAL', 'Approval', data.id, `Initiated quotation approval workflow for RFQ ID: ${rfq_id}`);
    return res.status(201).json(data);
  } catch (error) {
    console.error('Error initiating approval:', error);
    return res.status(500).json({ message: 'Error starting approval request' });
  }
});

// PATCH /api/approvals/:id/action (Approve or Reject)
router.patch('/:id/action', [authenticateToken, authorizeRole(['admin', 'manager']), approvalActionRules], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { action, remarks } = req.body;

  try {
    // 1. Fetch approval details
    const { data: approval, error: findError } = await supabaseAdmin
      .from('approvals')
      .select('*')
      .eq('id', id)
      .single();

    if (findError || !approval) {
      return res.status(404).json({ message: 'Approval request not found' });
    }

    // Update approval entry
    const { error: updateApprovalError } = await supabaseAdmin
      .from('approvals')
      .update({
        status: action,
        remarks,
        actioned_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateApprovalError) throw updateApprovalError;

    const quotationId = approval.quotation_id;
    const rfqId = approval.rfq_id;

    if (action === 'approved') {
      // Fetch quotation detail to know vendor
      const { data: quote } = await supabaseAdmin
        .from('quotations')
        .select('vendor_id')
        .eq('id', quotationId)
        .single();

      // 1. Update quotation status to accepted
      await supabaseAdmin.from('quotations').update({ status: 'accepted' }).eq('id', quotationId);
      
      // 2. Reject other quotations for this RFQ
      await supabaseAdmin
        .from('quotations')
        .update({ status: 'rejected' })
        .eq('rfq_id', rfqId)
        .neq('id', quotationId);

      // 3. Set RFQ status to awarded
      await supabaseAdmin.from('rfqs').update({ status: 'awarded' }).eq('id', rfqId);

      // 4. Create Purchase Order
      const poNumber = `PO-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const { data: po, error: poError } = await supabaseAdmin
        .from('purchase_orders')
        .insert({
          po_number: poNumber,
          rfq_id: rfqId,
          quotation_id: quotationId,
          vendor_id: quote.vendor_id,
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (poError) throw poError;

      await logActivity(req.user.id, 'APPROVE_QUOTATION', 'Approval', id, `Approved quotation. Auto-generated PO: ${poNumber}`);
      return res.json({ message: 'Quotation approved. Purchase Order created successfully.', po });
    } else {
      // Rejected
      await supabaseAdmin.from('quotations').update({ status: 'rejected' }).eq('id', quotationId);
      // Put RFQ back to open
      await supabaseAdmin.from('rfqs').update({ status: 'open' }).eq('id', rfqId);

      await logActivity(req.user.id, 'REJECT_QUOTATION', 'Approval', id, `Rejected quotation proposal. RFQ status set back to Open.`);
      return res.json({ message: 'Quotation rejected.' });
    }
  } catch (error) {
    console.error('Error actioning approval:', error);
    return res.status(500).json({ message: 'Error processing approval action' });
  }
});

export default router;
