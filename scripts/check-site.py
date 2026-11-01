#!/usr/bin/env python3
"""Pre-deploy verification suite for heysamtheman.com.

Checks:
  1. Every HTML file has a Content-Security-Policy meta tag & personal-capacity footer disclaimer
  2. Zero broken internal links, assets, PDFs, videos, or #anchor fragments
  3. Every non-404 HTML file has canonical + og:image pointing to an existing file
  4. Zero raw EXIF headers in published img/ JPEGs
  5. Static fallback metrics in index.html & partner.html match metrics.js
"""
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    errors: list[str] = []
    html_files = sorted(ROOT.glob("*.html"))
    all_files = {
        str(p.relative_to(ROOT))
        for p in ROOT.rglob("*")
        if p.is_file() and ".git" not in p.parts
    }

    ids_by_file: dict[str, set[str]] = {}
    for hp in html_files:
        txt = hp.read_text(encoding="utf-8")
        ids_by_file[hp.name] = set(re.findall(r'\bid=["\']([^"\']+)["\']', txt))

    for hp in html_files:
        name = hp.name
        txt = hp.read_text(encoding="utf-8")
        no_comments = re.sub(r"<!--.*?-->", "", txt, flags=re.S)

        if 'http-equiv="Content-Security-Policy"' not in no_comments:
            errors.append(f"{name}: missing Content-Security-Policy meta tag")
        if 'class="foot__disc"' not in no_comments:
            errors.append(f"{name}: missing .foot__disc personal-capacity disclaimer")
        if name != "404.html":
            if 'rel="canonical"' not in no_comments:
                errors.append(f"{name}: missing canonical link")
            ogs = re.findall(r'property="og:image"\s+content="([^"]+)"', no_comments)
            if not ogs:
                errors.append(f"{name}: missing og:image")
            for og in ogs:
                rel = og.replace("https://heysamtheman.com/", "")
                if rel not in all_files:
                    errors.append(f"{name}: og:image missing on disk ({rel})")

        for attr, val in re.findall(r'(href|src|poster|data-src)=["\']([^"\']+)["\']', no_comments):
            if val.startswith(("http://", "https://", "mailto:", "tel:", "data:", "javascript:")):
                continue
            path_part, _, frag = val.partition("#")
            clean = path_part.split("?")[0].lstrip("/")
            if clean and clean not in all_files and not (ROOT / clean).is_dir():
                errors.append(f"{name}: broken {attr}='{val}' (missing '{clean}')")
            if frag and not frag.startswith("i-"):
                target_html = clean if clean else name
                if target_html in ids_by_file and frag not in ids_by_file[target_html]:
                    errors.append(f"{name}: broken anchor href='{val}' (#{frag} missing in {target_html})")

    # EXIF check on published JPEGs
    exif_files = [
        str(p.relative_to(ROOT))
        for p in sorted((ROOT / "img").rglob("*.jpg"))
        if b"Exif\x00\x00" in p.read_bytes()
    ]
    if exif_files:
        errors.append(f"EXIF metadata present in {len(exif_files)} published JPGs: {exif_files[:5]}")

    # Metrics parity check
    metrics_txt = (ROOT / "metrics.js").read_text(encoding="utf-8")
    for key in ("views", "interactions", "followers", "posts"):
        m = re.search(rf"\b{key}\s*:\s*(\d+)", metrics_txt)
        if not m:
            continue
        expected = f"{int(m.group(1)):,}"
        for page_name in ("index.html", "partner.html"):
            ptxt = (ROOT / page_name).read_text(encoding="utf-8")
            pm = re.search(rf'data-metric="{key}">([^<]+)<', ptxt)
            if pm and pm.group(1).strip() != expected:
                errors.append(f"{page_name}: data-metric='{key}' static text '{pm.group(1)}' != metrics.js '{expected}'")

    if errors:
        print("SITE CHECK FAILED:")
        for e in errors:
            print(f"  ✗ {e}")
        return 1

    print(f"✓ All {len(html_files)} HTML pages passed security, link, anchor, OG, EXIF, and metrics checks.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
