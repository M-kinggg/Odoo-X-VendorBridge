import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../services/api';
import { ArrowLeft, Clock, DollarSign, Send, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';

const quotationSchema = z.object({
  delivery_days: z.coerce.number().min(1, 'Delivery timeline must be at least 1 day'),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      rfq_item_id: z.string(),
      product_name: z.string(),
      unit: z.string(),
      quantity: z.coerce.number(),
      specifications: z.string().nullable().optional(),
      unit_price: z.coerce.number().min(0.01, 'Price must be greater than zero')
    })
  )
});

const SubmitQuotation = () => {
  const { id } = useParams(); // RFQ ID
  const navigate = useNavigate();

  const [quoteId, setQuoteId] = useState(null);
  const [quoteStatus, setQuoteStatus] = useState('pending'); // pending, submitted, accepted, rejected
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(quotationSchema),
    defaultValues: {
      delivery_days: 7,
      notes: '',
      items: []
    }
  });

  const { fields } = useFieldArray({
    control,
    name: 'items'
  });

  // 1. Fetch RFQ details (including invited status)
  const { data: rfq, isLoading: rfqLoading, error: rfqError } = useQuery({
    queryKey: ['vendorRfqDetails', id],
    queryFn: async () => {
      const res = await api.get(`/rfqs/${id}`);
      return res.data;
    }
  });

  // Pre-populate if quotation already exists
  useEffect(() => {
    if (rfq) {
      const existingQuote = rfq.quotations?.[0];
      
      if (existingQuote) {
        setQuoteId(existingQuote.id);
        setQuoteStatus(existingQuote.status);

        // Fetch quotation items details
        api.get(`/quotations/${existingQuote.id}`).then(res => {
          const qItems = res.data.items || [];
          const itemsValue = rfq.items.map(item => {
            const matchedQItem = qItems.find(qi => qi.rfq_item_id === item.id);
            return {
              rfq_item_id: item.id,
              product_name: item.product_name,
              unit: item.unit,
              quantity: item.quantity,
              specifications: item.specifications || '',
              unit_price: matchedQItem ? matchedQItem.unit_price : ''
            };
          });

          reset({
            delivery_days: existingQuote.delivery_days,
            notes: existingQuote.notes || '',
            items: itemsValue
          });
        }).catch(err => {
          console.error('Failed to load quotation items:', err);
        });
      } else {
        reset({
          delivery_days: 7,
          notes: '',
          items: rfq.items.map(item => ({
            rfq_item_id: item.id,
            product_name: item.product_name,
            unit: item.unit,
            quantity: item.quantity,
            specifications: item.specifications || '',
            unit_price: ''
          }))
        });
      }
    }
  }, [rfq, reset]);

  // Mutations
  const submitQuoteMutation = useMutation({
    mutationFn: async (payload) => {
      if (quoteId) {
        return api.put(`/quotations/${quoteId}`, payload);
      } else {
        return api.post('/quotations', payload);
      }
    }
  });

  const onSubmitForm = async (data) => {
    if (quoteStatus !== 'pending' && quoteStatus !== 'submitted') {
      toast.error('This quotation has been finalized (accepted/rejected) and can no longer be edited.');
      return;
    }

    setSubmitting(true);
    try {
      const itemsPayload = data.items.map(item => ({
        rfq_item_id: item.rfq_item_id,
        unit_price: parseFloat(item.unit_price)
      }));

      const payload = {
        rfq_id: id,
        delivery_days: parseInt(data.delivery_days),
        notes: data.notes,
        items: itemsPayload
      };

      const res = await submitQuoteMutation.mutateAsync(payload);
      toast.success(quoteId ? 'Quotation successfully updated!' : 'Quotation successfully submitted!');
      setQuoteId(res.data.id);
      setQuoteStatus('submitted');
      
      setTimeout(() => {
        navigate('/vendor-portal');
      }, 1500);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed. Please check parameters.');
    } finally {
      setSubmitting(false);
    }
  };

  // Compute Grand Total
  const watchedItems = watch('items') || [];
  const grandTotal = watchedItems.reduce((acc, item) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.unit_price) || 0;
    return acc + (qty * price);
  }, 0);

  if (rfqLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-6 w-32 bg-slate-200 rounded"></div>
        <div className="h-96 bg-slate-200 rounded-2xl"></div>
      </div>
    );
  }

  if (rfqError || !rfq) {
    return (
      <div className="p-8 text-center bg-white border border-slate-200 shadow-sm rounded-2xl">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
        <h3 className="text-md font-bold text-slate-800">RFQ Request Not Found</h3>
        <p className="text-slate-500 text-sm mt-1 mb-4">You may not be invited to bid on this RFQ, or it was deleted.</p>
        <button onClick={() => navigate('/vendor-portal')} className="btn-secondary text-sm">
          Return to Portal
        </button>
      </div>
    );
  }

  const isLocked = quoteStatus === 'accepted' || quoteStatus === 'rejected';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Back to portal */}
      <div>
        <button
          onClick={() => navigate('/vendor-portal')}
          className="text-xs font-bold text-slate-500 hover:text-brand-600 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Vendor Portal
        </button>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center text-brand-600 shadow-sm shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Submit Quotation Proposal</h1>
            <p className="text-slate-500 text-sm mt-0.5">RFQ Invitation: "{rfq.title}"</p>
          </div>
        </div>

        <div>
          {quoteStatus === 'accepted' && (
            <span className="px-3 py-1 rounded-full bg-emerald-100 border border-emerald-300 text-emerald-800 font-bold text-xs flex items-center gap-1">
              <ShieldCheck className="w-4 h-4" /> Accepted Bidding
            </span>
          )}
          {quoteStatus === 'rejected' && (
            <span className="px-3 py-1 rounded-full bg-rose-100 border border-rose-300 text-rose-800 font-bold text-xs flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> Bidding Rejected
            </span>
          )}
          {quoteStatus === 'submitted' && (
            <span className="px-3 py-1 rounded-full bg-blue-100 border border-blue-300 text-blue-800 font-bold text-xs flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Bid Submitted (Editable)
            </span>
          )}
        </div>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-2.5 text-xs animate-shake">
          <AlertTriangle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Please correct the following errors before submitting:</p>
            <ul className="list-disc pl-4 mt-1 space-y-0.5 font-medium">
              {errors.delivery_days && <li>{errors.delivery_days.message}</li>}
              {errors.items && <li>Check that all line items have a unit price greater than $0.00.</li>}
            </ul>
          </div>
        </div>
      )}

      {/* RFQ Description banner */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 border border-slate-800 space-y-2">
        <h4 className="text-xs font-bold text-brand-300 uppercase tracking-wider">RFQ Bidding Details & Scope</h4>
        <p className="text-sm text-slate-300 leading-relaxed font-medium">{rfq.description || 'No additional scope details provided'}</p>
        <p className="text-[10px] text-slate-400 pt-1 font-bold">Bidding Closes: {new Date(rfq.deadline).toLocaleString()}</p>
      </div>

      <form onSubmit={handleSubmit(onSubmitForm)} className="space-y-6">
        {/* Module A: pricing line items */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Line Items Pricing</h3>
          
          <div className="space-y-4">
            {fields.map((item, idx) => {
              const qty = parseFloat(item.quantity) || 0;
              const unitPrice = parseFloat(watch(`items.${idx}.unit_price`)) || 0;
              const lineTotal = unitPrice * qty;

              return (
                <div key={item.id} className="space-y-1">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                    <div className="flex-1 space-y-1">
                      <h4 className="font-bold text-slate-800 text-sm">{item.product_name}</h4>
                      <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">Specifications: {item.specifications || 'N/A'}</p>
                    </div>
                    
                    <div className="flex gap-4 items-center shrink-0 w-full sm:w-auto">
                      {/* Read only quantity */}
                      <div className="text-center bg-white px-3 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 w-24">
                        Qty: {qty} {item.unit}
                      </div>

                      {/* Unit Price input */}
                      <div className="relative w-36">
                        <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="0.00"
                          {...register(`items.${idx}.unit_price`)}
                          className={`input-field pl-7 py-2 text-xs font-bold ${errors.items?.[idx]?.unit_price ? 'border-rose-300 focus:ring-rose-500/20' : ''}`}
                          disabled={isLocked || submitting}
                        />
                      </div>

                      {/* Line Total */}
                      <div className="w-28 text-right font-extrabold text-slate-800 text-xs shrink-0">
                        Total: ${lineTotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                  {errors.items?.[idx]?.unit_price && (
                    <p className="text-rose-500 text-[10px] font-semibold px-4">• {errors.items[idx].unit_price.message}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Module B: timelines and comments */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="space-y-1 sm:col-span-1">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
              <Clock className="w-4 h-4 text-slate-400" />
              Delivery Timeline (days)
            </label>
            <input
              type="number"
              min="1"
              {...register('delivery_days')}
              className={`input-field py-2 bg-slate-50/20 text-xs font-semibold ${errors.delivery_days ? 'border-rose-300' : ''}`}
              disabled={isLocked || submitting}
            />
            {errors.delivery_days && <p className="text-rose-500 text-[10px] font-semibold">{errors.delivery_days.message}</p>}
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-bold text-slate-700">Proposal Remarks / Notes</label>
            <input
              type="text"
              placeholder="Provide information about warranty terms, parts replacement, etc..."
              {...register('notes')}
              className="input-field py-2 bg-slate-50/20 text-xs"
              disabled={isLocked || submitting}
            />
          </div>
        </div>

        {/* Grand Total & Submission */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Grand Total Price Proposal</span>
            <h3 className="text-2xl font-black text-slate-800 mt-1">${grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</h3>
          </div>

          {!isLocked && (
            <button
              type="submit"
              className="btn-primary py-3 px-8 shadow-md"
              disabled={submitting}
            >
              {submitting ? (
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {quoteId ? 'Update Quotation' : 'Submit Quotation Bid'}
                </>
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
};

export default SubmitQuotation;
