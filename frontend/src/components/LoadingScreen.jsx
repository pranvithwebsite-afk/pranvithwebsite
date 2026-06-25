import React from 'react';

const LoadingScreen = ({ isLeaving = false }) => (
  <div
    className={`home-loading-screen${isLeaving ? ' home-loading-screen--leaving' : ''}`}
    aria-hidden="true"
  >
    <div className="home-loading-screen__mark">
      <span />
      <span />
      <span />
    </div>
  </div>
);

export default LoadingScreen;
