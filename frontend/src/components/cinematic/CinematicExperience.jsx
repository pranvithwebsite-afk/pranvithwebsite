import React from 'react';

const DEFAULT_BRANDS = [
  {
    name: 'Tsharks Media',
    url: 'https://www.youtube.com/@TsharksMediaEntertainment',
    logo: '/assets/tsharks.jpg',
    alt: 'Tsharks Media logo',
  },
  {
    name: 'Husle Lifestyle',
    url: 'https://www.instagram.com/husle__lifestyle/',
    logo: '/assets/husle-lifestyle-profile.jpg',
    alt: 'Husle Lifestyle logo',
  },
  {
    name: 'Think Big with Hussain',
    url: 'https://www.youtube.com/@ThinkBigwithHussain',
    logo: '/assets/think-logo.jpg',
    alt: 'Think Big with Hussain channel portrait',
  },
  {
    name: 'Fixeefy',
    url: 'https://www.instagram.com/fixeefy/',
    logo: '/assets/fixeefy-logo.jpg',
    alt: 'Fixeefy logo',
  },
];

const resolveLogo = (name = '', providedLogo = '') => {
  const s = `${name} ${providedLogo}`.toLowerCase();
  if (s.includes('husle')) return '/assets/husle-lifestyle-profile.jpg';
  if (s.includes('think') || s.includes('hussain')) return '/assets/think-logo.jpg';
  if (s.includes('fixeefy')) return '/assets/fixeefy-logo.jpg';
  if (s.includes('tshark')) return '/assets/tsharks.jpg';
  return providedLogo || '/assets/tsharks.jpg';
};

const CinematicExperience = ({ section }) => {
  const rawEyebrow = section?.data?.eyebrow || section?.subtitle || '';
  const eyebrow =
    rawEyebrow && !rawEyebrow.toLowerCase().includes('journey')
      ? rawEyebrow
      : 'SHOOT EXPERIENCE';

  const rawList =
    (Array.isArray(section?.data?.brands) && section.data.brands.length > 0 && section.data.brands) ||
    (Array.isArray(section?.data?.items) && section.data.items.length > 0 && section.data.items) ||
    (Array.isArray(section?.items) && section.items.length > 0 && section.items) ||
    DEFAULT_BRANDS;

  // Filter out any service cards that might have been mistakenly placed in experience items
  const validBrands = rawList.filter((item) => {
    const title = (item.title || item.name || '').toLowerCase();
    return !title.includes('cinematography') && !title.includes('video editing');
  });

  const brands = (validBrands.length > 0 ? validBrands : DEFAULT_BRANDS).map((item) => {
    const name = item.title || item.name || 'Brand';
    const rawLogo = item.image_url || item.logo || '';
    return {
      name,
      url: item.link_url || item.url || '#',
      logo: resolveLogo(name, rawLogo),
      alt: item.description || item.alt || name,
    };
  });

  return (
    <section className="experience" id="experience">
      <p className="eyebrow">{eyebrow}</p>
      <div className="brands">
        {brands.map((brand, idx) => (
          <a
            key={brand.name || idx}
            href={brand.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src={brand.logo} alt={brand.alt} />
            <span>{brand.name}</span>
          </a>
        ))}
      </div>
    </section>
  );
};

export default CinematicExperience;
