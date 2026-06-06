import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import toast from 'react-hot-toast';
import { User, Mail, Lock, ShieldAlert, CheckCircle2, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  role: z.enum(['admin', 'procurement_officer', 'manager', 'vendor'])
});

const Signup = () => {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'vendor'
    }
  });

  const currentRole = watch('role');

  const onSubmit = async (data) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const result = await signup(data.name, data.email, data.password, data.role);
      setSuccess(result.message || 'Account registration successful! You can now log in.');
      toast.success('Account created successfully!');
      
      // Auto redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
      toast.error(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { value: 'vendor', label: 'Vendor Partner', desc: 'Submit quotes & process purchase orders.' },
    { value: 'procurement_officer', label: 'Procurement Officer', desc: 'Create RFQs & review quotations.' },
    { value: 'manager', label: 'Manager / Approver', desc: 'Review proposals & approve POs.' },
    { value: 'admin', label: 'System Admin', desc: 'Full administration & audit logs access.' }
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-slate-100 via-indigo-50/20 to-slate-50 p-6 relative overflow-hidden">
      {/* Decorative Orbs */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-brand-200/30 rounded-full blur-3xl -z-10 animate-pulse-soft"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-brand-300/20 rounded-full blur-3xl -z-10 animate-pulse-soft" style={{ animationDelay: '1.5s' }}></div>

      <div className="w-full max-w-xl">
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center shadow-lg shadow-brand-500/30 mb-4 transform hover:rotate-6 transition-transform duration-300">
            <ShieldAlert className="text-white w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">VendorBridge</h1>
          <p className="text-slate-500 font-medium mt-1">Access Request & Registration</p>
        </div>

        {/* Signup Card */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xl p-8 transition-all duration-300">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Create your account</h2>

          {error && (
            <div className="mb-5 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl flex items-start gap-2.5 text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl flex items-start gap-2.5 text-sm animate-pulse">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-slate-400" />
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="John Doe"
                  {...register('name')}
                  className={`input-field ${errors.name ? 'border-rose-450 focus:border-rose-500' : ''}`}
                  disabled={loading}
                />
                {errors.name && (
                  <p className="text-rose-500 text-xs mt-1 font-medium">{errors.name.message}</p>
                )}
              </div>

              {/* Email Address */}
              <div className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <Mail className="w-4 h-4 text-slate-400" />
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="john@company.com"
                  {...register('email')}
                  className={`input-field ${errors.email ? 'border-rose-450 focus:border-rose-500' : ''}`}
                  disabled={loading}
                />
                {errors.email && (
                  <p className="text-rose-500 text-xs mt-1 font-medium">{errors.email.message}</p>
                )}
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-slate-400" />
                Password
              </label>
              <input
                type="password"
                placeholder="Min 6 characters"
                {...register('password')}
                className={`input-field ${errors.password ? 'border-rose-450 focus:border-rose-500' : ''}`}
                disabled={loading}
              />
              {errors.password && (
                <p className="text-rose-500 text-xs mt-1 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Role Selection Grid */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">Assign Platform Role</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {roles.map((r) => (
                  <label
                    key={r.value}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all duration-200 flex flex-col justify-between h-24 ${
                      currentRole === r.value
                        ? 'border-brand-500 bg-brand-50/20 ring-2 ring-brand-500/10'
                        : 'border-slate-200 bg-white/40 hover:bg-slate-50/70 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="role"
                      value={r.value}
                      checked={currentRole === r.value}
                      onChange={() => setValue('role', r.value)}
                      className="sr-only"
                      disabled={loading}
                    />
                    <span className="font-bold text-slate-800 text-sm">{r.label}</span>
                    <span className="text-[11px] text-slate-400 font-medium leading-relaxed">{r.desc}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="btn-primary w-full mt-2 flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Submit Access Request
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center text-sm text-slate-500 font-medium">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-bold text-brand-600 hover:text-brand-700 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
