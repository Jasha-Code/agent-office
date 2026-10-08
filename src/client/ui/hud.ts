import './hud.css';
import { h, openModal } from './dom';
import { HELP_ROWS } from './help';
import { t } from './i18n';

export function openHelp() {
  const close = h('button.btn.close', { 'aria-label': t('Close') }, '✕');
  const el = h(
    'div.modal',
    { role: 'dialog', 'aria-label': t('Controls') },
    h('header', {}, h('h2', {}, `🎮 ${t('Controls')}`), close),
    h('div.body', {}, h('div.help-grid', {}, ...HELP_ROWS.flatMap(([k, v]) => [h('span.key', {}, k), h('span', {}, t(v))]))),
  );
  const modal = openModal(el);
  close.addEventListener('click', () => modal.close());
}
