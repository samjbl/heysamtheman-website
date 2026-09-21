/* Build 1200x630 Open Graph cards from site photographs.
 *
 *   node scripts/build-og-cards.mjs
 *
 * A landscape source is cropped to fill. A portrait source is drawn whole and
 * centred over a blurred, darkened copy of itself — the same treatment the
 * Reels cards and the .band--fit figures use on the site, so a shared link
 * looks like the page it points at instead of a butchered crop.
 *
 * Output: img/og/<name>.jpg at 1200x630. Re-run after changing a source.
 */
import { createRequire } from 'node:module';
/* sharp lives in the global node_modules on this machine, which a script
   outside that tree cannot resolve by name. SHARP_PATH overrides it. */
const sharp = createRequire(import.meta.url)(
  process.env.SHARP_PATH || 'sharp');
import { mkdir } from 'node:fs/promises';

const W = 1200, H = 630, OUT = 'img/og';

const CARDS = [
  ['home',           'img/hero.jpg'],
  ['about',          'img/frost.jpg'],
  ['links',          'img/frost.jpg'],
  ['partner',        'img/web/matterhorn/pxl-20260824-061735811-ts-000-3.jpg'],
  ['expeditions',    'img/web/aconcagua/pxl-20250107-194907344.jpg'],
  ['blog',           'img/web/mont-blanc/mont-blanc-sunrise.jpg'],
  ['altitude',       'img/web/aconcagua/pxl-20250109-115859710.jpg'],
  ['gear-mistakes',  'img/frost.jpg'],
  ['kilimanjaro',    'img/web/kilimanjaro/pxl-20260101-104451408-ts-000.jpg'],
  ['matterhorn',     'img/web/matterhorn/pxl-20260824-061735811-ts-000-3.jpg'],
  ['mongolia',       'img/web/mongolia/img-20180902-082014.jpg'],
  ['mont-blanc',     'img/web/mont-blanc/mont-blanc-sunrise.jpg'],
  ['valais',         'img/web/matterhorn/pxl-20260824-072331825.jpg'],
  ['vietnam',        'img/hero.jpg'],
  ['yotei',          'img/web/yotei/img-6984.jpg'],
];

/* wide enough that a fill crop keeps the subject */
const FILL_RATIO = 1.5;

async function card(name, src) {
  const meta = await sharp(src).metadata();
  const wide = meta.width / meta.height >= FILL_RATIO;
  let img;

  if (wide) {
    img = sharp(src).resize(W, H, { fit: 'cover', position: 'attention' });
  } else {
    const bg = await sharp(src)
      .resize(W, H, { fit: 'cover', position: 'centre' })
      .blur(28).modulate({ brightness: 0.34 })
      .toBuffer();
    const fg = await sharp(src)
      .resize(W, H, { fit: 'inside' })
      .toBuffer();
    img = sharp(bg).composite([{ input: fg, gravity: 'centre' }]);
  }

  const out = `${OUT}/${name}.jpg`;
  const { size } = await img
    .jpeg({ quality: 82, progressive: true, mozjpeg: true })
    .toFile(out);
  console.log(`${out}  ${W}x${H}  ${(size / 1024).toFixed(0)}K  ${wide ? 'fill' : 'blur-fit'}  <- ${src}`);
}

await mkdir(OUT, { recursive: true });
for (const [name, src] of CARDS) await card(name, src);
