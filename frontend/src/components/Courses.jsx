import React, { useEffect, useState } from 'react';
import { ChevronRight, CheckCircle2, Loader2 } from 'lucide-react';
import { courses as mockCourses } from '../data/mock';
import { fetchCourses } from '../lib/api';
import { payWithRazorpay } from '../lib/razorpay';
import { dedupeCatalogItems, getCatalogItemKey } from '../lib/utils';
import { toast } from 'sonner';

const Courses = () => {
  const [courses, setCourses] = useState(() => dedupeCatalogItems(mockCourses));
  const [loading, setLoading] = useState(true);
  const [buyingId, setBuyingId] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await fetchCourses();
        if (Array.isArray(data) && data.length) {
          setCourses(dedupeCatalogItems(data));
        }
      } catch (e) {
        // fallback to mock
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleBuy = async (course) => {
    try {
      setBuyingId(course.id);
      const res = await payWithRazorpay({
        amountRupees: course.price,
        itemId: String(course.id),
        itemName: course.title,
      });
      if (res.success) {
        toast.success(`Enrolled! Payment ID: ${res.paymentId}`);
      } else if (res.error === 'cancelled') {
        toast.message('Payment cancelled');
      } else {
        toast.error(res.error || 'Payment failed');
      }
    } finally {
      setBuyingId(null);
    }
  };

  return (
    <section className="relative py-24">
      <div className="absolute inset-0 radial-purple-bottom pointer-events-none" />
      <div className="relative max-w-7xl mx-auto px-6">
        <div className="text-center mb-4">
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">MASTER VIDEO EDITING</h2>
          <p className="mt-4 text-violet-400 text-base md:text-lg font-medium">Expand Your Career Opportunity</p>
          <p className="mt-3 text-white/65 max-w-2xl mx-auto">
            Learn professional video editing techniques from industry experts.
            From beginner to advanced level courses.
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((c, index) => (
            <div
              key={getCatalogItemKey(c, index)}
              className="group relative rounded-2xl overflow-hidden bg-[#0f0830]/50 border border-violet-500/15 hover:border-violet-500/40 transition-all duration-300 hover:-translate-y-1"
            >
              <div className="relative aspect-[16/10] overflow-hidden">
                <img
                  src={c.image}
                  alt={c.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#070314] via-[#070314]/30 to-transparent" />
                <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-violet-600 text-white text-[11px] font-bold tracking-wider">
                  {c.discount}
                </div>
                <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur text-white text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                  {c.lectures} Lectures
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-lg font-semibold text-white leading-snug mb-2 line-clamp-2">
                  {c.title}
                </h3>
                <p className="text-sm text-white/60 leading-relaxed line-clamp-3 mb-4">{c.description}</p>
                <div className="flex items-center gap-2 text-xs text-white/70 mb-5">
                  <CheckCircle2 size={14} className="text-violet-400" />
                  No Prior Experience Needed
                </div>
                <div className="h-px bg-white/10 mb-5" />
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-2xl font-bold text-white">₹{c.price}</span>
                    {c.original && (
                      <span className="ml-2 text-sm text-white/45 line-through">₹{c.original}</span>
                    )}
                  </div>
                  <button
                    onClick={() => handleBuy(c)}
                    disabled={buyingId === c.id}
                    aria-label={`Buy ${c.title}`}
                    className="w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-500 disabled:opacity-60 flex items-center justify-center text-white transition"
                  >
                    {buyingId === c.id ? <Loader2 size={16} className="animate-spin" /> : <ChevronRight size={18} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        {loading && <p className="text-center text-white/30 text-xs mt-6">Loading latest catalog...</p>}
      </div>
    </section>
  );
};

export default Courses;
