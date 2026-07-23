import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ChevronDown, Filter, Search, Share2 } from 'lucide-react';
import { fetchProducts } from '../lib/api';
import { FALLBACK_IMAGE, dedupeCatalogItems, getCatalogItemKey, handleImageError, safeImageSrc, shareProduct, toProductDescriptionPreview } from '../lib/utils';
import CheckoutModal from '../components/CheckoutModal';
import { usePublicPageLoading } from '../components/PublicPageLoader';
import { useCmsPage } from '../hooks/useCmsPage';
import OptimizedImage from '../components/OptimizedImage';

const defaultBackgrounds = [
  'linear-gradient(135deg, #2e1065 0%, #1a102d 60%, #05000d 100%)',
  'linear-gradient(135deg, #171025 0%, #0b0318 100%)',
  'linear-gradient(135deg, #6d28d9 0%, #a78bfa 60%, #1a102d 100%)',
  'linear-gradient(135deg, #120d1d 0%, #2e1065 60%, #05000d 100%)',
  'linear-gradient(135deg, #4c1d95 0%, #2e1065 60%, #0a0418 100%)',
  'linear-gradient(135deg, #7c3aed 0%, #1a102d 60%, #05000d 100%)',
  'linear-gradient(135deg, #581c87 0%, #4c1d95 100%)',
  'linear-gradient(135deg, #a78bfa 0%, #4c1d95 100%)',
];

const findSection = (sections = [], idOrType) =>
  sections.find((section) => section.section_id === idOrType)
  || sections.find((section) => section.type === idOrType);

const normalize = (item = {}, index) => {
  const numericPrice = Number(item.price ?? 0);
  const numericSalePrice = item.sale_price == null ? null : Number(item.sale_price);
  const price = Number.isFinite(numericSalePrice) && numericSalePrice >= 0
    ? numericSalePrice
    : (Number.isFinite(numericPrice) && numericPrice >= 0 ? numericPrice : 0);
  const original = Number.isFinite(numericPrice) && Number.isFinite(numericSalePrice) && numericPrice > numericSalePrice ? numericPrice : null;
  const name = item.name || item.title || 'Asset';
  const category = item.category || 'Asset';
  const slug = item.slug || item.id || `asset-${index}`;
  const heroImage = safeImageSrc(
    item.thumbnail_url
    || item.image_url
    || item.preview_image_url
    || item.cover_image_url
    || item.hero_image
    || FALLBACK_IMAGE,
    FALLBACK_IMAGE
  );
  const word = name.toUpperCase();
  const parts = word.split(' ');
  const headline = parts.slice(0, 2).join(' ') || word;
  const subhead = parts.slice(2).join(' ') || category.toUpperCase();
  return {
    id: item.id,
    slug,
    name,
    title: name,
    category,
    sale_price: Number.isFinite(numericSalePrice) ? numericSalePrice : undefined,
    price,
    original,
    isFree: price === 0 || item.is_free,
    isPaid: price > 0 && !item.is_free,
    createdAt: item.created_at || new Date().toISOString(),
    bg: defaultBackgrounds[index % defaultBackgrounds.length],
    image: heroImage,
    headline,
    subhead,
    badge: price === 0 || item.is_free ? 'FREE' : 'SALE!',
    description: toProductDescriptionPreview(item.short_description || item.description || ''),
  };
};

const Assets = () => {
  const navigate = useNavigate();
  const { page: cmsPage, loading: cmsLoading } = useCmsPage('assets');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [priceFilter, setPriceFilter] = useState('all');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [retryNonce, setRetryNonce] = useState(0);
  const retryTimer = useRef(null);
  const [checkoutProduct, setCheckoutProduct] = useState(null);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const mobileFilterRef = useRef(null);
  usePublicPageLoading(cmsLoading || loading);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const data = await fetchProducts();
        if (!active) return;
        if (Array.isArray(data)) {
          setProducts(dedupeCatalogItems(data.filter(Boolean)).map((p, idx) => normalize(p, idx)));
          setLoadError(false);
        } else {
          console.error('[assets] Expected /products to return an array', { received: data });
          setLoadError(true);
        }
      } catch (e) {
        if (!active) return;
        console.error('[assets] Product catalog failed to load', {
          status: e?.response?.status,
          detail: e?.response?.data?.detail || e?.message || e,
        });
        setLoadError(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [retryNonce]);

  useEffect(() => () => {
    if (retryTimer.current) window.clearTimeout(retryTimer.current);
  }, []);

  useEffect(() => {
    if (!loadError || retryNonce > 0 || !navigator.onLine) return undefined;
    retryTimer.current = window.setTimeout(() => setRetryNonce(1), 3000);
    return () => window.clearTimeout(retryTimer.current);
  }, [loadError, retryNonce]);

  const filtered = useMemo(() => {
    let list = [...products];
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((p) => p.title.toLowerCase().includes(q));
    }
    if (priceFilter === 'free') list = list.filter((p) => p.isFree);
    if (priceFilter === 'paid') list = list.filter((p) => p.isPaid);
    list.sort((a, b) =>
      sort === 'newest'
        ? new Date(b.createdAt) - new Date(a.createdAt)
        : new Date(a.createdAt) - new Date(b.createdAt)
    );
    return list;
  }, [products, query, sort, priceFilter]);
  const settings = cmsPage?.settings || {};
  const pageHidden = cmsPage?.status === 'hidden';
  const showProductListing = !pageHidden && settings.show_product_listing !== false;
  const showFilters = settings.show_filters !== false;
  const heroSection = findSection(cmsPage?.sections || [], 'hero');
  const activeFilterCount = (query.trim() ? 1 : 0) + (sort !== 'newest' ? 1 : 0) + (priceFilter !== 'all' ? 1 : 0);
  const mobileFilterPanelId = 'assets-mobile-filters';

  const closeMobileFilters = () => setIsMobileFilterOpen(false);

  const closeMobileFiltersIfNeeded = () => {
    if (window.matchMedia?.('(max-width: 1023px)').matches) closeMobileFilters();
  };

  useEffect(() => {
    if (!isMobileFilterOpen) return undefined;
    const closeOnOutside = (event) => {
      if (!mobileFilterRef.current?.contains(event.target)) closeMobileFilters();
    };
    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('touchstart', closeOnOutside, { passive: true });
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('touchstart', closeOnOutside);
    };
  }, [isMobileFilterOpen]);

  return (
    <>
      <Header />
      <main className="assets-page page min-h-screen bg-transparent text-white">
        {!pageHidden && heroSection?.section_id && (
          <section className="pb-8 pt-28 md:pt-32">
            <div className="site-container">
              <div className="cinematic-card rounded-[18px] px-5 py-6 sm:px-[34px] sm:py-7">
                <h1 className="max-w-3xl text-[28px] font-bold leading-[1.1] tracking-tight sm:text-[clamp(30px,2.3vw,38px)]" data-testid="assets-page-title">{heroSection?.title || cmsPage?.title || 'Creative Assets Store'}</h1>
                <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-white/65 sm:text-base">
                  {heroSection?.subtitle || heroSection?.description || cmsPage?.subtitle || 'Premium LUTs, sound packs, motion templates and more - built for editors.'}
                </p>
              </div>
            </div>
          </section>
        )}

        {showProductListing && <section className={`pb-20 ${heroSection?.section_id ? '' : 'pt-28 md:pt-32'}`}>
          <div className={`site-container grid min-w-0 grid-cols-1 gap-5 ${showFilters ? 'lg:grid-cols-[240px_minmax(0,1fr)]' : ''}`}>
            {showFilters && (
              <div ref={mobileFilterRef} className="lg:hidden">
                <button
                  type="button"
                  aria-expanded={isMobileFilterOpen}
                  aria-controls={mobileFilterPanelId}
                  onClick={() => setIsMobileFilterOpen((open) => !open)}
                  className="flex w-full items-center justify-between rounded-[18px] border border-purple-300/20 bg-[linear-gradient(145deg,rgba(23,16,37,0.96),rgba(13,8,24,0.98))] px-4 py-3 text-left shadow-[0_0_45px_rgba(124,58,237,0.12)] transition hover:border-purple-300/35"
                >
                  <span className="inline-flex items-center gap-3 text-sm font-semibold text-white">
                    <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-purple-300/20 bg-purple-500/15 text-[#c4b5fd]">
                      <Filter size={17} />
                    </span>
                    Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
                  </span>
                  <ChevronDown size={18} className={`text-[#c4b5fd] transition-transform duration-300 ${isMobileFilterOpen ? 'rotate-180' : ''}`} />
                </button>
                <div
                  id={mobileFilterPanelId}
                  className={`grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-300 ease-out ${
                    isMobileFilterOpen ? 'mt-3 grid-rows-[1fr] opacity-100' : 'mt-0 grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="min-h-0 overflow-hidden">
                    <div className="cinematic-card rounded-[18px] p-5">
                      <FilterContent
                        query={query}
                        setQuery={setQuery}
                        sort={sort}
                        setSort={setSort}
                        priceFilter={priceFilter}
                        setPriceFilter={setPriceFilter}
                        onOptionSelect={closeMobileFiltersIfNeeded}
                        inputTestId="assets-search-input-mobile"
                        radioNameSuffix="mobile"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {showFilters && (
              <aside className="cinematic-card hidden h-fit rounded-[18px] p-[22px] lg:sticky lg:top-28 lg:block">
                <FilterContent
                  query={query}
                  setQuery={setQuery}
                  sort={sort}
                  setSort={setSort}
                  priceFilter={priceFilter}
                  setPriceFilter={setPriceFilter}
                  inputTestId="assets-search-input"
                  radioNameSuffix="desktop"
                />
              </aside>
            )}

            <div className="min-w-0">
              {loading || cmsLoading ? (
                <div className="grid grid-cols-2 gap-3 min-[768px]:gap-5 min-[1100px]:grid-cols-3 min-[1440px]:grid-cols-4 max-[374px]:grid-cols-1" aria-hidden="true">
                  {Array.from({ length: 8 }).map((_, index) => (
                    <div key={index} className="cinematic-card aspect-[3/4] animate-pulse rounded-[18px]" />
                  ))}
                </div>
              ) : loadError ? (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-12 text-center text-white/70" data-testid="assets-error">
                  <p>{navigator.onLine ? 'We could not reach the asset catalogue. Retrying automatically…' : 'You appear to be offline. Reconnect, then try again.'}</p>
                  <button type="button" onClick={() => { setLoadError(false); setLoading(true); setRetryNonce((value) => value + 1); }} className="mt-5 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10">
                    Retry now
                  </button>
                </div>
              ) : filtered.length === 0 ? (
                <div className="cinematic-card p-12 text-center text-white/60" data-testid="assets-empty">
                  No assets match your filters.
                </div>
              ) : (
                <div className="grid grid-cols-2 items-stretch gap-3 min-[768px]:gap-5 min-[1100px]:grid-cols-3 min-[1440px]:grid-cols-4 max-[374px]:grid-cols-1" data-testid="assets-grid">
                  {filtered.map((p, index) => (
                    <ProductCard
                      key={getCatalogItemKey(p, index)}
                      p={p}
                      onView={() => navigate(`/assets/${p.slug}`)}
                      onBuy={() => setCheckoutProduct(p)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>}
      </main>
      <Footer />
      <CheckoutModal
        product={checkoutProduct}
        open={!!checkoutProduct}
        onClose={() => setCheckoutProduct(null)}
        onSuccess={(result) => {
          setCheckoutProduct(null);
          if (result.customerAccessToken) localStorage.setItem('customer_access_token', result.customerAccessToken);
          if (result.orderId) { navigate(`/account/orders/${encodeURIComponent(result.orderId)}`); return; }
          const params = new URLSearchParams({
            orderId: result.orderId || '',
            paymentId: result.paymentId || '',
            token: result.downloadToken || '',
            product: result.productSlug || checkoutProduct.slug,
          });
          navigate(`/payment-success?${params.toString()}`);
        }}
        onFailure={(message, result) => {
          if (result?.failed && checkoutProduct?.slug) {
            const params = new URLSearchParams({
              product: checkoutProduct.slug,
              message,
              orderId: result.orderId || '',
            });
            navigate(`/payment-failed?${params.toString()}`);
          }
        }}
      />
    </>
  );
};

const FilterContent = ({
  query,
  setQuery,
  sort,
  setSort,
  priceFilter,
  setPriceFilter,
  onOptionSelect,
  inputTestId,
  radioNameSuffix,
}) => {
  const setSortAndClose = (value) => {
    setSort(value);
    onOptionSelect?.();
  };

  const setPriceAndClose = (value) => {
    setPriceFilter(value);
    onOptionSelect?.();
  };

  return (
    <>
      <h3 className="section-eyebrow mb-4 text-[11px]">FILTERS</h3>

      <div className="relative mb-5">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search assets..."
          data-testid={inputTestId}
          className="h-11 w-full rounded-lg border border-purple-300/20 bg-purple-500/10 pl-9 pr-3 text-sm text-white placeholder:text-white/35 focus:border-purple-300/35 focus:outline-none"
        />
      </div>

      <div className="mb-5">
        <p className="mb-2 text-[13px] font-semibold text-white">Sort By</p>
        <RadioRow name={`sort-${radioNameSuffix}`} value="newest" checked={sort === 'newest'} onChange={() => setSortAndClose('newest')} label="Newest First" />
        <RadioRow name={`sort-${radioNameSuffix}`} value="oldest" checked={sort === 'oldest'} onChange={() => setSortAndClose('oldest')} label="Oldest First" />
      </div>

      <div>
        <p className="mb-2 text-[13px] font-semibold text-white">Price</p>
        <RadioRow name={`price-${radioNameSuffix}`} value="all" checked={priceFilter === 'all'} onChange={() => setPriceAndClose('all')} label="All" />
        <RadioRow name={`price-${radioNameSuffix}`} value="free" checked={priceFilter === 'free'} onChange={() => setPriceAndClose('free')} label="Free" />
        <RadioRow name={`price-${radioNameSuffix}`} value="paid" checked={priceFilter === 'paid'} onChange={() => setPriceAndClose('paid')} label="Paid" />
      </div>
    </>
  );
};

const RadioRow = ({ name, value, checked, onChange, label }) => (
  <label className="group flex cursor-pointer items-center gap-2.5 rounded-lg py-1.5 transition hover:bg-purple-500/10">
    <span className="relative inline-flex">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      <span className={`h-4 w-4 rounded-full border-2 transition ${checked ? 'border-purple-300' : 'border-purple-300/30 group-hover:border-purple-300/50'}`} />
      {checked && <span className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-accent-purple" />}
    </span>
    <span className={`text-[13px] ${checked ? 'text-white' : 'text-white/75'}`}>{label}</span>
  </label>
);

const ProductCard = ({ p, onView, onBuy }) => (
  <div
    onClick={onView}
    data-testid={`asset-card-${p.slug}`}
    className="cinematic-card group flex h-full min-w-0 cursor-pointer flex-col overflow-hidden rounded-[18px] transition-all duration-300 hover:-translate-y-1"
  >
    <div className="relative aspect-square h-auto w-full shrink-0 overflow-hidden bg-[#f4f0ea]">
      {p.image ? (
        <OptimizedImage src={p.image} alt={p.title} width={640} height={640} className="absolute inset-0 h-full w-full object-contain object-center" fallback={FALLBACK_IMAGE} onError={handleImageError} />
      ) : (
        <div className="absolute inset-0" style={{ background: p.bg }} />
      )}
      <div className="pointer-events-none absolute -inset-1 opacity-30" style={{
        background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)'
      }} />
      {!p.image && (
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-3xl font-black leading-tight tracking-tight text-white/90 drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)] md:text-4xl">
              {p.headline}
            </p>
            <p className="mt-2 text-lg font-bold tracking-wide text-white/85 drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)] md:text-xl">
              {p.subhead}
            </p>
          </div>
        </div>
      )}
      <span className={`absolute left-2.5 top-2.5 inline-flex h-7 items-center rounded-full px-2.5 text-[10px] font-bold tracking-wider sm:text-[11px] ${
        p.isFree ? 'bg-violet-500 text-white' : 'bg-rose-500 text-white'
      }`}>
        {p.badge}
      </span>
      <button
        type="button"
        aria-label={`Share ${p.title}`}
        onClick={(e) => {
          e.stopPropagation();
          shareProduct(p);
        }}
        className="absolute right-2.5 top-2.5 inline-flex h-9 w-9 items-center justify-center rounded-full border border-purple-300/20 bg-black/55 text-white/90 backdrop-blur transition hover:border-purple-300/35 hover:bg-purple-500/30"
      >
        <Share2 size={15} />
      </button>
    </div>
    <div className="flex flex-1 flex-col p-3 sm:p-4">
      <div className="mb-2 inline-flex w-fit rounded-full border border-purple-300/15 bg-purple-500/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#c4b5fd] sm:text-[11px]">
        {p.category}
      </div>
      <h3 className="line-clamp-2 text-[13px] font-semibold leading-[1.35] text-white sm:text-[17px]">{p.title}</h3>
      {p.description ? (
        <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-white/55 sm:text-[13px]">{p.description}</p>
      ) : (
        <div className="mt-2 h-10" />
      )}
      <div className="mb-4 mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2">
        {p.original && (
          <span className="text-xs text-white/40 line-through sm:text-[13px]">Rs {p.original.toLocaleString('en-IN')}.00</span>
        )}
        <span className="text-sm font-bold text-white sm:text-lg">
          {p.isFree ? 'Free' : `Rs ${p.price.toLocaleString('en-IN')}.00`}
        </span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); p.isFree ? onView() : onBuy(); }}
        data-testid={`view-asset-btn-${p.slug}`}
        className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-lg bg-violet-600 py-2 text-xs font-semibold text-white transition-colors hover:bg-violet-500 sm:text-[13px]"
      >
        {p.isFree ? 'Get Free' : 'Buy Now'}
      </button>
    </div>
  </div>
);

export default Assets;
