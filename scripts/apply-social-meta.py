#!/usr/bin/env python3
"""Put the same Open Graph / Twitter / canonical block on every live page.

    python3 scripts/apply-social-meta.py

Idempotent: it strips any existing og:*, twitter:* and rel=canonical lines and
writes a fresh block immediately after </title>, so re-running after a copy
edit just refreshes it. Cards themselves are built by build-og-cards.mjs.
"""
import io, re, sys

SITE = "https://heysamtheman.com"
NAME = "Sam &#127755; Wild Adventures"

# page -> (og:type, title, description, og card basename, image alt)
PAGES = {
 "index.html": ("website",
   "Sam &#127755; Wild Adventures",
   "Twenty-one self-organised expeditions across four continents since 2013, most recently the Matterhorn. Looking for brands to come along on the next ones.",
   "home", "Sam in a red shell, arms wide, laughing in heavy falling snow on a ski tour"),
 "partner.html": ("website",
   "Partner with me",
   "Sponsorship, gear testing and collaborations &mdash; audience figures, what each partnership includes and how to start one.",
   "partner", "Sam at the rime-covered summit cross on the Matterhorn"),
 "expeditions.html": ("website",
   "Expeditions",
   "Every expedition since 2013, listed as it happened with dates, disciplines and outcomes.",
   "expeditions", "Climbers high on Aconcagua under a deep blue high-altitude sky"),
 "about.html": ("website",
   "My story",
   "Thirteen years of expeditions built around a full-time job, and the list of what comes next.",
   "about", "Sam in a down hood, frost on his face, high on a mountain"),
 "links.html": ("website",
   "Links",
   "All of Sam's links in one place &mdash; Instagram, YouTube, the website and more.",
   "links", "Sam in a down hood, frost on his face, high on a mountain"),
 "blog.html": ("website",
   "Field notes",
   "Trip reports and field notes from the expeditions &mdash; the Matterhorn, Mont Blanc, Kilimanjaro and more.",
   "blog", "Sunrise over the Alps from high on Mont Blanc"),

 "blog-altitude.html": ("article",
   "What four mountains taught me about altitude",
   "Mont Blanc, Aconcagua, Kilimanjaro, Matterhorn. Eleven years of lessons, including the expensive one.",
   "altitude", "Climbers in heavy down jackets high on Aconcagua, frost on their beards"),
 "blog-gear-mistakes.html": ("article",
   "Five gear mistakes I have watched end a climb",
   "Real failures from Yotei, Kilimanjaro, Mont Blanc and the Matterhorn. None of them were solved by spending more.",
   "gear-mistakes", "Sam in a down hood, frost on his face, high on a mountain"),
 "blog-kilimanjaro.html": ("article",
   "Kilimanjaro with eight friends",
   "January 2026, seven days to 5,895&nbsp;m with eight friends. Two turned back. Aconcagua a year earlier is the reason it went well.",
   "kilimanjaro", "Lava Tower Camp on Kilimanjaro, the camp and route sign behind"),
 "blog-matterhorn.html": ("article",
   "Two attempts on the Matterhorn",
   "Turned back at 3,800&nbsp;m on the H&ouml;rnli Ridge in 2025, back a year later as the first party on the mountain. What changed was not fitness.",
   "matterhorn", "Sam at the rime-covered summit cross on the Matterhorn"),
 "blog-mongolia.html": ("article",
   "Mongolia by ger and motorbike",
   "Four days with herding families on the steppe, then three days to Terelj on a Soviet motorbike replica.",
   "mongolia", "The Mongolian steppe, a ger camp under a wide sky"),
 "blog-mont-blanc.html": ("article",
   "Five days to the summit of Mont Blanc",
   "September 2015: the Mer de Glace training day was my first time in crampons. Five days later I was on the summit.",
   "mont-blanc", "Sunrise over the Alps from high on Mont Blanc"),
 "blog-valais.html": ("article",
   "Three peaks before the Matterhorn",
   "Barrhorn, Weissmies, Breithorn traverse. What a build-up week in the Valais is actually for.",
   "valais", "The Matterhorn ridge at first light, a climber on the rock"),
 "blog-vietnam.html": ("article",
   "Learning to ride a motorbike the night before crossing Vietnam",
   "40 days, Ho Chi Minh to Hanoi and back, on a Honda Win copy bought on Bui Vien.",
   "vietnam", "Sam in a red shell, arms wide, laughing in heavy falling snow"),
 "blog-yotei.html": ("article",
   "Two days on Mt. Yotei",
   "One turnaround, one summit, and why booking two days was the whole trick.",
   "yotei", "Skiers on the open slopes of Mt. Yotei, Hokkaido"),
}

# lines we own and therefore rewrite every run
OWNED = re.compile(
    r'^[ \t]*<(?:meta[^>]*(?:property="og:|name="twitter:)|link[^>]*rel="canonical")[^>]*>[ \t]*\n',
    re.M)

def block(page, spec):
    otype, title, desc, card, alt = spec
    url = f"{SITE}/" if page == "index.html" else f"{SITE}/{page}"
    img = f"{SITE}/img/og/{card}.jpg"
    return (
      f'<link rel="canonical" href="{url}">\n'
      f'<meta property="og:type" content="{otype}">\n'
      f'<meta property="og:site_name" content="{NAME}">\n'
      f'<meta property="og:locale" content="en_GB">\n'
      f'<meta property="og:title" content="{title}">\n'
      f'<meta property="og:description" content="{desc}">\n'
      f'<meta property="og:url" content="{url}">\n'
      f'<meta property="og:image" content="{img}">\n'
      f'<meta property="og:image:width" content="1200">\n'
      f'<meta property="og:image:height" content="630">\n'
      f'<meta property="og:image:alt" content="{alt}">\n'
      f'<meta name="twitter:card" content="summary_large_image">\n'
      f'<meta name="twitter:image" content="{img}">\n')

changed = []
for page, spec in PAGES.items():
    src = io.open(page, encoding="utf-8").read()
    out = OWNED.sub("", src)
    if "</title>" not in out:
        sys.exit(f"{page}: no </title> to anchor to")
    out = out.replace("</title>\n", "</title>\n" + block(page, spec), 1)
    if out != src:
        io.open(page, "w", encoding="utf-8").write(out)
        changed.append(page)
    print(f"{'updated' if out != src else 'unchanged'}  {page}")

print(f"\n{len(changed)} of {len(PAGES)} pages rewritten")
