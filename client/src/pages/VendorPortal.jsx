import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, FileText, Send, ShoppingBag, Receipt, ArrowUpRight, CheckCircle2 } from 'lucide-react';

const VendorPortal = () => {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden border border-slate-800 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-600/20 rounded-full blur-3xl -z-0 pointer-events-none"></div>
        <div className="relative z-10 space-y-4 max-w-xl">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-brand-500/20 border border-brand-500/30 text-brand-300">
            Vendor Bridge Network
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Welcome back, <span className="text-brand-300">{user?.name}</span>
          </h1>
          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            Manage your corporate credentials, view incoming RFQs from procurement officers, submit quotations, and track active purchase orders and invoices.
          </p>
        </div>
      </div>

      {/* Vendor Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active RFQ Invites</span>
            <h3 className="text-2xl font-extrabold text-slate-800">2</h3>
            <span className="text-[10px] text-brand-500 font-semibold">Bidding open</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center text-brand-500">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Submitted Quotes</span>
            <h3 className="text-2xl font-extrabold text-slate-800">4</h3>
            <span className="text-[10px] text-emerald-500 font-semibold">1 Accepted</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500">
            <Send className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active POs</span>
            <h3 className="text-2xl font-extrabold text-slate-800">1</h3>
            <span className="text-[10px] text-amber-500 font-semibold">Processing delivery</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-500">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paid Invoices</span>
            <h3 className="text-2xl font-extrabold text-slate-800">3</h3>
            <span className="text-[10px] text-blue-500 font-semibold">Cleared this month</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500">
            <Receipt className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main portal layout columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active RFQ list */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-800 text-lg">Invited Request for Quotations (RFQs)</h2>
            <span className="text-xs text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors px-2.5 py-1 rounded-lg font-bold cursor-pointer">View All Bids</span>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:border-brand-200 transition-colors flex justify-between items-center group">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-sm group-hover:text-brand-600 transition-colors">Enterprise Server Upgrade</h4>
                <p className="text-xs text-slate-400 font-medium">Bidding Deadline: July 15, 2026</p>
              </div>
              <button className="flex items-center gap-1.5 text-xs font-bold text-brand-600 border border-brand-200 hover:bg-brand-600 hover:text-white transition-all duration-200 px-3 py-2 rounded-xl">
                Submit Proposal <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:border-brand-200 transition-colors flex justify-between items-center group">
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-sm group-hover:text-brand-600 transition-colors">Office Ergonomic Chairs</h4>
                <p className="text-xs text-slate-400 font-medium">Bidding Deadline: June 25, 2026</p>
              </div>
              <button className="flex items-center gap-1.5 text-xs font-bold text-brand-600 border border-brand-200 hover:bg-brand-600 hover:text-white transition-all duration-200 px-3 py-2 rounded-xl">
                Submit Proposal <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Vendor Profile Status */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
          <h2 className="font-bold text-slate-800 text-lg">Vendor Credentials</h2>
          <div className="p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-emerald-800">GST Registration Active</h4>
              <p className="text-xs text-emerald-600/80 font-semibold mt-0.5">GSTIN: 27AAAAA1111A1Z1</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center text-xs font-medium border-b border-slate-100 pb-3">
              <span className="text-slate-400">Account Status</span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">Active</span>
            </div>
            <div className="flex justify-between items-center text-xs font-medium border-b border-slate-100 pb-3">
              <span className="text-slate-400">Business Category</span>
              <span className="text-slate-700 font-semibold">Electronics & IT</span>
            </div>
            <div className="flex justify-between items-center text-xs font-medium pb-2">
              <span className="text-slate-400">Primary Contact</span>
              <span className="text-slate-700 font-semibold">John Doe</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VendorPortal;
