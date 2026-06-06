import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FileText, Plus, Eye, Scale, RefreshCw, Clock, CheckCircle, HelpCircle, Loader2, AlertCircle } from 'lucide-react';

const RfqList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch RFQs
  const { data: rfqs = [], isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['rfqs'],
    queryFn: async () => {
      const res = await api.get('/rfqs');
      return res.data;
    }
  });

  // Mutator: Update status (publish)
  const publishRfqMutation = useMutation({
    mutationFn: async (id) => {
      return api.patch(`/rfqs/${id}/status`, { status: 'open' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      toast.success('RFQ has been published. Invited vendors can now submit quotations!');
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to publish RFQ.';
      toast.error(`Error: ${msg}`);
    }
  });

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

  const handlePublish = (id) => {
    if (window.confirm('Are you sure you want to Publish this RFQ? This will open bidding for invited vendors.')) {
      publishRfqMutation.mutate(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Requests for Quotation (RFQs)</h1>
          <p className="text-slate-500 font-medium mt-1">Manage vendor proposals, deadline terms, and quotation matrices.</p>
        </div>
        {user?.role !== 'vendor' && (
          <Link to="/rfqs/new" className="btn-primary">
            <Plus className="w-5 h-5" />
            Create RFQ
          </Link>
        )}
      </div>

      {/* Main Grid table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h2 className="font-bold text-slate-800 text-md">Platform RFQs</h2>
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
            Failed to retrieve RFQ records.
          </div>
        ) : rfqs.length === 0 ? (
          <div className="p-12 text-center max-w-sm mx-auto">
            <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
              <FileText className="w-7 h-7" />
            </div>
            <h3 className="text-md font-bold text-slate-800">No RFQs Found</h3>
            <p className="text-slate-500 text-xs mt-1 mb-6">No requests for quotations have been created yet. Launch one to invite bidding.</p>
            {user?.role !== 'vendor' && (
              <Link to="/rfqs/new" className="btn-primary text-xs py-2 px-4">
                Create First RFQ
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-3.5">RFQ Title</th>
                  <th className="px-6 py-3.5">Items Count</th>
                  <th className="px-6 py-3.5">Bidding Deadline</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Invited Vendors</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-600">
                {rfqs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-800">{r.title}</div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[200px]">{r.description || 'No description provided'}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-700">{r.itemsCount} lines</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1 text-xs text-slate-600">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(r.deadline).toLocaleDateString()} {new Date(r.deadline).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(r.status)}</td>
                    <td className="px-6 py-4">
                      <div className="text-xs truncate max-w-[200px]" title={r.invitedVendors?.join(', ')}>
                        {r.invitedVendors?.length > 0 ? r.invitedVendors.join(', ') : 'None assigned'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/rfqs/${r.id}`)}
                          className="p-1.5 rounded-lg border border-slate-200/80 hover:bg-slate-50 text-slate-500 hover:text-brand-600 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {r.status !== 'draft' && user?.role !== 'vendor' && (
                          <button
                            onClick={() => navigate(`/rfqs/${r.id}/compare`)}
                            className="p-1.5 rounded-lg border border-slate-200/80 hover:bg-slate-50 text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1 text-xs font-bold"
                            title="Compare Quotes"
                          >
                            <Scale className="w-4 h-4" />
                            Compare
                          </button>
                        )}
                        {r.status === 'draft' && user?.role !== 'vendor' && (
                          <button
                            onClick={() => handlePublish(r.id)}
                            disabled={publishRfqMutation.isPending}
                            className="px-2.5 py-1 rounded-lg bg-brand-50 border border-brand-200 text-brand-700 hover:bg-brand-600 hover:text-white transition-all text-xs font-bold flex items-center justify-center gap-1"
                          >
                            {publishRfqMutation.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'Publish'
                            )}
                          </button>
                        )}
                      </div>
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

export default RfqList;
