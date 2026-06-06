import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Clock, Calendar, CheckSquare, Scale, CheckCircle2, User, HelpCircle, FileText, Play } from 'lucide-react';

const RfqDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch RFQ Details
  const { data: rfq, isLoading, error } = useQuery({
    queryKey: ['rfqDetails', id],
    queryFn: async () => {
      const res = await api.get(`/rfqs/${id}`);
      return res.data;
    }
  });

  // Mutator: Publish RFQ
  const publishMutation = useMutation({
    mutationFn: async () => {
      return api.patch(`/rfqs/${id}/status`, { status: 'open' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rfqDetails']);
    }
  });

  // Mutator: Close RFQ
  const closeMutation = useMutation({
    mutationFn: async () => {
      return api.patch(`/rfqs/${id}/status`, { status: 'closed' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['rfqDetails']);
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded"></div>
        <div className="h-44 bg-slate-200 rounded-2xl"></div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !rfq) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 shadow-sm rounded-2xl">
        <HelpCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-md font-bold text-slate-800">RFQ Not Found</h3>
        <p className="text-slate-500 text-sm mt-1 mb-4">The Request for Quotation details could not be loaded.</p>
        <button onClick={() => navigate('/rfqs')} className="btn-secondary text-sm">
          Return to RFQs
        </button>
      </div>
    );
  }

  // Stepper calculations
  const statuses = ['draft', 'open', 'closed', 'awarded'];
  const activeIndex = statuses.indexOf(rfq.status);

  const handlePublish = () => {
    if (window.confirm('Do you want to Publish this RFQ? Invited vendors will be notified to submit bids.')) {
      publishMutation.mutate();
    }
  };

  const handleClose = () => {
    if (window.confirm('Do you want to Close bidding for this RFQ? No further quotations can be submitted.')) {
      closeMutation.mutate();
    }
  };

  const getStatusBadge = (s) => {
    let base = "px-2.5 py-0.5 text-xs font-semibold rounded-full border ";
    switch (s) {
      case 'draft':
        return <span className={base + "bg-slate-50 text-slate-700 border-slate-200"}>Draft</span>;
      case 'open':
        return <span className={base + "bg-blue-50 text-blue-700 border-blue-200"}>Open / Bidding</span>;
      case 'closed':
        return <span className={base + "bg-amber-50 text-amber-700 border-amber-200"}>Closed</span>;
      case 'awarded':
        return <span className={base + "bg-emerald-50 text-emerald-700 border-emerald-200"}>Awarded</span>;
      default:
        return <span className={base + "bg-slate-50 text-slate-700 border-slate-200"}>{s}</span>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Back to List */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => navigate('/rfqs')}
          className="text-xs font-bold text-slate-500 hover:text-brand-600 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to RFQs List
        </button>
        {rfq.status !== 'draft' && user?.role !== 'vendor' && (
          <Link to={`/rfqs/${id}/compare`} className="btn-primary text-xs py-2">
            <Scale className="w-4 h-4" />
            Compare Quotations
          </Link>
        )}
      </div>

      {/* Main Details Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">{rfq.title}</h1>
              <div className="mt-0.5">{getStatusBadge(rfq.status)}</div>
            </div>
            <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-xl">{rfq.description || 'No description provided'}</p>
          </div>

          {/* Quick status actions */}
          {user?.role !== 'vendor' && (
            <div className="shrink-0 flex gap-2 w-full sm:w-auto">
              {rfq.status === 'draft' && (
                <button onClick={handlePublish} className="btn-primary text-xs py-2 flex-1 sm:flex-none">
                  <Play className="w-3.5 h-3.5" /> Publish Bids
                </button>
              )}
              {rfq.status === 'open' && (
                <button onClick={handleClose} className="btn-secondary text-xs py-2 text-amber-700 border-amber-200 hover:bg-amber-50 flex-1 sm:flex-none">
                  Close Bidding
                </button>
              )}
            </div>
          )}
        </div>

        {/* Deadline Banner */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-semibold text-slate-600">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" />
            <span>Deadline: {new Date(rfq.deadline).toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>Published: {new Date(rfq.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        {/* Status Timeline Stepper */}
        <div className="py-4">
          <div className="flex items-center justify-between max-w-lg mx-auto relative">
            {/* Background Line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-200 -translate-y-1/2 -z-0"></div>
            {statuses.map((s, idx) => {
              const isActive = idx <= activeIndex;
              const isCurrent = idx === activeIndex;
              return (
                <div key={s} className="relative z-10 flex flex-col items-center gap-1.5">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-colors font-bold text-xs ${
                      isActive
                        ? 'bg-brand-600 border-brand-600 text-white shadow-md shadow-brand-600/25'
                        : 'bg-white border-slate-200 text-slate-400'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <span
                    className={`text-[10px] uppercase font-bold tracking-wider ${
                      isCurrent ? 'text-brand-600' : 'text-slate-400'
                    }`}
                  >
                    {s}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid: Line Items vs Vendor Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Module A: Line Items */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between">
          <div>
            <div className="p-6 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 text-lg">Requested Line Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="px-6 py-3.5">Product Name</th>
                    <th className="px-6 py-3.5">Quantity</th>
                    <th className="px-6 py-3.5">Specifications</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-600">
                  {rfq.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 font-bold text-slate-800">{item.product_name}</td>
                      <td className="px-6 py-4">
                        {parseFloat(item.quantity)} {item.unit}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-400 max-w-[200px] truncate" title={item.specifications}>
                        {item.specifications || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Module B: Vendor Quotation Status Logs */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-slate-800 text-lg">Invited Vendor Status</h2>
          <div className="space-y-3">
            {rfq.invitedVendors.map((vendor) => {
              const quoteSubmitted = vendor.quotationStatus === 'submitted' || vendor.quotationStatus === 'accepted' || vendor.quotationStatus === 'rejected';
              return (
                <div
                  key={vendor.id}
                  className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <h4 className="font-bold text-slate-800">{vendor.name}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{vendor.contact_name}</p>
                  </div>
                  <div>
                    {quoteSubmitted ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        Submitted
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200 font-bold flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-500" />
                        Pending
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RfqDetails;
