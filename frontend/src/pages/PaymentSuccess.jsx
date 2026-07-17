import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { AlertCircle, ArrowRight, CheckCircle2, Download, Loader2 } from 'lucide-react';
import { fetchOrderAccess, fetchProductBySlug } from '../lib/api';
import { handleImageError, safeImageSrc } from '../lib/utils';

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const slug = searchParams.get('product') || '';
  const orderId = searchParams.get('orderId') || '';
  const token = searchParams.get('token') || '';
  const [product, setProduct] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (!orderId || !token) {
      setError('This payment confirmation link is incomplete.');
      setLoading(false);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    fetchOrderAccess(orderId, token)
      .then(async (verifiedOrder) => {
        if (!active) return;
        setOrder(verifiedOrder);
        const productSlug = verifiedOrder.product_slug || slug;
        if (productSlug) {
          try {
            const purchasedProduct = await fetchProductBySlug(productSlug);
            if (active) setProduct(purchasedProduct);
          } catch (_) {
            if (active) setProduct(null);
          }
        }
      })
      .catch((err) => {
        if (!active) return;
        setError(err?.response?.data?.detail || 'We could not verify this paid order.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [orderId, slug, token]);

  const heroImage = safeImageSrc(product?.hero_image || (product?.images && product.images[0]));
  const verified = order?.verified_paid === true && order?.payment_status === 'paid';

  return (
    <main className="page min-h-screen bg-[var(--bg-main)] text-white">
      <Header />
      <section className="pt-8 pb-24">
        <div className="mx-auto max-w-4xl px-6">
          <div className="rounded-[2rem] border border-emerald-500/20 bg-[var(--bg-card)] p-8 text-center md:p-12">
            <div className={`mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl ${
              error ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'
            }`}>
              {error ? <AlertCircle size={30} /> : <CheckCircle2 size={30} />}
            </div>
            <p className={`text-xs uppercase tracking-[0.35em] ${error ? 'text-rose-300' : 'text-emerald-300'}`}>
              {error ? 'Verification required' : 'Payment successful'}
            </p>
            <h1 className="mt-4 text-4xl font-black tracking-tight md:text-5xl">
              {error ? 'We could not confirm this order' : 'Your order is confirmed'}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/70 md:text-base">
              {loading
                ? 'Verifying your payment and download access...'
                : error || (
                  order?.email_error
                    ? `Thanks for buying ${product?.name || order?.product_name || 'this product'}. Your payment has been verified.`
                    : `Thanks for buying ${product?.name || order?.product_name || 'this product'}. Your payment has been verified. Your download link has been sent to your email.`
                )}
            </p>

            {verified && order.email_error && (
              <p className="mx-auto mt-4 max-w-2xl rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                {order.email_error}
              </p>
            )}

            {loading && (
              <div className="mt-8 flex justify-center text-white/60">
                <Loader2 size={18} className="animate-spin" />
              </div>
            )}

            {heroImage && (
              <div className="mx-auto mt-10 max-w-sm overflow-hidden rounded-3xl border border-white/10">
                <img src={heroImage} alt={product?.name || 'Purchased product'} className="aspect-[4/5] w-full object-cover" onError={handleImageError} />
              </div>
            )}

            <div className="mt-8 space-y-2 text-xs uppercase tracking-[0.22em] text-white/45">
              {verified && <p>Order ID: {order.order_id}</p>}
              {verified && order.payment_id && <p>Payment ID: {order.payment_id}</p>}
            </div>

            <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
              {verified && order.download_url && (
                <a
                  href={order.download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-8 py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-violet-500"
                >
                  <Download size={16} /> Download Now
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
