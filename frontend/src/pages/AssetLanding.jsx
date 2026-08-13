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
import ViewportGate from '../components/ViewportGate';
import { trackViewContent } from '../utils/metaPixel';

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

const SFX_PACK_DETAILS = {
  description: 'A focused sound-effects library for editors who want faster timelines and stronger cinematic impact. Browse, preview, and drag professionally organized sounds into commercials, wedding films, reels, trailers, YouTube videos, and client projects.',
  features: [
    'Drag-and-drop workflow with clearly named files for fast searching and previewing.',
    'Organized folders for transitions, impacts, whooshes, risers, ambience, and cinematic accents.',
    'High-quality audio files prepared for modern editing and post-production workflows.',
    'Works offline after download, so the complete library stays available wherever you edit.',
  ],
  benefits: [
    'Creator-ready files checked and organized before delivery.',
    'Fast digital delivery immediately after successful access confirmation.',
    'Lifetime access to the downloaded pack—no recurring subscription required.',
    'Suitable for personal and commercial edits under the included product license.',
  ],
  compatibility: ['Premiere Pro', 'After Effects', 'DaVinci Resolve', 'Final Cut Pro', 'Windows', 'macOS'],
  installationSteps: [
    { title: 'Download the SFX Pack', description: 'Complete checkout and use the secure download link to save the latest pack to your device.' },
    { title: 'Extract the Files', description: 'Open the downloaded ZIP file and extract it to a permanent folder on your internal or external drive.' },
    { title: 'Import Into Your Editor', description: 'Open your editing application and import the required category folder or individual sound files into the project.' },
    { title: 'Preview, Place, and Mix', description: 'Preview sounds, drag the best option onto the timeline, then adjust timing, volume, fades, and effects for your edit.' },
  ],
  faqs: [
    { q: 'Which editing applications support this SFX pack?', a: 'The audio files work with major editors that can import standard audio formats, including Premiere Pro, After Effects, DaVinci Resolve, and Final Cut Pro.' },
    { q: 'Does the pack work on Windows and macOS?', a: 'Yes. The delivered audio files are platform-independent and can be used on both Windows and macOS.' },
    { q: 'Is this a one-time purchase?', a: 'Yes. This product uses a one-time checkout and does not require a recurring subscription.' },
    { q: 'Can I use the sounds for commercial projects?', a: 'Yes. You may use the sounds in completed personal and commercial creative projects under the included license.' },
    { q: 'Can I resell or redistribute the original files?', a: 'No. You may include the sounds in completed edits, but you may not resell, share, upload, or redistribute the source library.' },
    { q: 'How do I install the pack?', a: 'No plugin installation is required. Download and extract the ZIP, then import the audio files directly into your editing software.' },
    { q: 'Does the pack require an internet connection?', a: 'Internet access is required for checkout and download. After the files are saved locally, they can be used offline.' },
    { q: 'How will I receive the files?', a: 'The files are delivered digitally through the secure access flow after checkout or free-access confirmation.' },
    { q: 'Can I preview sounds before using them?', a: 'Yes. Use your operating system, media browser, or editor to preview individual files before placing them on the timeline.' },
    { q: 'Are the files ready for drag and drop?', a: 'Yes. Import the files or folders into your project, then drag the selected sound directly onto an audio track.' },
    { q: 'Can I use the pack for YouTube and social media?', a: 'Yes. The library is suitable for completed videos published on YouTube, Instagram, and other social platforms.' },
    { q: 'Can I use the pack for wedding and commercial films?', a: 'Yes. It is designed for wedding films, advertisements, reels, trailers, branded content, and other edited productions.' },
    { q: 'Do I need additional software?', a: 'No dedicated extension is required. You only need software capable of importing and editing standard audio files.' },
    { q: 'Where should I store the pack?', a: 'Keep the extracted library in a permanent, backed-up folder so your editing projects can continue locating the source files.' },
    { q: 'What if I have trouble downloading the pack?', a: 'Use the contact or support option on the website and include your order details so the delivery can be checked.' },
  ],
};

const DEFAULT_PRODUCT_DETAILS = {
  description: 'Unlock a collection of premium creative assets designed to make your content stand out. Get access to professionally crafted styles, high-quality effects, and ready-to-use digital assets for social media, posters, banners, promotions, and video edits.',
  features: [
    'Drag-and-drop workflow with organized files for fast timeline integration.',
    'High-resolution digital assets prepared for modern editing and post-production workflows.',
    'Universal compatibility across major editing applications on Mac & Windows.',
    'Works 100% offline after download—your pack stays ready whenever you create.',
  ],
  benefits: [
    'Creator-ready files checked and organized before delivery.',
    'Instant digital delivery immediately after successful checkout.',
    'Lifetime access to the downloaded pack—no recurring subscription required.',
    'Suitable for personal and commercial projects under the included product license.',
  ],
  compatibility: ['Premiere Pro', 'After Effects', 'DaVinci Resolve', 'Final Cut Pro', 'Photoshop', 'Windows', 'macOS'],
  installationSteps: [
    { title: 'Download the Pack', description: 'Complete checkout and use the secure download link to save the asset pack to your device.' },
    { title: 'Extract the Files', description: 'Open the downloaded ZIP archive and extract it to a permanent folder on your drive.' },
    { title: 'Import Into Your Editor', description: 'Open your editing application and import the asset files, styles, or presets into your project.' },
    { title: 'Apply, Preview, and Customize', description: 'Drag and drop assets onto your timeline or canvas, then adjust timing, colors, and settings for your edit.' },
  ],
  faqs: [
    { q: 'Which editing applications support this asset pack?', a: 'The files work with major creative applications that support standard digital assets, including Premiere Pro, After Effects, DaVinci Resolve, Final Cut Pro, and Photoshop.' },
    { q: 'Does the pack work on Windows and macOS?', a: 'Yes. The delivered files are cross-platform and can be used on both Windows and macOS.' },
    { q: 'Is this a one-time purchase?', a: 'Yes. This product uses a one-time checkout and does not require a recurring subscription.' },
    { q: 'Can I use these assets for commercial projects?', a: 'Yes. You may use the assets in completed personal and commercial creative projects under the included license.' },
    { q: 'Can I resell or redistribute the original files?', a: 'No. You may include the assets in completed edits, but you may not resell, share, upload, or redistribute the source files.' },
    { q: 'How do I install the pack?', a: 'No complex plugin installation is required. Download and extract the ZIP, then import the files directly into your software.' },
    { q: 'Does the pack require an internet connection?', a: 'Internet access is required for checkout and download. After the files are saved locally, they can be used offline.' },
    { q: 'How will I receive the files?', a: 'The files are delivered digitally through the secure access flow immediately after checkout or free-access confirmation.' },
    { q: 'Can I use the pack for YouTube and social media?', a: 'Yes. The pack is designed for YouTube videos, Instagram Reels, TikTok, advertisements, and social media content.' },
    { q: 'What if I have trouble downloading the pack?', a: 'Use the contact or support option on the website and include your order details so your access can be verified.' },
  ],
};

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
    product.thumbnail_url,
    product.preview_image_url,
    product.cover_image_url,
  ]);
  const mainImageUrl = mainImageCandidates[0] || '';
  const excludedGalleryImages = new Set(mainImageCandidates);
  [
    product.image_url,
    product.thumbnail_url,
    product.preview_image_url,
    product.cover_image_url,
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
  const slugLower = String(product.slug || '').trim().toLowerCase();
  const categoryLower = String(product.category || '').trim().toLowerCase();
  const isSfxPack = slugLower.includes('sfx') || slugLower.includes('sound') || categoryLower.includes('sound') || categoryLower.includes('sfx');
  const defaultDetails = isSfxPack ? SFX_PACK_DETAILS : DEFAULT_PRODUCT_DETAILS;

  const validFeatures = toStringList(product.features).filter((item) => item && item.trim().length > 12);
  const validBenefits = toStringList(product.benefits).filter((item) => item && item.trim().length > 12);
  const validCompatibility = toStringList(landing.compatibility).filter((item) => item && item.trim().length > 1);

  const faqs = dedupeFaqs([
    ...toFaqList(landing.faqs),
    ...toFaqList(product.faqs),
    ...defaultDetails.faqs,
  ]).slice(0, 24);

  return {
    raw: product,
    landing,
    name: String(product.name || product.title || (isSfxPack ? 'Cinematic SFX Pack' : 'Asset')).trim(),
    title: String(product.title || product.name || (isSfxPack ? 'Cinematic SFX Pack' : 'Asset')).trim(),
    slug: String(product.slug || '').trim(),
    description: String((product.description && product.description.trim().length > 20) ? product.description : defaultDetails.description).trim(),
    category: String(product.category || (isSfxPack ? 'Sound Effects' : 'Asset')).trim(),
    price: resolvedPrice,
    isFree: product.is_free === true || resolvedPrice === 0,
    heroImage,
    galleryImages,
    galleryLayout: product.gallery_layout === 'full' ? 'full' : 'grid',
    features: validFeatures.length >= 2 ? validFeatures : defaultDetails.features,
    benefits: validBenefits.length >= 2 ? validBenefits : defaultDetails.benefits,
    compatibility: validCompatibility.length >= 2 ? validCompatibility : defaultDetails.compatibility,
    installationSteps: Array.isArray(landing.installation_steps) && landing.installation_steps.length >= 2
      ? landing.installation_steps
      : defaultDetails.installationSteps,
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
  const viewedProductIds = useRef(new Set());
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
    installationSteps,
    marketTable,
    faqs,
    beforeImageUrl,
    afterImageUrl,
  } = asset;

  useEffect(() => {
    const productId = product?.id ?? product?.slug;
    if (!productId || viewedProductIds.current.has(productId)) return;
    viewedProductIds.current.add(productId);
    trackViewContent(product);
  }, [product]);

  const slugLower = String(asset.slug || '').trim().toLowerCase();
  const categoryLower = String(category || '').trim().toLowerCase();
  const isSfxPack = slugLower.includes('sfx') || slugLower.includes('sound') || categoryLower.includes('sound') || categoryLower.includes('sfx');

  const heroHeadline = String(landing.hero?.headline || landing.headline || name || (isSfxPack ? 'Cinematic SFX Pack for Editors' : 'Asset')).trim();
  const heroSubhead = String(landing.hero?.subhead || landing.subhead || description || (isSfxPack ? SFX_PACK_DETAILS.description : DEFAULT_PRODUCT_DETAILS.description)).trim();
  const fullProductDescription = String(
    (product?.description && product.description.trim().length > 20)
      ? product.description
      : (landing.description || (isSfxPack ? SFX_PACK_DETAILS.description : heroSubhead))
  ).trim();
  const beforeAfterDescription = String(landing.before_after || '').trim();
  const fileInformation = isSfxPack ? [
    { label: 'Compatibility', value: 'Windows & macOS' },
    { label: 'Software', value: 'Premiere Pro, DaVinci Resolve, AE, Final Cut' },
    { label: 'Format', value: '24-bit 48kHz WAV audio files' },
    { label: 'Delivery', value: isFree ? 'Instant free access' : 'Instant digital download' },
    { label: 'License', value: 'Lifetime Personal & Commercial License' },
  ] : [
    { label: 'Category', value: category },
    { label: 'Compatibility', value: compatibility.length ? compatibility.join(', ') : 'Universal (Windows & macOS)' },
    { label: 'Delivery', value: isFree ? 'Instant free access' : 'Instant digital delivery' },
    { label: 'License', value: 'Lifetime Personal & Commercial License' },
  ];

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
      <main className="page min-h-screen bg-transparent text-white">
        {loading ? (
          <section className="px-6 pb-16 pt-32 md:pt-36">
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
            <section className="section-block pb-12 pt-28 md:pt-32">
              <div className="page-shell">
                <nav className="mb-7 flex flex-wrap items-center gap-2 text-xs text-white/45" data-testid="asset-breadcrumb">
                  <Link to="/" className="hover:text-white">Home</Link>
                  <ChevronRight size={14} />
                  <Link to="/assets" className="hover:text-white">Assets</Link>
                  <ChevronRight size={14} />
                  <span className="text-white/85">{name}</span>
                </nav>

                <div className="mb-7">
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ff5a1f]/35 bg-[#ff5a1f]/10 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ff8a5c]">
                    <Sparkles size={13} /> {category}
                  </div>
                  <h1 className="max-w-4xl text-3xl font-black tracking-[-0.035em] text-white sm:text-4xl lg:text-5xl" data-testid="asset-title">
                    {heroHeadline}
                  </h1>
                </div>

                <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] xl:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
                  <div className="min-w-0 space-y-6">
                    <ProductHeroImage heroImage={heroImage} name={name} />
                    <ProductDescription value={heroSubhead} className="space-y-4 text-sm leading-7 text-white/60 sm:text-base" />
                    <FileInformation rows={fileInformation} />
                  </div>

                  <div className="lg:sticky lg:top-[7rem]">
                    <PriceCard
                      price={price}
                      isFree={isFree}
                      busy={busy}
                      product={product}
                      onPrimaryCta={onPrimaryCta}
                      onShare={onShare}
                    />
                  </div>
                </div>
              </div>
            </section>

            {fullProductDescription && (
              <section className="pb-14">
                <div className="page-shell">
                  <div className="rounded-2xl border border-white/10 bg-[#090a0c] p-6 sm:p-8">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#ff8a5c]">About this asset</p>
                    <h2 className="mt-3 text-2xl font-bold tracking-tight text-white sm:text-3xl">Description</h2>
                    <ProductDescription
                      value={fullProductDescription}
                      className="mt-5 max-w-5xl space-y-4 text-sm leading-7 text-white/62 sm:text-base sm:leading-8"
                    />
                    <div className="mt-6 flex flex-wrap gap-2">
                      {['Video Editing', 'Wedding Films', 'Commercials', 'Reels', 'YouTube', 'Gaming', 'Promotions'].map((useCase) => (
                        <span key={useCase} className="rounded-full border border-white/10 bg-black/35 px-3 py-1.5 text-xs text-white/55">
                          {useCase}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>
            )}

            <ViewportGate
              rootMargin="360px 0px"
              fallback={<section className="pb-16" aria-hidden="true"><div className="page-shell"><div className="h-72 animate-pulse rounded-[22px] border border-white/10 bg-white/[0.04]" /></div></section>}
            >
              <ProductMediaSection product={asset} galleryImages={galleryImages} />
            </ViewportGate>

            {features.length > 0 && (
              <section className="section-block pt-0">
                <div className="page-shell">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#ff8a5c]">Included with your asset</p>
                  <h2 className="mb-8 text-3xl font-bold tracking-tight">Engineered for a faster workflow</h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {features.map((item) => (
                      <div key={item} className="rounded-2xl border border-white/10 bg-[#090a0c] p-6 text-sm text-white/65 transition hover:border-[#1683ff]/35">
                        <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#ff5a1f]/25 bg-[#ff5a1f]/10 text-[#ff8a5c]">
                          <CheckCircle size={18} />
                        </div>
                        <p className="font-semibold text-white">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {installationSteps.length > 0 && (
              <section className="section-block pt-0">
                <div className="page-shell">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#69adff]">Simple setup</p>
                  <h2 className="mb-8 text-3xl font-bold tracking-tight">Installation and usage guide</h2>
                  <div className="relative space-y-4 before:absolute before:bottom-7 before:left-[1.15rem] before:top-7 before:w-px before:bg-gradient-to-b before:from-[#ff5a1f] before:via-[#ff5a1f]/35 before:to-transparent">
                    {installationSteps.map((step, index) => {
                      const normalizedStep = typeof step === 'string' ? { title: step, description: '' } : step;
                      return (
                        <div key={`${normalizedStep.title || 'step'}-${index}`} className="relative grid grid-cols-[2.4rem_minmax(0,1fr)] gap-4">
                          <span className="relative z-10 flex h-9 w-9 items-center justify-center rounded-full border border-[#ff5a1f]/50 bg-black text-xs font-bold text-[#ff8a5c]">
                            {index + 1}
                          </span>
                          <div className="rounded-2xl border border-white/10 bg-[#090a0c] p-5 sm:p-6">
                            <h3 className="font-semibold text-white">{normalizedStep.title || `Step ${index + 1}`}</h3>
                            {normalizedStep.description && <p className="mt-2 text-sm leading-6 text-white/55">{normalizedStep.description}</p>}
                          </div>
                        </div>
                      );
                    })}
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
                      <ShieldCheck size={16} /> Why download from PranvithDOP
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
                <div className="mx-auto max-w-7xl">
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
                      <thead className="border-b border-purple-300/15 bg-[var(--bg-elevated)] text-white/85">
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
                  <div className="grid gap-2">
                    {faqs.map((item, index) => (
                      <details key={item.q || `${item.a}-${index}`} className="group rounded-xl border border-white/10 bg-[#090a0c] px-5 py-4 open:border-[#ff5a1f]/30">
                        <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-semibold text-white">
                          {item.q || 'Question'}
                          <span className="text-lg text-[#ff8a5c] transition-transform group-open:rotate-45">+</span>
                        </summary>
                        <p className="mt-4 border-t border-white/8 pt-4 text-sm leading-relaxed text-white/60">{item.a || 'Answer coming soon.'}</p>
                      </details>
                    ))}
                  </div>
                </div>
              </section>
            )}

            <section className="section-block pt-0">
              <div className="page-shell max-w-5xl">
                <div className="rounded-2xl border border-white/15 bg-[linear-gradient(110deg,rgba(255,77,0,.16),rgba(12,14,19,.5)_48%,rgba(8,119,255,.18))] p-7 text-center shadow-[0_22px_70px_rgba(0,0,0,.18)] backdrop-blur-xl sm:p-10">
                  <span className="mb-6 inline-flex items-center justify-center rounded-full border border-purple-300/20 bg-purple-500/15 px-4 py-2 text-xs uppercase tracking-[0.35em] text-purple-200">
                    Get Instant Access
                  </span>
                  <h2 className="mx-auto max-w-3xl text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl">
                    {isFree ? `Claim ${name}` : `Get ${name} today`}
                  </h2>
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

const FileInformation = ({ rows }) => (
  <section className="rounded-2xl border border-white/10 bg-[#090a0c] p-5 shadow-[0_18px_55px_rgba(0,0,0,.24)] sm:p-7">
    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#69adff]">Product specifications</p>
    <h2 className="mt-3 text-2xl font-bold tracking-tight text-white">File Information</h2>
    <dl className="mt-6 grid gap-3">
      {rows.map((row) => (
        <div key={row.label} className="grid gap-2 rounded-xl border border-white/10 bg-black/30 px-4 py-4 sm:grid-cols-[11rem_minmax(0,1fr)] sm:items-center sm:px-5">
          <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-white/42">{row.label}</dt>
          <dd className="text-sm font-semibold leading-6 text-white sm:text-right sm:text-base">{row.value}</dd>
        </div>
      ))}
    </dl>
  </section>
);

const ProductHeroImage = ({ heroImage, name }) => (
  <div className="product-hero-image-wrap flex items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-[#090a0c] shadow-[0_22px_70px_rgba(0,0,0,0.35)]">
    {heroImage ? (
      <OptimizedImage
        src={heroImage}
        alt={name}
        priority
        width={1080}
        height={720}
        fit="contain"
        className="product-hero-image block h-auto w-full max-h-[80vh] object-contain"
        data-testid="asset-hero-image"
        onError={handleImageError}
      />
    ) : (
      <div className="flex min-h-[18rem] w-full items-center justify-center rounded-[inherit] bg-[radial-gradient(circle_at_20%_80%,rgba(255,77,0,.35),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(8,119,255,.42),transparent_42%),#08090b] px-6 py-10 text-center text-3xl font-black text-white sm:min-h-[28rem]">
        {name}
      </div>
    )}
  </div>
);

const PriceCard = ({ price, isFree, busy, product, onPrimaryCta, onShare, className = '' }) => (
  <aside className={`overflow-hidden rounded-2xl border border-white/12 bg-[#090a0c] p-5 shadow-[0_24px_70px_rgba(0,0,0,.38)] ${className}`.trim()}>
    <p className="text-[11px] uppercase tracking-[0.3em] text-white/45">
      {price == null ? 'Price status' : isFree ? 'Price' : 'One-time price'}
    </p>
    <p className="mt-3 text-3xl font-extrabold text-white sm:text-4xl" data-testid="asset-price">
      {price == null ? 'Price unavailable' : isFree ? 'Free' : `Rs ${price.toLocaleString('en-IN')}`}
    </p>
    <div className="mt-4 grid gap-3">
      <button
        onClick={onPrimaryCta}
        disabled={busy || !product}
        data-testid="asset-buy-now"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#ff6a2f] bg-[#ff4d00] px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-white shadow-[0_10px_28px_rgba(255,77,0,.22)] transition hover:bg-[#ff6a2f] disabled:opacity-60"
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
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.03] px-6 py-3.5 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:border-[#1683ff]/45 hover:bg-[#1683ff]/10"
      >
        <Share2 size={17} /> Share
      </button>
    </div>
    <div className="mt-5 space-y-3 border-t border-white/10 pt-5 text-xs text-white/55">
      <p className="flex items-center gap-2"><ShieldCheck size={14} className="text-[#ff8a5c]" /> Secure one-time checkout</p>
      <p className="flex items-center gap-2"><Download size={14} className="text-[#69adff]" /> Instant digital delivery</p>
      <p className="flex items-center gap-2"><CheckCircle size={14} className="text-[#69adff]" /> Personal and commercial projects</p>
    </div>
  </aside>
);

const ProductMediaSection = ({ product, galleryImages }) => {
  const [failedImages, setFailedImages] = useState([]);
  const [lightboxIndex, setLightboxIndex] = useState(-1);
  const galleryLayout = product?.galleryLayout === 'full' ? 'full' : 'grid';
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
    <section className="product-gallery-section w-full max-w-full overflow-hidden px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-7xl space-y-10">
        {hasGallery && (
          <div>
            <h2 className="mb-8 text-3xl font-bold tracking-tight">Product Gallery</h2>
            <div className={`w-full ${galleryLayout === 'full' ? 'space-y-6 md:space-y-8' : 'grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3'}`}>
              {visibleGalleryImages.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => openLightbox(index)}
                  className={
                    galleryLayout === 'full'
                      ? 'group relative block overflow-hidden rounded-3xl border border-white/15 bg-[var(--bg-card)] text-left shadow-[0_0_28px_rgba(0,0,0,0.28)] transition hover:border-purple-300/25 focus:outline-none focus:ring-2 focus:ring-violet-400/70'
                      : 'group relative overflow-hidden rounded-3xl border border-white/10 bg-[var(--bg-card)] text-left shadow-[0_0_28px_rgba(0,0,0,0.28)] transition hover:border-purple-300/25 focus:outline-none focus:ring-2 focus:ring-violet-400/70'
                  }
                >
                  <OptimizedImage
                    src={image}
                    alt={`${titleForAlt} gallery image`}
                    width={galleryLayout === 'full' ? 1440 : 420}
                    height={galleryLayout === 'full' ? 1080 : 236}
                    fit="contain"
                    className={`block w-full overflow-hidden ${
                      galleryLayout === 'full'
                        ? 'cursor-pointer rounded-3xl object-contain transition duration-300 group-hover:scale-[1.01]'
                        : 'product-gallery-image cursor-pointer transition duration-300 group-hover:scale-[1.02]'
                    }`}
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
            <div className="overflow-hidden rounded-[22px] border border-purple-300/20 bg-black shadow-[0_0_45px_rgba(8,119,255,0.16)]">
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
      className="relative mx-auto aspect-video max-w-5xl overflow-hidden rounded-[22px] border border-purple-300/20 bg-black shadow-[0_0_45px_rgba(8,119,255,0.16)]"
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
