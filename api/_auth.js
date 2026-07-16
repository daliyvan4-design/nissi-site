// Utilitaires partages : JWT-like cookie signe en HMAC-SHA256 (sans dependance externe)
// + parsing de cookies + helpers cookie

import crypto from 'node:crypto';

const COOKIE_NAME = 'nissi_admin';
const COOKIE_MAX_AGE = 8 * 60 * 60; // 8 heures

function b64urlEncode(buf){
  return Buffer.from(buf).toString('base64')
    .replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}
function b64urlDecode(str){
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while(str.length % 4) str += '=';
  return Buffer.from(str, 'base64');
}

function sign(payload, secret){
  const body = b64urlEncode(JSON.stringify(payload));
  const sig = b64urlEncode(
    crypto.createHmac('sha256', secret).update(body).digest()
  );
  return body + '.' + sig;
}

function verify(token, secret){
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [body, sig] = parts;
  const expected = b64urlEncode(
    crypto.createHmac('sha256', secret).update(body).digest()
  );
  // comparaison en temps constant
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!crypto.timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(b64urlDecode(body).toString('utf8'));
    if (payload.exp && Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch(e){ return null; }
}

export function getSecret(){
  return process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'change-me-please-' + (process.env.VERCEL_ENV || 'dev');
}

export function issueAdminToken(username){
  const exp = Math.floor(Date.now() / 1000) + COOKIE_MAX_AGE;
  return sign({ sub: username, exp, iat: Math.floor(Date.now() / 1000) }, getSecret());
}

export function readAdminToken(req){
  const cookieHeader = req.headers.cookie || '';
  const cookies = parseCookies(cookieHeader);
  const raw = cookies[COOKIE_NAME];
  if (!raw) return null;
  return verify(raw, getSecret());
}

export function setAdminCookie(res, token){
  // Secure sauf en dev local
  const isHttps = process.env.VERCEL_ENV === 'production';
  const parts = [
    COOKIE_NAME + '=' + token,
    'Path=/',
    'HttpOnly',
    'SameSite=Strict',
    'Max-Age=' + COOKIE_MAX_AGE
  ];
  if (isHttps) parts.push('Secure');
  res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearAdminCookie(res){
  res.setHeader('Set-Cookie', COOKIE_NAME + '=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0');
}

function parseCookies(header){
  const out = {};
  if (!header) return out;
  header.split(';').forEach(function(p){
    const i = p.indexOf('=');
    if (i < 0) return;
    const k = p.slice(0, i).trim();
    const v = p.slice(i + 1).trim();
    if (k) out[k] = decodeURIComponent(v);
  });
  return out;
}

// Verifie que la requete vient bien d'un admin (token valide)
export function requireAdmin(req, res){
  const payload = readAdminToken(req);
  if (!payload) {
    res.status(401).json({ ok: false, error: 'Non authentifie' });
    return null;
  }
  return payload;
}

// Verifie les identifiants par rapport aux variables d'env
// ADMIN_USERNAME et ADMIN_PASSWORD sont obligatoires en production.
export function checkAdminCredentials(username, password){
  const u = process.env.ADMIN_USERNAME;
  const p = process.env.ADMIN_PASSWORD;
  if (!u || !p) return false;
  // comparaison en temps constant
  const a = Buffer.from(String(username || ''));
  const b = Buffer.from(u);
  const ok1 = a.length === b.length && crypto.timingSafeEqual(a, b);
  const x = Buffer.from(String(password || ''));
  const y = Buffer.from(p);
  const ok2 = x.length === y.length && crypto.timingSafeEqual(x, y);
  return ok1 && ok2;
}
