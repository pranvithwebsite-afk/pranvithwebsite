import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { AlertCircle, ArrowLeft, ShoppingBag } from 'lucide-react';

const PaymentFailed = () => {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('product') || '';
  const message = searchParams.get('message') || 'Payment failed or was not completed. No paid order was confirmed.';
  const orderId = searchParams.get('orderId') || '';
  const retryPath = slug ? `/assets/${slug}` : '/assets';

  return (
    <main className="min-h-screen bg-[#070314] text-white">
      <Header />
      <section className="pt-32 pb-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="rounded-[2rem] border border-rose-500/20 bg-[#0d0820] p-8 text-center md:p-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-500/15 text-rose-300">
              <AlertCircle size={30} />
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-rose-300">Payment failed</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">We could not complete the payment</h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
              {message}
            </p>
            {orderId && (
              <p className="mt-6 text-xs uppercase tracking-[0.22em] text-white/45">Order ID: {orderId}</p>
            )}
            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              <Link
                to={retryPath}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-violet-500"
              >
                <ShoppingBag size={16} /> Try again
              </Link>
              <Link
                to="/assets"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-white/5"
              >
                <ArrowLeft size={16} /> Back to assets
              </Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
};

export default PaymentFailed;
