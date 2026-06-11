import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CheckCircle2, Download, Loader2, ArrowRight } from 'lucide-react';
import { fetchProductBySlug } from '../lib/api';
import { useCustomerAuth } from '../auth/CustomerAuthContext';

const ThankYou = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useCustomerAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const downloadUrl = searchParams.get('download') || '';
  const paymentId = searchParams.get('paymentId') || '';

  useEffect(() => {
    setLoading(true);
    fetchProductBySlug(slug)
      .then(setProduct)
      .catch(() => setProduct(null))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="bg-[#070314] text-white min-h-screen">
        <Header />
        <div className="pt-40 pb-24 flex justify-center text-white/60 text-sm">
          <Loader2 size={16} className="animate-spin mr-2" /> Loading...
        </div>
        <Footer />
      </main>
    );
  }

  const ty = product?.thank_you_content || {};
  const heroImage = product?.hero_image || (product?.images && product.images[0]);

  return (
    <main className="bg-[#070314] text-white min-h-screen">
      <Header />

      <section className="pt-32 pb-24">
        <div className="max-w-4xl mx-auto px-6">
          <div className="rounded-[2rem] border border-violet-500/20 bg-gradient-to-br from-[#150b2c] via-[#0d0820] to-[#0a0518] p-10 lg:p-14 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-500/15 text-emerald-300 flex items-center justify-center mb-6">
              <CheckCircle2 size={28} />
            </div>
            <p className="text-xs uppercase tracking-[0.35em] text-violet-300">Order confirmed</p>
            <h1 className="mt-4 text-4xl md:text-5xl font-black tracking-tight" data-testid="thankyou-title">
              {ty.title || 'Thank you for your purchase!'}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-white/70 leading-relaxed">
              {ty.message ||
                `Your ${product?.name || 'asset'} is on its way. Download the files below to get started right away.`}
            </p>
            {paymentId && (
              <p className="mt-4 text-xs uppercase tracking-[0.25em] text-white/45">
                Payment ID: {paymentId}
              </p>
            )}

            {heroImage && (
              <div className="mt-10 rounded-3xl overflow-hidden border border-white/10 max-w-md mx-auto">
                <img src={heroImage} alt={product?.name} className="w-full aspect-[4/5] object-cover" />
              </div>
            )}

            <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid="thankyou-download-btn"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 hover:bg-violet-500 transition text-white px-8 py-3.5 text-sm font-semibold uppercase tracking-wider"
                >
                  <Download size={16} /> Download files
                </a>
              )}
              {!downloadUrl && (
                <Link
                  to="/assets"
                  data-testid="thankyou-no-download"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 hover:bg-violet-500 transition text-white px-8 py-3.5 text-sm font-semibold uppercase tracking-wider"
                >
                  Browse assets <ArrowRight size={16} />
                </Link>
              )}
              {user ? (
                <Link
                  to="/dashboard"
                  data-testid="thankyou-dashboard-link"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 hover:bg-white/5 transition text-white px-8 py-3.5 text-sm font-semibold uppercase tracking-wider"
                >
                  Go to My Downloads <ArrowRight size={16} />
                </Link>
              ) : (
                <Link
                  to="/register"
                  data-testid="thankyou-signup-link"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 hover:bg-white/5 transition text-white px-8 py-3.5 text-sm font-semibold uppercase tracking-wider"
                >
                  Create account for re-downloads <ArrowRight size={16} />
                </Link>
              )}
            </div>
          </div>

          {ty.instructions && ty.instructions.length > 0 && (
            <div className="mt-10 rounded-[2rem] border border-white/10 bg-[#0d0820]/80 p-8">
              <p className="text-xs uppercase tracking-[0.35em] text-white/45 mb-4">How to use</p>
              <ol className="space-y-3 list-decimal list-inside text-white/80">
                {ty.instructions.map((step, idx) => (
                  <li key={`step-${idx}`} className="leading-relaxed">{step}</li>
                ))}
              </ol>
            </div>
          )}

          <div className="mt-10 text-center">
            <Link to="/assets" className="text-sm text-white/55 hover:text-white" data-testid="thankyou-browse-more">
              Browse more assets →
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

export default ThankYou;
