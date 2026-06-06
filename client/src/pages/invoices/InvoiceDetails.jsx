import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { ArrowLeft, Printer, Mail, DollarSign, Download, Check, AlertCircle, X } from 'lucide-react';

const InvoiceDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Modal Email State
  const [emailOpen, setEmailOpen] = useState(false);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);

  // Local Tax Input edit state
  const [taxPercent, setTaxPercent] = useState('18');
  const [updatingTax, setUpdatingTax] = useState(false);

  // Fetch Invoice Details
  const { data: inv, isLoading, error } = useQuery({
    queryKey: ['invoiceDetails', id],
    queryFn: async () => {
      const res = await api.get(`/invoices/${id}`);
      return res.data;
    },
    onSuccess: (data) => {
      setTaxPercent(data.tax_percent.toString());
      setEmailTo(data.vendor?.contact_email || '');
      setEmailSubject(`VendorBridge Invoice: ${data.invoice_number}`);
      setEmailBody(`Dear ${data.vendor?.contact_name || 'Vendor Partner'},\n\nPlease find attached the invoice ${data.invoice_number} generated for Purchase Order ${data.po?.po_number || 'N/A'}.\n\nTotal Due: $${data.total.toFixed(2)}\n\nBest regards,\nVendorBridge Procurement Team`);
    }
  });

  // Mutator: Update Status or Tax
  const updateInvoiceMutation = useMutation({
    mutationFn: async (payload) => {
      return api.put(`/invoices/${id}`, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['invoiceDetails']);
    }
  });

  // Mutator: Send email
  const sendEmailMutation = useMutation({
    mutationFn: async (payload) => {
      return api.post(`/invoices/${id}/send-email`, payload);
    }
  });

  const handleStatusChange = (newStatus) => {
    if (window.confirm(`Do you want to set this invoice status to: ${newStatus.toUpperCase()}?`)) {
      updateInvoiceMutation.mutate({ status: newStatus });
    }
  };

  const handleTaxUpdate = (e) => {
    e.preventDefault();
    const rate = parseFloat(taxPercent);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      alert('Please enter a valid tax percentage between 0 and 100.');
      return;
    }
    setUpdatingTax(true);
    updateInvoiceMutation.mutate({ tax_percent: rate }, {
      onSettled: () => setUpdatingTax(false)
    });
  };

  const handleSendEmailSubmit = async (e) => {
    e.preventDefault();
    setEmailError('');
    setEmailSuccess('');

    if (!emailTo.trim() || !emailSubject.trim() || !emailBody.trim()) {
      return setEmailError('All email fields are required.');
    }

    setSendingEmail(true);
    try {
      await sendEmailMutation.mutateAsync({
        to: emailTo,
        subject: emailSubject,
        body: emailBody
      });
      setEmailSuccess('Invoice email successfully dispatched via simulated SMTP server!');
      setTimeout(() => {
        setEmailOpen(false);
        setEmailSuccess('');
      }, 2000);
    } catch (err) {
      setEmailError(err.response?.data?.message || 'Failed to dispatch email.');
    } finally {
      setSendingEmail(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded"></div>
        <div className="h-96 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (error || !inv) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 shadow-sm rounded-2xl">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-md font-bold text-slate-800">Invoice Not Found</h3>
        <p className="text-slate-500 text-sm mt-1 mb-4">The invoice profile could not be retrieved from the server.</p>
        <button onClick={() => navigate('/invoices')} className="btn-secondary text-sm">
          Return to Registry
        </button>
      </div>
    );
  }

  const po = inv.po || {};
  const vendor = inv.vendor || {};
  const items = inv.items || [];

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
    <div className="space-y-6 max-w-4xl mx-auto relative">
      {/* Return & Toolbar (hidden during print) */}
      <div className="flex justify-between items-center print:hidden">
        <button
          onClick={() => navigate('/invoices')}
          className="text-xs font-bold text-slate-500 hover:text-brand-600 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </button>

        <div className="flex gap-2.5">
          <button
            onClick={() => setEmailOpen(true)}
            className="btn-secondary text-xs py-2 px-3 border border-slate-200/80 hover:bg-slate-50"
          >
            <Mail className="w-4 h-4 text-slate-500" />
            Send via Email
          </button>
          <button
            onClick={handlePrint}
            className="btn-primary text-xs py-2 px-3 flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Print / PDF
          </button>
        </div>
      </div>

      {/* Invoice Sheet container */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-3xl p-8 sm:p-12 space-y-8 print:border-0 print:shadow-none print:p-0">
        {/* Invoice Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-100 pb-8">
          <div className="space-y-2">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-brand-600 rounded-xl flex items-center justify-center shadow-md shadow-brand-600/30">
                <span className="text-white font-black text-sm">VB</span>
              </div>
              <span className="font-extrabold text-slate-800 text-lg tracking-tight">VendorBridge Corp.</span>
            </div>
            <p className="text-xs text-slate-400 font-medium">100 Tech Park Way, Sector 5, Mumbai, MH, 400001</p>
          </div>

          <div className="text-left sm:text-right space-y-1">
            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Invoice</h2>
            <p className="text-sm font-bold text-slate-800">Invoice #: {inv.invoice_number}</p>
            <p className="text-xs text-slate-400 font-medium">PO Ref: {po.po_number || 'N/A'}</p>
            <p className="text-[11px] pt-1">{getStatusBadge(inv.status)}</p>
          </div>
        </div>

        {/* Addresses block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs font-semibold text-slate-500">
          <div className="space-y-2">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bill To:</h4>
            <h3 className="font-bold text-slate-800 text-sm">{vendor.name}</h3>
            <p>{vendor.contact_name}</p>
            <p>{vendor.contact_email} • {vendor.contact_phone}</p>
            <p className="font-mono text-slate-400">GSTIN: {vendor.gst_number}</p>
          </div>

          <div className="space-y-1 sm:text-right">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Invoice Details:</h4>
            <p className="text-slate-800">Date: {new Date(inv.created_at).toLocaleDateString()}</p>
            <p className="text-slate-800">Payment Terms: NET 30</p>
            <p className="text-slate-800 font-bold">Due Date: {new Date(new Date(inv.created_at).getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString()}</p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <th className="px-6 py-3">Product Name</th>
                <th className="px-6 py-3">Quantity</th>
                <th className="px-6 py-3">Unit Price</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-600">
              {items.map((item, idx) => (
                <tr key={item.id || idx}>
                  <td className="px-6 py-3.5 font-bold text-slate-800">{item.rfq_items?.product_name || 'Item'}</td>
                  <td className="px-6 py-3.5">{parseFloat(item.rfq_items?.quantity || 1)} {item.rfq_items?.unit}</td>
                  <td className="px-6 py-3.5">${parseFloat(item.unit_price).toFixed(2)}</td>
                  <td className="px-6 py-3.5 text-right font-bold text-slate-800">${parseFloat(item.total_price).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Financial Summary */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 pt-4">
          <div className="w-full sm:max-w-xs space-y-4 print:hidden">
            {/* Tax Modifier form */}
            {user?.role !== 'vendor' ? (
              <form onSubmit={handleTaxUpdate} className="flex gap-2 items-end">
                <div className="space-y-1.5 flex-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Modify Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={taxPercent}
                    onChange={(e) => setTaxPercent(e.target.value)}
                    className="input-field py-1.5 text-xs bg-slate-50/50"
                  />
                </div>
                <button
                  type="submit"
                  disabled={updatingTax}
                  className="btn-secondary text-[11px] py-2 px-3"
                >
                  Apply
                </button>
              </form>
            ) : null}
          </div>

          <div className="w-full sm:w-80 space-y-2 text-xs font-semibold text-slate-500 self-end">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span>Subtotal:</span>
              <span className="text-slate-800">${parseFloat(inv.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span>Tax ({inv.tax_percent}%):</span>
              <span className="text-slate-800">${parseFloat(inv.tax_amount).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-extrabold text-slate-900 pt-1">
              <span>Grand Total Due:</span>
              <span>${parseFloat(inv.total).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice State Transitions (Procurement/Admins) */}
      {user?.role !== 'vendor' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap gap-2 items-center print:hidden">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Invoice Status Actions:</span>
          <button
            onClick={() => handleStatusChange('sent')}
            disabled={inv.status === 'sent' || inv.status === 'paid'}
            className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50/20 hover:bg-blue-50 text-xs font-bold disabled:opacity-50"
          >
            Mark Sent
          </button>
          <button
            onClick={() => handleStatusChange('paid')}
            disabled={inv.status === 'paid'}
            className="px-3 py-1.5 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50/20 hover:bg-emerald-50 text-xs font-bold disabled:opacity-50"
          >
            Mark Paid
          </button>
        </div>
      )}

      {/* Send Email Modal Drawer */}
      {emailOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm print:hidden">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 relative flex flex-col justify-between max-h-[85vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Email Invoice</h3>
              <button onClick={() => setEmailOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {emailError && (
              <div className="my-3 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{emailError}</span>
              </div>
            )}

            {emailSuccess && (
              <div className="my-3 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-start gap-2 text-xs">
                <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{emailSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSendEmailSubmit} className="space-y-4 py-4 overflow-y-auto flex-1 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Recipient Email</label>
                <input
                  type="email"
                  value={emailTo}
                  onChange={(e) => setEmailTo(e.target.value)}
                  className="input-field py-2 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Subject Line</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="input-field py-2 text-xs"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Email Message Body</label>
                <textarea
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  rows="6"
                  className="input-field py-2 text-xs font-sans leading-relaxed"
                  required
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setEmailOpen(false)}
                  className="btn-secondary text-xs py-2"
                  disabled={sendingEmail}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-xs py-2"
                  disabled={sendingEmail}
                >
                  {sendingEmail ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    'Dispatch Invoice Email'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceDetails;
