import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { 
  BarChart3, 
  DollarSign, 
  Clock, 
  Users, 
  CheckCircle,
  FileSpreadsheet,
  Printer,
  Search,
  Star,
  ArrowUpDown,
  TrendingUp
} from 'lucide-react';

const COLORS = ['#3b82f6', '#f59e0b', '#ef4444', '#10b981'];

const ReportsAnalytics = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // 1. Fetch Spend Summary & Monthly Trends
  const { data: spendSummary = {}, isLoading: spendLoading } = useQuery({
    queryKey: ['reportsSpendSummary'],
    queryFn: async () => {
      const res = await api.get('/reports/spend-summary');
      return res.data;
    }
  });

  // 2. Fetch Vendor Performance Table
  const { data: vendorPerformance = [], isLoading: vendorLoading } = useQuery({
    queryKey: ['reportsVendorPerformance'],
    queryFn: async () => {
      const res = await api.get('/reports/vendor-performance');
      return res.data;
    }
  });

  // 3. Fetch RFQ Status Distribution
  const { data: rfqDistribution = [], isLoading: rfqLoading } = useQuery({
    queryKey: ['reportsRfqDistribution'],
    queryFn: async () => {
      const res = await api.get('/reports/rfq-status-distribution');
      return res.data;
    }
  });

  // 4. Fetch Approval Trends
  const { data: approvalTrends = [], isLoading: approvalLoading } = useQuery({
    queryKey: ['reportsApprovalTrends'],
    queryFn: async () => {
      const res = await api.get('/reports/approval-trends');
      return res.data;
    }
  });

  // Sorting and Filtering Logic for Vendor Performance
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedAndFilteredVendors = vendorPerformance
    .filter(v => v.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      
      if (typeof valA === 'string') {
        return sortDirection === 'asc' 
          ? valA.localeCompare(valB) 
          : valB.localeCompare(valA);
      } else {
        return sortDirection === 'asc' 
          ? valA - valB 
          : valB - valA;
      }
    });

  // Export PDF (Print handler)
  const handleExportPDF = () => {
    window.print();
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    if (vendorPerformance.length === 0) return;
    
    const headers = ['Vendor Name', 'Total Quotations', 'Win Rate (%)', 'Avg Delivery Days', 'Total Spend ($)', 'Rating (Stars)'];
    const rows = vendorPerformance.map(v => [
      v.name,
      v.total_quotations,
      v.win_rate,
      v.avg_delivery_days,
      v.total_spend,
      v.rating
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `VendorBridge_Performance_Report_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isLoading = spendLoading || vendorLoading || rfqLoading || approvalLoading;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => <div key={n} className="h-24 bg-slate-200 rounded-2xl"></div>)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200 rounded-2xl"></div>
          <div className="h-80 bg-slate-200 rounded-2xl"></div>
        </div>
        <div className="h-96 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  // Pre-seed some default spend items if empty just for layout safety
  const monthlySpendData = spendSummary.monthlySpend || [];
  
  // Spend top 5 vendors data mapping
  const topVendorsData = [...vendorPerformance]
    .sort((a, b) => b.total_spend - a.total_spend)
    .slice(0, 5)
    .map(v => ({
      name: v.name.length > 18 ? v.name.substring(0, 15) + '...' : v.name,
      Spend: v.total_spend
    }));

  return (
    <div className="space-y-8 print:p-0">
      {/* Header Panel */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5 print:hidden">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Procurement Reports & Analytics</h1>
          <p className="text-slate-500 text-sm mt-1">
            Analyze procurement spends, average cycles, and track vendor performances driven by real transaction records.
          </p>
        </div>
        
        {/* Action Export Buttons */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            onClick={handleExportCSV}
            className="btn-secondary text-sm flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="btn-primary text-sm flex items-center gap-2"
          >
            <Printer className="w-4 h-4 text-white" />
            Export PDF
          </button>
        </div>
      </div>

      {/* SECTION A: KPI CARDS ROW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Spend Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute right-4 top-4 w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center text-brand-600 group-hover:scale-110 transition-transform">
            <DollarSign className="w-5 h-5" />
          </div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Procurement Spend</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2">${spendSummary.totalSpend?.toLocaleString() || '0.00'}</h3>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            Sum of all paid & sent invoices
          </p>
        </div>

        {/* Turnaround Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute right-4 top-4 w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 group-hover:scale-110 transition-transform">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Avg Bidding to PO Time</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2">{spendSummary.avgQuoteToPoTime || 0} Days</h3>
          <p className="text-xs text-slate-400 mt-2">Average quotation to PO generation</p>
        </div>

        {/* Vendors count Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute right-4 top-4 w-10 h-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 group-hover:scale-110 transition-transform">
            <Users className="w-5 h-5" />
          </div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Vendors</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2">{spendSummary.activeVendors || 0}</h3>
          <p className="text-xs text-slate-400 mt-2">Verified suppliers in platform</p>
        </div>

        {/* PO Fulfilment Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute right-4 top-4 w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
            <CheckCircle className="w-5 h-5" />
          </div>
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">PO Fulfilment Rate</p>
          <h3 className="text-2xl font-extrabold text-slate-900 mt-2">{spendSummary.poFulfilmentRate || 0}%</h3>
          <p className="text-xs text-slate-400 mt-2">Delivered purchase orders percentage</p>
        </div>
      </div>

      {/* SECTION B: CHARTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Procurement Spend Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Monthly Spend Trend (Last 6 Months)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlySpendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: '#64748b' }} unit="$" />
                <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(val) => [`$${val.toLocaleString()}`, 'Spend']} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Vendors Horizontal Spend Bar Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Top 5 Vendors by Cumulative Spend</h3>
          <div className="h-72">
            {topVendorsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs italic">
                No vendor spending logged yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topVendorsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: '#64748b' }} unit="$" />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: '#64748b' }} width={110} />
                  <Tooltip formatter={(val) => [`$${val.toLocaleString()}`, 'Total Spend']} />
                  <Bar dataKey="Spend" fill="#8b5cf6" radius={[0, 6, 6, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* RFQ Status Distribution Donut Chart */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-4">RFQ Status Distribution</h3>
          <div className="h-72 flex flex-col sm:flex-row items-center justify-center gap-4">
            {rfqDistribution.length === 0 ? (
              <div className="text-slate-400 text-xs italic">No RFQ records found.</div>
            ) : (
              <>
                <div className="w-full sm:w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={rfqDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {rfqDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [value, 'RFQs']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="w-full sm:w-1/2 space-y-2">
                  {rfqDistribution.map((entry, index) => (
                    <div key={entry.name} className="flex items-center justify-between text-xs font-semibold p-2 border border-slate-100 rounded-xl">
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                        <span className="text-slate-600">{entry.name}</span>
                      </div>
                      <span className="text-slate-900">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Approval Line Chart Trend */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Approval Rate Trends (Approved vs Rejected)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={approvalTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: '#64748b' }} />
                <YAxis tickLine={false} axisLine={false} style={{ fontSize: '11px', fill: '#64748b' }} />
                <Tooltip />
                <Legend style={{ fontSize: '12px' }} />
                <Line type="monotone" dataKey="approved" stroke="#10b981" strokeWidth={3} activeDot={{ r: 8 }} />
                <Line type="monotone" dataKey="rejected" stroke="#ef4444" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* SECTION C: VENDOR PERFORMANCE TABLE */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Controls */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div>
            <h3 className="font-bold text-slate-900">Vendor Performance Ledger</h3>
            <p className="text-xs text-slate-500 mt-0.5">Sort and compare supplier quotations, win rates, and total contract spends.</p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search vendor name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none transition-colors"
            />
          </div>
        </div>

        {/* Responsive Table Grid */}
        <div className="overflow-x-auto">
          {sortedAndFilteredVendors.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">
              No vendors match your search criteria.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                  <th 
                    onClick={() => handleSort('name')} 
                    className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      Vendor Name
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('total_quotations')} 
                    className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition-colors text-center"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Quotations
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('win_rate')} 
                    className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition-colors text-center"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Win Rate (%)
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('avg_delivery_days')} 
                    className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition-colors text-center"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Avg Delivery
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('total_spend')} 
                    className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition-colors text-right"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      Total Spend
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('rating')} 
                    className="p-4 cursor-pointer hover:bg-slate-100 hover:text-slate-800 transition-colors text-center"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      Rating
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {sortedAndFilteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-semibold text-slate-800">{vendor.name}</td>
                    <td className="p-4 text-center font-medium text-slate-600">{vendor.total_quotations}</td>
                    <td className="p-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        vendor.win_rate > 70 ? 'bg-emerald-50 text-emerald-700' :
                        vendor.win_rate > 40 ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {vendor.win_rate}%
                      </span>
                    </td>
                    <td className="p-4 text-center text-slate-600 font-medium">{vendor.avg_delivery_days || '-'} Days</td>
                    <td className="p-4 text-right font-semibold text-slate-900">${vendor.total_spend?.toLocaleString() || '0.00'}</td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-0.5 text-amber-400">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star 
                            key={i} 
                            className={`w-3.5 h-3.5 ${i < vendor.rating ? 'fill-current' : 'text-slate-200'}`} 
                          />
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsAnalytics;
