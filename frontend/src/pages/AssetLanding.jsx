import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import {
  X,
  ChevronLeft,
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
import ProductDescription from '../components/ProductDescription';

const toStringList = (value) => (
  Array.isArray(value)
    ? value.map((item) => String(item ?? '').trim()).filter(Boolean)
    : []
);

const sanitizeUniqueImageList = (values) => (
  values
    .map((image) => safeImageSrc(image, ''))
    .filter(Boolean)
    .filter((image, index, list) => list.indexOf(image) === index)
);

const toFaqList = (value) => (
  Array.isArray(value)
    ? value
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        q: String(item.q || item.question || '').trim(),
        a: String(item.a || item.answer || '').trim(),
      }))
      .filter((item) => item.q || item.a)
    : []
);

const toMarketTable = (value) => (
  Array.isArray(value)
    ? value
      .filter(Array.isArray)
      .map((row) => row.slice(0, 3).map((cell) => String(cell ?? '').trim()))
      .filter((row) => row.some(Boolean))
    : []
);

const normalizeProduct = (value) => {
  const product = value && typeof value === 'object' ? value : {};
  const landing = product.landing_content && typeof product.landing_content === 'object'
    ? product.landing_content
    : {};
  const numericPrice = Number(product.price);
  const numericSalePrice = Number(product.sale_price);
  const hasSalePrice = Number.isFinite(numericSalePrice) && numericSalePrice >= 0;
  const hasPrice = Number.isFinite(numericPrice) && numericPrice >= 0;
  const resolvedPrice = hasSalePrice ? numericSalePrice : (hasPrice ? numericPrice : null);
  const mainImageCandidates = sanitizeUniqueImageList([
    product.image_url,
    product.preview_image_url,
    product.cover_image_url,
    product.thumbnail_url,
  ]);
  const mainImageUrl = mainImageCandidates[0] || '';
  const excludedGalleryImages = new Set(mainImageCandidates);
  [
    product.image_url,
    product.preview_image_url,
    product.cover_image_url,
    product.thumbnail_url,
  ]
    .map((image) => safeImageSrc(image, ''))
    .filter(Boolean)
    .forEach((image) => excludedGalleryImages.add(image));

  const galleryImages = [
    ...toStringList(product.gallery),
    ...toStringList(product.gallery_images),
  ]
    .map((image) => safeImageSrc(image, ''))
    .filter(Boolean)
    .filter((image, index, list) => list.indexOf(image) === index)
    .filter((image) => !excludedGalleryImages.has(image));
  const heroImage = safeImageSrc(
    mainImageUrl
    || '',
    ''
  );
  const faqs = dedupeFaqs([
    ...toFaqList(landing.faqs),
    ...toFaqList(product.faqs),
  ]).slice(0, 10);

  return {
    raw: product,
    landing,
    name: String(product.name || product.title || 'Asset').trim() || 'Asset',
    title: String(product.title || product.name || 'Asset').trim() || 'Asset',
    slug: String(product.slug || '').trim(),
    description: String(product.description || '').trim(),
    category: String(product.category || '').trim() || 'Asset',
    price: resolvedPrice,
    isFree: product.is_free === true || resolvedPrice === 0,
    heroImage,
    galleryImages,
    features: toStringList(product.features),
    benefits: toStringList(product.benefits),
    compatibility: toStringList(landing.compatibility),
    marketTable: toMarketTable(landing.market_table),
    faqs,
    beforeImageUrl: safeImageSrc(product.before_image_url || '', ''),
    afterImageUrl: safeImageSrc(product.after_image_url || '', ''),
    videoType: String(product.video_type || '').trim().toLowerCase(),
    videoUrl: String(product.video_url || '').trim(),
    youtubeUrl: String(product.youtube_url || '').trim(),
  };
};

const AssetLanding = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  usePublicPageLoading(loading);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setProduct(null);
    setNotFound(false);
    setErrorMessage('');

    fetchProductBySlug(slug)
      .then((response) => {
        if (!active) return;
        setProduct(response && typeof response === 'object' ? response : {});
        if (response?.seo_title) {
          document.title = response.seo_title;
        }
      })
      .catch((error) => {
        if (!active) return;
        const status = error?.response?.status;
        if (status === 404) {
          setNotFound(true);
          return;
        }
        console.error('[asset-detail] Failed to load asset', {
          slug,
          status,
          detail: error?.response?.data?.detail || error?.message || error,
        });
        setErrorMessage('This asset could not be loaded right now. Please try again.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slug]);

  const asset = normalizeProduct(product);
  const {
    landing,
    name,
    category,
    description,
    price,
    isFree,
    heroImage,
    galleryImages,
    features,
    benefits,
    compatibility,
    marketTable,
    faqs,
    beforeImageUrl,
    afterImageUrl,
  } = asset;

  const heroHeadline = String(landing.hero?.headline || landing.headline || name || 'Asset').trim() || 'Asset';
  const heroSubhead = String(landing.hero?.subhead || landing.subhead || description || 'Product details will be available soon.').trim();
  const beforeAfterDescription = String(landing.before_after || '').trim();

  const onShare = async () => {
    await shareProduct(product || { slug, name, description });
  };

  const onPrimaryCta = () => {
    if (!product) return;
    setBusy(true);
    setCheckoutOpen(true);
    window.setTimeout(() => setBusy(false), 0);
  };

  const goToPaymentFailed = (message, result) => {
    const params = new URLSearchParams({
      product: asset.slug || slug || '',
      message,
      orderId: result?.orderId || '',
    });
    navigate(`/payment-failed?${params.toString()}`);
  };

  return (
    <>
      <Header />
      <main className="page min-h-screen bg-[var(--bg-main)] text-white">
        {loading ? (
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
        ) : notFound ? (
          <StatusState
            title="Asset not found"
            description="The asset you're looking for is no longer available."
          />
        ) : errorMessage ? (
          <StatusState
            title="Unable to load asset"
            description={errorMessage}
          />
        ) : (
          <>
            <section className="section-block pt-8">
              <div className="page-shell">
                <nav className="mb-8 flex flex-wrap items-center gap-2 text-sm text-white/55" data-testid="asset-breadcrumb">
                  <Link to="/" className="hover:text-white">Home</Link>
                  <ChevronRight size={14} />
                  <Link to="/assets" className="hover:text-white">Assets</Link>
                  <ChevronRight size={14} />
                  <span className="text-white/85">{name}</span>
                </nav>

                <div className="cinematic-card overflow-hidden p-5 sm:p-7 lg:p-9">
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem] xl:items-start">
                    <div className="order-1 xl:hidden">
                      <ProductHeroImage heroImage={heroImage} name={name} />
                    </div>

                    <div className="order-2 xl:order-1 xl:col-start-1 xl:row-start-1">
                      <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-purple-300/20 bg-purple-500/15 px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-purple-200 sm:text-xs">
                        <Sparkles size={16} /> {category}
                      </div>
                      <h1 className="max-w-3xl text-3xl font-black tracking-tight text-white sm:text-4xl lg:text-5xl" data-testid="asset-title">
                        {heroHeadline}
                      </h1>
                      <ProductDescription
                        value={heroSubhead}
                        className="mt-4 max-w-2xl space-y-4"
                      />
                    </div>

                    <div className="order-4 hidden space-y-5 xl:order-2 xl:col-start-2 xl:row-span-2 xl:block xl:sticky xl:top-[7.5rem]">
                      <ProductHeroImage heroImage={heroImage} name={name} />
                      <PriceCard
                        price={price}
                        isFree={isFree}
                        busy={busy}
                        product={product}
                        onPrimaryCta={onPrimaryCta}
                        onShare={onShare}
                      />
                    </div>

                    <div className="order-3 xl:order-3 xl:col-start-1 xl:row-start-2">
                      <PriceCard
                        price={price}
                        isFree={isFree}
                        busy={busy}
                        product={product}
                        onPrimaryCta={onPrimaryCta}
                        onShare={onShare}
                        className="xl:hidden"
                      />
                    </div>

                    <div className="order-4 xl:order-4 xl:col-start-1 xl:row-start-3">
                      <div className="grid gap-3 sm:grid-cols-3">
                        <ValuePill label="Format" value={category} />
                        <ValuePill label="Access" value={isFree ? 'Instant free access' : 'Instant delivery'} />
                        <ValuePill label="Support" value="Creator-ready files" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <ProductMediaSection product={asset} galleryImages={galleryImages} />

            {features.length > 0 && (
              <section className="section-block pt-0">
                <div className="page-shell">
                  <h2 className="mb-8 text-3xl font-bold tracking-tight">What you get</h2>
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

            {beforeImageUrl && afterImageUrl ? (
              <section className="section-block pt-0">
                <div className="page-shell">
                  <h2 className="mb-8 text-3xl font-bold tracking-tight">LUT Before / After</h2>
                  <BeforeAfterSlider beforeImage={beforeImageUrl} afterImage={afterImageUrl} />
                </div>
              </section>
            ) : beforeAfterDescription ? (
              <section className="section-block pt-0">
                <div className="page-shell">
                  <h2 className="mb-8 text-3xl font-bold tracking-tight">Before & After</h2>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <ComparisonCard title="Before" description={beforeAfterDescription} />
                    <ComparisonCard title="After" description="Premium, polished output with PranvithDOP quality." accent />
                  </div>
                </div>
              </section>
            ) : null}

            {benefits.length > 0 && (
              <section className="section-block pt-0">
                <div className="page-shell">
                  <div className="cinematic-card p-8">
                    <div className="section-eyebrow mb-6 inline-flex items-center gap-3 text-sm">
                      <ShieldCheck size={16} /> Why creators love it
                    </div>
                    <div className="grid gap-4 md:grid-cols-3">
                      {benefits.map((item) => (
                        <div key={item} className="rounded-2xl border border-purple-300/20 bg-purple-500/10 p-5 text-white/80">
                          {item}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {compatibility.length > 0 && (
              <section className="pb-16">
                <div className="mx-auto max-w-7xl px-6">
                  <div className="cinematic-card p-8">
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="section-eyebrow text-sm">Compatibility</p>
                        <h2 className="mt-3 text-3xl font-bold tracking-tight">Works with your editor</h2>
                      </div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        {compatibility.map((item) => (
                          <div key={item} className="rounded-3xl border border-purple-300/20 bg-purple-500/10 px-4 py-4 text-center text-sm text-white/75">
                            <span className="mb-1 block font-semibold text-white">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            )}

            {marketTable.length > 0 && (
              <section className="section-block pt-0">
                <div className="page-shell">
                  <h2 className="mb-8 text-3xl font-bold tracking-tight">Market Comparison</h2>
                  <div className="cinematic-card overflow-x-auto">
                    <table className="min-w-full text-left text-sm text-white/75">
                      <thead className="border-b border-purple-300/15 bg-[#090712]/95 text-white/85">
                        <tr>
                          <th className="px-6 py-4">Feature</th>
                          <th className="px-6 py-4">PranvithDOP</th>
                          <th className="px-6 py-4">Typical market</th>
                        </tr>
                      </thead>
                      <tbody>
                        {marketTable.map((row, index) => (
                          <tr key={`${row[0] || 'row'}-${index}`} className="border-b border-purple-300/15 last:border-b-0">
                            <td className="px-6 py-4 font-medium text-white/85">{row[0] || 'Feature'}</td>
                            <td className="px-6 py-4">{row[1] || '-'}</td>
                            <td className="px-6 py-4">{row[2] || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </section>
            )}

            {faqs.length > 0 && (
              <section className="section-block pt-0">
                <div className="page-shell max-w-4xl">
                  <h2 className="mb-8 text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
                  <div className="grid gap-4">
                    {faqs.map((item, index) => (
                      <div key={item.q || `${item.a}-${index}`} className="cinematic-card p-6">
                        <p className="font-semibold text-white">{item.q || 'Question'}</p>
                        <p className="mt-3 text-sm leading-relaxed text-white/70">{item.a || 'Answer coming soon.'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <section className="section-block pt-0">
              <div className="page-shell max-w-5xl">
                <div className="cinematic-card p-7 text-center sm:p-10">
                  <span className="mb-6 inline-flex items-center justify-center rounded-full border border-purple-300/20 bg-purple-500/15 px-4 py-2 text-xs uppercase tracking-[0.35em] text-purple-200">
                    Get Instant Access
                  </span>
                  <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    {isFree ? `Claim ${name}` : `Get ${name} today`}
                  </h2>
                  <ProductDescription
                    value={description || 'Instant access after checkout.'}
                    className="mx-auto mt-5 max-w-2xl space-y-4 text-left sm:text-center"
                    listClassName="text-left sm:text-left"
                  />
                  <button
                    onClick={onPrimaryCta}
                    disabled={busy || !product}
                    data-testid="asset-buy-now-bottom"
                    className="mt-8 inline-flex items-center justify-center gap-2 rounded-full bg-violet-600 px-10 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-violet-500 disabled:opacity-60"
                  >
                    {isFree ? <><Download size={16} /> Get for Free</> : <>Buy Now <ArrowRight size={18} /></>}
                  </button>
                </div>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
      <CheckoutModal
        product={product}
        open={checkoutOpen}
        onClose={() => {
          setBusy(false);
          setCheckoutOpen(false);
        }}
        onSuccess={(result) => {
          setBusy(false);
          setCheckoutOpen(false);
          const params = new URLSearchParams({
            orderId: result.orderId || '',
            paymentId: result.paymentId || '',
            token: result.downloadToken || '',
            product: result.productSlug || asset.slug || slug || '',
          });
          navigate(`/payment-success?${params.toString()}`);
        }}
        onFailure={(message, result) => {
          setBusy(false);
          toast.error(message);
          if (result?.failed) goToPaymentFailed(message, result);
        }}
      />
    </>
  );
};

const StatusState = ({ title, description }) => (
  <section className="px-6 pb-24 pt-16">
    <div className="page-shell max-w-3xl text-center">
      <div className="cinematic-card p-10">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-3 text-white/60">{description}</p>
        <Link
          to="/assets"
          className="mt-6 inline-flex rounded-full bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-500"
        >
          Back to Assets
        </Link>
      </div>
    </div>
  </section>
);

const ValuePill = ({ label, value }) => (
  <div className="rounded-2xl border border-purple-300/15 bg-white/[0.03] px-4 py-4">
    <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">{label}</p>
    <p className="mt-2 text-sm font-semibold text-white/88">{value}</p>
  </div>
);

const ProductHeroImage = ({ heroImage, name }) => (
  <div className="product-hero-image-wrap shadow-[0_0_45px_rgba(124,58,237,0.14)]">
    {heroImage ? (
      <OptimizedImage
        src={heroImage}
        alt={name}
        priority
        width={440}
        height={550}
        className="product-hero-image"
        data-testid="asset-hero-image"
        onError={handleImageError}
      />
    ) : (
      <div className="flex min-h-[16rem] w-full items-center justify-center rounded-[inherit] bg-gradient-to-br from-violet-700 to-fuchsia-900 px-6 py-10 text-center text-2xl font-black text-white sm:min-h-[22rem]">
        {name}
      </div>
    )}
  </div>
);

const PriceCard = ({ price, isFree, busy, product, onPrimaryCta, onShare, className = '' }) => (
  <div className={`rounded-[22px] border border-purple-300/20 bg-[#0b0716] p-4 sm:p-5 ${className}`.trim()}>
    <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">
      {price == null ? 'Price status' : isFree ? 'Price' : 'One-time price'}
    </p>
    <p className="mt-3 text-3xl font-extrabold text-violet-300 sm:text-4xl" data-testid="asset-price">
      {price == null ? 'Price unavailable' : isFree ? 'Free' : `Rs ${price.toLocaleString('en-IN')}`}
    </p>
    <div className="mt-4 grid gap-3">
      <button
        onClick={onPrimaryCta}
        disabled={busy || !product}
        data-testid="asset-buy-now"
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-violet-600 px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-violet-500 disabled:opacity-60"
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
        className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-purple-300/20 bg-purple-500/10 px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:border-purple-300/35 hover:bg-purple-500/15"
      >
        <Share2 size={17} /> Share
      </button>
    </div>
    <div className="mt-4 space-y-2 text-sm text-white/62">
      <p>Clean mobile-first checkout flow.</p>
      <p>Files delivered immediately after access confirmation.</p>
    </div>
  </div>
);

const ProductMediaSection = ({ product, galleryImages }) => {
  const [failedImages, setFailedImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const visibleGalleryImages = (Array.isArray(galleryImages) ? galleryImages : [])
    .filter((image) => !failedImages.includes(image));
  const hasGallery = visibleGalleryImages.length > 0;
  const productVideoUrl = product?.videoType === 'youtube' ? product?.youtubeUrl : product?.videoUrl;
  const hasVideo = product?.videoType === 'youtube'
    ? !!getSafeVideoEmbedUrl('youtube', product?.youtubeUrl)
    : !!productVideoUrl && (
      product?.videoType === 'direct'
      || isDirectVideoUrl(productVideoUrl)
      || !!getSafeVideoEmbedUrl(product?.videoType, productVideoUrl)
    );
  const hasLightbox = lightboxIndex >= 0 && lightboxIndex < visibleGalleryImages.length;
  const titleForAlt = String(product?.title || product?.name || 'Product').trim() || 'Product';

  useEffect(() => {
    setFailedImages([]);
    setLightboxIndex(-1);
  }, [galleryImages]);

  useEffect(() => {
    if (!hasLightbox) return undefined;

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        setLightboxIndex(-1);
        return;
      }
      if (event.key === 'ArrowLeft' && visibleGalleryImages.length > 1) {
        setLightboxIndex((current) => (current - 1 + visibleGalleryImages.length) % visibleGalleryImages.length);
      }
      if (event.key === 'ArrowRight' && visibleGalleryImages.length > 1) {
        setLightboxIndex((current) => (current + 1) % visibleGalleryImages.length);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [hasLightbox, visibleGalleryImages.length]);

  const handleGalleryImageError = (image) => {
    setFailedImages((current) => (current.includes(image) ? current : [...current, image]));
  };

  const openLightbox = (index) => {
    setLightboxIndex(index);
  };

  const closeLightbox = () => {
    setLightboxIndex(-1);
  };

  const showPrevious = () => {
    setLightboxIndex((current) => (current - 1 + visibleGalleryImages.length) % visibleGalleryImages.length);
  };

  const showNext = () => {
    setLightboxIndex((current) => (current + 1) % visibleGalleryImages.length);
  };

  if (!hasGallery && !hasVideo) {
    return null;
  }

  return (
    <section className="pb-16">
      <div className="page-shell space-y-10">
        {hasGallery && (
          <div>
            <h2 className="mb-8 text-3xl font-bold tracking-tight">Product Gallery</h2>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {visibleGalleryImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => openLightbox(index)}
                  className="group relative overflow-hidden rounded-3xl border border-white/10 bg-[#090712] text-left shadow-[0_0_28px_rgba(0,0,0,0.28)] transition hover:border-purple-300/25 focus:outline-none focus:ring-2 focus:ring-violet-400/70"
                >
                  <OptimizedImage
                    src={image}
                    alt={`${titleForAlt} gallery image`}
                    width={420}
                    height={236}
                    className="product-gallery-image w-full cursor-pointer transition duration-300 group-hover:scale-[1.02]"
                    fallback=""
                    onError={() => handleGalleryImageError(image)}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {hasVideo && (
          <div>
            <h2 className="mb-8 text-3xl font-bold tracking-tight">Product Video</h2>
            <div className="overflow-hidden rounded-[22px] border border-purple-300/20 bg-black shadow-[0_0_45px_rgba(124,58,237,0.14)]">
              <SafeVideoEmbed
                videoType={product?.videoType === 'direct' ? 'video_file' : product?.videoType}
                videoUrl={productVideoUrl}
                title={`${product?.name || 'Asset'} video`}
                poster={product?.heroImage || galleryImages?.[0] || ''}
                className="w-full rounded-none"
              />
            </div>
          </div>
        )}
      </div>
      {hasLightbox && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/88 px-4 py-6 backdrop-blur-sm"
          onClick={closeLightbox}
          role="dialog"
          aria-modal="true"
          aria-label={`${titleForAlt} image viewer`}
        >
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-violet-400/70 sm:right-6 sm:top-6"
            aria-label="Close gallery"
          >
            <X size={22} />
          </button>

          {visibleGalleryImages.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                showPrevious();
              }}
              className="absolute left-3 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-violet-400/70 sm:left-6 sm:h-14 sm:w-14"
              aria-label="Previous image"
            >
              <ChevronLeft size={24} />
            </button>
          )}

          <div className="flex max-h-full max-w-full items-center justify-center" onClick={(event) => event.stopPropagation()}>
            <img
              src={visibleGalleryImages[lightboxIndex]}
              alt={`${titleForAlt} gallery image`}
              className="max-h-[88vh] max-w-[92vw] rounded-[28px] border border-white/10 bg-[#05030b] object-contain shadow-[0_24px_100px_rgba(0,0,0,0.55)]"
            />
          </div>

          {visibleGalleryImages.length > 1 && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                showNext();
              }}
              className="absolute right-3 top-1/2 inline-flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-violet-400/70 sm:right-6 sm:h-14 sm:w-14"
              aria-label="Next image"
            >
              <ChevronRight size={24} />
            </button>
          )}
        </div>
      )}
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
    <div className="mb-4 text-xs uppercase tracking-[0.35em] text-white/40">{title}</div>
    <div className={`flex h-[260px] flex-col justify-between rounded-3xl border p-6 text-white/70 ${
      accent
        ? 'border-fuchsia-300/30 bg-fuchsia-500/10'
        : 'border-purple-300/20 bg-purple-500/10'
    }`}
    >
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
