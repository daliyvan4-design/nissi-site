(function(){
  'use strict';

  var $ = function(s, el){ return (el || document).querySelector(s); };
  var $$ = function(s, el){ return Array.prototype.slice.call((el || document).querySelectorAll(s)); };

  // -------- Login --------
  var loginView = $('#loginView');
  var dashView = $('#dashView');
  var loginForm = $('#loginForm');
  var loginErr = $('#loginErr');

  function showLogin(){
    loginView.classList.remove('hidden');
    dashView.classList.add('hidden');
  }
  function showDash(user){
    loginView.classList.add('hidden');
    dashView.classList.remove('hidden');
    if (user) $('#helloUser').textContent = 'Connecte en tant que ' + user;
  }
  function setLoginError(msg){
    if (!msg){ loginErr.classList.remove('show'); loginErr.textContent = ''; return; }
    loginErr.textContent = msg;
    loginErr.classList.add('show');
  }

  loginForm.addEventListener('submit', function(e){
    e.preventDefault();
    setLoginError('');
    var u = $('#li-user').value.trim();
    var p = $('#li-pass').value;
    if (!u || !p) { setLoginError('Veuillez saisir vos identifiants.'); return; }
    var btn = loginForm.querySelector('button');
    btn.disabled = true; btn.textContent = 'Connexion...';
    fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ username: u, password: p })
    }).then(function(r){
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }).then(function(data){
      btn.disabled = false; btn.textContent = 'Se connecter';
      showDash(data.user || u);
      bootDash();
    }).catch(function(err){
      btn.disabled = false; btn.textContent = 'Se connecter';
      if (err && err.message === 'http 401') setLoginError('Identifiants invalides.');
      else if (err && err.message === 'http 403') setLoginError('Origine non autorisee.');
      else setLoginError('Erreur de connexion. Reessayez.');
    });
  });

  // -------- Tabs --------
  $$('.tab').forEach(function(t){
    t.addEventListener('click', function(){
      $$('.tab').forEach(function(x){ x.classList.remove('on'); });
      t.classList.add('on');
      var which = t.dataset.tab;
      $('#tab-analytics').classList.toggle('hidden', which !== 'analytics');
      $('#tab-messages').classList.toggle('hidden', which !== 'messages');
      if (which === 'messages') loadMessages();
    });
  });

  // -------- Logout --------
  $('#logoutBtn').addEventListener('click', function(){
    fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' })
      .then(function(){ showLogin(); $('#li-user').value=''; $('#li-pass').value=''; });
  });
  $('#refreshBtn').addEventListener('click', function(){
    var active = $$('.tab').find(function(t){ return t.classList.contains('on'); });
    if (active && active.dataset.tab === 'messages') loadMessages();
    else loadAnalytics();
  });

  // -------- Dashboard data --------
  function fmtNum(n){
    if (n == null) return '-';
    if (n >= 1000) return (n/1000).toFixed(n >= 10000 ? 0 : 1) + 'k';
    return String(n);
  }
  function fmtDate(iso){
    if (!iso) return '';
    try {
      var d = new Date(iso);
      var pad = function(x){ return x < 10 ? '0' + x : x; };
      return pad(d.getDate()) + '/' + pad(d.getMonth()+1) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    } catch(e){ return ''; }
  }
  function escapeHtml(s){
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function safeGet(url){
    return fetch(url, { credentials: 'same-origin', headers: { 'Accept': 'application/json' } })
      .then(function(r){
        if (r.status === 401) { showLogin(); throw new Error('unauth'); }
        if (!r.ok) throw new Error('http ' + r.status);
        return r.json();
      });
  }

  function loadAnalytics(){
    safeGet('/api/admin/analytics?days=7')
      .then(function(data){
        if (!data || !data.ok) return;
        var t = data.totals;
        $('#kpi-pv').textContent = fmtNum(t.pageviews);
        $('#kpi-uv').textContent = fmtNum(t.uniques);
        $('#kpi-ck').textContent = fmtNum(t.clicks);
        $('#kpi-cv').textContent = fmtNum(t.conversions);

        // Chart
        var series = data.series || [];
        var max = 1;
        series.forEach(function(s){ if (s.count > max) max = s.count; });
        var chart = $('#chart'); var chartX = $('#chart-x');
        chart.innerHTML = ''; chartX.innerHTML = '';
        series.forEach(function(s){
          var bar = document.createElement('div');
          bar.className = 'chart-bar';
          var h = Math.max(3, (s.count / max) * 160);
          bar.style.height = h + 'px';
          bar.setAttribute('data-tip', s.day + ' · ' + s.count + ' visite(s)');
          chart.appendChild(bar);
          var lab = document.createElement('span');
          var d = new Date(s.day);
          lab.textContent = ['D','L','M','M','J','V','S'][d.getDay()] || '';
          chartX.appendChild(lab);
        });

        // Top pages
        var tp = $('#top-pages');
        if (!data.top_pages || !data.top_pages.length) tp.innerHTML = '<div class="empty">Aucune visite sur la periode.</div>';
        else {
          var maxp = data.top_pages[0].count || 1;
          var html = '<table><thead><tr><th>Page</th><th style="text-align:right">Visites</th></tr></thead><tbody>';
          data.top_pages.forEach(function(p){
            var pct = Math.round((p.count / maxp) * 100);
            html += '<tr><td class="k">' + escapeHtml(p.key) + '</td><td class="num">' + p.count + '</td></tr>';
          });
          html += '</tbody></table>';
          tp.innerHTML = html;
        }

        // Top targets (CTA clicks)
        var tt = $('#top-targets');
        if (!data.top_targets || !data.top_targets.length) tt.innerHTML = '<div class="empty">Aucun clic enregistre sur la periode.</div>';
        else {
          var html = '<table><thead><tr><th>Action / CTA</th><th style="text-align:right">Clics</th></tr></thead><tbody>';
          data.top_targets.forEach(function(p){
            html += '<tr><td>' + escapeHtml(p.key) + '</td><td class="num">' + p.count + '</td></tr>';
          });
          html += '</tbody></table>';
          tt.innerHTML = html;
        }

        // Top referrers
        var tr = $('#top-refs');
        if (!data.top_refs || !data.top_refs.length) tr.innerHTML = '<div class="empty">Pas de referrer (ou acces directs uniquement).</div>';
        else {
          var html = '<table><thead><tr><th>Source</th><th style="text-align:right">Visites</th></tr></thead><tbody>';
          data.top_refs.forEach(function(p){
            var label = p.key === '' ? '(acces direct)' : p.key;
            html += '<tr><td class="k" style="word-break:break-all;max-width:240px">' + escapeHtml(label) + '</td><td class="num">' + p.count + '</td></tr>';
          });
          html += '</tbody></table>';
          tr.innerHTML = html;
        }

        // Recent activity
        var rv = $('#recent');
        if (!data.recent || !data.recent.length) rv.innerHTML = '<div class="empty">Pas d\'activite.</div>';
        else {
          var html = '';
          data.recent.forEach(function(e){
            var label = e.type === 'pageview' ? 'Visite' : (e.type === 'click' ? 'Clic' : 'Conversion');
            var path = e.path || '';
            if (e.type === 'click' && e.target) path += '  ·  ' + e.target;
            html += '<div class="ev">'
                  +   '<div class="ev-d">' + escapeHtml(fmtDate(e.ts)) + '</div>'
                  +   '<div class="ev-t">' + label + '</div>'
                  +   '<div class="ev-p">' + escapeHtml(path) + '</div>'
                  + '</div>';
          });
          rv.innerHTML = html;
        }
      })
      .catch(function(err){
        if (err.message === 'unauth') return;
        $('#chart').innerHTML = '<div class="empty">Impossible de charger les statistiques.</div>';
      });
  }

  function loadMessages(){
    var box = $('#messages');
    var sub = $('#msg-sub');
    box.innerHTML = '<div class="loader"><div class="spin"></div>Chargement des messages…</div>';
    sub.textContent = 'Chargement…';
    safeGet('/api/admin/messages')
      .then(function(data){
        if (!data || !data.ok) return;
        sub.textContent = data.total + ' demande' + (data.total > 1 ? 's' : '') + ' enregistree' + (data.total > 1 ? 's' : '') + '.';
        if (!data.messages.length) { box.innerHTML = '<div class="empty">Aucune demande pour le moment.</div>'; return; }
        var html = '';
        data.messages.forEach(function(m){
          html += '<div class="msg">'
                +   '<div class="msg-h">'
                +     '<div class="msg-name">' + escapeHtml(m.prenom || '') + ' ' + escapeHtml(m.nom || '') + '</div>'
                +     '<span class="badge">' + escapeHtml(m.sujet || '-') + '</span>'
                +   '</div>'
                +   '<div class="msg-meta">'
                +     '<span>✉ ' + escapeHtml(m.email || '') + '</span>'
                +     (m.Téléphone ? '<span>☎ ' + escapeHtml(m.Téléphone) + '</span>' : '')
                +     '<span>· ' + escapeHtml(fmtDate(m.created_at)) + '</span>'
                +   '</div>'
                +   '<div class="msg-body">' + escapeHtml(m.message || '') + '</div>'
                + '</div>';
        });
        box.innerHTML = html;
      })
      .catch(function(err){
        if (err.message === 'unauth') return;
        sub.textContent = 'Erreur de chargement.';
        box.innerHTML = '<div class="empty">Impossible de charger les messages.</div>';
      });
  }

  function bootDash(){
    loadAnalytics();
  }

  // -------- Auto-detect : si le back-end renvoie 401 sur /api/admin/messages, on bascule en login --------
  // On tente un ping a l'ouverture
  fetch('/api/admin/messages', { credentials: 'same-origin' })
    .then(function(r){
      if (r.status === 200) { showDash(); bootDash(); }
      else { showLogin(); }
    })
    .catch(function(){ showLogin(); });

})();
