import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { fetchAdminCmsPages, fetchAdminMedia } from '../../lib/api';
import CmsPageEditor from '../components/CmsPageEditor';

const requiredPages = [
  { title: 'Home', page_key: 'home', path: '/' },
  { title: 'Courses', page_key: 'courses', path: '/courses' },
  { title: 'About', page_key: 'about', path: '/about' },
  { title: 'Assets', page_key: 'assets', path: '/assets' },
  { title: 'Our Works', page_key: 'works', path: '/works' },
  { title: 'Hire From Us', page_key: 'hire', path: '/hire' },
  { title: 'Privacy Policy', page_key: 'privacy', path: '/privacy#privacy' },
  { title: 'Terms & Conditions', page_key: 'terms', path: '/privacy#terms' },
];

const mergeRequiredPages = (items = []) => requiredPages.map((required) => {
  const existing = items.find((page) => page.page_key === required.page_key);
  return { ...required, ...(existing || {}) };
});

const Website = () => {
  const [pages, setPages] = useState([]);
  const [mediaItems, setMediaItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [editingPage, setEditingPage] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    console.info('[admin/website] Loading CMS pages and media');
    try {
      setLoading(true);
      setLoadError('');
      const [pagesData, mediaData] = await Promise.all([
        fetchAdminCmsPages(),
        fetchAdminMedia().catch(() => []),
      ]);
      setPages(mergeRequiredPages(Array.isArray(pagesData) ? pagesData : []));
      setMediaItems(Array.isArray(mediaData) ? mediaData : []);
      console.info('[admin/website] CMS pages loaded');
    } catch (error) {
      const message = error?.response?.data?.detail || error?.response?.data?.message || 'Failed to load website pages';
      console.error('[admin/website] CMS page load failed', error);
      toast.error(message);
      setLoadError(message);
      setPages([]);
    } finally {
      setLoading(false);
      console.info('[admin/website] CMS page loading finished');
    }
  };

  if (editingPage) {
    return (
      <CmsPageEditor
        pageKey={editingPage.page_key}
        title={editingPage.title}
        path={editingPage.path}
        mediaItems={mediaItems}
        onBack={() => {
          setEditingPage(null);
          loadData();
        }}
      />
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-800 bg-slate-900/95 p-6">
        <h1 className="text-3xl font-semibold text-white">Website Pages</h1>
        <p className="mt-3 text-slate-400">Choose a page card to edit database-backed CMS content, media, SEO, status, visibility, and section order.</p>
      </div>

      {loading ? (
        <div className="text-center text-slate-400">Loading pages...</div>
      ) : loadError ? (
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-6 text-rose-100">
          <p>{loadError}</p>
          <button type="button" onClick={loadData} className="mt-4 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-500">Retry</button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pages.map((page) => (
            <div key={page.page_key} className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
              <h2 className="text-lg font-semibold text-white">{page.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{page.path}</p>
              <p className="mt-2 text-xs text-slate-500">
                Status: <span className={page.status === 'published' ? 'text-green-400' : 'text-yellow-400'}>{page.status || 'draft'}</span>
              </p>
              <button
                type="button"
                onClick={() => setEditingPage(page)}
                className="mt-4 w-full rounded-lg bg-violet-600 py-2 text-sm font-semibold text-white transition hover:bg-violet-500"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default Website;
