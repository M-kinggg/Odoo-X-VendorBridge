import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { Receipt, Eye, RefreshCw, AlertCircle } from 'lucide-react';

const InvoiceList = () => {
  const navigate = useNavigate();

  // Fetch Invoices
  const { data: invoices = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['invoicesList'],
    queryFn: async () => {
      const res = await api.get('/invoices');
      return res.data;
    }
  });

  const getStatusBadge = (s) => {
    let base = "px-2.5 py-0.5 text-xs font-semibold rounded-full border ";
    switch (s) {
      case 'draft':
        return <span className={base + "bg-slate-50 text-slate-700 border-slate-200"}>Draft</span>;
      case 'sent':
        return <span className={base + "bg-blue-50 text-blue-700 border-blue-200"}>Sent</span>;
      case 'paid':
        return <span className={base + "bg-emerald-50 text-emerald-700 border-emerald-200"}>Paid</span>;
      default:
        return <span className={base + "bg-slate-50 text-slate-700 border-slate-200"}>{s}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Billing & Invoices</h1>
          <p className="text-slate-500 font-medium mt-1">Audit tax breakdowns, payment statuses, and invoice records.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn-secondary text-xs py-2 flex items-center gap-1.5 font-bold"
          disabled={isFetching}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh Registry
        </button>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="font-bold text-slate-800 text-md">Invoices Registry</h2>
          <button 
            onClick={() => refetch()} 
            className="text-xs text-slate-500 hover:text-slate-700 transition-colors flex items-center gap-1 font-semibold"
            disabled={isFetching}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin text-brand-500' : ''}`} />
            Refresh Feed
          </button>
        </div>

        {isLoading ? (
          <div className="p-6 space-y-4">
            <div className="h-8 bg-slate-100 rounded-lg animate-pulse w-full"></div>
            {[1, 2, 3].map(n => (
              <div key={n} className="flex gap-4 animate-pulse px-4 py-2">
                <div className="h-10 bg-slate-50 rounded flex-1"></div>
                <div className="h-10 bg-slate-50 rounded flex-1"></div>
                <div className="h-10 bg-slate-50 rounded flex-1"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center text-rose-500 font-semibold flex flex-col items-center justify-center gap-2">
            <AlertCircle className="w-8 h-8 text-rose-500" />
            Failed to retrieve invoice records.
          </div>
        ) : invoices.length === 0 ? (
          <div className="p-12 text-center max-w-sm mx-auto">
            <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
              <Receipt className="w-7 h-7" />
            </div>
            <h3 className="text-md font-bold text-slate-800">No Invoices</h3>
            <p className="text-slate-500 text-xs mt-1 mb-6">No invoices have been created yet. You can generate or draft an invoice from any approved Purchase Order page.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-3.5">Invoice Number</th>
                  <th className="px-6 py-3.5">PO Reference</th>
                  <th className="px-6 py-3.5">Vendor Partner</th>
                  <th className="px-6 py-3.5">Total Amount</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Date Created</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-600">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{inv.invoice_number}</td>
                    <td className="px-6 py-4 font-semibold text-slate-500">{inv.po_number}</td>
                    <td className="px-6 py-4">{inv.vendor_name}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">${parseFloat(inv.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4">{getStatusBadge(inv.status)}</td>
                    <td className="px-6 py-4 text-xs text-slate-400">{new Date(inv.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/invoices/${inv.id}`)}
                        className="p-1.5 rounded-lg border border-slate-200/80 hover:bg-slate-50 text-slate-500 hover:text-brand-600 transition-colors inline-flex items-center gap-1.5 text-xs font-bold"
                      >
                        <Eye className="w-4 h-4" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default InvoiceList;
