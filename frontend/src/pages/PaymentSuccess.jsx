import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ArrowRight, CheckCircle2, Download, Loader2 } from 'lucide-react';
import { fetchProductBySlug } from '../lib/api';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('product') || '';
  const orderId = searchParams.get('orderId') || '';
  const paymentId = searchParams.get('paymentId') || '';
  const downloadUrl = searchParams.get('download') || '';
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(Boolean(slug));

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    fetchProductBySlug(slug)
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  const heroImage = product?.hero_image || (product?.images && product.images[0]);

  return (
    <main className="min-h-screen bg-[#070314] text-white">
      <Header />
      <section className="pt-32 pb-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-[2rem] border border-emerald-500/20 bg-[#0d0820] p-8 text-center md:p-12">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
              <CheckCircle2 size={30} />
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-emerald-300">Payment successful</p>
            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">Your order is confirmed</h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
              {loading ? 'Loading your purchase details...' : `Thanks for buying ${product?.name || 'this product'}. Your payment has been verified.`}
            </p>

            {loading && (
              <div className="mt-8 flex justify-center text-white/60">
                <Loader2 size={18} className="animate-spin" />
              </div>
            )}

            {heroImage && (
              <div className="mx-auto mt-10 max-w-sm overflow-hidden rounded-3xl border border-white/10">
                <img src={heroImage} alt={product?.name || 'Purchased product'} className="aspect-[4/5] w-full object-cover" />
              </div>
            )}

            <div className="mt-8 space-y-2 text-xs uppercase tracking-[0.22em] text-white/45">
              {orderId && <p>Order ID: {orderId}</p>}
              {paymentId && <p>Payment ID: {paymentId}</p>}
            </div>

            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-violet-500"
                >
                  <Download size={16} /> Download files
                </a>
              )}
              <Link
                to="/assets"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-white/5"
              >
                Browse more assets <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
};

export default PaymentSuccess;
