import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscription } from '../../contexts/SubscriptionContext';
import { Lock, Sparkles, X } from 'lucide-react';

export default function SubscriptionGate({ feature, children, fallback }) {
  const { isFeatureEnabled, currentPlan, loading } = useSubscription();
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  if (loading) return null;

  if (isFeatureEnabled(feature)) return children;

  if (fallback) return fallback;

  return (
    <>
      <div
        className="relative rounded-2xl overflow-hidden cursor-pointer group"
        onClick={() => setShowModal(true)}
      >
        {/* Blurred preview */}
        <div className="select-none pointer-events-none opacity-30 blur-sm">
          {children}
        </div>
        {/* Paywall overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-[#C9A84C] flex items-center justify-center">
              <Lock size={20} className="text-white" />
            </div>
            <h3 className="font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display, serif' }}>
              Premium Feature
            </h3>
            <p className="text-sm text-[#5C5C5C]">
              Upgrade to Pro to unlock this feature
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); navigate('/pricing'); }}
              className="mt-1 px-5 py-2 bg-[#C9A84C] text-white rounded-full text-sm font-semibold hover:bg-[#9A7D2E] transition-colors"
            >
              View Plans
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <UpgradeModal onClose={() => setShowModal(false)} feature={feature} />
      )}
    </>
  );
}

function UpgradeModal({ onClose, feature }) {
  const navigate = useNavigate();

  const featureLabels = {
    ai_assistant: 'AI Planning Assistant',
    save_the_date: 'Save-the-Date Studio',
    vendor_marketplace: 'Full Marketplace Access',
    analytics: 'Advanced Analytics',
    unlimited_events: 'Unlimited Events',
    advanced_reports: 'Advanced Reports',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full hover:bg-[#F5F0E8]"
        >
          <X size={18} className="text-[#5C5C5C]" />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C9A84C] to-[#E8A4B8] flex items-center justify-center">
            <Sparkles size={24} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#2D2D2D]" style={{ fontFamily: 'Playfair Display, serif' }}>
              Unlock {featureLabels[feature] || 'Premium Features'}
            </h2>
            <p className="mt-1 text-sm text-[#5C5C5C]">
              Upgrade to Prani Pro to access this feature and all premium tools.
            </p>
          </div>

          <div className="w-full space-y-2 text-left text-sm text-[#2D2D2D]">
            {['AI Planning Assistant', 'Save-the-Date Studio', 'Vendor Marketplace', 'Advanced Analytics', 'Unlimited Events'].map(f => (
              <div key={f} className="flex items-center gap-2">
                <span className="text-[#C9A84C]">✓</span> {f}
              </div>
            ))}
          </div>

          <button
            onClick={() => { onClose(); navigate('/pricing'); }}
            className="w-full py-2.5 bg-[#C9A84C] text-white rounded-full font-semibold hover:bg-[#9A7D2E] transition-colors"
          >
            See Pricing Plans
          </button>
          <button onClick={onClose} className="text-sm text-[#5C5C5C] hover:underline">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
