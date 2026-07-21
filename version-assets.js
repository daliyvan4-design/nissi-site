#!/usr/bin/env node
/* Estampille les fichiers du site avec une empreinte de leur contenu.
   Necessaire car Vercel les sert en "immutable" pour un an : sans changement
   d'adresse, un visiteur deja venu ne recoit jamais les mises a jour.
   A relancer avant chaque publication. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const RACINE = __dirname;
const SUIVIS = ['assets/css/main.css', 'assets/js/main.js'];
const VIDEOS = fs.readdirSync(path.join(RACINE, 'assets/video'))
                 .filter(f => /\.(mp4|jpg)$/.test(f))
                 .map(f => 'assets/video/' + f);

function empreinte(fichiers) {
  const h = crypto.createHash('sha256');
  fichiers.forEach(f => h.update(fs.readFileSync(path.join(RACINE, f))));
  return h.digest('hex').slice(0, 8);
}

const vAssets = empreinte(SUIVIS);
const vMedias = empreinte(VIDEOS);

const PAGES = ['index.html', 'services.html', 'a-propos.html', 'contact.html', 'admin/index.html'];
let total = 0;
PAGES.forEach(p => {
  const chemin = path.join(RACINE, p);
  if (!fs.existsSync(chemin)) return;
  let s = fs.readFileSync(chemin, 'utf8'), avant = s;
  // css / js : ?v=<empreinte>, en remplacant une eventuelle version precedente
  s = s.replace(/(href|src)="((?:\.\.\/)?assets\/(?:css|js)\/main\.(?:css|js))(?:\?v=[a-f0-9]+)?"/g,
                (_, a, f) => `${a}="${f}?v=${vAssets}"`);
  // version des medias, lue par le script pour les videos
  s = s.replace(/(<div class="hero-slides"[^>]*?)(?:\s+data-v="[a-f0-9]+")?(\s|>)/,
                (m, d, fin) => `${d} data-v="${vMedias}"${fin}`);
  if (s !== avant) { fs.writeFileSync(chemin, s); total++; }
});

console.log(`  empreinte css/js : ${vAssets}`);
console.log(`  empreinte medias : ${vMedias}`);
console.log(`  ${total} page(s) estampillee(s)`);
