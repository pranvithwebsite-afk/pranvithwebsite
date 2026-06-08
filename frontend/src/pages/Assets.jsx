import React, { useMemo, useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Search } from 'lucide-react';
import { assetProducts } from '../data/mock';

const Assets = () => {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('newest');
  const [priceFilter, setPriceFilter] = useState('all');

  const filtered = useMemo(() => {
    let list = [...assetProducts];
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
  }, [query, sort, priceFilter]);

  return (
    <main className="bg-[#070314] text-white min-h-screen">
      <Header />

      {/* Top banner */}
      <section className="pt-32 pb-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="rounded-2xl bg-gradient-to-r from-violet-900/40 via-indigo-900/30 to-violet-900/40 border border-violet-500/20 px-8 py-7">
            <h1 className="text-2xl md:text-4xl font-bold tracking-tight">Editing Assets Shop</h1>
            <p className="mt-2 text-sm text-white/65">
              Premium LUTs, sound packs, motion templates and more — built for editors.
            </p>
          </div>
        </div>
      </section>

      {/* Filters + Grid */}
      <section className="pb-24">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-8">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-28 h-fit rounded-2xl bg-[#0d0820]/60 border border-violet-500/15 p-6">
            <h3 className="text-violet-400 text-xs font-bold tracking-[0.3em] mb-5">FILTERS</h3>

            <div className="relative mb-7">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search assets..."
                className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/35 focus:outline-none focus:border-violet-500/60"
              />
            </div>

            <div className="mb-7">
              <p className="text-sm font-semibold text-white mb-3">Sort By</p>
              <RadioRow
                name="sort"
                value="newest"
                checked={sort === 'newest'}
                onChange={() => setSort('newest')}
                label="Newest First"
              />
              <RadioRow
                name="sort"
                value="oldest"
                checked={sort === 'oldest'}
                onChange={() => setSort('oldest')}
                label="Oldest First"
              />
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-3">Price</p>
              <RadioRow
                name="price"
                value="all"
                checked={priceFilter === 'all'}
                onChange={() => setPriceFilter('all')}
                label="All"
              />
              <RadioRow
                name="price"
                value="free"
                checked={priceFilter === 'free'}
                onChange={() => setPriceFilter('free')}
                label="Free"
              />
              <RadioRow
                name="price"
                value="paid"
                checked={priceFilter === 'paid'}
                onChange={() => setPriceFilter('paid')}
                label="Paid"
              />
            </div>
          </aside>

          {/* Grid */}
          <div>
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center text-white/60">
                No assets match your filters.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {filtered.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
};

const RadioRow = ({ name, value, checked, onChange, label }) => (
  <label className="flex items-center gap-3 py-1.5 cursor-pointer group">
    <span className="relative inline-flex">
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        className="sr-only"
      />
      <span
        className={`w-4 h-4 rounded-full border-2 transition ${
          checked ? 'border-violet-500' : 'border-white/30 group-hover:border-white/50'
        }`}
      />
      {checked && (
        <span className="absolute inset-0 m-auto w-2 h-2 rounded-full bg-violet-500" />
      )}
    </span>
    <span className={`text-sm ${checked ? 'text-white' : 'text-white/75'}`}>{label}</span>
  </label>
);

const ProductCard = ({ p }) => (
  <div className="group rounded-2xl bg-[#0a0518]/80 border border-violet-500/15 hover:border-violet-500/40 transition-all duration-300 hover:-translate-y-1 overflow-hidden">
    {/* Image area (faux product box) */}
    <div className="relative aspect-[4/5] overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: p.bg }}
      />
      {/* decorative diagonal shine */}
      <div className="absolute -inset-1 opacity-30 pointer-events-none" style={{
        background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)'
      }} />
      {/* product label */}
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-white/90 text-3xl md:text-4xl font-black tracking-tight leading-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
            {p.headline}
          </p>
          <p className="mt-2 text-white/85 text-lg md:text-xl font-bold tracking-wide drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
            {p.subhead}
          </p>
          {p.sub2 && (
            <p className="mt-3 inline-block px-3 py-0.5 rounded-sm bg-amber-500/90 text-black text-[10px] font-bold tracking-widest">
              {p.sub2}
            </p>
          )}
        </div>
      </div>

      {/* Badge */}
      <span
        className={`absolute top-4 left-4 px-3 py-1 rounded-full text-[11px] font-bold tracking-wider ${
          p.isFree
            ? 'bg-violet-500 text-white'
            : 'bg-rose-500 text-white'
        }`}
      >
        {p.badge}
      </span>
    </div>

    {/* Body */}
    <div className="p-5">
      <h3 className="text-base md:text-lg font-semibold text-white">{p.title}</h3>
      <div className="mt-2 flex items-center gap-2">
        {p.original && (
          <span className="text-sm text-white/40 line-through">₹{p.original.toLocaleString('en-IN')}.00</span>
        )}
        <span className="text-base font-bold text-white">
          {p.isFree ? 'Free' : `₹${p.price.toLocaleString('en-IN')}.00`}
        </span>
      </div>
    </div>
  </div>
);

export default Assets;
