import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { customerApi, setCustomerAuthToken } from '../../lib/api';

const CustomerAuthContext = createContext(null);

export function CustomerAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('customer_access_token') || '');
  const [customer, setCustomer] = useState(() => {
    try {
      const stored = localStorage.getItem('customer_data');
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  // Initialize from URL parameter (from OAuth redirect)
 const login = useCallback((newToken, customerData) => {
  setToken(newToken);
  setCustomer(customerData);
  localStorage.setItem('customer_access_token', newToken);
  localStorage.setItem('customer_data', JSON.stringify(customerData));
  setCustomerAuthToken(newToken);
}, []);

const logout = useCallback(() => {
  setToken('');
  setCustomer(null);
  localStorage.removeItem('customer_access_token');
  localStorage.removeItem('customer_data');
  setCustomerAuthToken('');
}, []);

useEffect(() => {
  if (token) {
    setCustomerAuthToken(token);

    customerApi.get('/account/profile')
      .then(res => {
        const data = res.data?.customer || res.data;
        setCustomer(data);
        localStorage.setItem('customer_data', JSON.stringify(data));
      })
      .catch(() => {
        logout();
      })
      .finally(() => setLoading(false));
  } else {
    setLoading(false);
  }
}, [token, logout]);

  return (
    <CustomerAuthContext.Provider value={{
      token,
      customer,
      loading,
      isAuthenticated: !!token,
      login,
      logout,
    }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const ctx = useContext(CustomerAuthContext);
  if (!ctx) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return ctx;
}
