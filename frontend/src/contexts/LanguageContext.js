import React, { createContext, useContext, useState, useEffect } from 'react';
import en from '../i18n/en.json';
import rw from '../i18n/rw.json';

const translations = { en, rw };
const LangContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('ubukwe_lang') || 'en');

  const t = (key) => {
    const keys = key.split('.');
    let val = translations[lang];
    for (const k of keys) {
      val = val?.[k];
    }
    // Fallback to English
    if (!val && lang !== 'en') {
      let fallback = translations['en'];
      for (const k of keys) fallback = fallback?.[k];
      return fallback || key;
    }
    return val || key;
  };

  const switchLang = (newLang) => {
    setLang(newLang);
    localStorage.setItem('ubukwe_lang', newLang);
  };

  return (
    <LangContext.Provider value={{ lang, t, switchLang }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLang = () => {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
};
