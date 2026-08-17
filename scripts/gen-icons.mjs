// Generate the extension icons: red stop-sign octagon with a white "10".
// Writes src/icons/icon.svg (design source) and rasterizes the PNG sizes.
//
//   node scripts/gen-icons.mjs                       # src/icons/icon{16,48,128}.png
//   node scripts/gen-icons.mjs --store <out.png>     # 120px mark centered on a 128px canvas
import { Resvg } from '@resvg/resvg-js';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Regular octagon centered at (64,64), flat top like a road stop sign.
// `a` is the half-width; corners are rounded by drawing a same-color stroke.
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

// The mark in a 128 viewBox. `small` drops the border ring and fattens the
// digits so the sign still reads at 16px.
function markSvg({ small = false } = {}) {
  const sw = 8; // corner-rounding stroke; polygon shrunk by sw/2 so overall size stays 120
  const body = octagonPoints(56);
  const ring = octagonPoints(47);
  const digits = small
    ? `<rect x="31" y="36" width="15" height="56" rx="4" fill="#ffffff"/>
       <ellipse cx="76" cy="64" rx="15.5" ry="21" fill="none" stroke="#ffffff" stroke-width="13"/>`
    : `<rect x="36" y="40" width="11" height="48" rx="3" fill="#ffffff"/>
       <ellipse cx="73" cy="64" rx="14" ry="19" fill="none" stroke="#ffffff" stroke-width="10"/>`;
  return `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sign" x1="64" y1="8" x2="64" y2="120" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#ef4146"/>
      <stop offset="1" stop-color="#c1121f"/>
    </linearGradient>
  </defs>
  <polygon points="${body}" fill="url(#sign)" stroke="url(#sign)" stroke-width="${sw}" stroke-linejoin="round"/>
  ${small ? '' : `<polygon points="${ring}" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linejoin="round" opacity="0.95"/>`}
  ${digits}
</svg>`;
}

// 120px mark centered on a transparent 128px canvas, for the Web Store listing icon.
const storeSvg = () => `<svg width="128" height="128" viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
  <g transform="translate(4,4) scale(0.9375)">${markSvg().replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>
</svg>`;

const render = (svg, size) =>
  new Resvg(svg, { fitTo: { mode: 'width', value: size }, font: { loadSystemFonts: false } })
    .render()
    .asPng();

const storeArg = process.argv.indexOf('--store');
if (storeArg !== -1) {
  const out = process.argv[storeArg + 1];
  if (!out) throw new Error('--store needs an output path');
  writeFileSync(join(root, out), render(storeSvg(), 128));
  console.log(`${out}  (store icon, 120px mark on 128px canvas)`);
} else {
  writeFileSync(join(root, 'src/icons/icon.svg'), markSvg() + '\n');
  console.log('icon.svg');
  for (const size of [16, 48, 128]) {
    const png = render(markSvg({ small: size <= 16 }), size);
    writeFileSync(join(root, `src/icons/icon${size}.png`), png);
    console.log(`icon${size}.png  (${png.length} bytes)`);
  }
}
