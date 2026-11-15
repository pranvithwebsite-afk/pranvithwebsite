import React from 'react';

const CinematicContact = ({ section }) => {
  const eyebrow = section?.data?.eyebrow || section?.subtitle || 'YOUR NEXT PROJECT';
  const title = section?.title || 'Let’s make something\nworth watching.';
  const description =
    section?.description || 'Have a brand, a story or a shoot in mind? Let’s talk about it.';
  const buttonText = section?.button_text || 'START A PROJECT ↗';
  const whatsappUrl =
    section?.button_link || section?.data?.whatsapp_url || 'https://wa.me/919059867883';
  const email = section?.data?.email || 'info@pranvithdop.com';

  const renderTitle = () => {
    const lines = title.split('\n');
    return lines.map((line, idx) => (
      <React.Fragment key={idx}>
        {line}
        {idx < lines.length - 1 && <br />}
      </React.Fragment>
    ));
  };

  return (
    <section className="contact" id="contact">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{renderTitle()}</h2>
      <p>{description}</p>
      <div className="contact-actions">
        <a
          className="pill"
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          {buttonText}
        </a>
        <a className="textlink" href={`mailto:${email}`}>
          SEND AN EMAIL <span>↗</span>
        </a>
      </div>
    </section>
  );
};

export default CinematicContact;
