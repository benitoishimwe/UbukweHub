import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { authAPI } from '../services/api';
import { Eye, EyeOff, Loader, Globe, Sparkles, Calendar, Users } from 'lucide-react';

const ROLE_PATHS = {
  super_admin:   '/super-admin',
  tenant_admin:  '/dashboard',
  staff:         '/dashboard',
  vendor:        '/dashboard',
  client:        '/dashboard',
  event_manager: '/dashboard',
};

export default function LoginPage() {
  const { login } = useAuth();
  const { t, lang, switchLang } = useLang();
  const navigate = useNavigate();

  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaState, setMfaState] = useState(null);
  const [mfaMethod, setMfaMethod] = useState('totp');
  const [mfaCode, setMfaCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleGoogleLogin = () => {
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'register') {
        const res = await authAPI.register(form);
        const payload = res.data;
        login(payload.user, payload.token);
        navigate(ROLE_PATHS[payload.user.role] ?? '/dashboard');
      } else {
        const res = await authAPI.login({ email: form.email, password: form.password });
        const payload = res.data;
        if (payload.mfa_required) {
          setMfaState({ userId: payload.userId, method: payload.method });
          setMfaMethod(payload.method || 'totp');
        } else {
          login(payload.user, payload.token);
          navigate(ROLE_PATHS[payload.user.role] ?? '/dashboard');
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      await authAPI.sendEmailOtp(mfaState.userId);
      setOtpSent(true);
    } catch {
      setError('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await authAPI.verifyMfa({ userId: mfaState.userId, code: mfaCode, method: mfaMethod });
      const payload = res.data.data;
      login(payload.user, payload.token);
      navigate(ROLE_PATHS[payload.user.role] ?? '/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.error || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{background:'#F9F9FB'}}>
      {/* Left Panel - Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.pexels.com/photos/18064219/pexels-photo-18064219.jpeg"
          alt="African wedding celebration"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{background:'linear-gradient(135deg, rgba(15,76,92,0.85) 0%, rgba(15,76,92,0.5) 100%)'}} />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
          {/* Top logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
              <span className="text-white font-bold text-lg" style={{fontFamily:'Poppins,sans-serif'}}>P</span>
            </div>
            <span className="text-xl font-bold" style={{fontFamily:'Poppins,sans-serif'}}>Prani</span>
          </div>

          {/* Bottom content */}
          <div>
            <h1 className="text-5xl font-bold mb-4 leading-tight" style={{fontFamily:'Poppins,sans-serif'}}>
              Plan with confidence<br />the African way.
            </h1>
            <p className="text-lg text-white/80 mb-8">
              AI-powered event planning for African businesses. Weddings, corporate events, and more — all in one platform.
            </p>
            <div className="flex gap-8">
              {[
                { icon: Calendar, n: '500+', l: 'Events Managed' },
                { icon: Users, n: '1,200+', l: 'Happy Clients' },
                { icon: Sparkles, n: '98%', l: 'AI Accuracy' },
              ].map(({ icon: Icon, n, l }) => (
                <div key={l} className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Icon size={16} className="text-[#E67E22]" />
                    <p className="text-2xl font-bold text-[#E6C975]">{n}</p>
                  </div>
                  <p className="text-sm text-white/60">{l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-12">
        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#0F4C5C] flex items-center justify-center">
            <span className="text-white font-bold text-lg" style={{fontFamily:'Poppins,sans-serif'}}>P</span>
          </div>
          <h1 className="text-2xl font-bold text-[#111827]" style={{fontFamily:'Poppins,sans-serif'}}>Prani</h1>
        </div>

        <div className="w-full max-w-md animate-scale-in">
          {/* Language Toggle */}
          <div className="flex justify-between items-center mb-4">
            <Link to="/" className="text-sm text-[#0F4C5C] hover:underline font-medium">← Back to home</Link>
            <button
              onClick={() => switchLang(lang === 'en' ? 'rw' : 'en')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E5E7EB] text-sm text-[#6B7280] hover:border-[#0F4C5C] transition-colors"
              data-testid="lang-toggle-login"
            >
              <Globe size={14} />
              {lang === 'en' ? 'Kinyarwanda' : 'English'}
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8">
            {!mfaState ? (
              <>
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-[#111827]" style={{fontFamily:'Poppins,sans-serif'}}>
                    {tab === 'login' ? 'Welcome back' : 'Create account'}
                  </h2>
                  <p className="text-[#6B7280] text-sm mt-1">
                    {tab === 'login' ? 'Sign in to your Prani workspace' : 'Start your 14-day free trial'}
                  </p>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 bg-[#F9F9FB] rounded-xl p-1 mb-6">
                  {['login', 'register'].map((t_) => (
                    <button
                      key={t_}
                      onClick={() => { setTab(t_); setError(''); }}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                        tab === t_ ? 'bg-white text-[#0F4C5C] shadow-sm' : 'text-[#6B7280]'
                      }`}
                      data-testid={`tab-${t_}`}
                    >
                      {t_ === 'login' ? t('auth.login') : t('auth.register')}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {tab === 'register' && (
                    <div>
                      <label className="block text-sm font-medium text-[#111827] mb-1.5">{t('auth.name')}</label>
                      <input
                        className="input-wedding"
                        placeholder="Amina Uwase"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                        data-testid="register-name"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">{t('auth.email')}</label>
                    <input
                      className="input-wedding"
                      type="email"
                      placeholder="you@example.rw"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      required
                      data-testid="login-email"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">{t('auth.password')}</label>
                    <div className="relative">
                      <input
                        className="input-wedding pr-10"
                        type={showPwd ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={form.password}
                        onChange={(e) => setForm({ ...form, password: e.target.value })}
                        required
                        data-testid="login-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]"
                      >
                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2" data-testid="login-error">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full h-12 flex items-center justify-center gap-2 text-base"
                    data-testid="login-submit"
                  >
                    {loading ? <Loader size={18} className="animate-spin" /> : null}
                    {tab === 'login' ? t('auth.login') : t('auth.register')}
                  </button>
                </form>

                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-[#E5E7EB]" />
                  <span className="text-xs text-[#6B7280]">{t('auth.or')}</span>
                  <div className="flex-1 h-px bg-[#E5E7EB]" />
                </div>

                <button
                  onClick={handleGoogleLogin}
                  className="w-full h-12 flex items-center justify-center gap-3 rounded-xl border-2 border-[#E5E7EB] text-[#111827] font-medium text-sm hover:border-[#0F4C5C] hover:bg-[#E8F4F8] transition-all"
                  data-testid="google-login-btn"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
                    <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.615 24 12.255 24z"/>
                    <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"/>
                    <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.64 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
                  </svg>
                  {t('auth.google_login')}
                </button>

                {tab === 'register' && (
                  <p className="text-xs text-[#6B7280] text-center mt-4">
                    By registering you agree to our{' '}
                    <a href="#" className="text-[#0F4C5C] hover:underline">Terms of Service</a>
                    {' '}and{' '}
                    <a href="#" className="text-[#0F4C5C] hover:underline">Privacy Policy</a>
                  </p>
                )}
              </>
            ) : (
              /* MFA Screen */
              <div className="animate-scale-in">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#E8F4F8] flex items-center justify-center">
                    <svg className="w-7 h-7 text-[#0F4C5C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-[#111827]" style={{fontFamily:'Poppins,sans-serif'}}>{t('auth.mfa_required')}</h2>
                  <p className="text-sm text-[#6B7280] mt-1">Two-factor authentication required</p>
                </div>

                {mfaState.methods?.length > 1 && (
                  <div className="flex gap-2 mb-4">
                    {mfaState.methods.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMfaMethod(m)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                          mfaMethod === m ? 'border-[#0F4C5C] bg-[#E8F4F8] text-[#0F4C5C]' : 'border-[#E5E7EB] text-[#6B7280]'
                        }`}
                        data-testid={`mfa-method-${m}`}
                      >
                        {m === 'totp' ? 'Authenticator App' : 'Email OTP'}
                      </button>
                    ))}
                  </div>
                )}

                {mfaMethod === 'email_otp' && !otpSent && (
                  <button
                    onClick={handleSendOtp}
                    disabled={loading}
                    className="btn-primary w-full h-11 mb-4 flex items-center justify-center text-sm"
                    data-testid="send-otp-btn"
                  >
                    {loading ? <Loader size={16} className="animate-spin mr-2" /> : null}
                    {t('auth.send_otp')}
                  </button>
                )}

                <form onSubmit={handleMfaVerify} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#111827] mb-1.5">{t('auth.mfa_code')}</label>
                    <input
                      className="input-wedding text-center text-2xl tracking-[0.5em] font-bold"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      placeholder="000000"
                      value={mfaCode}
                      onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      required
                      data-testid="mfa-code-input"
                    />
                    <p className="text-xs text-[#6B7280] mt-1.5 text-center">
                      {mfaMethod === 'totp' ? t('auth.totp_prompt') : t('auth.email_otp_prompt')}
                    </p>
                  </div>
                  {error && <p className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2" data-testid="mfa-error">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading || mfaCode.length < 6}
                    className="btn-primary w-full h-12 flex items-center justify-center gap-2"
                    data-testid="mfa-verify-btn"
                  >
                    {loading ? <Loader size={18} className="animate-spin" /> : null}
                    {t('auth.verify')}
                  </button>
                  <button type="button" onClick={() => setMfaState(null)} className="w-full text-sm text-[#6B7280] hover:text-[#111827]">
                    {t('common.back')}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
