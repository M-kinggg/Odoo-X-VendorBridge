import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';
import { logActivity } from '../utils/logger.js';

const router = Router();

// Validation Rules
const vendorRules = [
  body('name').trim().notEmpty().withMessage('Vendor name is required'),
  body('category').isIn(['IT', 'Logistics', 'Manufacturing', 'Services', 'Other']).withMessage('Invalid business category'),
  body('gst_number').trim().matches(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/).withMessage('Please enter a valid GST number (e.g. 27AAAAA1111A1Z1)'),
  body('contact_name').trim().notEmpty().withMessage('Contact name is required'),
  body('contact_email').isEmail().withMessage('Please enter a valid contact email'),
  body('contact_phone').trim().notEmpty().withMessage('Contact phone number is required'),
  body('status').isIn(['active', 'inactive', 'pending']).withMessage('Invalid vendor status')
];

// GET /api/vendors
router.get('/', authenticateToken, async (req, res) => {
  const { q, status } = req.query;

  try {
    let query = supabaseAdmin.from('vendors').select('*');

    if (q) {
      query = query.or(`name.ilike.%${q}%,category.ilike.%${q}%`);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) throw error;
    
    return res.json(data || []);
  } catch (error) {
    console.error('Error fetching vendors:', error);
    return res.status(500).json({ message: 'Error retrieving vendor list' });
  }
});

// GET /api/vendors/:id
router.get('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const { data: vendor, error } = await supabaseAdmin
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !vendor) {
      return res.status(404).json({ message: 'Vendor profile not found' });
    }

    // Fetch quotations submitted by this vendor
    const { data: quotations } = await supabaseAdmin
      .from('quotations')
      .select('*, rfqs(title)')
      .eq('vendor_id', id);

    return res.json({ ...vendor, quotations: quotations || [] });
  } catch (error) {
    console.error('Error fetching vendor details:', error);
    return res.status(500).json({ message: 'Error retrieving vendor details' });
  }
});

// POST /api/vendors
router.post('/', [authenticateToken, vendorRules], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, category, gst_number, contact_name, contact_email, contact_phone, status } = req.body;

  try {
    // Check if GSTIN exists
    const { data: existing } = await supabaseAdmin
      .from('vendors')
      .select('id')
      .eq('gst_number', gst_number)
      .maybeSingle();

    if (existing) {
      return res.status(400).json({ message: 'Vendor with this GST number already exists' });
    }

    const { data, error } = await supabaseAdmin
      .from('vendors')
      .insert({
        name,
        category,
        gst_number,
        contact_name,
        contact_email,
        contact_phone,
        status,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    await logActivity(req.user.id, 'CREATE', 'Vendor', data.id, `Created vendor profile for ${name}`);
    return res.status(201).json(data);
  } catch (error) {
    console.error('Error creating vendor:', error);
    return res.status(500).json({ message: 'Error saving vendor profile' });
  }
});

// PUT /api/vendors/:id
router.put('/:id', [authenticateToken, vendorRules], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { id } = req.params;
  const { name, category, gst_number, contact_name, contact_email, contact_phone, status } = req.body;

  try {
    const { data, error } = await supabaseAdmin
      .from('vendors')
      .update({
        name,
        category,
        gst_number,
        contact_name,
        contact_email,
        contact_phone,
        status
      })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(404).json({ message: 'Vendor not found or update failed' });

    await logActivity(req.user.id, 'UPDATE', 'Vendor', id, `Updated vendor profile fields for ${name}`);
    return res.json(data);
  } catch (error) {
    console.error('Error updating vendor:', error);
    return res.status(500).json({ message: 'Error updating vendor details' });
  }
});

// DELETE /api/vendors/:id (admin only)
router.delete('/:id', [authenticateToken, authorizeRole(['admin'])], async (req, res) => {
  const { id } = req.params;

  try {
    const { data, error } = await supabaseAdmin
      .from('vendors')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(404).json({ message: 'Vendor not found or delete failed' });

    await logActivity(req.user.id, 'DELETE', 'Vendor', id, `Deleted vendor profile for ${data.name}`);
    return res.json({ message: 'Vendor profile successfully deleted', id });
  } catch (error) {
    console.error('Error deleting vendor:', error);
    return res.status(500).json({ message: 'Error deleting vendor profile' });
  }
});

export default router;
