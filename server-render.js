// server-render.js (Node 18+, ESM) — SOLO PROXY /api → VPS
import express from 'express';
import fetch from 'node-fetch';

const app = express();

const ORIGIN = process.env.ORIGIN || 'https://extprice.vps.webdock.cloud';
// Origini autorizzate a chiamare il proxy con cookie (CORS + credentials)
const ALLOWED = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

// --- CORS (solo per /api/*) con credenziali --- //
function setCors(req, res) {
  const origin = req.headers.origin || '';
  if (ALLOWED.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    const reqHdr = req.headers['access-control-request-headers'];
    res.setHeader('Access-Control-Allow-Headers', reqHdr || 'content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  }
}

// Preflight
app.options('/api/*', (req, res) => {
  setCors(req, res);
  return res.status(204).end();
});

// Proxy TUTTO ciò che inizia per /api/
app.use('/api', async (req, res) => {
  try {
    setCors(req, res);

    // Costruisci URL target conservando path e query
    const target = ORIGIN + req.originalUrl;

    // Forward di alcuni header utili (cookie, content-type, forwarded)
    const headers = {
      'cookie': req.headers.cookie || '',
      'content-type': req.headers['content-type'] || undefined,
      'x-forwarded-proto': 'https',
      'x-forwarded-for': req.ip
      // NB: non forziamo Host; node-fetch userà quello di ORIGIN
    };

    // Corpo solo se non GET/HEAD
    const init = { method: req.method, headers, redirect: 'manual' };
    if (!['GET','HEAD'].includes(req.method)) {
      // Mantieni il body “raw” per non rompere JSON/form
      const chunks = [];
      for await (const c of req) chunks.push(c);
      init.body = Buffer.concat(chunks);
    }

    const r = await fetch(target, init);

    // Copia status + header (Set-Cookie incluso)
    r.headers.forEach((v, k) => res.setHeader(k, v));
    res.status(r.status);

    // Stream del corpo verso il client
    const buf = await r.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (err) {
    res.status(502).json({ ok:false, error: String(err) });
  }
});

// Health del proxy (facoltativo)
app.get('/health', (req,res) => res.json({ ok:true, origin: ORIGIN, mode:'proxy-only' }));

// Avvio
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Render proxy on :${PORT} → ${ORIGIN}`);
});
