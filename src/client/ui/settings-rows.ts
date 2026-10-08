// The pieces ⚙️ Settings' rows are made of (see settings.ts).

import { h } from './dom';
import { t } from './i18n';

/** A row of buttons to pick one of `options` from. `get` says which is picked now, and `set` picks another. */
export function choiceRow<T>(label: string, options: readonly (readonly [value: T, label: string])[], get: () => T, set: (value: T) => void): HTMLElement {
  const row = h('div.seg', { role: 'radiogroup', 'aria-label': t(label) });
  const paint = () =>
    row.replaceChildren(
      ...options.map(([value, text]) =>
        h(
          'button.btn',
          {
            type: 'button',
            role: 'radio',
            'aria-checked': String(get() === value),
            class: get() === value ? 'on' : '',
            onclick: () => {
              if (get() === value) return;
              set(value);
              paint();
            },
          },
          t(text),
        ),
      ),
    );
  paint();
  return row;
}
