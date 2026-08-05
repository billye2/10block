// Generate Chrome Web Store promo tiles (small 440x280, marquee 1400x560) in the
// PDF Mana house style: coral gradient background, white rounded tile with the mark.
// Run: node scripts/promo.mjs  → marketing/store/*.png
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'marketing', 'store');

const FONT = 'Helvetica Neue, Helvetica, Arial, sans-serif';

// White rounded tile holding the stop-sign "10" mark (same geometry as the
// extension icon, red-on-white for contrast on the coral background).
const octagonPoints = (a) => {
  const k = a * (Math.SQRT2 - 1);
  const pts = [
    [64 - k, 64 - a], [64 + k, 64 - a],
    [64 + a, 64 - k], [64 + a, 64 + k],
    [64 + k, 64 + a], [64 - k, 64 + a],
    [64 - a, 64 + k], [64 - a, 64 - k],
  ];
  return pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
};

const mark = (x, y, s) => `
  <g transform="translate(${x},${y}) scale(${s / 128})">
    <rect width="128" height="128" rx="30" fill="#ffffff"/>
    <g transform="translate(14,14) scale(0.78)">
      <polygon points="${octagonPoints(56)}" fill="url(#sign)" stroke="url(#sign)" stroke-width="8" stroke-linejoin="round"/>
      <polygon points="${octagonPoints(47)}" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linejoin="round" opacity="0.95"/>
      <rect x="36" y="40" width="11" height="48" rx="3" fill="#ffffff"/>
      <ellipse cx="73" cy="64" rx="14" ry="19" fill="none" stroke="#ffffff" stroke-width="10"/>
    </g>
  </g>`;

function tile(
  w,
  h,
  { tileX, tileY, tileS, tx, titleLines, tagY, tagSize, subY, subSize, decor },
) {
  const title = titleLines
    .map(
      ([text, y, size]) =>
        `<text x="${tx}" y="${y}" font-family="${FONT}" font-weight="800" font-size="${size}" fill="#ffffff">${text}</text>`,
    )
    .join('\n    ');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="${w}" y2="${h}" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#ff8369"/>
        <stop offset="1" stop-color="#e94b43"/>
      </linearGradient>
      <linearGradient id="sign" x1="64" y1="8" x2="64" y2="120" gradientUnits="userSpaceOnUse">
        <stop offset="0" stop-color="#ef4146"/>
        <stop offset="1" stop-color="#c1121f"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    ${decor}
    ${mark(tileX, tileY, tileS)}
    ${title}
    <text x="${tx + 2}" y="${tagY}" font-family="${FONT}" font-weight="700" font-size="${tagSize}" fill="#ffffff" opacity="0.95">Stop Doomscrolling · 10 / 30 / 60 min</text>
    <text x="${tx + 2}" y="${subY}" font-family="${FONT}" font-weight="600" font-size="${subSize}" fill="#ffffff" opacity="0.82">No early unblock — it lifts itself at 0:00</text>
  </svg>`;
}

const small = tile(440, 280, {
  tileX: 34,
  tileY: 96,
  tileS: 88,
  tx: 146,
  titleLines: [
    ['Block Site for', 118, 32],
    ['10 Minutes', 154, 32],
  ],
  tagY: 186,
  tagSize: 15,
  subY: 212,
  subSize: 12,
  decor: `
    <circle cx="402" cy="46" r="34" fill="#ffffff" opacity="0.08"/>
    <circle cx="44" cy="250" r="20" fill="#ffffff" opacity="0.08"/>
    <rect x="362" y="212" width="40" height="40" rx="11" fill="#ffffff" opacity="0.07" transform="rotate(15 382 232)"/>`,
});

const marquee = tile(1400, 560, {
  tileX: 130,
  tileY: 180,
  tileS: 200,
  tx: 380,
  titleLines: [['Block Site for 10 Minutes', 262, 72]],
  tagY: 330,
  tagSize: 38,
  subY: 392,
  subSize: 28,
  decor: `
    <circle cx="1300" cy="110" r="80" fill="#ffffff" opacity="0.08"/>
    <circle cx="120" cy="470" r="44" fill="#ffffff" opacity="0.07"/>
    <rect x="1180" y="380" width="90" height="90" rx="22" fill="#ffffff" opacity="0.06" transform="rotate(15 1225 425)"/>
    <circle cx="1360" cy="430" r="26" fill="#ffffff" opacity="0.09"/>`,
});

for (const [name, svg, w] of [
  ['promo-tile-440x280', small, 440],
  ['marquee-1400x560', marquee, 1400],
]) {
  const png = new Resvg(svg, {
    fitTo: { mode: 'width', value: w },
    font: { loadSystemFonts: true },
  })
    .render()
    .asPng();
  writeFileSync(join(outDir, `${name}.png`), png);
  console.log(`${name}.png  (${png.length} bytes)`);
}
