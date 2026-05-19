import React from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

/**
 * Reusable empty state component.
 *
 * Props:
 *  icon      — Lucide icon component
 *  title     — heading text
 *  desc      — supporting paragraph
 *  action    — { label, onClick } or { label, to } for a CTA button
 *  secondary — { label, onClick } or { label, to } for a secondary link
 *  size      — 'sm' | 'md' (default 'md')
 */
export default function EmptyState({ icon: Icon, title, desc, action, secondary, size = 'md' }) {
  const iconSize = size === 'sm' ? 'w-10 h-10' : 'w-14 h-14';
  const padding  = size === 'sm' ? 'py-10 px-4' : 'py-16 px-6';

  const renderCta = (btn, primary = true) => {
    if (!btn) return null;
    const base = primary
      ? 'btn-primary px-5 py-2.5 text-sm inline-flex items-center gap-2'
      : 'text-sm text-[#0F4C5C] hover:underline font-medium';
    if (btn.to) return <Link to={btn.to} className={base}>{primary && <Plus size={15} />}{btn.label}</Link>;
    return <button onClick={btn.onClick} className={base}>{primary && <Plus size={15} />}{btn.label}</button>;
  };

  return (
    <div className={`empty-state ${padding} text-center`}>
      {Icon && (
        <div className={`${iconSize} rounded-2xl bg-[#E8F4F8] flex items-center justify-center mx-auto mb-5`}>
          <Icon size={size === 'sm' ? 20 : 26} className="text-[#0F4C5C]" strokeWidth={1.5} />
        </div>
      )}
      <h3 className="font-semibold text-[#111827] text-base mb-2" style={{fontFamily:'Poppins,sans-serif'}}>{title}</h3>
      {desc && <p className="text-sm text-[#6B7280] max-w-sm mx-auto leading-relaxed">{desc}</p>}
      {(action || secondary) && (
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-6">
          {renderCta(action, true)}
          {renderCta(secondary, false)}
        </div>
      )}
    </div>
  );
}
