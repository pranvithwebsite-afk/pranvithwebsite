import React from 'react';

const CinematicShowreel = ({ section, onPlayVideo }) => {
  const eyebrow = section?.data?.eyebrow || section?.subtitle || '01 / SELECTED MOMENTS';
  const title = section?.title || 'On set.\nThrough my lens.';
  const description =
    section?.description ||
    'Model films, a cinematic remake, product work and creator shoots, in one selected cut.';
  const videoUrl =
    section?.data?.video_url || section?.video_url || '/assets/priority-background.mp4';
  const posterUrl =
    section?.data?.poster_url || section?.poster_url || '/assets/priority-poster.jpg';
  const caption = section?.data?.caption || 'BRAND / CREATOR / MODEL SHOOTS';
  const playBadge = section?.data?.play_badge || 'PLAY SELECTED MOMENTS';

  const handlePlay = () => {
    if (onPlayVideo) {
      onPlayVideo({
        src: videoUrl,
        title: 'Pranvith DOP — Selected moments',
      });
    }
  };

  const renderTitle = () => {
    const lines = title.split('\n');
    return lines.map((line, idx) => (
      <React.Fragment key={idx}>
        {line}
        {idx < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <section className="home-showreel" id="showreel">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{renderTitle()}</h2>
        </div>
        <p>{description}</p>
      </div>

      <button
        type="button"
        className="reel showreel-cover"
        onClick={handlePlay}
        aria-label="Play selected moments showreel"
      >
        <img alt="Selected moments from Pranvith’s shoots" src={posterUrl} />
        <span className="showreel-play">
          ▶ <span>{playBadge}</span>
        </span>
        <span className="showreel-caption">{caption}</span>
      </button>
    </section>
  );
};

export default CinematicShowreel;
