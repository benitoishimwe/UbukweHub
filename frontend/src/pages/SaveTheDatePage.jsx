import React, { useState, useEffect } from 'react';
import { Plus, Sparkles, Download, Palette, Image, Type, Eye } from 'lucide-react';
import { toast } from 'sonner';
import SubscriptionGate from '../components/subscription/SubscriptionGate';
import api from '../services/api';

const TEMPLATES = [
  { id: 'elegant-floral', name: 'Elegant Floral', color: '#C9A84C', emoji: '🌸' },
  { id: 'modern-minimal', name: 'Modern Minimal', color: '#2D2D2D', emoji: '◼' },
  { id: 'rustic-garden', name: 'Rustic Garden', color: '#4A7C59', emoji: '🌿' },
  { id: 'rwandan-tradition', name: 'Rwandan Traditional', color: '#D4A373', emoji: '🎨' },
  { id: 'corporate-clean', name: 'Corporate Clean', color: '#6B8E9B', emoji: '💼' },
];

function DesignCard({ design, onGenerate, onDelete }) {
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await onGenerate(design.design_id || design.designId);
      toast.success('AI design generated!');
    } catch {
      toast.error('Generation failed, please try again');
    } finally {
      setGenerating(false);
    }
  };

  const imageUrl = design.generated_image_url || design.generatedImageUrl;
  const title = design.title;
  const template = TEMPLATES.find(t => t.id === (design.template_id || design.templateId));

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-[0_4px_20px_rgb(0,0,0,0.04)]">
      <div
        className="h-48 relative flex items-center justify-center"
        style={{ background: imageUrl ? 'none' : `linear-gradient(135deg, ${template?.color || '#C9A84C'}20, ${template?.color || '#C9A84C'}40)` }}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="text-center">
            <div className="text-5xl mb-2">{template?.emoji || '✨'}</div>
            <p className="text-xs text-[#5C5C5C]">{template?.name || 'Custom'}</p>
          </div>
        )}
        <span className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
          design.status === 'published' ? 'bg-[#4A7C59] text-white' : 'bg-[#EBE5DB] text-[#5C5C5C]'
        }`}>
          {design.status}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-semibold text-[#2D2D2D] text-sm mb-3">{title}</h3>
        <div className="flex gap-2">
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-[#C9A84C] text-white rounded-full text-xs font-semibold hover:bg-[#9A7D2E] transition-colors disabled:opacity-50"
          >
            <Sparkles size={12} />
            {generating ? 'Generating...' : 'Regenerate'}
          </button>
          {imageUrl && (
            <a href={imageUrl} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 border border-[#EBE5DB] rounded-full text-xs text-[#5C5C5C] hover:border-[#C9A84C]">
              <Download size={12} /> Save
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function NewDesignModal({ onClose, onCreated }) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: '', template_id: 'elegant-floral',
    text_content: { headline: '', subtext: '', event_date: '', venue: '', rsvp_info: '' },
    style: { primary_color: '#C9A84C', layout: 'centered' }
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const res = await api.post('/save-the-date', form);
      const designId = res.data.design_id || res.data.designId;
      // Auto-generate after creation
      await api.post(`/save-the-date/${designId}/generate`);
      const updated = await api.get(`/save-the-date/${designId}`);
      onCreated(updated.data);
      onClose();
      toast.success('Design created and AI generated!');
    } catch {
      toast.error('Failed to create design');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display, serif' }}>
            New Save-the-Date
          </h2>
          <div className="flex gap-1">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 w-8 rounded-full transition-colors ${step >= s ? 'bg-[#C9A84C]' : 'bg-[#EBE5DB]'}`} />
            ))}
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Design Title</label>
              <input
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g., Amina & John's Wedding"
                className="w-full px-4 py-2.5 rounded-xl border border-[#EBE5DB] text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C40]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-2">Choose Template</label>
              <div className="grid grid-cols-3 gap-2">
                {TEMPLATES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setForm(f => ({ ...f, template_id: t.id }))}
                    className={`p-3 rounded-xl border-2 text-center transition-all ${
                      form.template_id === t.id ? 'border-[#C9A84C] bg-[#C9A84C08]' : 'border-[#EBE5DB] hover:border-[#C9A84C80]'
                    }`}
                  >
                    <div className="text-2xl mb-1">{t.emoji}</div>
                    <p className="text-[10px] text-[#5C5C5C] leading-tight">{t.name}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-[#5C5C5C] mb-2">Add event details — AI will craft the wording for you.</p>
            {[
              { key: 'headline', label: 'Headline', placeholder: 'e.g., Save the Date!' },
              { key: 'event_date', label: 'Event Date', placeholder: 'e.g., 15 March 2026' },
              { key: 'venue', label: 'Venue', placeholder: 'e.g., Kigali Convention Centre' },
              { key: 'rsvp_info', label: 'RSVP Info', placeholder: 'e.g., RSVP by 1 February' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-[#2D2D2D] mb-1">{label}</label>
                <input
                  value={form.text_content[key]}
                  onChange={e => setForm(f => ({ ...f, text_content: { ...f.text_content, [key]: e.target.value } }))}
                  placeholder={placeholder}
                  className="w-full px-3 py-2 rounded-xl border border-[#EBE5DB] text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C40]"
                />
              </div>
            ))}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm text-[#5C5C5C]">Customize the style of your design.</p>
            <div>
              <label className="block text-xs font-medium text-[#2D2D2D] mb-2">Primary Color</label>
              <div className="flex gap-2">
                {['#C9A84C', '#E8A4B8', '#4A7C59', '#6B8E9B', '#2D2D2D', '#D4A373'].map(color => (
                  <button
                    key={color}
                    onClick={() => setForm(f => ({ ...f, style: { ...f.style, primary_color: color } }))}
                    className={`w-8 h-8 rounded-full border-2 transition-all ${form.style.primary_color === color ? 'border-[#2D2D2D] scale-110' : 'border-transparent'}`}
                    style={{ background: color }}
                  />
                ))}
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[#F5F0E8] text-center">
              <p className="text-sm font-medium text-[#2D2D2D]">AI will generate the final design</p>
              <p className="text-xs text-[#5C5C5C] mt-1">Using Claude for wording and DALL-E for background imagery</p>
            </div>
          </div>
        )}

        <div className="flex gap-3 mt-6">
          {step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-1 py-2.5 rounded-full border border-[#EBE5DB] text-sm text-[#5C5C5C]">
              Back
            </button>
          )}
          {step < 3 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={step === 1 && !form.title}
              className="flex-1 py-2.5 rounded-full bg-[#C9A84C] text-white text-sm font-semibold hover:bg-[#9A7D2E] disabled:opacity-40"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex-1 py-2.5 rounded-full bg-[#C9A84C] text-white text-sm font-semibold hover:bg-[#9A7D2E] disabled:opacity-40 flex items-center justify-center gap-2"
            >
              <Sparkles size={14} />
              {loading ? 'Creating with AI...' : 'Create & Generate'}
            </button>
          )}
          {step === 1 && (
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-full border border-[#EBE5DB] text-sm text-[#5C5C5C]">
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SaveTheDatePage() {
  const [designs, setDesigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchDesigns = async () => {
    setLoading(true);
    try {
      const res = await api.get('/save-the-date');
      setDesigns(res.data.content || res.data || []);
    } catch { setDesigns([]); }
    finally { setLoading(false); }
  };

  const handleGenerate = async (designId) => {
    const res = await api.post(`/save-the-date/${designId}/generate`);
    setDesigns(prev => prev.map(d =>
      (d.design_id || d.designId) === designId ? res.data : d
    ));
  };

  useEffect(() => { fetchDesigns(); }, []);

  const PageContent = () => (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Save-the-Date Studio
          </h1>
          <p className="text-[#5C5C5C] mt-1">Create AI-powered invitation designs in minutes</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#C9A84C] text-white rounded-full font-semibold text-sm hover:bg-[#9A7D2E] transition-colors shadow-md"
        >
          <Plus size={16} /> New Design
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(3).fill(0).map((_, i) => <div key={i} className="bg-white rounded-2xl h-64 animate-pulse" />)}
        </div>
      ) : designs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl">
          <div className="text-6xl mb-4">🌸</div>
          <h3 className="text-xl font-bold text-[#2D2D2D] mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            No designs yet
          </h3>
          <p className="text-[#5C5C5C] mb-6">Create your first AI-powered save-the-date design</p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-[#C9A84C] text-white rounded-full font-semibold hover:bg-[#9A7D2E] transition-colors"
          >
            Create First Design
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {designs.map(d => (
            <DesignCard
              key={d.design_id || d.designId}
              design={d}
              onGenerate={handleGenerate}
              onDelete={() => {}}
            />
          ))}
        </div>
      )}

      {showModal && (
        <NewDesignModal
          onClose={() => setShowModal(false)}
          onCreated={(d) => { setDesigns(prev => [d, ...prev]); }}
        />
      )}
    </div>
  );

  return (
    <SubscriptionGate feature="save_the_date">
      <PageContent />
    </SubscriptionGate>
  );
}
