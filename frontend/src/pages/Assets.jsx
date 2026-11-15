import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Share2 } from 'lucide-react';
import '../styles/cinematic.css';
import CinematicTopbar from '../components/cinematic/CinematicTopbar';
import CinematicExperience from '../components/cinematic/CinematicExperience';
import CinematicContact from '../components/cinematic/CinematicContact';
import CinematicFooter from '../components/cinematic/CinematicFooter';
import CheckoutModal from '../components/CheckoutModal';
import { usePublicPageLoading } from '../components/PublicPageLoader';
import { useCmsPage } from '../hooks/useCmsPage';
import { useProducts } from '../hooks/useProducts';
import OptimizedImage from '../components/OptimizedImage';
import {
  FALLBACK_IMAGE,
  dedupeCatalogItems,
  getCatalogItemKey,
  handleImageError,
  safeImageSrc,
  shareProduct,
  toProductDescriptionPreview,
} from '../lib/utils';

const CATEGORIES = [
  { key: 'all', label: 'ALL ASSETS' },
  { key: 'camera', label: 'CAMERA SETTINGS' },
  { key: 'editing', label: 'EDITING ASSETS' },
];

const PRICE_FILTERS = [
  { key: 'all', label: 'ALL PRICES' },
  { key: 'free', label: 'FREE' },
  { key: 'paid', label: 'PAID' },
];

const getAssetCategory = (item, name) => {
  const rawCat = (item.category || '').trim();
  const rawSubcat = (item.subcategory || item.sub_category || '').trim();
  const source = `${rawCat} ${rawSubcat} ${name || ''} ${item.description || ''}`.toLowerCase();

  if (
    rawCat.toLowerCase().includes('camera') ||
    rawCat.toLowerCase().includes('setting') ||
    source.includes('camera setting') ||
    source.includes('camera') ||
    source.includes('picture profile')
  ) {
    return 'Camera Settings';
  }

  return 'Editing Assets';
};

const normalize = (item = {}, index) => {
  const numericPrice = Number(item.price ?? 0);
  const numericSalePrice = item.sale_price == null ? null : Number(item.sale_price);
  const price =
    Number.isFinite(numericSalePrice) && numericSalePrice >= 0
      ? numericSalePrice
      : Number.isFinite(numericPrice) && numericPrice >= 0
      ? numericPrice
      : 0;
  const original =
    Number.isFinite(numericPrice) &&
    Number.isFinite(numericSalePrice) &&
    numericPrice > numericSalePrice
      ? numericPrice
      : null;
  const name = item.name || item.title || 'Asset';
  const category = getAssetCategory(item, name);
  const subcategory = item.subcategory || item.sub_category || '';
  const slug = item.slug || item.id || `asset-${index}`;
  const heroImage = safeImageSrc(
    item.thumbnail_url ||
      item.image_url ||
      item.preview_image_url ||
      item.cover_image_url ||
      item.hero_image ||
      FALLBACK_IMAGE,
    FALLBACK_IMAGE
  );

  return {
    id: item.id || item._id,
    slug,
    name,
    title: name,
    category,
    subcategory,
    sale_price: Number.isFinite(numericSalePrice) ? numericSalePrice : undefined,
    price,
    original,
    isFree: price === 0 || Boolean(item.is_free),
    isPaid: price > 0 && !item.is_free,
    createdAt: item.created_at || new Date().toISOString(),
    image: heroImage,
    badge: price === 0 || item.is_free ? 'FREE' : 'PRO ASSET',
    description: toProductDescriptionPreview(item.short_description || item.description || ''),
  };
};

const Assets = () => {
  const navigate = useNavigate();
  const { page: cmsPage } = useCmsPage('assets');
  const { products: rawProducts, loading, error: loadError, refetch } = useProducts();

  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceFilter, setPriceFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [checkoutProduct, setCheckoutProduct] = useState(null);

  const products = useMemo(() => {
    if (!Array.isArray(rawProducts)) return [];
    return dedupeCatalogItems(rawProducts.filter(Boolean)).map((p, idx) => normalize(p, idx));
  }, [rawProducts]);

  usePublicPageLoading(loading && products.length === 0);

  const filteredAssets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return products
      .filter((asset) => {
        const matchesCategory =
          selectedCategory === 'all' ||
          (selectedCategory === 'camera' && asset.category === 'Camera Settings') ||
          (selectedCategory === 'editing' && asset.category === 'Editing Assets');

        const matchesSearch =
          !normalizedQuery ||
          asset.title.toLowerCase().includes(normalizedQuery) ||
          asset.description.toLowerCase().includes(normalizedQuery);

        const matchesPrice =
          priceFilter === 'all' ||
          (priceFilter === 'free' && asset.isFree) ||
          (priceFilter === 'paid' && asset.isPaid);

        return matchesCategory && matchesSearch && matchesPrice;
      })
      .sort((a, b) => {
        if (sortOrder === 'newest') {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        return new Date(a.createdAt) - new Date(b.createdAt);
      });
  }, [products, query, selectedCategory, priceFilter, sortOrder]);

  return (
    <div className="cinematic-site">
      <CinematicTopbar />

      <main id="main-content">
        <section className="work" id="assets-store">
          <div className="intro">
            <p className="eyebrow">DIGITAL ASSETS &amp; TOOLS</p>
            <h1>Creative Assets</h1>
            <p className="lede">
              {cmsPage?.subtitle ||
                'Premium LUTs, sound packs, camera settings, and video editing tools crafted for filmmakers and creators.'}
            </p>
            <p className="hint">Instant digital download with one-click secure checkout.</p>
          </div>

          {/* Category filter pills */}
          <div aria-label="Filter assets by category" className="filters" role="group">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                className={selectedCategory === c.key ? 'active' : ''}
                aria-pressed={selectedCategory === c.key}
                onClick={() => setSelectedCategory(c.key)}
              >
                {c.label}
              </button>
            ))}

            <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {PRICE_FILTERS.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  className={priceFilter === p.key ? 'active' : ''}
                  aria-pressed={priceFilter === p.key}
                  onClick={() => setPriceFilter(p.key)}
                  style={{
                    fontSize: '9.5px',
                    padding: '8px 16px',
                    borderColor: priceFilter === p.key ? 'var(--accent)' : 'var(--line)',
                  }}
                >
                  {p.label}
                </button>
              ))}

              <button
                type="button"
                onClick={() => setSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
                style={{
                  fontSize: '9.5px',
                  padding: '8px 16px',
                  borderColor: 'var(--line)',
                }}
              >
                {sortOrder === 'newest' ? 'SORT: NEWEST ↓' : 'SORT: OLDEST ↑'}
              </button>
            </div>
          </div>

          {/* Search bar */}
          <div style={{ marginBottom: '36px' }}>
            <div className="asset-search-wrapper">
              <Search size={15} className="asset-search-icon" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search camera settings, LUTs, sound packs..."
                className="asset-search-input"
              />
            </div>
          </div>

          {/* Product grid / states */}
          {loading && products.length === 0 ? (
            <div className="asset-grid">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    height: '380px',
                    background: '#141312',
                    borderRadius: '6px',
                    border: '1px solid var(--line)',
                    animation: 'pulse 1.8s infinite',
                  }}
                />
              ))}
            </div>
          ) : loadError && products.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '60px 20px',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                background: '#141312',
              }}
            >
              <p style={{ color: 'var(--muted)', marginBottom: '16px' }}>
                We could not reach the asset catalogue.
              </p>
              <button
                type="button"
                className="pill"
                onClick={() => refetch()}
              >
                RETRY NOW
              </button>
            </div>
          ) : filteredAssets.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: '70px 20px',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                background: '#141312',
              }}
            >
              <h3 style={{ fontFamily: 'Georgia, serif', fontSize: '24px', marginBottom: '8px' }}>
                No assets found
              </h3>
              <p style={{ color: 'var(--muted)', marginBottom: '22px' }}>
                Try changing your search query or filters.
              </p>
              <button
                type="button"
                className="pill"
                onClick={() => {
                  setQuery('');
                  setSelectedCategory('all');
                  setPriceFilter('all');
                }}
              >
                RESET FILTERS
              </button>
            </div>
          ) : (
            <div className="asset-grid">
              {filteredAssets.map((p, index) => (
                <div
                  key={getCatalogItemKey(p, index)}
                  className="asset-card"
                  onClick={() => navigate(`/assets/${p.slug}`)}
                >
                  <div className="asset-card-thumb">
                    <OptimizedImage
                      src={p.image}
                      alt={p.title}
                      width={600}
                      height={400}
                      fit="cover"
                      fallback={FALLBACK_IMAGE}
                      onError={handleImageError}
                    />

                    <span className={`asset-badge ${p.isFree ? 'free' : ''}`}>
                      {p.badge}
                    </span>

                    <button
                      type="button"
                      className="asset-share-btn"
                      aria-label={`Share ${p.title}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        shareProduct(p);
                      }}
                    >
                      <Share2 size={13} />
                    </button>
                  </div>

                  <div className="asset-card-body">
                    <span className="asset-card-category">{p.category}</span>
                    <h3 className="asset-card-title">{p.title}</h3>
                    {p.description && <p className="asset-card-desc">{p.description}</p>}

                    <div className="asset-card-footer">
                      <div>
                        {p.original && (
                          <span className="asset-price-original">
                            ₹{p.original.toLocaleString('en-IN')}
                          </span>
                        )}
                        <span className="asset-price">
                          {p.isFree ? 'Free' : `₹${p.price.toLocaleString('en-IN')}`}
                        </span>
                      </div>

                      <button
                        type="button"
                        className={`asset-action-btn ${p.isFree ? 'free' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setCheckoutProduct(p);
                        }}
                      >
                        {p.isFree ? 'GET FREE ↘' : 'BUY NOW ↗'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p aria-live="polite" className="sr-only">
            Showing {filteredAssets.length} assets
          </p>
        </section>

        <CinematicExperience />
        <CinematicContact />
      </main>

      <CinematicFooter />

      {/* Preserve existing CheckoutModal with Razorpay & Free Order flow */}
      <CheckoutModal
        product={checkoutProduct}
        open={Boolean(checkoutProduct)}
        onClose={() => setCheckoutProduct(null)}
        onSuccess={(result) => {
          setCheckoutProduct(null);
          const params = new URLSearchParams({
            orderId: result.orderId || '',
            paymentId: result.paymentId || '',
            token: result.downloadToken || '',
            product: result.productSlug || checkoutProduct?.slug || '',
          });
          navigate(`/payment-success?${params.toString()}`);
        }}
        onFailure={(message, result) => {
          if (result?.failed && checkoutProduct?.slug) {
            const params = new URLSearchParams({
              product: checkoutProduct.slug,
              message: message || '',
              orderId: result.orderId || '',
            });
            navigate(`/payment-failed?${params.toString()}`);
          }
        }}
      />
    </div>
  );
};

export default Assets;
