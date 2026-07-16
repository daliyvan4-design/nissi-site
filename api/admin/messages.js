// /api/admin/messages : liste les messages de contact stockes dans Vercel Blob
// Methode : GET (auth requise)
// Retourne : { ok, messages: [{...}], total }

import { list } from '@vercel/blob';
import { requireAdmin } from '../_auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Methode non autorisee' });
  }

  const admin = requireAdmin(req, res);
  if (!admin) return;

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ ok: false, error: 'Stockage non configure' });
  }

  try {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const out = [];
    let cursor;
    do {
      const res2 = await list({
        prefix: 'contact-messages/',
        cursor,
        limit: 200
      });
      for (const blob of res2.blobs) {
        try {
          // blob.url necessite le token pour les blobs prives
          const r = await fetch(blob.url, { headers: { 'Authorization': 'Bearer ' + token } });
          if (!r.ok) continue;
          const text = await r.text();
          const obj = JSON.parse(text);
          out.push({ ...obj, _path: blob.pathname });
        } catch(e){
          out.push({ _path: blob.pathname, _error: 'lecture impossible' });
        }
      }
      cursor = res2.cursor;
    } while (cursor);

    // tri par date desc
    out.sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''));

    // ne pas renvoyer l'IP au front
    const safe = out.map(({ ip, _path, _error, ...rest }) => rest);
    return res.status(200).json({ ok: true, total: safe.length, messages: safe });
  } catch (err) {
    console.error('admin/messages error:', err);
    return res.status(500).json({ ok: false, error: 'Erreur interne' });
  }
}
