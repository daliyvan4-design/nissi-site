/* ===========================================================
   NISSI Assurances - main.js
   Moteur parallaxe immersif + reveals + analytics tracking
   =========================================================== */
(function(){
  'use strict';

  // Marque la page comme animable. Les etats "masque" du CSS y sont
  // conditionnes : sans JavaScript, rien ne disparait.
  document.documentElement.classList.add('js-anim');

  // ---------- Helpers ----------
  function clamp(v, a, b){return Math.max(a, Math.min(b, v))}
  function rafThrottle(fn){
    var ticking = false, lastArgs;
    return function(){
      lastArgs = arguments;
      if(ticking) return;
      ticking = true;
      requestAnimationFrame(function(){
        fn.apply(null, lastArgs);
        ticking = false;
      });
    };
  }
  function reducedMotion(){
    return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function safeSend(url, payload){
    try{
      var data = JSON.stringify(payload || {});
      if(navigator.sendBeacon){
        var blob = new Blob([data], {type:'application/json'});
        if(navigator.sendBeacon(url, blob)) return;
      }
    }catch(e){}
    try{
      fetch(url, {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload||{}), keepalive:true}).catch(function(){});
    }catch(e){}
  }

  // ====================================================
  // 1) Parallaxe scroll multi-couches (data-px)
  // ====================================================
  function initScrollParallax(){
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-px]'));
    if(!els.length) return;

    els.forEach(function(el){
      el._sec = el.closest('header,section,footer') || document.body;
      el.style.willChange = 'transform';
    });

    var vh = function(){return window.innerHeight || document.documentElement.clientHeight};

    function update(){
      var h = vh();
      for(var i=0;i<els.length;i++){
        var el = els[i];
        var sp = parseFloat(el.getAttribute('data-px')) || 0;
        var rect = el._sec.getBoundingClientRect();
        if(rect.bottom < -400 || rect.top > h + 400) continue;
        var t = rect.top;
        // Apply eased parallax with clamp to avoid huge offsets
        var y = clamp(-t * sp, -260, 260);
        el.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0)';
      }
    }

    var onScroll = rafThrottle(update);
    window.addEventListener('scroll', onScroll, {passive:true});
    window.addEventListener('resize', onScroll, {passive:true});
    update();
  }

  // ====================================================
  // 2) Parallaxe souris (data-px-mouse) - effet profondeur hero
  // ====================================================
  function initMouseParallax(){
    if(reducedMotion()) return;
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-px-mouse]'));
    if(!els.length) return;

    var mx = 0, my = 0; // -1..1
    var tx = 0, ty = 0;
    var active = false;

    function onMove(e){
      var w = window.innerWidth, h = window.innerHeight;
      mx = (e.clientX / w) * 2 - 1;
      my = (e.clientY / h) * 2 - 1;
      if(!active){active = true; loop()}
    }
    function onLeave(){
      mx = 0; my = 0;
    }
    function loop(){
      tx += (mx - tx) * 0.08;
      ty += (my - ty) * 0.08;
      for(var i=0;i<els.length;i++){
        var el = els[i];
        var depth = parseFloat(el.getAttribute('data-px-mouse')) || 0.3; // px max
        var dx = tx * depth * 22;
        var dy = ty * depth * 18;
        el.style.transform = 'translate3d(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,0)';
      }
      if(Math.abs(mx-tx) > 0.001 || Math.abs(my-ty) > 0.001){
        requestAnimationFrame(loop);
      } else {
        active = false;
      }
    }

    window.addEventListener('mousemove', onMove, {passive:true});
    document.addEventListener('mouseleave', onLeave);
    window.addEventListener('blur', onLeave);
  }

  // ====================================================
  // 3) Reveal on scroll (data-reveal / data-reveal-stagger)
  // ====================================================
  function initReveals(){
    if(!('IntersectionObserver' in window)){
      // No IO: just show
      document.querySelectorAll('[data-reveal],[data-reveal-stagger]').forEach(function(el){
        el.classList.add('is-in');
      });
      return;
    }
    var cibles = document.querySelectorAll('[data-reveal],[data-reveal-stagger]');

    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, {rootMargin:'-40px 0px -10% 0px', threshold:0.05});

    Array.prototype.forEach.call(cibles, function(el){ io.observe(el); });

    // Filet de securite. Ces blocs partent a opacite 0 : si l'observateur ne
    // repond pas (navigateur ancien, onglet restaure, bride), tout le contenu
    // sous l'accueil resterait invisible. On verifie donc aussi au defilement.
    function verifier(){
      var h = window.innerHeight || document.documentElement.clientHeight;
      for(var i=0;i<cibles.length;i++){
        var el = cibles[i];
        if(el.classList.contains('is-in')) continue;
        var r = el.getBoundingClientRect();
        if(r.top < h * 0.92 && r.bottom > 0) el.classList.add('is-in');
      }
    }
    var auDefilement = rafThrottle(verifier);
    window.addEventListener('scroll', auDefilement, {passive:true});
    window.addEventListener('resize', auDefilement, {passive:true});
    setTimeout(verifier, 1200);      // rattrape aussi un chargement sans defilement
  }

  // ====================================================
  // 4) Text reveal letter by letter
  // ====================================================
  // Decoupe en mots (chaque mot = un masque inline-block), puis en lettres a
  // l'interieur du mot. Les espaces restent de vrais espaces et les <br> sont
  // conservees, sinon le titre devient une seule ligne insecable qui deborde
  // de l'ecran sur telephone.
  function splitForReveal(el){
    var nodes = Array.prototype.slice.call(el.childNodes);
    var frag = document.createDocumentFragment();
    var i = 0;

    nodes.forEach(function(node){
      if(node.nodeType === 1 && node.tagName === 'BR'){
        frag.appendChild(node.cloneNode(false));
        return;
      }
      var text = node.textContent || '';
      // On garde les espaces comme separateurs pour permettre le retour a la ligne
      text.split(/(\s+)/).forEach(function(part){
        if(!part) return;
        if(/^\s+$/.test(part)){
          frag.appendChild(document.createTextNode(' '));
          return;
        }
        var word = document.createElement('span');
        word.className = 'tr-w';
        part.split('').forEach(function(ch){
          var c = document.createElement('span');
          c.className = 'tr-c';
          c.textContent = ch;
          c.style.setProperty('--d', (i * 0.018) + 's');
          i++;
          word.appendChild(c);
        });
        frag.appendChild(word);
      });
    });

    el.textContent = '';
    el.appendChild(frag);
  }

  function initTextReveal(){
    var targets = document.querySelectorAll('[data-txt-reveal]');
    if(!targets.length) return;
    // Sans IntersectionObserver on laisse le texte tel quel, deja lisible
    if(!('IntersectionObserver' in window)) return;

    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        splitForReveal(el);
        void el.offsetWidth;          // meme raison que dans initHeadingAnim()
        el.classList.add('is-in');
      });
    }, {threshold:0.4});

    Array.prototype.forEach.call(targets, function(el){io.observe(el)});
  }

  // ====================================================
  // 4b) Animation des titres de section
  // Le trait de l'intitule se trace, ses lettres montent, puis le titre
  // se devoile mot par mot. Reutilise splitForReveal() ci-dessus.
  // ====================================================
  function initHeadingAnim(){
    var heads = document.querySelectorAll('.eyebrow, .section-title, [data-anim-title]');
    if(!heads.length) return;

    // Sans IntersectionObserver, tout reste visible tel quel (aucune animation)
    if(!('IntersectionObserver' in window)){
      Array.prototype.forEach.call(heads, function(el){el.classList.add('is-anim')});
      return;
    }

    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(!entry.isIntersecting) return;
        var el = entry.target;
        io.unobserve(el);
        // Les titres se decoupent en mots ; l'intitule garde sa structure
        // (trait + libelle) et n'est anime que par le CSS.
        if(!el.classList.contains('eyebrow') && !el.querySelector('.tr-w')) splitForReveal(el);
        // Forcer le calcul du style avant d'armer la transition. requestAnimationFrame
        // n'est pas garanti (onglet en arriere-plan, bridage du navigateur) et
        // laisserait alors l'intitule invisible pour toujours.
        void el.offsetWidth;
        el.classList.add('is-anim');
      });
    }, {rootMargin:'0px 0px -12% 0px', threshold:0.25});

    Array.prototype.forEach.call(heads, function(el){io.observe(el)});
  }

  // ====================================================
  // 4c) Diaporama video plein ecran du hero
  // Deux lecteurs seulement alternent en fondu : pendant que l'un est a
  // l'ecran, l'autre precharge la video suivante. Empiler les 6 videos
  // saturait le nombre de decodeurs disponibles (surtout sur telephone) et
  // certaines ne demarraient jamais.
  // ====================================================
  function initHeroSlides(){
    var scene = document.querySelector('.hero-slides');
    if(!scene) return;
    var lecteurs = scene.querySelectorAll('.hero-slide');
    var noms = (scene.getAttribute('data-slides') || '').split(',').filter(Boolean);
    if(lecteurs.length < 2 || noms.length < 2) return;

    var DUREE = 3500;
    var idx = 0;          // video affichee
    var actif = 0;        // lecteur affiche (0 ou 1)
    var timer = null;

    function url(n){ return 'assets/video/' + noms[n] + '.mp4'; }
    function img(n){ return 'assets/video/' + noms[n] + '.jpg'; }

    function charger(lecteur, n){
      if(lecteur.getAttribute('src') === url(n)) return;
      lecteur.setAttribute('src', url(n));
      lecteur.setAttribute('poster', img(n));
      lecteur.load();
    }

    function lire(lecteur){
      var p = lecteur.play();
      if(p && p.catch) p.catch(function(){});   // lecture auto refusee : le poster reste
    }

    // prepare des maintenant la video qui suivra
    charger(lecteurs[1], 1 % noms.length);

    function suivante(){
      var suiv = (idx + 1) % noms.length;
      var entrant = lecteurs[1 - actif], sortant = lecteurs[actif];

      charger(entrant, suiv);
      if(entrant.currentTime > 0.05) entrant.currentTime = 0;
      lire(entrant);
      entrant.classList.add('is-on');
      sortant.classList.remove('is-on');

      setTimeout(function(){
        if(!sortant.classList.contains('is-on')){
          sortant.pause();
          charger(sortant, (suiv + 1) % noms.length);   // precharge la suivante
        }
      }, 900);

      idx = suiv; actif = 1 - actif;
    }

    function demarrer(){ if(!timer) timer = setInterval(suivante, DUREE); }
    function arreter(){
      clearInterval(timer); timer = null;
      Array.prototype.forEach.call(lecteurs, function(v){ v.pause(); });
    }

    // Rien ne tourne quand le hero est hors de vue ou l'onglet en arriere-plan
    var hero = document.querySelector('.hero'), visible = true, vuUneFois = false;
    if('IntersectionObserver' in window && hero){
      new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          // Tant que le hero n'a jamais ete signale visible, on ignore un
          // "hors ecran" : une premiere mesure erronee figerait le diaporama.
          if(!e.isIntersecting && !vuUneFois) return;
          if(e.isIntersecting) vuUneFois = true;
          visible = e.isIntersecting;
          if(visible && !document.hidden){ lire(lecteurs[actif]); demarrer(); }
          else arreter();
        });
      }, {threshold:0.15}).observe(hero);
    }
    document.addEventListener('visibilitychange', function(){
      if(document.hidden) arreter();
      else if(visible){ lire(lecteurs[actif]); demarrer(); }
    });

    lire(lecteurs[0]);
    demarrer();
  }

  // ====================================================
  // 5) Sticky nav state on scroll
  // ====================================================
  function initStickyNav(){
    var wrap = document.querySelector('.nnav-wrap');
    if(!wrap) return;
    function onScroll(){
      if(window.scrollY > 12) wrap.classList.add('is-stuck');
      else wrap.classList.remove('is-stuck');
    }
    window.addEventListener('scroll', rafThrottle(onScroll), {passive:true});
    onScroll();
  }

  // ====================================================
  // 6) Tilt 3D cards
  // ====================================================
  function initTilt(){
    if(reducedMotion()) return;
    var els = Array.prototype.slice.call(document.querySelectorAll('.tilt-3d'));
    if(!els.length) return;
    els.forEach(function(el){
      el.addEventListener('mousemove', function(e){
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        var rx = (py - 0.5) * -6;
        var ry = (px - 0.5) * 8;
        el.style.transform = 'perspective(900px) rotateX(' + rx.toFixed(2) + 'deg) rotateY(' + ry.toFixed(2) + 'deg) translateY(-2px)';
      });
      el.addEventListener('mouseleave', function(){
        el.style.transform = '';
      });
    });
  }

  // ====================================================
  // 7) Mobile menu
  // ====================================================
  function initMobileMenu(){
    var burger = document.querySelector('.nnav__burger');
    var panel = document.querySelector('.nnav__mobile');
    if(!burger || !panel) return;

    function open(){
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden','false');
      burger.classList.add('is-open');
      document.body.style.overflow = 'hidden';
    }
    function close(){
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden','true');
      burger.classList.remove('is-open');
      document.body.style.overflow = '';
    }
    burger.addEventListener('click', function(){panel.classList.contains('is-open') ? close() : open()});
    panel.querySelectorAll('a').forEach(function(a){a.addEventListener('click', close)});
    var closer = panel.querySelector('.close');
    if(closer) closer.addEventListener('click', close);
    document.addEventListener('keydown', function(e){if(e.key === 'Escape') close()});
  }

  // ====================================================
  // 8) Contact form (validation + envoi API + honeypot)
  // ====================================================
  function initContactForm(){
    var form = document.querySelector('[data-contact-form]');
    if(!form) return;
    var confirm = document.querySelector('[data-contact-confirm]');

    form.addEventListener('submit', function(e){
      e.preventDefault();
      form.querySelectorAll('.field-error').forEach(function(n){n.remove()});
      var invalid = [];
      var required = [
        {name:'prenom', label:'Prenom'},
        {name:'nom', label:'Nom'},
        {name:'email', label:'Email'},
        {name:'sujet', label:'Sujet'},
        {name:'message', label:'Message'}
      ];
      required.forEach(function(r){
        var el = form.querySelector('[name="'+r.name+'"]');
        if(!el) return;
        var v = (el.value || '').trim();
        var ok = v.length > 0;
        if(r.name === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        if(!ok){
          invalid.push(r.label);
          var err = document.createElement('span');
          err.className = 'field-error';
          err.textContent = r.label + (r.name === 'email' ? ' invalide' : ' requis');
          el.parentNode.appendChild(err);
          el.style.borderColor = '#E4030B';
        } else {
          el.style.borderColor = '';
        }
      });
      var consent = form.querySelector('[name="consent"]');
      if(consent && !consent.checked){
        invalid.push('Consentement');
        consent.parentNode.style.color = '#E4030B';
      }
      // Honeypot (anti-spam) - champ cache doit rester vide
      var hp = form.querySelector('[name="_hp"]');
      if(hp && hp.value){
        // Simule succes silencieux pour ne pas guider le bot
        form.reset();
        return;
      }
      if(invalid.length){
        if(confirm){
          confirm.textContent = 'Merci de completer : ' + invalid.join(', ');
          confirm.style.background = '#fdeef0';
          confirm.style.color = '#C41218';
        }
        return;
      }
      var payload = {};
      ['prenom','nom','email','telephone','sujet','message'].forEach(function(n){
        var el = form.querySelector('[name="'+n+'"]');
        if(el) payload[n] = (el.value || '').trim();
      });
      var btn = form.querySelector('[type="submit"]');
      if(btn) btn.disabled = true;
      if(confirm){
        confirm.textContent = 'Envoi en cours...';
        confirm.style.background = '#eef2f7';
        confirm.style.color = '#33475b';
      }
      fetch('/api/contact', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      }).then(function(r){
        if(!r.ok) throw new Error('http ' + r.status);
        return r.json();
      }).then(function(){
        if(confirm){
          confirm.textContent = 'Merci ! Votre demande a bien ete envoyee. Un conseiller NISSI vous rappelle sous 24h ouvrees.';
          confirm.style.background = '#e4f4ec';
          confirm.style.color = '#1F8A5B';
        }
        form.reset();
        // Track conversion
        safeSend('/api/track', {type:'conversion', path: location.pathname, target:'contact-form'});
      }).catch(function(){
        if(confirm){
          confirm.textContent = 'Une erreur est survenue lors de l\'envoi. Merci de reessayer dans un instant.';
          confirm.style.background = '#fdeef0';
          confirm.style.color = '#C41218';
        }
      }).finally(function(){
        if(btn) btn.disabled = false;
      });
    });
  }

  // ====================================================
  // 9) Analytics tracking (pageview + clicks)
  // ====================================================
  function initAnalytics(){
    // Session ID persistant (1 an) - anonyme, non PII
    var sid = '';
    try {
      var m = document.cookie.match(/(?:^|; )nissi_sid=([^;]+)/);
      if (m) sid = m[1];
      if (!sid) {
        sid = 's' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
        var exp = new Date(); exp.setFullYear(exp.getFullYear() + 1);
        document.cookie = 'nissi_sid=' + sid + '; expires=' + exp.toUTCString() + '; path=/; SameSite=Lax';
      }
    } catch(e){ sid = 'anon'; }

    // 1) Pageview
    safeSend('/api/track', {
      type: 'pageview',
      path: location.pathname,
      session: sid,
      ref: document.referrer || '',
      title: document.title,
      screen: screen.width + 'x' + screen.height
    });

    // 2) Outbound CTA clicks (data-track)
    document.addEventListener('click', function(e){
      var t = e.target;
      while(t && t !== document.body){
        if(t.dataset && t.dataset.track){
          safeSend('/api/track', {
            type: 'click',
            path: location.pathname,
            session: sid,
            target: t.dataset.track,
            href: t.getAttribute('href') || ''
          });
          break;
        }
        t = t.parentNode;
      }
    });

    // 3) Reading time / scroll depth (single ping at 50% and 90%)
    var sent50 = false, sent90 = false;
    function onScroll(){
      var h = document.documentElement;
      var b = document.body;
      var docH = Math.max(b.scrollHeight, h.scrollHeight) - window.innerHeight;
      if(docH <= 0) return;
      var pct = window.scrollY / docH;
      if(!sent50 && pct >= 0.5){sent50 = true; safeSend('/api/track', {type:'scroll', path:location.pathname, session:sid, depth:50})}
      if(!sent90 && pct >= 0.9){sent90 = true; safeSend('/api/track', {type:'scroll', path:location.pathname, session:sid, depth:90})}
    }
    window.addEventListener('scroll', rafThrottle(onScroll), {passive:true});
  }

  // ====================================================
  // 10) Boot
  // ====================================================
  function boot(){
    initScrollParallax();
    initMouseParallax();
    initReveals();
    initTextReveal();
    initHeadingAnim();
    initHeroSlides();
    initStickyNav();
    initTilt();
    initMobileMenu();
    initContactForm();
    initAnalytics();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
