import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

const CinematicTopbar = () => {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const isHome = location.pathname === '/';

  const toggleMenu = () => {
    setMenuOpen((prev) => !prev);
  };

  const handleNavClick = (e, targetHash) => {
    setMenuOpen(false);
    if (isHome) {
      const el = document.querySelector(targetHash);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <header className="cine-header">
      <Link className="wordmark" to="/">
        PRANVITH <span>DOP</span>
      </Link>

      <button
        type="button"
        className="menu"
        aria-expanded={menuOpen}
        aria-label="Open navigation"
        onClick={toggleMenu}
      >
        {menuOpen ? 'CLOSE' : 'MENU'}
      </button>

      <nav className={`cine-nav ${menuOpen ? 'open' : ''}`} aria-label="Main navigation">
        {isHome ? (
          <a href="#home" onClick={(e) => handleNavClick(e, '#home')}>
            HOME
          </a>
        ) : (
          <Link to="/" onClick={() => setMenuOpen(false)}>
            HOME
          </Link>
        )}

        <Link to="/works" onClick={() => setMenuOpen(false)}>
          WORK
        </Link>

        <Link to="/assets" onClick={() => setMenuOpen(false)}>
          ASSETS
        </Link>

        {isHome ? (
          <a href="#about" onClick={(e) => handleNavClick(e, '#about')}>
            ABOUT
          </a>
        ) : (
          <Link to="/#about" onClick={() => setMenuOpen(false)}>
            ABOUT
          </Link>
        )}

        {isHome ? (
          <a href="#services" onClick={(e) => handleNavClick(e, '#services')}>
            SERVICES
          </a>
        ) : (
          <Link to="/#services" onClick={() => setMenuOpen(false)}>
            SERVICES
          </Link>
        )}

        {isHome ? (
          <a href="#contact" onClick={(e) => handleNavClick(e, '#contact')}>
            CONTACT
          </a>
        ) : (
          <Link to="/#contact" onClick={() => setMenuOpen(false)}>
            CONTACT
          </Link>
        )}

        <a
          className="pill"
          href="https://wa.me/919059867883"
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setMenuOpen(false)}
        >
          LET’S TALK <span>↗</span>
        </a>
      </nav>
    </header>
  );
};

export default CinematicTopbar;
