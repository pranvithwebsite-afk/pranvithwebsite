import React, { useEffect } from 'react';
import CmsSectionRenderer from './CmsSectionRenderer';

const CmsPageRenderer = ({ page, loading, fallback, slots = {} }) => {
  const isPublished = page?.status === 'published' || page?.published === true;

  useEffect(() => {
    if (!isPublished) return;
    const nextTitle = page.seo_title || page.title;
    if (nextTitle) document.title = nextTitle;
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    if (page.seo_description) meta.setAttribute('content', page.seo_description);
  }, [isPublished, page]);

  if (loading || !isPublished) return fallback;

  const sections = Array.isArray(page.sections) ? page.sections : [];
  return (
    <>
      {sections
        .filter((section) => section.enabled !== false)
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0))
        .map((section) => (
          <CmsSectionRenderer key={section.id} section={section} slots={slots} />
        ))}
    </>
  );
};

export default CmsPageRenderer;
