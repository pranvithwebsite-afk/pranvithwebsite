import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

const normalizeCatalogKey = (value) => String(value ?? '').trim().toLowerCase();

export function getCatalogItemKey(item, fallback = '') {
  const slug = normalizeCatalogKey(item?.slug);
  if (slug) return `slug:${slug}`;

  const id = normalizeCatalogKey(item?.id);
  if (id) return `id:${id}`;

  const title = normalizeCatalogKey(item?.title || item?.name);
  if (title) return `title:${title}`;

  return `item:${fallback}`;
}

export function dedupeCatalogItems(items) {
  if (!Array.isArray(items)) return [];

  const seenSlugs = new Set();
  const seenIds = new Set();
  const seenTitles = new Set();

  return items.filter((item) => {
    const slug = normalizeCatalogKey(item?.slug);
    const id = normalizeCatalogKey(item?.id);
    const title = normalizeCatalogKey(item?.title || item?.name);

    if (slug) {
      if (seenSlugs.has(slug)) return false;
      seenSlugs.add(slug);
      return true;
    }

    if ((id && seenIds.has(id)) || (title && seenTitles.has(title))) {
      return false;
    }

    if (id) seenIds.add(id);
    if (title) seenTitles.add(title);
    return true;
  });
}

export function safePublicHref(value, fallback = '/') {
  const href = String(value || '').trim();
  if (href.startsWith('/') && !href.startsWith('//')) return href;

  try {
    const url = new URL(href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : fallback;
  } catch {
    return fallback;
  }
}
