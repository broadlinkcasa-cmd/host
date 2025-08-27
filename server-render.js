import express from 'express';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const ORIGIN = process.env.ORIGIN || 'https://extprice.vps.webdock.cloud';
const PORT   = process.env.PORT || 3000;

app.use(express.json({ limit:'1mb' }));
app.use(express.urlencoded({ extended:false }));

// Proxy solo per /api/*
app.use('/api', async (req, res) => {
  try {
    const url = ORIGIN + req.originalUrl; // mantiene /api/...
    const hdr = {
      // passa cookie e content-type al backend
      'cookie': req.headers.cookie || '',
      'content-type': req.headers['content-type'] || undefined,
      'x-forwarded-proto': 'https',
      'x-forwarded-for': req.ip,
    };
    const init = {
      method: req.method,
      headers: hdr,
      redirect: 'manual'
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      // legge il body grezzo per non rompere il json
      const raw = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
      init.body = raw;
    }

    const r = await fetch(url, init);

    // inoltra status + header (inclusi Set-Cookie)
    r.headers.forEach((v, k) => res.setHeader(k, v));
    res.status(r.status);

    // inoltra corpo
    const buf = await r.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch (err) {
    res.status(502).json({ ok:false, error: String(err) });
  }
});

// UI statica (metti qui la tua index.html)
app.use(express.static(path.join(__dirname, 'public'), { fallthrough:true }));

// fallback SPA
app.get('*', (req,res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Render proxy on http://0.0.0.0:${PORT} → ${ORIGIN}`);
});
