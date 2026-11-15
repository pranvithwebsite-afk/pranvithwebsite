import React from 'react';

const DEFAULT_SERVICES = [
  {
    num: '01',
    title: 'Cinematography & Directing',
    desc: 'Lighting, camera movement and visual direction for brand films, commercial ads and product shoots.',
    image: '/assets/work-3-0.jpg',
  },
  {
    num: '02',
    title: 'Video Editing',
    desc: 'Story cuts, reels, ads and long-form projects across Premiere Pro, After Effects, DaVinci Resolve and Final Cut Pro.',
    image: '/assets/video-editing-service.jpg',
  },
  {
    num: '03',
    title: 'Model & Creator Shoots',
    desc: 'Studio films and high-impact visual content for models, creators and personal brands.',
    image: '/assets/work-2-3.jpg',
  },
  {
    num: '04',
    title: 'Drone & Milestone Films',
    desc: 'Certified aerial perspectives, pre-wedding films, anniversaries and half-saree ceremony films.',
    image: '/assets/drone-service.jpg',
  },
];

const resolveServiceImage = (title = '', idx = 0) => {
  const s = String(title).toLowerCase();
  if (s.includes('model') || s.includes('creator')) return '/assets/work-2-3.jpg';
  if (s.includes('drone') || s.includes('aerial') || s.includes('milestone')) return '/assets/drone-service.jpg';
  if (s.includes('edit') || s.includes('video editing')) return '/assets/video-editing-service.jpg';
  if (s.includes('direct') || s.includes('asst') || s.includes('cinema')) return '/assets/work-3-0.jpg';
  if (s.includes('color') || s.includes('grading')) return '/assets/dasara-running-thumbnail.png';
  const fallbacks = [
    '/assets/work-3-0.jpg',
    '/assets/video-editing-service.jpg',
    '/assets/work-2-3.jpg',
    '/assets/drone-service.jpg',
  ];
  return fallbacks[idx % fallbacks.length];
};

const CinematicServices = ({ section }) => {
  const rawEyebrow = section?.data?.eyebrow || section?.subtitle || '';
  const eyebrow =
    rawEyebrow && !rawEyebrow.toLowerCase().includes('how we can')
      ? rawEyebrow
      : 'CREATIVE · PORTFOLIO · FILMMAKING';
  const rawTitle = section?.title || 'SERVICES';
  const title =
    rawTitle.toLowerCase().includes('from an idea')
      ? 'SERVICES'
      : rawTitle;

  const customItems = section?.data?.items || section?.items;
  const services =
    Array.isArray(customItems) && customItems.length > 0
      ? customItems.map((item, idx) => ({
          num: item.num || item.number || String(idx + 1).padStart(2, '0'),
          title: item.title,
          desc: item.description || item.desc || '',
          image: (() => {
            const t = String(item.title || '').toLowerCase();
            if (t.includes('model') || t.includes('creator')) return '/assets/work-2-3.jpg';
            if (t.includes('edit')) return '/assets/video-editing-service.jpg';
            if (t.includes('drone') || t.includes('aerial') || t.includes('milestone')) return '/assets/drone-service.jpg';
            if (t.includes('cinema') || t.includes('direct')) return '/assets/work-3-0.jpg';
            return resolveServiceImage(item.title, idx);
          })(),
        }))
      : DEFAULT_SERVICES;

  const renderTitle = () => {
    const raw = String(title || 'SERVICES').trim();
    if (raw.includes('\n')) {
      const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
      return lines.map((line, idx) => (
        <span key={idx} className="heading-line">
          {line}
        </span>
      ));
    }
    return <span className="heading-line">{raw}</span>;
  };

  return (
    <section className="services" id="services">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{renderTitle()}</h2>

      <div className="service-list">
        {services.map((s) => (
          <article key={s.num} className="service-card">
            {s.image ? (
              <div className="service-thumb">
                <img src={s.image} alt={s.title} loading="lazy" />
              </div>
            ) : null}
            <div className="service-body">
              <span className="service-num">{s.num}</span>
              <h3>{s.title}</h3>
              <p>{s.desc}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
};

export default CinematicServices;
