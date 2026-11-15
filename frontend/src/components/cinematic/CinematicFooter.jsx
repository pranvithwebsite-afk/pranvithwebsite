import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const CinematicFooter = () => {
  const currentYear = new Date().getFullYear();
  const location = useLocation();
  const isHome = location.pathname === '/';

  const handleNavClick = (e, hash) => {
    if (isHome) {
      const el = document.querySelector(hash);
      if (el) {
        e.preventDefault();
        el.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <footer className="cine-footer">
      <div>
        <Link className="wordmark" to="/">
          PRANVITH <span>DOP</span>
        </Link>
        <p>
          Cinematography, filmmaking and video editing.
          <br />
          Hyderabad, India.
        </p>
      </div>

      <div>
        <h4>EXPLORE</h4>
        <Link to="/works">Work</Link>
        {isHome ? (
          <a href="#about" onClick={(e) => handleNavClick(e, '#about')}>
            About
          </a>
        ) : (
          <Link to="/#about">About</Link>
        )}
        {isHome ? (
          <a href="#services" onClick={(e) => handleNavClick(e, '#services')}>
            Services
          </a>
        ) : (
          <Link to="/#services">Services</Link>
        )}
        <Link to="/assets">Courses &amp; assets ↗</Link>
      </div>

      <div>
        <h4>GET IN TOUCH</h4>
        <a href="mailto:info@pranvithdop.com">info@pranvithdop.com</a>
        <a href="tel:+919059867883">+91 90598 67883</a>
        <a
          href="https://www.instagram.com/pranvith_dop/"
          rel="noopener noreferrer"
          target="_blank"
        >
          Instagram ↗
        </a>
      </div>

      <p className="copyright">© {currentYear} PRANVITH DOP</p>
    </footer>
  );
};

export default CinematicFooter;
