// Preview des emails NISSI Assurance
// Sert a generer preview/emails.html avec les 2 templates (admin + client)
// execute avec : node preview/build.js
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderAdminEmail, renderClientEmail } from '../lib/email-templates.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const example = {
  prenom: 'Aminata',
  nom: 'Koné',
  email: 'aminata.kone@example.ci',
  telephone: '+225 07 08 09 10 11',
  sujet: 'Devis assurance santé pour ma famille',
  message: `Bonjour,

Je souhaite obtenir un devis pour une assurance santé couvrant mon mari et nos deux enfants.

Nous habitons à Cocody et avons besoin de :
- Consultations et hospitalisation
- Pharmacie et analyses
- Dentaire et optique
- Maternité (un projet de bébé dans 12 mois)

Merci de me recontacter rapidement, je suis disponible en fin de journée.

Cordialement,
Aminata`,
  ip: '196.10.123.45',
  created_at: new Date().toISOString()
};

const config = {
  logoWhiteUrl: 'file:///Users/macbookair/Desktop/nissi/nissi-logo-white.png',
  siteUrl: 'https://nissi-site.vercel.app',
  adminEmail: 'contact@nissi-assurances.ci',
  phone: '+225 27 22 00 00 00',
  address: 'Abidjan, Côte d\'Ivoire'
};

const adminHtml = renderAdminEmail(example, config);
const clientHtml = renderClientEmail(example, config);

// Extract inner <body>...</body> of each generated HTML to embed them side by side
function extractBody(html){
  const m = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (!m) return html;
  return m[1];
}

const adminBody = extractBody(adminHtml);
const clientBody = extractBody(clientHtml);

// Preview page : un ecrin pour visualiser les 2 emails
const previewHtml = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Preview emails — NISSI Assurances</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@500;600;700;800;900&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">
<style>
  :root{
    --red:#E4032C;
    --red-dark:#C41230;
    --bg:#f4f1ef;
    --ink:#1a1416;
  }
  *{box-sizing:border-box}
  body{margin:0;font-family:'Manrope',system-ui,sans-serif;color:var(--ink);background:var(--bg);-webkit-font-smoothing:antialiased}
  .top{background:linear-gradient(135deg,var(--red) 0%,var(--red-dark) 100%);color:#fff;padding:36px 24px 30px;text-align:center}
  .top h1{margin:0 0 6px;font:800 30px/1 'Schibsted Grotesk',sans-serif;letter-spacing:-.02em}
  .top p{margin:0;font:400 14px/1.5 'Manrope',sans-serif;opacity:.92}
  .meta{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:18px}
  .meta span{padding:7px 14px;border:1px solid rgba(255,255,255,.35);background:rgba(255,255,255,.1);border-radius:999px;font:600 12px/1 'Manrope',sans-serif;letter-spacing:.04em;text-transform:uppercase}
  .wrap{padding:40px 24px 60px;max-width:1280px;margin:0 auto}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:28px}
  @media(max-width:1100px){.grid{grid-template-columns:1fr}}
  .card{background:#fff;border-radius:18px;overflow:hidden;border:1px solid rgba(0,0,0,.06);box-shadow:0 30px 60px -30px rgba(196,18,48,.22)}
  .card__hd{padding:18px 22px;border-bottom:1px solid rgba(0,0,0,.06);display:flex;justify-content:space-between;align-items:center;background:#faf8f6}
  .card__hd h2{margin:0;font:700 15px/1 'Manrope',sans-serif;text-transform:uppercase;letter-spacing:.08em;color:var(--ink)}
  .card__hd .tag{font:700 11px/1 'JetBrains Mono',monospace;padding:6px 10px;border-radius:6px;background:#fff;border:1px solid #ece6e7;color:#524a4d}
  .preview{background:#fff;padding:0}
  .preview iframe{width:100%;height:1180px;border:0;display:block;background:#fff}
  .actions{padding:16px 22px;border-top:1px solid rgba(0,0,0,.06);background:#faf8f6;display:flex;gap:10px;justify-content:flex-end;align-items:center;flex-wrap:wrap}
  .actions a{font:600 13px/1 'Manrope',sans-serif;color:var(--red-dark);text-decoration:none;padding:11px 18px;border:1px solid var(--red);border-radius:8px;background:#fff}
  .actions a:hover{background:var(--red);color:#fff}
  .info{margin:24px auto 0;max-width:760px;background:#fff;border-radius:14px;padding:24px 28px;border:1px solid rgba(0,0,0,.06);font:400 14.5px/1.6 'Manrope',sans-serif;color:#524a4d}
  .info code{font:600 13px/1 'JetBrains Mono',monospace;background:#faf6f4;color:var(--red-dark);padding:3px 7px;border-radius:5px}
  .info b{color:var(--ink)}
  .togglebar{display:flex;justify-content:center;gap:6px;margin-bottom:24px}
  .togglebar button{font:600 13px/1 'Manrope',sans-serif;padding:11px 18px;border:1px solid #ece6e7;background:#fff;color:#524a4d;border-radius:10px;cursor:pointer;transition:all .2s}
  .togglebar button.on{background:var(--red);color:#fff;border-color:var(--red)}
</style>
</head>
<body>

<div class="top">
  <h1>Preview emails — NISSI Assurances</h1>
  <p>Visualisation des deux emails déclenchés par le formulaire de contact</p>
  <div class="meta">
    <span>Notification admin</span>
    <span>Accusé de réception visiteur</span>
    <span>Données d'exemple réalistes</span>
  </div>
</div>

<div class="wrap">
  <div class="togglebar">
    <button class="on" onclick="setView('desktop',this)">Bureau (100%)</button>
    <button onclick="setView('tablet',this)">Tablette (768)</button>
    <button onclick="setView('mobile',this)">Mobile (390)</button>
  </div>

  <div class="grid">
    <div class="card">
      <div class="card__hd">
        <h2>1 · Email admin</h2>
        <span class="tag">→ contact@…</span>
      </div>
      <div class="preview">
        <iframe id="f-admin" srcdoc=""></iframe>
      </div>
      <div class="actions">
        <span style="margin-right:auto;font:400 13px/1.5 'Manrope',sans-serif;color:#7f7f7f;max-width:60%">Reçu par NISSI à chaque nouvelle demande. Contient tous les détails + boutons d'action.</span>
        <a href="../preview/standalone/admin.html" target="_blank" rel="noopener">Ouvrir en grand ↗</a>
      </div>
    </div>

    <div class="card">
      <div class="card__hd">
        <h2>2 · Email visiteur</h2>
        <span class="tag">→ aminata.kone@…</span>
      </div>
      <div class="preview">
        <iframe id="f-client" srcdoc=""></iframe>
      </div>
      <div class="actions">
        <span style="margin-right:auto;font:400 13px/1.5 'Manrope',sans-serif;color:#7f7f7f;max-width:60%">Accusé de réception envoyé automatiquement au visiteur qui a rempli le formulaire.</span>
        <a href="../preview/standalone/client.html" target="_blank" rel="noopener">Ouvrir en grand ↗</a>
      </div>
    </div>
  </div>

  <div class="info">
    <b>À propos de cette preview</b> — Les deux emails ci-dessus sont générés en direct par <code>lib/email-templates.js</code> avec les mêmes fonctions que celles appelées par l'API <code>api/contact.js</code>. Les couleurs, la typographie et les boutons sont alignés sur le site public. <br><br>
    <b>Pour tester le rendu réel</b>, remplissez le formulaire sur <code>https://nissi-site.vercel.app/contact.html</code> — vous recevrez un email admin et le visiteur recevra l'accusé de réception.
  </div>
</div>

<script>
  const adminBody = ${JSON.stringify(adminBody)};
  const clientBody = ${JSON.stringify(clientBody)};
  function setView(size, btn){
    document.querySelectorAll('.togglebar button').forEach(b => b.classList.remove('on'));
    btn.classList.add('on');
    const widths = { desktop:'100%', tablet:'768px', mobile:'390px' };
    document.querySelectorAll('.preview iframe').forEach(f => {
      f.style.maxWidth = widths[size];
      f.style.margin = '0 auto';
    });
  }
  function inject(){
    const fa = document.getElementById('f-admin');
    const fc = document.getElementById('f-client');
    const wrap = (body) => '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link href="https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@500;600;700;800;900&family=Manrope:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet"><style>body{margin:0;background:#fff}</style></head><body>' + body + '</body></html>';
    fa.srcdoc = wrap(adminBody);
    fc.srcdoc = wrap(clientBody);
  }
  inject();
  setView('desktop', document.querySelector('.togglebar button'));
</script>
</body>
</html>`;

const previewDir = path.resolve(__dirname);
fs.mkdirSync(previewDir, { recursive: true });
fs.writeFileSync(path.join(previewDir, 'emails.html'), previewHtml, 'utf-8');

// Standalone files (full email, sans iframe) pour "voir en grand"
const standaloneDir = path.resolve(__dirname, 'standalone');
fs.mkdirSync(standaloneDir, { recursive: true });
fs.writeFileSync(path.join(standaloneDir, 'admin.html'), adminHtml, 'utf-8');
fs.writeFileSync(path.join(standaloneDir, 'client.html'), clientHtml, 'utf-8');

console.log('OK');
console.log('  ->', path.join(previewDir, 'emails.html'));
console.log('  ->', path.join(standaloneDir, 'admin.html'));
console.log('  ->', path.join(standaloneDir, 'client.html'));
