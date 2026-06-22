import React from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import SectionVisibilityToggle from './SectionVisibilityToggle';

const SectionOrderList = ({ sections, selectedId, onSelect, onMove, onDelete, onVisibilityChange }) => (
  <div className="space-y-3">
    {sections.map((section, index) => (
      <div key={section.id} className={`rounded-2xl border p-4 ${selectedId === section.id ? 'border-violet-500 bg-violet-500/10' : 'border-slate-800 bg-slate-900'}`}>
        <button type="button" onClick={() => onSelect(section)} className="block w-full text-left">
          <p className="font-semibold text-white">{section.title || section.section_id}</p>
          <p className="mt-1 text-xs text-slate-500">{section.type} | Order {index + 1}</p>
        </button>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <SectionVisibilityToggle enabled={section.enabled} onChange={(enabled) => onVisibilityChange(section, enabled)} />
          <button type="button" disabled={index === 0} onClick={() => onMove(index, -1)} className="rounded-lg border border-slate-700 p-2 text-slate-200 disabled:opacity-30"><ArrowUp size={14} /></button>
          <button type="button" disabled={index === sections.length - 1} onClick={() => onMove(index, 1)} className="rounded-lg border border-slate-700 p-2 text-slate-200 disabled:opacity-30"><ArrowDown size={14} /></button>
          <button type="button" onClick={() => onDelete(section)} className="rounded-lg border border-rose-500/40 p-2 text-rose-100"><Trash2 size={14} /></button>
        </div>
      </div>
    ))}
  </div>
);

export default SectionOrderList;
