import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { customerApi, setCustomerAuthToken } from '../../lib/api';

const CustomerAuthContext = createContext(null);
const TOKEN_KEY = 'customer_access_token';
const CUSTOMER_KEY = 'customer_data';

const readStoredCustomer = () => {
  try {
    const stored = localStorage.getItem(CUSTOMER_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    localStorage.removeItem(CUSTOMER_KEY);
    return null;
  }
};

export function CustomerAuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || '');
  const [customer, setCustomer] = useState(readStoredCustomer);
  const [loading, setLoading] = useState(true);

  const login = useCallback((accessToken, customerData) => {
    setToken(accessToken);
    setCustomer(customerData || null);
    localStorage.setItem(TOKEN_KEY, accessToken);
    if (customerData) localStorage.setItem(CUSTOMER_KEY, JSON.stringify(customerData));
    else localStorage.removeItem(CUSTOMER_KEY);
    setCustomerAuthToken(accessToken);
    console.info('[customer-auth] session started');
  }, []);

  const logout = useCallback(() => {
    setToken('');
    setCustomer(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CUSTOMER_KEY);
    setCustomerAuthToken('');
    console.info('[customer-auth] session cleared');
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (!token) {
      setCustomerAuthToken('');
      setLoading(false);
      return () => controller.abort();
    }

    setLoading(true);
    setCustomerAuthToken(token);
    console.info('[customer-auth] validating session');
    customerApi.get('/account/dashboard', { signal: controller.signal })
      .then((response) => {
        const nextCustomer = response.data?.customer;
        if (!nextCustomer) throw new Error('Customer session response is missing a customer profile');
        setCustomer(nextCustomer);
        localStorage.setItem(CUSTOMER_KEY, JSON.stringify(nextCustomer));
        console.info('[customer-auth] session validated');
      })
      .catch((error) => {
        if (error?.code === 'ERR_CANCELED') return;
        console.warn('[customer-auth] session validation failed', error?.response?.status || error?.message);
        logout();
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [token, logout]);

  return (
    <CustomerAuthContext.Provider value={{ token, customer, loading, isAuthenticated: Boolean(token && customer), login, logout }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (!context) throw new Error('useCustomerAuth must be used within CustomerAuthProvider');
  return context;
}
