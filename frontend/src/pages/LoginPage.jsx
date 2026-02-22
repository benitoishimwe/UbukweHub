import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLang } from '../contexts/LanguageContext';
import { authAPI } from '../services/api';
import { Eye, EyeOff, Loader, Globe } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const { t, lang, switchLang } = useLang();
  const navigate = useNavigate();

  const [tab, setTab] = useState('login'); // login | register
  const [form, setForm] = useState({ email: '', password: '', name: '' });
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mfaState, setMfaState] = useState(null); // {user_id, methods}
  const [mfaMethod, setMfaMethod] = useState('totp');
  const [mfaCode, setMfaCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);

  const handleGoogleLogin = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + '/auth/callback';
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'register') {
        const { data } = await authAPI.register(form);
        login(data.user, data.token);
        navigate('/dashboard');
      } else {
        const { data } = await authAPI.login({ email: form.email, password: form.password });
        if (data.mfa_required) {
          setMfaState({ user_id: data.user_id, methods: data.mfa_methods });
          setMfaMethod(data.mfa_methods[0] || 'totp');
        } else {
          login(data.user, data.token);
          navigate('/dashboard');
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      await authAPI.sendEmailOtp(mfaState.user_id);
      setOtpSent(true);
    } catch (err) {
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
      const { data } = await authAPI.verifyMfa({ user_id: mfaState.user_id, code: mfaCode, method: mfaMethod });
      login(data.user, data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{background:'#F5F0E8'}}>
      {/* Left Panel - Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.pexels.com/photos/18064219/pexels-photo-18064219.jpeg"
          alt="Rwandan wedding"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#2D2D2D]/60 to-[#C9A84C]/40" />
        <div className="relative z-10 flex flex-col justify-end p-12 text-white">
          <div className="mb-3">
            <div className="w-12 h-12 rounded-2xl bg-[#C9A84C] flex items-center justify-center shadow-lg mb-4">
              <span className="text-white font-bold text-xl" style={{fontFamily:'Playfair Display,serif'}}>U</span>
            </div>
            <h1 className="text-5xl font-bold mb-3" style={{fontFamily:'Playfair Display,serif'}}>UbukweHub</h1>
            <p className="text-xl text-white/80 leading-relaxed">{t('auth.tagline')}</p>
          </div>
          <div className="flex gap-6 mt-6">
            {[['500+', 'Events Managed'], ['1,200+', 'Inventory Items'], ['30+', 'Staff']].map(([n, l]) => (
              <div key={l} className="text-center">
                <p className="text-2xl font-bold text-[#E6C975]">{n}</p>
                <p className="text-sm text-white/70">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 lg:px-12">
        {/* Mobile Logo */}
        <div className="lg:hidden flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-[#C9A84C] flex items-center justify-center">
            <span className="text-white font-bold text-lg" style={{fontFamily:'Playfair Display,serif'}}>U</span>
          </div>
          <h1 className="text-2xl font-bold text-[#2D2D2D]" style={{fontFamily:'Playfair Display,serif'}}>UbukweHub</h1>
        </div>

        <div className="w-full max-w-md animate-scale-in">
          {/* Language Toggle */}
          <div className="flex justify-end mb-4">
            <button
              onClick={() => switchLang(lang === 'en' ? 'rw' : 'en')}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#EBE5DB] text-sm text-[#5C5C5C] hover:border-[#C9A84C] transition-colors"
              data-testid="lang-toggle-login"
            >
              <Globe size={14} />
              {lang === 'en' ? 'Kinyarwanda' : 'English'}
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8">
            {!mfaState ? (
              <>
                {/* Tabs */}
                <div className="flex gap-1 bg-[#F5F0E8] rounded-xl p-1 mb-6">
                  {['login', 'register'].map((t_) => (
                    <button
                      key={t_}
                      onClick={() => { setTab(t_); setError(''); }}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                        tab === t_ ? 'bg-white text-[#C9A84C] shadow-sm' : 'text-[#5C5C5C]'
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
                      <label className="block text-sm font-medium text-[#2D2D2D] mb-1.5">{t('auth.name')}</label>
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
                    <label className="block text-sm font-medium text-[#2D2D2D] mb-1.5">{t('auth.email')}</label>
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
                    <label className="block text-sm font-medium text-[#2D2D2D] mb-1.5">{t('auth.password')}</label>
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5C5C5C]"
                      >
                        {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <p className="text-sm text-[#D9534F] bg-[#FBE9E7] rounded-lg px-3 py-2" data-testid="login-error">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-gold w-full h-12 flex items-center justify-center gap-2 text-base"
                    data-testid="login-submit"
                  >
                    {loading ? <Loader size={18} className="animate-spin" /> : null}
                    {tab === 'login' ? t('auth.login') : t('auth.register')}
                  </button>
                </form>

                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-[#EBE5DB]" />
                  <span className="text-xs text-[#5C5C5C]">{t('auth.or')}</span>
                  <div className="flex-1 h-px bg-[#EBE5DB]" />
                </div>

                <button
                  onClick={handleGoogleLogin}
                  className="w-full h-12 flex items-center justify-center gap-3 rounded-full border-2 border-[#EBE5DB] text-[#2D2D2D] font-medium text-sm hover:border-[#C9A84C] hover:bg-[#C9A84C05] transition-all"
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
              </>
            ) : (
              /* MFA Screen */
              <div className="animate-scale-in">
                <div className="text-center mb-6">
                  <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#C9A84C15] flex items-center justify-center">
                    <svg className="w-7 h-7 text-[#C9A84C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-[#2D2D2D]">{t('auth.mfa_required')}</h2>
                </div>

                {/* Method selector */}
                {mfaState.methods?.length > 1 && (
                  <div className="flex gap-2 mb-4">
                    {mfaState.methods.map((m) => (
                      <button
                        key={m}
                        onClick={() => setMfaMethod(m)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all border ${
                          mfaMethod === m ? 'border-[#C9A84C] bg-[#C9A84C10] text-[#C9A84C]' : 'border-[#EBE5DB] text-[#5C5C5C]'
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
                    className="btn-gold w-full h-11 mb-4 flex items-center justify-center text-sm"
                    data-testid="send-otp-btn"
                  >
                    {loading ? <Loader size={16} className="animate-spin mr-2" /> : null}
                    {t('auth.send_otp')}
                  </button>
                )}

                <form onSubmit={handleMfaVerify} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#2D2D2D] mb-1.5">{t('auth.mfa_code')}</label>
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
                    <p className="text-xs text-[#5C5C5C] mt-1.5 text-center">
                      {mfaMethod === 'totp' ? t('auth.totp_prompt') : t('auth.email_otp_prompt')}
                    </p>
                  </div>
                  {error && <p className="text-sm text-[#D9534F] bg-[#FBE9E7] rounded-lg px-3 py-2" data-testid="mfa-error">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading || mfaCode.length < 6}
                    className="btn-gold w-full h-12 flex items-center justify-center gap-2"
                    data-testid="mfa-verify-btn"
                  >
                    {loading ? <Loader size={18} className="animate-spin" /> : null}
                    {t('auth.verify')}
                  </button>
                  <button type="button" onClick={() => setMfaState(null)} className="w-full text-sm text-[#5C5C5C] hover:text-[#2D2D2D]">
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
