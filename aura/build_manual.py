"""Builds the viewable user manual page (manual.html) from the living manual.md. Run again whenever manual.md changes."""
import re, sys, html, markdown
src = sys.argv[1] if len(sys.argv) > 1 else '/home/claude/myengineeringproject/aura/manual.md'
out = sys.argv[2] if len(sys.argv) > 2 else '/home/claude/aurakit/web/manual.html'
md = re.sub(r'<!--[\s\S]*?-->', '', open(src).read())
md = re.sub(r'(?m)^keywords:.*\n', '', md)
title = re.search(r'(?m)^#\s+(.*)$', md).group(1); md = re.sub(r'(?m)^#\s+.*\n', '', md, count=1)
updated = (re.search(r'\*\*Last updated:\*\*\s*([0-9-]+)', md) or [None, ''])[1]
body = markdown.markdown(md, extensions=['toc', 'tables', 'sane_lists', 'fenced_code'])
# table of contents from h2s
toc = ''.join(f'<li><a href="#{i}">{html.escape(re.sub("<[^>]+>", "", t))}</a></li>' for i, t in re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', body))
page = f'''<title>My Engineering Project Manual</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&family=Fraunces:opsz,wght@9..144,600&display=swap">
<style>
/* Layout: engineering-notebook manual. Sticky contents rail beside a 68ch reading column; syntax shown as cell-like chips. */
:root {{
  --paper:#f5f7f6; --ink:#17201d; --mute:#5b6763; --rule:#d5dcd9; --panel:#ffffff; --accent:#1e6b5c; --cell:#e7efec;
  --display:"Fraunces",Georgia,serif; --body:"IBM Plex Sans",system-ui,-apple-system,"Segoe UI",sans-serif; --mono:"IBM Plex Mono",ui-monospace,Menlo,Consolas,monospace;
}}
@media (prefers-color-scheme: dark) {{ :root:not([data-theme="light"]) {{ --paper:#111614; --ink:#e3ebe8; --mute:#94a39e; --rule:#2a3431; --panel:#171e1c; --accent:#6cc3ad; --cell:#1f2a27; color-scheme:dark }} }}
:root[data-theme="dark"] {{ --paper:#111614; --ink:#e3ebe8; --mute:#94a39e; --rule:#2a3431; --panel:#171e1c; --accent:#6cc3ad; --cell:#1f2a27; color-scheme:dark }}
* {{ box-sizing:border-box }}
body {{ background:var(--paper); color:var(--ink); font:16px/1.65 var(--body); padding-inline:16px; padding-block:0 64px }}
.wrap {{ max-width:1080px; margin:0 auto; display:grid; grid-template-columns:240px minmax(0,1fr); gap:48px }}
header {{ grid-column:1/-1; padding-block:40px 20px; border-bottom:1px solid var(--rule); display:flex; flex-wrap:wrap; gap:12px 24px; align-items:end; justify-content:space-between }}
header h1 {{ font:600 clamp(28px,4.4vw,42px)/1.1 var(--display); margin:0; text-wrap:balance; max-width:18ch }}
.meta {{ font:500 12px/1.4 var(--mono); color:var(--mute); text-transform:uppercase; letter-spacing:.06em; display:grid; gap:4px; text-align:right }}
.meta b {{ color:var(--accent); font-weight:500 }}
nav {{ position:sticky; top:calc(env(safe-area-inset-top,0px) + 16px); align-self:start; padding-top:28px }}
nav label {{ font:500 11px var(--mono); text-transform:uppercase; letter-spacing:.08em; color:var(--mute) }}
#q {{ width:100%; margin:8px 0 18px; padding:9px 11px; border:1px solid var(--rule); border-radius:6px; background:var(--panel); color:var(--ink); font:14px var(--body) }}
#q:focus-visible, a:focus-visible {{ outline:2px solid var(--accent); outline-offset:2px }}
nav ol {{ list-style:none; margin:0; padding:0; display:grid; gap:2px; counter-reset:s }}
nav a {{ display:block; padding:6px 10px; border-radius:6px; color:var(--mute); text-decoration:none; font-size:14px }}
nav a:hover {{ background:var(--cell); color:var(--ink) }}
main {{ min-width:0; max-width:68ch; padding-top:28px }}
main > p:first-child {{ color:var(--mute) }}
h2 {{ font:600 24px/1.25 var(--display); margin:48px 0 8px; padding-top:16px; border-top:1px solid var(--rule); text-wrap:balance }}
h3 {{ font:600 17px/1.35 var(--body); margin:28px 0 6px }}
p, li {{ margin:0 0 10px }}
ol, ul {{ padding-left:22px }}
code {{ font:14px/1.5 var(--mono); background:var(--cell); border:1px solid var(--rule); padding:1px 6px; border-radius:4px; white-space:pre-wrap; word-break:break-word }}
a {{ color:var(--accent) }}
strong {{ font-weight:600 }}
section.hit-none {{ display:none }}
.empty {{ color:var(--mute); padding:20px 0 }}
footer {{ grid-column:1/-1; border-top:1px solid var(--rule); padding-top:16px; color:var(--mute); font-size:13px }}
@media (max-width:760px) {{ .wrap {{ grid-template-columns:minmax(0,1fr); gap:0 }} nav {{ position:static; padding-top:20px }} nav ol {{ display:flex; flex-wrap:wrap; gap:4px }} nav a {{ background:var(--cell) }} .meta {{ text-align:left }} }}
@media (prefers-reduced-motion:no-preference) {{ html {{ scroll-behavior:smooth }} }}
</style>
<div class="wrap">
  <header><h1>{html.escape(title)}</h1>
    <div class="meta"><span>Living manual</span><span>Updated <b>{updated}</b></span></div></header>
  <nav aria-label="Contents"><label for="q">Search the manual</label><input id="q" type="search" placeholder="bounds, precision, install…" autocomplete="off">
    <ol id="toc">{toc}</ol></nav>
  <main id="doc">{body}<p class="empty" id="empty" hidden>No section matches that search.</p></main>
  <footer>Questions this manual doesn't answer: email support@myengineeringproject.com or call (656) 200-7296. Aura, the assistant on myengineeringproject.com, reads this same manual.</footer>
</div>
<script>
(() => {{
  // wrap each h3 block so search can show or hide whole topics
  const doc = document.getElementById('doc'), kids = [...doc.children]; let cur = null;
  kids.forEach(el => {{ if (el.id === 'empty') return; if (/^H[23]$/.test(el.tagName)) {{ cur = document.createElement('section'); cur.dataset.level = el.tagName; doc.insertBefore(cur, el); }} if (cur) cur.appendChild(el); }});
  const secs = [...doc.querySelectorAll('section')], q = document.getElementById('q'), empty = document.getElementById('empty');
  q.addEventListener('input', () => {{
    const t = q.value.trim().toLowerCase(); let n = 0;
    secs.forEach(s => {{ const hit = !t || s.textContent.toLowerCase().includes(t) || s.dataset.level === 'H2' && false; s.classList.toggle('hit-none', !hit); if (hit) n++; }});
    if (t) secs.filter(s => s.dataset.level === 'H2').forEach(h => {{ let nx = h.nextElementSibling, any = false; while (nx && nx.dataset && nx.dataset.level === 'H3') {{ if (!nx.classList.contains('hit-none')) any = true; nx = nx.nextElementSibling; }} if (any) h.classList.remove('hit-none'); }});
    empty.hidden = n > 0;
  }});
}})();
</script>
'''
open(out, 'w').write(page); print(out, len(page))
