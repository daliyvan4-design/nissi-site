(function(){
  'use strict';

  /* ===== Parallax (data-px) ===== */
  function initParallax(){
    var els = Array.prototype.slice.call(document.querySelectorAll('[data-px]'));
    if(!els.length) return;

    els.forEach(function(el){
      // Each element moves relative to its nearest section/header
      el._sec = el.closest('header') || el.closest('section') || document.body;
      // Make sure transforms don't get clipped at small viewports
      el.style.willChange = 'transform';
    });

    var ticking = false;
    function update(){
      var viewportH = window.innerHeight || document.documentElement.clientHeight;
      els.forEach(function(el){
        var sp = parseFloat(el.getAttribute('data-px'));
        if(!sp) return;
        var rect = el._sec.getBoundingClientRect();
        // distance from section top to viewport top
        var t = rect.top;
        // If element is way off-screen, skip transform to save GPU
        if(rect.bottom < -200 || rect.top > viewportH + 200) return;
        var y = -t * sp;
        el.style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0)';
      });
      ticking = false;
    }

    function onScroll(){
      if(!ticking){
        requestAnimationFrame(update);
        ticking = true;
      }
    }

    window.addEventListener('scroll', onScroll, {passive:true});
    window.addEventListener('resize', onScroll, {passive:true});
    update();
  }

  /* ===== Mobile menu ===== */
  function initMobileMenu(){
    var burger = document.querySelector('.nnav__burger');
    var panel = document.querySelector('.nnav__mobile');
    if(!burger || !panel) return;

    function open(){
      panel.classList.add('is-open');
      panel.setAttribute('aria-hidden','false');
      document.body.style.overflow = 'hidden';
    }
    function close(){
      panel.classList.remove('is-open');
      panel.setAttribute('aria-hidden','true');
      document.body.style.overflow = '';
    }

    burger.addEventListener('click', open);
    panel.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', close);
    });
    var closer = panel.querySelector('.close');
    if(closer) closer.addEventListener('click', close);

    // Esc closes
    document.addEventListener('keydown', function(e){
      if(e.key === 'Escape') close();
    });
  }

  /* ===== Contact form (validation + confirm) ===== */
  function initContactForm(){
    var form = document.querySelector('[data-contact-form]');
    if(!form) return;
    var confirm = document.querySelector('[data-contact-confirm]');

    form.addEventListener('submit', function(e){
      e.preventDefault();
      // clear previous errors
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
          el.style.borderColor = '#E4032C';
        } else {
          el.style.borderColor = '';
        }
      });

      var consent = form.querySelector('[name="consent"]');
      if(consent && !consent.checked){
        invalid.push('Consentement');
        consent.parentNode.style.color = '#E4032C';
      }

      if(invalid.length){
        if(confirm){
          confirm.textContent = 'Merci de completer : ' + invalid.join(', ');
          confirm.style.background = '#fdeef0';
          confirm.style.color = '#C41230';
        }
        return;
      }

      // Envoi au serveur (API /api/contact : email + base de donnees)
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
      }).catch(function(){
        if(confirm){
          confirm.textContent = 'Une erreur est survenue lors de l\'envoi. Merci de reessayer dans un instant.';
          confirm.style.background = '#fdeef0';
          confirm.style.color = '#C41230';
        }
      }).finally(function(){
        if(btn) btn.disabled = false;
      });
    });
  }

  /* ===== Boot ===== */
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', function(){
      initParallax();
      initMobileMenu();
      initContactForm();
    });
  } else {
    initParallax();
    initMobileMenu();
    initContactForm();
  }
})();