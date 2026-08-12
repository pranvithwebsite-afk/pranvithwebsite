import React from 'react';

const lightSticks = [
  { className: 'hero-light-stick hero-light-stick--wide hero-light-stick--one' },
  { className: 'hero-light-stick hero-light-stick--wide hero-light-stick--two' },
  { className: 'hero-light-stick hero-light-stick--thin hero-light-stick--three' },
  { className: 'hero-light-stick hero-light-stick--thin hero-light-stick--four' },
  { className: 'hero-light-stick hero-light-stick--accent hero-light-stick--five' },
];

const HeroLightSticks = () => (
  <div className="hero-light-sticks" aria-hidden="true">
    <div className="hero-light-sticks__blue-wash" />
    <div className="hero-light-sticks__orange-wash" />
    {lightSticks.map((stick) => (
      <span key={stick.className} className={stick.className} />
    ))}
  </div>
);

export default HeroLightSticks;
