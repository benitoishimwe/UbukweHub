import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { authAPI } from '../services/api';

export default function AuthCallback() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;

    const hash = window.location.hash;
    const params = new URLSearchParams(hash.replace('#', '?'));
    const sessionId = params.get('session_id');

    if (!sessionId) {
      navigate('/login');
      return;
    }

    authAPI.google(sessionId)
      .then(({ data }) => {
        login(data.user, data.session_token);
        navigate('/dashboard', { replace: true, state: { user: data.user } });
      })
      .catch(() => {
        navigate('/login');
      });
  }, [login, navigate]);

  return (
    <div className="min-h-screen bg-[#F5F0E8] flex items-center justify-center">
      <div className="text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#C9A84C] flex items-center justify-center">
          <svg className="w-8 h-8 text-white animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        </div>
        <p className="text-[#5C5C5C] font-medium">Completing sign in...</p>
      </div>
    </div>
  );
}
