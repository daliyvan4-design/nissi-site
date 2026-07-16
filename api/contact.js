// API de contact NISSI
// - Enregistre chaque demande dans Postgres (Neon via Vercel)
// - Envoie une notification email via Resend
// Variables d'environnement attendues :
//   DATABASE_URL      -> fournie automatiquement par l'integration Neon/Vercel
//   RESEND_API_KEY    -> cle API Resend
//   CONTACT_TO_EMAIL  -> adresse qui recoit les demandes
//   CONTACT_FROM_EMAIL-> expediteur (ex: onboarding@resend.dev tant qu'aucun domaine n'est verifie)

import { neon } from '@neondatabase/serverless';
import { Resend } from 'resend';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(v, max) {
  return String(v || '').trim().slice(0, max);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Methode non autorisee' });
  }

  const body = req.body || {};
  const data = {
    prenom: clean(body.prenom, 100),
    nom: clean(body.nom, 100),
    email: clean(body.email, 200),
    telephone: clean(body.telephone, 40),
    sujet: clean(body.sujet, 200),
    message: clean(body.message, 5000)
  };

  if (!data.prenom || !data.nom || !data.sujet || !data.message || !EMAIL_RE.test(data.email)) {
    return res.status(400).json({ ok: false, error: 'Champs manquants ou email invalide' });
  }

  const result = { saved: false, emailed: false };

  // 1) Sauvegarde en base (Postgres / Neon)
  if (process.env.DATABASE_URL) {
    try {
      const sql = neon(process.env.DATABASE_URL);
      await sql`
        CREATE TABLE IF NOT EXISTS contact_messages (
          id SERIAL PRIMARY KEY,
          prenom TEXT NOT NULL,
          nom TEXT NOT NULL,
          email TEXT NOT NULL,
          telephone TEXT,
          sujet TEXT NOT NULL,
          message TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )`;
      await sql`
        INSERT INTO contact_messages (prenom, nom, email, telephone, sujet, message)
        VALUES (${data.prenom}, ${data.nom}, ${data.email}, ${data.telephone}, ${data.sujet}, ${data.message})`;
      result.saved = true;
    } catch (err) {
      console.error('DB error:', err);
    }
  }

  // 2) Notification email via Resend
  if (process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.CONTACT_FROM_EMAIL || 'NISSI Contact <onboarding@resend.dev>';
      const { error } = await resend.emails.send({
        from,
        to: [process.env.CONTACT_TO_EMAIL],
        replyTo: data.email,
        subject: `[NISSI Contact] ${data.sujet}`,
        html: `
          <h2>Nouvelle demande de contact</h2>
          <p><strong>Nom :</strong> ${data.prenom} ${data.nom}</p>
          <p><strong>Email :</strong> ${data.email}</p>
          <p><strong>Telephone :</strong> ${data.telephone || '-'}</p>
          <p><strong>Sujet :</strong> ${data.sujet}</p>
          <p><strong>Message :</strong></p>
          <p style="white-space:pre-wrap">${data.message.replace(/</g, '&lt;')}</p>
        `
      });
      if (!error) result.emailed = true;
      else console.error('Resend error:', error);
    } catch (err) {
      console.error('Resend error:', err);
    }
  }

  if (!result.saved && !result.emailed) {
    return res.status(500).json({ ok: false, error: 'Service momentanement indisponible' });
  }

  return res.status(200).json({ ok: true, ...result });
}
