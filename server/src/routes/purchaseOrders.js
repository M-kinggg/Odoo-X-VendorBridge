import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logActivity } from '../utils/logger.js';

const router = Router();

// Validation Rules for updates
const poUpdateRules = [
  body('status').isIn(['pending', 'confirmed', 'delivered']).withMessage('Invalid purchase order status')
];

// GET /api/purchase-orders
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('purchase_orders')
      .select(`
        *,
        vendors (name),
        quotations (total_price)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mapped = (data || []).map(po => ({
      id: po.id,
      po_number: po.po_number,
      vendor_name: po.vendors?.name || 'N/A',
      amount: po.quotations?.total_price || 0.00,
      status: po.status,
      created_at: po.created_at
    }));

    return res.json(mapped);
  } catch (error) {
    console.error('Error fetching PO list:', error);
    return res.status(500).json({ message: 'Error retrieving purchase orders' });
  }
});

// GET /api/purchase-orders/:id
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: po, error } = await supabaseAdmin
      .from('purchase_orders')
      .select(`
        *,
        vendors (*),
        quotations (*, rfqs (*))
      `)
      .eq('id', id)
      .single();

    if (error || !po) {
      return res.status(404).json({ message: 'Purchase order not found' });
    }

    // Fetch quotation line items
    const { data: quoteItems } = await supabaseAdmin
      .from('quotation_items')
      .select('*, rfq_items (*)')
      .eq('quotation_id', po.quotation_id);

    // Check if invoice exists
    const { data: invoice } = await supabaseAdmin
      .from('invoices')
      .select('id')
      .eq('po_id', id)
      .maybeSingle();

    return res.json({
      ...po,
      vendor: po.vendors,
      quotation: po.quotations,
      items: quoteItems || [],
      invoiceExists: !!invoice,
      invoiceId: invoice?.id || null
    });
  } catch (error) {
    console.error('Error fetching PO details:', error);
    return res.status(500).json({ message: 'Error retrieving purchase order details' });
  }
});

// PUT /api/purchase-orders/:id (Update PO status)
router.put('/:id', [authenticateToken, poUpdateRules], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { status } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('purchase_orders')
      .update({ status })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(404).json({ message: 'Purchase order not found' });

    await logActivity(req.user.id, 'PO_STATUS_UPDATE', 'PurchaseOrder', id, `Updated Purchase Order status to "${status}"`);
    return res.json(data);
  } catch (error) {
    console.error('Error updating PO:', error);
    return res.status(500).json({ message: 'Error updating purchase order' });
  }
});

export default router;
