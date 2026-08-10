import React, { memo } from 'react';
import CameraSettingsCard from './CameraSettingsCard';

const renderInline = (text) => String(text).split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
  part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : part
);

const MessageText = ({ children }) => String(children || '').split('\n').map((line, index) => {
  const isBullet = /^[-•]\s+/.test(line);
  return isBullet
    ? <li key={index}>{renderInline(line.replace(/^[-•]\s+/, ''))}</li>
    : <p key={index}>{renderInline(line)}</p>;
});

const CameraMessage = ({ message }) => (
  <div className={`camera-ai-message camera-ai-message--${message.role}`}>
    <div className="camera-ai-message__bubble"><MessageText>{message.content}</MessageText></div>
    {message.settings && <CameraSettingsCard settings={message.settings} />}
  </div>
);

export default memo(CameraMessage);
