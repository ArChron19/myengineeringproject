// Aura's brain: no keys, no server. Reads the live source page + user manual (Markdown), finds the best section for
// each question (BM25 over title/keywords/body), remembers the topic for follow-ups, escalates to a person when needed,
// and never reveals private details about the people behind the company.
var AuraBrain = (function () {
  const PHONE = '(656) 200-7296', EMAIL = 'support@myengineeringproject.com';
  const STOP = new Set(('a an the is are am was were be been to of for and or in on at do does did can could i you we your our me my it its this that these those with ' +
    'how what who where when why which have has had will would should about please tell there their them they he she his her any some just so if then than ' +
    'there get got im i\'m youre you\'re us want need know like').split(' '));
  const SYN = { cost: 'price', costs: 'price', plan: 'price', plans: 'price', tier: 'price', tiers: 'price', pricing: 'price', much: 'price', fee: 'price', fees: 'price', cheap: 'price', expensive: 'price',
    buy: 'purchase', order: 'purchase', checkout: 'purchase', subscribe: 'subscription', subscription: 'subscription', upgrade: 'pro',
    human: 'person', someone: 'person', somebody: 'person', representative: 'person', rep: 'person', agent: 'person', staff: 'person', operator: 'person',
    call: 'phone', telephone: 'phone', number: 'phone', text: 'phone', sms: 'phone', ring: 'phone',
    mail: 'email', e: 'email', reach: 'contact', touch: 'contact', install: 'install', installing: 'install', download: 'install', setup: 'install',
    teacher: 'classroom', teachers: 'classroom', instructor: 'classroom', school: 'classroom', students: 'classroom', student: 'classroom',
    sudoku: 'sudoku', game: 'sudoku', puzzle: 'sudoku', excel: 'excel', microsoft: 'excel', api: 'api', mcp: 'api', developer: 'api',
    broken: 'troubleshoot', error: 'troubleshoot', bug: 'troubleshoot', wrong: 'troubleshoot', fail: 'troubleshoot', problem: 'troubleshoot', issue: 'troubleshoot', stuck: 'troubleshoot',
    variables: 'variable', equations: 'equation', solve: 'solver', solving: 'solver', refund: 'refund', money: 'refund',
    located: 'location', where: 'location', address: 'location', office: 'location', hours: 'hour', open: 'hour' };
  const stem = w => w.length > 4 ? w.replace(/(ations?|ing|edly|ed|ies|es|s)$/, m => m === 'ies' ? 'y' : '') : w;
  function toks(s) {
    return (String(s).toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}_'.°]*/gu) || []).map(w => w.replace(/[.']+$/, ''))
      .filter(w => w && !STOP.has(w)).map(w => SYN[w] || stem(w));
  }

  // ---------- privacy: questions about the people behind the company are declined; output is scrubbed ----------
  const OWNER_Q = /\b(last name|first name|full name|surname|one[- ]person|solo|how many (people|employees|staff)|team size|owner|owns|founder|founded by|ceo|president|boss|run(s|ning)? (the|this|your) (company|business)|who (started|runs|owns)|who is (the|your) (owner|boss|founder)|his name|her name|your (creator|maker|developer)'?s? name|personal (phone|number|cell|address|email|info)|home address|where does (he|she|the owner) (live|work)|day job|other job|employer|employment|works? (at|for)|salary|income|ein|tax id|social security|ssn|date of birth|age of)\b/i;
  const ALLOWED_PHONE = /\(?656\)?[\s.\-]*200[\s.\-]*7296/;
  const ANY_PHONE = /(\+?1[\s.\-]*)?\(?\b\d{3}\)?[\s.\-]*\d{3}[\s.\-]*\d{4}\b/g;
  const STREET = /\b\d{2,6}\s+(\d{1,3}(st|nd|rd|th)\s+)?([A-Z][a-z]+\s){0,3}(St|Street|Ave|Avenue|Rd|Road|Blvd|Boulevard|Dr|Drive|Ln|Lane|Way|Ct|Court|Pkwy|Hwy)\b\.?(\s+[NSEW]\b)?(,?\s*(Ste|Suite|Unit|#)\s*\w+)?/g;
  // private words are stored as hashes so this public file never contains them
  const fnv = s => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; } return h; };
  const PRIVATE = new Set([0x15722a95, 0x758653e5, 0xf98590b1, 0xb5a14ecf, 0x39a21e9b, 0x259f5e14, 0xa33e34ba]);
  function scrub(t) {
    t = String(t).replace(ANY_PHONE, m => ALLOWED_PHONE.test(m) ? m : '[private]').replace(STREET, '[private]');
    // drop any sentence containing a private word
    return t.split(/(?<=[.!?])\s+/).filter(s => !(s.toLowerCase().normalize('NFC').match(/\p{L}+/gu) || []).some(w => PRIVATE.has(fnv(w)))).join(' ');
  }
  const PRIVACY_REPLY = `I can't share personal details about the people behind My Engineering Project LLC. I'm happy to help with anything about the company or its products, and you can reach the team at ${PHONE} or ${EMAIL}.`;

  // ---------- sources ----------
  function parseMarkdown(md, src) {
    md = md.replace(/<!--[\s\S]*?-->/g, '');
    const out = []; let h2 = '', cur = null;
    const flush = () => { if (cur && cur.body.trim()) out.push(cur); };
    for (const line of md.split(/\r?\n/)) {
      const m = line.match(/^(#{1,4})\s+(.*)$/);
      if (m) { const lvl = m[1].length, title = m[2].replace(/^\d+\.\s*/, '').trim();
        if (lvl === 1) continue; flush(); if (lvl === 2) h2 = title;
        cur = { title, parent: lvl > 2 ? h2 : '', src, body: '', keys: '' }; continue; }
      if (!cur) continue;
      const k = line.match(/^keywords:\s*(.*)$/i); if (k) { cur.keys += ' ' + k[1]; continue; }
      cur.body += line + '\n';
    }
    flush();
    return out.map(c => { c.body = c.body.replace(/\*\*|__/g, '').replace(/`([^`]*)`/g, '$1').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)').replace(/\n{3,}/g, '\n\n').trim(); return c; });
  }
  function fromFaqs(kb) { return (kb.faqs || []).map(f => ({ title: f.q[0], parent: '', src: 'faq', body: f.a, keys: f.q.join(' ') + ' ' + (f.tags || []).join(' ') })); }

  function create(opts) {
    let chunks = [], idx = null, last = null, ready = null;
    function build() {
      const docs = chunks.map(c => ({ t: toks(c.title + ' ' + c.parent), k: toks(c.keys), b: toks(c.body) }));
      const df = new Map(); docs.forEach(d => new Set([...d.t, ...d.k, ...d.b]).forEach(w => df.set(w, (df.get(w) || 0) + 1)));
      const avg = docs.reduce((a, d) => a + d.b.length, 0) / Math.max(1, docs.length);
      idx = { docs, df, avg, N: docs.length };
    }
    function score(qt) {
      const { docs, df, avg, N } = idx;
      return docs.map((d, i) => { let s = 0;
        for (const w of qt.w) { const n = df.get(w) || 0; if (!n) continue; const idf = Math.log(1 + (N - n + .5) / (n + .5));
          const tf = d.b.filter(x => x === w).length, bm = tf ? tf * 2.2 / (tf + 1.2 * (.25 + .75 * d.b.length / avg)) : 0;
          s += qt.wt[w] * idf * (bm + (d.t.includes(w) ? 2.2 : 0) + (d.k.includes(w) ? 1.8 : 0)); }
        const cov = qt.w.filter(w => qt.wt[w] >= 1); if (cov.length && cov.every(w => d.t.includes(w))) s += 4 + 2 / d.t.length;
        return { i, s }; }).sort((a, b) => b.s - a.s);
    }
    async function load() {
      if (ready) return ready;
      ready = (async () => {
        const got = await Promise.all((opts.sources || []).map(async u => { try { const r = await fetch(u, { cache: 'no-cache' }); return r.ok ? parseMarkdown(await r.text(), u) : []; } catch (e) { return []; } }));
        chunks = got.flat();
        if (opts.kb) chunks = chunks.concat(fromFaqs(opts.kb));
        build(); return chunks.length;
      })();
      return ready;
    }
    function compose(c) {
      let body = c.body;
      if (body.length > 700) { // long prose: keep the first sentences; long lists: keep the first items
        const lines = body.split('\n'); if (lines.filter(l => /^\s*([-*]|\d+\.)\s/.test(l)).length > 2) body = lines.slice(0, 9).join('\n');
        else body = (body.match(/[^.!?]+[.!?]+/g) || [body]).slice(0, 4).join('').trim();
      }
      return body.replace(/^\s*[-*]\s+/gm, '• ');
    }
    async function answer(q) {
      await load();
      const raw = String(q || '').trim(), low = raw.toLowerCase();
      if (!raw) return { text: '' };
      if (/\bwho (made|makes|built|builds|created|creates|developed|develops|is behind|publishes)\b/i.test(raw) && !OWNER_Q.test(raw.replace(/\bwho (made|makes|built|builds|created|creates|developed|develops|is behind|publishes)\b/i, '')))
        return { text: 'selectNsolve, Brazen Sudoku and our other tools are made by My Engineering Project LLC, a Florida software company. Want to know about a specific product?', topic: 'maker' };
      if (/\b(who|what) are you\b|\bare you (a |an )?(bot|robot|human|real|person|ai|machine)\b|\byour name\b/i.test(raw)) {
        const a = chunks.find(c => /^Aura/.test(c.title)); if (a) return { text: compose(a), topic: a.title }; }
      if ((raw.toLowerCase().normalize('NFC').match(/\p{L}+/gu) || []).some(x => PRIVATE.has(fnv(x)))) return { text: PRIVACY_REPLY, topic: 'privacy' };
      if (OWNER_Q.test(raw) && !/\b(aura|you)\b.*\b(who|what)\b|\bwho are you\b/i.test(raw)) return { text: PRIVACY_REPLY, topic: 'privacy' };
      if (/^(hi|hello|hey|good (morning|afternoon|evening)|yo|hiya)\b[!. ]*$/i.test(raw)) return { text: 'Hello! Ask me anything about My Engineering Project, selectNsolve, pricing, installing, or getting help.' };
      if (/^(thanks|thank you|thx|ty|great|awesome|perfect|ok(ay)?|cool)\b/i.test(raw) && raw.length < 40) return { text: `You're welcome! Anything else? If you'd like a person, call or text ${PHONE}.` };
      if (/^(bye|goodbye|see you|that'?s all)\b/i.test(raw)) return { text: 'Thanks for visiting My Engineering Project. Have a great day!' };
      const w = toks(raw); const wt = {}; w.forEach(x => wt[x] = (wt[x] || 0) + 1);
      if (!w.length) return { text: opts.fallback || `I'm not sure about that. You can reach the team at ${PHONE} or ${EMAIL}.` };
      let ranked = score({ w: Object.keys(wt), wt });
      // follow-ups ("how much is it?", "and for schools?") borrow the previous topic, but only when the question is weak on its own
      const follow = last != null && w.length <= 4 && /^(and|also|what about|how about|plus)\b|\b(it|that|this|they|them|its|one|those)\b/i.test(raw);
      if (follow && (!ranked[0] || ranked[0].s < 9)) {
        const ctx = toks(chunks[last].title + ' ' + chunks[last].keys).filter(x => !wt[x]); const cw = Object.assign({}, wt);
        ctx.forEach(x => cw[x] = (cw[x] || 0) + 1.2 / Math.max(3, ctx.length));
        ranked = score({ w: Object.keys(cw), wt: cw });
      }
      const top = ranked[0];
      if (!top || top.s < 3) {
        const page = opts.pageSearch ? opts.pageSearch(raw) : null;
        if (page) return { text: scrub('From this page: ' + page) };
        return { text: `I don't have a confident answer to that yet. A person can help: call or text ${PHONE}, or email ${EMAIL}.`, topic: 'fallback' };
      }
      last = top.i; const c = chunks[top.i];
      let text = compose(c);
      if (/\b(refund|charge|bill|complain|angry|upset|lawsuit|cancel|urgent|emergency|not working|broken)\b/i.test(raw) && !text.includes('656'))
        text += `\n\nIf you'd like a person to help, call or text ${PHONE}.`;
      const more = ranked.slice(1, 4).filter(r => r.s > top.s * .45 && chunks[r.i].title !== c.title).map(r => chunks[r.i].title.replace(/\s*\(.*\)\s*$/, ''));
      return { text: scrub(text), topic: c.title, chips: [...new Set(more)].slice(0, 3), score: top.s };
    }
    return { load, answer, scrub, get size() { return chunks.length; }, _chunks: () => chunks };
  }
  return { create, scrub, fnv, parseMarkdown };
})();
if (typeof module !== 'undefined') module.exports = AuraBrain;
