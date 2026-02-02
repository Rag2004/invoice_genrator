// src/context/AuthContext.jsx - WITH OTP TIMER SUPPORT

import React, { createContext, useContext, useEffect, useState } from "react";
import { jwtDecode } from "jwt-decode";
import { normalizeConsultant } from "../utils/normalizeConsultant";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");

  // ✅ NEW: OTP Timer State
  const [otpSentAt, setOtpSentAt] = useState(null);

  const API_BASE =
    import.meta.env.VITE_API_BASE || "http://localhost:4000/api";

  // ======================================================
  // LOAD USER ON APP START
  // ======================================================
  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) {
      setLoading(false);
      return;
    }

    fetchCurrentUser();
  }, []);

  // ======================================================
  // FETCH COMPLETE PROFILE (/auth/me)
  // ======================================================
  async function fetchCurrentUser() {
    try {
      const token = localStorage.getItem("authToken");
      if (!token) return null;

      const resp = await fetch(`${API_BASE}/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await resp.json();

      // ✅ FIX: backend returns `consultant`, not `user`
      const rawUser = data.user || data.consultant;

      if (!data.ok || !rawUser) {
        console.warn("Failed loading profile:", data);
        forceLogout();
        return null;
      }

      const normalized = normalizeConsultant(rawUser);

      setUser(normalized);
      setIsAuthenticated(true);
      return normalized;
    } catch (err) {
      console.error("Auth load error:", err);
      forceLogout();
      return null;
    } finally {
      setLoading(false);
    }
  }

  // ======================================================
  // AFTER LOGIN / OTP SUCCESS
  // ======================================================
  async function setAuthFromToken(token) {
    localStorage.setItem("authToken", token);

    // Always prefer backend profile
    const fullProfile = await fetchCurrentUser();
    if (fullProfile) return fullProfile;

    // ❌ Fallback only if backend fails
    try {
      const decoded = jwtDecode(token);

      const minimalUser = {
        consultantId: decoded.consultant_id,
        email: decoded.email,
        name: decoded.name || "",
        needsProfile: !decoded.name,

        businessName: "",
        businessRegisteredOffice: "",
        businessPAN: "",
        businessGSTIN: "",
        businessStateCode: "",
      };

      setUser(minimalUser);
      setIsAuthenticated(true);
      setLoading(false);

      return minimalUser;
    } catch (err) {
      console.error("JWT decode failed:", err);
      forceLogout();
      return null;
    }
  }

  // ======================================================
  // REFRESH USER (after profile update)
  // ======================================================
  async function refreshUser() {
    return await fetchCurrentUser();
  }

  // ======================================================
  // LOGOUT / FORCE LOGOUT
  // ======================================================
  function forceLogout() {
    localStorage.removeItem("authToken");
    setUser(null);
    setIsAuthenticated(false);
    setPendingEmail("");
    setOtpSentAt(null); // ✅ Clear timer on logout
    setLoading(false);
  }

  function logout() {
    forceLogout();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated,
        pendingEmail,
        setPendingEmail,
        otpSentAt,           // ✅ NEW: Expose timer state
        setOtpSentAt,        // ✅ NEW: Expose timer setter
        setAuthFromToken,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}