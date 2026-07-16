// /api/admin/logout : supprime le cookie d'admin
import { clearAdminCookie } from '../_auth.js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  clearAdminCookie(res);
  return res.status(200).json({ ok: true });
}
