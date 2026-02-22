import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);
const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('ubukwe_token'));
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('ubukwe_token');
    if (!storedToken) {
      // Try cookie-based session (Google OAuth)
      try {
        const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
        setUser(res.data);
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
      setUser(res.data);
      setToken(storedToken);
    } catch {
      localStorage.removeItem('ubukwe_token');
      setToken(null);
      setUser(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // CRITICAL: If returning from OAuth callback, skip the /me check.
    // AuthCallback will exchange the session_id and establish the session first.
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
      localStorage.setItem('ubukwe_token', authToken);
    }
  };

  const logout = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await axios.post(`${API}/auth/logout`, {}, { headers, withCredentials: true });
    } catch {}
    localStorage.removeItem('ubukwe_token');
    setToken(null);
    setUser(null);
  };

  const getAuthHeaders = () => {
    const t = token || localStorage.getItem('ubukwe_token');
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, getAuthHeaders, checkAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
