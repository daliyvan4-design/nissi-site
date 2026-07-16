// API de tracking analytics (NISSI)
// Enregistre chaque evenement (pageview, click, scroll, conversion) dans Vercel Blob.
// Cles : ts, type, path, target/session/depth, etc.
// - Aucune authentification requise (donnees anonymes, aucun identifiant personnel)
// - Anti-abus : taille max 1ko, rate limit en memoire

import { put } from '@vercel/blob';

const MAX_BODY = 1024;
const RATE_WINDOW = 60 * 1000; // 1 min
const RATE_MAX = 60; // 60 hits / min / IP

const g = globalThis;
if (!g.__nissiTrackRate) g.__nissiTrackRate = new Map();

function getIp(req){
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length) return xf.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

function rateCheck(ip){
  const now = Date.now();
  const list = (g.__nissiTrackRate.get(ip) || []).filter(t => now - t < RATE_WINDOW);
  if (list.length >= RATE_MAX) return false;
  list.push(now);
  g.__nissiTrackRate.set(ip, list);
  return true;
}

export default async function handler(req, res) {
  // CORS : on accepte la meme origine (pas d'ouvertures externes)
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false });
  }

  // body size
  let raw = '';
  try {
    if (typeof req.body === 'string') raw = req.body;
    else raw = JSON.stringify(req.body || {});
  } catch(e){ raw = ''; }
  if (raw.length > MAX_BODY) {
    return res.status(413).json({ ok: false });
  }

  // rate limit
  const ip = getIp(req);
  if (!rateCheck(ip)) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ ok: false });
  }

  // event normalisation
  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch(e){}
  const allowed = new Set(['pageview','click','scroll','conversion']);
  const type = String(body.type || '').toLowerCase();
  if (!allowed.has(type)) return res.status(400).json({ ok: false, error: 'Type invalide' });

  // sanitisation des champs
  function s(v, max){
    return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max);
  }

  const evt = {
    ts: new Date().toISOString(),
    type,
    path: s(body.path, 200),
    session: s(body.session || body.sid, 64) || 'anon',
    ref: s(body.ref, 300),
    screen: s(body.screen, 30),
    target: type === 'click' ? s(body.target, 80) : undefined,
    href: type === 'click' ? s(body.href, 300) : undefined,
    depth: type === 'scroll' ? Math.max(0, Math.min(100, parseInt(body.depth,10) || 0)) : undefined,
    title: type === 'pageview' ? s(body.title, 200) : undefined
  };

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    // Pas de stockage disponible, on accepte quand meme pour ne pas generer d'erreurs client
    return res.status(200).json({ ok: true, stored: false });
  }

  try {
    const day = evt.ts.slice(0, 10);
    const rand = Math.random().toString(36).slice(2, 8);
    const file = `analytics/${day}/e-${evt.ts.replace(/[:.]/g,'-')}-${rand}.json`;
    await put(file, JSON.stringify(evt), { access: 'private', contentType: 'application/json' });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('track put error:', err);
    return res.status(500).json({ ok: false });
  }
}
