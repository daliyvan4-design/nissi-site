// API de contact NISSI
// - Enregistre chaque demande dans Vercel Blob (stockage fichiers JSON)
// - Envoie une notification email via Resend
// - Protection anti-spam : honeypot + rate limit en memoire
// Variables d'environnement attendues :
//   BLOB_READ_WRITE_TOKEN -> fournie automatiquement par le store Blob lie au projet Vercel
//   RESEND_API_KEY        -> cle API Resend
//   CONTACT_TO_EMAIL      -> adresse qui recoit les demandes
//   CONTACT_FROM_EMAIL    -> expediteur (ex: onboarding@resend.dev tant qu'aucun domaine n'est verifie)

import { put } from '@vercel/blob';
import { Resend } from 'resend';
import { renderAdminEmail, renderAdminEmailPlain, renderClientEmail, renderClientEmailPlain } from '../lib/email-templates.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BODY = 20_000; // 20 ko max pour eviter les payloads abusifs
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 min
const RATE_LIMIT_MAX = 5; // 5 requetes / 10 min / IP

// Rate limit en memoire (par IP). Sur serverless, partage via globalThis pour survivre aux warm starts.
const g = globalThis;
if (!g.__nissiRateLimit) g.__nissiRateLimit = new Map();

function rateLimitCheck(ip){
  const now = Date.now();
  const list = (g.__nissiRateLimit.get(ip) || []).filter(ts => now - ts < RATE_LIMIT_WINDOW_MS);
  if(list.length >= RATE_LIMIT_MAX){
    return { ok:false, retryAfter: Math.ceil((RATE_LIMIT_WINDOW_MS - (now - list[0])) / 1000) };
  }
  list.push(now);
  g.__nissiRateLimit.set(ip, list);
  return { ok:true };
}

function clean(v, max){
  // retire balises HTML, normalise espaces, plafonne la longueur
  return String(v == null ? '' : v)
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, '') // caracteres de controle
    .trim()
    .slice(0, max);
}

function getClientIp(req){
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.length){
    return xf.split(',')[0].trim();
  }
  return (req.socket && req.socket.remoteAddress) || 'unknown';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Methode non autorisee' });
  }

  // Origin / Referer check basique contre CSRF (meme origine)
  const origin = req.headers.origin || '';
  const host = req.headers.host || '';
  if (origin && host) {
    try {
      const o = new URL(origin);
      if (o.host !== host) {
        return res.status(403).json({ ok: false, error: 'Origine non autorisee' });
      }
    } catch(e){}
  }

  // Body size guard
  const bodyStr = typeof req.body === 'string' ? req.body : JSON.stringify(req.body || {});
  if (bodyStr.length > MAX_BODY) {
    return res.status(413).json({ ok: false, error: 'Requete trop volumineuse' });
  }

  // Rate limit
  const ip = getClientIp(req);
  const rl = rateLimitCheck(ip);
  if (!rl.ok) {
    res.setHeader('Retry-After', String(rl.retryAfter));
    return res.status(429).json({ ok: false, error: 'Trop de requetes, reessayez plus tard' });
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

  // Honeypot : champ _hp rempli => bot probable
  if (body._hp) {
    // Reponse silencieuse (succes vide) pour ne pas guider le bot
    return res.status(200).json({ ok: true, saved: false, emailed: false });
  }

  if (!data.prenom || !data.nom || !data.sujet || !data.message || !EMAIL_RE.test(data.email)) {
    return res.status(400).json({ ok: false, error: 'Champs manquants ou email invalide' });
  }

  // Anti-spam : message trop court ou repetitions suspectes
  if (data.message.length < 10) {
    return res.status(400).json({ ok: false, error: 'Message trop court' });
  }
  if (/^(.)\1{15,}$/.test(data.message.replace(/\s/g, ''))) {
    return res.status(400).json({ ok: false, error: 'Contenu suspect' });
  }

  const result = { saved: false, emailed: false };

  // Record final (partage entre Blob et emails)
  const now = new Date();
  const record = { ...data, created_at: now.toISOString(), ip };

  // 1) Sauvegarde dans Vercel Blob (un fichier JSON par message)
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const stamp = now.toISOString().replace(/[:.]/g, '-');
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

  // 2) Notification email via Resend (admin + accuse de reception visiteur)
  if (process.env.RESEND_API_KEY && process.env.CONTACT_TO_EMAIL) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const from = process.env.CONTACT_FROM_EMAIL || 'NISSI Contact <onboarding@resend.dev>';
      const emailConfig = {
        logoWhiteUrl: process.env.EMAIL_LOGO_URL || 'https://nissi-site.vercel.app/assets/img/nissi-logo-white.png',
        siteUrl: process.env.SITE_URL || 'https://nissi-site.vercel.app',
        adminEmail: process.env.CONTACT_TO_EMAIL,
        phone: process.env.CONTACT_PHONE || '+225 27 22 00 00 00',
        address: process.env.CONTACT_ADDRESS || 'Abidjan, Côte d\'Ivoire'
      };

      // 2a) Mail admin -> arborescence interne
      const adminRes = await resend.emails.send({
        from,
        to: [process.env.CONTACT_TO_EMAIL],
        replyTo: record.email,
        subject: `[NISSI] ${record.sujet}`,
        html: renderAdminEmail(record, emailConfig),
        text: renderAdminEmailPlain(record)
      });
      if (adminRes.error) {
        console.error('Resend admin error:', adminRes.error);
      } else {
        result.emailed = true;
      }

      // 2b) Accuse de reception -> visiteur (best-effort, ne bloque pas l'envoi admin)
      try {
        await resend.emails.send({
          from,
          to: [record.email],
          subject: 'Nous avons bien reçu votre message — NISSI Assurances',
          html: renderClientEmail(record, emailConfig),
          text: renderClientEmailPlain(record)
        });
      } catch (err) {
        console.error('Resend client email error:', err);
      }
    } catch (err) {
      console.error('Resend error:', err);
    }
  }

  if (!result.saved && !result.emailed) {
    return res.status(500).json({ ok: false, error: 'Service momentanement indisponible' });
  }

  return res.status(200).json({ ok: true, ...result });
}
