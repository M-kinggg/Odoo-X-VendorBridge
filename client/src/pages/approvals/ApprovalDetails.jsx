import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Clock, Check, X, ShieldAlert, FileText, Calendar, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

const ApprovalDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState(''); // 'approved' or 'rejected'

  // Fetch approval details
  const { data: approval, isLoading, error: fetchError } = useQuery({
    queryKey: ['approvalDetails', id],
    queryFn: async () => {
      const res = await api.get(`/approvals/${id}`);
      return res.data;
    }
  });

  // Mutator: Approve/Reject action
  const actionMutation = useMutation({
    mutationFn: async ({ action, remarks }) => {
      return api.patch(`/approvals/${id}/action`, { action, remarks });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(['approvalsList']);
      toast.success(res.data.message || 'Workflow action successfully recorded!');
      navigate('/approvals');
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to submit workflow action.');
    }
  });

  const handleAction = (action) => {
    setError('');
    
    // Check if remarks are set on reject
    if (action === 'rejected' && !remarks.trim()) {
      return setError('Remarks are required when rejecting a quotation.');
    }

    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const executeAction = () => {
    setConfirmOpen(false);
    setSubmitting(true);
    actionMutation.mutate({ action: confirmAction, remarks: remarks.trim() }, {
      onSettled: () => setSubmitting(false)
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded"></div>
        <div className="h-40 bg-slate-200 rounded-2xl"></div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (fetchError || !approval) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 shadow-sm rounded-2xl">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-md font-bold text-slate-800">Workflow Request Not Found</h3>
        <p className="text-slate-500 text-sm mt-1 mb-4">The approval request was not found or has been processed.</p>
        <button onClick={() => navigate('/approvals')} className="btn-secondary text-sm">
          Return to Hub
        </button>
      </div>
    );
  }

  const quote = approval.quotation || {};
  const vendor = quote.vendor || {};
  const items = quote.items || [];
  const isPending = approval.status === 'pending';

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Return link */}
      <div>
        <button
          onClick={() => navigate('/approvals')}
          className="text-xs font-bold text-slate-500 hover:text-brand-600 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Approvals Queue
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center text-brand-600 shadow-sm shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Quotation Review Sheet</h1>
          <p className="text-slate-500 text-sm mt-0.5">Authorization request for PO generation.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-2.5 text-xs animate-shake">
          <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Main parameters block */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Requested Vendor Proposal</span>
            <h2 className="text-lg font-black text-slate-800 mt-1">{vendor.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5">GSTIN: {vendor.gst_number} • Category: {vendor.category}</p>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Grand Total Bid</span>
            <h3 className="text-xl font-extrabold text-slate-800 mt-1">${parseFloat(quote.total_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
            <span className="text-[10px] text-slate-400 font-semibold">{quote.delivery_days} days delivery</span>
          </div>
        </div>

        {/* Timeline Stepper */}
        <div className="flex items-center justify-between max-w-sm mx-auto relative py-2">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 -z-0"></div>
          
          <div className="relative z-10 flex flex-col items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-brand-600 border border-brand-600 flex items-center justify-center text-white text-[10px] font-bold">1</div>
            <span className="text-[9px] uppercase font-bold text-slate-400">Created</span>
          </div>

          <div className="relative z-10 flex flex-col items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-brand-600 border border-brand-600 flex items-center justify-center text-white text-[10px] font-bold">2</div>
            <span className="text-[9px] uppercase font-bold text-slate-400">Pending Review</span>
          </div>

          <div className="relative z-10 flex flex-col items-center gap-1">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border transition-colors ${
              !isPending
                ? approval.status === 'approved' ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-rose-600 border-rose-600 text-white'
                : 'bg-white border-slate-200 text-slate-400'
            }`}>3</div>
            <span className="text-[9px] uppercase font-bold text-slate-400">{!isPending ? approval.status : 'Decided'}</span>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-md">Quotation Line Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-3.5">Product</th>
                <th className="px-6 py-3.5">Quantity</th>
                <th className="px-6 py-3.5">Quoted Unit Price</th>
                <th className="px-6 py-3.5 text-right">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-600">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    <div className="font-bold text-slate-800">{item.rfq_items?.product_name || 'Item'}</div>
                    <div className="text-[10px] text-slate-400">{item.rfq_items?.specifications}</div>
                  </td>
                  <td className="px-6 py-4">{parseFloat(item.rfq_items?.quantity || 1)} {item.rfq_items?.unit}</td>
                  <td className="px-6 py-4">${parseFloat(item.unit_price).toFixed(2)}</td>
                  <td className="px-6 py-4 font-bold text-slate-800 text-right">${parseFloat(item.total_price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Decision block (Only managers or admin) */}
      {isPending && (user?.role === 'manager' || user?.role === 'admin') ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Workflow Decisions</h3>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Remarks / Action Notes</label>
            <textarea
              placeholder="Enter details about approval terms, or rejection reasons (required on reject)..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows="3"
              className="input-field py-2"
              disabled={submitting}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => handleAction('rejected')}
              className="btn-secondary py-3 px-6 text-rose-700 border-rose-200 hover:bg-rose-50"
              disabled={submitting}
            >
              <X className="w-4 h-4" /> Reject Bidding
            </button>
            <button
              onClick={() => handleAction('approved')}
              className="btn-primary py-3 px-6 bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-500/10 hover:shadow-emerald-500/20 border border-emerald-600"
              disabled={submitting}
            >
              <Check className="w-4 h-4" /> Approve Proposal
            </button>
          </div>
        </div>
      ) : (
        !isPending && (
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 text-slate-600 text-xs font-medium space-y-2">
            <h4 className="font-bold text-slate-700 uppercase tracking-wider">Workflow History Action Notes</h4>
            <p>Status: <span className="font-bold uppercase text-slate-800">{approval.status}</span></p>
            {approval.remarks && <p>Remarks: <span className="italic">"{approval.remarks}"</span></p>}
            <p>Actioned At: {new Date(approval.actioned_at).toLocaleString()}</p>
          </div>
        )
      )}

      {/* Workflow Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <div className={`flex items-center gap-3 mb-3 ${confirmAction === 'approved' ? 'text-emerald-600' : 'text-rose-600'}`}>
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 text-lg">
                Confirm {confirmAction === 'approved' ? 'Approval' : 'Rejection'}
              </h3>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              Are you sure you want to {confirmAction === 'approved' ? 'approve' : 'reject'} this quotation proposal?
              {confirmAction === 'approved' && ' This will authorize the generation of a Purchase Order.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="btn-secondary py-2 px-4 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={executeAction}
                className={`btn-primary py-2 px-4 text-xs font-bold text-white border ${
                  confirmAction === 'approved'
                    ? 'bg-emerald-600 hover:bg-emerald-700 border-emerald-600'
                    : 'bg-rose-600 hover:bg-rose-700 border-rose-600'
                }`}
              >
                Confirm {confirmAction === 'approved' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalDetails;
