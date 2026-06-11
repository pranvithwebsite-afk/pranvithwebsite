import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  customerApi,
  setCustomerAuthToken,
  customerMe,
  customerLogin,
  customerRegister,
  customerLogout,
} from '../lib/api';

const STORAGE_KEY = 'pranvithdop_customer_token';
const CustomerAuthContext = createContext(null);

export const CustomerAuthProvider = ({ children }) => {
  const [user, setUser] = useState(null); // user object | null
  const [token, setToken] = useState(() => localStorage.getItem(STORAGE_KEY) || null);
  const [loading, setLoading] = useState(true);

  // Hydrate user on mount / token change
  useEffect(() => {
    const init = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      setCustomerAuthToken(token);
      try {
        const me = await customerMe();
        setUser(me);
      } catch (_) {
        localStorage.removeItem(STORAGE_KEY);
        setCustomerAuthToken(null);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [token]);

  const login = useCallback(async (email, password) => {
    const data = await customerLogin({ email, password });
    localStorage.setItem(STORAGE_KEY, data.access_token);
    setCustomerAuthToken(data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    const data = await customerRegister({ name, email, password });
    localStorage.setItem(STORAGE_KEY, data.access_token);
    setCustomerAuthToken(data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    await customerLogout();
    localStorage.removeItem(STORAGE_KEY);
    setCustomerAuthToken(null);
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, token, loading, login, register, logout }),
    [user, token, loading, login, register, logout]
  );

  return (
    <CustomerAuthContext.Provider value={value}>
      {children}
    </CustomerAuthContext.Provider>
  );
};

export const useCustomerAuth = () => {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return ctx;
};

export const formatApiErrorDetail = (detail) => {
  if (detail == null) return 'Something went wrong. Please try again.';
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail))
    return detail
      .map((e) => (e && typeof e.msg === 'string' ? e.msg : JSON.stringify(e)))
      .filter(Boolean)
      .join(' ');
  if (detail && typeof detail.msg === 'string') return detail.msg;
  return String(detail);
};
