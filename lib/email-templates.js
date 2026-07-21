// Templates d'emails NISSI Assurance
// Deux templates :
//   - renderAdminEmail  -> recu par NISSI quand un visiteur envoie le formulaire
//   - renderClientEmail -> accuse de reception envoye au visiteur
// Style : aligne sur la marque (rouge #E4030B / #C41218, typo Schibsted Grotesk + Manrope)
// Compatible clients mail (Outlook, Gmail, Apple Mail) : tables + inline CSS

const BRAND = {
  red: '#E4030B',
  redDark: '#C41218',
  redDarker: '#A10F14',
  ink: '#1a1416',
  mute: '#524a4d',
  line: '#ece6e7',
  bg: '#faf6f4',
  white: '#ffffff',
  green: '#1F8A5B',
  greenBg: '#e4f4ec',
  pink: '#EFAFB1',
  pinkSoft: '#FFD9DA'
};

// Helpers
function esc(v){
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(d){
  const date = d instanceof Date ? d : new Date();
  return date.toLocaleString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Abidjan'
  });
}

function formatDateShort(d){
  const date = d instanceof Date ? d : new Date();
  return date.toLocaleString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Abidjan'
  });
}

// Wrapper commun (head + body shell) -> retourne un doctype HTML5 complet
function wrap(title, bodyContent){
  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light only">
<title>${esc(title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};-webkit-font-smoothing:antialiased;font-family:'Manrope','Helvetica Neue',Helvetica,Arial,sans-serif;color:${BRAND.ink}">
${bodyContent}
</body>
</html>`;
}

// Bandeau logo / en-tete (haut de chaque email, reutilise pour les 2 templates)
function renderHeader({ logoUrl, badge = '' } = {}){
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#E4030B 0%,#C41218 60%,#A10F14 100%);background-color:${BRAND.red};">
    <tr>
      <td style="padding:0;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-image:radial-gradient(circle at 85% 20%,rgba(239,175,180,.55),transparent 55%),radial-gradient(circle at 12% 90%,rgba(255,90,120,.45),transparent 55%);background-color:${BRAND.red};">
          <tr>
            <td align="center" style="padding:38px 24px 34px;">
              <img src="${esc(logoUrl)}" alt="NISSI ASSURANCES" width="170" style="display:block;width:170px;max-width:60%;height:auto;border:0;outline:none;text-decoration:none">
              ${badge ? `<div style="margin-top:14px;display:inline-block;padding:6px 14px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.12);border-radius:999px;color:#fff;font:600 11.5px 'Manrope',Helvetica,Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase">${badge}</div>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;
}

// Bandeau / pill de sujet dans le body
function renderSubjectPill(icon, text){
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 14px;">
    <tr>
      <td align="center" style="padding:0;">
        <div style="display:inline-block;padding:9px 18px;background:${BRAND.pink};color:${BRAND.redDarker};border-radius:999px;font:700 12.5px/1 'Manrope',Helvetica,Arial,sans-serif;letter-spacing:.04em">
          ${esc(icon)} &nbsp; ${esc(text)}
        </div>
      </td>
    </tr>
  </table>`;
}

function renderTitle(text, color){
  return `<h1 style="margin:0 0 14px;font:800 32px/1.15 'Schibsted Grotesk','Helvetica Neue',Helvetica,Arial,sans-serif;letter-spacing:-.02em;color:${color || BRAND.ink};text-align:center">${esc(text)}</h1>`;
}

function renderSubtitle(text){
  return `<p style="margin:0 0 30px;font:400 16px/1.55 'Manrope',Helvetica,Arial,sans-serif;color:${BRAND.mute};text-align:center;max-width:520px">${esc(text)}</p>`;
}

function renderField(label, value, mono){
  return `
  <tr>
    <td style="padding:14px 0;border-bottom:1px solid ${BRAND.line};vertical-align:top;width:120px">
      <span style="font:600 11.5px/1.2 'Manrope',Helvetica,Arial,sans-serif;color:${BRAND.mute};text-transform:uppercase;letter-spacing:.08em">${esc(label)}</span>
    </td>
    <td style="padding:14px 0;border-bottom:1px solid ${BRAND.line};vertical-align:top">
      <span style="font:${mono ? "600 15px 'Manrope',monospace" : "600 15px 'Manrope',Helvetica,Arial,sans-serif"};color:${BRAND.ink};word-break:break-word">${esc(value || '-')}</span>
    </td>
  </tr>`;
}

function renderButton(label, href, dark = false){
  const bg = dark ? BRAND.ink : '#ffffff';
  const fg = dark ? '#ffffff' : BRAND.red;
  const border = dark ? `border:1px solid ${BRAND.ink}` : `border:1px solid ${BRAND.red}`;
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
    <tr>
      <td align="center" style="border-radius:8px;" bgcolor="${bg}">
        <a href="${esc(href)}" target="_blank" style="display:inline-block;padding:15px 34px;font:700 14px/1 'Manrope',Helvetica,Arial,sans-serif;color:${esc(fg)};text-decoration:none;border-radius:8px;${border};letter-spacing:.04em;text-transform:uppercase">${esc(label)}</a>
      </td>
    </tr>
  </table>`;
}

function renderFooter({ logoUrl, address, phone, email, siteUrl }){
  return `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.ink};">
    <tr>
      <td align="center" style="padding:34px 24px 28px;">
        <img src="${esc(logoUrl)}" alt="NISSI" width="130" style="display:block;width:130px;max-width:60%;height:auto;border:0;outline:none;text-decoration:none;opacity:.95">
        <p style="margin:20px 0 4px;font:700 15px 'Manrope',Helvetica,Arial,sans-serif;color:#fff">NISSI Assurances</p>
        <p style="margin:0 0 18px;font:400 13px 'Manrope',Helvetica,Arial,sans-serif;color:rgba(255,255,255,.65)">${esc(address)}</p>
        <p style="margin:0;font:400 13px 'Manrope',Helvetica,Arial,sans-serif;color:rgba(255,255,255,.85)">
          <a href="tel:${esc(phone)}" style="color:rgba(255,255,255,.85);text-decoration:none">${esc(phone)}</a>
          &nbsp;·&nbsp;
          <a href="mailto:${esc(email)}" style="color:rgba(255,255,255,.85);text-decoration:none">${esc(email)}</a>
        </p>
        <p style="margin:24px 0 0;font:400 11.5px 'Manrope',Helvetica,Arial,sans-serif;color:rgba(255,255,255,.4)">
          © ${new Date().getFullYear()} NISSI Assurances · Tous droits réservés
        </p>
        <p style="margin:6px 0 0;font:400 11px 'Manrope',Helvetica,Arial,sans-serif;color:rgba(255,255,255,.35)">
          <a href="${esc(siteUrl)}" style="color:rgba(255,255,255,.55);text-decoration:underline">${esc(siteUrl.replace(/^https?:\/\//, ''))}</a>
        </p>
      </td>
    </tr>
  </table>`;
}

// ============================================================
// 1) Email envoye a NISSI (admin) quand un visiteur envoie le form
// ============================================================
export function renderAdminEmail(d, opts){
  const cfg = {
    logoWhiteUrl: 'https://nissi-site.vercel.app/assets/img/nissi-logo-white.png',
    siteUrl: 'https://nissi-site.vercel.app',
    adminEmail: 'nissiassurances@nissiassurances.com',
    phone: '+225 27 22 53 38 55',
    address: 'Riviera Palmeraie, Abidjan',
    ...(opts || {})
  };

  const createdAt = d.created_at ? new Date(d.created_at) : new Date();
  const fullName = `${d.prenom || ''} ${d.nom || ''}`.trim() || 'Visiteur';

  const content = `
    ${renderHeader({ logoUrl: cfg.logoWhiteUrl, badge: 'Notification interne' })}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};">
      <tr>
        <td align="center" style="padding:40px 20px 60px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:18px;box-shadow:0 30px 60px -30px rgba(196,18,48,.18);overflow:hidden;border:1px solid ${BRAND.line}">

            <tr>
              <td style="padding:42px 42px 8px;">
                ${renderSubjectPill('Demande de contact', formatDateShort(createdAt))}
                ${renderTitle('Nouvelle demande reçue')}
                ${renderSubtitle('Un visiteur vient d\'envoyer un message depuis le site. Voici tous les détails pour y répondre rapidement.')}

                <div style="height:1px;background:linear-gradient(90deg,transparent,${BRAND.line},transparent);margin:8px 0 22px"></div>

                <h2 style="margin:0 0 18px;font:700 13px 'Manrope',Helvetica,Arial,sans-serif;color:${BRAND.mute};text-transform:uppercase;letter-spacing:.12em">Informations du contact</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
                  ${renderField('Nom complet', fullName)}
                  ${renderField('Email', d.email)}
                  ${renderField('Téléphone', d.telephone, true)}
                  ${renderField('Sujet', d.sujet)}
                  ${renderField('Reçu le', formatDate(createdAt))}
                  ${d.ip ? renderField('Origine', d.ip, true) : ''}
                </table>

                <h2 style="margin:28px 0 14px;font:700 13px 'Manrope',Helvetica,Arial,sans-serif;color:${BRAND.mute};text-transform:uppercase;letter-spacing:.12em">Message</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="background:${BRAND.bg};border-left:4px solid ${BRAND.red};border-radius:8px;padding:18px 20px;font:400 15px/1.6 'Manrope',Helvetica,Arial,sans-serif;color:${BRAND.ink};white-space:pre-wrap;word-break:break-word">${esc(d.message)}</td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:30px 0 6px;">
                  <tr>
                    <td align="center">
                      ${renderButton('Répondre par email', `mailto:${d.email}?subject=${encodeURIComponent('Re: ' + (d.sujet || 'Votre demande'))}`, true)}
                      <p style="margin:18px 0 0">
                        <a href="tel:${esc(d.telephone || '')}" style="font:600 13px 'Manrope',Helvetica,Arial,sans-serif;color:${BRAND.red};text-decoration:none">Ou appeler ${esc(d.telephone || 'le contact')}</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>

          <p style="margin:24px 0 0;font:400 12px 'Manrope',Helvetica,Arial,sans-serif;color:${BRAND.mute};text-align:center">
            Cette notification a été générée automatiquement par le formulaire du site NISSI ASSURANCES
          </p>
        </td>
      </tr>
    </table>

    ${renderFooter({ logoUrl: cfg.logoWhiteUrl, address: cfg.address, phone: cfg.phone, email: cfg.adminEmail, siteUrl: cfg.siteUrl })}
  `;

  return wrap('Nouvelle demande de contact - NISSI Assurances', content);
}

// ============================================================
// 2) Email recu par le visiteur (accuse de reception)
// ============================================================
export function renderClientEmail(d, opts){
  const cfg = {
    logoWhiteUrl: 'https://nissi-site.vercel.app/assets/img/nissi-logo-white.png',
    siteUrl: 'https://nissi-site.vercel.app',
    adminEmail: 'nissiassurances@nissiassurances.com',
    phone: '+225 27 22 53 38 55',
    address: 'Riviera Palmeraie, Abidjan',
    ...(opts || {})
  };

  const createdAt = d.created_at ? new Date(d.created_at) : new Date();
  const firstName = (d.prenom || '').trim() || 'cher visiteur';

  const content = `
    ${renderHeader({ logoUrl: cfg.logoWhiteUrl, badge: 'Accusé de réception' })}

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${BRAND.bg};">
      <tr>
        <td align="center" style="padding:44px 20px 60px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:100%;background:#ffffff;border-radius:18px;box-shadow:0 30px 60px -30px rgba(196,18,48,.18);overflow:hidden;border:1px solid ${BRAND.line}">

            <tr>
              <td style="padding:46px 42px 16px;">
                ${renderSubjectPill('Merci de nous avoir contactés', formatDateShort(createdAt))}
                ${renderTitle(`Bonjour ${firstName},`)}
                ${renderSubtitle('Nous avons bien recu votre message. Notre equipe le traite dans les plus brefs delais - vous recevrez une reponse personnalisee sous 24 heures ouvrees.')}

                <div style="height:1px;background:linear-gradient(90deg,transparent,${BRAND.line},transparent);margin:6px 0 26px"></div>

                <h2 style="margin:0 0 16px;font:700 13px 'Manrope',Helvetica,Arial,sans-serif;color:${BRAND.mute};text-transform:uppercase;letter-spacing:.12em">Récapitulatif de votre demande</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
                  ${renderField('Sujet', d.sujet)}
                  ${renderField('Envoyé le', formatDate(createdAt))}
                  ${renderField('Référence', '#NIS-' + Math.random().toString(36).slice(2, 8).toUpperCase(), true)}
                </table>

                <h2 style="margin:28px 0 14px;font:700 13px 'Manrope',Helvetica,Arial,sans-serif;color:${BRAND.mute};text-transform:uppercase;letter-spacing:.12em">Votre message</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td style="background:${BRAND.bg};border-left:4px solid ${BRAND.red};border-radius:8px;padding:18px 20px;font:400 15px/1.6 'Manrope',Helvetica,Arial,sans-serif;color:${BRAND.ink};white-space:pre-wrap;word-break:break-word">${esc(d.message)}</td>
                  </tr>
                </table>

                <h2 style="margin:34px 0 14px;font:700 13px 'Manrope',Helvetica,Arial,sans-serif;color:${BRAND.mute};text-transform:uppercase;letter-spacing:.12em">Les prochaines étapes</h2>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse">
                  <tr>
                    <td style="padding:10px 0;vertical-align:top;width:34px">
                      <div style="width:28px;height:28px;border-radius:50%;background:${BRAND.red};color:#fff;font:800 14px/28px 'Manrope',Helvetica,Arial,sans-serif;text-align:center">1</div>
                    </td>
                    <td style="padding:10px 0 18px;vertical-align:top">
                      <p style="margin:0 0 2px;font:700 15px 'Manrope',Helvetica,Arial,sans-serif;color:${BRAND.ink}">Analyse de votre demande</p>
                      <p style="margin:0;font:400 14px/1.5 'Manrope',Helvetica,Arial,sans-serif;color:${BRAND.mute}">Un conseiller NISSI étudie votre message et prépare une réponse adaptée.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;vertical-align:top;width:34px">
                      <div style="width:28px;height:28px;border-radius:50%;background:${BRAND.red};color:#fff;font:800 14px/28px 'Manrope',Helvetica,Arial,sans-serif;text-align:center">2</div>
                    </td>
                    <td style="padding:10px 0 18px;vertical-align:top">
                      <p style="margin:0 0 2px;font:700 15px 'Manrope',Helvetica,Arial,sans-serif;color:${BRAND.ink}">Prise de contact</p>
                      <p style="margin:0;font:400 14px/1.5 'Manrope',Helvetica,Arial,sans-serif;color:${BRAND.mute}">Nous revenons vers vous par email ou par téléphone sous 24 heures ouvrées.</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:10px 0;vertical-align:top;width:34px">
                      <div style="width:28px;height:28px;border-radius:50%;background:${BRAND.red};color:#fff;font:800 14px/28px 'Manrope',Helvetica,Arial,sans-serif;text-align:center">3</div>
                    </td>
                    <td style="padding:10px 0;vertical-align:top">
                      <p style="margin:0 0 2px;font:700 15px 'Manrope',Helvetica,Arial,sans-serif;color:${BRAND.ink}">Proposition sur mesure</p>
                      <p style="margin:0;font:400 14px/1.5 'Manrope',Helvetica,Arial,sans-serif;color:${BRAND.mute}">Vous recevez nos recommandations et un devis gratuit, sans engagement.</p>
                    </td>
                  </tr>
                </table>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0 0;">
                  <tr>
                    <td align="center">
                      ${renderButton('Visiter notre site', cfg.siteUrl)}
                    </td>
                  </tr>
                </table>

                <p style="margin:30px 0 0;font:400 14px/1.6 'Manrope',Helvetica,Arial,sans-serif;color:${BRAND.mute};text-align:center">
                  Une question urgente ? Appelez-nous au <a href="tel:${esc(cfg.phone)}" style="color:${BRAND.red};font-weight:700;text-decoration:none">${esc(cfg.phone)}</a>
                </p>
              </td>
            </tr>

          </table>

          <p style="margin:24px 0 0;font:400 12px 'Manrope',Helvetica,Arial,sans-serif;color:${BRAND.mute};text-align:center">
            Vous recevez ce message car vous avez contacté NISSI Assurances via notre site web.
          </p>
        </td>
      </tr>
    </table>

    ${renderFooter({ logoUrl: cfg.logoWhiteUrl, address: cfg.address, phone: cfg.phone, email: cfg.adminEmail, siteUrl: cfg.siteUrl })}
  `;

  return wrap('Nous avons bien recu votre message - NISSI Assurances', content);
}

// Helper pratique si le caller veut juste le plain text
export function renderAdminEmailPlain(d){
  const fullName = `${d.prenom || ''} ${d.nom || ''}`.trim();
  return [
    'Nouvelle demande de contact - NISSI Assurances',
    '',
    `De : ${fullName} <${d.email}>`,
    `Téléphone : ${d.telephone || '-'}`,
    `Sujet : ${d.sujet}`,
    `Reçu le : ${new Date(d.created_at || Date.now()).toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' })}`,
    '',
    'Message :',
    d.message
  ].join('\n');
}

export function renderClientEmailPlain(d){
  return [
    'Bonjour,',
    '',
    'Nous avons bien reçu votre message et reviendrons vers vous sous 24 heures ouvrées.',
    '',
    `Sujet : ${d.sujet}`,
    '',
    'Votre message :',
    d.message,
    '',
    "- L'equipe NISSI Assurances"
  ].join('\n');
}
