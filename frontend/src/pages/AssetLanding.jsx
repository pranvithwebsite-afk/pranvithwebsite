import React, { useEffect, useRef, useState } from 'react';
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
  Share2,
} from 'lucide-react';
import { toast } from 'sonner';
import { fetchProductBySlug } from '../lib/api';
import { dedupeFaqs, handleImageError, safeImageSrc, shareProduct } from '../lib/utils';
import CheckoutModal from '../components/CheckoutModal';
import { usePublicPageLoading } from '../components/PublicPageLoader';
import SafeVideoEmbed, { getSafeVideoEmbedUrl, isDirectVideoUrl } from '../components/SafeVideoEmbed';
import OptimizedImage from '../components/OptimizedImage';

const AssetLanding = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  usePublicPageLoading(loading);

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
      <main className="page min-h-screen bg-[var(--bg-main)] text-white">
        <Header />
        <section className="px-6 pb-16 pt-8">
          <div className="cinematic-card mx-auto max-w-7xl p-8 lg:p-12">
            <div className="grid gap-10 lg:grid-cols-[1fr_440px]">
              <div>
                <div className="h-8 w-44 animate-pulse rounded-full bg-white/8" />
                <div className="mt-8 h-16 max-w-xl animate-pulse rounded-2xl bg-white/8" />
                <div className="mt-6 h-24 max-w-2xl animate-pulse rounded-2xl bg-white/[0.05]" />
              </div>
              <div className="aspect-[4/5] animate-pulse rounded-[2rem] bg-white/[0.05]" />
            </div>
          </div>
        </section>
        <Footer />
      </main>
    );
  }

  if (notFound || !product) {
    return (
      <main className="page bg-[var(--bg-main)] text-white min-h-screen">
        <Header />
        <div className="pt-16 pb-24 max-w-3xl mx-auto px-6 text-center">
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
  const galleryImages = product.product_images || product.images || [];
  const heroImage = safeImageSrc(product.hero_image || galleryImages[0]);

  const onPrimaryCta = () => {
    setCheckoutOpen(true);
  };

  const onShare = () => {
    shareProduct(product, `${window.location.origin}/assets/${product.slug}`);
  };

  const features = product.features || [];
  const benefits = product.benefits || [];
  const faqs = dedupeFaqs(landing.faqs || product.faqs || []).slice(0, 10);
  const compatibility = landing.compatibility || [];
  const marketTable = landing.market_table || [];

  return (
    <main className="page bg-[var(--bg-main)] text-white min-h-screen">
      <Header />

      {/* Hero */}
      <section className="pt-8 pb-16">
        <div className="max-w-7xl mx-auto px-6">
          <nav className="flex flex-wrap items-center gap-2 text-sm text-white/55 mb-8" data-testid="asset-breadcrumb">
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight size={14} />
            <Link to="/assets" className="hover:text-white">Assets</Link>
            <ChevronRight size={14} />
            <span className="text-white/85">{product.name}</span>
          </nav>

          <div className="cinematic-card overflow-hidden p-8 lg:p-12">
            <div className="grid gap-10 lg:grid-cols-[1fr_440px] items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-purple-300/20 bg-purple-500/15 px-4 py-2 text-xs uppercase tracking-[0.3em] text-purple-200 mb-6">
                  <Sparkles size={16} /> {product.category}
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white" data-testid="asset-title">
                  {landing.hero?.headline || product.name}
                </h1>
                <p className="mt-6 max-w-2xl text-white/70 leading-relaxed text-sm md:text-base">
                  {landing.hero?.subhead || product.description}
                </p>
                <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-center">
                  <div className="rounded-3xl bg-purple-500/10 border border-purple-300/20 px-6 py-5 text-white">
                    <p className="text-sm uppercase tracking-[0.3em] text-white/50">{isFree ? 'Price' : 'One-time price'}</p>
                    <p className="mt-3 text-4xl font-extrabold text-violet-300" data-testid="asset-price">
                      {isFree ? 'Free' : `₹${price.toLocaleString('en-IN')}`}
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:min-w-[220px]">
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
                    <button
                      type="button"
                      onClick={onShare}
                      className="inline-flex items-center justify-center gap-2 rounded-3xl border border-purple-300/20 bg-purple-500/10 px-8 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:border-purple-300/35 hover:bg-purple-500/15"
                    >
                      <Share2 size={17} /> Share
                    </button>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[22px] border border-purple-300/20 bg-[#090712] shadow-[0_0_45px_rgba(124,58,237,0.14)]">
                {heroImage ? (
                  <OptimizedImage src={heroImage} alt={product.name} priority width={440} height={550} className="w-full max-h-[420px] aspect-[4/3] object-cover sm:max-h-none sm:aspect-[4/5]" data-testid="asset-hero-image" onError={handleImageError} />
                ) : (
                  <div className="w-full max-h-[420px] aspect-[4/3] bg-gradient-to-br from-violet-700 to-fuchsia-900 flex items-center justify-center text-2xl font-black text-white px-6 text-center sm:max-h-none sm:aspect-[4/5]">
                    {product.name}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <ProductMediaSection product={product} galleryImages={galleryImages} />

      {/* What you get */}
      {features.length > 0 && (
        <section className="pb-16">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold tracking-tight mb-8">What you get</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((item) => (
                <div key={item} className="cinematic-card p-6 text-sm text-white/75">
                  <div className="cinematic-icon mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl">
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
      {product.before_image_url && product.after_image_url ? (
        <section className="pb-16">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold tracking-tight mb-8">LUT Before / After</h2>
            <BeforeAfterSlider beforeImage={product.before_image_url} afterImage={product.after_image_url} />
          </div>
        </section>
      ) : landing.before_after && (
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
            <div className="cinematic-card p-8">
              <div className="section-eyebrow mb-6 inline-flex items-center gap-3 text-sm">
                <ShieldCheck size={16} /> Why creators love it
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {benefits.map((b) => (
                  <div key={b} className="rounded-2xl border border-purple-300/20 bg-purple-500/10 p-5 text-white/80">
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
            <div className="cinematic-card p-8">
              <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="section-eyebrow text-sm">Compatibility</p>
                  <h2 className="mt-3 text-3xl font-bold tracking-tight">Works with your editor</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {compatibility.map((item) => (
                    <div key={item} className="rounded-3xl border border-purple-300/20 bg-purple-500/10 px-4 py-4 text-center text-sm text-white/75">
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
            <div className="cinematic-card overflow-hidden">
              <table className="min-w-full text-left text-sm text-white/75">
                <thead className="border-b border-purple-300/15 bg-[#090712]/95 text-white/85">
                  <tr>
                    <th className="px-6 py-4">Feature</th>
                    <th className="px-6 py-4">PranvithDOP</th>
                    <th className="px-6 py-4">Typical market</th>
                  </tr>
                </thead>
                <tbody>
                  {marketTable.map((row, idx) => (
                    <tr key={`${row[0]}-${idx}`} className="border-b border-purple-300/15 last:border-b-0">
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
                <div key={item.q || idx} className="cinematic-card p-6">
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
          <div className="cinematic-card p-10 text-center">
            <span className="inline-flex items-center justify-center rounded-full border border-purple-300/20 bg-purple-500/15 px-4 py-2 text-xs uppercase tracking-[0.35em] text-purple-200 mb-6">
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

const ProductMediaSection = ({ product, galleryImages }) => {
  const hasGallery = Array.isArray(galleryImages) && galleryImages.length > 0;
  const productVideoUrl = product.video_type === 'youtube' ? product.youtube_url : product.video_url;
  const hasVideo = product.video_type === 'youtube'
    ? !!getSafeVideoEmbedUrl('youtube', product.youtube_url)
    : !!productVideoUrl && (product.video_type === 'direct' || isDirectVideoUrl(productVideoUrl) || !!getSafeVideoEmbedUrl(product.video_type, productVideoUrl));
  if (!hasGallery && !hasVideo) return null;

  return (
    <section className="pb-16">
      <div className="max-w-7xl mx-auto px-6 space-y-10">
        {hasGallery && (
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-8">Product Gallery</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {galleryImages.map((image, index) => (
                <OptimizedImage
                  key={`${image}-${index}`}
                  src={safeImageSrc(image)}
                  alt={`${product.name} preview ${index + 1}`}
                  width={420}
                  height={236}
                  className="aspect-video w-full rounded-3xl border border-purple-300/20 bg-[#090712] object-cover"
                  onError={handleImageError}
                />
              ))}
            </div>
          </div>
        )}

        {hasVideo && (
          <div>
            <h2 className="text-3xl font-bold tracking-tight mb-8">Product Video</h2>
            <div className="overflow-hidden rounded-[22px] border border-purple-300/20 bg-black shadow-[0_0_45px_rgba(124,58,237,0.14)]">
              <SafeVideoEmbed
                videoType={product.video_type === 'direct' ? 'video_file' : product.video_type}
                videoUrl={productVideoUrl}
                title={`${product.name} video`}
                poster={product.hero_image || galleryImages[0]}
                className="w-full rounded-none"
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

const BeforeAfterSlider = ({ beforeImage, afterImage }) => {
  const [position, setPosition] = useState(50);
  const frameRef = useRef(null);

  const updatePosition = (clientX) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(98, Math.max(2, next)));
  };

  const startDrag = (event) => {
    event.preventDefault();
    const move = (moveEvent) => updatePosition(moveEvent.touches?.[0]?.clientX ?? moveEvent.clientX);
    const stop = () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', stop);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', stop);
    move(event);
  };

  return (
    <div
      ref={frameRef}
      className="relative mx-auto aspect-video max-w-5xl overflow-hidden rounded-[22px] border border-purple-300/20 bg-black shadow-[0_0_45px_rgba(124,58,237,0.14)]"
      onMouseDown={startDrag}
      onTouchStart={startDrag}
    >
      <OptimizedImage src={afterImage} alt="After LUT" width={960} height={540} className="absolute inset-0 h-full w-full object-cover" draggable={false} />
      <div className="absolute inset-0" style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}>
        <OptimizedImage src={beforeImage} alt="Before LUT" width={960} height={540} className="h-full w-full object-cover" draggable={false} />
      </div>
      <div className="absolute left-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-bold tracking-[0.22em] text-white">BEFORE</div>
      <div className="absolute right-4 top-4 rounded-full bg-black/70 px-3 py-1 text-xs font-bold tracking-[0.22em] text-white">AFTER</div>
      <div className="absolute inset-y-0 -ml-px w-0.5 bg-white shadow-[0_0_24px_rgba(255,255,255,0.65)]" style={{ left: `${position}%` }} />
      <button
        type="button"
        aria-label="Drag before after comparison"
        className="absolute top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-black/70 text-white shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
        style={{ left: `${position}%` }}
        onMouseDown={startDrag}
        onTouchStart={startDrag}
      >
        <span className="block text-lg leading-none">||</span>
      </button>
    </div>
  );
};

const ComparisonCard = ({ title, description, accent }) => (
  <div className="cinematic-card p-8">
    <div className="text-xs uppercase tracking-[0.35em] text-white/40 mb-4">{title}</div>
    <div className="flex h-[260px] flex-col justify-between rounded-3xl border border-purple-300/20 bg-purple-500/10 p-6 text-white/70">
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
