import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Search, Loader2 } from 'lucide-react';
import { fetchProducts } from '../lib/api';
import CheckoutModal from '../components/CheckoutModal';

const defaultBackgrounds = [
  'linear-gradient(135deg, #1e3a8a 0%, #0c1e4d 60%, #050b1f 100%)',
  'linear-gradient(135deg, #1f2937 0%, #0b1220 100%)',
  'linear-gradient(135deg, #6d28d9 0%, #ec4899 60%, #1e1b4b 100%)',
  'linear-gradient(135deg, #111827 0%, #1f2937 60%, #312e81 100%)',
  'linear-gradient(135deg, #b91c1c 0%, #7f1d1d 60%, #0a0418 100%)',
  'linear-gradient(135deg, #047857 0%, #134e4a 60%, #0a0418 100%)',
  'linear-gradient(135deg, #be185d 0%, #4c1d95 100%)',
  'linear-gradient(135deg, #0ea5e9 0%, #1e3a8a 100%)',
];

const normalize = (item, index) => {
  const price = item.sale_price ?? item.price ?? 0;
  const original = item.price && item.sale_price && item.price > item.sale_price ? item.price : null;
  const name = item.name || item.title || 'Asset';
  const category = item.category || 'Asset';
  const slug = item.slug;
  const heroImage = item.hero_image || (item.images && item.images[0]);
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
    sale_price: item.sale_price,
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
    description: item.description || '',
  };
};

const Assets = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [priceFilter, setPriceFilter] = useState('all');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutProduct, setCheckoutProduct] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchProducts();
        if (Array.isArray(data)) {
          setProducts(data.map((p, idx) => normalize(p, idx)));
        }
      } catch (e) {
        // ignore
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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

  return (
    <main className="bg-[#070314] text-white min-h-screen">
      <Header />

      <section className="pt-32 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-2xl bg-gradient-to-r from-violet-900/40 via-indigo-900/30 to-violet-900/40 border border-violet-500/20 px-8 py-7">
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight" data-testid="assets-page-title">Creative Assets Store</h1>
            <p className="mt-2 text-sm text-white/65">
              Premium LUTs, sound packs, motion templates and more — built for editors.
            </p>
          </div>
        </div>
      </section>

      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
          <aside className="lg:sticky lg:top-28 h-fit rounded-2xl bg-[#0d0820]/60 border border-violet-500/15 p-6">
            <h3 className="text-violet-400 text-xs font-bold tracking-[0.3em] mb-5">FILTERS</h3>

            <div className="relative mb-7">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search assets..."
                data-testid="assets-search-input"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-violet-500/60"
              />
            </div>

            <div className="mb-7">
              <p className="text-sm font-semibold text-white mb-3">Sort By</p>
              <RadioRow name="sort" value="newest" checked={sort === 'newest'} onChange={() => setSort('newest')} label="Newest First" />
              <RadioRow name="sort" value="oldest" checked={sort === 'oldest'} onChange={() => setSort('oldest')} label="Oldest First" />
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-3">Price</p>
              <RadioRow name="price" value="all" checked={priceFilter === 'all'} onChange={() => setPriceFilter('all')} label="All" />
              <RadioRow name="price" value="free" checked={priceFilter === 'free'} onChange={() => setPriceFilter('free')} label="Free" />
              <RadioRow name="price" value="paid" checked={priceFilter === 'paid'} onChange={() => setPriceFilter('paid')} label="Paid" />
            </div>
          </aside>

          <div>
            {loading ? (
              <div className="flex items-center gap-2 text-white/60 text-sm" data-testid="assets-loading">
                <Loader2 size={14} className="animate-spin" /> Loading assets...
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-white/60" data-testid="assets-empty">
                No assets match your filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6" data-testid="assets-grid">
                {filtered.map((p) => (
                  <ProductCard
                    key={p.id}
                    p={p}
                    onView={() => navigate(`/assets/${p.slug}`)}
                    onBuy={() => setCheckoutProduct(p)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
      <CheckoutModal
        product={checkoutProduct}
        open={!!checkoutProduct}
        onClose={() => setCheckoutProduct(null)}
        onSuccess={(result) => {
          setCheckoutProduct(null);
          const params = new URLSearchParams({
            orderId: result.orderId || '',
            paymentId: result.paymentId || '',
            download: result.downloadUrl || '',
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
    </main>
  );
};

const RadioRow = ({ name, value, checked, onChange, label }) => (
  <label className="flex items-center gap-3 py-1.5 cursor-pointer group">
    <span className="relative inline-flex">
      <input type="radio" name={name} value={value} checked={checked} onChange={onChange} className="sr-only" />
      <span className={`w-4 h-4 rounded-full border-2 transition ${checked ? 'border-violet-500' : 'border-white/30 group-hover:border-white/50'}`} />
      {checked && <span className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-violet-500" />}
    </span>
    <span className={`text-sm ${checked ? 'text-white' : 'text-white/75'}`}>{label}</span>
  </label>
);

const ProductCard = ({ p, onView, onBuy }) => (
  <div
    onClick={onView}
    data-testid={`asset-card-${p.slug}`}
    className="group rounded-2xl bg-[#0a0518]/80 border border-violet-500/15 hover:border-violet-500/40 transition-all duration-300 hover:-translate-y-1 overflow-hidden flex flex-col cursor-pointer"
  >
    <div className="relative aspect-[4/5] overflow-hidden">
      {p.image ? (
        <img src={p.image} alt={p.title} className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0" style={{ background: p.bg }} />
      )}
      <div className="absolute -inset-1 opacity-30 pointer-events-none" style={{
        background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)'
      }} />
      {!p.image && (
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div className="text-center">
            <p className="text-white/90 text-3xl md:text-4xl font-black tracking-tight leading-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
              {p.headline}
            </p>
            <p className="mt-2 text-white/85 text-lg md:text-xl font-bold tracking-wide drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
              {p.subhead}
            </p>
          </div>
        </div>
      )}
      <span className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider ${
        p.isFree ? 'bg-violet-500 text-white' : 'bg-rose-500 text-white'
      }`}>
        {p.badge}
      </span>
    </div>
    <div className="p-5 flex-1 flex flex-col">
      <h3 className="text-base md:text-lg font-semibold text-white">{p.title}</h3>
      <div className="mt-2 flex items-center gap-2">
        {p.original && (
          <span className="text-sm text-white/40 line-through">₹{p.original.toLocaleString('en-IN')}.00</span>
        )}
        <span className="text-base font-bold text-white">
          {p.isFree ? 'Free' : `₹${p.price.toLocaleString('en-IN')}.00`}
        </span>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); p.isFree ? onView() : onBuy(); }}
        data-testid={`view-asset-btn-${p.slug}`}
        className="mt-4 w-full inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 transition-colors text-white py-2.5 rounded-lg text-sm font-semibold"
      >
        {p.isFree ? 'Get Free' : 'Buy Now'}
      </button>
    </div>
  </div>
);

export default Assets;
