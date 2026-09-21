#!/usr/bin/env python3
"""Stamp intrinsic width/height on every <img> that has a file behind it.

    python3 scripts/apply-img-dimensions.py

Without the pair the browser cannot reserve the box before the bytes arrive,
so every photo on the page shoves the text below it down as it loads. The CSS
still drives the rendered size - these are the aspect ratio, nothing else,
which is why the base `img` rule also carries `height:auto`.

Dimensions are read from the files on disk, so re-run after resizing a photo.
Images whose src is built in JavaScript are listed in JS_SIZES by hand.
"""
import io, os, re, struct, sys, glob

def jpeg_size(path):
    with open(path, "rb") as f:
        if f.read(2) != b"\xff\xd8":
            return png_size(path)
        while True:
            b = f.read(1)
            while b and b != b"\xff":
                b = f.read(1)
            m = f.read(1)
            while m == b"\xff":
                m = f.read(1)
            if not m:
                return None
            if m[0] in (0xD8, 0xD9) or 0xD0 <= m[0] <= 0xD7:
                continue
            ln = struct.unpack(">H", f.read(2))[0]
            if 0xC0 <= m[0] <= 0xCF and m[0] not in (0xC4, 0xC8, 0xCC):
                f.read(1)
                h, w = struct.unpack(">HH", f.read(4))
                return w, h
            f.seek(ln - 2, 1)

def png_size(path):
    with open(path, "rb") as f:
        head = f.read(24)
    if head[:8] != b"\x89PNG\r\n\x1a\n":
        return None
    return struct.unpack(">II", head[16:24])

IMG = re.compile(r"<img\b[^>]*?>", re.S)
SRC = re.compile(r'src="([^"]+)"')

# src built in JS, so there is no literal path to measure
JS_SIZES = {"reel-": (540, 960), "post-": (540, 540)}

def size_for(src):
    if "' +" in src or '" +' in src:
        for prefix, wh in JS_SIZES.items():
            if prefix in src:
                return wh
        return None
    src = src.split("?")[0].lstrip("/")
    return jpeg_size(src) if os.path.isfile(src) else None

def stamp(tag):
    if re.search(r'\bwidth=', tag) or re.search(r'\bheight=', tag):
        return tag
    m = SRC.search(tag)
    if not m:
        return tag
    wh = size_for(m.group(1))
    if not wh:
        return tag
    w, h = wh
    return tag[:m.end()] + f' width="{w}" height="{h}"' + tag[m.end():]

pages = sorted(p for p in glob.glob("*.html") if p != "index - old.html")
total = 0
for page in pages:
    src = io.open(page, encoding="utf-8").read()
    out, n = IMG.subn(lambda m: stamp(m.group(0)), src)
    added = sum(1 for a, b in zip(IMG.findall(src), IMG.findall(out)) if a != b)
    if out != src:
        io.open(page, "w", encoding="utf-8").write(out)
    total += added
    print(f"{added:>2} stamped  {page}")

# the pair is an aspect ratio, not a size: let CSS keep driving the height
for css, anchor in (("index.html", "img{display:block;max-width:100%}"),
                    ("blog.css",  "img{display:block;max-width:100%}")):
    s = io.open(css, encoding="utf-8").read()
    if anchor in s:
        s = s.replace(anchor, "img{display:block;max-width:100%;height:auto}", 1)
        io.open(css, "w", encoding="utf-8").write(s)
        print(f"   height:auto added in {css}")

print(f"\n{total} img tags stamped")
