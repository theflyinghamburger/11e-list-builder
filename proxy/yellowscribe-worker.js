// Cloudflare Worker: dumb CORS relay to yellowscribe.link (which sends no CORS
// headers, so a static page can't call it directly). No build step — paste into
// the worker dashboard (or deploy with wrangler), then put the worker URL into
// PROXY in src/utils/yellowscribe.js.
//   POST /code              body: raw .rosz bytes -> {"code": "8 hex"}
//        (optional ?name=Army Name for the filename param)
//   GET  /army?id=<8 hex>   -> stored army JSON (404 once it expires, ~10 min)
const BASE = 'https://yellowscribe.link';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

async function relay(up) {
  const buf = await up.arrayBuffer();
  return new Response(buf, {
    status: up.status,
    headers: { ...CORS, 'Content-Type': up.headers.get('content-type') || 'application/octet-stream' },
  });
}

export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    if (url.pathname === '/code' && req.method === 'POST') {
      const name = (url.searchParams.get('name') || 'army').replace(/[^\w -]+/g, '');
      const up = await fetch(
        `${BASE}/makeArmyAndReturnCode?filename=${encodeURIComponent(name + '.rosz')}` +
          '&allocationMode=allModels&modules=MatchedPlay&uiHeight=700&uiWidth=1200&decorativeNames='
      , { method: 'POST', body: req.body });
      return relay(up);
    }

    if (url.pathname === '/army' && req.method === 'GET') {
      const id = (url.searchParams.get('id') || '').toLowerCase();
      if (!/^[0-9a-f]{8}$/.test(id)) return new Response('missing 8-hex id', { status: 400, headers: CORS });
      return relay(await fetch(`${BASE}/get_army_by_id?id=${id}`));
    }

    const notFound = (msg) => new Response(msg, { status: 404, headers: { ...CORS, 'Content-Type': 'text/plain' } });
    if (url.pathname === '/' && req.method === 'GET') {
      return new Response('YellowScribe relay: POST /code (.rosz body) | GET /army?id=', { headers: { ...CORS, 'Content-Type': 'text/plain' } });
    }
    return notFound();
  },
};
