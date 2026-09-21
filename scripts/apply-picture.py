#!/usr/bin/env python3
"""Serve the AVIF first, keep the JPEG as the fallback.

    python3 scripts/apply-picture.py

Every <img> whose file has an .avif sibling (see build-avif.mjs) is wrapped in
a <picture> offering the AVIF first. A browser that cannot decode AVIF ignores
the <source> and loads the <img> exactly as before, so nothing regresses.

Idempotent: existing <picture> and <source type="image/avif"> markup is
stripped first, then rebuilt from what is on disk now. Run build-avif.mjs
first, then this.

Deliberately untouched:
  - og:image meta. Link scrapers do not read AVIF.
  - img/og/*, the share cards, for the same reason.
  - the brand marquee, built in JS from SVG files.
"""
import io, os, re, glob, sys

IMG = re.compile(r"<img\b[^>]*?>", re.S)
SRC = re.compile(r'src="([^"]+)"')

def avif_for(src):
    """Path of the AVIF sibling, if there is one on disk to point at."""
    if "' +" in src or '" +' in src:
        return None                      # built in JS, handled separately
    clean = src.split("?")[0].lstrip("/")
    if clean.startswith("img/og/"):
        return None
    cand = re.sub(r"\.(jpe?g|png)$", ".avif", clean, flags=re.I)
    return cand if cand != clean and os.path.isfile(cand) else None

def unwrap(s):
    s = re.sub(r"<picture>\s*", "", s)
    s = re.sub(r"\s*</picture>", "", s)
    s = re.sub(r'<source type="image/avif"[^>]*>\s*', "", s)
    return s

def wrap(tag):
    m = SRC.search(tag)
    if not m:
        return tag
    avif = avif_for(m.group(1))
    if not avif:
        return tag
    return f'<picture><source type="image/avif" srcset="{avif}">{tag}</picture>'

pages = sorted(p for p in glob.glob("*.html") if p != "index - old.html")
total = 0
for page in pages:
    src = io.open(page, encoding="utf-8").read()
    out = IMG.sub(lambda m: wrap(m.group(0)), unwrap(src))
    n = out.count("<source type=\"image/avif\"")
    total += n
    if out != src:
        io.open(page, "w", encoding="utf-8").write(out)
    print(f"{n:>2} wrapped  {page}")

# <picture> must not become a box of its own, and it must not break the one
# child-combinator selector on the site.
fixes = [
    ("index.html",
     "img{display:block;max-width:100%;height:auto}",
     "img{display:block;max-width:100%;height:auto}\npicture{display:contents}"),
    ("blog.css",
     "img{display:block;max-width:100%;height:auto}",
     "img{display:block;max-width:100%;height:auto}\npicture{display:contents}"),
    ("index.html",
     ".reel--post .reel__card>img:not(.reel__blur){object-fit:contain;z-index:1}",
     ".reel--post .reel__card img:not(.reel__blur){object-fit:contain;z-index:1}"),
]
for f, old, new in fixes:
    s = io.open(f, encoding="utf-8").read()
    if new in s:
        print(f"   already applied in {f}: {new.splitlines()[-1][:60]}")
    elif old in s:
        io.open(f, "w", encoding="utf-8").write(s.replace(old, new, 1))
        print(f"   patched {f}: {new.splitlines()[-1][:60]}")
    else:
        sys.exit(f"{f}: could not find\n  {old}")

print(f"\n{total} <img> now served AVIF-first")
