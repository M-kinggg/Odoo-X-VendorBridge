import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import VendorPortal from './pages/VendorPortal';

// Import Phase 2 Pages
import VendorsList from './pages/vendors/VendorsList';
import VendorDetails from './pages/vendors/VendorDetails';
import RfqList from './pages/rfqs/RfqList';
import RfqNew from './pages/rfqs/RfqNew';
import RfqDetails from './pages/rfqs/RfqDetails';
import RfqCompare from './pages/rfqs/RfqCompare';
import SubmitQuotation from './pages/vendor-portal/SubmitQuotation';
import ApprovalsList from './pages/approvals/ApprovalsList';
import ApprovalDetails from './pages/approvals/ApprovalDetails';
import PoList from './pages/purchase-orders/PoList';
import PoDetails from './pages/purchase-orders/PoDetails';
import InvoiceList from './pages/invoices/InvoiceList';
import InvoiceDetails from './pages/invoices/InvoiceDetails';

// Import Phase 3 Pages & Error Views
import LogsFeed from './pages/logs/LogsFeed';
import ReportsAnalytics from './pages/reports/ReportsAnalytics';
import UserManagement from './pages/admin/UserManagement';
import Forbidden403 from './pages/Forbidden403';
import NotFound404 from './pages/NotFound404';

import { Hammer, ArrowLeft } from 'lucide-react';

// Create a React Query Client
const queryClient = new QueryClient();

// Reusable elegant placeholder component for subsequent features
const PlaceholderPage = ({ title, description }) => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-white border border-slate-200 shadow-sm rounded-2xl">
      <div className="w-16 h-16 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-500 mb-6 animate-bounce">
        <Hammer className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h2>
      <p className="text-slate-500 text-sm max-w-md mt-2 leading-relaxed">
        {description || `The database schema for ${title} has been established. The interactive control panel for this section is scheduled for subsequent releases.`}
      </p>
      <div className="mt-8 flex gap-4">
        <button 
          onClick={() => window.history.back()}
          className="btn-secondary text-sm flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
      </div>
    </div>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster 
        position="top-right" 
        toastOptions={{ 
          duration: 4000,
          style: {
            background: '#0f172a',
            color: '#fff',
            borderRadius: '12px',
            fontSize: '14px'
          }
        }} 
      />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Auth Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/403" element={<Forbidden403 />} />

            {/* Guarded Layout Routes */}
            <Route path="/" element={<Layout />}>
              {/* Default Redirect based on route */}
              <Route index element={<Navigate to="/login" replace />} />

              {/* Administrative / Procurement Officers / Managers Dashboard */}
              <Route
                path="dashboard"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'procurement_officer', 'manager']}>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />

              {/* Vendor Portal */}
              <Route
                path="vendor-portal"
                element={
                  <ProtectedRoute allowedRoles={['vendor']}>
                    <VendorPortal />
                  </ProtectedRoute>
                }
              />

              {/* Core ERP Sections */}
              
              {/* 1. Vendor Management */}
              <Route
                path="vendors"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'procurement_officer']}>
                    <VendorsList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="vendors/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'procurement_officer']}>
                    <VendorDetails />
                  </ProtectedRoute>
                }
              />

              {/* 2. RFQ Management */}
              <Route
                path="rfqs"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'procurement_officer', 'vendor']}>
                    <RfqList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="rfqs/new"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'procurement_officer']}>
                    <RfqNew />
                  </ProtectedRoute>
                }
              />
              <Route
                path="rfqs/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'procurement_officer', 'vendor']}>
                    <RfqDetails />
                  </ProtectedRoute>
                }
              />

              {/* 3. Quotation Submission & Comparisons */}
              <Route
                path="rfqs/:id/compare"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'procurement_officer']}>
                    <RfqCompare />
                  </ProtectedRoute>
                }
              />
              <Route
                path="vendor-portal/rfqs/:id/quote"
                element={
                  <ProtectedRoute allowedRoles={['vendor']}>
                    <SubmitQuotation />
                  </ProtectedRoute>
                }
              />
              <Route
                path="quotations"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'procurement_officer', 'vendor']}>
                    <PlaceholderPage title="Quotations Registry" description="Quotations can be created by vendor partners directly from active RFQ invites on the Vendor Portal." />
                  </ProtectedRoute>
                }
              />

              {/* 4. Approvals Workflow */}
              <Route
                path="approvals"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'procurement_officer', 'manager']}>
                    <ApprovalsList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="approvals/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'manager']}>
                    <ApprovalDetails />
                  </ProtectedRoute>
                }
              />

              {/* 5. Purchase Orders */}
              <Route
                path="purchase-orders"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'procurement_officer', 'vendor']}>
                    <PoList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="purchase-orders/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'procurement_officer', 'vendor']}>
                    <PoDetails />
                  </ProtectedRoute>
                }
              />

              {/* 6. Invoices */}
              <Route
                path="invoices"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'procurement_officer', 'vendor']}>
                    <InvoiceList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="invoices/:id"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'procurement_officer', 'vendor']}>
                    <InvoiceDetails />
                  </ProtectedRoute>
                }
              />

              {/* Additional sections (Phase 3) */}
              <Route
                path="reports"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'procurement_officer', 'manager']}>
                    <ReportsAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="logs"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'procurement_officer', 'manager']}>
                    <LogsFeed />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/users"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Catch-all 404 Page */}
            <Route path="*" element={<NotFound404 />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
