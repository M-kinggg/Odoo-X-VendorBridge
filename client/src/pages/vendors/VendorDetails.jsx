import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import { ArrowLeft, Mail, Phone, FileText, CheckCircle2, ShieldAlert, Award, Calendar, ExternalLink } from 'lucide-react';

const VendorDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: vendor, isLoading, error } = useQuery({
    queryKey: ['vendorDetails', id],
    queryFn: async () => {
      const res = await api.get(`/vendors/${id}`);
      return res.data;
    }
  });

  const getStatusBadge = (s) => {
    let base = "px-3 py-1 text-xs font-semibold rounded-full border ";
    switch (s) {
      case 'active':
        return <span className={base + "bg-emerald-50 text-emerald-700 border-emerald-200"}>Active Partner</span>;
      case 'inactive':
        return <span className={base + "bg-rose-50 text-rose-700 border-rose-200"}>Inactive / Suspended</span>;
      case 'pending':
        return <span className={base + "bg-amber-50 text-amber-700 border-amber-200"}>Pending Verification</span>;
      default:
        return <span className={base + "bg-slate-50 text-slate-700 border-slate-200"}>{s}</span>;
    }
  };

  const getQuoteBadge = (status) => {
    let base = "px-2 py-0.5 text-xs font-semibold rounded-full border ";
    switch (status) {
      case 'submitted':
        return <span className={base + "bg-blue-50 text-blue-700 border-blue-200"}>Submitted</span>;
      case 'accepted':
        return <span className={base + "bg-emerald-50 text-emerald-700 border-emerald-200"}>Accepted</span>;
      case 'rejected':
        return <span className={base + "bg-rose-50 text-rose-700 border-rose-200"}>Rejected</span>;
      default:
        return <span className={base + "bg-slate-50 text-slate-700 border-slate-200"}>{status}</span>;
    }
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

  if (error || !vendor) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 shadow-sm rounded-2xl">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-md font-bold text-slate-800">Vendor Profile Not Found</h3>
        <p className="text-slate-500 text-sm mt-1 mb-4">The vendor ID is invalid or has been deleted.</p>
        <button onClick={() => navigate('/vendors')} className="btn-secondary text-sm">
          Return to Registry
        </button>
      </div>
    );
  }

  const quotes = vendor.quotations || [];
  const acceptedQuotes = quotes.filter(q => q.status === 'accepted');
  const quoteTotal = quotes.reduce((acc, q) => acc + parseFloat(q.total_price), 0);
  const acceptedTotal = acceptedQuotes.reduce((acc, q) => acc + parseFloat(q.total_price), 0);

  return (
    <div className="space-y-8">
      {/* Return link */}
      <div>
        <button
          onClick={() => navigate('/vendors')}
          className="text-xs font-bold text-slate-500 hover:text-brand-600 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Vendor Registry
        </button>
      </div>

      {/* Main Vendor Profile Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 flex flex-col lg:flex-row justify-between gap-6">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">{vendor.name}</h1>
            <div className="mt-1">{getStatusBadge(vendor.status)}</div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm text-slate-500 font-medium">
            <p className="flex items-center gap-2">
              <span className="font-bold text-slate-400">Category:</span> {vendor.category}
            </p>
            <p className="flex items-center gap-2">
              <span className="font-bold text-slate-400">GST Number:</span> <span className="font-mono">{vendor.gst_number}</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="font-bold text-slate-400">Linked Contact:</span> {vendor.contact_name}
            </p>
            <p className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" /> Registered {new Date(vendor.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Contact Info Cards */}
        <div className="flex flex-col sm:flex-row gap-4 lg:self-center shrink-0">
          <a
            href={`mailto:${vendor.contact_email}`}
            className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50 flex items-center gap-3.5 hover:border-brand-300 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-brand-600 transition-colors shadow-sm">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Email Address</p>
              <p className="text-sm font-semibold text-slate-800">{vendor.contact_email}</p>
            </div>
          </a>

          <a
            href={`tel:${vendor.contact_phone}`}
            className="p-4 rounded-2xl border border-slate-200/80 bg-slate-50 flex items-center gap-3.5 hover:border-brand-300 transition-colors group"
          >
            <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover:text-brand-600 transition-colors shadow-sm">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Phone Number</p>
              <p className="text-sm font-semibold text-slate-800">{vendor.contact_phone}</p>
            </div>
          </a>
        </div>
      </div>

      {/* Stats Summary Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-28">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Bids Submitted</span>
          <div className="flex justify-between items-end">
            <h3 className="text-3xl font-black text-slate-800">{quotes.length}</h3>
            <span className="text-sm text-slate-400 font-semibold">${quoteTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })} value</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-28">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Accepted Quotations</span>
          <div className="flex justify-between items-end">
            <h3 className="text-3xl font-black text-emerald-600">{acceptedQuotes.length}</h3>
            <span className="text-sm text-slate-400 font-semibold">${acceptedTotal.toLocaleString('en-US', { maximumFractionDigits: 0 })} contract value</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-28">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Win Rate Percentage</span>
          <div className="flex justify-between items-end">
            <h3 className="text-3xl font-black text-brand-600">
              {quotes.length > 0 ? Math.round((acceptedQuotes.length / quotes.length) * 100) : 0}%
            </h3>
            <span className="text-sm text-slate-400 font-semibold">Accepted vs Submitted</span>
          </div>
        </div>
      </div>

      {/* Historical Quotations Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-800 text-lg">Quotation & Proposal History</h2>
          <span className="text-xs font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">Historical Submissions</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-3.5">RFQ Title</th>
                <th className="px-6 py-3.5">Grand Total Price</th>
                <th className="px-6 py-3.5">Delivery Timeline</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Submitted Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-600">
              {quotes.length > 0 ? (
                quotes.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{q.rfqs?.title || 'Unknown RFQ'}</td>
                    <td className="px-6 py-4 font-extrabold text-slate-800">${parseFloat(q.total_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="px-6 py-4">{q.delivery_days} days</td>
                    <td className="px-6 py-4">{getQuoteBadge(q.status)}</td>
                    <td className="px-6 py-4 text-xs text-slate-400 text-right">{new Date(q.submitted_at).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-400">This vendor has not submitted any quotations yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default VendorDetails;
