import express from 'express';
import fetch from 'node-fetch';
const app = express();
const ORIGIN = 'https://extprice.vps.webdock.cloud'; // tuo VPS

app.use('/api/', async (req,res) => {
  const u = ORIGIN + req.originalUrl;
  const r = await fetch(u, {
    method: req.method,
    headers: { 'content-type': req.headers['content-type'] || 'application/json' },
    body: ['GET','HEAD'].includes(req.method) ? undefined : await req.text(),
  });
  res.status(r.status);
  r.headers.forEach((v,k)=>res.setHeader(k,v));
  res.send(await r.buffer());
});

app.use(express.static('public')); // carica qui la tua UI
app.listen(process.env.PORT || 3000);
