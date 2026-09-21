/* Write an AVIF sibling for every photograph the site serves.
 *
 *   node scripts/build-avif.mjs            # only what changed
 *   node scripts/build-avif.mjs --force    # everything, again
 *
 * The JPEG stays exactly where it is: the pages ask for the AVIF through a
 * <picture> and fall back to the JPEG on a browser that cannot read it (and
 * on anything that scrapes the page for a link preview, which is why the
 * og:image tags still point at .jpg).
 *
 * An AVIF that does not come out smaller than its JPEG is deleted rather than
 * shipped - a few of the small square stills are already near the floor.
 *
 * SHARP_PATH: sharp lives in the global node_modules on this machine, which a
 * script outside that tree cannot resolve by name. Set it to that path.
 */
import { createRequire } from 'node:module';
import { readdirSync, statSync, unlinkSync, existsSync } from 'node:fs';
import path from 'node:path';

const sharp = createRequire(import.meta.url)(process.env.SHARP_PATH || 'sharp');

const ROOT = 'img';
/* originals, scratch, and the og/ cards - link scrapers want the JPEG */
const SKIP_DIRS = new Set(['photos', 'Top Posts', 'video', 'og']);
const QUALITY = 50;          /* ~ the JPEGs' q82 by eye */
const EFFORT = 6;            /* 0-9; 6 is the useful end of the curve */
const FORCE = process.argv.includes('--force');

function walk(dir, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (!SKIP_DIRS.has(e.name)) walk(p, out); }
    else if (/\.(jpe?g|png)$/i.test(e.name)) out.push(p);
  }
  return out;
}

const fresh = (src, avif) =>
  !FORCE && existsSync(avif) && statSync(avif).mtimeMs >= statSync(src).mtimeMs;

let before = 0, after = 0, written = 0, skipped = 0, rejected = 0;

for (const src of walk(ROOT).sort()) {
  const avif = src.replace(/\.(jpe?g|png)$/i, '.avif');
  const jpgBytes = statSync(src).size;

  if (fresh(src, avif)) {
    before += jpgBytes; after += statSync(avif).size; skipped++;
    continue;
  }

  const { size } = await sharp(src)
    .avif({ quality: QUALITY, effort: EFFORT, chromaSubsampling: '4:2:0' })
    .toFile(avif);

  if (size >= jpgBytes) {
    unlinkSync(avif);
    rejected++;
    console.log(`  kept jpeg  ${src}  (avif was ${(size / 1024).toFixed(0)}K vs ${(jpgBytes / 1024).toFixed(0)}K)`);
    before += jpgBytes; after += jpgBytes;
    continue;
  }

  written++;
  before += jpgBytes; after += size;
  const cut = (1 - size / jpgBytes) * 100;
  console.log(`  ${(jpgBytes / 1024).toFixed(0).padStart(4)}K -> ${(size / 1024).toFixed(0).padStart(4)}K  -${cut.toFixed(0).padStart(2)}%  ${avif}`);
}

const pct = (1 - after / before) * 100;
console.log(`\n${written} written, ${skipped} already current, ${rejected} rejected as no smaller`);
console.log(`served weight ${(before / 1024 / 1024).toFixed(2)} MB -> ${(after / 1024 / 1024).toFixed(2)} MB  (-${pct.toFixed(0)}%)`);
