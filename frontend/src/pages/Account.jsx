import React from 'react';
import { CustomerAuthProvider } from '../components/account/CustomerAuthContext';
import AccountDashboard from '../components/account/AccountDashboard';

export default function Account() {
  return (
    <CustomerAuthProvider>
      <AccountDashboard />
    </CustomerAuthProvider>
  );
}
