import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Clock, ShoppingBag, Truck, Receipt, CheckCircle, ShieldAlert, ArrowRight } from 'lucide-react';

const PoDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [updating, setUpdating] = useState(false);
  const [invoicing, setInvoicing] = useState(false);

  // Fetch PO details
  const { data: po, isLoading, error } = useQuery({
    queryKey: ['poDetails', id],
    queryFn: async () => {
      const res = await api.get(`/purchase-orders/${id}`);
      return res.data;
    }
  });

  // Mutator: Update status
  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      return api.put(`/purchase-orders/${id}`, { status: newStatus });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['poDetails']);
    }
  });

  // Mutator: Generate Invoice
  const generateInvoiceMutation = useMutation({
    mutationFn: async () => {
      return api.post('/invoices', { po_id: id });
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries(['poDetails']);
      alert('Invoice draft generated successfully!');
      navigate(`/invoices/${res.data.id}`);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to generate invoice.');
    }
  });

  const handleStatusChange = (newStatus) => {
    if (window.confirm(`Do you want to update the Purchase Order status to: ${newStatus.toUpperCase()}?`)) {
      setUpdating(true);
      updateStatusMutation.mutate(newStatus, {
        onSettled: () => setUpdating(false)
      });
    }
  };

  const handleGenerateInvoice = () => {
    if (window.confirm('Do you want to generate an Invoice draft from this Purchase Order?')) {
      setInvoicing(true);
      generateInvoiceMutation.mutate(null, {
        onSettled: () => setInvoicing(false)
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded"></div>
        <div className="h-44 bg-slate-200 rounded-2xl"></div>
        <div className="h-64 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !po) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 shadow-sm rounded-2xl">
        <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-md font-bold text-slate-800">Purchase Order Not Found</h3>
        <p className="text-slate-500 text-sm mt-1 mb-4">The purchase order record could not be loaded.</p>
        <button onClick={() => navigate('/purchase-orders')} className="btn-secondary text-sm">
          Return to POs
        </button>
      </div>
    );
  }

  const vendor = po.vendor || {};
  const items = po.items || [];
  const quotation = po.quotation || {};

  const getStatusBadge = (s) => {
    let base = "px-3 py-1 text-xs font-semibold rounded-full border ";
    switch (s) {
      case 'pending':
        return <span className={base + "bg-amber-50 text-amber-700 border-amber-200"}>Pending Shipment</span>;
      case 'confirmed':
        return <span className={base + "bg-blue-50 text-blue-700 border-blue-200"}>Confirmed & Processing</span>;
      case 'delivered':
        return <span className={base + "bg-emerald-50 text-emerald-700 border-emerald-200"}>Delivered</span>;
      default:
        return <span className={base + "bg-slate-50 text-slate-700 border-slate-200"}>{s}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Return link */}
      <div>
        <button
          onClick={() => navigate('/purchase-orders')}
          className="text-xs font-bold text-slate-500 hover:text-brand-600 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Purchase Orders
        </button>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center text-brand-600 shadow-sm shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Purchase Order: {po.po_number}</h1>
            <p className="text-slate-500 text-sm mt-0.5">Approved contract details and line specifications.</p>
          </div>
        </div>
        
        <div>{getStatusBadge(po.status)}</div>
      </div>

      {/* PO Detail Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Vendor */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Vendor details</h4>
          <h3 className="font-bold text-slate-800 text-sm">{vendor.name}</h3>
          <p className="text-xs text-slate-500">{vendor.contact_name} • {vendor.contact_email}</p>
          <p className="text-xs text-slate-400 font-medium">GSTIN: {vendor.gst_number}</p>
        </div>

        {/* Card 2: Ship To */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2">
          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ship To Address</h4>
          <h3 className="font-bold text-slate-800 text-sm">VendorBridge Corporate HQ</h3>
          <p className="text-xs text-slate-500">100 Tech Park Way, Sector 5</p>
          <p className="text-xs text-slate-400 font-medium">Mumbai, MH 400001, India</p>
        </div>

        {/* Card 3: Summary details */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-2 flex flex-col justify-between">
          <div>
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order Values</h4>
            <h3 className="text-lg font-extrabold text-slate-800 mt-1">${parseFloat(quotation.total_price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold">Ordered: {new Date(po.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-md">Items Ordered</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                <th className="px-6 py-3.5">Product Name</th>
                <th className="px-6 py-3.5">Quantity</th>
                <th className="px-6 py-3.5">Unit Price</th>
                <th className="px-6 py-3.5 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-600">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 font-bold text-slate-800">{item.rfq_items?.product_name || 'Item'}</td>
                  <td className="px-6 py-4">{parseFloat(item.rfq_items?.quantity || 1)} {item.rfq_items?.unit}</td>
                  <td className="px-6 py-4">${parseFloat(item.unit_price).toFixed(2)}</td>
                  <td className="px-6 py-4 font-bold text-slate-800 text-right">${parseFloat(item.total_price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Footer */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
        {/* Status updates (Procurement, Manager, Admins) */}
        {user?.role !== 'vendor' ? (
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">PO Status Workflow:</span>
            <button
              onClick={() => handleStatusChange('confirmed')}
              disabled={updating || po.status === 'confirmed' || po.status === 'delivered'}
              className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50/20 hover:bg-blue-50 text-xs font-bold disabled:opacity-50 transition-colors"
            >
              Confirm Order
            </button>
            <button
              onClick={() => handleStatusChange('delivered')}
              disabled={updating || po.status === 'delivered'}
              className="px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50/20 hover:bg-emerald-50 text-xs font-bold disabled:opacity-50 transition-colors"
            >
              <Truck className="w-3.5 h-3.5 inline mr-1" />
              Mark Delivered
            </button>
          </div>
        ) : (
          <div></div>
        )}

        {/* Invoice Actions */}
        <div>
          {po.invoiceExists ? (
            <button
              onClick={() => navigate(`/invoices/${po.invoiceId}`)}
              className="btn-secondary text-xs py-2.5 px-5 flex items-center gap-1.5 border-brand-200 text-brand-700 hover:bg-brand-50"
            >
              <Receipt className="w-4 h-4" />
              View Generated Invoice
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            user?.role !== 'vendor' && (
              <button
                onClick={handleGenerateInvoice}
                disabled={invoicing}
                className="btn-primary text-xs py-2.5 px-5"
              >
                {invoicing ? (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Receipt className="w-4 h-4" />
                    Generate Invoice Draft
                  </>
                )}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default PoDetails;
