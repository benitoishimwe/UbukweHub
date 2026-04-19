import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Sparkles, ImagePlus, ShoppingBag, BarChart3, Calendar, FileText } from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';
import api from '../services/api';

const PLANS = [
  {
    key: 'free',
    name: 'Free',
    price: 0,
    currency: '',
    description: 'Get started with essential event planning tools',
    color: '#5C5C5C',
    features: [
      { label: 'Up to 3 events', included: true },
      { label: 'Inventory management', included: true },
      { label: 'Staff & vendor management', included: true },
      { label: 'Browse vendor marketplace', included: true },
      { label: 'AI Planning Assistant', included: false },
      { label: 'Save-the-Date Studio', included: false },
      { label: 'Advanced analytics', included: false },
      { label: 'Unlimited events', included: false },
    ],
    cta: 'Current Free Plan',
    ctaDisabled: true,
  },
  {
    key: 'trial',
    name: '14-Day Trial',
    price: 0,
    currency: '',
    description: 'Try all Pro features free for 14 days',
    color: '#E8A4B8',
    badge: 'Try Free',
    features: [
      { label: 'Everything in Free', included: true },
      { label: 'Unlimited events', included: true },
      { label: 'AI Planning Assistant', included: true },
      { label: 'Save-the-Date (5/month)', included: true },
      { label: 'Full marketplace access', included: true },
      { label: 'Advanced analytics', included: true },
      { label: 'Advanced reports', included: true },
      { label: 'Priority support', included: false },
    ],
    cta: 'Start Free Trial',
    stripePlan: 'trial',
  },
  {
    key: 'pro',
    name: 'Pro',
    price: 29,
    currency: 'USD',
    period: '/month',
    description: 'For professional event planners running multiple events',
    color: '#C9A84C',
    badge: 'Most Popular',
    features: [
      { label: 'Everything in Trial', included: true },
      { label: 'Unlimited events', included: true },
      { label: 'AI Planning Assistant', included: true },
      { label: 'Save-the-Date (20/month)', included: true },
      { label: 'Full marketplace access', included: true },
      { label: 'Advanced analytics', included: true },
      { label: 'Advanced reports', included: true },
      { label: 'Priority support', included: true },
    ],
    cta: 'Upgrade to Pro',
    stripePlan: 'pro',
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    price: 99,
    currency: 'USD',
    period: '/month',
    description: 'For agencies and large event management companies',
    color: '#2D2D2D',
    features: [
      { label: 'Everything in Pro', included: true },
      { label: 'Unlimited Save-the-Dates', included: true },
      { label: 'White-label options', included: true },
      { label: 'Team seat management', included: true },
      { label: 'API access', included: true },
      { label: 'Dedicated account manager', included: true },
      { label: 'Custom integrations', included: true },
      { label: 'SLA guarantee', included: true },
    ],
    cta: 'Contact Sales',
    stripePlan: 'enterprise',
  },
];

const FEATURES = [
  { icon: Sparkles, label: 'AI Planning Assistant', desc: 'Generate checklists, timelines, budgets, and seating arrangements powered by Claude AI.' },
  { icon: ImagePlus, label: 'Save-the-Date Studio', desc: 'Create stunning invitation visuals with AI-generated text and DALL-E background images.' },
  { icon: ShoppingBag, label: 'Vendor Marketplace', desc: 'Browse, contact, and review verified vendors for every event category.' },
  { icon: BarChart3, label: 'Advanced Analytics', desc: 'Deep insights into your events, revenue, and vendor performance.' },
  { icon: Calendar, label: 'Unlimited Events', desc: 'Manage weddings, corporate events, birthdays, conferences and more without limits.' },
  { icon: FileText, label: 'Advanced Reports', desc: 'Export PDF and CSV reports for events, inventory, and financials.' },
];

export default function PricingPage() {
  const { currentPlan } = useSubscription();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(null);

  const handleCta = async (plan) => {
    if (plan.ctaDisabled) return;
    if (plan.key === 'enterprise') {
      window.location.href = 'mailto:sales@prani.app?subject=Enterprise Plan Inquiry';
      return;
    }
    setLoading(plan.key);
    try {
      const res = await api.post('/subscriptions/checkout', { plan: plan.stripePlan });
      window.location.href = res.data.checkout_url;
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F0E8] px-4 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-[#2D2D2D] mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
            Plans & Pricing
          </h1>
          <p className="text-[#5C5C5C] text-lg max-w-xl mx-auto">
            Choose the plan that fits your event planning business. Upgrade or downgrade at any time.
          </p>
          {currentPlan !== 'free' && (
            <div className="mt-3 inline-flex items-center gap-2 px-4 py-1.5 bg-[#C9A84C20] rounded-full text-sm text-[#9A7D2E] font-medium">
              <Check size={14} /> Current plan: <span className="capitalize font-bold">{currentPlan}</span>
            </div>
          )}
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {PLANS.map((plan) => {
            const isCurrent = currentPlan === plan.key;
            return (
              <div
                key={plan.key}
                className={`bg-white rounded-2xl p-6 flex flex-col shadow-[0_8px_30px_rgb(0,0,0,0.04)] border-2 transition-all ${
                  plan.key === 'pro'
                    ? 'border-[#C9A84C] scale-[1.02]'
                    : 'border-transparent hover:border-[#EBE5DB]'
                }`}
              >
                {plan.badge && (
                  <div
                    className="inline-block px-3 py-0.5 rounded-full text-xs font-bold text-white mb-3 self-start"
                    style={{ background: plan.color }}
                  >
                    {plan.badge}
                  </div>
                )}
                <h2 className="text-xl font-bold text-[#2D2D2D] mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {plan.name}
                </h2>
                <div className="flex items-end gap-1 mb-2">
                  {plan.price > 0 ? (
                    <>
                      <span className="text-3xl font-bold text-[#2D2D2D]">${plan.price}</span>
                      <span className="text-sm text-[#5C5C5C] mb-1">{plan.period}</span>
                    </>
                  ) : (
                    <span className="text-3xl font-bold text-[#2D2D2D]">Free</span>
                  )}
                </div>
                <p className="text-sm text-[#5C5C5C] mb-5">{plan.description}</p>

                <ul className="space-y-2 flex-1 mb-6">
                  {plan.features.map((f) => (
                    <li key={f.label} className="flex items-start gap-2 text-sm">
                      <span className={f.included ? 'text-[#4A7C59]' : 'text-[#EBE5DB]'}>
                        {f.included ? '✓' : '✗'}
                      </span>
                      <span className={f.included ? 'text-[#2D2D2D]' : 'text-[#9C9C9C]'}>{f.label}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handleCta(plan)}
                  disabled={plan.ctaDisabled || isCurrent || loading === plan.key}
                  className={`w-full py-2.5 rounded-full text-sm font-semibold transition-colors ${
                    isCurrent
                      ? 'bg-[#F5F0E8] text-[#9A7D2E] cursor-default'
                      : plan.key === 'pro'
                      ? 'bg-[#C9A84C] text-white hover:bg-[#9A7D2E]'
                      : 'border border-[#C9A84C] text-[#C9A84C] hover:bg-[#C9A84C10]'
                  }`}
                >
                  {loading === plan.key ? 'Redirecting...' : isCurrent ? 'Current Plan' : plan.cta}
                </button>
              </div>
            );
          })}
        </div>

        {/* Feature highlights */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display, serif' }}>
            Everything you need to run a great event
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map(({ icon: Icon, label, desc }) => (
            <div key={label} className="bg-white rounded-xl p-5 flex gap-4 shadow-[0_4px_20px_rgb(0,0,0,0.03)]">
              <div className="w-10 h-10 rounded-xl bg-[#C9A84C15] flex items-center justify-center flex-shrink-0">
                <Icon size={20} className="text-[#C9A84C]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#2D2D2D] text-sm">{label}</h3>
                <p className="text-xs text-[#5C5C5C] mt-0.5 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
