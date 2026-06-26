import React from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Award, Camera, Clock, Film, Plane, Sparkles } from 'lucide-react';
import { handleImageError, safeImageSrc, safePublicHref } from '../lib/utils';
import { usePublicPageLoading } from '../components/PublicPageLoader';
import { useCmsPage } from '../hooks/useCmsPage';
import SafeVideoEmbed, { detectMediaType } from '../components/SafeVideoEmbed';
import OptimizedImage from '../components/OptimizedImage';

const statIcons = [Film, Camera, Plane, Clock];

const findSection = (sections, idOrType) =>
  (sections || []).find((section) => section.section_id === idOrType)
  || (sections || []).find((section) => section.type === idOrType);

const getCmsOrder = (sections = [], keys = [], fallback = 999) => {
  const matched = (sections || []).find((section) =>
    keys.includes(section.section_id) || keys.includes(section.type)
  );

  if (!matched) return fallback;

  const order = Number(matched.sort_order);
  return Number.isFinite(order) ? order : fallback;
};



