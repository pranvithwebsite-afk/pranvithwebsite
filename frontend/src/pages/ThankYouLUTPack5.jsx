import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { CheckCircle, Download, Mail } from 'lucide-react';

const ThankYouLUTPack5 = () => {
  const location = useLocation();
  const query = new URLSearchParams(location.search);
  const orderId = query.get('order_id') || 'ORDER-12345';
  const paymentId = query.get('payment_id') || 'PAY-12345';
  const purchaseDate = query.get('date') || new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  return (
    <main className="bg-[#070314] text-white min-h-screen">
      <Header />
      <section className="pt-32 pb-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="rounded-[2rem] border border-violet-500/15 bg-gradient-to-br from-[#090712] via-[#0b0820] to-[#090712] p-10 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-violet-500/10 text-violet-300 mb-6">
              <CheckCircle size={40} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Payment Successful</h1>
            <p className="mt-4 text-white/70 text-sm md:text-base">
              Thank you for purchasing Pranavith Cinematic LUT Pack 5.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_420px]">
            <div className="rounded-[2rem] border border-white/10 bg-[#0d0820] p-8">
              <h2 className="text-2xl font-bold mb-6">Order Information</h2>
              <div className="space-y-4 text-sm text-white/75">
                <div className="rounded-3xl bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">Order ID</p>
                  <p className="mt-2 text-white font-semibold">{orderId}</p>
                </div>
                <div className="rounded-3xl bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">Payment ID</p>
                  <p className="mt-2 text-white font-semibold">{paymentId}</p>
                </div>
                <div className="rounded-3xl bg-white/5 p-5">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">Purchase Date</p>
                  <p className="mt-2 text-white font-semibold">{purchaseDate}</p>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-[#0a0518] p-8">
              <h2 className="text-2xl font-bold mb-6">Download Your Pack</h2>
              <p className="text-white/70 leading-relaxed text-sm">
                Your files are ready to download. This placeholder link will be replaced with secure delivery once the download integration is configured.
              </p>
              <a
                href="#"
                className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-3xl bg-violet-600 px-6 py-4 text-sm font-semibold uppercase tracking-[0.12em] text-white transition hover:bg-violet-500"
              >
                <Download size={16} /> Download LUT Pack
              </a>
            </div>
          </div>

          <div className="mt-10 rounded-[2rem] border border-white/10 bg-[#0b0820] p-8 text-center">
            <h2 className="text-2xl font-bold">Need Help?</h2>
            <p className="mt-3 text-white/70 leading-relaxed text-sm">
              If you need support with your purchase or download, please contact our team.
            </p>
            <a
              href="mailto:support@pranvithdop.com"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <Mail size={16} /> support@pranvithdop.com
            </a>
          </div>

          <div className="mt-10 text-center text-sm text-white/55">
            <Link to="/assets" className="underline underline-offset-4 hover:text-white">
              Back to Assets
            </Link>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
};

export default ThankYouLUTPack5;
