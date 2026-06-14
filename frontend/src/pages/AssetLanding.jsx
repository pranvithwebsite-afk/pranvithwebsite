import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import {
  ChevronRight,
  CheckCircle,
  ShieldCheck,
  Sparkles,
  Monitor,
  ArrowRight,
  Loader2,
  Download,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchProductBySlug } from '../lib/api';
import { dedupeFaqs } from '../lib/utils';
import CheckoutModal from '../components/CheckoutModal';

const AssetLanding = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    fetchProductBySlug(slug)
      .then((p) => {
        setProduct(p);
        if (p?.seo_title) document.title = p.seo_title;
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <main className="bg-[#070314] text-white min-h-screen">
        <Header />
        <div className="pt-40 pb-24 flex justify-center text-white/60 text-sm">
          <Loader2 size={16} className="animate-spin mr-2" /> Loading asset...
        </div>
        <Footer />
      </main>
    );
  }

  if (notFound || !product) {
    return (
      <main className="bg-[#070314] text-white min-h-screen">
        <Header />
        <div className="pt-40 pb-24 max-w-3xl mx-auto px-6 text-center">
          <h1 className="text-3xl font-bold">Asset not found</h1>
          <p className="mt-3 text-white/60">The asset you're looking for is no longer available.</p>
          <Link to="/assets" className="inline-flex mt-6 bg-violet-600 hover:bg-violet-500 px-5 py-2.5 rounded-full text-sm font-semibold">
            Browse all assets
          </Link>
        </div>
        <Footer />
      </main>
    );
  }

  const isFree = product.is_free || (product.sale_price ?? product.price ?? 0) === 0;
  const price = product.sale_price ?? product.price ?? 0;
  const landing = product.landing_content || {};
  const heroImage = product.hero_image || (product.images && product.images[0]);

  const onPrimaryCta = () => {
    setCheckoutOpen(true);
  };

  const features = product.features || [];
  const benefits = product.benefits || [];
  const faqs = dedupeFaqs(landing.faqs || product.faqs || []).slice(0, 10);
  const compatibility = landing.compatibility || [];
  const marketTable = landing.market_table || [];

  return (
    <main className="bg-[#070314] text-white min-h-screen">
      <Header />

      {/* Hero */}
      <section className="pt-32 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-white/55 mb-8" data-testid="asset-breadcrumb">
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight size={14} />
            <Link to="/assets" className="hover:text-white">Assets</Link>
            <ChevronRight size={14} />
            <span className="text-white/85">{product.name}</span>
          </nav>

          <div className="rounded-[2rem] overflow-hidden border border-white/10 bg-gradient-to-br from-[#090712] via-[#0d0820] to-[#0a0518] p-8 lg:p-12">
            <div className="grid gap-10 lg:grid-cols-[1fr_440px] items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/15 bg-violet-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-violet-300 mb-6">
                  <Sparkles size={16} /> {product.category}
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white" data-testid="asset-title">
                  {landing.hero?.headline || product.name}
                </h1>
                <p className="mt-6 max-w-2xl text-white/70 leading-relaxed text-sm md:text-base">
                  {landing.hero?.subhead || product.description}
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="rounded-3xl bg-white/5 border border-white/10 px-6 py-5 text-white">
                    <p className="text-sm uppercase tracking-[0.3em] text-white/50">{isFree ? 'Price' : 'One-time price'}</p>
                    <p className="mt-3 text-4xl font-extrabold text-violet-300" data-testid="asset-price">
                      {isFree ? 'Free' : `₹${price.toLocaleString('en-IN')}`}
                    </p>
                  </div>
                  <button
                    onClick={onPrimaryCta}
                    disabled={busy}
                    data-testid="asset-buy-now"
                    className="inline-flex items-center justify-center gap-2 rounded-3xl bg-violet-600 px-8 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-violet-500 disabled:opacity-60"
                  >
                    {busy ? (
                      <><Loader2 size={16} className="animate-spin" /> Please wait...</>
                    ) : (
                      <>{isFree ? 'Get for Free' : 'Buy Now'} <ArrowRight size={18} /></>
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-[2rem] border border-white/10 bg-[#090712] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
                {heroImage ? (
                  <img src={heroImage} alt={product.name} className="w-full aspect-[4/5] object-cover" data-testid="asset-hero-image" />
                ) : (
                  <div className="w-full aspect-[4/5] bg-gradient-to-br from-violet-700 to-fuchsia-900 flex items-center justify-center text-2xl font-black text-white px-6 text-center">
                    {product.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What you get */}
      {features.length > 0 && (
        <section className="pb-16">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold tracking-tight mb-8">What you get</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((item) => (
                <div key={item} className="rounded-3xl border border-white/10 bg-[#0d0820]/90 p-6 text-sm text-white/75 transition hover:border-violet-500/30">
                  <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                    <CheckCircle size={18} />
                  </div>
                  <p className="font-semibold text-white">{item}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Before & After */}
      {landing.before_after && (
        <section className="pb-16">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold tracking-tight mb-8">Before & After</h2>
            <div className="grid gap-6 lg:grid-cols-2">
              <ComparisonCard title="Before" description={landing.before_after} />
              <ComparisonCard title="After" description="Premium, polished output with PranvithDOP quality." accent />
            </div>
          </div>
        </section>
      )}

      {/* Benefits */}
      {benefits.length > 0 && (
        <section className="pb-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="rounded-[2rem] border border-white/10 bg-[#090712] p-8">
              <div className="inline-flex items-center gap-3 text-sm uppercase tracking-[0.35em] text-white/40 mb-6">
                <ShieldCheck size={16} /> Why creators love it
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {benefits.map((b) => (
                  <div key={b} className="rounded-2xl border border-white/10 bg-white/5 p-5 text-white/80">
                    {b}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Compatibility */}
      {compatibility.length > 0 && (
        <section className="pb-16">
          <div className="max-w-7xl mx-auto px-6">
            <div className="rounded-[2rem] border border-white/10 bg-[#0b0920] p-8">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.35em] text-white/40">Compatibility</p>
                  <h2 className="mt-3 text-3xl font-bold tracking-tight">Works with your editor</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {compatibility.map((item) => (
                    <div key={item} className="rounded-3xl border border-white/10 bg-[#090712]/80 px-4 py-4 text-center text-sm text-white/75">
                      <span className="block font-semibold text-white mb-1">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Market comparison */}
      {marketTable.length > 0 && (
        <section className="pb-16">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold tracking-tight mb-8">Market Comparison</h2>
            <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-[#0d0820]/90">
              <table className="min-w-full text-left text-sm text-white/75">
                <thead className="border-b border-white/10 bg-[#090712]/95 text-white/85">
                  <tr>
                    <th className="px-6 py-4">Feature</th>
                    <th className="px-6 py-4">PranvithDOP</th>
                    <th className="px-6 py-4">Typical market</th>
                  </tr>
                </thead>
                <tbody>
                  {marketTable.map((row, idx) => (
                    <tr key={`${row[0]}-${idx}`} className="border-b border-white/10 last:border-b-0">
                      <td className="px-6 py-4 text-white/85 font-medium">{row[0]}</td>
                      <td className="px-6 py-4">{row[1]}</td>
                      <td className="px-6 py-4">{row[2]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* FAQs */}
      {faqs.length > 0 && (
        <section className="pb-16">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold tracking-tight mb-8">Frequently Asked Questions</h2>
            <div className="grid gap-4">
              {faqs.map((item, idx) => (
                <div key={item.q || idx} className="rounded-3xl border border-white/10 bg-[#0a0518]/90 p-6">
                  <p className="font-semibold text-white">{item.q}</p>
                  <p className="mt-3 text-white/70 leading-relaxed text-sm">{item.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Final CTA */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-[2rem] border border-violet-500/20 bg-gradient-to-br from-[#110d24] via-[#090712] to-[#0a0418] p-10 text-center">
            <span className="inline-flex items-center justify-center rounded-full bg-violet-500/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-violet-300 mb-6">
              Get Instant Access
            </span>
            <h2 className="text-4xl font-bold tracking-tight text-white">{isFree ? `Claim ${product.name}` : `Get ${product.name} today`}</h2>
            <p className="mx-auto mt-5 max-w-2xl text-white/70 leading-relaxed">
              {product.description}
            </p>
            <button
              onClick={onPrimaryCta}
              disabled={busy}
              data-testid="asset-buy-now-bottom"
              className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-10 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-violet-500 disabled:opacity-60"
            >
              {isFree ? <><Download size={16} /> Get for Free</> : <>Buy Now <ArrowRight size={18} /></>}
            </button>
          </div>
        </div>
      </section>

      <Footer />
      <CheckoutModal
        product={product}
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        onSuccess={(result) => {
          setCheckoutOpen(false);
          const params = new URLSearchParams({
            orderId: result.orderId || '',
            paymentId: result.paymentId || '',
            token: result.downloadToken || '',
            product: result.productSlug || product.slug,
          });
          navigate(`/payment-success?${params.toString()}`);
        }}
        onFailure={(message, result) => {
          toast.error(message);
          if (result?.failed) {
            const params = new URLSearchParams({
              product: product.slug,
              message,
              orderId: result.orderId || '',
            });
            navigate(`/payment-failed?${params.toString()}`);
          }
        }}
      />
    </main>
  );
};

const ComparisonCard = ({ title, description, accent }) => (
  <div className={`rounded-[2rem] border ${accent ? 'border-violet-500/20 bg-[#18102c]' : 'border-white/10 bg-[#0d0820]'} p-8`}>
    <div className="text-xs uppercase tracking-[0.35em] text-white/40 mb-4">{title}</div>
    <div className="h-[260px] rounded-3xl border border-white/10 bg-white/5 p-6 text-white/70 flex flex-col justify-between">
      <div>
        <div className="mb-3 h-28 rounded-3xl bg-white/5" />
        <p className="text-sm leading-relaxed">{description}</p>
      </div>
      <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.35em] text-white/50">
        <Monitor size={14} /> Preview
      </span>
    </div>
  </div>
);

export default AssetLanding;
