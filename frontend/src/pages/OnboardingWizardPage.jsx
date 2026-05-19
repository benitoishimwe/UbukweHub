import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { CheckCircle, Loader, ChevronRight, ChevronLeft, Palette, Users, CreditCard, Rocket } from 'lucide-react';

const STEPS = [
  { id: 'branding',  label: 'Branding',      icon: Palette },
  { id: 'team',      label: 'Invite Team',    icon: Users },
  { id: 'plan',      label: 'Choose Plan',    icon: CreditCard },
  { id: 'launch',    label: 'Launch',         icon: Rocket },
];

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    features: ['Up to 5 events/month', '3 team members', 'Basic inventory', 'Community support'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$49/mo',
    features: ['Unlimited events', '20 team members', 'Full inventory + QR', 'AI assistant', 'Priority support'],
    recommended: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    features: ['Everything in Pro', 'Unlimited members', 'White-labelling', 'Dedicated SLA', 'Custom integrations'],
  },
];

function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {STEPS.map((step, i) => {
        const done = i < currentStep;
        const active = i === currentStep;
        const Icon = step.icon;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                done ? 'bg-[#4A7C59] text-white' :
                active ? 'bg-[#C9A84C] text-white ring-4 ring-[#C9A84C]/20' :
                'bg-[#EBE5DB] text-[#9A9A9A]'
              }`}>
                {done ? <CheckCircle size={18} /> : <Icon size={18} />}
              </div>
              <span className={`text-xs mt-1.5 font-medium ${active ? 'text-[#C9A84C]' : 'text-[#9A9A9A]'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-12 h-0.5 mx-1 mb-5 ${i < currentStep ? 'bg-[#4A7C59]' : 'bg-[#EBE5DB]'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ── Step 0: Branding ──────────────────────────────────────────────────────────
function BrandingStep({ data, onChange }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-[#2D2D2D]">Set up your workspace</h2>
        <p className="text-sm text-[#6B7280] mt-1">Personalise Prani for your business.</p>
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Business Name</label>
        <input value={data.name} onChange={e => onChange('name', e.target.value)}
          placeholder="e.g. Acme Events Ltd"
          className="w-full border border-[#EBE5DB] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-[#5C5C5C] mb-1">Brand Color</label>
        <div className="flex items-center gap-3">
          <input type="color" value={data.primaryColor}
            onChange={e => onChange('primaryColor', e.target.value)}
            className="w-10 h-10 rounded-lg border border-[#EBE5DB] cursor-pointer p-0.5" />
          <input value={data.primaryColor} onChange={e => onChange('primaryColor', e.target.value)}
            maxLength={7} placeholder="#C9A84C"
            className="flex-1 border border-[#EBE5DB] rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#C9A84C]" />
        </div>
      </div>
      <div className="bg-[#F5F0E8] rounded-2xl p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-lg"
          style={{ backgroundColor: data.primaryColor || '#C9A84C' }}>
          {(data.name || 'A').charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-sm font-bold text-[#2D2D2D]">{data.name || 'Your Business'}</p>
          <p className="text-xs text-[#5C5C5C]">Preview</p>
        </div>
      </div>
    </div>
  );
}

// ── Step 1: Invite Team ───────────────────────────────────────────────────────
function TeamStep({ invites, setInvites }) {
  const addRow = () => setInvites(prev => [...prev, { email: '', role: 'staff' }]);
  const removeRow = (i) => setInvites(prev => prev.filter((_, idx) => idx !== i));
  const update = (i, key, val) => setInvites(prev => prev.map((r, idx) => idx === i ? { ...r, [key]: val } : r));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-[#2D2D2D]">Invite your team</h2>
        <p className="text-sm text-[#5C5C5C] mt-1">You can skip this and invite people later.</p>
      </div>
      <div className="flex flex-col gap-2">
        {invites.map((row, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input value={row.email} onChange={e => update(i, 'email', e.target.value)}
              type="email" placeholder="email@company.com"
              className="flex-1 border border-[#EBE5DB] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]" />
            <select value={row.role} onChange={e => update(i, 'role', e.target.value)}
              className="border border-[#EBE5DB] rounded-xl px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A84C]">
              {['staff', 'client', 'vendor', 'tenant_admin'].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <button onClick={() => removeRow(i)} className="text-[#9A9A9A] hover:text-red-500 transition-colors text-lg leading-none">×</button>
          </div>
        ))}
      </div>
      {invites.length < 5 && (
        <button onClick={addRow} className="text-sm text-[#C9A84C] hover:underline self-start font-medium">
          + Add another
        </button>
      )}
      {invites.length === 0 && (
        <div className="bg-[#F5F0E8] rounded-xl p-4 text-sm text-[#5C5C5C] text-center">
          No invites added. You can invite team members from the Admin panel later.
        </div>
      )}
    </div>
  );
}

// ── Step 2: Plan ──────────────────────────────────────────────────────────────
function PlanStep({ selected, onSelect }) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-bold text-[#2D2D2D]">Choose your plan</h2>
        <p className="text-sm text-[#5C5C5C] mt-1">Start free, upgrade anytime.</p>
      </div>
      <div className="flex flex-col gap-3">
        {PLANS.map(plan => (
          <button key={plan.id} onClick={() => onSelect(plan.id)}
            className={`text-left border-2 rounded-2xl p-4 transition-all ${
              selected === plan.id ? 'border-[#C9A84C] bg-[#FBF5E8]' : 'border-[#EBE5DB] bg-white hover:border-[#C9A84C]/40'
            }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="font-bold text-[#2D2D2D]">{plan.name}</span>
                {plan.recommended && (
                  <span className="text-xs bg-[#C9A84C] text-white px-2 py-0.5 rounded-full font-semibold">Recommended</span>
                )}
              </div>
              <span className="font-bold text-[#C9A84C]">{plan.price}</span>
            </div>
            <ul className="flex flex-col gap-0.5">
              {plan.features.map(f => (
                <li key={f} className="text-xs text-[#5C5C5C] flex items-center gap-1.5">
                  <CheckCircle size={11} className="text-[#4A7C59] flex-shrink-0" /> {f}
                </li>
              ))}
            </ul>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Step 3: Launch ────────────────────────────────────────────────────────────
function LaunchStep({ data, invites, plan }) {
  return (
    <div className="flex flex-col items-center text-center gap-5 py-4">
      <div className="w-20 h-20 rounded-full bg-[#C9A84C]/10 flex items-center justify-center">
        <Rocket size={36} className="text-[#C9A84C]" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-[#2D2D2D]">Ready to launch!</h2>
        <p className="text-sm text-[#5C5C5C] mt-1">Here's a summary of your setup.</p>
      </div>
      <div className="bg-[#F5F0E8] rounded-2xl p-4 w-full text-left text-sm">
        <div className="flex justify-between py-1 border-b border-[#EBE5DB]">
          <span className="text-[#5C5C5C]">Business</span>
          <span className="font-semibold text-[#2D2D2D]">{data.name || '—'}</span>
        </div>
        <div className="flex justify-between py-1 border-b border-[#EBE5DB]">
          <span className="text-[#5C5C5C]">Brand color</span>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: data.primaryColor }} />
            <span className="font-mono text-xs">{data.primaryColor}</span>
          </div>
        </div>
        <div className="flex justify-between py-1 border-b border-[#EBE5DB]">
          <span className="text-[#5C5C5C]">Team invites</span>
          <span className="font-semibold text-[#2D2D2D]">{invites.filter(i => i.email).length} pending</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-[#5C5C5C]">Plan</span>
          <span className="font-semibold text-[#2D2D2D] capitalize">{plan}</span>
        </div>
      </div>
    </div>
  );
}

// ── Wizard container ──────────────────────────────────────────────────────────
export default function OnboardingWizardPage() {
  const { user, tenantId } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [branding, setBranding] = useState({ name: '', primaryColor: '#C9A84C' });
  const [invites, setInvites] = useState([]);
  const [plan, setPlan] = useState('free');

  const updateBranding = (key, val) => setBranding(b => ({ ...b, [key]: val }));

  const canProceed = () => {
    if (step === 0) return branding.name.trim().length > 0;
    return true;
  };

  const handleFinish = async () => {
    setSaving(true);
    setError('');
    try {
      // Save branding to tenant
      if (tenantId) {
        await api.put(`/super-admin/tenants/${tenantId}`, {
          name: branding.name,
          primary_color: branding.primaryColor,
        });
      }
      // Send invites (best-effort, fire-and-forget)
      const validInvites = invites.filter(i => i.email.trim());
      for (const inv of validInvites) {
        try {
          await api.post(`/super-admin/tenants/${tenantId}/invite`, {
            email: inv.email.trim(),
            role: inv.role,
          });
        } catch { /* individual invite failures don't block launch */ }
      }
      // Mark onboarding complete in localStorage so we don't show it again
      localStorage.setItem('prani_onboarded_' + (tenantId ?? user?.user_id), '1');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const skip = () => {
    localStorage.setItem('prani_onboarded_' + (tenantId ?? user?.user_id), '1');
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0F4C5C] rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">P</span>
            </div>
            <span className="font-bold text-[#111827]" style={{fontFamily:'Poppins,sans-serif'}}>Prani</span>
          </div>
          <button onClick={skip} className="text-xs text-[#9A9A9A] hover:text-[#5C5C5C] transition-colors">
            Skip setup
          </button>
        </div>

        <StepIndicator currentStep={step} />

        <div className="min-h-[320px]">
          {step === 0 && <BrandingStep data={branding} onChange={updateBranding} />}
          {step === 1 && <TeamStep invites={invites} setInvites={setInvites} />}
          {step === 2 && <PlanStep selected={plan} onSelect={setPlan} />}
          {step === 3 && <LaunchStep data={branding} invites={invites} plan={plan} />}
        </div>

        {error && <p className="text-xs text-red-600 bg-red-50 rounded-xl px-3 py-2 mt-4">{error}</p>}

        <div className="flex items-center justify-between mt-8">
          <button
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="flex items-center gap-1 text-sm text-[#5C5C5C] hover:text-[#2D2D2D] disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} /> Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#C9A84C] text-white rounded-xl font-semibold text-sm hover:bg-[#b8943f] transition-colors disabled:opacity-50"
            >
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#4A7C59] text-white rounded-xl font-semibold text-sm hover:bg-[#3a6347] transition-colors disabled:opacity-60"
            >
              {saving && <Loader size={14} className="animate-spin" />}
              Launch My Workspace <Rocket size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
