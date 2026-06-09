import React, { useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { ChevronRight, Loader2, Minus, Plus, ShieldCheck, Download, Tag } from 'lucide-react';
import { assetProducts } from '../data/mock';
import { payWithRazorpay } from '../lib/razorpay';
import { toast } from 'sonner';

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const product = useMemo(() => assetProducts.find((p) => p.id === id), [id]);

  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState('description');
  const [busy, setBusy] = useState(false);

  if (!product) {
    return (
      <main className="bg-[#070314] text-white min-h-screen">
        <Header />
        <section className="pt-36 pb-24 px-6 text-center">
          <h1 className="text-3xl font-bold">Product not found</h1>
          <button
            onClick={() => navigate('/assets')}
            className="mt-6 inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 transition-colors text-white px-6 py-2.5 rounded-full text-sm font-semibold"
          >
            Back to Assets
          </button>
        </section>
        <Footer />
      </main>
    );
  }

  const totalRupees = product.isFree ? 0 : product.price * qty;

  const onBuy = async () => {
    if (product.isFree) {
      toast.success(`${product.title} added to your downloads (free).`);
      return;
    }
    try {
      setBusy(true);
      const res = await payWithRazorpay({
        amountRupees: totalRupees,
        itemId: product.id,
        itemName: `${product.title} × ${qty}`,
      });
      if (res.success) {
        toast.success(`Payment successful! Payment ID: ${res.paymentId}`);
      } else if (res.error === 'cancelled') {
        toast.message('Payment cancelled');
      } else {
        toast.error(res.error || 'Payment failed');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="bg-[#070314] text-white min-h-screen">
      <Header />

      <section className="pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-white/55 mb-8">
            <Link to="/" className="hover:text-white">Home</Link>
            <ChevronRight size={14} />
            <Link to="/assets" className="hover:text-white">Assets</Link>
            <ChevronRight size={14} />
            <span className="text-white/85 truncate">{product.title}</span>
          </nav>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10">
            {/* Left: Product image */}
            <div className="relative">
              <div className="relative aspect-[4/5] rounded-2xl overflow-hidden border border-violet-500/15 bg-[#0a0518]">
                <div className="absolute inset-0" style={{ background: product.bg }} />
                <div className="absolute -inset-1 opacity-30 pointer-events-none" style={{
                  background: 'linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.18) 50%, transparent 60%)'
                }} />
                <div className="absolute inset-0 flex items-center justify-center px-6">
                  <div className="text-center">
                    <p className="text-white/90 text-4xl md:text-6xl font-black tracking-tight leading-tight drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
                      {product.headline}
                    </p>
                    <p className="mt-3 text-white/85 text-xl md:text-2xl font-bold tracking-wide drop-shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
                      {product.subhead}
                    </p>
                    {product.sub2 && (
                      <p className="mt-4 inline-block px-3 py-0.5 rounded-sm bg-amber-500/90 text-black text-xs font-bold tracking-widest">
                        {product.sub2}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={`absolute top-5 left-5 px-3.5 py-1 rounded-full text-xs font-bold tracking-wider ${
                    product.isFree ? 'bg-violet-500 text-white' : 'bg-rose-500 text-white'
                  }`}
                >
                  {product.badge}
                </span>
              </div>
            </div>

            {/* Right: Details */}
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/30 text-violet-300 text-xs font-medium mb-4">
                <Tag size={12} />
                <span>LUT Packs</span>
              </div>

              <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
                {product.title}
              </h1>

              <div className="mt-5 flex items-end gap-3">
                {product.original && (
                  <span className="text-lg text-white/40 line-through">
                    ₹{product.original.toLocaleString('en-IN')}.00
                  </span>
                )}
                <span className="text-3xl md:text-4xl font-bold text-violet-300">
                  {product.isFree ? 'Free' : `₹${product.price.toLocaleString('en-IN')}.00`}
                </span>
              </div>

              <p className="mt-5 text-white/65 leading-relaxed text-sm md:text-base">
                {getShortDescription(product)}
              </p>

              {/* Quantity + Buy */}
              {!product.isFree && (
                <div className="mt-7 flex items-center gap-4 flex-wrap">
                  <div className="inline-flex items-center rounded-lg border border-white/15 bg-white/5">
                    <button
                      onClick={() => setQty((q) => Math.max(1, q - 1))}
                      aria-label="Decrease quantity"
                      className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-10 text-center text-white font-semibold">{qty}</span>
                    <button
                      onClick={() => setQty((q) => Math.min(10, q + 1))}
                      aria-label="Increase quantity"
                      className="w-10 h-10 flex items-center justify-center text-white/80 hover:text-white"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  <button
                    onClick={onBuy}
                    disabled={busy}
                    className="inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-white px-7 py-3 rounded-lg text-sm font-semibold"
                  >
                    {busy ? (
                      <>
                        <Loader2 size={14} className="animate-spin" /> Processing...
                      </>
                    ) : (
                      <>Buy Now — ₹{totalRupees.toLocaleString('en-IN')}.00</>
                    )}
                  </button>
                </div>
              )}

              {product.isFree && (
                <button
                  onClick={onBuy}
                  className="mt-7 inline-flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 transition-colors text-white px-7 py-3 rounded-lg text-sm font-semibold"
                >
                  <Download size={14} /> Get Free
                </button>
              )}

              {/* Trust signals */}
              <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <TrustItem icon={ShieldCheck} text="Secure payment via Razorpay" />
                <TrustItem icon={Download} text="Instant download after purchase" />
              </div>

              {/* Category */}
              <p className="mt-6 text-xs text-white/55">
                Category: <span className="text-violet-300">LUT Packs</span>
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-16 border-t border-white/10 pt-8">
            <div className="flex items-center gap-6 mb-6">
              <TabBtn active={tab === 'description'} onClick={() => setTab('description')}>
                Description
              </TabBtn>
              <TabBtn active={tab === 'reviews'} onClick={() => setTab('reviews')}>
                Reviews (0)
              </TabBtn>
            </div>

            {tab === 'description' ? (
              <div className="text-white/70 leading-relaxed text-sm md:text-base space-y-4 max-w-3xl">
                <p>{getLongDescription(product)}</p>
                <ul className="list-disc list-inside space-y-1.5 text-white/65">
                  <li>Compatible with Adobe Premiere Pro, After Effects, DaVinci Resolve & Final Cut Pro</li>
                  <li>Instant download — files delivered after payment</li>
                  <li>Lifetime usage — no subscription</li>
                  <li>Optimized for cinematic, wedding, social media, and YouTube footage</li>
                  <li>Royalty-free for personal & client projects</li>
                </ul>
              </div>
            ) : (
              <div className="text-center py-12 text-white/55 max-w-3xl">
                <p className="text-sm">No reviews yet. Be the first to share your experience after purchase!</p>
              </div>
            )}
          </div>

          {/* Related products */}
          <RelatedProducts currentId={product.id} />
        </div>
      </section>

      <Footer />
    </main>
  );
};

const TabBtn = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`pb-3 text-sm font-semibold border-b-2 transition ${
      active ? 'border-violet-500 text-white' : 'border-transparent text-white/55 hover:text-white/85'
    }`}
  >
    {children}
  </button>
);

const TrustItem = ({ icon: Icon, text }) => (
  <div className="flex items-center gap-2.5 text-xs text-white/65">
    <span className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-300">
      <Icon size={14} />
    </span>
    {text}
  </div>
);

const RelatedProducts = ({ currentId }) => {
  const related = assetProducts.filter((p) => p.id !== currentId).slice(0, 4);
  return (
    <div className="mt-20">
      <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-7">You may also like</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {related.map((p) => (
          <Link
            key={p.id}
            to={`/assets/${p.id}`}
            className="group rounded-2xl border border-violet-500/15 hover:border-violet-500/40 bg-[#0a0518]/80 overflow-hidden transition-all hover:-translate-y-1"
          >
            <div className="relative aspect-[4/5] overflow-hidden">
              <div className="absolute inset-0" style={{ background: p.bg }} />
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <p className="text-white/90 text-xl md:text-2xl font-black tracking-tight text-center leading-tight">
                  {p.headline}
                </p>
              </div>
              <span
                className={`absolute top-3 left-3 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider ${
                  p.isFree ? 'bg-violet-500 text-white' : 'bg-rose-500 text-white'
                }`}
              >
                {p.badge}
              </span>
            </div>
            <div className="p-4">
              <p className="text-sm font-medium text-white line-clamp-1">{p.title}</p>
              <p className="mt-1 text-sm font-bold text-violet-300">
                {p.isFree ? 'Free' : `₹${p.price.toLocaleString('en-IN')}.00`}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const getShortDescription = (p) => {
  if (p.title.toLowerCase().includes('lut')) {
    return '50+ premium cinematic LUTs crafted to deliver stunning colors, rich contrast and a professional film look to your videos.';
  }
  if (p.title.toLowerCase().includes('wedding') || p.title.toLowerCase().includes('invitation')) {
    return 'Beautifully designed wedding invitation templates for Premiere Pro — easy to edit, fully customizable, and ready to wow your clients.';
  }
  if (p.title.toLowerCase().includes('transition')) {
    return 'Smooth, modern transitions for reels, YouTube videos and short-form content. Drag, drop and elevate your edits instantly.';
  }
  if (p.title.toLowerCase().includes('sound')) {
    return 'A curated library of cinematic sound effects — whooshes, impacts, risers and ambient drones for high-impact storytelling.';
  }
  if (p.title.toLowerCase().includes('title') || p.title.toLowerCase().includes('motion')) {
    return 'Eye-catching After Effects title and motion templates designed to make your intros, lower-thirds and end cards pop.';
  }
  if (p.title.toLowerCase().includes('color') || p.title.toLowerCase().includes('grading')) {
    return 'Professional color grading presets to give your footage a polished, cinematic look in just one click.';
  }
  if (p.title.toLowerCase().includes('music')) {
    return 'Royalty-free music tracks across moods and genres — perfect for cinematic, vlog and corporate edits.';
  }
  if (p.title.toLowerCase().includes('typography') || p.title.toLowerCase().includes('font')) {
    return 'A handpicked typography pack with 80+ fonts to give your titles and captions a premium, modern look.';
  }
  return 'Premium asset pack crafted for editors and creators who want to ship faster without sacrificing quality.';
};

const getLongDescription = (p) => {
  return `${getShortDescription(p)} This pack is built and tested by working editors so you save hours on setup and focus on the creative work that matters. Whether you are editing wedding films, reels, YouTube videos, ads or brand content, you'll find this pack flexible enough to slot into any workflow.`;
};

export default ProductDetail;
