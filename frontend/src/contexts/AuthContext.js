import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

export const SUPER_ADMIN_ROLE    = 'super_admin';
export const TENANT_ADMIN_ROLE   = 'tenant_admin';
export const EVENT_MANAGER_ROLE  = 'event_manager';
export const STAFF_ROLE          = 'staff';
export const CLIENT_ROLE         = 'client';
export const VENDOR_ROLE         = 'vendor';

const TOKEN_KEY = 'prani_token';

const AuthContext = createContext(null);
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    if (!storedToken) {
      try {
        const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
        // Handle both wrapped { data: user } and unwrapped user formats
        const userData = res.data?.data ?? res.data;
        setUser(userData);
      } catch {
        setUser(null);
      }
      setLoading(false);
      return;
    }
    try {
      const res = await axios.get(`${API}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` }
      });
      const userData = res.data?.data ?? res.data;
      setUser(userData);
      setToken(storedToken);
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (window.location.hash?.includes('session_id=')) {
      setLoading(false);
      return;
    }
    checkAuth();
  }, [checkAuth]);

  const login = (userData, authToken) => {
    setUser(userData);
    if (authToken) {
      setToken(authToken);
      localStorage.setItem(TOKEN_KEY, authToken);
    }
  };

  const logout = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`${API}/auth/logout`, {}, { headers, withCredentials: true });
    } catch {}
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  };

  const getAuthHeaders = () => {
    const t = token || localStorage.getItem(TOKEN_KEY);
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  const isSuperAdmin   = user?.role === SUPER_ADMIN_ROLE;
  const isTenantAdmin  = user?.role === TENANT_ADMIN_ROLE;
  const isEventManager = user?.role === EVENT_MANAGER_ROLE;
  const isStaff        = user?.role === STAFF_ROLE;
  const isClient       = user?.role === CLIENT_ROLE;
  const isVendor       = user?.role === VENDOR_ROLE;
  const tenantId       = user?.tenantId ?? user?.tenant_id ?? null;

  return (
    <AuthContext.Provider value={{
      user, token, loading, login, logout, getAuthHeaders, checkAuth,
      isSuperAdmin, isTenantAdmin, isEventManager, isStaff, isClient, isVendor,
      tenantId,
      SUPER_ADMIN_ROLE, TENANT_ADMIN_ROLE, EVENT_MANAGER_ROLE, STAFF_ROLE, CLIENT_ROLE, VENDOR_ROLE,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
