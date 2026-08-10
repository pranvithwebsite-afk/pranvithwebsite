import React, { memo, useMemo } from 'react';

const fields = [
  ['aperture', 'Aperture'], ['shutter', 'Shutter'], ['iso', 'ISO'],
  ['whiteBalance', 'White Balance'], ['focus', 'Focus'], ['lens', 'Lens'],
  ['frameRate', 'Frame Rate'], ['pictureProfile', 'Picture Profile'],
];

const CameraSettingsCard = ({ settings }) => {
  const visibleFields = useMemo(() => fields.filter(([key]) => settings?.[key]), [settings]);
  if (!settings) return null;
  if (!visibleFields.length && !settings.proTip) return null;
  return (
    <section className="camera-ai-settings-card" aria-label={settings.title || 'Camera settings'}>
      {settings.title && <h4>{settings.title}</h4>}
      <dl>
        {visibleFields.map(([key, label]) => <div key={key}><dt>{label}</dt><dd>{settings[key]}</dd></div>)}
      </dl>
      {settings.proTip && <div className="camera-ai-pro-tip"><span>Pro tip</span><p>{settings.proTip}</p></div>}
    </section>
  );
};

export default memo(CameraSettingsCard);
