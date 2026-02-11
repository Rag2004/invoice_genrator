
// src/App.jsx - FIXED VERSION
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/Auth/ProtectedRoute';

// Auth Pages
import LoginPage from './pages/LoginPage';
import VerifyOTPPage from './pages/VerifyOTPPage';
import ProfileSetupPage from './pages/ProfileSetupPage';

// Dashboard
import DashboardLayout from './components/Dashboard/DashboardLayout';
import DashboardHome from './pages/DashboardHome';
import InvoiceListPage from './pages/InvoiceListPage';
import DraftsPage from './pages/DraftsPage';
import ProfilePage from './pages/ProfilePage';

// Invoice Pages
import InvoiceApp from './InvoiceApp';
// ✅ ADD THIS: Create InvoiceViewerPage for final invoices
import InvoiceViewerPage from './pages/InvoiceViewPage';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './styles/Dashboard.css';

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div>Loading app...</div>
      </div>
    );
  }

  return (
    <>
      <ToastContainer
        position="bottom-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnFocusLoss={false}
        draggable
        pauseOnHover={false}
        theme="light"
      />
      <Routes>
        {/* Auth Routes */}
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route
          path="/verify-otp"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <VerifyOTPPage />}
        />
        <Route
          path="/setup-profile"
          element={<ProtectedRoute><ProfileSetupPage /></ProtectedRoute>}
        />

        {/* Dashboard Routes */}
        <Route
          path="/dashboard"
          element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}
        >
          <Route index element={<DashboardHome />} />

          {/* ✅ Invoice Routes - FIXED */}
          <Route path="create-invoice" element={<InvoiceApp />} />
          <Route path="create-invoice/:invoiceId" element={<InvoiceApp />} /> {/* Edit draft */}
          <Route path="invoice/:invoiceId" element={<InvoiceViewerPage />} /> {/* ✅ NEW: View final */}

          {/* Other Dashboard Routes */}
          <Route path="invoices" element={<InvoiceListPage />} />
          <Route path="drafts" element={<DraftsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        {/* Root & Fallback */}
        <Route
          path="/"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
        />
        <Route
          path="*"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />}
        />
      </Routes>
    </>
  );
}