import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { CheckSquare, Eye, RefreshCw, AlertCircle } from 'lucide-react';

const ApprovalsList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('pending');

  // Fetch approvals list
  const { data: approvals = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['approvalsList', statusFilter],
    queryFn: async () => {
      const res = await api.get('/approvals', { params: { status: statusFilter } });
      return res.data;
    }
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'approved':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'rejected':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Quotations Approval Hub</h1>
          <p className="text-slate-500 font-medium mt-1">Review quotation proposals and authorize Purchase Orders.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="btn-secondary text-xs py-2 flex items-center gap-1.5 font-bold"
          disabled={isFetching}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh Hub
        </button>
      </div>

      {/* Tabs Row */}
      <div className="flex border-b border-slate-200 gap-6">
        {['pending', 'approved', 'rejected'].map((tab) => {
          const isActive = statusFilter === tab;
          return (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`pb-3 text-sm font-bold border-b-2 capitalize transition-all duration-150 ${
                isActive
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              {tab} Bids
            </button>
          );
        })}
      </div>

      {/* Main List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="font-bold text-slate-800 text-md">Approval Requests Queue</h2>
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
            Failed to retrieve approvals queue.
          </div>
        ) : approvals.length === 0 ? (
          <div className="p-12 text-center max-w-sm mx-auto">
            <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
              <CheckSquare className="w-7 h-7" />
            </div>
            <h3 className="text-md font-bold text-slate-800">No Approvals Found</h3>
            <p className="text-slate-500 text-xs mt-1 mb-6">There are no {statusFilter} approvals pending in this view. Keep up the good work!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-3.5">RFQ Title</th>
                  <th className="px-6 py-3.5">Vendor Partner</th>
                  <th className="px-6 py-3.5">Quoted Amount</th>
                  <th className="px-6 py-3.5">Workflow Status</th>
                  <th className="px-6 py-3.5">Created Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-600">
                {approvals.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{a.rfq_title}</td>
                    <td className="px-6 py-4">{a.vendor_name}</td>
                    <td className="px-6 py-4 font-bold text-slate-800">${parseFloat(a.quoted_amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full border text-xs font-bold ${getStatusColor(a.status)}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">{new Date(a.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => navigate(`/approvals/${a.id}`)}
                        className="p-1.5 rounded-lg border border-slate-200/80 hover:bg-slate-50 text-slate-500 hover:text-brand-600 transition-colors inline-flex items-center gap-1.5 text-xs font-bold"
                      >
                        <Eye className="w-4 h-4" />
                        Review
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

export default ApprovalsList;
