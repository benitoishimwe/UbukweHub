import React, { useState } from 'react';
import { useLang } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';
import { Settings, Globe, ShieldCheck, Bell, Accessibility, Eye, Type, Loader, CheckCircle } from 'lucide-react';

function Section({ title, icon: Icon, children }) {
  return (
    <div className="card-wedding p-6 mb-4">
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[#F5F0E8]">
        <div className="w-9 h-9 rounded-xl bg-[#C9A84C15] flex items-center justify-center">
          <Icon size={18} className="text-[#C9A84C]" />
        </div>
        <h2 className="text-base font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const { t, lang, switchLang } = useLang();
  const { user } = useAuth();

  const [totpSetup, setTotpSetup] = useState(null);
  const [totpCode, setTotpCode] = useState('');
  const [totpLoading, setTotpLoading] = useState(false);
  const [totpSuccess, setTotpSuccess] = useState(false);
  const [totpError, setTotpError] = useState('');

  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);

  const handleHighContrast = (v) => {
    setHighContrast(v);
    document.body.classList.toggle('high-contrast', v);
  };
  const handleLargeText = (v) => {
    setLargeText(v);
    document.body.classList.toggle('large-text', v);
  };

  const startTotpSetup = async () => {
    setTotpLoading(true);
    setTotpError('');
    try {
      const { data } = await authAPI.getTotpSetup();
      setTotpSetup(data);
    } catch (err) {
      setTotpError('Failed to start TOTP setup');
    } finally {
      setTotpLoading(false);
    }
  };

  const verifyTotp = async () => {
    setTotpLoading(true);
    setTotpError('');
    try {
      await authAPI.verifyTotpSetup(totpCode);
      setTotpSuccess(true);
      setTotpSetup(null);
    } catch (err) {
      setTotpError(err.response?.data?.detail || 'Invalid code');
    } finally {
      setTotpLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold text-[#2D2D2D] mb-6" style={{fontFamily:'Playfair Display,serif'}}>{t('settings.title')}</h1>

      {/* Language */}
      <Section title={t('settings.language')} icon={Globe}>
        <div className="flex gap-3">
          {[{ k: 'en', l: t('settings.english') }, { k: 'rw', l: t('settings.kinyarwanda') }].map(({ k, l }) => (
            <button
              key={k}
              onClick={() => switchLang(k)}
              className={`flex-1 h-12 rounded-xl font-semibold text-sm transition-all ${
                lang === k
                  ? 'bg-[#C9A84C] text-white shadow-md'
                  : 'bg-[#F5F0E8] text-[#5C5C5C] hover:border-[#C9A84C] border border-transparent'
              }`}
              data-testid={`lang-btn-${k}`}
            >
              {l}
            </button>
          ))}
        </div>
      </Section>

      {/* MFA */}
      <Section title={t('settings.mfa')} icon={ShieldCheck}>
        {user?.mfa_enabled ? (
          <div className="flex items-center gap-3 p-3 bg-[#E8F5EE] rounded-xl">
            <CheckCircle size={20} className="text-[#4A7C59]" />
            <span className="text-sm font-medium text-[#4A7C59]">{t('settings.mfa_enabled')}</span>
          </div>
        ) : totpSuccess ? (
          <div className="flex items-center gap-3 p-3 bg-[#E8F5EE] rounded-xl">
            <CheckCircle size={20} className="text-[#4A7C59]" />
            <span className="text-sm font-medium text-[#4A7C59]">TOTP MFA enabled successfully!</span>
          </div>
        ) : !totpSetup ? (
          <div>
            <p className="text-sm text-[#5C5C5C] mb-3">Protect your account with a Time-based One-Time Password (TOTP) using Google Authenticator or Authy.</p>
            <button onClick={startTotpSetup} disabled={totpLoading} className="btn-gold px-6 py-2.5 text-sm flex items-center gap-2" data-testid="setup-mfa-btn">
              {totpLoading ? <Loader size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
              {t('settings.mfa_setup')}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#5C5C5C]">Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.</p>
            <div className="p-4 bg-white border border-[#EBE5DB] rounded-xl text-center">
              <p className="text-xs font-mono text-[#5C5C5C] break-all mb-2">{totpSetup.uri}</p>
              <p className="text-xs text-[#5C5C5C]">Secret: <span className="font-mono font-bold text-[#C9A84C]">{totpSetup.secret}</span></p>
            </div>
            <div>
              <label className="block text-sm font-medium text-[#2D2D2D] mb-1">Verification Code</label>
              <input
                className="input-wedding text-center text-2xl tracking-[0.5em] font-bold"
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={totpCode}
                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                data-testid="totp-verify-input"
              />
            </div>
            {totpError && <p className="text-sm text-[#D9534F]" data-testid="totp-error">{totpError}</p>}
            <button onClick={verifyTotp} disabled={totpLoading || totpCode.length < 6} className="btn-gold w-full h-11 flex items-center justify-center text-sm" data-testid="verify-totp-btn">
              {totpLoading ? <Loader size={16} className="animate-spin" /> : 'Confirm & Enable MFA'}
            </button>
          </div>
        )}
      </Section>

      {/* Accessibility */}
      <Section title={t('settings.accessibility')} icon={Accessibility}>
        <div className="space-y-4">
          {[
            { label: t('settings.high_contrast'), value: highContrast, onChange: handleHighContrast, testId: 'high-contrast-toggle', icon: Eye },
            { label: t('settings.large_text'), value: largeText, onChange: handleLargeText, testId: 'large-text-toggle', icon: Type },
          ].map(({ label, value, onChange, testId, icon: Icon }) => (
            <div key={label} className="flex items-center justify-between p-3 rounded-xl bg-[#F5F0E8]">
              <div className="flex items-center gap-3">
                <Icon size={18} className="text-[#5C5C5C]" />
                <span className="text-sm font-medium text-[#2D2D2D]">{label}</span>
              </div>
              <button
                onClick={() => onChange(!value)}
                className={`w-12 h-6 rounded-full transition-all relative ${value ? 'bg-[#C9A84C]' : 'bg-[#EBE5DB]'}`}
                data-testid={testId}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all shadow-sm ${value ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </Section>

      {/* App Info */}
      <div className="text-center py-4 text-[#5C5C5C] text-xs">
        <p className="font-semibold" style={{fontFamily:'Playfair Display,serif'}}>UbukweHub v1.0</p>
        <p>Rwanda Wedding Planning Platform</p>
        <p>© 2025 UbukweHub · All rights reserved</p>
      </div>
    </div>
  );
}
