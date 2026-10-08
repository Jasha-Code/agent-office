import * as THREE from 'three';
import { mesh, toon } from '../toon';
import type { PersonRig } from './rig';

export type FormalRole = 'manager' | 'tech_lead' | 'product' | 'analyst' | 'engineer';
export type FormalStyle = 'suit' | 'smart' | 'casual';

export interface FormalRoleInfo {
  id: FormalRole;
  icon: string;
  label: string;
  persianLabel: string;
  desc: string;
  persianDesc: string;
  defaultColor: string;
  tieColor: string;
  style: FormalStyle;
}

export const FORMAL_ROLES: FormalRoleInfo[] = [
  {
    id: 'manager',
    icon: '👔',
    label: 'Executive Manager',
    persianLabel: 'مدیر ارشد / مدیرعامل',
    desc: 'Strategic leadership, formal suit & executive tie',
    persianDesc: 'رهبری استراتژیک، کت‌وشلوار رسمی و کراوات دیپلماتیک',
    defaultColor: '#1b2a4a', // Dark Navy Suit
    tieColor: '#991b1b', // Diplomatic Crimson Tie
    style: 'suit',
  },
  {
    id: 'tech_lead',
    icon: '💼',
    label: 'Tech Lead',
    persianLabel: 'مدیر فنی / هد مهندسی',
    desc: 'Architecture & technical leadership, charcoal jacket',
    persianDesc: 'معماری و رهبری فنی، کت زغالی رسمی و باوقار',
    defaultColor: '#2b2d42', // Charcoal Suit
    tieColor: '#1e3a8a', // Deep Blue Tie
    style: 'suit',
  },
  {
    id: 'product',
    icon: '🎯',
    label: 'Product Manager',
    persianLabel: 'مدیر محصول',
    desc: 'Product strategy & execution, smart executive blazer',
    persianDesc: 'استراتژی و هدایت محصول، کت اداری شیک و مدرن',
    defaultColor: '#334155', // Slate Suit
    tieColor: '#0f766e', // Teal / Dark Cyan Tie
    style: 'suit',
  },
  {
    id: 'analyst',
    icon: '📊',
    label: 'Senior Analyst',
    persianLabel: 'تحلیل‌گر ارشد سیستم',
    desc: 'Data insights & business strategy, classic suit',
    persianDesc: 'تحلیل داده و بیزینس، پوشش کلاسیک و اداری',
    defaultColor: '#374151', // Dark Grey Suit
    tieColor: '#7c2d12', // Bronze / Rust Tie
    style: 'suit',
  },
  {
    id: 'engineer',
    icon: '💻',
    label: 'Senior Engineer',
    persianLabel: 'مهندس ارشد نرم‌افزار',
    desc: 'Core architecture & focused development',
    persianDesc: 'توسعه زیرساخت و معماری، پیراهن رسمی اتوکشیده',
    defaultColor: '#2563eb', // Royal Blue
    tieColor: '#1e293b', // Dark Tie
    style: 'smart',
  },
];

export const FORMAL_COLORS = [
  '#1b2a4a', // سرمه‌ای تیره رسمی (Navy Blue Suit)
  '#111827', // مشکی اداری (Charcoal Black)
  '#2b2d42', // زغالی پرستیژ (Deep Charcoal)
  '#334155', // خاکستری دیپلمات (Slate Suit)
  '#475569', // طوسی اداری (Classic Grey)
  '#3f3228', // قهوه‌ای شکلاتی فاخر (Executive Brown)
  '#1e3a5f', // آبی اقیانوسی رسمی (Ocean Navy)
  '#581c87', // بنفش سلطنتی ملایم (Royal Plum)
  '#0f4c3a', // سبز اداری تیره (Emerald Spruce)
  '#f8fafc', // سفید اداری (Executive White)
];

export const PERSIAN_FORMAL_NAMES = [
  'مدیر رادمنش',
  'مدیر پرهام',
  'مدیر شایان',
  'مدیر باربد',
  'مدیر افشین',
  'مهندس آریا',
  'مهندس پارسا',
  'مهندس سپهر',
  'مهندس کیان',
  'مهندس بردیا',
  'مهندس سهراب',
  'دکتر کاوه',
  'دکتر سام',
  'مشاور دانیال',
  'مدیر تهمتن',
  'مهندس نیما',
];

/**
 * Creates formal corporate accessories (lapels, collar, tie, buttons, pocket square)
 * and attaches them to a Person's rig.
 */
export function applyFormalAttire(
  rig: PersonRig,
  style: FormalStyle,
  role: FormalRole,
  suitColor = '#1b2a4a',
  customTieColor?: string,
): THREE.Object3D[] {
  const parts: THREE.Object3D[] = [];
  const info = FORMAL_ROLES.find((r) => r.id === role) ?? FORMAL_ROLES[0];
  const tieHex = customTieColor ?? info.tieColor;

  if (style === 'casual') return parts;

  const torso = rig.torso;
  const white = toon('#ffffff');
  const suitMat = toon(suitColor);
  const tieMat = toon(tieHex);
  const gold = toon('#d97706');

  // 1. Crisp white formal shirt collar (two angled flaps around the neck)
  const collarL = mesh(new THREE.BoxGeometry(0.08, 0.05, 0.02), white, -0.05, 0.12, 0.25);
  collarL.rotation.z = -0.35;
  torso.add(collarL);
  parts.push(collarL);

  const collarR = mesh(new THREE.BoxGeometry(0.08, 0.05, 0.02), white, 0.05, 0.12, 0.25);
  collarR.rotation.z = 0.35;
  torso.add(collarR);
  parts.push(collarR);

  // 2. Formal necktie
  // Knot at collar center
  const knot = mesh(new THREE.BoxGeometry(0.055, 0.045, 0.025), tieMat, 0, 0.11, 0.262);
  torso.add(knot);
  parts.push(knot);

  // Tie blade hanging down the front of the shirt
  const tieBlade = mesh(new THREE.BoxGeometry(0.048, 0.22, 0.015), tieMat, 0, -0.01, 0.262);
  torso.add(tieBlade);
  parts.push(tieBlade);

  // Tie clip / bar (gold metallic accent)
  const clip = mesh(new THREE.BoxGeometry(0.042, 0.01, 0.008), gold, 0.005, 0.02, 0.272);
  torso.add(clip);
  parts.push(clip);

  // 3. If full suit style: add suit jacket lapels & pocket square
  if (style === 'suit') {
    // Left suit jacket lapel
    const lapelL = mesh(new THREE.BoxGeometry(0.07, 0.24, 0.022), suitMat, -0.11, 0.02, 0.255);
    lapelL.rotation.z = -0.15;
    torso.add(lapelL);
    parts.push(lapelL);

    // Right suit jacket lapel
    const lapelR = mesh(new THREE.BoxGeometry(0.07, 0.24, 0.022), suitMat, 0.11, 0.02, 0.255);
    lapelR.rotation.z = 0.15;
    torso.add(lapelR);
    parts.push(lapelR);

    // Pocket square (white handkerchief in breast pocket)
    const pocket = mesh(new THREE.BoxGeometry(0.05, 0.016, 0.015), white, 0.12, 0.06, 0.262);
    pocket.rotation.z = 0.1;
    torso.add(pocket);
    parts.push(pocket);

    // Suit buttons (two subtle buttons down front)
    for (const by of [-0.07, -0.13]) {
      const btn = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.008, 8), gold, 0, by, 0.264);
      btn.rotation.x = Math.PI / 2;
      torso.add(btn);
      parts.push(btn);
    }
  }

  for (const p of parts) {
    p.castShadow = true;
  }

  return parts;
}

export function removeFormalAttire(parts: THREE.Object3D[]): void {
  for (const p of parts) {
    p.parent?.remove(p);
    if ((p as THREE.Mesh).geometry) (p as THREE.Mesh).geometry.dispose();
  }
  parts.length = 0;
}
