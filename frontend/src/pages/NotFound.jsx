import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';

const NotFound = () => (
  <>
    <Header />
    <main className="page bg-transparent text-white">
      <section className="relative overflow-hidden px-6 pb-24 pt-32 text-center md:pt-36">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,77,0,0.18),transparent_48%)]" />
        <div className="relative mx-auto max-w-3xl">
          <p className="section-eyebrow text-xs">404</p>
          <h1 className="mt-5 text-5xl font-bold tracking-tight md:text-7xl">Page not found</h1>
          <p className="mx-auto mt-6 max-w-xl text-white/68">The page you are looking for does not exist or has moved.</p>
          <Link to="/" className="mt-8 inline-flex rounded-full bg-violet-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-violet-500">
            Back to Home
          </Link>
        </div>
      </section>
    </main>
    <Footer />
  </>
);

export default NotFound;
