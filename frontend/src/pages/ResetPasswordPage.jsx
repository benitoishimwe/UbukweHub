import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Eye, EyeOff, Loader, CheckCircle2, AlertTriangle } from 'lucide-react';
import PlaniLogo from '../components/PlaniLogo';

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm)  { setError('Passwords do not match.'); return; }
    setError('');
    setLoading(true);
    try {
      await authAPI.resetPassword({ token, password });
      setDone(true);
      setTimeout(() => navigate('/login', { replace: true }), 2500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#F9F9FB] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 max-w-sm w-full text-center">
          <AlertTriangle size={40} className="text-[#DC2626] mx-auto mb-4" />
          <h2 className="text-lg font-bold text-[#111827] mb-2">Invalid Link</h2>
          <p className="text-sm text-[#6B7280] mb-6">No reset token found. Please request a new password reset link.</p>
          <Link to="/login" className="btn-primary px-6 py-2.5 inline-block text-sm">Back to Sign In</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F9FB] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <PlaniLogo size="md" />
        </div>

        <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(0,0,0,0.08)] p-8">
          {done ? (
            <div className="text-center py-4">
              <CheckCircle2 size={48} className="text-emerald-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-[#111827] mb-2">Password Updated!</h2>
              <p className="text-sm text-[#6B7280]">Redirecting you to sign in…</p>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-[#111827] mb-1" style={{ fontFamily: 'Poppins,sans-serif' }}>
                Set new password
              </h2>
              <p className="text-sm text-[#6B7280] mb-6">Choose a strong password for your account.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-1">New Password</label>
                  <div className="relative">
                    <input
                      className="input-wedding pr-10"
                      type={showPwd ? 'text' : 'password'}
                      placeholder="Min. 8 characters"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(''); }}
                      required
                    />
                    <button type="button" onClick={() => setShowPwd(!showPwd)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280]">
                      {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#111827] mb-1">Confirm Password</label>
                  <input
                    className="input-wedding"
                    type="password"
                    placeholder="Repeat your password"
                    value={confirm}
                    onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                    required
                  />
                </div>

                {error && (
                  <p className="text-sm text-[#DC2626] bg-[#FEE2E2] rounded-lg px-3 py-2">{error}</p>
                )}

                <button type="submit" disabled={loading}
                  className="btn-primary w-full h-11 flex items-center justify-center gap-2 text-sm">
                  {loading ? <Loader size={16} className="animate-spin" /> : 'Update Password'}
                </button>
              </form>

              <p className="text-center mt-4">
                <Link to="/login" className="text-xs text-[#0F4C5C] hover:underline">← Back to Sign In</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
