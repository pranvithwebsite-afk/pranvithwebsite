import React from 'react';

const CinematicAbout = ({ section }) => {
  const eyebrow = section?.data?.eyebrow || section?.subtitle || 'BEHIND THE CAMERA';
  const rawHeading = section?.title || 'ABOUT ME';
  const heading =
    rawHeading.toLowerCase().includes('filmmaker at heart')
      ? 'ABOUT ME'
      : rawHeading;
  const name = section?.data?.name || section?.data?.person_name || 'KANDARAPU PRANVITH / PRANVITH DOP';
  const bioPart1 =
    section?.data?.bioPart1 ||
    section?.description ||
    'I’m Pranvith, a filmmaker with 5 years of experience in direction, lighting, color grading, and video editing. I craft cinematic visuals that combine storytelling with technical precision, from short films and commercials to music videos and branded content. My goal is to create work that looks stunning and connects with audiences on an emotional level.';
  const bioPart2 = section?.data?.bioPart2 || '';
  const image = section?.image_url || '/assets/pranvith.jpg';

  const renderHeading = (val) => {
    const raw = String(val || 'ABOUT ME').trim();
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
    return <span className="heading-line">{raw}</span>;
  };

  return (
    <section className="about" id="about">
      <div className="portrait">
        <img
          alt="Pranvith operating a Sony camera on a gimbal"
          loading="lazy"
          src={image}
        />
        <span>ON SET / IN MY ELEMENT</span>
      </div>

      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h2>{renderHeading(heading)}</h2>
        <p className="about-bio">{bioPart1}</p>
        {bioPart2 ? <p className="about-bio">{bioPart2}</p> : null}
        {name ? <p className="name">{name}</p> : null}
      </div>
    </section>
  );
};

export default CinematicAbout;
