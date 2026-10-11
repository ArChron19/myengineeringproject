// Aura on myengineeringproject.com — Cloudflare Worker (route: myengineeringproject.com/* and www.myengineeringproject.com/*)
// 1) /aura/* is served from the GitHub CDN copy (same origin, cached at the edge).
// 2) Every HTML page gets the Aura script tag added before </body>. Everything else (incl. /api/mcp) passes through untouched.
const CDN = 'https://cdn.jsdelivr.net/gh/ArChron19/myengineeringproject@aura/aura/';
const TAG = '<script src="/aura/aura-widget.js" data-name="Aura" data-knowledge="/aura/aura-knowledge.json" data-greet-after="6" defer></script>';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/aura/')) {
      const file = url.pathname.slice(6);
      if (!/^aura-(widget\.js|knowledge\.json)$/.test(file)) return new Response('Not found', { status: 404 });
      const r = await fetch(CDN + file, { cf: { cacheTtl: 3600, cacheEverything: true } });
      const h = new Headers(r.headers);
      h.set('content-type', file.endsWith('.js') ? 'application/javascript; charset=utf-8' : 'application/json; charset=utf-8');
      h.set('cache-control', 'public, max-age=3600');
      return new Response(r.body, { status: r.status, headers: h });
    }
    const res = await fetch(request);
    const type = res.headers.get('content-type') || '';
    if (!type.includes('text/html') || url.pathname.startsWith('/api/')) return res;
    return new HTMLRewriter().on('body', { element(el) { el.append(TAG, { html: true }); } }).transform(res);
  }
};
