#!/usr/bin/env python3
"""Idempotently apply Content-Security-Policy meta headers, footer disclaimer, and sitemap lastmod."""
import glob
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

CSP_CONTENT = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline' https://cloud.umami.is; "
    "style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data:; "
    "media-src 'self'; "
    "font-src 'self'; "
    "connect-src 'self' https://cloud.umami.is https://gateway.umami.is https://*.umami.is "
    "https://script.google.com https://script.googleusercontent.com https://api.web3forms.com; "
    "object-src 'none'; "
    "base-uri 'self'; "
    "form-action 'self'"
)
CSP_TAG = f'<meta http-equiv="Content-Security-Policy" content="{CSP_CONTENT}">'

DISC_LINE = (
    '  <p class="foot__disc">Personal expedition &amp; creator site &mdash; '
    'all views, trips and partnerships are my own and independent of my employer.</p>'
)


def update_html_files() -> list[str]:
    changed = []
    for path in sorted(ROOT.glob("*.html")):
        orig = path.read_text(encoding="utf-8")
        txt = orig

        # 1. Replace existing CSP meta or insert right after viewport meta
        if 'http-equiv="Content-Security-Policy"' in txt:
            txt = re.sub(
                r'<meta\s+http-equiv="Content-Security-Policy"\s+content="[^"]*">',
                CSP_TAG,
                txt,
                count=1,
            )
        else:
            txt = re.sub(
                r'(<meta\s+name="viewport"[^>]*>)',
                r"\1\n" + CSP_TAG,
                txt,
                count=1,
            )

        # 2. Ensure footer disclaimer is present inside <footer ...>...</footer>
        if 'class="foot__disc"' not in txt and "</footer>" in txt:
            txt = re.sub(
                r"(\s*</footer>)",
                "\n" + DISC_LINE + r"\1",
                txt,
                count=1,
            )

        if txt != orig:
            path.write_text(txt, encoding="utf-8")
            changed.append(path.name)
    return changed


def update_sitemap() -> None:
    sm_path = ROOT / "sitemap.xml"
    if not sm_path.exists():
        return
    today = date.today().isoformat()
    sm = sm_path.read_text(encoding="utf-8")
    sm_new = re.sub(r"<lastmod>\d{4}-\d{2}-\d{2}</lastmod>", f"<lastmod>{today}</lastmod>", sm)
    if sm_new != sm:
        sm_path.write_text(sm_new, encoding="utf-8")
        print(f"Updated sitemap.xml <lastmod> -> {today}")


if __name__ == "__main__":
    updated = update_html_files()
    print(f"Updated {len(updated)} HTML files: {', '.join(updated) if updated else 'none'}")
    update_sitemap()
