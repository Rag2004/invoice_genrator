
// import React from 'react';
// import { Routes, Route, Navigate } from 'react-router-dom';

// import { useAuth } from './context/AuthContext';
// import ProtectedRoute from './components/Auth/ProtectedRoute';

// import LoginPage from './pages/LoginPage';
// import VerifyOTPPage from './pages/VerifyOTPPage';
// import ProfileSetupPage from './pages/ProfileSetupPage';
// import InvoiceApp from './InvoiceApp';

// export default function App() {
//   const { isAuthenticated, needsProfile } = useAuth();

//   return (
//     <Routes>
//       {/* ---------- Login ---------- */}
//       <Route
//         path="/login"
//         element={
//           isAuthenticated && !needsProfile ? (
//             <Navigate to="/" replace />
//           ) : (
//             <LoginPage />
//           )
//         }
//       />

//       {/* ---------- Verify OTP (public – backend validates OTP) ---------- */}
//       <Route path="/verify-otp" element={<VerifyOTPPage />} />

//       {/* ---------- Profile setup (must be logged in) ---------- */}
//       <Route
//         path="/setup-profile"
//         element={
//           <ProtectedRoute>
//             <ProfileSetupPage />
//           </ProtectedRoute>
//         }
//       />

//       {/* ---------- Main app / dashboard ---------- */}
//       <Route
//         path="/"
//         element={
//           <ProtectedRoute>
//             {needsProfile ? (
//               <Navigate to="/setup-profile" replace />
//             ) : (
//               <InvoiceApp />
//             )}
//           </ProtectedRoute>
//         }
//       />

//       {/* ---------- Fallback ---------- */}
//       <Route
//         path="*"
//         element={
//           isAuthenticated ? (
//             <Navigate to="/" replace />
//           ) : (
//             <Navigate to="/login" replace />
//           )
//         }
//       />
//     </Routes>
//   );
// }
// src/App.jsx
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

// Invoice App (Your existing invoice generator)
import InvoiceApp from './InvoiceApp';

// Styles
import './styles/Dashboard.css';

export default function App() {
  const { isAuthenticated, needsProfile } = useAuth();

  return (
    <Routes>
      {/* ---------- Login ---------- */}
      <Route
        path="/login"
        element={
          isAuthenticated && !needsProfile ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <LoginPage />
          )
        }
      />

      {/* ---------- Verify OTP ---------- */}
      <Route path="/verify-otp" element={<VerifyOTPPage />} />

      {/* ---------- Profile Setup ---------- */}
      <Route
        path="/setup-profile"
        element={
          <ProtectedRoute>
            <ProfileSetupPage />
          </ProtectedRoute>
        }
      />

      {/* ---------- Dashboard (Protected) ---------- */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            {needsProfile ? (
              <Navigate to="/setup-profile" replace />
            ) : (
              <DashboardLayout />
            )}
          </ProtectedRoute>
        }
      >
        {/* Nested Dashboard Routes */}
        <Route index element={<DashboardHome />} />
        <Route path="create-invoice" element={<InvoiceApp />} />
        <Route path="invoices" element={<InvoiceListPage />} />
        <Route path="drafts" element={<DraftsPage />} />
        <Route path="profile" element={<ProfilePage />} />
      </Route>

      {/* ---------- Root Redirect ---------- */}
      <Route
        path="/"
        element={
          isAuthenticated && !needsProfile ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* ---------- Fallback ---------- */}
      <Route
        path="*"
        element={
          isAuthenticated ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
    </Routes>
  );
}