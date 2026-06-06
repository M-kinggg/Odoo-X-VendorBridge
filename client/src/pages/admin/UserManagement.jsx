import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { 
  Users, 
  UserPlus, 
  Mail, 
  User, 
  Shield, 
  Check, 
  X, 
  ToggleLeft, 
  ToggleRight,
  ShieldAlert,
  Loader2,
  Calendar
} from 'lucide-react';

// Form validation schema using Zod
const inviteSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.string().email('Please enter a valid email address'),
  role: z.enum(['admin', 'procurement_officer', 'manager', 'vendor'], {
    errorMap: () => ({ message: 'Please select a valid user role' })
  })
});

const UserManagement = () => {
  const queryClient = useQueryClient();
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Form setup
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      name: '',
      email: '',
      role: 'vendor'
    }
  });

  // 1. Fetch Users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const res = await api.get('/admin/users');
      return res.data;
    }
  });

  // 2. Mutation to update role/status
  const updateMutation = useMutation({
    mutationFn: async ({ id, role, status }) => {
      const res = await api.put(`/admin/users/${id}`, { role, status });
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success(`User settings updated: ${data.name}`);
    },
    onError: (error) => {
      const msg = error.response?.data?.message || 'Update failed.';
      toast.error(`Error: ${msg}`);
    }
  });

  // 3. Mutation to invite user
  const inviteMutation = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post('/admin/users/invite', payload);
      return res.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['adminUsers'] });
      toast.success(`Invitation sent successfully to ${data.user.email}!`);
      setIsInviteModalOpen(false);
      reset();
    },
    onError: (error) => {
      const msg = error.response?.data?.message || 'Failed to invite user.';
      toast.error(`Error: ${msg}`);
    }
  });

  const handleInviteSubmit = (data) => {
    inviteMutation.mutate(data);
  };

  const handleStatusToggle = (user) => {
    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    const confirmMsg = `Are you sure you want to ${nextStatus === 'inactive' ? 'DEACTIVATE' : 'REACTIVATE'} access for ${user.name}?`;
    
    if (window.confirm(confirmMsg)) {
      updateMutation.mutate({ id: user.id, status: nextStatus });
    }
  };

  const handleRoleChange = (userId, newRole) => {
    updateMutation.mutate({ id: userId, role: newRole });
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'admin':
        return 'System Admin';
      case 'procurement_officer':
        return 'Procurement Officer';
      case 'manager':
        return 'Manager / Approver';
      case 'vendor':
        return 'Vendor Partner';
      default:
        return role;
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">User Administration</h1>
          <p className="text-slate-500 text-sm mt-1">
            Invite new users, modify access privileges, and manage account statuses across all system roles.
          </p>
        </div>
        <button
          onClick={() => setIsInviteModalOpen(true)}
          className="btn-primary text-sm flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <UserPlus className="w-4.5 h-4.5" />
          Invite User
        </button>
      </div>

      {/* User Table Grid */}
      {isLoading ? (
        <div className="space-y-4">
          <div className="h-12 bg-slate-100 rounded-xl animate-pulse"></div>
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-16 bg-slate-50 rounded-xl animate-pulse"></div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mx-auto mb-4 border border-slate-100">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-slate-800 text-lg">No Users Found</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            Get started by inviting your first administrative colleague or vendor partner.
          </p>
          <button
            onClick={() => setIsInviteModalOpen(true)}
            className="btn-primary mt-6 text-sm"
          >
            Invite User Now
          </button>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                  <th className="p-4">Name</th>
                  <th className="p-4">Email</th>
                  <th className="p-4">Role Permission</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4">Joined Date</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {users.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="p-4 font-semibold text-slate-800">{item.name}</td>
                    <td className="p-4 text-slate-600 font-medium">{item.email}</td>
                    <td className="p-4">
                      <select
                        value={item.role}
                        onChange={(e) => handleRoleChange(item.id, e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 transition-colors"
                      >
                        <option value="admin">System Admin</option>
                        <option value="procurement_officer">Procurement Officer</option>
                        <option value="manager">Manager / Approver</option>
                        <option value="vendor">Vendor Partner</option>
                      </select>
                    </td>
                    <td className="p-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        item.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                          : 'bg-rose-50 text-rose-700 border-rose-150'
                      }`}>
                        {item.status === 'active' ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            Active
                          </>
                        ) : (
                          <>
                            <X className="w-3.5 h-3.5" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(item.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleStatusToggle(item)}
                        title={item.status === 'active' ? 'Deactivate User' : 'Reactivate User'}
                        className={`p-1.5 rounded-xl border transition-all duration-150 ${
                          item.status === 'active'
                            ? 'text-rose-600 hover:bg-rose-50 hover:border-rose-150 border-transparent'
                            : 'text-emerald-600 hover:bg-emerald-50 hover:border-emerald-150 border-transparent'
                        }`}
                      >
                        {item.status === 'active' ? (
                          <ToggleRight className="w-6 h-6" />
                        ) : (
                          <ToggleLeft className="w-6 h-6" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. INVITATION DRAWER / MODAL */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-brand-400" />
                <h3 className="font-bold text-lg">Invite New User</h3>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit(handleInviteSubmit)} className="p-5 space-y-4">
              {/* Name Field */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Enter full name"
                    {...register('name')}
                    className={`w-full rounded-xl border bg-slate-50 pl-10 pr-4 py-2.5 text-sm focus:bg-white focus:outline-none transition-colors ${
                      errors.name ? 'border-rose-450 focus:border-rose-500' : 'border-slate-200 focus:border-brand-500'
                    }`}
                  />
                </div>
                {errors.name && (
                  <p className="text-rose-500 text-xs mt-1 font-medium">{errors.name.message}</p>
                )}
              </div>

              {/* Email Field */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                  <input
                    type="email"
                    placeholder="Enter email address"
                    {...register('email')}
                    className={`w-full rounded-xl border bg-slate-50 pl-10 pr-4 py-2.5 text-sm focus:bg-white focus:outline-none transition-colors ${
                      errors.email ? 'border-rose-450 focus:border-rose-500' : 'border-slate-200 focus:border-brand-500'
                    }`}
                  />
                </div>
                {errors.email && (
                  <p className="text-rose-500 text-xs mt-1 font-medium">{errors.email.message}</p>
                )}
              </div>

              {/* Role Select Field */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Role Permission</label>
                <div className="relative">
                  <Shield className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-400" />
                  <select
                    {...register('role')}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-4 py-2.5 text-sm focus:bg-white focus:border-brand-500 focus:outline-none transition-colors"
                  >
                    <option value="admin">System Admin</option>
                    <option value="procurement_officer">Procurement Officer</option>
                    <option value="manager">Manager / Approver</option>
                    <option value="vendor">Vendor Partner</option>
                  </select>
                </div>
                {errors.role && (
                  <p className="text-rose-500 text-xs mt-1 font-medium">{errors.role.message}</p>
                )}
              </div>

              {/* Info text */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-500 leading-relaxed flex gap-2">
                <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                Inviting a user generates a secure random password, creates an access profile in Supabase Auth, and dispatches the credentials using Resend.
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="btn-secondary text-sm py-2 px-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteMutation.isPending}
                  className="btn-primary text-sm py-2 px-4 flex items-center justify-center gap-2"
                >
                  {inviteMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
