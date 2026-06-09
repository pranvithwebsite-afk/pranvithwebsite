import React, { useEffect, useState } from 'react';
import { fetchAdminOrders } from '../../lib/api';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdminOrders()
      .then(setOrders)
      .catch(() => setOrders([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900/95 p-6">
        <h1 className="text-3xl font-semibold text-white">Orders</h1>
        <p className="mt-3 text-slate-400">Orders and checkout sessions created through the Razorpay integration.</p>
      </div>

      <div className="space-y-4">
        {loading
          ? Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="rounded-3xl border border-slate-800 bg-slate-950 p-5 h-28 animate-pulse" />
            ))
          : orders.length > 0
          ? orders.map((order) => (
              <div key={order?.id ?? order?.razorpay_order_id} className="rounded-3xl border border-slate-800 bg-slate-950 p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-base font-semibold text-white">Order ID: {order?.id ?? order?.razorpay_order_id}</p>
                  <span className="rounded-full bg-violet-600/15 px-3 py-1 text-sm text-violet-200">{order?.status ?? 'created'}</span>
                </div>
                <p className="mt-3 text-slate-400">Amount: ₹{order?.amount ? order.amount / 100 : 0}</p>
              </div>
            ))
          : (
            <div className="rounded-3xl border border-slate-800 bg-slate-950 p-5 text-slate-400">No orders available yet.</div>
          )}
      </div>
    </section>
  );
};

export default Orders;
