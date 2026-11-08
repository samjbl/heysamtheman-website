#!/usr/bin/env python3
"""Pre-deploy verification suite for heysamtheman.com (root + /blog/<slug>/ pages).

Checks:
  1. Every HTML file has Content-Security-Policy, max-image-preview:large (except 404), & .foot__disc
  2. Zero broken internal links, directory routes (/blog/<slug>/), assets, PDFs, videos, or #anchors
  3. Every non-404 HTML file has canonical + og:image pointing to an existing file on disk
  4. Valid JSON-LD in every <script type="application/ld+json"> block
  5. Zero raw EXIF headers in published img/ JPEGs
  6. Static fallback metrics in index.html & partner.html match metrics.js
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def resolve_local_html(rel_path: str) -> str | None:
    clean = rel_path.strip("/")
    if not clean:
        return "index.html"
    if (ROOT / clean).is_file():
        return clean
    if (ROOT / clean / "index.html").is_file():
        return f"{clean}/index.html"
    return None


def main() -> int:
    errors: list[str] = []
    html_files = sorted(
        p for p in ROOT.rglob("*.html") if ".git" not in p.parts
    )
    all_files = {
        str(p.relative_to(ROOT))
        for p in ROOT.rglob("*")
        if p.is_file() and ".git" not in p.parts
    }

    ids_by_file: dict[str, set[str]] = {}
    for hp in html_files:
        rel_name = str(hp.relative_to(ROOT))
        txt = hp.read_text(encoding="utf-8")
        ids_by_file[rel_name] = set(re.findall(r'\bid=["\']([^"\']+)["\']', txt))

    for hp in html_files:
        rel_name = str(hp.relative_to(ROOT))
        txt = hp.read_text(encoding="utf-8")
        no_comments = re.sub(r"<!--.*?-->", "", txt, flags=re.S)

        if 'http-equiv="Content-Security-Policy"' not in no_comments:
            errors.append(f"{rel_name}: missing Content-Security-Policy meta tag")
        if 'class="foot__disc"' not in no_comments:
            errors.append(f"{rel_name}: missing .foot__disc personal-capacity disclaimer")
        if rel_name != "404.html":
            if "max-image-preview:large" not in no_comments:
                errors.append(f"{rel_name}: missing max-image-preview:large robots meta")
            if 'rel="canonical"' not in no_comments:
                errors.append(f"{rel_name}: missing canonical link")
            ogs = re.findall(r'property="og:image"\s+content="([^"]+)"', no_comments)
            if not ogs:
                errors.append(f"{rel_name}: missing og:image")
            for og in ogs:
                rel = og.replace("https://heysamtheman.com/", "")
                if rel not in all_files:
                    errors.append(f"{rel_name}: og:image missing on disk ({rel})")

        for ld in re.findall(
            r'<script\s+type="application/ld\+json">\s*(.*?)\s*</script>',
            no_comments,
            flags=re.S,
        ):
            try:
                json.loads(ld)
            except Exception as exc:
                errors.append(f"{rel_name}: invalid JSON-LD ({exc})")

        for attr, val in re.findall(
            r'(href|src|poster|data-src)=["\']([^"\']+)["\']', no_comments
        ):
            if val.startswith(
                ("http://", "https://", "mailto:", "tel:", "data:", "javascript:")
            ):
                continue
            path_part, _, frag = val.partition("#")
            raw_path = path_part.split("?")[0]
            if raw_path:
                if raw_path.startswith("/"):
                    rel_target = raw_path.lstrip("/")
                else:
                    rel_target = str((hp.parent / raw_path).resolve().relative_to(ROOT))
                if not rel_target:
                    rel_target = "index.html"
                if (
                    rel_target not in all_files
                    and not (ROOT / rel_target / "index.html").is_file()
                ):
                    errors.append(
                        f"{rel_name}: broken {attr}='{val}' (missing '{rel_target}')"
                    )
            else:
                rel_target = rel_name

            if frag and not frag.startswith("i-"):
                target_html = resolve_local_html(rel_target) or rel_name
                if target_html in ids_by_file and frag not in ids_by_file[target_html]:
                    errors.append(
                        f"{rel_name}: broken anchor href='{val}' (#{frag} missing in {target_html})"
                    )

    # EXIF check on published JPEGs
    exif_files = [
        str(p.relative_to(ROOT))
        for p in sorted((ROOT / "img").rglob("*.jpg"))
        if b"Exif\x00\x00" in p.read_bytes()
    ]
    if exif_files:
        errors.append(
            f"EXIF metadata present in {len(exif_files)} published JPGs: {exif_files[:5]}"
        )

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
                errors.append(
                    f"{page_name}: data-metric='{key}' static text '{pm.group(1)}' != metrics.js '{expected}'"
                )

    if errors:
        print("SITE CHECK FAILED:")
        for e in errors:
            print(f"  ✗ {e}")
        return 1

    print(
        f"✓ All {len(html_files)} HTML pages passed security, Discover meta, JSON-LD, link, anchor, OG, EXIF, and metrics checks."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
