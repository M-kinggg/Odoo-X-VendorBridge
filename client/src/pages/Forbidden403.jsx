import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const Forbidden403 = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleGoBack = () => {
    if (user?.role === 'vendor') {
      navigate('/vendor-portal');
    } else {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-20 h-20 bg-rose-50 border border-rose-100 rounded-3xl flex items-center justify-center text-rose-500 mb-8 animate-pulse shadow-sm">
        <ShieldAlert className="w-10 h-10" />
      </div>
      
      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">403 Forbidden</h1>
      <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed mb-8">
        Access Denied. You do not have the necessary security credentials or role permissions to view this system page.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-4">
        <button
          onClick={() => window.history.back()}
          className="w-full sm:w-auto btn-secondary text-sm flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
        <button
          onClick={handleGoBack}
          className="w-full sm:w-auto btn-primary text-sm flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default Forbidden403;
