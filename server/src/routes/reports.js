import { Router } from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { supabaseAdmin } from '../config/supabase.js';

const router = Router();

// GET /api/reports/spend-summary
router.get('/spend-summary', [authenticateToken, authorizeRole(['admin', 'procurement_officer', 'manager'])], async (req, res) => {
  try {
    // 1. Total Spend (sum of all paid + sent invoices)
    const { data: spendInvs, error: spendError } = await supabaseAdmin
      .from('invoices')
      .select('total')
      .in('status', ['paid', 'sent']);
    if (spendError) throw spendError;
    const totalSpend = (spendInvs || []).reduce((acc, inv) => acc + parseFloat(inv.total), 0);

    // 2. Active Vendor Count
    const { count: activeVendors, error: activeError } = await supabaseAdmin
      .from('vendors')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');
    if (activeError) throw activeError;

    // 3. PO Fulfilment Rate (delivered / total POs as %)
    const { data: pos, error: poError } = await supabaseAdmin
      .from('purchase_orders')
      .select('status');
    if (poError) throw poError;
    
    const totalPOs = pos?.length || 0;
    const deliveredPOs = pos?.filter(po => po.status === 'delivered').length || 0;
    const poFulfilmentRate = totalPOs > 0 ? Math.round((deliveredPOs / totalPOs) * 100) : 0;

    // 4. Average Quotation-to-PO time in days
    const { data: poTimes, error: timeError } = await supabaseAdmin
      .from('purchase_orders')
      .select('created_at, quotations(submitted_at)');
    if (timeError) throw timeError;

    let totalDays = 0;
    let timeCount = 0;
    poTimes?.forEach(po => {
      if (po.created_at && po.quotations?.submitted_at) {
        const diff = new Date(po.created_at) - new Date(po.quotations.submitted_at);
        totalDays += diff / (1000 * 60 * 60 * 24);
        timeCount++;
      }
    });
    const avgQuoteToPoTime = timeCount > 0 ? parseFloat((totalDays / timeCount).toFixed(1)) : 0;

    // 5. Monthly spend (for last 6 months)
    const { data: monthlyInvs } = await supabaseAdmin
      .from('invoices')
      .select('total, created_at')
      .in('status', ['paid', 'sent']);
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const spendMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mName = months[d.getMonth()];
      const year = d.getFullYear();
      const key = `${mName} ${year}`;
      spendMap[key] = { month: key, amount: 0 };
    }

    monthlyInvs?.forEach(inv => {
      const d = new Date(inv.created_at);
      const mName = months[d.getMonth()];
      const year = d.getFullYear();
      const key = `${mName} ${year}`;
      if (spendMap[key]) {
        spendMap[key].amount += parseFloat(inv.total);
      }
    });

    const monthlySpend = Object.values(spendMap).map(item => ({
      ...item,
      amount: parseFloat(item.amount.toFixed(2))
    }));

    return res.json({
      totalSpend: parseFloat(totalSpend.toFixed(2)),
      activeVendors: activeVendors || 0,
      poFulfilmentRate,
      avgQuoteToPoTime,
      monthlySpend
    });
  } catch (error) {
    console.error('Error generating spend summary:', error);
    return res.status(500).json({ message: 'Error retrieving spend reports' });
  }
});

// GET /api/reports/vendor-performance
router.get('/vendor-performance', [authenticateToken, authorizeRole(['admin', 'procurement_officer', 'manager'])], async (req, res) => {
  try {
    const { data: vendors, error: vendorError } = await supabaseAdmin
      .from('vendors')
      .select('id, name');
    if (vendorError) throw vendorError;

    const performanceList = await Promise.all((vendors || []).map(async (v) => {
      // Fetch total quotations
      const { count: totalQuotes } = await supabaseAdmin
        .from('quotations')
        .select('id', { count: 'exact', head: true })
        .eq('vendor_id', v.id);

      // Fetch win rate quotations
      const { count: winQuotes } = await supabaseAdmin
        .from('quotations')
        .select('id', { count: 'exact', head: true })
        .eq('vendor_id', v.id)
        .eq('status', 'accepted');

      const winRate = totalQuotes > 0 ? Math.round((winQuotes / totalQuotes) * 100) : 0;

      // Fetch average delivery days
      const { data: deliveryDays } = await supabaseAdmin
        .from('quotations')
        .select('delivery_days')
        .eq('vendor_id', v.id);
      
      const totalDel = (deliveryDays || []).reduce((acc, q) => acc + q.delivery_days, 0);
      const avgDeliveryDays = (deliveryDays && deliveryDays.length > 0) ? Math.round(totalDel / deliveryDays.length) : 0;

      // Fetch total spend
      const { data: pos } = await supabaseAdmin
        .from('purchase_orders')
        .select('id')
        .eq('vendor_id', v.id);
      const poIds = (pos || []).map(po => po.id);

      let totalSpend = 0;
      if (poIds.length > 0) {
        const { data: invs } = await supabaseAdmin
          .from('invoices')
          .select('total')
          .in('po_id', poIds)
          .in('status', ['paid', 'sent']);
        totalSpend = (invs || []).reduce((acc, inv) => acc + parseFloat(inv.total), 0);
      }

      // Compute star rating
      let score = 3;
      if (winRate > 60) score += 1;
      if (winRate > 80) score += 1;
      if (avgDeliveryDays > 0 && avgDeliveryDays < 10) score += 1;
      if (avgDeliveryDays > 20) score -= 1;
      const rating = Math.min(5, Math.max(1, score));

      return {
        id: v.id,
        name: v.name,
        total_quotations: totalQuotes || 0,
        win_rate: winRate,
        avg_delivery_days: avgDeliveryDays,
        total_spend: parseFloat(totalSpend.toFixed(2)),
        rating
      };
    }));

    return res.json(performanceList);
  } catch (error) {
    console.error('Error generating vendor performance list:', error);
    return res.status(500).json({ message: 'Error retrieving vendor performance parameters' });
  }
});

// GET /api/reports/rfq-status-distribution
router.get('/rfq-status-distribution', [authenticateToken, authorizeRole(['admin', 'procurement_officer', 'manager'])], async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('rfqs').select('status');
    if (error) throw error;

    const counts = { draft: 0, open: 0, closed: 0, awarded: 0 };
    data?.forEach(r => {
      if (counts[r.status] !== undefined) {
        counts[r.status]++;
      }
    });

    const chartData = Object.keys(counts).map(key => ({
      name: key.toUpperCase(),
      value: counts[key]
    }));

    return res.json(chartData);
  } catch (error) {
    console.error('Error generating RFQ status distribution:', error);
    return res.status(500).json({ message: 'Error retrieving RFQ status distribution chart' });
  }
});

// GET /api/reports/approval-trends
router.get('/approval-trends', [authenticateToken, authorizeRole(['admin', 'procurement_officer', 'manager'])], async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('approvals')
      .select('status, created_at')
      .neq('status', 'pending');
    if (error) throw error;

    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const trendsMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const mName = months[d.getMonth()];
      const year = d.getFullYear();
      const key = `${mName} ${year}`;
      trendsMap[key] = { month: key, approved: 0, rejected: 0 };
    }

    data?.forEach(appr => {
      const d = new Date(appr.created_at);
      const mName = months[d.getMonth()];
      const year = d.getFullYear();
      const key = `${mName} ${year}`;
      if (trendsMap[key]) {
        if (appr.status === 'approved') {
          trendsMap[key].approved++;
        } else if (appr.status === 'rejected') {
          trendsMap[key].rejected++;
        }
      }
    });

    return res.json(Object.values(trendsMap));
  } catch (error) {
    console.error('Error generating approval trends:', error);
    return res.status(500).json({ message: 'Error retrieving approval trends chart' });
  }
});

export default router;
