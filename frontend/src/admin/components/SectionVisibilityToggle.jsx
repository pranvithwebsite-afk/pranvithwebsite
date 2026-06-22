import React from 'react';

const SectionVisibilityToggle = ({ enabled, onChange }) => (
  <label className="inline-flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-100">
    <input type="checkbox" checked={enabled !== false} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-violet-600" />
    {enabled !== false ? 'Visible' : 'Hidden'}
  </label>
);

export default SectionVisibilityToggle;
