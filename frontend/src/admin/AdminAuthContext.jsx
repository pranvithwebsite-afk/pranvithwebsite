import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin, fetchAdminMe, setAdminAuthToken } from '../lib/api';

const AdminAuthContext = createContext(null);

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const clearAuth = () => {
    setToken(null);
    setAdmin(null);
    setAdminAuthToken(null);
    localStorage.removeItem('cms_admin');
  };

  const setAdminSession = (authToken, adminProfile) => {
    setToken(authToken);
    setAdmin(adminProfile);
    setAdminAuthToken(authToken);
    localStorage.setItem('cms_admin', JSON.stringify({ token: authToken, admin: adminProfile }));
  };

  useEffect(() => {
    const stored = localStorage.getItem('cms_admin');
    if (!stored) {
      setLoading(false);
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      if (!parsed?.token) {
        setLoading(false);
        return;
      }
      setAdminSession(parsed.token, parsed.admin);
      fetchAdminMe()
        .then((profile) => {
          setAdminSession(parsed.token, profile);
        })
        .catch(clearAuth)
        .finally(() => setLoading(false));
    } catch (error) {
      clearAuth();
      setLoading(false);
    }
  }, []);

  const login = async ({ email, password }) => {
    const result = await adminLogin({ email, password });
    setAdminSession(result.access_token, result.admin);
    return result;
  };

  const logout = () => {
    clearAuth();
    navigate('/admin/login');
  };

  const value = useMemo(
    () => ({ admin, token, login, logout, loading, isAuthenticated: Boolean(admin) }),
    [admin, token, loading]
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
};
