import './queue.css';
import type { AgentProvider, QueueTask, Usage } from '../../shared/protocol';
import type { Net } from '../net';
import { store } from '../state';
import { h, openModal, timeAgo, STATUS_LABEL } from './dom';
import { confirmDialog } from './prompt';
import { providerPicker, providerLabel, providerUsageState, providerWaitingLabel, resolvedProvider, modelBadge } from './provider';
import { officeFull } from '../../shared/machine';
import { dictateField } from './dictate';
import { t } from './i18n';

export interface QueueActions {
  openTerminal(workerId: string): void;
}

/** The queue task's name, linked to its GitHub issue when it has one. */
function taskTitle(task: QueueTask): HTMLElement {
  if (task.issue === undefined) return h('div.queue-title', { title: task.prompt }, task.title);
  const issue = store.issues.items.find((i) => i.number === task.issue);
  const text = task.title.startsWith(`#${task.issue}`) ? task.title : `#${task.issue} ${task.title}`;
  return h('div.queue-title', { title: task.prompt }, issue ? h('a', { href: issue.url, target: '_blank', rel: 'noopener' }, text) : text);
}

function outcome(task: QueueTask): string {
  switch (task.outcome) {
    case 'done':
      return task.pr ? t('finished') : t('finished, no PR found yet');
    case 'exited':
      return task.error ? `${t('stopped')}: ${task.error}` : t('stopped before finishing');
    case 'killed':
      return t('sent home');
    case 'failed':
      return `${t("couldn't start")}: ${task.error ?? t('unknown error')}`;
    default:
      return '';
  }
}

export function openQueue(net: Net, actions: QueueActions) {
  const body = h('div.body.queue');
  const close = h('button.btn.close', { 'aria-label': t('Close'), title: `${t('Close')} (Esc)` }, '✕');
  const limitValue = h('b');
  const minus = h('button.btn', { type: 'button', title: t('Fewer workers at once'), 'aria-label': t('Fewer workers at once') }, '−');
  const plus = h('button.btn', { type: 'button', title: t('More workers at once'), 'aria-label': t('More workers at once') }, '+');
  const limit = h('div.queue-limit', { title: t('How many workers the queue keeps busy at once. 0 pauses it.') }, t('Workers at once'), minus, limitValue, plus);
  minus.addEventListener('click', () => net.send({ t: 'queue.limit', maxWorkers: store.queue.maxWorkers - 1 }));
  plus.addEventListener('click', () => net.send({ t: 'queue.limit', maxWorkers: store.queue.maxWorkers + 1 }));
  const el = h(
    'div.modal',
    { role: 'dialog', 'aria-label': t('Task queue'), style: 'width:min(800px,100%)' },
    h('header', {}, h('h2', {}, `📋 ${t('Task queue')}`), limit, close),
    body,
    h('footer', {}, h('span.grow', {}, t('The queue keeps going while you are away. Set “workers at once” to 0 to pause it.'))),
  );

  const ta = h('textarea', { rows: 2, placeholder: t('Describe a task for the next free worker…'), 'aria-label': t('New task') }) as HTMLTextAreaElement;
  const provider = providerPicker(store.project, 'queue-provider');
  const addBtn = h('button.btn.primary', { type: 'submit' }, t('Add to queue'));
  const form = h('form.queue-add', {}, dictateField(ta), provider.element, addBtn) as HTMLFormElement;
  form.noValidate = true;
  const submit = () => {
    const text = ta.value.trim();
    if (!text) {
      ta.focus();
      return;
    }
    if (!provider.valid()) return;
    net.send({ t: 'queue.add', prompt: text, provider: provider.value(), model: provider.model(), effort: provider.effort() });
    ta.value = '';
  };
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    submit();
  });
  ta.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault();
      submit();
    }
  });

  const section = (title: string, tasks: QueueTask[], extra?: HTMLElement) => {
    if (!tasks.length) return null;
    return h('div', {}, h('h4', {}, title, h('span.count', {}, String(tasks.length)), extra ?? null), h('ul.queue-list', {}, ...tasks.map(row)));
  };

  const row = (task: QueueTask): HTMLElement => {
    const w = task.workerId ? store.workers.get(task.workerId) : undefined;
    const meta: string[] = [];
    const buttons: HTMLElement[] = [];
    const badge = modelBadge(task.provider, task.model, task.effort);
    const model = badge ? ` · initial: ${badge}` : '';
    const usageSuffix = (provider: AgentProvider | undefined, usage?: Usage) => {
      const state = providerUsageState(provider, store.project, usage);
      if (state === 'untracked') return ' · usage untracked';
      if (state !== 'waiting') return '';
      const waiting = providerWaitingLabel(provider, store.project);
      return waiting ? ` · ${waiting}` : '';
    };
    let pos: string | null = null;
    if (task.status === 'running') {
      const selectedProvider = providerLabel(task.provider ?? w?.provider, store.project);
      meta.push(`⚙️ ${selectedProvider}${model}${usageSuffix(task.provider ?? w?.provider, w?.usage)}`);
      meta.push(`${task.workerName ?? t('a worker')} · ${w ? STATUS_LABEL[w.status] ?? w.status : t('gone')}`);
      if (task.branch) meta.push(`🌿 ${task.branch}`);
      if (task.startedAt) meta.push(`${t('started')} ${timeAgo(task.startedAt)}`);
      meta.push(`${t('by')} ${task.addedBy}`);
      if (w) {
        buttons.push(h('button.btn', { type: 'button', onclick: () => actions.openTerminal(w.id) }, t('🖥️ Terminal')));
        buttons.push(
          h('button.btn', {
            type: 'button',
            title: t('Send the worker home; the task counts as stopped'),
            onclick: () => confirmDialog(`${t('Stop')} ${w.name}?`, `This sends ${w.name} home and stops the task. You can requeue it afterwards.`, t('Stop'), () => net.send({ t: 'worker.kill', workerId: w.id })),
          }, t('⏹ Stop')),
        );
      }
    } else if (task.status === 'queued') {
      const queued = store.queue.tasks.filter((x) => x.status === 'queued');
      const i = queued.indexOf(task);
      pos = String(i + 1);
      meta.push(`⚙️ ${providerLabel(task.provider, store.project)}${model}${usageSuffix(task.provider, w?.usage)}`);
      meta.push(`${t('added by')} ${task.addedBy} ${timeAgo(task.addedAt)}`);
      buttons.push(h('button.btn', { type: 'button', title: t('Move up'), 'aria-label': t('Move up'), disabled: i === 0, onclick: () => net.send({ t: 'queue.move', taskId: task.id, delta: -1 }) }, '↑'));
      buttons.push(h('button.btn', { type: 'button', title: t('Move down'), 'aria-label': t('Move down'), disabled: i === queued.length - 1, onclick: () => net.send({ t: 'queue.move', taskId: task.id, delta: 1 }) }, '↓'));
      buttons.push(h('button.btn', { type: 'button', title: t('Remove from the queue'), 'aria-label': t('Remove'), onclick: () => net.send({ t: 'queue.remove', taskId: task.id }) }, '✕'));
    } else {
      meta.push(`⚙️ ${providerLabel(task.provider, store.project)}${model}${usageSuffix(task.provider, w?.usage)}`);
      meta.push(outcome(task));
      if (task.workerName) meta.push(task.workerName);
      if (task.branch) meta.push(`🌿 ${task.branch}`);
      if (task.finishedAt) meta.push(timeAgo(task.finishedAt));
      if (task.pr) buttons.push(h('a.btn', { href: task.pr.url, target: '_blank', rel: 'noopener', title: task.pr.title }, `🔀 PR #${task.pr.number}${task.pr.state === 'MERGED' ? ' ✓' : task.pr.state === 'DRAFT' ? ' (draft)' : ''}`));
      if (w) buttons.push(h('button.btn', { type: 'button', onclick: () => actions.openTerminal(w.id) }, t('🖥️ Terminal')));
      buttons.push(h('button.btn', { type: 'button', title: t('Put it back on the queue'), onclick: () => net.send({ t: 'queue.retry', taskId: task.id }) }, t('↻ Requeue')));
      buttons.push(h('button.btn', { type: 'button', title: t('Forget it'), 'aria-label': t('Remove'), onclick: () => net.send({ t: 'queue.remove', taskId: task.id }) }, '✕'));
    }
    return h(
      'li',
      { class: task.status },
      pos ? h('span.pos', {}, pos) : null,
      h('div.queue-main', {}, taskTitle(task), h('div.queue-meta', {}, meta.join(' · '))),
      h('div.queue-actions', {}, ...buttons),
    );
  };

  // The form stays put and only the list below it re-renders, so worker updates don't pull focus out of the textarea.
  const list = h('div');
  body.append(form, list);

  const render = () => {
    const q = store.queue;
    limitValue.textContent = q.maxWorkers === 0 ? t('Paused') : String(q.maxWorkers);
    minus.toggleAttribute('disabled', q.maxWorkers <= 0);
    const running = q.tasks.filter((t) => t.status === 'running');
    const queued = q.tasks.filter((t) => t.status === 'queued');
    const done = q.tasks.filter((t) => t.status === 'done').slice().reverse();
    const m = store.machine;
    const parts: (HTMLElement | null)[] = [
      h(
        'p.note',
        {},
        t('Or open the 📌 Issues board and click Add to queue on an issue.'),
      ),
      queued.length && officeFull(m)
        ? h('p.note', {}, `⏸ ${t('Office is full, waiting for workers to finish.')}`)
        : null,
      section(`🤖 ${t('Working on it')}`, running),
      section(`⏳ ${t('Up next')}`, queued),
      section(`✅ ${t('Finished')}`, done, h('button.btn', { type: 'button', onclick: () => net.send({ t: 'queue.clear' }) }, t('Clear'))),
      running.length + queued.length + done.length ? null : h('div.queue-empty', {}, t('Nothing on the queue yet.')),
    ];
    list.replaceChildren(...parts.filter((n): n is HTMLElement => n !== null));
  };

  // The machine reports every few seconds; only a change to whether the office is full shows here.
  let full = '';
  const machineChanged = () => {
    const k = `${officeFull(store.machine)}|${store.machine.limit}`;
    if (k === full) return;
    full = k;
    render();
  };
  const unsubs = [store.on('queue', render), store.on('workers', render), store.on('issues', render), store.on('machine', machineChanged)];
  const tick = setInterval(render, 30_000);
  const modal = openModal(el, {
    doing: '📥 at the queue',
    onClose: () => {
      unsubs.forEach((u) => u());
      clearInterval(tick);
    },
  });
  close.addEventListener('click', () => modal.close());
  render();
  setTimeout(() => ta.focus(), 30);
}
