import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const NotFound404 = () => {
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
      <div className="w-20 h-20 bg-brand-50 border border-brand-100 rounded-3xl flex items-center justify-center text-brand-500 mb-8 animate-bounce shadow-sm">
        <Compass className="w-10 h-10" />
      </div>
      
      <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight mb-3">404 Not Found</h1>
      <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed mb-8">
        The requested URL was not found on this server. It may have been moved, renamed, or is temporarily unavailable.
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

export default NotFound404;
