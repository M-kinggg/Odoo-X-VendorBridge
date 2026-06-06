import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '../../services/api';
import { ArrowLeft, Trash2, Plus, FileText, Check, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const rfqSchema = z.object({
  title: z.string().min(1, 'RFQ Title is required'),
  description: z.string().optional(),
  deadline: z.string().min(1, 'Please select a bidding deadline date & time').refine((val) => {
    return new Date(val) > new Date();
  }, { message: 'Deadline date must be in the future.' }),
  attachment: z.string().optional(),
  items: z.array(
    z.object({
      product_name: z.string().min(1, 'Product name is required'),
      quantity: z.coerce.number().min(1, 'Quantity must be at least 1'),
      unit: z.enum(['pcs', 'kg', 'litre', 'set']),
      specifications: z.string().optional()
    })
  ).min(1, 'At least one line item is required'),
  vendorIds: z.array(z.string()).min(1, 'Please invite at least one vendor partner to submit proposals.')
});

const RfqNew = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  // Fetch active Vendors list to invite
  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendorsListForInvite'],
    queryFn: async () => {
      const res = await api.get('/vendors', { params: { status: 'active' } });
      return res.data;
    }
  });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(rfqSchema),
    defaultValues: {
      title: '',
      description: '',
      deadline: '',
      attachment: '',
      items: [{ product_name: '', quantity: 1, unit: 'pcs', specifications: '' }],
      vendorIds: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const watchedVendorIds = watch('vendorIds') || [];

  // Mutator: Create RFQ
  const createRfqMutation = useMutation({
    mutationFn: async (payload) => {
      return api.post('/rfqs', payload);
    }
  });

  // Mutator: Publish RFQ
  const publishRfqMutation = useMutation({
    mutationFn: async (id) => {
      return api.patch(`/rfqs/${id}/status`, { status: 'open' });
    }
  });

  const handleVendorToggle = (vId) => {
    if (watchedVendorIds.includes(vId)) {
      setValue('vendorIds', watchedVendorIds.filter(id => id !== vId), { shouldValidate: true });
    } else {
      setValue('vendorIds', [...watchedVendorIds, vId], { shouldValidate: true });
    }
  };

  const onSubmitForm = async (data, shouldPublish) => {
    setSubmitting(true);
    try {
      const payload = {
        title: data.title,
        description: data.description,
        deadline: data.deadline,
        items: data.items,
        vendorIds: data.vendorIds
      };

      const res = await createRfqMutation.mutateAsync(payload);
      const rfqId = res.data.id;

      if (shouldPublish) {
        await publishRfqMutation.mutateAsync(rfqId);
        toast.success('RFQ created and published successfully!');
      } else {
        toast.success('RFQ draft saved successfully!');
      }

      navigate('/rfqs');
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to create RFQ.';
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddItem = () => {
    append({ product_name: '', quantity: 1, unit: 'pcs', specifications: '' });
  };

  const handleRemoveItem = (index) => {
    if (fields.length === 1) return;
    remove(index);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Return Link */}
      <div>
        <button
          onClick={() => navigate('/rfqs')}
          className="text-xs font-bold text-slate-500 hover:text-brand-600 flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to RFQs List
        </button>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-50 border border-brand-100 rounded-xl flex items-center justify-center text-brand-600 shadow-sm shrink-0">
          <FileText className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create Request for Quotation</h1>
          <p className="text-slate-500 text-sm mt-0.5">Specify procurement line items and invite verified vendor bidding partners.</p>
        </div>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-2.5 text-xs">
          <AlertCircle className="w-4.5 h-4.5 text-rose-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold">Please correct the following errors before submitting:</p>
            <ul className="list-disc pl-4 mt-1 space-y-0.5 font-medium">
              {errors.title && <li>{errors.title.message}</li>}
              {errors.deadline && <li>{errors.deadline.message}</li>}
              {errors.items && <li>Check that all line items have a product name and valid quantity.</li>}
              {errors.vendorIds && <li>{errors.vendorIds.message}</li>}
            </ul>
          </div>
        </div>
      )}

      <form className="space-y-6">
        {/* Module A: Main Parameters */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">RFQ Parameters</h3>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">RFQ Title / Subject</label>
            <input
              type="text"
              placeholder="Enterprise Server Hardware Upgrade 2026"
              {...register('title')}
              className={`input-field py-2 bg-slate-50/25 ${errors.title ? 'border-rose-300 focus:ring-rose-500/20' : ''}`}
            />
            {errors.title && <p className="text-rose-500 text-[11px] font-semibold">{errors.title.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700">Project Description / Scope of Work</label>
            <textarea
              placeholder="Provide a detailed scope of work, warranty requirements, and other terms..."
              {...register('description')}
              rows="3"
              className="input-field py-2 bg-slate-50/25"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Deadline Local Datetime Picker */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Bidding Deadline (Date & Time)</label>
              <input
                type="datetime-local"
                {...register('deadline')}
                className={`input-field py-2 bg-slate-50/25 text-slate-700 cursor-pointer ${errors.deadline ? 'border-rose-300 focus:ring-rose-500/20' : ''}`}
              />
              {errors.deadline && <p className="text-rose-500 text-[11px] font-semibold">{errors.deadline.message}</p>}
            </div>

            {/* Document Upload UI */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700">Technical Specifications Sheet (UI Placeholder)</label>
              <input
                type="text"
                placeholder="Upload attachment (e.g. spec_sheet.pdf)"
                {...register('attachment')}
                className="input-field py-2 bg-slate-50/25"
              />
            </div>
          </div>
        </div>

        {/* Module B: Dynamic Line Items */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Required Line Items</h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 transition-colors px-2.5 py-1.5 rounded-lg border border-brand-200/50 flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> Add Row
            </button>
          </div>

          <div className="space-y-3">
            {fields.map((item, idx) => (
              <div key={item.id} className="space-y-1">
                <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-center bg-slate-50/40 p-3 rounded-xl border border-slate-100">
                  {/* Product Name */}
                  <div className="w-full sm:flex-1 space-y-1">
                    {idx === 0 && <label className="text-[10px] font-bold text-slate-400 uppercase">Product Name</label>}
                    <input
                      type="text"
                      placeholder="Rack Server 2U"
                      {...register(`items.${idx}.product_name`)}
                      className={`input-field py-1.5 bg-white text-xs ${errors.items?.[idx]?.product_name ? 'border-rose-300 focus:ring-rose-500/20' : ''}`}
                    />
                  </div>

                  {/* Quantity */}
                  <div className="w-24 space-y-1">
                    {idx === 0 && <label className="text-[10px] font-bold text-slate-400 uppercase">Quantity</label>}
                    <input
                      type="number"
                      min="1"
                      {...register(`items.${idx}.quantity`)}
                      className={`input-field py-1.5 bg-white text-xs text-center ${errors.items?.[idx]?.quantity ? 'border-rose-300 focus:ring-rose-500/20' : ''}`}
                    />
                  </div>

                  {/* Unit */}
                  <div className="w-28 space-y-1">
                    {idx === 0 && <label className="text-[10px] font-bold text-slate-400 uppercase">Unit</label>}
                    <select
                      {...register(`items.${idx}.unit`)}
                      className="input-field py-1.5 bg-white text-xs cursor-pointer"
                    >
                      <option value="pcs">Pieces (pcs)</option>
                      <option value="kg">Kilograms (kg)</option>
                      <option value="litre">Litres (l)</option>
                      <option value="set">Set (set)</option>
                    </select>
                  </div>

                  {/* Specifications */}
                  <div className="w-full sm:flex-1 space-y-1">
                    {idx === 0 && <label className="text-[10px] font-bold text-slate-400 uppercase">Specifications</label>}
                    <input
                      type="text"
                      placeholder="Intel Xeon, 256GB RAM..."
                      {...register(`items.${idx}.specifications`)}
                      className="input-field py-1.5 bg-white text-xs"
                    />
                  </div>

                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className={`p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-600 transition-colors shadow-sm ${
                      fields.length === 1 ? 'opacity-40 cursor-not-allowed' : ''
                    }`}
                    disabled={fields.length === 1}
                    title="Remove Line Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {(errors.items?.[idx]?.product_name || errors.items?.[idx]?.quantity) && (
                  <div className="flex gap-4 px-3 text-rose-500 text-[10px] font-semibold">
                    {errors.items?.[idx]?.product_name && <span>• {errors.items[idx].product_name.message}</span>}
                    {errors.items?.[idx]?.quantity && <span>• {errors.items[idx].quantity.message}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Module C: Vendor Invites */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2">Invite Bidding Vendors</h3>

          {vendorsLoading ? (
            <div className="text-slate-400 text-xs py-2 animate-pulse">Loading vendor registry...</div>
          ) : vendors.length === 0 ? (
            <div className="text-slate-400 text-xs py-2">No active vendor profiles found in database. Please register a vendor first.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-48 overflow-y-auto pr-2">
              {vendors.map((vendor) => {
                const isChecked = watchedVendorIds.includes(vendor.id);
                return (
                  <label
                    key={vendor.id}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all duration-200 flex items-center justify-between ${
                      isChecked
                        ? 'border-brand-500 bg-brand-50/20 ring-2 ring-brand-500/10'
                        : 'border-slate-200 bg-white hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleVendorToggle(vendor.id)}
                        className="rounded text-brand-600 focus:ring-brand-500 w-4 h-4"
                      />
                      <div>
                        <p className="font-bold text-slate-800 text-xs">{vendor.name}</p>
                        <p className="text-[10px] text-slate-400 font-semibold">{vendor.category} • {vendor.contact_name}</p>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
          {errors.vendorIds && <p className="text-rose-500 text-[11px] font-semibold">{errors.vendorIds.message}</p>}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={handleSubmit((data) => onSubmitForm(data, false))}
            className="btn-secondary py-3 text-sm flex-1 sm:flex-none"
            disabled={submitting}
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin"></span>
            ) : (
              'Save as Draft'
            )}
          </button>
          <button
            type="button"
            onClick={handleSubmit((data) => onSubmitForm(data, true))}
            className="btn-primary py-3 text-sm flex-1 sm:flex-none"
            disabled={submitting}
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Publish RFQ
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RfqNew;

