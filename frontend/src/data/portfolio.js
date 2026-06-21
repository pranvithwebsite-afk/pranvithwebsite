import { Camera, Clapperboard, Edit3, Film, Palette, Plane, ShoppingBag } from 'lucide-react';

export const showreelUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

export const portfolioProjects = [
  {
    id: 'commercial-brand-film',
    title: 'Luxury Brand Commercial',
    category: 'Commercial',
    thumbnail: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=1000&q=80',
    description: 'A polished commercial film with controlled lighting, cinematic movement, and premium product framing.',
    videoLink: showreelUrl,
    equipment: 'Sony Cinema Camera, Gimbal, Key/Fill LED setup',
    client: 'Premium lifestyle brand',
    date: '2026',
  },
  {
    id: 'wedding-cinematic-story',
    title: 'Cinematic Wedding Story',
    category: 'Wedding',
    thumbnail: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1000&q=80',
    description: 'Emotion-led wedding cinematography built around light, movement, vows, and family moments.',
    videoLink: showreelUrl,
    equipment: 'Cinema camera, Drone, Wireless audio',
    client: 'Private client',
    date: '2026',
  },
  {
    id: 'drone-estate-film',
    title: 'Aerial Location Film',
    category: 'Drone',
    thumbnail: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1000&q=80',
    description: 'Drone-led visuals for real estate, travel, and production establishing sequences.',
    videoLink: showreelUrl,
    equipment: '4K drone, ND filters',
    client: 'Production partner',
    date: '2026',
  },
  {
    id: 'editing-di-suite',
    title: 'Editing & DI Suite',
    category: 'Editing',
    thumbnail: 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=1000&q=80',
    description: 'Full post-production workflow: edit, grade, sound polish, titles, and final delivery.',
    videoLink: showreelUrl,
    equipment: 'Premiere Pro, After Effects, DaVinci Resolve',
    client: 'Creator and brand work',
    date: '2026',
  },
  {
    id: 'product-photography',
    title: 'Product Campaign Frames',
    category: 'Product',
    thumbnail: 'https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1000&q=80',
    description: 'Commercial product photography with clean lighting, composition, and campaign-ready retouching.',
    videoLink: showreelUrl,
    equipment: 'Macro lens, Light box, Studio strobes',
    client: 'D2C product brand',
    date: '2026',
  },
  {
    id: 'short-film-lookbook',
    title: 'Short Film Lookbook',
    category: 'Film',
    thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=1000&q=80',
    description: 'Narrative film visuals focused on mood, blocking, lensing, and emotional continuity.',
    videoLink: showreelUrl,
    equipment: 'Cinema primes, haze, practical lighting',
    client: 'Independent film team',
    date: '2026',
  },
];

export const services = [
  { icon: Film, title: 'Film Production', description: 'Narrative, branded, and creator-led films designed around story, light, and pacing.', path: '/commercial-video-production' },
  { icon: Clapperboard, title: 'Wedding Cinematography', description: 'Emotional wedding films with cinematic framing, audio, drone visuals, and premium edits.', path: '/wedding-cinematography' },
  { icon: ShoppingBag, title: 'Commercial Ads', description: 'Campaign-ready ads for products, creators, local businesses, and digital launches.', path: '/commercial-video-production' },
  { icon: Plane, title: 'Drone Cinematography', description: 'Licensed aerial visuals for locations, events, real estate, and cinematic sequences.', path: '/drone-cinematography' },
  { icon: Edit3, title: 'Video Editing', description: 'Editing, color grading, titles, sound polish, reels, YouTube videos, and brand films.', path: '/hire' },
  { icon: Camera, title: 'Product & Commercial Photography', description: 'Clean product, campaign, and commercial photography for digital-first brands.', path: '/hire' },
  { icon: Palette, title: 'Graphic Design', description: 'Posters, thumbnails, social creatives, title cards, and campaign visuals.', path: '/hire' },
];

export const clientTestimonials = [
  { name: 'Arjun Reddy', projectType: 'Commercial Film', text: 'The visuals felt premium from the first frame. The lighting, movement, and edit gave our campaign a real production-house finish.', rating: 5 },
  { name: 'Meera & Karthik', projectType: 'Wedding Film', text: 'Our wedding film feels emotional and cinematic without looking forced. Every important moment was captured beautifully.', rating: 5 },
  { name: 'Saanvi Studio', projectType: 'Product Campaign', text: 'Fast, precise, and tasteful. The product frames and reels were ready for ads and social launch.', rating: 5 },
];

export const gearList = [
  'Cinema camera workflow',
  'Drone cinematography',
  'Gimbal movement',
  'Wireless audio capture',
  'DaVinci Resolve DI',
  'Premiere Pro and After Effects',
  'Product lighting setups',
  'Commercial editing pipeline',
];
