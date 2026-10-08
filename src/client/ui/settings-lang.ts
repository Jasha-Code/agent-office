// The language setting in ⚙️ Settings: toggle between Persian (فارسی) and English.

import { currentLang, setLanguage, t, type Language } from './i18n';
import { h } from './dom';

export function languageSetting(onRefresh?: () => void): HTMLElement {
  const container = h('div.setting');
  const head = h(
    'div.setting-head',
    {},
    h('h4', {}, t('pane_lang', 'زبان / Language')),
    h('span.scope.you', { title: t('scope_you_title', 'Only for you, kept in this browser') }, t('scope_you', 'فقط شما')),
  );

  const seg = h('div.seg', { role: 'radiogroup', 'aria-label': 'Language selection' });
  const note = h('p.setting-note', {}, t('pane_lang_blurb', 'تنظیم زبان رابط کاربری، متون و جهت چیدمان (راست‌به‌چپ یا چپ‌به‌راست).'));

  const options: [Language, string][] = [
    ['fa', '🇮🇷 فارسی (پیش‌فرض)'],
    ['en', '🇺🇸 English'],
  ];

  const paint = () => {
    const cur = currentLang();
    seg.replaceChildren(
      ...options.map(([code, label]) =>
        h(
          'button.btn',
          {
            type: 'button',
            role: 'radio',
            'aria-checked': String(cur === code),
            class: cur === code ? 'on' : '',
            onclick: () => {
              if (cur === code) return;
              setLanguage(code);
              paint();
              onRefresh?.();
            },
          },
          label,
        ),
      ),
    );
  };

  paint();
  container.append(head, seg, note);
  return container;
}
