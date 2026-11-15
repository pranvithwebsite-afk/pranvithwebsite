import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';

export const HOME_WORKS = [
  {
    id: 'ethosia',
    category: 'model',
    categoryLabel: 'MODEL SHOOTS',
    badge: 'MODEL FILM',
    title: 'Ethosia',
    fullTitle: 'Ethosia — Model film',
    image: '/assets/work-3-0.jpg',
    video: '/assets/proof-3.mp4',
    alt: 'Ethosia model film with dramatic studio lighting',
  },
  {
    id: 'anupama',
    category: 'model',
    categoryLabel: 'MODEL SHOOTS',
    badge: 'STUDIO / BTS',
    title: 'Anupama',
    fullTitle: 'Anupama — Model shoot BTS',
    image: '/assets/work-2-3.jpg',
    video: '/assets/proof-2.mp4',
    alt: 'Anupama model shoot with a red studio backdrop',
  },
  {
    id: 'dasara',
    category: 'cinematic',
    categoryLabel: 'CINEMATIC / ACTION',
    badge: 'CINEMATIC TRAILER REMAKE',
    title: 'Dasara trailer remake',
    fullTitle: 'Dasara — Cinematic trailer remake',
    image: '/assets/dasara-running-thumbnail.png',
    video: 'https://assets.pranvithdop.com/cms/home/videos/7ad248c1-910d-4927-a341-6cbfec8328cc.mp4',
    previewVideo: '/assets/proof-0.mp4',
    alt: 'Dasara cinematic trailer remake',
  },
  {
    id: 'ihusle',
    category: 'product',
    categoryLabel: 'PRODUCT / BEHIND THE SCENES',
    badge: 'PRODUCT SHOOT',
    title: 'iHusle version 2.0',
    fullTitle: 'iHusle version 2.0 — Product shoot',
    image: '/assets/product-thumbnail.jpg',
    video: '/assets/product-shoot.mp4',
    alt: 'Behind the scenes of the iHusle version 2.0 case product shoot',
  },
  {
    id: 'husle-lifestyle',
    category: 'brand',
    categoryLabel: 'COMMERCIAL & BRAND',
    badge: 'BEHIND THE SCENES',
    title: 'Husle Lifestyle',
    fullTitle: 'Husle Lifestyle — Behind the scenes',
    image: '/assets/work-0-1.jpg',
    video: '/assets/proof-0.mp4',
    alt: 'Camera setup during a Husle Lifestyle content shoot',
  },
  {
    id: 'think-big',
    category: 'creator',
    categoryLabel: 'CREATOR CONTENT',
    badge: 'BEHIND THE SCENES',
    title: 'Think Big with Hussain',
    fullTitle: 'Think Big with Hussain — Behind the scenes',
    image: '/assets/work-1-2.jpg',
    video: '/assets/proof-1.mp4',
    alt: 'Hussain on set for a creator shoot',
  },
];

const FILTERS = [
  { key: 'all', label: 'ALL WORK' },
  { key: 'brand', label: 'COMMERCIAL & BRAND' },
  { key: 'creator', label: 'CREATOR CONTENT' },
  { key: 'model', label: 'MODEL SHOOTS' },
  { key: 'product', label: 'PRODUCT' },
  { key: 'cinematic', label: 'CINEMATIC' },
];

const ReelCard = ({ item, onPlayVideo }) => {
  const [isPreviewing, setIsPreviewing] = useState(false);
  const videoRef = useRef(null);

  const handleMouseEnter = () => {
    if (
      window.matchMedia &&
      (window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        !window.matchMedia('(hover: hover)').matches)
    ) {
      return;
    }
    if (videoRef.current) {
      videoRef.current
        .play()
        .then(() => setIsPreviewing(true))
        .catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
    setIsPreviewing(false);
  };

  const handleClick = () => {
    handleMouseLeave();
    if (onPlayVideo) {
      onPlayVideo({
        src: item.video,
        title: item.fullTitle || item.title,
      });
    }
  };

  return (
    <button
      type="button"
      className={`reel ${isPreviewing ? 'previewing' : ''}`}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      data-category={item.category}
    >
      <div className="visual">
        <img alt={item.alt} loading="lazy" src={item.image} />
        {item.video && (
          <video
            ref={videoRef}
            loop
            muted
            playsInline
            preload="none"
            poster={item.image}
          >
            <source src={item.previewVideo || item.video} type="video/mp4" />
          </video>
        )}
        <span aria-hidden="true" className="play">
          ▶
        </span>
        <span className="label">{item.badge}</span>
      </div>
      <p className="category">{item.categoryLabel}</p>
      <h3>{item.title}</h3>
    </button>
  );
};

const CinematicPortfolio = ({ section, onPlayVideo }) => {
  const [activeFilter, setActiveFilter] = useState('all');

  const eyebrow = section?.data?.eyebrow || section?.subtitle || 'A SELECTION OF VISUAL STORIES';
  const title = section?.title || 'PORTFOLIO\nHIGHLIGHTS';
  const description =
    section?.description ||
    'Selected films, commercial visuals, drone sequences, and edits from the PranvithDOP portfolio.';
  const hint =
    section?.data?.hint || 'Hover to preview. Select a film to watch with sound.';
  const fullPortfolioText = section?.button_text || 'VIEW ALL WORKS';
  const fullPortfolioLink = section?.button_link || '/works';

  const renderHeading = (val) => {
    const raw = String(val || 'PORTFOLIO\nHIGHLIGHTS').trim();
    if (raw.includes('\n')) {
      const parts = raw
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean);
      return parts.map((part, idx) => (
        <span key={idx} className="heading-line">
          {part}
        </span>
      ));
    }
    if (/portfolio\s+highlights/i.test(raw)) {
      return (
        <>
          <span className="heading-line">PORTFOLIO</span>
          <span className="heading-line">HIGHLIGHTS</span>
        </>
      );
    }
    if (/reels\s*&\s*films/i.test(raw)) {
      return (
        <>
          <span className="heading-line">REELS &amp;</span>
          <span className="heading-line">FILMS</span>
        </>
      );
    }
    return <span className="heading-line">{raw}</span>;
  };

  const normalizeCat = (cat) => {
    const s = String(cat || '').toLowerCase();
    if (s.includes('brand') || s.includes('commercial')) return 'brand';
    if (s.includes('creator')) return 'creator';
    if (s.includes('model')) return 'model';
    if (s.includes('product')) return 'product';
    if (s.includes('cinematic') || s.includes('action')) return 'cinematic';
    return s || 'brand';
  };

  const customItems = section?.data?.items || section?.items;
  const projects =
    Array.isArray(customItems) && customItems.length > 0
      ? customItems.map((item, idx) => ({
          id: item.id || `custom-${idx}`,
          category: normalizeCat(item.category),
          categoryLabel:
            item.categoryLabel ||
            (item.category ? item.category.toUpperCase() : 'FEATURED'),
          badge: item.badge || 'FILM',
          title: item.title,
          fullTitle: item.fullTitle || item.title,
          image:
            item.thumbnail_image_url ||
            item.thumbnail_url ||
            item.image ||
            '/assets/work-0-1.jpg',
          video: item.video_url || item.video || '/assets/proof-0.mp4',
          alt: item.title,
        }))
      : HOME_WORKS;

  const filteredItems = projects
    .filter((item) => {
      const s = `${item.title || ''} ${item.category || ''} ${item.badge || ''}`.toLowerCase();
      if (s.includes('traditional') || s.includes('prewedding') || s.includes('wedding') || s.includes('haldi') || s.includes('saree')) return false;
      return true;
    })
    .filter((item) => {
      if (activeFilter === 'all') return true;
      return normalizeCat(item.category) === activeFilter;
    });

  return (
    <>
      <section className="work" id="work">
        <div className="intro">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{renderHeading(title)}</h2>
          <p className="lede">{description}</p>
          <p className="hint">{hint}</p>
        </div>

        <Link className="textlink gallery-link" to={fullPortfolioLink}>
          {fullPortfolioText}
        </Link>

        <div aria-label="Filter work" className="filters" role="group">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className={activeFilter === f.key ? 'active' : ''}
              aria-pressed={activeFilter === f.key}
              onClick={() => setActiveFilter(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="reel-grid">
          {filteredItems.map((item) => (
            <ReelCard key={item.id} item={item} onPlayVideo={onPlayVideo} />
          ))}
        </div>

        <p aria-live="polite" className="sr-only" id="filter-status">
          Showing {filteredItems.length} projects
        </p>
      </section>

      {/* WORK EXPERIENCE */}
      <section className="films work-experience-section" id="films">
        <div className="work-experience-banner">
          <div className="work-experience-content">
            <div className="work-experience-header">
              <h2>
                <span className="heading-line">WORK</span>
                <span className="heading-line">EXPERIENCE</span>
              </h2>
              <p className="work-experience-kicker">
                OVER THE PAST 5<br />YEARS...
              </p>
            </div>

            <ul className="work-experience-list">
              <li>Directed 7 indie films and 1 advertisement</li>
              <li>Collaborated on ads, music videos, and short films</li>
              <li>Assisted on set to ensure smooth production</li>
              <li>Managed professional lighting setups for cinematic visuals</li>
              <li>Edited videos with strong storytelling and pacing</li>
              <li>Performed DI color grading for polished, cinematic looks</li>
            </ul>
          </div>
          <div className="work-experience-visual">
            <img
              src="/assets/work-experience-hand.jpg"
              alt="Pranvith on set directing and managing lighting setups"
              loading="lazy"
            />
          </div>
        </div>

        {/* Featured Interview Story */}
        <div className="films-story-wrapper">
          <div className="section-heading">
            <div>
              <p className="eyebrow">LONGER STORIES</p>
              <h2>Interviews &amp; films</h2>
            </div>
            <p>Shoot experience with stories that take their time.</p>
          </div>

          <a
            className="landscape"
            href="https://youtu.be/p-YhZ2GgCE8"
            rel="noopener noreferrer"
            target="_blank"
          >
            <img
              alt="Jabardasth Shaking Seshu interview with MC Maikil on Tsharks Media"
              loading="lazy"
              src="/assets/shaking-seshu-cover.png"
            />
            <span aria-hidden="true" className="play">
              ▶
            </span>
            <div>
              <p className="category">TSHARKS MEDIA &amp; ENTERTAINMENT</p>
              <h3>Shaking Seshu with MC Maikil</h3>
              <span>WATCH ON YOUTUBE ↗</span>
            </div>
          </a>
        </div>
      </section>
    </>
  );
};

export default CinematicPortfolio;
