// Sherwood house study v7 — one bungalow. Camera, draws, and type are a pure function of scroll p.
export function mountHouse(runway) {
if (!runway || runway.dataset.mounted) return;
runway.dataset.mounted = "1";
const scene = runway.querySelector(".scene");
const beatEl = runway.querySelector("[data-beat-readout]");
const pctEl = runway.querySelector("[data-prog]");
const $ = (sel) => runway.querySelector(sel);
const $$ = (sel) => runway.querySelectorAll(sel);
if (!scene) return;
const H = 140, RMAX = 120;

// ---- handmade line helpers (seeded → identical every frame / load) ----
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
const L = (x1, y1, x2, y2, c = '') => `<path class="${c}" d="M${x1 + rnd() * .7} ${y1 + rnd() * .7}Q${(x1 + x2) / 2 + rnd() * 1.2} ${(y1 + y2) / 2 + rnd() * 1.2} ${x2 + rnd() * .7} ${y2 + rnd() * .7}"/>`;
const box = (x, y, w, h, c = '') => L(x, y, x + w, y, c) + L(x + w, y, x + w, y + h, c) + L(x + w, y + h, x, y + h, c) + L(x, y + h, x, y, c);
const win = (x, y, w, h) => `<rect class="glow" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/><rect class="frame" x="${x}" y="${y}" width="${w}" height="${h}" rx="3"/>` + L(x, y + h * .42, x + w, y + h * .42, 'thin');
const lap = (w, y0, y1) => { let s = ''; for (let y = y0; y < y1; y += 30) s += L(3, y, w - 3, y + rnd(), 'thin'); return s; };
const shingles = (w, h) => { let s = ''; for (let y = 40; y < h - 10; y += 46) s += L(6, y, w - 6, y, 'thin'); return s + box(0, 0, w, h); };
const svg = (w, h, b) => `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${b}</svg>`;
const div = (cls, parent = scene) => { const e = document.createElement('div'); e.className = cls; parent.appendChild(e); return e; };

// ---- house factory (hero + neighbours share it) ----
function makeHouse(parent, o) {
  const g = div('grp', parent), P = { g, o };
  const face = (n, w, h, fill, body, clip = '') => {
    const el = div('face', g);
    el.style.cssText = `width:${w}px;height:${h}px;left:${-w / 2}px;top:${-h / 2}px;${clip ? 'clip-path:' + clip : ''}`;
    el.innerHTML = `<div class="fill" style="background:${fill}"></div>` + svg(w, h, body); P[n] = el; return el;
  };
  P.gable = (R) => { // rebuilt when pitch changes
    for (const [n, front] of [['front', 1], ['back', 0]]) {
      const W = P.W, h = H + RMAX, top = RMAX - R; seed = o.seed + front;
      let b = L(0, RMAX, W / 2, top) + L(W / 2, top, W, RMAX) + L(0, h - 1, W, h - 1) + L(1, RMAX, 1, h) + L(W - 1, RMAX, W - 1, h) + L(0, RMAX + 2, W, RMAX + 2);
      b += lap(W, RMAX + 10, h - 4);
      for (let y = RMAX - 7; y > 9999; y -= 7) { const dx = (W / 2) * (RMAX - y) / R; b += L(dx + 3, y, W - dx - 3, y, 'thin'); } // gable shingles
      b += L(W / 2 - 14, RMAX - R * .32, W / 2 + 14, RMAX - R * .32) + L(W / 2, RMAX - R * .32 - 9, W / 2, RMAX - R * .32 + 9, 'thin'); // vent
      if (front) b += win(W / 2 - 98, RMAX + 26, 50, 54) + win(W / 2 + 48, RMAX + 26, 50, 54) + `<rect class="door" x="${W / 2 - 20}" y="${RMAX + 36}" width="40" height="${H - 36}" rx="20 20 0 0"/>` + `<path class="door" d="M${W / 2 - 20} ${RMAX + H}V${RMAX + 56}A20 20 0 0 1 ${W / 2 + 20} ${RMAX + 56}V${RMAX + H}Z"/>` + `<circle class="knob" cx="${W / 2 + 12}" cy="${RMAX + 100}" r="2.5"/>`;
      else b += win(W / 2 - 28, RMAX + 30, 56, 48);
      P[n]?.remove(); face(n, W, h, o.wall, b, `polygon(0 ${RMAX}px,50% ${top}px,100% ${RMAX}px,100% 100%,0 100%)`);
    }
    P.R = R;
  };
  P.W = o.W; P.D = o.D; P.gable(o.R);
  seed = o.seed + 5; face('left', o.D, H, o.wall2, lap(o.D, 8, H - 3) + box(0, 0, o.D, H) + win(36, 30, 46, 50) + win(130, 30, 46, 50));
  seed = o.seed + 6; face('right', o.D, H, o.wall2, lap(o.D, 8, H - 3) + box(0, 0, o.D, H) + win(80, 34, 60, 44));
  seed = o.seed + 7; face('roofL', 240, o.D + 36, o.roof, shingles(240, o.D + 36));
  seed = o.seed + 8; face('roofR', 240, o.D + 36, o.roof, shingles(240, o.D + 36));
  if (o.hero) {
    seed = 51; face('porch', 240, 90, '#c2b195', box(0, 0, 240, 90));
    seed = 52; face('step', 70, 14, '#b9a88c', box(0, 0, 70, 14));
    seed = 53; face('porchRoof', 260, 104, o.roof, shingles(260, 104));
    for (const n of ['postL', 'postR', 'postL2', 'postR2']) { seed++; face(n, 16, 96, '#f1ebe0', box(0, 0, 16, 96)); }
    seed = 61; face('chimney', 36, 130, '#b86f52', box(0, 0, 36, 130) + box(-4, 0, 44, 8));
    seed = 63; face('dormer', 96, 64, o.wall, L(0, 64, 0, 24) + L(96, 64, 96, 24) + L(0, 24, 48, 0) + L(48, 0, 96, 24) + win(28, 30, 40, 24), 'polygon(0 24px,50% 0,100% 24px,100% 100%,0 100%)');
  }
  return P;
}
function placeHouse(P, s) { // s: R, porch, dormer, widen
  const { W, D } = P, R = s.R ?? P.o.R, sh = (s.widen || 0) * 22;
  if (Math.abs(Math.round(R) - P.R) >= 2) P.gable(Math.round(R));
  const T = (n, tr, op = 1) => { if (P[n]) { P[n].style.transform = tr; P[n].style.opacity = op; } };
  const yG = -(H + RMAX) / 2, ww = W + 2 * sh;
  P.front.style.width = P.back.style.width = ww + 'px'; P.front.style.left = P.back.style.left = -ww / 2 + 'px';
  // keep svg proportional: scaleX on viewBox is fine for siding; windows stretch slightly (reads as widened)
  T('front', `translate3d(0,${yG}px,${D / 2}px)`); T('back', `translate3d(0,${yG}px,${-D / 2}px) rotateY(180deg)`);
  T('left', `translate3d(${-ww / 2}px,${-H / 2}px,0) rotateY(-90deg)`); T('right', `translate3d(${ww / 2}px,${-H / 2}px,0) rotateY(90deg)`);
  const a = Math.atan2(R, ww / 2), sl = Math.hypot(ww / 2, R) + 20, ad = a * 180 / Math.PI;
  for (const [n, sg] of [['roofL', -1], ['roofR', 1]]) {
    P[n].style.width = sl + 'px'; P[n].style.left = -sl / 2 + 'px';
    const cx = (ww / 4) + 10 * Math.cos(a) / 2, cy = -(H + R / 2) + 5 * Math.sin(a);
    T(n, `translate3d(${sg * cx}px,${cy}px,0) rotateZ(${sg * ad}deg) rotateX(90deg)`);
  }
  if (!P.o.hero) return;
  const k = s.porch, pd = 90 * k, pw = 240 * (0.8 + 0.2 * k);
  P.porch.style.width = pw + 'px'; P.porch.style.left = -pw / 2 + 'px';
  T('porch', `translate3d(0,-7px,${D / 2 + pd / 2}px) rotateX(90deg) scaleY(${k})`);
  T('step', `translate3d(0,-7px,${D / 2 + pd + 1}px)`);
  P.porchRoof.style.width = pw + 20 + 'px'; P.porchRoof.style.left = -(pw + 20) / 2 + 'px';
  T('porchRoof', `translate3d(0,${-H + 18 + pd * .14}px,${D / 2 + pd / 2 + 6}px) rotateX(${90 - 16}deg) scaleY(${k * 1.02})`);
  [['postL', -.47], ['postR', .47], ['postL2', -.17], ['postR2', .17]].forEach(([n, f], i) =>
    T(n, `translate3d(${f * pw}px,${-55}px,${D / 2 + pd - 10}px)`, i < 2 ? 1 : Math.max(0, (k - 1) * 3)));
  T('chimney', `translate3d(${ww / 2 + 18}px,${-H / 2 - 50}px,${-D / 4}px) rotateY(90deg)`);
  const d = s.dormer || 0;
  T('dormer', `translate3d(${-ww / 4}px,${-H - R * .42 - 24 + (1 - d) * 40}px,${D / 6}px) scale(${.4 + .6 * d})`, d);
}

const DR = (d, extra = '') => `<path class="draw ${extra}" d="${d}"/>`;
// ---- world: parcel plane, hero, neighbours, props ----
seed = 41;
const parcel = div('face'); parcel.style.cssText = 'width:900px;height:760px;left:-450px;top:-380px';
parcel.innerHTML = `<div class="fill" style="background:#e9e2d5"></div>` + svg(900, 760,
  DR('M150 120H750V640H150Z', 'lotd') + `<g class="lot">${box(150, 120, 600, 520, 'thin')}</g>` + L(0, 690, 900, 690, 'thin'));
const apn = div('pill'); apn.innerHTML = '<span style="display:flex;gap:8px;transform:scaleX(-1)">APN <i></i><i style="width:20px"></i></span>'; apn.style.display = 'none';
const street = div('face'); street.style.cssText = 'width:2600px;height:1800px;left:-1300px;top:-900px';
seed = 71; street.innerHTML = `<div class="fill" style="background:#ece6da"></div>` + svg(2600, 1800, L(0, 1220, 2600, 1220) + L(0, 1360, 2600, 1360));
const fx = (w, h, body) => { const e = div('face'); e.style.cssText = `width:${w}px;height:${h}px;left:${-w / 2}px;top:${-h / 2}px`; e.innerHTML = svg(w, h, body); return e; };
const porchFX = fx(280, 140, `<path class="ghost" d="M20 0V90H260V0"/>` + DR('M20 0V90H260V0', 'pd0') + DR('M9 0V131H271V0', 'pd1'));
const connFX = fx(2600, 1800, DR('M1180 900 Q900 760 690 860', 'cA') + DR('M1420 1000 Q1560 1280 1600 1500', 'cB'));
const pitchFX = fx(300, 260, `<path class="ghost" d="M0 120L150 50L300 120"/>` + DR('M0 120L150 24L300 120', 'pp'));
const C = { wall: '#efe3cd', wall2: '#e2d4bb', roof: '#4f4c48' };
const heroG = div('grp');
const hero = makeHouse(heroG, { hero: 1, W: 300, D: 240, R: 70, seed: 11, ...C });
hero.dormer.querySelector('svg').insertAdjacentHTML('beforeend', DR('M3 62V25L48 3L93 25V62', 'dd'));
const nbrs = [
  { x: -640, z: -40, W: 240, D: 200, R: 80, wall: '#d5dccb', wall2: '#c6cfbb', roof: '#5a5853', comp: 1 },
  { x: 300, z: -620, W: 260, D: 210, R: 64, wall: '#d3dde0', wall2: '#c3cfd3', roof: '#55534f', comp: 1 },
  { x: -1250, z: 60, W: 220, D: 190, R: 74, wall: '#ead4c8', wall2: '#dcc4b6', roof: '#5c5853' },
].map((o, i) => { const g = div('grp'); const P = makeHouse(g, { ...o, seed: 100 + i * 20 }); placeHouse(P, {}); P.x = o.x; P.z = o.z; if (o.comp) { P.flag = div('flag'); P.flag.innerHTML = '<span>COMP</span>'; } return P; });
const trees = [[-230, 210, 1], [230, -190, .8]].map(([x, z, k]) => { const e = div('tree'); e.innerHTML = '<svg viewBox="0 0 80 110"><path class="trunk" d="M40 108V62"/><circle class="canopy" cx="40" cy="40" r="34"/></svg>'; return { e, x, z, k }; });
const chip = (html, cls = '') => { const e = div('chip ' + cls); e.innerHTML = html; return e; };
const CH = [ // [el, key, pos(s) -> [x,y,z]]
  [chip('Assessed <b>$1.12M</b>', 'dark'), 'tags', s => [-170, -235, 160], 0],
  [chip('Market <b>$905–960k</b>', 'teal'), 'tags', s => [40, -235, 160], .35],
  [chip('Assessed ~17% above market · sample'), 'tags', s => [-60, -190, 170], .7],
  [chip('Frontage 50 ft'), 'lot', s => [-170, -36, 360], .1],
  [chip('Front 20 ft'), 'lot', s => [-430, -36, 230], .2],
  [chip('Side 5 ft'), 'lot', s => [-450, -36, 0], .3],
  [chip('Rear 15 ft'), 'lot', s => [40, -36, -340], .4],
  [chip('6,250 sq ft · R-1', 'teal'), 'lot', s => [-400, -36, -250], .5],
  [chip('Sample Ave'), 'lotst', s => [260, 0, 400], 0],
  [chip('Porch 6 → 9 ft', 'teal'), 'delta', s => [-20, -20, 120 + 90 * s.porch + 30], 0],
  [chip('Pitch 5:12 → 7:12', 'teal'), 'delta', s => [150, -H - s.R - 30, 0], .25],
  [chip('+ Gable dormer', 'teal'), 'delta', s => [-150, -H - s.R - 40, 60], .5],
  [chip('Width +3 ft'), 'delta', s => [-hero.W / 2 - 60, -H / 2, 0], .7],
  [chip('🏡 Your home', 'dark'), 'nb', s => [0, -330, 0], .2],
  [chip('Comp A · 0.1 mi · sold 2025 <small>sample</small>', 'teal'), 'comps', s => [-640, -420, -40], .3],
  [chip('Comp B · 0.2 mi · sold 2024 <small>sample</small>', 'teal'), 'comps', s => [300, -420, -620], .6],
  [chip('Sample Ave'), 'nb', s => [380, 0, 520], .4],
];
// ---- landing states (equal neighbours = plateau). Transitions are camera moves that reveal structure. ----
const base = { x: -170, yaw: -30, pitch: -14, zoom: 1, y: 0, R: 70, porch: 1, dormer: 0, widen: 0, tags: 0, lot: 0, delta: 0, nb: 0, comps: 0 };
const S = {
  establish: {},
  valuation: { yaw: -12, pitch: -8, zoom: 1.35, x: -200, y: 60, tags: 1 },
  lot: { yaw: -20, pitch: -62, zoom: .78, y: -30, lot: 1 },
  before: { yaw: -48, pitch: -16, zoom: 1.05, delta: 0 },
  after: { yaw: -48, pitch: -16, zoom: 1.05, R: 96, porch: 1.45, dormer: 1, widen: 1, delta: 1 },
  comps: { yaw: -14, pitch: -30, zoom: .5, x: -60, y: -20, R: 96, porch: 1.45, dormer: 1, widen: 1, nb: 1, comps: 1 },
  settle: { yaw: -30, pitch: -14, zoom: 1, R: 96, porch: 1.45, dormer: 1, widen: 1 },
};
const K = [[0, 'establish'], [.07, 'establish'], [.17, 'valuation'], [.27, 'valuation'], [.37, 'lot'], [.47, 'lot'],
  [.54, 'before'], [.57, 'before'], [.66, 'after'], [.72, 'after'], [.82, 'comps'], [.91, 'comps'], [.98, 'settle'], [1, 'settle']]
  .map(([at, n]) => ({ at, name: n, s: { ...base, ...S[n] } }));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
function pose(p) {
  P_ = p;
  let i = 0; while (i < K.length - 2 && p > K[i + 1].at) i++;
  const a = K[i], b = K[i + 1], t = ease(Math.min(1, Math.max(0, (p - a.at) / (b.at - a.at || 1))));
  const s = {}; for (const k in a.s) s[k] = a.s[k] + (b.s[k] - a.s[k]) * t;
  s.name = a.name === b.name ? a.name : `${a.name} → ${b.name}`; return s;
}
const dr = (p, a, b) => cl((p - a) / (b - a));
const LEN = new Map(); const len = e => { if (!LEN.has(e)) { const l = e.getTotalLength(); LEN.set(e, l); e.style.strokeDasharray = `${l} ${l}`; } return LEN.get(e); };
const setD = (sel, v) => $$(sel).forEach(e => { const l = len(e); e.style.strokeDashoffset = l * (1 - v); });
const vcard = $('.card[data-k="valuation"]');
function draws(p, s) { // scrubbed vector draws in transitions (pure function of p)
  if (vcard) vcard.style.setProperty('--v', dr(p, .09, .19));
  setD('.gap path', dr(p, .15, .21)); setD('.spark .ln', dr(p, .1, .2));
  setD('.lotd', dr(p, .29, .40));
  setD('.pd0', dr(p, .49, .54) * (1 - dr(p, .57, .62)));
  setD('.pd1', dr(p, .58, .66)); setD('.pp', dr(p, .6, .67)); setD('.dd', dr(p, .62, .68));
  const fxOn = cl(dr(p, .48, .52) - dr(p, .74, .8)); porchFX.style.opacity = pitchFX.style.opacity = fxOn;
  
  setD('.cA', dr(p, .76, .84)); setD('.cB', dr(p, .79, .87));
  $$('.cA,.cB').forEach(e => e.style.opacity = 1 - dr(p, .93, .98));
  const ww = hero.W + 2 * s.widen * 22;
  porchFX.style.transform = `translate3d(0,-8px,${hero.D / 2 + 70}px) rotateX(90deg)`;
  pitchFX.style.width = ww + 'px'; pitchFX.style.left = -ww / 2 + 'px';
  pitchFX.style.transform = `translate3d(0,${-(H + RMAX) / 2}px,${hero.D / 2 + 2}px)`;
}
let P_ = 0;
const bb = s => `rotateY(${-s.yaw}deg) rotateX(${-s.pitch}deg)`; // billboard
const cl = v => Math.max(0, Math.min(1, v));
function render(s) {
  const m = innerWidth < 900, X = m ? 0 : innerWidth * .2, Y = s.y - (m ? innerHeight * .02 : 0), Z = s.zoom * (m ? Math.min(.5, innerWidth / 800) : .8);
  draws(P_, s);
  scene.style.transform = `translate3d(${X}px,${Y}px,0) scale(${Z}) rotateX(${s.pitch}deg) rotateY(${s.yaw}deg)`;
  placeHouse(hero, s);
  parcel.style.transform = `translate3d(0,0,30px) rotateX(90deg)`;
  parcel.querySelector('.lot').style.opacity = .25 + .75 * s.lot;
  street.style.transform = `translate3d(0,1px,0) rotateX(90deg)`; street.style.opacity = s.nb;
  connFX.style.transform = `translate3d(0,-30px,0) rotateX(-90deg)`; connFX.style.opacity = s.nb;
  apn.style.transform = `translate3d(200px,-14px,260px) rotateX(-90deg) rotateZ(180deg) scale(1.6)`;
  for (const t of trees) t.e.style.transform = `translate3d(${t.x - 40}px,${-110 * t.k}px,${t.z}px) ${bb(s)} scale(${t.k})`;
  for (const [el, k, pos, d] of CH) {
    const v = k === 'lotst' ? s.lot : s[k]; const o = cl((v - d) / (1 - d || 1) * 1.5);
    const [x, y, z] = pos(s); el.style.opacity = o;
    el.style.transform = `translate3d(${x}px,${y - 14 + (1 - o) * 8}px,${z}px) ${bb(s)} scale(${1 / Math.max(.6, s.zoom)})`;
  }
  nbrs.forEach((P, i) => {
    const v = cl(s.nb * 1.6 - i * .3);
    P.g.style.transform = `translate3d(${P.x}px,${(1 - v) * 60}px,${P.z}px) scale(${.85 + .15 * v})`; P.g.style.opacity = v;
    if (P.flag) { const f = cl(s.comps * 2 - .6 - i * .4); P.flag.style.opacity = f; P.flag.style.transform = `translate3d(${P.x}px,${-P.o.R - 220 - (1 - f) * 30}px,${P.z}px) ${bb(s)} scale(2.2)`; }
  });
  if (beatEl) beatEl.textContent = s.name;
}

// ---- scroll → p (pure; exact reverse) ----
const reduce = matchMedia('(prefers-reduced-motion: reduce)');
let last = -1;
const cards=[...$$('.card')], rails=[...$$('.rail span[data-k]')];
const R8={establish:[0,.07],valuation:[.17,.27],lot:[.37,.47],after:[.54,.72],comps:[.82,.91],settle:[.97,1]};
function ui(p){const narrow=innerWidth<=900;let best='establish',bw=0;for(const c of cards){const [a,b]=R8[c.dataset.k];const w=cl(Math.min((p-a)/.05+1,(b-p)/.05+1));c.style.opacity=w;c.style.transform=narrow?'none':`translateY(calc(-50% + ${(1-w)*14}px))`;c.style.pointerEvents=w>.5?'auto':'none';if(w>bw){bw=w;best=c.dataset.k}}
const order=['establish','valuation','lot','after','comps'];const idx=Math.max(0,order.findIndex((k,i)=>p<(R8[order[i+1]]?.[0]??2)-.05));rails.forEach((r,i)=>r.classList.toggle('on',i===idx&&p<.95));}
const progress = () => { const r = runway.getBoundingClientRect(); return cl(-r.top / (runway.offsetHeight - innerHeight)); };
function frame() {
  if (reduce.matches) {
    if (last !== 0) { last = 0; render(pose(0)); if (pctEl) pctEl.style.width = "0%"; }
    requestAnimationFrame(frame);
    return;
  }
  const p = progress();
  if (p !== last) { last = p; render(pose(p)); if (pctEl) pctEl.style.width = (p * 100) + '%'; ui(p); }
  requestAnimationFrame(frame);
}
if (!reduce.matches) ui(0);
render(pose(0));
requestAnimationFrame(frame);
}
const houseRoot = document.querySelector("[data-house]");
if (houseRoot) mountHouse(houseRoot);
