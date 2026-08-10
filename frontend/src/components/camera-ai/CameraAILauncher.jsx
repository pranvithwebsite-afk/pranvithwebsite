import React, { memo } from 'react';
import CameraOrb from './CameraOrb';

const CameraAILauncher = ({ onClick, open }) => (
  <div className="camera-ai-launcher-wrap">
    <button type="button" className="camera-ai-launcher" onClick={onClick} aria-label={open ? 'Close Camera AI' : 'Open Camera AI'} aria-expanded={open}>
      <CameraOrb active={!open} />
    </button>
    <span className="camera-ai-launcher-label">Ask Camera AI</span>
  </div>
);

export default memo(CameraAILauncher);
