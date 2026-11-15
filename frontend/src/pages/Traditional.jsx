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

const TRADITIONAL_PROJECTS = [
  {
    id: 'shiva-chaithra',
    category: 'traditional',
    categoryLabel: 'TRADITIONAL',
    badge: 'WATCH FILM',
    title: 'Shiva & Chaithra — Wedding Teaser',
    video: 'https://assets.pranvithdop.com/cms/works/videos/2d834525-61fc-4480-893e-afe2bacd9591.mp4',
    thumbnail: '/assets/traditional-00.jpg',
  },
  {
    id: 'pooja-anil',
    category: 'prewedding',
    categoryLabel: 'PREWEDDING',
    badge: 'WATCH FILM',
    title: 'Pooja & Anil Reddy — Pre-Wedding',
    video: 'https://assets.pranvithdop.com/cms/works/videos/f44aae9d-2346-43db-b481-7d9dcb50d2ec.mp4',
    thumbnail: '/assets/traditional-01.jpg',
  },
  {
    id: '25-years-love',
    category: 'traditional',
    categoryLabel: 'TRADITIONAL',
    badge: 'WATCH FILM',
    title: '25 Years of Love — Anniversary Shoot',
    video: 'https://assets.pranvithdop.com/cms/home/videos/2982f503-2a19-421d-bc70-21749012f6be.mp4',
    thumbnail: '/assets/traditional-02.jpg',
  },
  {
    id: 'supriya-rajendra',
    category: 'prewedding',
    categoryLabel: 'PREWEDDING',
    badge: 'WATCH FILM',
    title: 'Supriya & Rajendra Prasad — Pre-Wedding',
    video: 'https://assets.pranvithdop.com/cms/works/videos/cf2956cb-e918-4c91-8e7b-8715931db9c2.mp4',
    thumbnail: '/assets/traditional-03.jpg',
  },
  {
    id: 'nandini-haldi',
    category: 'traditional',
    categoryLabel: 'TRADITIONAL',
    badge: 'WATCH FILM',
    title: 'Nandini’s Golden Haldi Moments',
    video: 'https://assets.pranvithdop.com/cms/works/videos/3a9131a0-9bb3-4769-a4bd-0a540ab7bb98.mp4',
    thumbnail: '/assets/traditional-04.jpg',
  },
  {
    id: 'half-saree',
    category: 'traditional',
    categoryLabel: 'TRADITIONAL',
    badge: 'WATCH FILM',
    title: 'Half Saree Ceremony Highlights',
    video: 'https://assets.pranvithdop.com/cms/works/videos/f2433d16-f90f-4adf-8fa8-b7afb42c6a3a.mp4',
    thumbnail: '/assets/traditional-06.jpg',
  },
  {
    id: 'lahari-reel',
    category: 'traditional',
    categoryLabel: 'TRADITIONAL',
    badge: 'WATCH FILM',
    title: 'Lahari Cinematic Reel',
    video: 'https://assets.pranvithdop.com/cms/works/videos/fe4cbecb-1247-4874-9fdf-c969dfb5de74.mp4',
    thumbnail: '/assets/traditional-07.jpg',
  },
  {
    id: 'durgamata-reel',
    category: 'traditional',
    categoryLabel: 'TRADITIONAL',
    badge: 'WATCH FILM',
    title: 'Durgamata Special Reel',
    video: 'https://assets.pranvithdop.com/cms/works/videos/59a9fdf1-0b69-4842-a5f1-7d7419143cb5.mp4',
    thumbnail: '/assets/traditional-08.jpg',
  },
  {
    id: 'happy-birthday',
    category: 'traditional',
    categoryLabel: 'TRADITIONAL',
    badge: 'WATCH FILM',
    title: 'Happy — 1st Birthday',
    video: 'https://assets.pranvithdop.com/cms/works/videos/069573cf-896f-43a2-9393-9e4b0c4ef41c.mp4',
    thumbnail: '/assets/traditional-09.jpg',
  },
  {
    id: 'davinci-studio',
    category: 'studio',
    categoryLabel: 'STUDIO',
    badge: 'WATCH FILM',
    title: 'DaVinci Color Suite & Studio',
    video: 'https://assets.pranvithdop.com/cms/works/videos/fe4cbecb-1247-4874-9fdf-c969dfb5de74.mp4',
    thumbnail: '/assets/traditional-07.jpg',
  },
  {
    id: 'music-studio',
    category: 'studio',
    categoryLabel: 'STUDIO',
    badge: 'WATCH FILM',
    title: 'Music Video & Studio Frame',
    video: 'https://assets.pranvithdop.com/reels/2026/11/e4ef54a6-51a4-468b-9ad0-29893fca9c97.mp4',
    thumbnail: '/assets/traditional-10.jpg',
  },
];

const FILTERS = [
  { key: 'all', label: 'ALL FILMS' },
  { key: 'traditional', label: 'TRADITIONAL' },
  { key: 'prewedding', label: 'PREWEDDING' },
  { key: 'studio', label: 'STUDIO & POST' },
];

const Traditional = () => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [activeModalVideo, setActiveModalVideo] = useState(null);

  const filteredItems = TRADITIONAL_PROJECTS.filter((item) => {
    if (activeFilter === 'all') return true;
    return item.category === activeFilter;
  });

  return (
    <div className="cinematic-site">
      <CinematicTopbar />

      <main id="main-content">
        <section className="work" id="work">
          <div className="intro">
            <p className="eyebrow">THE WORK</p>
            <h1>Tradition &amp; togetherness</h1>
            <p className="lede">
              Wedding stories, pre-wedding films and celebrations. Explore the quieter, personal side
              of my work.
            </p>
            <p className="hint">Select a film to watch with sound.</p>
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
            <Link className="category-link" to="/works">
              FEATURED WORK ↗
            </Link>
          </div>

          <div className="reel-grid">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className="reel"
                onClick={() =>
                  setActiveModalVideo({
                    src: item.video,
                    title: item.title,
                  })
                }
                data-category={item.category}
              >
                <div className="visual">
                  <img alt={item.title} loading="lazy" src={item.thumbnail} />
                  <span aria-hidden="true" className="play">
                    ▶
                  </span>
                  <span className="label">{item.badge}</span>
                </div>
                <p className="category">{item.categoryLabel}</p>
                <h3>{item.title}</h3>
              </button>
            ))}
          </div>

          <p aria-live="polite" className="sr-only" id="filter-status">
            Showing all {filteredItems.length} films
          </p>
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

export default Traditional;

