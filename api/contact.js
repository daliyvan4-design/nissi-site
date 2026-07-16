// API de contact NISSI
// - Enregistre chaque demande dans Vercel Blob (stockage fichiers JSON)
// - Envoie une notification email via Resend
// Variables d'environnement attendues :
//   BLOB_READ_WRITE_TOKEN -> fournie automatiquement par le store Blob lie au projet Vercel
//   RESEND_API_KEY        -> cle API Resend
//   CONTACT_TO_EMAIL      -> adresse qui recoit les demandes
//   CONTACT_FROM_EMAIL    -> expediteur (ex: onboarding@resend.dev tant qu'aucun domaine n'est verifie)

import { put } from '@vercel/blob';
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

  // 1) Sauvegarde dans Vercel Blob (un fichier JSON par message)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const now = new Date();
      const stamp = now.toISOString().replace(/[:.]/g, '-');
      const record = { ...data, created_at: now.toISOString() };
      await put(
        `contact-messages/${stamp}-${Math.random().toString(36).slice(2, 8)}.json`,
        JSON.stringify(record, null, 2),
        { access: 'private', contentType: 'application/json' }
      );
      result.saved = true;
    } catch (err) {
      console.error('Blob error:', err);
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
