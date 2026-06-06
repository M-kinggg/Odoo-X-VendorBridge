import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Search, Filter, Plus, Edit2, Eye, Trash2, X, PlusCircle, AlertCircle, CheckCircle, HelpCircle, Loader2 } from 'lucide-react';

const VendorsList = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Filters State
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  // Modal Form State
  const [isOpen, setIsOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'IT',
    gst_number: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    status: 'pending'
  });
  const [formError, setFormError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [vendorToDelete, setVendorToDelete] = useState(null);

  // Fetch Vendors
  const { data: vendors = [], isLoading, error } = useQuery({
    queryKey: ['vendors', search, status],
    queryFn: async () => {
      const res = await api.get('/vendors', { params: { q: search, status } });
      return res.data;
    }
  });

  // Mutator: Create/Update
  const saveVendorMutation = useMutation({
    mutationFn: async (data) => {
      if (editId) {
        return api.put(`/vendors/${editId}`, data);
      } else {
        return api.post('/vendors', data);
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setIsOpen(false);
      resetForm();
      toast.success(editId ? 'Vendor profile updated successfully!' : 'Vendor profile registered successfully!');
    },
    onError: (err) => {
      const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.msg || 'Failed to save vendor profile.';
      setFormError(msg);
      toast.error(`Error: ${msg}`);
    }
  });

  // Mutator: Delete
  const deleteVendorMutation = useMutation({
    mutationFn: async (id) => {
      return api.delete(`/vendors/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      toast.success('Vendor profile successfully deleted.');
    },
    onError: (err) => {
      const msg = err.response?.data?.message || 'Failed to delete vendor profile.';
      toast.error(`Error: ${msg}`);
    }
  });

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'IT',
      gst_number: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      status: 'pending'
    });
    setEditId(null);
    setFormError('');
  };

  const handleEdit = (vendor) => {
    setEditId(vendor.id);
    setFormData({
      name: vendor.name,
      category: vendor.category || 'IT',
      gst_number: vendor.gst_number || '',
      contact_name: vendor.contact_name || '',
      contact_email: vendor.contact_email || '',
      contact_phone: vendor.contact_phone || '',
      status: vendor.status || 'pending'
    });
    setFormError('');
    setIsOpen(true);
  };

  const handleDeleteClick = (vendor) => {
    setVendorToDelete(vendor);
    setConfirmOpen(true);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setFormError('');

    // Client validators
    if (!formData.name.trim()) return setFormError('Vendor name is required');
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gst_number)) {
      return setFormError('Valid GST Number required (e.g. 27AAAAA1111A1Z1)');
    }
    if (!formData.contact_name.trim()) return setFormError('Contact name is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      return setFormError('Valid contact email required');
    }
    if (!formData.contact_phone.trim()) return setFormError('Contact phone is required');

    saveVendorMutation.mutate(formData);
  };

  const getStatusBadge = (s) => {
    let base = "px-2.5 py-0.5 text-xs font-semibold rounded-full border ";
    switch (s) {
      case 'active':
        return <span className={base + "bg-emerald-50 text-emerald-700 border-emerald-255"}>Active</span>;
      case 'inactive':
        return <span className={base + "bg-rose-50 text-rose-700 border-rose-255"}>Inactive</span>;
      case 'pending':
        return <span className={base + "bg-amber-50 text-amber-700 border-amber-255"}>Pending</span>;
      default:
        return <span className={base + "bg-slate-50 text-slate-700 border-slate-200"}>{s}</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Vendor Management</h1>
          <p className="text-slate-500 font-medium mt-1">Register new vendor profiles and audit active business credentials.</p>
        </div>
        <button
          onClick={() => { resetForm(); setIsOpen(true); }}
          className="btn-primary"
        >
          <Plus className="w-5 h-5" />
          Add Vendor Partner
        </button>
      </div>

      {/* Filter Row */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10 py-2.5"
          />
        </div>
        <div className="flex w-full md:w-auto items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
            <Filter className="w-4 h-4" /> Filter Status
          </div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="input-field py-2.5 bg-slate-50/50 cursor-pointer text-slate-700 font-semibold"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="pending">Pending</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
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
            Failed to retrieve vendor directories.
          </div>
        ) : vendors.length === 0 ? (
          <div className="p-12 text-center max-w-sm mx-auto">
            <div className="w-14 h-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4">
              <HelpCircle className="w-7 h-7" />
            </div>
            <h3 className="text-md font-bold text-slate-800">No Vendors Found</h3>
            <p className="text-slate-500 text-xs mt-1 mb-6">No vendors match your search criteria. Register a new vendor partner to get started.</p>
            <button
              onClick={() => { resetForm(); setIsOpen(true); }}
              className="btn-primary text-xs py-2 px-4"
            >
              Add First Vendor
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/75 border-b border-slate-100 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="px-6 py-3.5">Vendor Name</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">GST Number</th>
                  <th className="px-6 py-3.5">Contact Details</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium text-slate-600">
                {vendors.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-800">{v.name}</td>
                    <td className="px-6 py-4">{v.category}</td>
                    <td className="px-6 py-4 font-mono text-xs">{v.gst_number}</td>
                    <td className="px-6 py-4">
                      <div className="text-slate-800">{v.contact_name}</div>
                      <div className="text-[11px] text-slate-400">{v.contact_email} • {v.contact_phone}</div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(v.status)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2.5">
                        <button
                          onClick={() => navigate(`/vendors/${v.id}`)}
                          className="p-1.5 rounded-lg border border-slate-200/80 hover:bg-slate-50 text-slate-500 hover:text-brand-600 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(v)}
                          className="p-1.5 rounded-lg border border-slate-200/80 hover:bg-slate-50 text-slate-500 hover:text-amber-600 transition-colors"
                          title="Edit Profile"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => handleDeleteClick(v)}
                            className="p-1.5 rounded-lg border border-slate-200/80 hover:bg-slate-50 text-slate-500 hover:text-rose-600 transition-colors"
                            title="Delete Vendor"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Add / Edit Vendor Modal Form */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 relative flex flex-col justify-between max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">{editId ? 'Edit Vendor Profile' : 'Add New Vendor Partner'}</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message */}
            {formError && (
              <div className="my-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            {/* Scrollable Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4 py-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Business Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Vendor Business Name</label>
                  <input
                    type="text"
                    placeholder="Apex Logistics Ltd"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field py-2"
                    required
                  />
                </div>

                {/* Category Dropdown */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Business Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="input-field py-2 cursor-pointer bg-white"
                  >
                    <option value="IT">IT & Hardware</option>
                    <option value="Logistics">Logistics & Supply Chain</option>
                    <option value="Manufacturing">Manufacturing & Parts</option>
                    <option value="Services">Services & Contractors</option>
                    <option value="Other">Other Category</option>
                  </select>
                </div>
              </div>

              {/* GST Number */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">GSTIN / Registration Number</label>
                <input
                  type="text"
                  placeholder="27AAAAA1111A1Z1"
                  value={formData.gst_number}
                  onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                  className="input-field py-2 font-mono text-sm"
                  required
                />
              </div>

              {/* Contact Information */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/60 space-y-3">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contact Person Details</h4>
                
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    placeholder="John Doe"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="input-field py-2 bg-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Email Address</label>
                    <input
                      type="email"
                      placeholder="john@apex.com"
                      value={formData.contact_email}
                      onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                      className="input-field py-2 bg-white"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-700">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+1-555-0199"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                      className="input-field py-2 bg-white"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Status Select */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Activation Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="input-field py-2 cursor-pointer bg-white"
                >
                  <option value="pending">Pending Review</option>
                  <option value="active">Active Partner</option>
                  <option value="inactive">Inactive / Blacklisted</option>
                </select>
              </div>

              {/* Actions Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="btn-secondary text-sm py-2"
                  disabled={saveVendorMutation.isPending}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary text-sm py-2 flex items-center justify-center gap-1.5"
                  disabled={saveVendorMutation.isPending}
                >
                  {saveVendorMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    editId ? 'Save Changes' : 'Create Vendor Profile'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Vendor Confirmation Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-slate-900 text-lg">Confirm Delete</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6">Are you sure you want to delete the vendor profile for "{vendorToDelete?.name}"? This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="btn-secondary py-2 px-4 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  deleteVendorMutation.mutate(vendorToDelete?.id);
                  setConfirmOpen(false);
                }}
                className="btn-primary py-2 px-4 bg-rose-600 hover:bg-rose-700 border-rose-600 text-xs font-bold text-white"
              >
                Delete Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorsList;
