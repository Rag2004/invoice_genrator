
// import React, { createContext, useContext, useState, useEffect } from 'react';
// import { getProfile, logout as apiLogout } from '../api/api';

// const AuthContext = createContext();

// export function useAuth() {
//   const context = useContext(AuthContext);
//   if (!context) {
//     throw new Error('useAuth must be used within AuthProvider');
//   }
//   return context;
// }

// export function AuthProvider({ children }) {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);
//   const [pendingEmail, setPendingEmail] = useState(null);

//   // Check if user is logged in on mount
//   useEffect(() => {
//     checkAuth();
//   }, []);

//   const checkAuth = async () => {
//     try {
//       const token = localStorage.getItem('authToken');
      
//       if (!token) {
//         setLoading(false);
//         return;
//       }

//       console.log('🔍 Checking auth with token...');

//       // Verify token with backend
//       const response = await getProfile();
//       const userData = response.user || response;
      
//       console.log('✅ Auth check successful:', userData);
//       setUser(userData);
//     } catch (error) {
//       console.error('❌ Auth check failed:', error);
//       localStorage.removeItem('authToken');
//       setUser(null);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const setAuthFromToken = async (token) => {
//     try {
//       console.log('🔐 Setting auth from token...');
//       localStorage.setItem('authToken', token);
      
//       const response = await getProfile();
//       const userData = response.user || response;
      
//       console.log('✅ User profile loaded:', userData);
//       setUser(userData);
      
//       return userData;
//     } catch (error) {
//       console.error('❌ Failed to get user profile:', error);
//       throw error;
//     }
//   };

//   const logout = async () => {
//     try {
//       await apiLogout();
//     } catch (error) {
//       console.error('Logout API failed:', error);
//     } finally {
//       localStorage.removeItem('authToken');
//       setUser(null);
//       setPendingEmail(null);
//     }
//   };

//   const clearPendingEmail = () => {
//     setPendingEmail(null);
//   };

//   // Computed properties
//   const isAuthenticated = !!user;
//   const needsProfile = user ? (user.needsProfile || !user.name) : false;

//   const value = {
//     user,
//     loading,
//     isAuthenticated,
//     needsProfile,
//     pendingEmail,
//     setPendingEmail,
//     clearPendingEmail,
//     setAuthFromToken,
//     logout,
//     refreshUser: checkAuth,
//   };

//   return (
//     <AuthContext.Provider value={value}>
//       {children}
//     </AuthContext.Provider>
//   );
// }
// src/context/AuthContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getProfile, logout as apiLogout } from '../api/api';

const AuthContext = createContext();

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingEmail, setPendingEmail] = useState(null);

  // Check if user is logged in on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      if (!token) {
        setLoading(false);
        return;
      }

      console.log('🔍 Checking auth with token...');

      // Verify token with backend
      const response = await getProfile();
      const userData = response.user || response;
      
      console.log('✅ Auth check successful:', userData);
      setUser(userData);
    } catch (error) {
      console.error('❌ Auth check failed:', error);
      localStorage.removeItem('authToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const setAuthFromToken = async (token) => {
    try {
      console.log('🔐 Setting auth from token...');
      localStorage.setItem('authToken', token);
      
      const response = await getProfile();
      const userData = response.user || response;
      
      console.log('✅ User profile loaded:', userData);
      setUser(userData);
      
      return userData;
    } catch (error) {
      console.error('❌ Failed to get user profile:', error);
      localStorage.removeItem('authToken');
      throw error;
    }
  };

  const logout = async () => {
    try {
      await apiLogout();
    } catch (error) {
      console.error('Logout API failed:', error);
    } finally {
      localStorage.removeItem('authToken');
      setUser(null);
      setPendingEmail(null);
    }
  };

  const clearPendingEmail = () => {
    console.log('🧹 Clearing pending email');
    setPendingEmail(null);
  };

  // Computed properties
  const isAuthenticated = !!user;
  const needsProfile = user ? (user.needsProfile || !user.name) : false;

  const value = {
    user,
    loading,
    isAuthenticated,
    needsProfile,
    pendingEmail,
    setPendingEmail,
    clearPendingEmail,
    setAuthFromToken,
    logout,
    refreshUser: checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}