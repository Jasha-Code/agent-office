import './character.css';
import * as THREE from 'three';
import { OutlineEffect } from 'three/examples/jsm/effects/OutlineEffect.js';
import { HAIR_COLOR_NAMES, HAIR_COLORS, HAIR_STYLES, SKIN_TONES, randomLook, randomName, type Look } from '../../shared/avatar';
import { AVATAR_COLORS, saveProfile, store, type Profile } from '../state';
import { Person } from '../world/character';
import { toonUnique } from '../world/toon';
import { applyFormalAttire, removeFormalAttire, FORMAL_COLORS, FORMAL_ROLES, PERSIAN_FORMAL_NAMES, type FormalRole, type FormalStyle } from '../world/character/formal';
import { h, openModal } from './dom';
import { t, currentLang } from './i18n';

/** A turntable with your character on it, drawn with its own small renderer. */
class Preview {
  readonly person: Person;
  private renderer: THREE.WebGLRenderer;
  private effect: OutlineEffect;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(28, 1, 0.1, 20);
  private raf = 0;
  private resize: ResizeObserver;
  private yaw = 0.5;
  private dragging = false;
  private lastDrag = -Infinity;
  private hopT = -1;
  private formalParts: THREE.Object3D[] = [];

  constructor(
    private canvas: HTMLCanvasElement,
    p: Profile,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.shadowMap.enabled = true;
    this.effect = new OutlineEffect(this.renderer, { defaultThickness: 0.0045, defaultColor: [0.17, 0.18, 0.26] });

    this.scene.add(new THREE.HemisphereLight('#fff5e6', '#c9a27a', 1.5));
    this.scene.add(new THREE.AmbientLight('#ffffff', 0.5));
    const sun = new THREE.DirectionalLight('#fff1d6', 2.2);
    sun.position.set(-3, 6, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.bias = -0.0008;
    sun.shadow.normalBias = 0.02;
    Object.assign(sun.shadow.camera, { left: -2, right: 2, top: 2, bottom: -2, near: 0.5, far: 20 });
    this.scene.add(sun);
    const rug = new THREE.Mesh(new THREE.CircleGeometry(0.9, 40), toonUnique('#ffd6a5'));
    rug.rotation.x = -Math.PI / 2;
    rug.receiveShadow = true;
    rug.material.userData.outlineParameters = { visible: false };
    this.scene.add(rug);

    this.person = new Person(p.name, p.color, p.look);
    this.person.showLabel(false);
    this.scene.add(this.person.root);
    this.camera.position.set(0, 1.35, 4.6);
    this.camera.lookAt(0, 0.95, 0);

    this.resize = new ResizeObserver(() => this.fit());
    this.resize.observe(canvas);
    this.fit();

    canvas.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      this.yaw += e.movementX * 0.012;
      this.lastDrag = performance.now();
    });
    const release = () => {
      this.dragging = false;
      this.lastDrag = performance.now();
    };
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);

    let last = performance.now();
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      this.tick(dt, now / 1000);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  setFormal(style: FormalStyle, role: FormalRole, color: string) {
    removeFormalAttire(this.formalParts);
    this.formalParts = applyFormalAttire(this.person.rig, style, role, color);
  }

  /** A little hop and wave, to show a change landed. */
  cheer() {
    this.hopT = 0;
    this.person.reach();
  }

  private fit() {
    const w = this.canvas.clientWidth;
    const hgt = this.canvas.clientHeight;
    if (!w || !hgt) return;
    this.renderer.setSize(w, hgt, false);
    this.camera.aspect = w / hgt;
    this.camera.updateProjectionMatrix();
  }

  private tick(dt: number, t: number) {
    // Left alone, the character sways from side to side so you see the hair from every angle.
    if (!this.dragging && performance.now() - this.lastDrag > 1500) {
      const want = Math.sin(t * 0.6) * 1.1;
      this.yaw += (want - this.yaw) * Math.min(1, dt * 1.5);
    }
    this.person.root.rotation.y = this.yaw;
    let y = 0;
    if (this.hopT >= 0) {
      this.hopT += dt * 3.2;
      y = Math.sin(Math.min(1, this.hopT) * Math.PI) * 0.18;
      if (this.hopT >= 1) this.hopT = -1;
    }
    this.person.root.position.y = y;
    this.person.update(dt, t, false, y > 0.01);
    this.effect.render(this.scene, this.camera);
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    this.resize.disconnect();
    removeFormalAttire(this.formalParts);
    this.scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) (o as THREE.Mesh).geometry.dispose();
    });
    this.renderer.dispose();
    this.renderer.forceContextLoss();
  }
}

/**
 * The character select screen: name, personality type, formal attire, skin tone, hair and shirt/suit.
 */
export function openCharacter(first: boolean, onSave: (p: Profile) => void) {
  let role: FormalRole = (localStorage.getItem('ao_role') as FormalRole) || 'manager';
  let style: FormalStyle = (localStorage.getItem('ao_style') as FormalStyle) || 'suit';

  const defaultRole = FORMAL_ROLES.find((r) => r.id === role) ?? FORMAL_ROLES[0];
  const pick: Profile = {
    ...store.profile,
    color: store.profile.color || defaultRole.defaultColor,
    look: { ...store.profile.look },
  };

  const canvas = h('canvas', { 'aria-label': t('Your character, drag to spin') }) as HTMLCanvasElement;
  const preview = new Preview(canvas, pick);
  preview.setFormal(style, role, pick.color);

  const getRandName = () => {
    if (currentLang() === 'fa') {
      return PERSIAN_FORMAL_NAMES[Math.floor(Math.random() * PERSIAN_FORMAL_NAMES.length)];
    }
    return randomName();
  };

  const initialPlaceholder = getRandName();
  const input = h('input', { type: 'text', maxlength: 24, value: pick.name === 'Guest' ? '' : pick.name, placeholder: initialPlaceholder, 'aria-label': t('Your name') }) as HTMLInputElement;
  const reroll = h('button.btn', { type: 'button', title: t('Random name'), 'aria-label': t('Random name') }, '🎲');
  reroll.addEventListener('click', () => {
    let name = getRandName();
    while (name === input.value || name === input.placeholder) name = getRandName();
    input.value = input.placeholder = name;
    input.focus();
  });
  const typedName = () => input.value.trim().slice(0, 24) || input.placeholder;

  const account = store.me.account;
  if (account) {
    input.value = account.name;
    input.readOnly = true;
    input.title = t('Your account name');
  }

  const roleRow = h('div.seg', { role: 'radiogroup', 'aria-label': t('Personality & Role') });
  const roleDesc = h('p.charsel-note', {});
  const attireRow = h('div.seg', { role: 'radiogroup', 'aria-label': t('Attire style') });
  const skinRow = h('div.swatches', { role: 'radiogroup', 'aria-label': t('Skin tone') });
  const styleRow = h('div.seg', { role: 'radiogroup', 'aria-label': t('Hair style') });
  const hairRow = h('div.swatches', { role: 'radiogroup', 'aria-label': t('Hair color') });
  const shirtRow = h('div.swatches', { role: 'radiogroup', 'aria-label': t('Suit & Shirt color') });

  const swatch = (color: string, label: string, on: boolean, choose: () => void) =>
    h('button.swatch', { type: 'button', role: 'radio', 'aria-checked': String(on), style: `background:${color}`, class: on ? 'sel' : '', 'aria-label': label, title: label, onclick: choose });

  const change = (look: Partial<Look>, color?: string) => {
    Object.assign(pick.look, look);
    if (color) pick.color = color;
    preview.person.setLook(pick.look);
    preview.person.setColor(pick.color);
    preview.setFormal(style, role, pick.color);
    preview.cheer();
    paint();
  };

  const setRole = (newRole: FormalRole) => {
    role = newRole;
    try {
      localStorage.setItem('ao_role', role);
    } catch {
      // storage blocked
    }
    const rInfo = FORMAL_ROLES.find((r) => r.id === role);
    if (rInfo) {
      if (style !== 'casual') pick.color = rInfo.defaultColor;
      if (currentLang() === 'fa' && !account && !input.value) {
        input.placeholder = getRandName();
      }
    }
    preview.person.setColor(pick.color);
    preview.setFormal(style, role, pick.color);
    preview.cheer();
    paint();
  };

  const setAttire = (newStyle: FormalStyle) => {
    style = newStyle;
    try {
      localStorage.setItem('ao_style', style);
    } catch {
      // storage blocked
    }
    preview.setFormal(style, role, pick.color);
    preview.cheer();
    paint();
  };

  const ALL_COLORS = [...new Set([...FORMAL_COLORS, ...AVATAR_COLORS])];

  const paint = () => {
    const { skin, hair, style: hairStyle } = pick.look;
    const isFa = currentLang() === 'fa';

    // Role options
    roleRow.replaceChildren(
      ...FORMAL_ROLES.map((r) =>
        h(
          'button.btn',
          { type: 'button', role: 'radio', 'aria-checked': String(r.id === role), class: r.id === role ? 'on' : '', onclick: () => setRole(r.id) },
          `${r.icon} ${isFa ? r.persianLabel : t(r.label)}`,
        ),
      ),
    );
    const activeRole = FORMAL_ROLES.find((r) => r.id === role) ?? FORMAL_ROLES[0];
    roleDesc.textContent = isFa ? activeRole.persianDesc : activeRole.desc;

    // Attire style options
    attireRow.replaceChildren(
      ...([
        ['suit', '👔 ' + (isFa ? 'کت‌وشلوار رسمی مدیریتی' : t('Executive Suit'))],
        ['smart', '👔 ' + (isFa ? 'رسمی اداری' : t('Smart Corporate'))],
        ['casual', '👕 ' + (isFa ? 'اسپرت اداری' : t('Casual'))],
      ] as const).map(([sKey, sLabel]) =>
        h('button.btn', { type: 'button', role: 'radio', 'aria-checked': String(sKey === style), class: sKey === style ? 'on' : '', onclick: () => setAttire(sKey) }, sLabel),
      ),
    );

    skinRow.replaceChildren(...SKIN_TONES.map((c, i) => swatch(c, `${t('Skin tone')} ${i + 1}`, i === skin, () => change({ skin: i }))));
    styleRow.replaceChildren(
      ...HAIR_STYLES.map((name, i) =>
        h('button.btn', { type: 'button', role: 'radio', 'aria-checked': String(i === hairStyle), class: i === hairStyle ? 'on' : '', onclick: () => change({ style: i }) }, t(name)),
      ),
    );
    hairRow.replaceChildren(...HAIR_COLORS.map((c, i) => swatch(c, t(HAIR_COLOR_NAMES[i]), i === hair, () => change({ hair: i }))));
    shirtRow.replaceChildren(...ALL_COLORS.map((c) => swatch(c, `${t('Color')} ${c}`, c === pick.color, () => change({}, c))));
  };
  paint();

  const surprise = h('button.btn', { type: 'button', title: t('Random look') }, t('🎲 Surprise me'));
  surprise.addEventListener('click', () => {
    const randRole = FORMAL_ROLES[Math.floor(Math.random() * FORMAL_ROLES.length)];
    role = randRole.id;
    style = Math.random() > 0.3 ? 'suit' : 'smart';
    try {
      localStorage.setItem('ao_role', role);
      localStorage.setItem('ao_style', style);
    } catch {
      // storage blocked
    }
    const newColor = FORMAL_COLORS[Math.floor(Math.random() * FORMAL_COLORS.length)];
    change(randomLook(), newColor);
  });

  const save = h('button.btn.primary', { type: 'submit' }, first ? t('Enter the office 🚪') : t('Save'));
  const close = h('button.btn.close', { type: 'button', 'aria-label': t('Close'), title: `${t('Close')} (Esc)` }, '✕');

  const form = h(
    'form.modal.charsel',
    { role: 'dialog', 'aria-label': t('Pick your character') },
    h('header', {}, h('h2', {}, first ? `👋 ${t('Pick your character')}` : `🧍 ${t('Your character')}`), close),
    h(
      'div.body',
      {},
      h('div.charsel-stage', {}, canvas, h('span.tip', {}, t('Drag to spin'))),
      h(
        'div.charsel-opts',
        {},
        h('label', {}, t('Your name')),
        account ? input : h('div.webhook', {}, input, reroll),
        account ? h('p.setting-note', {}, `🔑 Signed in as ${account.name}, so that's your name here.`) : null,
        h('label', {}, t('Personality & Role')),
        roleRow,
        roleDesc,
        h('label', {}, t('Attire style')),
        attireRow,
        h('label', {}, t('Skin tone')),
        skinRow,
        h('label', {}, t('Hair')),
        styleRow,
        h('label', {}, t('Hair color')),
        hairRow,
        h('label', {}, t('Suit & Shirt color')),
        shirtRow,
      ),
    ),
    h('footer', {}, surprise, h('span.grow'), save),
  ) as HTMLFormElement;

  let done = false;
  const finish = (name: string) => {
    done = true;
    store.profile = { name, color: pick.color, look: { ...pick.look } };
    saveProfile(store.profile);
    modal.close();
    onSave(store.profile);
  };
  const modal = openModal(form, {
    backdropCloses: !first,
    doing: '🪞 picking a new look',
    onClose: () => {
      preview.dispose();
      if (first && !done) finish(typedName());
    },
  });
  close.addEventListener('click', () => modal.close());
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    finish(typedName());
  });
  if (!account) setTimeout(() => input.focus(), 30);
}

