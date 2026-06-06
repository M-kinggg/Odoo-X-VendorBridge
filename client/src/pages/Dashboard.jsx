import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import {
  FileCheck,
  FolderLock,
  Users2,
  Receipt,
  TrendingUp,
  Clock,
  Plus,
  PlusSquare,
  FileText,
  AlertCircle,
  RefreshCw,
  ShoppingBag,
  ExternalLink
} from 'lucide-react';

const Dashboard = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState('');

  // Fetch Dashboard Summary Data
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => {
      const response = await api.get('/dashboard/summary');
      return response.data;
    },
    refetchOnWindowFocus: false,
    staleTime: 30000 // 30s cache
  });

  const handleQuickAction = (type) => {
    setModalType(type);
    setModalOpen(true);
  };

  const getStatusBadge = (status, type) => {
    let base = "px-2.5 py-0.5 text-xs font-semibold rounded-full border ";
    if (type === 'po') {
      switch (status) {
        case 'pending':
          return <span className={base + "bg-amber-50 text-amber-700 border-amber-200"}>Pending</span>;
        case 'confirmed':
          return <span className={base + "bg-indigo-50 text-indigo-700 border-indigo-200"}>Confirmed</span>;
        case 'delivered':
          return <span className={base + "bg-emerald-50 text-emerald-700 border-emerald-200"}>Delivered</span>;
        default:
          return <span className={base + "bg-slate-50 text-slate-700 border-slate-200"}>{status}</span>;
      }
    } else { // invoice status
      switch (status) {
        case 'draft':
          return <span className={base + "bg-slate-50 text-slate-700 border-slate-200"}>Draft</span>;
        case 'sent':
          return <span className={base + "bg-blue-50 text-blue-700 border-blue-200"}>Sent</span>;
        case 'paid':
          return <span className={base + "bg-emerald-50 text-emerald-700 border-emerald-200"}>Paid</span>;
        default:
          return <span className={base + "bg-slate-50 text-slate-700 border-slate-200"}>{status}</span>;
      }
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Header Skeleton */}
        <div className="h-8 w-64 bg-slate-200 rounded-lg"></div>
        {/* Stats Row Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-slate-200 rounded-2xl"></div>
          ))}
        </div>
        {/* Grid Tables Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-96 bg-slate-200 rounded-2xl"></div>
          <div className="h-96 bg-slate-200 rounded-2xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
        <h3 className="text-lg font-bold text-slate-800">Failed to Load Dashboard Summary</h3>
        <p className="text-slate-500 text-sm max-w-sm mt-1 mb-6">
          There was an error communicating with the procurement server. Please ensure the backend is running.
        </p>
        <button onClick={() => refetch()} className="btn-primary">
          <RefreshCw className="w-4 h-4" />
          Retry Connection
        </button>
      </div>
    );
  }

  const stats = data?.stats || { pendingApprovals: 0, activeRfqs: 0, totalVendors: 0, openInvoices: 0 };
  const recentPOs = data?.recentPOs || [];
  const recentInvoices = data?.recentInvoices || [];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-slate-500 font-medium mt-1">Overview of procurement activities and pending transactions.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn-secondary text-xs py-2 px-3 border border-slate-200/80 hover:bg-slate-50"
          disabled={isFetching}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          {isFetching ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Pending Approvals */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-200 group">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Approvals</span>
            <h3 className="text-3xl font-black text-slate-800">{stats.pendingApprovals}</h3>
            <span className="text-[11px] text-amber-500 font-semibold flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Awaiting action
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500 group-hover:scale-110 transition-transform duration-200">
            <FileCheck className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Active RFQs */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-200 group">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active RFQs</span>
            <h3 className="text-3xl font-black text-slate-800">{stats.activeRfqs}</h3>
            <span className="text-[11px] text-brand-500 font-semibold flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Live proposals
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500 group-hover:scale-110 transition-transform duration-200">
            <FolderLock className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Total Vendors */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-200 group">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Vendors</span>
            <h3 className="text-3xl font-black text-slate-800">{stats.totalVendors}</h3>
            <span className="text-[11px] text-emerald-500 font-semibold flex items-center gap-1">
              <Users2 className="w-3.5 h-3.5" /> Registered accounts
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 group-hover:scale-110 transition-transform duration-200">
            <Users2 className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Open Invoices */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:shadow-md transition-all duration-200 group">
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Open Invoices</span>
            <h3 className="text-3xl font-black text-slate-800">{stats.openInvoices}</h3>
            <span className="text-[11px] text-blue-500 font-semibold flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5" /> Draft / Sent bills
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500 group-hover:scale-110 transition-transform duration-200">
            <Receipt className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Quick Action Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="text-md font-bold text-slate-800 mb-4">Quick ERP Actions</h2>
        <div className="flex flex-wrap gap-4">
          <button
            onClick={() => handleQuickAction('RFQ')}
            className="btn-primary text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New RFQ
          </button>
          <button
            onClick={() => handleQuickAction('Vendor')}
            className="btn-secondary text-sm"
          >
            <PlusSquare className="w-4 h-4 text-slate-500" />
            New Vendor Profile
          </button>
          <button
            onClick={() => handleQuickAction('Reports')}
            className="btn-secondary text-sm"
          >
            <FileText className="w-4 h-4 text-slate-500" />
            View Reports & Audits
          </button>
        </div>
      </div>

      {/* Split Grid for POs and Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Table 1: Recent Purchase Orders */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-brand-600" />
                <h2 className="font-bold text-slate-800">Recent Purchase Orders</h2>
              </div>
              <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">Last 5 POs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-3.5">PO Number</th>
                    <th className="px-6 py-3.5">Vendor</th>
                    <th className="px-6 py-3.5">Amount</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-600">
                  {recentPOs.length > 0 ? (
                    recentPOs.map((po) => (
                      <tr key={po.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{po.po_number}</td>
                        <td className="px-6 py-4 truncate max-w-[150px]">{po.vendor_name}</td>
                        <td className="px-6 py-4 font-semibold text-slate-800">${parseFloat(po.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4">{getStatusBadge(po.status, 'po')}</td>
                        <td className="px-6 py-4 text-xs text-slate-400">{new Date(po.date).toLocaleDateString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-slate-400">No recent purchase orders found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50/45 text-center">
            <button className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors inline-flex items-center gap-1.5">
              View All Purchase Orders <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Table 2: Recent Invoices */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-brand-600" />
                <h2 className="font-bold text-slate-800">Recent Invoices</h2>
              </div>
              <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">Last 5 Invoices</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-3.5">Invoice #</th>
                    <th className="px-6 py-3.5">PO Ref</th>
                    <th className="px-6 py-3.5">Amount</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-600">
                  {recentInvoices.length > 0 ? (
                    recentInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-bold text-slate-800">{inv.invoice_number}</td>
                        <td className="px-6 py-4 font-semibold text-slate-500">{inv.po_number}</td>
                        <td className="px-6 py-4 font-semibold text-slate-800">${parseFloat(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="px-6 py-4">{getStatusBadge(inv.status, 'invoice')}</td>
                        <td className="px-6 py-4 text-xs text-slate-400">{new Date(inv.date).toLocaleDateString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-slate-400">No recent invoices found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="p-4 border-t border-slate-100 bg-slate-50/45 text-center">
            <button className="text-xs font-bold text-brand-600 hover:text-brand-700 transition-colors inline-flex items-center gap-1.5">
              View All Invoices <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Quick Action Modal Component */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500">
              <PlusSquare className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Create {modalType}</h3>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">
                This triggers a {modalType} creation flow in VendorBridge. 
                Full implementation for this entity is scheduled for subsequent phases.
              </p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setModalOpen(false)}
                className="btn-secondary text-sm py-2"
              >
                Close
              </button>
              <button
                onClick={() => setModalOpen(false)}
                className="btn-primary text-sm py-2"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
