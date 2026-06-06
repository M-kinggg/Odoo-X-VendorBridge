import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = Router();

// GET /api/logs
// Retrieves all system logs, supports filters for entity_type and dates
router.get('/', authenticateToken, async (req, res) => {
  const { entity_type, date_from, date_to } = req.query;

  try {
    let query = supabaseAdmin
      .from('activity_logs')
      .select('*, users(name, role)')
      .order('created_at', { ascending: false });

    if (entity_type) {
      query = query.eq('entity_type', entity_type);
    }
    if (date_from) {
      query = query.gte('created_at', date_from);
    }
    if (date_to) {
      query = query.lte('created_at', date_to);
    }

    const { data, error } = await query;
    if (error) throw error;

    return res.json(data || []);
  } catch (error) {
    console.error('Error fetching logs:', error);
    return res.status(500).json({ message: 'Error retrieving system activity logs' });
  }
});

// GET /api/notifications
// Retrieves the last 10 logs relevant to the current user's role
router.get('/notifications', authenticateToken, async (req, res) => {
  const { role, email, id: userId } = req.user;

  try {
    let query = supabaseAdmin
      .from('activity_logs')
      .select('*, users(name, role)')
      .order('created_at', { ascending: false })
      .limit(10);

    if (role === 'admin') {
      // Admins see everything
      const { data, error } = await query;
      if (error) throw error;
      return res.json(data || []);
    } 
    
    if (role === 'procurement_officer') {
      // Procurement see operations logs
      const { data, error } = await query.in('entity_type', [
        'Vendor',
        'RFQ',
        'Quotation',
        'PurchaseOrder',
        'Invoice',
        'Approval'
      ]);
      if (error) throw error;
      return res.json(data || []);
    } 
    
    if (role === 'manager') {
      // Managers see approvals and related transaction updates
      const { data, error } = await query.in('entity_type', [
        'Approval',
        'RFQ',
        'PurchaseOrder',
        'Invoice'
      ]);
      if (error) throw error;
      return res.json(data || []);
    } 
    
    if (role === 'vendor') {
      // Vendors only see logs related to their own vendor profile or submitted documents
      const { data: vendor, error: vendorError } = await supabaseAdmin
        .from('vendors')
        .select('id')
        .eq('contact_email', email)
        .maybeSingle();

      if (vendorError || !vendor) {
        return res.json([]); // No linked vendor profile
      }

      const vendorId = vendor.id;

      // 1. Get quotation IDs
      const { data: quotes } = await supabaseAdmin
        .from('quotations')
        .select('id')
        .eq('vendor_id', vendorId);
      const quoteIds = (quotes || []).map(q => q.id);

      // 2. Get PO IDs
      const { data: pos } = await supabaseAdmin
        .from('purchase_orders')
        .select('id')
        .eq('vendor_id', vendorId);
      const poIds = (pos || []).map(p => p.id);

      // 3. Get Invoice IDs
      let invIds = [];
      if (poIds.length > 0) {
        const { data: invs } = await supabaseAdmin
          .from('invoices')
          .select('id')
          .in('po_id', poIds);
        invIds = (invs || []).map(i => i.id);
      }

      // 4. Get Invited RFQ IDs
      const { data: rfqVens } = await supabaseAdmin
        .from('rfq_vendors')
        .select('rfq_id')
        .eq('vendor_id', vendorId);
      const rfqIds = (rfqVens || []).map(r => r.rfq_id);

      // Construct dynamic filters
      const filters = [
        `user_id.eq.${userId}`,
        `and(entity_type.eq.Vendor,entity_id.eq.${vendorId})`
      ];
      if (quoteIds.length > 0) filters.push(`and(entity_type.eq.Quotation,entity_id.in.(${quoteIds.join(',')}))`);
      if (poIds.length > 0) filters.push(`and(entity_type.eq.PurchaseOrder,entity_id.in.(${poIds.join(',')}))`);
      if (invIds.length > 0) filters.push(`and(entity_type.eq.Invoice,entity_id.in.(${invIds.join(',')}))`);
      if (rfqIds.length > 0) filters.push(`and(entity_type.eq.RFQ,entity_id.in.(${rfqIds.join(',')}))`);

      const { data, error } = await supabaseAdmin
        .from('activity_logs')
        .select('*, users(name, role)')
        .or(filters.join(','))
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return res.json(data || []);
    }

    return res.json([]);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return res.status(500).json({ message: 'Error retrieving notifications' });
  }
});

export default router;
