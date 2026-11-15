import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import '../styles/cinematic.css';
import CinematicTopbar from '../components/cinematic/CinematicTopbar';
import CinematicExperience from '../components/cinematic/CinematicExperience';
import CinematicAbout from '../components/cinematic/CinematicAbout';
import CinematicServices from '../components/cinematic/CinematicServices';
import CinematicContact from '../components/cinematic/CinematicContact';
import CinematicFooter from '../components/cinematic/CinematicFooter';
import CinematicModal from '../components/cinematic/CinematicModal';
import { HOME_WORKS } from '../components/cinematic/CinematicPortfolio';

const FILTERS = [
  { key: 'all', label: 'ALL WORK' },
  { key: 'brand', label: 'COMMERCIAL & BRAND' },
  { key: 'creator', label: 'CREATOR CONTENT' },
  { key: 'model', label: 'MODEL SHOOTS' },
  { key: 'product', label: 'PRODUCT' },
  { key: 'cinematic', label: 'CINEMATIC' },
];

const Works = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeModalVideo, setActiveModalVideo] = useState(null);

  const filteredItems = HOME_WORKS.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.category === activeFilter;
  });

  return (
    <div className="cinematic-site">
      <CinematicTopbar />

      <main id="main-content">
        <section className="work" id="work">
          <div className="intro">
            <p className="eyebrow">A SELECTION OF VISUAL STORIES</p>
            <h1>
              <span className="heading-line">PORTFOLIO</span>
              <span className="heading-line">HIGHLIGHTS</span>
            </h1>
            <p className="lede">
              Selected films, commercial visuals, drone sequences, and edits from the PranvithDOP
              portfolio.
            </p>
            <p className="hint">Hover to preview. Select a film to watch with sound.</p>
          </div>

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
            {filteredItems.map((item) => {
              return (
                <button
                  key={item.id}
                  type="button"
                  className="reel"
                  onClick={() =>
                    setActiveModalVideo({
                      src: item.video,
                      title: item.fullTitle || item.title,
                    })
                  }
                  data-category={item.category}
                >
                  <div className="visual">
                    <img alt={item.alt} loading="lazy" src={item.image} />
                    {item.video && (
                      <video
                        loop
                        muted
                        playsInline
                        preload="none"
                        poster={item.image}
                        onMouseEnter={(e) => {
                          e.currentTarget.play().catch(() => {});
                          e.currentTarget.parentElement.parentElement.classList.add('previewing');
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.pause();
                          e.currentTarget.currentTime = 0;
                          e.currentTarget.parentElement.parentElement.classList.remove('previewing');
                        }}
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
            })}
          </div>

          <p aria-live="polite" className="sr-only" id="filter-status">
            Showing {filteredItems.length} projects
          </p>
        </section>

        {/* Longer Stories */}
        <section className="films">
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
        </section>

        <CinematicExperience />
        <CinematicAbout />
        <CinematicServices />
        <CinematicContact />
      </main>

      <CinematicFooter />

      <CinematicModal
        videoData={activeModalVideo}
        onClose={() => setActiveModalVideo(null)}
      />
    </div>
  );
};

export default Works;
