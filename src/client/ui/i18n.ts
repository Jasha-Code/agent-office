// The internationalization engine for Agent Office: manages active locale,
// Persian/English dictionaries, direction (RTL/LTR), and live updates.

import { FA_TRANSLATIONS } from './i18n-fa';

export type Language = 'fa' | 'en';

const LANG_KEY = 'agent-office.lang';
let activeLang: Language = loadLanguage();

const listeners = new Set<(lang: Language) => void>();

export function loadLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'fa' || saved === 'en') return saved;
  } catch {
    // storage unavailable
  }
  return 'fa';
}

export function currentLang(): Language {
  return activeLang;
}

export function isRTL(): boolean {
  return activeLang === 'fa';
}

export function setLanguage(lang: Language): void {
  if (activeLang === lang) return;
  activeLang = lang;
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    // storage unavailable
  }
  applyLanguageDom();
  listeners.forEach((fn) => fn(lang));
}

export function onLanguageChange(fn: (lang: Language) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Translates `key` into active language. Returns Persian translation if activeLang === 'fa', else key/fallback. */
export function t(key: string, fallback?: string): string {
  if (activeLang === 'fa') {
    return FA_TRANSLATIONS[key] ?? fallback ?? key;
  }
  return fallback ?? key;
}

/** Applies dir and lang attributes to documentElement. Safe to call in browser environments. */
export function applyLanguageDom(): void {
  if (typeof document === 'undefined') return;
  const rtl = isRTL();
  document.documentElement.lang = activeLang;
  document.documentElement.dir = rtl ? 'rtl' : 'ltr';
  if (document.body) {
    document.body.classList.toggle('rtl', rtl);
  }
}

// Automatically apply DOM direction on load in browser
if (typeof document !== 'undefined') {
  applyLanguageDom();
}
