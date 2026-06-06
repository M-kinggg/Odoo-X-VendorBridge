import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = Router();

// GET /api/dashboard/summary
// Requires valid authentication token
router.get('/summary', authenticateToken, async (req, res) => {
  try {
    // Query counts and recent logs in parallel using supabaseAdmin
    const [
      approvalsCount,
      rfqsCount,
      vendorsCount,
      invoicesCount,
      posQuery,
      invoicesQuery
    ] = await Promise.all([
      supabaseAdmin.from('approvals').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabaseAdmin.from('rfqs').select('id', { count: 'exact', head: true }).eq('status', 'open'),
      supabaseAdmin.from('vendors').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('invoices').select('id', { count: 'exact', head: true }).in('status', ['draft', 'sent']),
      supabaseAdmin.from('purchase_orders').select(`
        id,
        po_number,
        status,
        created_at,
        vendors (name),
        quotations (total_price)
      `).order('created_at', { ascending: false }).limit(5),
      supabaseAdmin.from('invoices').select(`
        id,
        invoice_number,
        total,
        status,
        created_at,
        purchase_orders (po_number)
      `).order('created_at', { ascending: false }).limit(5)
    ]);

    // Format recent POs
    const recentPOs = (posQuery.data || []).map(po => ({
      id: po.id,
      po_number: po.po_number,
      vendor_name: po.vendors?.name || 'N/A',
      amount: po.quotations?.total_price || 0.00,
      status: po.status,
      date: po.created_at
    }));

    // Format recent Invoices
    const recentInvoices = (invoicesQuery.data || []).map(inv => ({
      id: inv.id,
      invoice_number: inv.invoice_number,
      po_number: inv.purchase_orders?.po_number || 'N/A',
      amount: inv.total,
      status: inv.status,
      date: inv.created_at
    }));

    return res.json({
      stats: {
        pendingApprovals: approvalsCount.count || 0,
        activeRfqs: rfqsCount.count || 0,
        totalVendors: vendorsCount.count || 0,
        openInvoices: invoicesCount.count || 0
      },
      recentPOs,
      recentInvoices
    });
  } catch (error) {
    console.error('Error fetching dashboard summary:', error);
    return res.status(500).json({ message: 'Internal server error while retrieving dashboard metrics' });
  }
});

export default router;
