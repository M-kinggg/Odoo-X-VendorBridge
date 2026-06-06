import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logActivity } from '../utils/logger.js';

const router = Router();

// Validation Rules
const quotationRules = [
  body('rfq_id').trim().notEmpty().withMessage('RFQ ID is required'),
  body('delivery_days').isInt({ min: 1 }).withMessage('A valid delivery timeline in days is required'),
  body('notes').trim().optional(),
  body('items').isArray({ min: 1 }).withMessage('At least one item quotation price is required'),
  body('items.*.rfq_item_id').trim().notEmpty().withMessage('RFQ Item reference is required'),
  body('items.*.unit_price').isNumeric({ min: 0.01 }).withMessage('A valid unit price is required')
];

// Helper to resolve vendor ID from logged-in user email
const getVendorIdFromUser = async (user) => {
  const { data, error } = await supabaseAdmin
    .from('vendors')
    .select('id')
    .eq('contact_email', user.email)
    .single();
  if (error || !data) return null;
  return data.id;
};

// GET /api/quotations/vendor-portal/rfqs
// Returns RFQs that the logged-in vendor has been invited to
router.get('/vendor-portal/rfqs', [authenticateToken, authorizeRole(['vendor'])], async (req, res) => {
  try {
    const vendorId = await getVendorIdFromUser(req.user);
    if (!vendorId) {
      return res.status(403).json({ message: 'No registered vendor profile linked to this user account.' });
    }

    // Fetch invited rfq vendors
    const { data, error } = await supabaseAdmin
      .from('rfq_vendors')
      .select(`
        rfqs (
          id,
          title,
          description,
          deadline,
          status,
          created_at
        )
      `)
      .eq('vendor_id', vendorId);

    if (error) throw error;

    // Filter null items and fetch items counts
    const rfqs = (data || []).map(d => d.rfqs).filter(r => r !== null);
    
    const mapped = await Promise.all(rfqs.map(async r => {
      const { count } = await supabaseAdmin
        .from('rfq_items')
        .select('*', { count: 'exact', head: true })
        .eq('rfq_id', r.id);

      // Fetch if already quoted
      const { data: quote } = await supabaseAdmin
        .from('quotations')
        .select('status, total_price, id')
        .eq('rfq_id', r.id)
        .eq('vendor_id', vendorId)
        .maybeSingle();

      return {
        ...r,
        itemsCount: count || 0,
        quoteStatus: quote ? quote.status : 'pending',
        quoteId: quote ? quote.id : null,
        quotePrice: quote ? quote.total_price : null
      };
    }));

    return res.json(mapped);
  } catch (error) {
    console.error('Error fetching vendor RFQs:', error);
    return res.status(500).json({ message: 'Error retrieving vendor invitations' });
  }
});

// GET /api/quotations/:id
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: quote, error } = await supabaseAdmin
      .from('quotations')
      .select('*, vendors(*), rfqs(*)')
      .eq('id', id)
      .single();

    if (error || !quote) {
      return res.status(404).json({ message: 'Quotation not found' });
    }

    const { data: items } = await supabaseAdmin
      .from('quotation_items')
      .select('*, rfq_items(*)')
      .eq('quotation_id', id);

    return res.json({ ...quote, items: items || [] });
  } catch (error) {
    console.error('Error fetching quotation details:', error);
    return res.status(500).json({ message: 'Error retrieving quotation details' });
  }
});

// POST /api/quotations (submit quotation + quotation_items)
router.post('/', [authenticateToken, authorizeRole(['vendor']), quotationRules], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { rfq_id, delivery_days, notes, items } = req.body;

  try {
    const vendorId = await getVendorIdFromUser(req.user);
    if (!vendorId) {
      return res.status(403).json({ message: 'No linked vendor profile found' });
    }

    // 1. Check if already submitted
    const { data: existing } = await supabaseAdmin
      .from('quotations')
      .select('id')
      .eq('rfq_id', rfq_id)
      .eq('vendor_id', vendorId)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ message: 'You have already submitted a quotation for this RFQ.' });
    }

    // 2. Fetch RFQ items to compute totals
    const { data: rfqItems } = await supabaseAdmin
      .from('rfq_items')
      .select('id, quantity')
      .eq('rfq_id', rfq_id);

    if (!rfqItems) throw new Error('Could not find RFQ items');

    // Calculate total price
    let grandTotal = 0;
    const quoteItemsToInsert = items.map(item => {
      const rfqItem = rfqItems.find(ri => ri.id === item.rfq_item_id);
      const qty = rfqItem ? parseFloat(rfqItem.quantity) : 1;
      const total = parseFloat(item.unit_price) * qty;
      grandTotal += total;

      return {
        rfq_item_id: item.rfq_item_id,
        unit_price: item.unit_price,
        total_price: total
      };
    });

    // 3. Insert Quotation
    const { data: quote, error: quoteError } = await supabaseAdmin
      .from('quotations')
      .insert({
        rfq_id,
        vendor_id: vendorId,
        total_price: grandTotal,
        delivery_days,
        notes,
        status: 'submitted',
        submitted_at: new Date().toISOString()
      })
      .select()
      .single();

    if (quoteError) throw quoteError;

    // 4. Insert Quotation Items
    const finalizedItems = quoteItemsToInsert.map(item => ({
      ...item,
      quotation_id: quote.id
    }));

    const { error: itemsError } = await supabaseAdmin.from('quotation_items').insert(finalizedItems);
    if (itemsError) throw itemsError;

    await logActivity(req.user.id, 'SUBMIT_QUOTE', 'Quotation', quote.id, `Submitted quotation of $${grandTotal} for RFQ ID: ${rfq_id}`);
    return res.status(201).json(quote);
  } catch (error) {
    console.error('Error submitting quotation:', error);
    return res.status(500).json({ message: 'Error saving quotation proposal details' });
  }
});

// PUT /api/quotations/:id (edit quotation if status is still 'submitted')
router.put('/:id', [authenticateToken, authorizeRole(['vendor']), quotationRules], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { rfq_id, delivery_days, notes, items } = req.body;

  try {
    const vendorId = await getVendorIdFromUser(req.user);
    if (!vendorId) {
      return res.status(403).json({ message: 'No linked vendor profile found' });
    }

    // 1. Check if quotation exists, belongs to vendor, and is still submitted
    const { data: quote, error: findError } = await supabaseAdmin
      .from('quotations')
      .select('status')
      .eq('id', id)
      .eq('vendor_id', vendorId)
      .single();

    if (findError || !quote) {
      return res.status(404).json({ message: 'Quotation not found or unauthorized' });
    }

    if (quote.status !== 'submitted') {
      return res.status(400).json({ message: `Cannot modify quotation because status is currently '${quote.status}'` });
    }

    // 2. Fetch RFQ items to compute totals
    const { data: rfqItems } = await supabaseAdmin
      .from('rfq_items')
      .select('id, quantity')
      .eq('rfq_id', rfq_id);

    // Recalculate totals
    let grandTotal = 0;
    const updatedLines = items.map(item => {
      const rfqItem = rfqItems.find(ri => ri.id === item.rfq_item_id);
      const qty = rfqItem ? parseFloat(rfqItem.quantity) : 1;
      const total = parseFloat(item.unit_price) * qty;
      grandTotal += total;
      return {
        quotation_id: id,
        rfq_item_id: item.rfq_item_id,
        unit_price: item.unit_price,
        total_price: total
      };
    });

    // 3. Update main quotation record
    const { data: updatedQuote, error: updateError } = await supabaseAdmin
      .from('quotations')
      .update({
        total_price: grandTotal,
        delivery_days,
        notes
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 4. Delete old lines and insert updated ones
    await supabaseAdmin.from('quotation_items').delete().eq('quotation_id', id);
    await supabaseAdmin.from('quotation_items').insert(updatedLines);

    await logActivity(req.user.id, 'UPDATE_QUOTE', 'Quotation', id, `Updated quotation parameters ($${grandTotal})`);
    return res.json(updatedQuote);
  } catch (error) {
    console.error('Error updating quotation:', error);
    return res.status(500).json({ message: 'Error updating quotation details' });
  }
});

export default router;
