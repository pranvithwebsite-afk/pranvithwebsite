import React from 'react';
import CmsSectionRenderer from './CmsSectionRenderer';

const CmsPageRenderer = ({ page, sectionChildren = {}, beforeSections = null, afterSections = null }) => {
  const sections = Array.isArray(page?.sections) ? page.sections : [];
  return (
    <>
      {beforeSections}
      {sections.map((section) => (
        <CmsSectionRenderer key={section.id || section.section_id} section={section}>
          {sectionChildren[section.section_id] || sectionChildren[section.type] || null}
        </CmsSectionRenderer>
      ))}
      {afterSections}
    </>
  );
};

export default CmsPageRenderer;
