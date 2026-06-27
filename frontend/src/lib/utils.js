import { clsx } from "clsx";
import { toast } from "sonner";
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

const normalizeFaqQuestion = (value) =>
  String(value ?? '')
    .normalize('NFKC')
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

export function dedupeFaqs(items) {
  if (!Array.isArray(items)) return [];

  const seenQuestions = new Set();

  return items.filter((item) => {
    const question = normalizeFaqQuestion(item?.q || item?.question);
    if (!question) return true;
    if (seenQuestions.has(question)) return false;

    seenQuestions.add(question);
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

export const FALLBACK_IMAGE = '/assets/brand-profile.png';

export function safeImageSrc(value, fallback = FALLBACK_IMAGE) {
  const src = String(value || '').trim();
  if (!src) return fallback;
  if (src.startsWith('/') && !src.startsWith('//')) return src;

  try {
    const url = new URL(src);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : fallback;
  } catch {
    return fallback;
  }
}

export function handleImageError(event, fallback = FALLBACK_IMAGE) {
  const img = event?.currentTarget;
  if (!img || img.dataset.fallbackApplied === 'true') return;
  img.dataset.fallbackApplied = 'true';
  img.src = fallback;
}

export async function shareProduct(product, fallbackUrl) {
  const slug = product?.slug;
  const productUrl = fallbackUrl || (slug && typeof window !== 'undefined'
    ? `${window.location.origin}/assets/${slug}`
    : '');

  if (!productUrl) {
    toast.error('Product link unavailable');
    return;
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.share) {
      await navigator.share({
        title: product?.name || product?.title || 'Product',
        text: product?.description || product?.name || product?.title || 'Product',
        url: productUrl,
      });
    } else if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(productUrl);
    } else {
      throw new Error('Clipboard is not available');
    }
    toast.success('Product link copied');
  } catch (error) {
    if (error?.name === 'AbortError') return;
    toast.error('Could not copy product link');
  }
}

export const normalizeWorkItem = (project) => {
  if (!project) return null;
  const workVideoMediaTypes = new Set(['video_file', 'video_url', 'youtube', 'vimeo']);

  const getYouTubeThumbnail = (url, quality = 'hqdefault') => {
      if (!url || !url.includes('youtube.com') && !url.includes('youtu.be')) return null;
      const videoIdMatch = url.match(/(?:v=|\/|embed\/|watch\?v=)([a-zA-Z0-9_-]{11})/);
      const videoId = videoIdMatch ? videoIdMatch[1] : null;
      if (!videoId) return null;
      return `https://i.ytimg.com/vi/${videoId}/${quality}.jpg`;
  };

  const mediaType = project.media_type || (project.video_url ? 'video_url' : 'image');

  const videoUrl = project.video_url || (workVideoMediaTypes.has(mediaType) ? project.media_url : null);
  
  const thumbnail = project.thumbnail_url || project.image_url || project.poster_url || project.thumbnail_image_url || getYouTubeThumbnail(videoUrl);

  return {
      title: project.title,
      category: project.category,
      description: project.description,
      thumbnail_url: thumbnail,
      video_url: videoUrl,
      link_url: project.link_url || project.button_link,
      featured: project.featured,
      enabled: project.enabled !== false,
      sort_order: project.sort_order || 0,
      equipment: project.equipment,
      client: project.client,
      date: project.date,
      id: project.id || project._id,
  };
};
