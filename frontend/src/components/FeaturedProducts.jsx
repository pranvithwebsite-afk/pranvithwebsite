import React, { useState } from 'react';
import { Star, ShoppingBag, Eye, CheckCircle2, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';

const products = [
  {
    id: 1,
    title: 'Wedding LUT Pack',
    category: 'Color Grading',
    rating: 5,
    reviews: 142,
    price: 'Rs. 1,499',
    originalPrice: 'Rs. 2,999',
    discount: '50% OFF',
    image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
    description: '25+ Filmic Log-to-Rec.709 LUTs engineered specifically for romantic Indian & International wedding films.',
  },
  {
    id: 2,
    title: 'SFX Ultimate Bundle',
    category: 'Audio FX',
    rating: 5,
    reviews: 98,
    price: 'Rs. 1,999',
    originalPrice: 'Rs. 3,499',
    discount: '42% OFF',
    image: 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?auto=format&fit=crop&w=800&q=80',
    description: 'Over 500+ studio-mastered risers, whooshes, cinematic hits, ambient drones, and bass drops for trailer edits.',
  },
  {
    id: 3,
    title: 'Transition Pack',
    category: 'Motion FX',
    rating: 5,
    reviews: 210,
    price: 'Rs. 999',
    originalPrice: 'Rs. 1,999',
    discount: '50% OFF',
    image: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=800&q=80',
    description: 'Smooth whip pans, glass light leaks, zoom blur transitions pre-packaged for drag & drop timeline editing.',
  },
  {
    id: 4,
    title: 'Album PSD Collection',
    category: 'Design Templates',
    rating: 5,
    reviews: 76,
    price: 'Rs. 1,299',
    originalPrice: 'Rs. 2,499',
    discount: '48% OFF',
    image: 'https://images.unsplash.com/photo-1537633552985-df8429e8048b?auto=format&fit=crop&w=800&q=80',
    description: 'Ultra high-res print-ready photo album layouts with smart objects, gold foil accents, and modular grids.',
  },
];

const FeaturedProducts = () => {
  const [selectedProduct, setSelectedProduct] = useState(null);

  return (
    <section className="section-block relative py-24 px-6 bg-[#05070a] overflow-hidden">
      <div className="mx-auto max-w-7xl">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/30 text-[#60a5fa] text-xs font-semibold uppercase tracking-wider mb-4">
              <Sparkles size={14} className="text-[#3b82f6]" />
              <span>BEST SELLING ASSETS</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white font-[Space_Grotesk]">
              Best Selling Assets
            </h2>
          </div>
          <Link
            to="/assets"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#60a5fa] hover:text-white transition"
          >
            <span>View Full Store</span>
            <span className="text-lg">→</span>
          </Link>
        </div>

        {/* Product Cards Grid */}
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-3xl border border-white/10 bg-[#0b0f14] p-4 transition-all duration-500 hover:border-[#3b82f6]/50 hover:-translate-y-2 hover:shadow-[0_20px_50px_rgba(59,130,246,0.25)] flex flex-col justify-between"
            >
              <div>
                {/* Image Container */}
                <div className="relative aspect-[4/3] rounded-2xl overflow-hidden mb-5 bg-[#0e1322]">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b0f14] via-transparent to-transparent opacity-80" />

                  {/* Badge */}
                  <span className="absolute top-3 left-3 bg-[#3b82f6] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow-lg">
                    {item.discount}
                  </span>

                  {/* Quick Preview Hover Trigger */}
                  <button
                    onClick={() => setSelectedProduct(item)}
                    className="absolute inset-0 m-auto h-11 w-11 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 shadow-xl"
                    title="Quick Preview"
                  >
                    <Eye size={18} />
                  </button>
                </div>

                {/* Info */}
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#60a5fa]">
                  {item.category}
                </span>

                <h3 className="text-xl font-bold text-white mt-1 mb-2 font-[Space_Grotesk]">
                  {item.title}
                </h3>

                {/* Rating */}
                <div className="flex items-center gap-1.5 text-amber-400 text-xs mb-4">
                  <div className="flex gap-0.5">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star key={i} size={13} fill="currentColor" />
                    ))}
                  </div>
                  <span className="text-white/50 text-[11px]">({item.reviews})</span>
                </div>
              </div>

              {/* Price & Buy Now */}
              <div className="pt-4 border-t border-white/10 flex items-center justify-between mt-2">
                <div>
                  <span className="text-lg font-bold text-white">{item.price}</span>
                  <span className="text-xs text-white/40 line-through ml-2">{item.originalPrice}</span>
                </div>
                <Link
                  to="/assets"
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#2563eb] hover:from-[#2563eb] hover:to-[#1d4ed8] text-white px-4 py-2.5 text-xs font-semibold shadow-[0_4px_15px_rgba(59,130,246,0.35)] transition"
                >
                  <ShoppingBag size={14} />
                  <span>Buy Now</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Preview Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative w-full max-w-xl rounded-3xl border border-white/20 bg-[#0b0f14] p-8 shadow-2xl animate-in fade-in zoom-in duration-300">
            <button
              onClick={() => setSelectedProduct(null)}
              className="absolute top-5 right-5 h-9 w-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white text-sm"
            >
              <X size={18} />
            </button>

            <div className="aspect-video rounded-2xl overflow-hidden mb-6 border border-white/10">
              <img src={selectedProduct.image} alt={selectedProduct.title} className="w-full h-full object-cover" />
            </div>

            <span className="text-xs font-bold uppercase tracking-wider text-[#60a5fa]">
              {selectedProduct.category}
            </span>
            <h3 className="text-2xl font-bold text-white mt-1 mb-3 font-[Space_Grotesk]">
              {selectedProduct.title}
            </h3>
            <p className="text-sm text-white/70 leading-relaxed mb-6">
              {selectedProduct.description}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-white/10">
              <div>
                <span className="text-2xl font-bold text-white">{selectedProduct.price}</span>
                <span className="text-sm text-white/40 line-through ml-2">{selectedProduct.originalPrice}</span>
              </div>
              <Link
                to="/assets"
                onClick={() => setSelectedProduct(null)}
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white px-6 py-3 text-sm font-semibold shadow-lg hover:scale-105 transition"
              >
                <ShoppingBag size={16} />
                <span>Instant Checkout</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default FeaturedProducts;
