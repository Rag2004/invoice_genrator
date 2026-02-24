
// src/App.jsx - Data Router version (supports useBlocker)
import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router-dom';
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
import InvoiceViewerPage from './pages/InvoiceViewPage';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import './styles/Dashboard.css';

// Root layout that renders ToastContainer + child routes
function RootLayout() {
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
      <Outlet />
    </>
  );
}

// Auth guard components (use hooks inside route elements)
function AuthRedirect({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : children;
}

function RootRedirect() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
}

function LoadingGate({ children }) {
  const { loading } = useAuth();
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
  return children;
}

// Wrap everything in a loading gate
function RootWithLoading() {
  return (
    <LoadingGate>
      <RootLayout />
    </LoadingGate>
  );
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <RootWithLoading />,
    children: [
      // Auth Routes
      {
        path: 'login',
        element: <AuthRedirect><LoginPage /></AuthRedirect>,
      },
      {
        path: 'verify-otp',
        element: <AuthRedirect><VerifyOTPPage /></AuthRedirect>,
      },
      {
        path: 'setup-profile',
        element: <ProtectedRoute><ProfileSetupPage /></ProtectedRoute>,
      },

      // Dashboard Routes
      {
        path: 'dashboard',
        element: <ProtectedRoute><DashboardLayout /></ProtectedRoute>,
        children: [
          { index: true, element: <DashboardHome /> },
          { path: 'create-invoice', element: <InvoiceApp /> },
          { path: 'create-invoice/:invoiceId', element: <InvoiceApp /> },
          { path: 'invoice/:invoiceId', element: <InvoiceViewerPage /> },
          { path: 'invoices', element: <InvoiceListPage /> },
          { path: 'drafts', element: <DraftsPage /> },
          { path: 'profile', element: <ProfilePage /> },
        ],
      },

      // Root & Fallback
      { index: true, element: <RootRedirect /> },
      { path: '*', element: <RootRedirect /> },
    ],
  },
]);

export default function AppRouter() {
  return <RouterProvider router={router} />;
}