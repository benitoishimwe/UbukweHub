import React, { useState, useEffect, useRef } from 'react';
import { plannerAPI } from '../../services/api';
import { Loader2, Upload, Trash2, Pencil, CheckCircle, Palette } from 'lucide-react';

const BASE_URL = process.env.REACT_APP_BACKEND_URL;
const THEMES = ['Modern','Rustic','Beach','Garden','Traditional','Elegant','Bohemian','Minimalist','Glamorous','Vintage'];

export default function ThemeTab({ plan, onPlanUpdate }) {
  const [assets, setAssets]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [uploading, setUploading] = useState(false);
  const [themeForm, setThemeForm] = useState({ theme: plan.theme || 'Modern', primary_color: plan.primaryColor || '#C9A84C', secondary_color: plan.secondaryColor || '#E8A4B8' });
  const [saving, setSaving]     = useState(false);
  const [editCaption, setEditCaption] = useState(null); // assetId | null
  const [caption, setCaption]   = useState('');
  const fileRef = useRef();

  const loadAssets = async () => {
    const res = await plannerAPI.listAssets(plan.planId);
    setAssets(res.data);
    setLoading(false);
  };

  useEffect(() => { loadAssets(); }, [plan.planId]);

  const saveTheme = async () => {
    setSaving(true);
    try {
      const res = await plannerAPI.update(plan.planId, themeForm);
      onPlanUpdate(res.data);
    } catch(e) { alert('Save failed'); }
    finally { setSaving(false); }
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    for (const file of files) {
      const fd = new FormData(); fd.append('file', file);
      try { await plannerAPI.uploadAsset(plan.planId, fd); }
      catch { alert('Upload failed for ' + file.name); }
    }
    await loadAssets();
    setUploading(false);
    e.target.value = '';
  };

  const del = async (assetId) => {
    if (!window.confirm('Remove this image?')) return;
    await plannerAPI.deleteAsset(plan.planId, assetId);
    setAssets(a => a.filter(x => x.assetId !== assetId));
  };

  const saveCaption = async (assetId) => {
    await plannerAPI.updateAsset(plan.planId, assetId, { caption });
    setAssets(a => a.map(x => x.assetId === assetId ? { ...x, caption } : x));
    setEditCaption(null);
  };

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-[#C9A84C]" size={28} /></div>;

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto space-y-6">
      {/* Theme settings */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-[#2D2D2D] mb-4 flex items-center gap-2"><Palette size={16} className="text-[#C9A84C]" /> Theme & Colors</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#2D2D2D] mb-1">Style</label>
            <select value={themeForm.theme} onChange={e => setThemeForm(f => ({...f, theme: e.target.value}))} className="input-field">
              {THEMES.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#2D2D2D] mb-1">Primary Color</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={themeForm.primary_color} onChange={e => setThemeForm(f => ({...f, primary_color: e.target.value}))}
                className="w-10 h-10 rounded-lg border border-[#EBE5DB] cursor-pointer p-0.5" />
              <input type="text" value={themeForm.primary_color} onChange={e => setThemeForm(f => ({...f, primary_color: e.target.value}))}
                className="input-field flex-1 font-mono text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#2D2D2D] mb-1">Secondary Color</label>
            <div className="flex gap-2 items-center">
              <input type="color" value={themeForm.secondary_color} onChange={e => setThemeForm(f => ({...f, secondary_color: e.target.value}))}
                className="w-10 h-10 rounded-lg border border-[#EBE5DB] cursor-pointer p-0.5" />
              <input type="text" value={themeForm.secondary_color} onChange={e => setThemeForm(f => ({...f, secondary_color: e.target.value}))}
                className="input-field flex-1 font-mono text-sm" />
            </div>
          </div>
        </div>

        {/* Color preview */}
        <div className="mt-4 p-4 rounded-xl border border-[#EBE5DB] flex items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-[#5C5C5C] mb-2 font-semibold">Preview</p>
            <div className="flex gap-2">
              <button className="px-4 py-2 rounded-xl text-white text-sm font-semibold" style={{backgroundColor: themeForm.primary_color}}>
                Save the Date
              </button>
              <div className="px-4 py-2 rounded-xl text-sm font-semibold" style={{backgroundColor: themeForm.secondary_color + '30', color: themeForm.secondary_color}}>
                {themeForm.theme}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-8 h-8 rounded-full shadow-md" style={{backgroundColor: themeForm.primary_color}} />
            <div className="w-8 h-8 rounded-full shadow-md" style={{backgroundColor: themeForm.secondary_color}} />
          </div>
        </div>

        <button onClick={saveTheme} disabled={saving} className="mt-4 px-5 py-2.5 bg-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:bg-[#b8933d] disabled:opacity-50 flex items-center gap-2">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />} Save Theme
        </button>
      </div>

      {/* Mood board */}
      <div className="bg-white rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-[#2D2D2D]">Mood Board</h3>
          <label className="flex items-center gap-1.5 px-4 py-2 bg-[#C9A84C] text-white rounded-xl text-sm font-semibold hover:bg-[#b8933d] cursor-pointer">
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            Add Images
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} />
          </label>
        </div>

        {assets.length === 0 ? (
          <div className="border-2 border-dashed border-[#C9A84C40] rounded-2xl p-12 text-center cursor-pointer hover:border-[#C9A84C] transition-colors"
            onClick={() => fileRef.current?.click()}>
            <Upload className="text-[#C9A84C] mx-auto mb-2" size={28} />
            <p className="text-[#5C5C5C] text-sm">Click to upload inspiration images</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {assets.map(a => (
              <div key={a.assetId} className="group relative">
                <div className="aspect-square rounded-xl overflow-hidden bg-[#F5F0E8]">
                  <img src={`${BASE_URL}${a.imageUrl}`} alt={a.caption || ''} className="w-full h-full object-cover" loading="lazy" />
                </div>
                <div className="absolute inset-0 rounded-xl bg-black/0 group-hover:bg-black/30 transition-all flex items-end">
                  <div className="w-full p-2 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-end">
                    <button onClick={() => { setEditCaption(a.assetId); setCaption(a.caption || ''); }}
                      className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center"><Pencil size={12} className="text-[#2D2D2D]" /></button>
                    <button onClick={() => del(a.assetId)}
                      className="w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center"><Trash2 size={12} className="text-[#D9534F]" /></button>
                  </div>
                </div>
                {editCaption === a.assetId ? (
                  <div className="mt-1 flex gap-1">
                    <input value={caption} onChange={e => setCaption(e.target.value)}
                      className="flex-1 text-xs border border-[#EBE5DB] rounded-lg px-2 py-1 focus:outline-none" placeholder="Caption…" />
                    <button onClick={() => saveCaption(a.assetId)} className="px-2 py-1 bg-[#C9A84C] text-white rounded-lg text-xs">✓</button>
                  </div>
                ) : a.caption ? (
                  <p className="text-xs text-[#5C5C5C] mt-1 text-center truncate">{a.caption}</p>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
