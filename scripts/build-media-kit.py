#!/usr/bin/env python3
"""Generate Sam-Wild-Adventures-Media-Kit.pdf directly from metrics.js and local site assets.

Re-run whenever metrics.js or expedition highlights change:
    python3 scripts/build-media-kit.py
"""
import json
import os
import re
import subprocess
import tempfile
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
METRICS_JS = (ROOT / "metrics.js").read_text(encoding="utf-8")
OUT_PDF = ROOT / "Sam-Wild-Adventures-Media-Kit.pdf"


def parse_metrics(src: str) -> dict:
    # Extract key metrics from metrics.js cleanly without executing arbitrary JS
    def num(key: str, default: int = 0) -> int:
        m = re.search(rf"\b{key}\s*:\s*(\d+)", src)
        return int(m.group(1)) if m else default

    def pairs(block_name: str) -> list[tuple[str, float]]:
        m = re.search(rf"{block_name}\s*:\s*\[(.*?)\]", src, re.S)
        if not m:
            return []
        return [
            (k, float(v))
            for k, v in re.findall(r"\{\s*k\s*:\s*['\"]([^'\"]+)['\"]\s*,\s*v\s*:\s*([\d.]+)\s*\}", m.group(1))
        ]

    read_m = re.search(r"read\s+(\d+\s+[A-Za-z]+\s+\d{4})", src)
    period_m = re.search(r"period\s*:\s*['\"]([^'\"]+)['\"]", src)
    return {
        "period": period_m.group(1) if period_m else "Last 90 days",
        "read_date": read_m.group(1) if read_m else date.today().strftime("%d %b %Y"),
        "views": num("views", 6279623),
        "interactions": num("interactions", 449359),
        "followers": num("followers", 9867),
        "posts": num("posts", 181),
        "reached": num("reached", 3282249),
        "top_reel": num("topReel", 3200000),
        "gender": pairs("gender"),
        "age": pairs("age"),
        "countries": pairs("countries"),
    }


def bars_html(rows: list[tuple[str, float]]) -> str:
    if not rows:
        return ""
    max_v = max(v for _, v in rows) or 1.0
    out = []
    for k, v in rows:
        w = round((v / max_v) * 100, 1)
        out.append(
            f'<div class="bar-row">'
            f'<div class="bar-top"><span>{k}</span><b>{v:.1f}%</b></div>'
            f'<div class="bar-track"><i style="width:{w}%"></i></div>'
            f'</div>'
        )
    return "\n".join(out)


def fmt_compact(n: int) -> str:
    if n >= 1_000_000:
        s = f"{n / 1_000_000:.2f}".rstrip("0").rstrip(".")
        return f"{s}M"
    if n >= 10_000:
        return f"{n / 1_000:.0f}K"
    return f"{n:,}"


def build() -> None:
    m = parse_metrics(METRICS_JS)
    root_uri = ROOT.as_uri()
    age_25_44 = sum(v for k, v in m["age"] if k in ("25–34", "35–44", "25-34", "35-44"))

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Sam Wild Adventures — Media &amp; Partnership Kit</title>
<style>
@font-face {{
  font-family: 'Darker Grotesque';
  font-style: normal;
  font-weight: 400 700;
  src: url('{root_uri}/fonts/darker-grotesque-latin.woff2') format('woff2');
}}
@font-face {{
  font-family: 'Onest';
  font-style: normal;
  font-weight: 300 600;
  src: url('{root_uri}/fonts/onest-latin.woff2') format('woff2');
}}
@page {{
  size: A4 portrait;
  margin: 0;
}}
* {{ box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }}
html, body {{
  width: 210mm;
  background: #04070c;
  color: #e3e7f1;
  font-family: 'Onest', system-ui, sans-serif;
  font-size: 9.4pt;
  line-height: 1.48;
  -webkit-font-smoothing: antialiased;
}}
.page {{
  width: 210mm;
  height: 297mm;
  padding: 13mm 14mm 11mm;
  background: #04070c;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  page-break-after: always;
  overflow: hidden;
  position: relative;
}}
.page:last-child {{ page-break-after: auto; }}
a {{ color: #5f86f0; text-decoration: none; }}
h1, h2, h3 {{
  font-family: 'Darker Grotesque', system-ui, sans-serif;
  font-weight: 600;
  letter-spacing: -0.02em;
  line-height: 0.96;
  color: #f3f6fc;
}}
.kicker {{
  font-size: 7.4pt;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #5f86f0;
  font-weight: 500;
}}
.topbar {{
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 3.5mm;
  border-bottom: 1px solid rgba(150,175,240,0.18);
  font-size: 7.8pt;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: #98a3ba;
}}
.topbar b {{
  font-family: 'Darker Grotesque', sans-serif;
  font-size: 13pt;
  letter-spacing: -0.02em;
  text-transform: none;
  color: #f3f6fc;
}}
.hero {{
  display: grid;
  grid-template-columns: 1.18fr 0.82fr;
  gap: 7mm;
  align-items: stretch;
  margin-top: 4.5mm;
}}
.hero-copy {{
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2.8mm;
}}
.hero h1 {{
  font-size: 31pt;
  line-height: 0.92;
}}
.hero p.lead {{
  font-size: 10pt;
  color: #cfd6e6;
  line-height: 1.48;
}}
.hero p.sub {{
  font-size: 8.8pt;
  color: #98a3ba;
  line-height: 1.48;
}}
.pills {{
  display: flex;
  flex-wrap: wrap;
  gap: 1.8mm;
  margin-top: 1mm;
}}
.pill {{
  font-size: 7.2pt;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  padding: 1.2mm 2.6mm;
  border: 1px solid rgba(150,175,240,0.26);
  background: #090d16;
  color: #cfd6e6;
  border-radius: 999px;
}}
.hero-img {{
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(150,175,240,0.2);
  height: 76mm;
  background: #090d16;
}}
.hero-img img {{
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 50% 26%;
  display: block;
}}
.stats-head {{
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: 5mm;
  margin-bottom: 2.5mm;
}}
.stats-head h2 {{ font-size: 18pt; }}
.stats-head span {{ font-size: 7.5pt; color: #98a3ba; letter-spacing: 0.06em; text-transform: uppercase; }}
.stats-grid {{
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3mm;
}}
.stat-card {{
  background: #090d16;
  border: 1px solid rgba(150,175,240,0.18);
  border-radius: 6px;
  padding: 3.5mm 3.8mm;
}}
.stat-n {{
  font-family: 'Darker Grotesque', sans-serif;
  font-size: 23pt;
  font-weight: 700;
  line-height: 0.95;
  color: #5f86f0;
}}
.stat-k {{
  margin-top: 1.2mm;
  font-size: 8pt;
  color: #e3e7f1;
}}
.stat-s {{
  margin-top: 0.5mm;
  font-size: 7pt;
  color: #8b96ad;
}}
.aud-grid {{
  display: grid;
  grid-template-columns: 1.1fr 1fr 0.85fr;
  gap: 4mm;
  margin-top: 4.5mm;
}}
.panel {{
  background: #090d16;
  border: 1px solid rgba(150,175,240,0.16);
  border-radius: 6px;
  padding: 3.5mm 4mm;
}}
.panel h3 {{
  font-size: 13.5pt;
  margin-bottom: 2.4mm;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}}
.panel h3 small {{
  font-family: 'Onest', sans-serif;
  font-size: 7.2pt;
  font-weight: 400;
  color: #5f86f0;
  letter-spacing: 0.04em;
}}
.bar-row {{ margin-bottom: 1.9mm; }}
.bar-row:last-child {{ margin-bottom: 0; }}
.bar-top {{
  display: flex;
  justify-content: space-between;
  font-size: 7.8pt;
  color: #cfd6e6;
  margin-bottom: 0.7mm;
}}
.bar-top b {{ color: #f3f6fc; font-weight: 500; }}
.bar-track {{
  height: 4px;
  border-radius: 2px;
  background: rgba(150,175,240,0.14);
  overflow: hidden;
}}
.bar-track i {{
  display: block;
  height: 100%;
  background: #4169e1;
  border-radius: 2px;
}}
.rec-strip {{
  margin-top: 4.5mm;
  background: #090d16;
  border: 1px solid rgba(150,175,240,0.16);
  border-radius: 6px;
  padding: 3.5mm 4.2mm;
}}
.rec-strip h3 {{ font-size: 14pt; margin-bottom: 2mm; }}
.rec-cols {{
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3mm;
  font-size: 7.9pt;
}}
.rec-cols b {{ display: block; color: #f3f6fc; font-size: 8.5pt; margin-bottom: 0.4mm; }}
.rec-cols span {{ color: #98a3ba; font-size: 7.5pt; line-height: 1.35; display: block; }}

/* Page 2 */
.photo-duo {{
  display: grid;
  grid-template-columns: 1fr 1.25fr;
  gap: 3.5mm;
  margin-top: 4mm;
  height: 54mm;
}}
.photo-box {{
  border-radius: 7px;
  overflow: hidden;
  border: 1px solid rgba(150,175,240,0.2);
  position: relative;
  background: #090d16;
}}
.photo-box img {{
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}}
.photo-cap {{
  position: absolute;
  inset: auto 0 0 0;
  padding: 4mm 3mm 2mm;
  background: linear-gradient(to top, rgba(4,7,12,0.9), transparent);
  font-size: 7.4pt;
  color: #e3e7f1;
}}
.tracks {{
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 3.5mm;
  margin-top: 4.5mm;
}}
.track-card {{
  background: #090d16;
  border: 1px solid rgba(150,175,240,0.2);
  border-radius: 6px;
  padding: 3.8mm 4mm;
  display: flex;
  flex-direction: column;
  gap: 1.8mm;
}}
.track-card h3 {{ font-size: 15.5pt; color: #f3f6fc; }}
.track-card p.lead {{ font-size: 8.3pt; color: #5f86f0; font-weight: 500; }}
.track-card p {{ font-size: 8pt; color: #98a3ba; line-height: 1.42; }}
.track-card ul {{ list-style: none; margin-top: 1mm; border-top: 1px solid rgba(150,175,240,0.14); padding-top: 1.8mm; }}
.track-card li {{ font-size: 7.7pt; color: #cfd6e6; padding: 0.7mm 0; }}
.track-card li::before {{ content: "→ "; color: #5f86f0; }}

.deliv {{
  margin-top: 4.2mm;
  background: #090d16;
  border: 1px solid rgba(150,175,240,0.18);
  border-radius: 6px;
  padding: 3.5mm 4.2mm;
}}
.deliv h3 {{ font-size: 14.5pt; margin-bottom: 2.2mm; }}
.deliv-grid {{
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 3mm;
}}
.deliv-grid div b {{ display: block; font-size: 8.2pt; color: #f3f6fc; margin-bottom: 0.5mm; }}
.deliv-grid div span {{ display: block; font-size: 7.5pt; color: #98a3ba; line-height: 1.36; }}

.quotes {{
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3.5mm;
  margin-top: 4.2mm;
}}
.quote {{
  background: linear-gradient(180deg, rgba(95,134,240,0.09) 0%, rgba(9,13,22,0.85) 100%);
  border: 1px solid rgba(150,175,240,0.22);
  border-radius: 6px;
  padding: 3.4mm 4mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 2mm;
}}
.quote p {{ font-size: 8pt; color: #d6dceb; font-style: normal; line-height: 1.42; }}
.quote footer {{ font-size: 7.5pt; color: #98a3ba; }}
.quote footer b {{ color: #f3f6fc; font-weight: 500; }}

.cta-box {{
  margin-top: 4.2mm;
  background: #101c3d;
  border: 1px solid #355be0;
  border-radius: 7px;
  padding: 4mm 5mm;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 5mm;
}}
.cta-box h3 {{ font-size: 17pt; color: #ffffff; margin-bottom: 0.8mm; }}
.cta-box p {{ font-size: 8.3pt; color: #cad6f7; }}
.cta-links {{
  text-align: right;
  font-size: 8.5pt;
  line-height: 1.55;
}}
.cta-links a {{ color: #ffffff; font-weight: 500; display: block; }}
.cta-links span {{ color: #9fb4f2; font-size: 7.6pt; }}

.foot {{
  padding-top: 2.5mm;
  border-top: 1px solid rgba(150,175,240,0.14);
  display: flex;
  justify-content: space-between;
  gap: 4mm;
  white-space: nowrap;
  font-size: 6.8pt;
  color: #7d879d;
}}
</style>
</head>
<body>

<!-- ════════════════════ PAGE 1 ════════════════════ -->
<section class="page">
  <div>
    <div class="topbar">
      <b>Sam 🌋 Wild Adventures</b>
      <span>Media &amp; Partnership Kit &middot; 2026 / 2027</span>
    </div>

    <div class="hero">
      <div class="hero-copy">
        <span class="kicker">Expedition Athlete &amp; Outdoor Storyteller</span>
        <h1>Join my next adventures.</h1>
        <p class="lead">Twenty-one self-organised expeditions across four continents since 2013 &mdash; from Mont Blanc, Kilimanjaro and Aconcagua (6,500&nbsp;m) to the Matterhorn's H&ouml;rnli Ridge.</p>
        <p class="sub">Originally from Annecy in the French Alps and now living in Tokyo, I plan, film and write high-altitude climbs, ski-mountaineering tours and multi-week traverses alongside a full-time career in tech at Google &mdash; bringing executive reliability, clean briefs and honest field reporting to outdoor brand partnerships.</p>
        <div class="pills">
          <span class="pill">Alpinism to 6,500 m</span>
          <span class="pill">Backcountry Ski (Japan &amp; Alps)</span>
          <span class="pill">Long-Distance Cycling &amp; Trekking</span>
          <span class="pill">EN / FR Keynotes</span>
        </div>
      </div>
      <div class="hero-img">
        <img src="{root_uri}/img/hero-1200.jpg" alt="Sam in heavy falling snow on a ski tour">
      </div>
    </div>

    <div class="stats-head">
      <h2>Verified Reach &amp; Audience</h2>
      <span>Instagram Insights &middot; {m['period']} (@hey_samtheman)</span>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-n">{fmt_compact(m['views'])}</div>
        <div class="stat-k">Views ({m['period'].lower()})</div>
        <div class="stat-s">{m['views']:,} exact &middot; {fmt_compact(m['reached'])} unique accounts</div>
      </div>
      <div class="stat-card">
        <div class="stat-n">{fmt_compact(m['interactions'])}</div>
        <div class="stat-k">Likes, saves &amp; shares</div>
        <div class="stat-s">{m['interactions']:,} interactions</div>
      </div>
      <div class="stat-card">
        <div class="stat-n">{fmt_compact(m['top_reel'])}</div>
        <div class="stat-k">Top single Reel</div>
        <div class="stat-s">Matterhorn 4,400&nbsp;m descent</div>
      </div>
      <div class="stat-card">
        <div class="stat-n">10,000+</div>
        <div class="stat-k">Cross-platform followers</div>
        <div class="stat-s">{m['followers']:,} on Instagram &middot; {m['posts']} posts</div>
      </div>
    </div>

    <div class="aud-grid">
      <div class="panel">
        <h3>Age distribution <small>{age_25_44:.0f}% aged 25&ndash;44</small></h3>
        {bars_html(m['age'])}
      </div>
      <div class="panel">
        <h3>Top markets <small>Global English</small></h3>
        {bars_html(m['countries'])}
      </div>
      <div class="panel">
        <h3>Gender split <small>Balanced</small></h3>
        {bars_html(m['gender'])}
        <div style="margin-top:4mm;padding-top:3mm;border-top:1px solid rgba(150,175,240,0.14);font-size:7.5pt;color:#98a3ba;line-height:1.42">
          <b style="color:#e3e7f1;display:block;margin-bottom:0.8mm">Why brands convert</b>
          Core audience sits squarely in prime outdoor &amp; travel purchasing age (25&ndash;54: 82%), drawn by real route reporting rather than studio lifestyle shoots.
        </div>
      </div>
    </div>

    <div class="rec-strip">
      <h3>Selected Expedition Record (2013 &ndash; 2026)</h3>
      <div class="rec-cols">
        <div>
          <b>Matterhorn &middot; 4,478 m</b>
          <span>H&ouml;rnli Ridge summit, first party on the mountain (Aug 2026) after 3 Valais 4,000m build-up peaks.</span>
        </div>
        <div>
          <b>Aconcagua &amp; Kilimanjaro</b>
          <span>6,500 m high point in Argentina (Jan 2025) &amp; 5,895 m Uhuru Peak summit in Tanzania (Jan 2026).</span>
        </div>
        <div>
          <b>Japan Ski &amp; 1,500 km Bike</b>
          <span>Mt. Yotei &amp; Mt. Fuji backcountry ski descents; full 1,500 km cycling traverse of Japan (2026).</span>
        </div>
        <div>
          <b>Mont Blanc, GR20 &amp; Asia</b>
          <span>Mont Blanc 4,808 m, Corsica GR20, Mongolia on horseback, 40-day Vietnam motorbike &amp; 1,670 km Camino.</span>
        </div>
      </div>
    </div>
  </div>

  <div class="foot">
    <span>heysamtheman.com &middot; @hey_samtheman</span>
    <span>Personal expedition &amp; creator portfolio &mdash; all partnerships are independent of my employer &middot; Page 1 / 2</span>
  </div>
</section>

<!-- ════════════════════ PAGE 2 ════════════════════ -->
<section class="page">
  <div>
    <div class="topbar">
      <b>Sam 🌋 Wild Adventures</b>
      <span>How We Partner &amp; Deliverables</span>
    </div>

    <div class="photo-duo">
      <div class="photo-box">
        <img src="{root_uri}/img/web/matterhorn/pxl-20260824-061735811-ts-000-3-800.jpg" style="object-position:50% 58%" alt="Matterhorn summit cross">
        <div class="photo-cap">Summit of the Matterhorn (4,478&nbsp;m), H&ouml;rnli Ridge &middot; August 2026</div>
      </div>
      <div class="photo-box">
        <img src="{root_uri}/img/web/kinabalu/img-20260705-075825-1000.jpg" style="object-position:50% 80%" alt="Mount Kinabalu via ferrata">
        <div class="photo-cap">World's highest via ferrata, Mount Kinabalu, Borneo &middot; July 2026</div>
      </div>
    </div>

    <div class="tracks">
      <div class="track-card">
        <span class="kicker">01 &middot; Flagship</span>
        <h3>Sponsorship</h3>
        <p class="lead">Back an expedition or a full season.</p>
        <p>Support permits, guides, travel or kit. Your brand is named on the objective and carried across pre-trip, summit and post-expedition storytelling.</p>
        <ul>
          <li>Named partner on a peak or season</li>
          <li>Pre-trip, on-route &amp; post-trip Reels</li>
          <li>Written debrief regardless of outcome</li>
          <li>Deliverables agreed in writing up front</li>
        </ul>
      </div>

      <div class="track-card">
        <span class="kicker">02 &middot; Field Proof</span>
        <h3>Gear Testing</h3>
        <p class="lead">Real alpine &amp; winter stress-testing.</p>
        <p>Put shells, boots, packs, optics, electronics or tents into genuine high-altitude, ski-touring and multi-week terrain with candid technical feedback.</p>
        <ul>
          <li>High altitude &amp; glaciated routes to 6,500 m</li>
          <li>Hokkaido &amp; Alpine backcountry skiing</li>
          <li>High-res field photos of kit in action</li>
          <li>Structured written R&amp;D + ecommerce links</li>
        </ul>
      </div>

      <div class="track-card">
        <span class="kicker">03 &middot; Brand &amp; Teams</span>
        <h3>Collaborations</h3>
        <p class="lead">Campaign shoots &amp; corporate talks.</p>
        <p>On-location vertical video and stills shot to a clear brief, plus English or French keynotes translating mountaineering risk &amp; preparation to business teams.</p>
        <ul>
          <li>Vertical Reels &amp; stills shot to brief</li>
          <li>Long-form SEO field notes &amp; copy</li>
          <li>Keynotes &amp; offsites (EN / FR)</li>
          <li>Clear commercial usage licensing</li>
        </ul>
      </div>
    </div>

    <div class="deliv">
      <h3>What a Standard Expedition Package Delivers</h3>
      <div class="deliv-grid">
        <div>
          <b>1. Short-Form Video</b>
          <span>High-retention 9:16 Reels filmed on the mountain (proven format up to 3.2M organic views on a single alpine clip).</span>
        </div>
        <div>
          <b>2. Licensed Stills</b>
          <span>Curated pack of high-resolution vertical &amp; landscape photographs in authentic alpine conditions for brand channels.</span>
        </div>
        <div>
          <b>3. Permanent Field Note</b>
          <span>In-depth, search-indexed expedition essay on heysamtheman.com with natural gear &amp; partner integration.</span>
        </div>
        <div>
          <b>4. Post-Trip Debrief</b>
          <span>On-time metrics summary, audience reach report and honest gear performance notes within 14 days of return.</span>
        </div>
      </div>
    </div>

    <div class="quotes">
      <div class="quote">
        <p>&ldquo;Congratulations on summiting the Matterhorn. 08:10 and first on the mountain that day is indeed a nice achievement&hellip; We&rsquo;d love to have you back for another objective in 2027.&rdquo;</p>
        <footer><b>Lukas Steiner</b> &middot; Marketing Manager, Zermatters</footer>
      </div>
      <div class="quote">
        <p>&ldquo;It looks like you&rsquo;ve had some amazing experiences. Congratulations on all your success. We would like to support you with our pro-deal.&rdquo;</p>
        <footer><b>Lara</b> &middot; Hilleberg the Tentmaker</footer>
      </div>
    </div>

    <div class="cta-box">
      <div>
        <h3>Let&rsquo;s plan the next objective together.</h3>
        <p>Based in Tokyo &middot; From Annecy, French Alps &middot; Available worldwide for 2026/2027 expeditions, gear testing &amp; talks.</p>
      </div>
      <div class="cta-links">
        <a href="mailto:hey@heysamtheman.com">hey@heysamtheman.com</a>
        <a href="https://heysamtheman.com/partner.html">heysamtheman.com/partner</a>
        <span>Instagram: @hey_samtheman</span>
      </div>
    </div>
  </div>

  <div class="foot">
    <span>© 2026 Sam 🌋 Wild Adventures &middot; Metrics verified {m['read_date']}</span>
    <span>Personal expedition &amp; creator portfolio &mdash; all partnerships are independent of my employer &middot; Page 2 / 2</span>
  </div>
</section>

</body>
</html>
"""
    with tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8") as tmp:
        tmp.write(html)
        tmp_path = tmp.name

    try:
        subprocess.run(
            [
                "google-chrome",
                "--headless",
                "--disable-gpu",
                "--no-sandbox",
                "--no-pdf-header-footer",
                f"--print-to-pdf={OUT_PDF}",
                f"file://{tmp_path}",
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        print(f"Wrote {OUT_PDF} ({OUT_PDF.stat().st_size:,} bytes)")
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


if __name__ == "__main__":
    build()
