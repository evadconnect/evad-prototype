/* ═══════════════ FIL ROUGE : contexte « lieu actif » partagé entre apps ═══════════════
   Fait circuler le lieu d'un écran à l'autre : Tableau de bord → Réseau → Carte.        */
const EVAD = {
  activeLieu: { nom:'La Ferme des Possibles', ville:'Nantes', lat:47.2184, lng:-1.5536, icon:'🌾', type:'ferme' }
};

/* Localisation des lieux & acteurs de démo (résolus par nom, puis par ville) */
const EVAD_LIEU_LOC = {
  'La Ferme des Possibles' : {ville:'Nantes',            lat:47.2184, lng:-1.5536, icon:'🌾', type:'ferme'},
  'Tiers-lieu La Centrale' : {ville:'Angers',            lat:47.4712, lng:-0.5518, icon:'🏛', type:'tiers'},
  'Léa M.'                 : {ville:'Rezé',              lat:47.1963, lng:-1.5490, icon:'🌿', type:'tiers'},
  'Fondation Terre Vivante': {ville:'Nouvelle-Aquitaine',lat:45.7000, lng:0.3000,  icon:'🌱', type:'tiers'},
  'Hugo & le collectif'    : {ville:'Saint-Herblain',   lat:47.2146, lng:-1.6490, icon:'🌿', type:'tiers'},
};
const EVAD_VILLE_LOC = {
  'Nantes':{lat:47.2184,lng:-1.5536}, 'Rezé':{lat:47.1963,lng:-1.5490},
  'Angers':{lat:47.4712,lng:-0.5518}, 'Saint-Herblain':{lat:47.2146,lng:-1.6490},
  'Nouvelle-Aquitaine':{lat:45.7000,lng:0.3000},
};

/* Lieu actif courant : le lieu créé (cData) s'il existe, sinon le lieu de démo */
function evadCurrentLieu(){
  if (typeof cData !== 'undefined' && cData && cData.nom){
    const t = (typeof TYPES_LIEU !== 'undefined') ? TYPES_LIEU.find(x=>x.id===cData.type) : null;
    return {
      nom:   cData.nom,
      ville: cData.ville || EVAD.activeLieu.ville,
      lat:   (cData.lat != null) ? cData.lat : EVAD.activeLieu.lat,
      lng:   (cData.lng != null) ? cData.lng : EVAD.activeLieu.lng,
      icon:  cData.icon || (t && t.ic) || '📍',
      type:  cData.type || 'tiers',
    };
  }
  return EVAD.activeLieu;
}

/* ── Tableau de bord → Réseau : publier une quête depuis son lieu ── */
function evadPublishLieuToReseau(){
  const l = evadCurrentLieu();
  EVAD.activeLieu = l;
  EVAD_LIEU_LOC[l.nom] = {ville:l.ville, lat:l.lat, lng:l.lng, icon:l.icon, type:l.type};
  const post = {
    profile:'pilote', author:l.nom, lieu:l.ville, time:'à l\'instant',
    type:'quete', regen:'entreprendre',
    text:"On ouvre une nouvelle quête sur notre lieu 🌿 On mobilise des Bâtisseurs pour passer à l'action, rejoignez-nous !",
    quest:{titre:'Installer une cuve de récupération d\'eau', meta:'1 journée · 4 pers. · +8 pts eau'},
    cta:'Rejoindre la quête'
  };
  if (typeof RESEAU_POSTS !== 'undefined') RESEAU_POSTS.unshift(post);
  showScreen('reseau');
  setTimeout(()=>{
    if (typeof reseauTab === 'function'){ try { reseauTab('fil', document.getElementById('rtab-fil')); } catch(e){} }
    if (typeof reseauSetFilter === 'function') reseauSetFilter('tout', document.querySelector('.reseau-filter[data-f="tout"]'));
  }, 120);
  if (typeof mmBubble === 'function') mmBubble('📣 Quête publiée au Réseau depuis ton tableau de bord !');
}

/* ── Réseau → Carte : localiser le lieu d'un post ── */
let evadFocusMarker = null;
function evadGoLieu(nom, ville){
  const loc = EVAD_LIEU_LOC[nom] || (ville && EVAD_LIEU_LOC[ville]) || (ville && EVAD_VILLE_LOC[ville]) || EVAD_VILLE_LOC[nom] || null;
  EVAD.activeLieu = Object.assign({}, EVAD.activeLieu, {nom: nom || EVAD.activeLieu.nom}, loc || {});
  showScreen('carte');
  setTimeout(()=>{
    if (!evadMap) return;
    try { evadMap.invalidateSize(); } catch(e){}
    if (loc && loc.lat != null){
      if (evadFocusMarker){ try { evadMap.removeLayer(evadFocusMarker); } catch(e){} }
      const ic = (typeof createEmojiIcon === 'function')
        ? createEmojiIcon(loc.icon||'📍', (typeof markerBgByType==='function' ? markerBgByType(loc.type||'tiers') : '#018262'))
        : null;
      evadFocusMarker = L.marker([loc.lat, loc.lng], ic ? {icon:ic} : {}).addTo(evadMap);
      evadFocusMarker.bindPopup('<div class="popup-place-title">'+(nom||'Lieu')+'</div><div class="popup-place-meta">📍 '+(loc.ville||ville||'')+'</div>', {className:'custom-popup'}).openPopup();
      evadMap.flyTo([loc.lat, loc.lng], 13, {duration:.8});
    }
  }, 220);
  if (typeof mmBubble === 'function') mmBubble('🗺 '+(nom||'Lieu')+' localisé sur la carte');
}

/* ═══════════════ VISITE GUIDÉE (coach marks · 1ère visite) ═══════════════
   Aide pensée pour les personnes peu à l'aise avec le numérique :
   à la 1ère arrivée sur un tableau de bord, on met en surbrillance les
   3-4 repères clés, un par un, avec « Suivant » / « Passer ».            */
const EVAD_TOUR = [
  { sel:'.nav-menu',        title:"1. Tes outils",
    text:"Tout est ici, dans le menu. Voici à quoi sert chaque onglet :",
    html:"Tout est ici, dans le menu. Voici à quoi sert chaque onglet :"
       + '<ul style="list-style:none;margin:.55rem 0 0;padding:0;display:flex;flex-direction:column;gap:.4rem">'
       +   '<li><b>📊 Tableau de bord</b> — ta page d\'accueil : ce que tu as à faire aujourd\'hui.</li>'
       +   '<li><b>🗺 Carte</b> — qui agit près de chez toi, à découvrir.</li>'
       +   '<li><b>🌍 Réseau</b> — les lieux et les gens à rencontrer.</li>'
       +   '<li><b>📚 Bibliothèque</b> — des ressources et exemples pour t\'inspirer.</li>'
       +   '<li><b>🧊 Modélisation</b> — pour visualiser et imaginer ton projet.</li>'
       +   '<li><b>🛖 Marketplace</b> — du matériel et des services pour avancer.</li>'
       + '</ul>'
       + '<span style="display:block;margin-top:.55rem">Clique sur un outil pour l\'ouvrir, tu peux y revenir quand tu veux.</span>' },
  { sel:'#profile-summary', title:"2. Ton espace",          text:"Ton espace s'adapte à ton profil. Tu vois toujours où tu es et ce que tu peux y faire." },
  { sel:'#deva-pill-btn',   title:"3. Deva t'accompagne",   text:"Une question, un doute ? Clique sur Deva. Il te guide pas à pas, à ton rythme, sans jargon." },
  { sel:'#evad-feedback-btn', title:"4. Propose une amélioration", text:"Un mot pas clair, une idée pour faire mieux ? Clique ici et dis-le avec tes mots. Tes retours rendent EVAD plus simple pour tout le monde 💡" },
  { sel:'#evad-tour-help',  title:"5. Rejoue quand tu veux",text:"Perdu ? Reclique ici à tout moment pour revoir cette visite. Tu ne peux rien casser, lance-toi 🌱" },
];
let _evadTourIdx = 0;

// Auto-déclenchement à la 1ère arrivée dans l'app AVEC les outils visibles.
// On valide l'état au moment du déclenchement (pas à l'appel) : pendant la
// séquence d'entrée l'app traverse des écrans transitoires, on attend donc que
// l'UI se stabilise (~700ms après la DERNIÈRE navigation) avant de décider.
let _evadTourTimer = null;
function evadMaybeTour(){
  if (localStorage.getItem('evad_tour_seen')) return;
  const tourEl = document.getElementById('evad-tour');
  if (tourEl && tourEl.style.display === 'block') return; // déjà ouverte
  if (_evadTourTimer) clearTimeout(_evadTourTimer);
  _evadTourTimer = setTimeout(() => {
    _evadTourTimer = null;
    if (localStorage.getItem('evad_tour_seen')) return;
    // a) jamais pendant le splash
    const splash = document.getElementById('evad-splash');
    if (splash && !splash.classList.contains('hidden')) return;
    // b) jamais pendant l'assistant de création (sidebar masquée)
    const nav = document.querySelector('.nav');
    if (nav && nav.classList.contains('wizard-mode')) return;
    // c) seulement si le menu est réellement affiché (les « outils » sont là)
    const menu = document.querySelector('.nav-menu');
    if (!menu || !menu.offsetWidth || !menu.offsetHeight) return;
    evadStartTour();
  }, 700);
}

function evadStartTour(force){
  if (!force && localStorage.getItem('evad_tour_seen')) return;
  _evadTourIdx = 0;
  evadTourEnsureDom();
  document.getElementById('evad-tour').style.display = 'block';
  evadTourShow();
}

function evadTourEnsureDom(){
  if (document.getElementById('evad-tour')) return;
  const wrap = document.createElement('div');
  wrap.id = 'evad-tour';
  wrap.style.cssText = 'display:none;position:fixed;inset:0;z-index:99999;font-family:\'Satoshi\',sans-serif';
  wrap.innerHTML =
    '<div id="evad-tour-spot" style="position:absolute;border-radius:14px;box-shadow:0 0 0 9999px rgba(13,43,34,.66);transition:all .32s cubic-bezier(.4,0,.2,1);pointer-events:none"></div>'
  + '<div id="evad-tour-callout" style="position:absolute;max-width:300px;width:300px;background:#fff;border-radius:16px;padding:1.1rem 1.2rem;box-shadow:0 16px 44px rgba(0,0,0,.34);transition:left .28s ease,top .28s ease">'
  +   '<div id="evad-tour-title" style="font-size:.95rem;font-weight:800;color:var(--ink);margin-bottom:.4rem"></div>'
  +   '<div id="evad-tour-text" style="font-size:.8rem;line-height:1.55;color:var(--moss);margin-bottom:.95rem"></div>'
  +   '<div style="display:flex;align-items:center;justify-content:space-between;gap:.6rem">'
  +     '<span id="evad-tour-count" style="font-size:.66rem;color:var(--moss);opacity:.6;font-weight:700"></span>'
  +     '<div style="display:flex;gap:.5rem">'
  +       '<button onclick="evadTourEnd()" style="background:none;border:none;color:var(--moss);font-size:.74rem;font-weight:600;cursor:pointer;opacity:.7">Passer</button>'
  +       '<button id="evad-tour-next" onclick="evadTourNext()" style="background:var(--forest);color:#fff;border:none;border-radius:100px;padding:.45rem 1.1rem;font-size:.74rem;font-weight:700;cursor:pointer">Suivant →</button>'
  +     '</div>'
  +   '</div>'
  + '</div>';
  document.body.appendChild(wrap);
}

function evadTourShow(){
  const step = EVAD_TOUR[_evadTourIdx];
  const el = document.querySelector(step.sel);
  const spot = document.getElementById('evad-tour-spot');
  const callout = document.getElementById('evad-tour-callout');
  const PAD = 8, CW = 300;
  if (el){
    const r = el.getBoundingClientRect();
    spot.style.opacity = '1';
    spot.style.left   = (r.left - PAD) + 'px';
    spot.style.top    = (r.top - PAD) + 'px';
    spot.style.width  = (r.width + PAD*2) + 'px';
    spot.style.height = (r.height + PAD*2) + 'px';
    const ch = callout.offsetHeight || 170;
    let cx = r.right + 18;
    if (cx + CW > window.innerWidth - 12) cx = r.left - CW - 18;   // basculer à gauche
    if (cx < 12) cx = 12;
    let cy = r.top;
    if (cy + ch > window.innerHeight - 12) cy = Math.max(12, window.innerHeight - ch - 12);
    callout.style.transform = 'none';
    callout.style.left = cx + 'px';
    callout.style.top  = cy + 'px';
  } else {
    spot.style.opacity = '0';
    spot.style.width = '0px'; spot.style.height = '0px';
    callout.style.left = '50%'; callout.style.top = '50%';
    callout.style.transform = 'translate(-50%,-50%)';
  }
  document.getElementById('evad-tour-title').textContent = step.title;
  const textEl = document.getElementById('evad-tour-text');
  if (step.html) { textEl.innerHTML = step.html; } else { textEl.textContent = step.text; }
  document.getElementById('evad-tour-count').textContent = (_evadTourIdx+1) + ' / ' + EVAD_TOUR.length;
  document.getElementById('evad-tour-next').textContent  = (_evadTourIdx === EVAD_TOUR.length-1) ? 'Terminer ✓' : 'Suivant →';
}

function evadTourNext(){
  if (_evadTourIdx < EVAD_TOUR.length - 1){ _evadTourIdx++; evadTourShow(); }
  else evadTourEnd();
}

function evadTourEnd(){
  localStorage.setItem('evad_tour_seen','1');
  const t = document.getElementById('evad-tour');
  if (t) t.style.display = 'none';
}

/* ─────────────────────────────────────────────────────────────
   PROPOSER UNE AMÉLIORATION
   Boîte simple, sans jargon, pour recueillir une idée / un blocage.
   Prototype : pas de backend, on garde l'envoi en local + un merci.   */
function evadFeedbackEnsureDom(){
  if (document.getElementById('evad-feedback')) return;
  const wrap = document.createElement('div');
  wrap.id = 'evad-feedback';
  wrap.style.cssText = 'display:none;position:fixed;inset:0;z-index:100000;font-family:\'Satoshi\',sans-serif';
  wrap.innerHTML =
    '<div style="position:absolute;inset:0;background:rgba(13,43,34,.6);backdrop-filter:blur(4px)" onclick="closeAmelioration()"></div>'
  + '<div role="dialog" aria-label="Proposer une amélioration" style="position:relative;max-width:460px;width:calc(100% - 2rem);margin:6vh auto 0;background:#fff;border-radius:20px;box-shadow:0 24px 60px rgba(0,0,0,.32);overflow:hidden">'
  +   '<div style="padding:1.3rem 1.4rem 0">'
  +     '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:1rem">'
  +       '<div>'
  +         '<div style="font-size:1.1rem;font-weight:800;color:var(--ink)">💡 Proposer une amélioration</div>'
  +         '<div style="font-size:.82rem;line-height:1.5;color:var(--moss);margin-top:.4rem">Une idée, un truc qui te bloque, un mot pas clair ? Dis-le avec tes mots, ça nous aide à améliorer EVAD.</div>'
  +       '</div>'
  +       '<button onclick="closeAmelioration()" aria-label="Fermer" style="flex-shrink:0;background:none;border:none;font-size:1.2rem;line-height:1;color:var(--moss);opacity:.5;cursor:pointer">✕</button>'
  +     '</div>'
  +   '</div>'
  +   '<div id="evad-feedback-form" style="padding:1.1rem 1.4rem 1.4rem">'
  +     '<label style="display:block;font-size:.72rem;font-weight:700;color:var(--moss);margin-bottom:.35rem">Ça concerne…</label>'
  +     '<select id="evad-feedback-cat" style="width:100%;padding:.6rem .7rem;border-radius:10px;border:1px solid rgba(46,102,66,.2);font-family:\'Satoshi\',sans-serif;font-size:.82rem;color:var(--ink);background:#fff;margin-bottom:.9rem">'
  +       '<option>L\'ensemble d\'EVAD</option>'
  +       '<option>📊 Tableau de bord</option>'
  +       '<option>🗂 Gestion de projet</option>'
  +       '<option>🗺 Carte</option>'
  +       '<option>🌍 Réseau</option>'
  +       '<option>📚 Bibliothèque</option>'
  +       '<option>🧊 Modélisation</option>'
  +       '<option>🛖 Marketplace</option>'
  +       '<option>⚡ Les quêtes</option>'
  +       '<option>👤 Mon espace / mon profil</option>'
  +       '<option>💬 Deva (l\'assistant)</option>'
  +       '<option>Autre chose</option>'
  +     '</select>'
  +     '<label style="display:block;font-size:.72rem;font-weight:700;color:var(--moss);margin-bottom:.35rem">Ton idée</label>'
  +     '<textarea id="evad-feedback-text" rows="4" placeholder="Écris ton idée ici, simplement…" style="width:100%;padding:.7rem .8rem;border-radius:12px;border:1px solid rgba(46,102,66,.2);font-family:\'Satoshi\',sans-serif;font-size:.85rem;line-height:1.5;color:var(--ink);resize:vertical"></textarea>'
  +     '<div id="evad-feedback-hint" style="font-size:.7rem;color:var(--terracotta);margin-top:.4rem;height:1rem"></div>'
  +     '<div style="display:flex;align-items:center;justify-content:flex-end;gap:.6rem;margin-top:.5rem">'
  +       '<button onclick="closeAmelioration()" style="background:none;border:none;color:var(--moss);font-size:.8rem;font-weight:600;cursor:pointer;padding:.5rem .6rem">Annuler</button>'
  +       '<button onclick="submitAmelioration()" style="background:var(--forest);color:#fff;border:none;border-radius:100px;padding:.55rem 1.3rem;font-size:.8rem;font-weight:700;cursor:pointer">Envoyer</button>'
  +     '</div>'
  +   '</div>'
  +   '<div id="evad-feedback-thanks" style="display:none;padding:2rem 1.4rem 2.2rem;text-align:center">'
  +     '<div style="font-size:2.2rem">🌱</div>'
  +     '<div style="font-size:1rem;font-weight:800;color:var(--ink);margin-top:.5rem">Merci pour ton idée !</div>'
  +     '<div style="font-size:.82rem;line-height:1.5;color:var(--moss);margin-top:.4rem;max-width:320px;margin-left:auto;margin-right:auto">On la lit avec attention. Chaque retour aide à rendre EVAD plus simple pour tout le monde.</div>'
  +     '<button onclick="closeAmelioration()" style="margin-top:1.1rem;background:var(--forest);color:#fff;border:none;border-radius:100px;padding:.55rem 1.4rem;font-size:.8rem;font-weight:700;cursor:pointer">Fermer</button>'
  +   '</div>'
  + '</div>';
  document.body.appendChild(wrap);
}

function openAmelioration(){
  evadFeedbackEnsureDom();
  document.getElementById('evad-feedback-form').style.display = 'block';
  document.getElementById('evad-feedback-thanks').style.display = 'none';
  document.getElementById('evad-feedback-text').value = '';
  document.getElementById('evad-feedback-hint').textContent = '';
  document.getElementById('evad-feedback').style.display = 'block';
  setTimeout(() => { const t = document.getElementById('evad-feedback-text'); if (t) t.focus(); }, 60);
}

function closeAmelioration(){
  const w = document.getElementById('evad-feedback');
  if (w) w.style.display = 'none';
}

function submitAmelioration(){
  const txt = (document.getElementById('evad-feedback-text').value || '').trim();
  if (!txt){
    document.getElementById('evad-feedback-hint').textContent = 'Écris quelques mots avant d\'envoyer 🙂';
    document.getElementById('evad-feedback-text').focus();
    return;
  }
  // Prototype : on conserve localement (pas de backend)
  try {
    const cat = document.getElementById('evad-feedback-cat').value;
    const all = JSON.parse(localStorage.getItem('evad_feedback') || '[]');
    all.push({ cat, txt, role: (typeof currentRole !== 'undefined' ? currentRole : null) });
    localStorage.setItem('evad_feedback', JSON.stringify(all));
  } catch(e){}
  document.getElementById('evad-feedback-form').style.display = 'none';
  document.getElementById('evad-feedback-thanks').style.display = 'block';
}
