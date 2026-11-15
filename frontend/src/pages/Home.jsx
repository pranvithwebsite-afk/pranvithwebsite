import React, { useState, useMemo } from 'react';
import '../styles/cinematic.css';
import CinematicTopbar from '../components/cinematic/CinematicTopbar';
import CinematicHero from '../components/cinematic/CinematicHero';
import CinematicExperience from '../components/cinematic/CinematicExperience';
import CinematicShowreel from '../components/cinematic/CinematicShowreel';
import CinematicPortfolio from '../components/cinematic/CinematicPortfolio';
import CinematicAbout from '../components/cinematic/CinematicAbout';
import CinematicServices from '../components/cinematic/CinematicServices';
import CinematicContact from '../components/cinematic/CinematicContact';
import CinematicFooter from '../components/cinematic/CinematicFooter';
import CinematicModal from '../components/cinematic/CinematicModal';
import { useCmsPage } from '../hooks/useCmsPage';
import { usePublicPageLoading } from '../components/PublicPageLoader';

const DEFAULT_ORDER = [
  'hero',
  'experience',
  'showreel',
  'portfolio',
  'about',
  'services',
  'contact',
];

const findSection = (sections, key) => {
  if (!Array.isArray(sections)) return null;
  return (
    sections.find((s) => s.section_id === key) ||
    sections.find((s) => s.type === key) ||
    sections.find((s) => {
      if (key === 'about' && (s.section_id === 'about_me' || s.type === 'about_me')) return true;
      if (
        key === 'portfolio' &&
        (s.section_id === 'portfolio_highlights' ||
          s.section_id === 'featured-assets' ||
          s.section_id === 'works' ||
          s.type === 'portfolio_grid')
      )
        return true;
      if (key === 'services' && (s.type === 'services_cards' || s.type === 'home_services'))
        return true;
      if (key === 'contact' && (s.section_id === 'cta' || s.type === 'cta')) return true;
      if (key === 'showreel' && (s.section_id === 'selected_moments' || s.type === 'showreel'))
        return true;
      if (key === 'experience' && s.section_id === 'shoot_experience') return true;
      return false;
    })
  );
};

const Home = () => {
  const { page, loading } = useCmsPage('home');
  usePublicPageLoading(loading);

  const [activeModalVideo, setActiveModalVideo] = useState(null);

  const cmsSections = useMemo(() => page?.sections || [], [page?.sections]);

  const sectionOrder = useMemo(() => {
    if (cmsSections.length > 0) {
      const list = cmsSections.map((s) => {
        const id = s.section_id || s.type;
        if (
          id === 'portfolio_highlights' ||
          id === 'portfolio_grid' ||
          id === 'featured-assets' ||
          id === 'works'
        )
          return 'portfolio';
        if (id === 'services_cards' || id === 'home_services') return 'services';
        if (id === 'about_me') return 'about';
        if (id === 'cta') return 'contact';
        if (id === 'selected_moments' || id === 'showreel') return 'showreel';
        if (id === 'shoot_experience') return 'experience';
        return id;
      });

      const seen = new Set();
      const unique = [];
      for (const item of list) {
        if (!seen.has(item) && DEFAULT_ORDER.includes(item)) {
          seen.add(item);
          unique.push(item);
        }
      }
      for (const item of DEFAULT_ORDER) {
        if (!seen.has(item)) unique.push(item);
      }
      return unique;
    }
    return DEFAULT_ORDER;
  }, [cmsSections]);

  return (
    <div className="cinematic-site home-page">
      <CinematicTopbar />

      <main id="main-content">
        {sectionOrder.map((key) => {
          if (key === 'hero') {
            const s = findSection(cmsSections, 'hero');
            if (s && s.enabled === false) return null;
            return (
              <CinematicHero
                key="hero"
                section={s}
                isVideoModalOpen={!!activeModalVideo}
              />
            );
          }

          if (key === 'experience') {
            const s =
              findSection(cmsSections, 'experience') ||
              findSection(cmsSections, 'shoot_experience');
            if (s && s.enabled === false) return null;
            return <CinematicExperience key="experience" section={s} />;
          }

          if (key === 'showreel') {
            const s =
              findSection(cmsSections, 'showreel') ||
              findSection(cmsSections, 'selected_moments');
            if (s && s.enabled === false) return null;
            return (
              <CinematicShowreel
                key="showreel"
                section={s}
                onPlayVideo={setActiveModalVideo}
              />
            );
          }

          if (key === 'portfolio') {
            const s =
              findSection(cmsSections, 'portfolio') ||
              findSection(cmsSections, 'featured-assets') ||
              findSection(cmsSections, 'portfolio_highlights') ||
              findSection(cmsSections, 'portfolio_grid');
            if (s && s.enabled === false) return null;
            return (
              <CinematicPortfolio
                key="portfolio"
                section={s}
                onPlayVideo={setActiveModalVideo}
              />
            );
          }

          if (key === 'about') {
            const s =
              findSection(cmsSections, 'about') || findSection(cmsSections, 'about_me');
            if (s && s.enabled === false) return null;
            return <CinematicAbout key="about" section={s} />;
          }

          if (key === 'services') {
            const s =
              findSection(cmsSections, 'services') ||
              findSection(cmsSections, 'services_cards') ||
              findSection(cmsSections, 'home_services');
            if (s && s.enabled === false) return null;
            return <CinematicServices key="services" section={s} />;
          }

          if (key === 'contact') {
            const s =
              findSection(cmsSections, 'contact') || findSection(cmsSections, 'cta');
            if (s && s.enabled === false) return null;
            return <CinematicContact key="contact" section={s} />;
          }

          return null;
        })}
      </main>

      <CinematicFooter />

      <CinematicModal
        videoData={activeModalVideo}
        onClose={() => setActiveModalVideo(null)}
      />
    </div>
  );
};

export default Home;
