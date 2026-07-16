// /api/admin/login : authentification admin
// Body: { username, password }
// Reussite : cookie httpOnly signe + 200
// Echec : 401

import { checkAdminCredentials, issueAdminToken, setAdminCookie } from '../_auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Methode non autorisee' });
  }

  // Origine
  const origin = req.headers.origin || '';
  const host = req.headers.host || '';
  if (origin && host) {
    try {
      const o = new URL(origin);
      if (o.host !== host) return res.status(403).json({ ok: false, error: 'Origine non autorisee' });
    } catch(e){}
  }

  const body = req.body || {};
  const username = String(body.username || '').slice(0, 200);
  const password = String(body.password || '').slice(0, 200);

  if (!checkAdminCredentials(username, password)) {
    // delai artificiel pour eviter le timing attack
    await new Promise(r => setTimeout(r, 300));
    return res.status(401).json({ ok: false, error: 'Identifiants invalides' });
  }

  const token = issueAdminToken(username);
  setAdminCookie(res, token);
  return res.status(200).json({ ok: true, user: username });
}
