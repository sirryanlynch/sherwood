/* One isometric appeal world. Camera stops are shared with the scroll scrub. */
export const STATIONS = ["check", "result", "plan", "intake", "sign", "file"];

/* View center is 640,380. Each pair is the translate that parks that station there. */
export const CAM = [
  [160, 0],
  [-380, -120],
  [-900, -220],
  [-1400, -340],
  [-1900, -460],
  [-2400, -580]
];

const HOLD = 0.07;
const TRAVEL = (1 - HOLD * CAM.length) / (CAM.length - 1);

export function cameraFrames() {
  const frames = [];
  let t = 0;
  for (let i = 0; i < CAM.length; i++) {
    frames.push([t, CAM[i]]);
    t += HOLD;
    frames.push([round(t), CAM[i]]);
    if (i < CAM.length - 1) t += TRAVEL;
  }
  return frames;
}

export function stationIndex(progress) {
  const cuts = [0.128, 0.314, 0.5, 0.686, 0.872];
  let index = 0;
  for (const cut of cuts) if (progress >= cut) index += 1;
  return index;
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

function grid() {
  const lines = [];
  for (let i = -6; i <= 42; i++) {
    const x = i * 64;
    lines.push(`M ${x} -160 L ${x + 1500} 590`);
  }
  for (let i = -10; i <= 28; i++) {
    const x = i * 64;
    lines.push(`M ${x} 1280 L ${x + 1500} 530`);
  }
  return `<g class="layer-far" fill="none" stroke="#d9d3c8" stroke-width="1.5" stroke-linejoin="round">${lines.map(d => `<path d="${d}"/>`).join("")}</g>`;
}

const house = `
  <polygon points="-30,-95 190,15 30,95 -190,-15" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
  <polygon points="-20,-60 120,10 120,-38 -20,-108" fill="#f7f4ee" stroke="#1c2421" stroke-width="1.5"/>
  <polygon points="120,10 20,60 20,12 120,-38" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
  <polygon points="-20,-108 120,-38 0,-92" fill="#9fd4ce" stroke="#0e6e68" stroke-width="1.5"/>
  <polygon points="120,-38 20,12 0,-92" fill="#128f88" stroke="#0e6e68" stroke-width="1.5"/>
  <polygon points="20,12 -120,-58 0,-92" fill="#0f7f78" stroke="#0e6e68" stroke-width="1.5"/>
  <polygon points="-120,-58 -20,-108 0,-92" fill="#b7ddd8" stroke="#0e6e68" stroke-width="1.5"/>
  <polygon points="96,-2 112,6 112,-22 96,-30" fill="#128f88"/>
  <polygon points="90,9 74,17 74,1 90,-7" fill="#d7efec" stroke="#128f88" stroke-width="1.5"/>
`;

export function worldMarkup() {
  return `<svg class="world-svg" viewBox="0 0 1280 760" fill="none" aria-hidden="true">
  ${grid()}
  <g class="world">
    <path class="route" pathLength="1" d="M640 420 C820 450 1000 490 1180 540 C1360 580 1520 610 1700 640 C1880 680 2040 720 2200 760 C2380 800 2540 840 2700 880 C2880 920 3040 960 3200 1000"/>
    <g class="rider">
      <rect x="-24" y="-30" width="48" height="60" rx="3" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
      <path d="M-12 -12 H14 M-12 -2 H8 M-12 8 H12" stroke="#d5cfc3" stroke-width="1.5" stroke-linecap="round"/>
    </g>
    <g transform="translate(640 380)">
      <ellipse cx="10" cy="78" rx="120" ry="16" fill="#e6e0d4"/>
      ${house}
      <g class="ambient pin">
        <path d="M20 -10 V-46" stroke="#128f88" stroke-width="1.5"/>
        <circle class="pin-dot" cx="20" cy="-52" r="6" fill="#128f88"/>
        <circle cx="20" cy="-52" r="2.2" fill="#fffcf8"/>
      </g>
      <g class="ambient dots" fill="#128f88">
        <circle cx="-70" cy="-120" r="2.2"/>
        <circle cx="-54" cy="-132" r="1.5"/>
        <circle cx="-84" cy="-136" r="1.3"/>
        <circle cx="-46" cy="-112" r="1.2"/>
      </g>
    </g>
    <g transform="translate(1180 500)">
      <ellipse cx="20" cy="120" rx="90" ry="14" fill="#e6e0d4"/>
      <g transform="translate(-20 8) rotate(-7)">
        <rect x="16" y="8" width="150" height="190" rx="6" fill="#f3efe8" stroke="#cfc8bc" stroke-width="1.5"/>
      </g>
      <g class="ambient sheet">
        <rect x="0" y="0" width="168" height="214" rx="8" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
        <rect x="0" y="0" width="168" height="36" rx="8" fill="#128f88"/>
        <rect x="0" y="22" width="168" height="14" fill="#128f88"/>
        <path d="M18 58 H120 M18 74 H140 M18 90 H100 M18 114 H130 M18 130 H90" stroke="#d5cfc3" stroke-width="1.5" stroke-linecap="round"/>
        <rect x="18" y="156" width="52" height="28" rx="4" fill="#d7efec" stroke="#128f88" stroke-width="1.5"/>
      </g>
    </g>
    <g transform="translate(1700 600)">
      <ellipse cx="30" cy="90" rx="110" ry="14" fill="#e6e0d4"/>
      <path d="M-90 40 L10 -10 L150 40 L50 100 Z" fill="#f3efe8" stroke="#1c2421" stroke-width="1.5"/>
      <path d="M-90 40 L10 70 L50 100 L-10 130 L-90 80 Z" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
      <path d="M10 -10 L150 40 L150 90 L10 130 L10 70 Z" fill="#f7f4ee" stroke="#1c2421" stroke-width="1.5"/>
      <g transform="translate(20 -70)">
        <g class="ambient sheet">
          <rect width="120" height="150" rx="6" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
          <path d="M14 28 H90 M14 44 H70" stroke="#d5cfc3" stroke-width="1.5" stroke-linecap="round"/>
          <rect x="14" y="70" width="40" height="28" rx="3" fill="#f3d36b"/>
          <rect x="62" y="70" width="40" height="28" rx="3" fill="#d7efec" stroke="#128f88" stroke-width="1.5"/>
        </g>
      </g>
    </g>
    <g transform="translate(2200 720)">
      <ellipse cx="0" cy="80" rx="100" ry="14" fill="#e6e0d4"/>
      <g transform="scale(.72) translate(-40 -20)">${house}</g>
      <g transform="translate(70 -40) rotate(8)">
        <g class="ambient sheet">
          <rect width="92" height="112" rx="5" fill="#fffcf8" stroke="#128f88" stroke-width="1.5"/>
          <rect x="8" y="8" width="76" height="62" rx="3" fill="#d7efec"/>
          <path d="M16 62 L36 44 L52 56 L70 36 L84 62" stroke="#128f88" stroke-width="1.5" fill="none"/>
        </g>
      </g>
      <g transform="translate(28 10) rotate(-8)">
        <rect width="72" height="88" rx="5" fill="#fffcf8" stroke="#cfc8bc" stroke-width="1.5"/>
        <rect x="8" y="8" width="56" height="48" rx="3" fill="#f3efe8"/>
      </g>
    </g>
    <g transform="translate(2700 840)">
      <ellipse cx="10" cy="110" rx="100" ry="14" fill="#e6e0d4"/>
      <g transform="rotate(-5)">
        <rect x="-20" y="-20" width="200" height="230" rx="8" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
        <path d="M0 16 H120 M0 36 H150 M0 64 H100" stroke="#e0dad0" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M4 120 C30 96 48 140 74 112 S120 90 150 124" stroke="#1c2421" stroke-width="1.5" fill="none" stroke-linecap="round"/>
        <path d="M4 140 H150" stroke="#128f88" stroke-width="1.5" stroke-linecap="round"/>
      </g>
      <g transform="translate(150 20) rotate(28)">
        <rect width="12" height="92" rx="6" fill="#128f88"/>
        <path d="M6 92 L0 112 L12 112 Z" fill="#1c2421"/>
      </g>
    </g>
    <g transform="translate(3200 960)">
      <ellipse cx="20" cy="100" rx="120" ry="16" fill="#e6e0d4"/>
      <path d="M-80 20 L40 -40 L40 120 L-80 170 Z" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
      <path d="M40 -40 L170 10 L170 160 L40 120 Z" fill="#f6f2eb" stroke="#1c2421" stroke-width="1.5"/>
      <rect x="-40" y="40" width="40" height="52" rx="3" fill="#fffcf8" stroke="#cfc8bc" stroke-width="1.5"/>
      <rect x="70" y="60" width="52" height="64" rx="3" fill="#d7efec" stroke="#128f88" stroke-width="1.5"/>
      <g transform="translate(150 -20)">
        <g class="ambient stamp-seal">
          <circle cx="0" cy="0" r="46" fill="#fffcf8" stroke="#128f88" stroke-width="1.5"/>
          <circle cx="0" cy="0" r="36" stroke="#128f88" stroke-width="1.5"/>
          <text x="0" y="-4" text-anchor="middle" fill="#128f88" font-family="Outfit, Inter, sans-serif" font-size="11" font-weight="700">VALUE</text>
          <text x="0" y="12" text-anchor="middle" fill="#128f88" font-family="Outfit, Inter, sans-serif" font-size="11" font-weight="700">LOWERED</text>
        </g>
      </g>
    </g>
  </g>
  <g class="layer-near">
    <g transform="translate(980 640)">
      <rect x="0" y="0" width="70" height="36" rx="3" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
      <rect x="8" y="10" width="70" height="36" rx="3" fill="#f7f4ee" stroke="#1c2421" stroke-width="1.5"/>
      <rect x="22" y="18" width="18" height="4" rx="1" fill="#f3d36b"/>
    </g>
    <g transform="translate(2500 1180)">
      <rect x="0" y="20" width="120" height="28" rx="4" fill="#fffcf8" stroke="#1c2421" stroke-width="1.5"/>
      <circle cx="28" cy="52" r="14" fill="none" stroke="#128f88" stroke-width="6"/>
      <circle cx="92" cy="52" r="14" fill="none" stroke="#128f88" stroke-width="6"/>
    </g>
  </g>
</svg>`;
}
