import React from 'react';

const CinematicVisionMission = ({ section }) => {
  const visionKicker = section?.data?.vision_kicker || 'A little about the filmmaker';
  const visionTitle = section?.data?.vision_title || 'Vision';
  const visionText =
    section?.data?.vision_text ||
    'I believe every frame has a feeling. My approach brings together light, composition and movement to tell stories with intention.';

  const missionKicker = section?.data?.mission_kicker || 'What drives the work';
  const missionTitle = section?.data?.mission_title || 'Mission';
  const missionText =
    section?.data?.mission_text ||
    'To create thoughtful visual stories, collaborate with passionate people and make every project feel distinct and memorable.';

  return (
    <section id="vision-mission" className="cine-section cine-reveal" style={{ paddingTop: '20px' }}>
      <div
        style={{
          borderTop: '1px solid var(--cine-line)',
          borderBottom: '1px solid var(--cine-line)',
          padding: '60px 0',
        }}
      >
        <div className="cine-split-copy" style={{ padding: 0 }}>
          <div>
            <div className="cine-kicker">{visionKicker}</div>
            <h3 className="cine-display">{visionTitle}</h3>
            <p className="cine-body" style={{ maxWidth: '460px' }}>
              {visionText}
            </p>
          </div>

          <div>
            <div className="cine-kicker">{missionKicker}</div>
            <h3 className="cine-display">{missionTitle}</h3>
            <p className="cine-body" style={{ maxWidth: '460px' }}>
              {missionText}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CinematicVisionMission;

