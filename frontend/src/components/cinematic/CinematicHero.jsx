import React, { useRef, useState, useEffect } from 'react';

const CinematicHero = ({ section, isVideoModalOpen }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const eyebrow = section?.data?.eyebrow || section?.subtitle || 'HYDERABAD / FILMS & CONTENT';
  const title = section?.title || 'Stories made\nto be seen.';
  const description =
    section?.description ||
    'Cinematography, filmmaking and video editing by Pranvith DOP. Brand stories, creator content and people, captured with intent.';
  const videoUrl = section?.data?.video_url || section?.video_url || '/assets/priority-background.mp4';
  const posterUrl = section?.data?.poster_url || section?.poster_url || '/assets/priority-poster.jpg';
  const clientCredits =
    section?.data?.client_credits ||
    'TSHARKS MEDIA / HUSLE LIFESTYLE / THINK BIG WITH HUSSAIN / FIXEEFY';
  const primaryBtnText = section?.button_text || 'WATCH THE SHOWREEL ↘';
  const primaryBtnLink = section?.button_link || '#showreel';
  const secondaryBtnText = section?.data?.secondary_btn_text || 'START A PROJECT ↗';
  const secondaryBtnLink = section?.data?.secondary_btn_link || 'https://wa.me/919059867883';

  // Respect prefers-reduced-motion
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      if (videoRef.current) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, []);

  // When modal video opens, pause background video; resume when closed
  useEffect(() => {
    if (isVideoModalOpen) {
      if (videoRef.current && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    } else {
      if (isPlaying && videoRef.current && videoRef.current.paused) {
        if (!window.matchMedia || !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
          videoRef.current.play().catch(() => {});
        }
      }
    }
  }, [isVideoModalOpen, isPlaying]);

  const togglePlayback = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {});
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const renderTitle = () => {
    if (title.includes('seen.')) {
      const parts = title.split('seen.');
      return (
        <>
          {parts[0]}
          <em>seen.</em>
          {parts[1] || ''}
        </>
      );
    }
    const lines = title.split('\n');
    return lines.map((line, idx) => (
      <React.Fragment key={idx}>
        {line}
        {idx < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <section className="home-hero" id="home">
      <video
        ref={videoRef}
        id="hero-film"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        poster={posterUrl}
        aria-label="Featured work: Ethosia, Anupama, Dasara remake, product shoot, Husle Lifestyle, Think Big with Hussain"
      >
        <source src={videoUrl} type="video/mp4" />
      </video>

      <div className="hero-shade"></div>

      <div className="hero-content">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{renderTitle()}</h1>
        <p>{description}</p>
        <div className="hero-actions">
          <a className="pill" href={primaryBtnLink}>
            {primaryBtnText}
          </a>
          <a
            className="outline-link"
            href={secondaryBtnLink}
            target="_blank"
            rel="noopener noreferrer"
          >
            {secondaryBtnText}
          </a>
        </div>
        <p className="hero-credits">{clientCredits}</p>
      </div>

      <a className="hero-scroll" href="#showreel">
        SCROLL TO EXPLORE ↓
      </a>

      <button
        id="hero-pause"
        type="button"
        aria-label={isPlaying ? 'Pause background video' : 'Play background video'}
        onClick={togglePlayback}
      >
        {isPlaying ? 'PAUSE FILM Ⅱ' : 'PLAY FILM ▶'}
      </button>
    </section>
  );
};

export default CinematicHero;
