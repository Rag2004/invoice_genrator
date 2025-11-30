
// import React from 'react';
// import { Navigate } from 'react-router-dom';
// import { useAuth } from '../../context/AuthContext';

// export default function ProtectedRoute({ children }) {
//   const { user, loading, isAuthenticated } = useAuth();

//   console.log('🛡️ ProtectedRoute check:', { user, loading, isAuthenticated });

//   // Show loading spinner while checking auth
//   if (loading) {
//     return (
//       <div style={{
//         minHeight: '100vh',
//         display: 'flex',
//         alignItems: 'center',
//         justifyContent: 'center',
//         background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
//       }}>
//         <div style={{
//           textAlign: 'center',
//           color: 'white'
//         }}>
//           <div className="spinner-large"></div>
//           <p style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: '20px' }}>
//             Loading...
//           </p>
//         </div>
//       </div>
//     );
//   }

//   // If not authenticated, redirect to login
//   if (!isAuthenticated) {
//     console.log('❌ Not authenticated, redirecting to login');
//     return <Navigate to="/login" replace />;
//   }

//   // If authenticated, render the protected content
//   console.log('✅ Authenticated, rendering protected content');
//   return children;
// }
// src/components/Auth/ProtectedRoute.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading, isAuthenticated } = useAuth();

  console.log('🛡️ ProtectedRoute check:', { 
    user: user ? { id: user.id, name: user.name, email: user.email } : null, 
    loading, 
    isAuthenticated 
  });

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        <div style={{
          textAlign: 'center',
          color: 'white'
        }}>
          <div className="spinner-large"></div>
          <p style={{ fontSize: '1.125rem', fontWeight: 600, marginTop: '20px' }}>
            Loading...
          </p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    console.log('❌ Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }

  // If authenticated, render the protected content
  console.log('✅ Authenticated, rendering protected content');
  return children;
}