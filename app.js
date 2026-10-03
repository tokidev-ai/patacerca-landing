(function () {
  'use strict';

  // ---------- Configuración (cambiar antes de publicar) ----------
  // Si se define, cada registro también se envía por POST (JSON) a esta URL,
  // p. ej. un Google Apps Script, Formspree o tu propio backend.
  var LEADS_ENDPOINT = '';
  var COMMUNITY_URL = 'https://chat.whatsapp.com/';

  // ---------- Datos ----------
  var ZONAS = ['Centro','Recoleta','Queru Queru','Cala Cala','Sarco','Tupuraya','Hipódromo','Temporal','Muyurina','Las Cuadras','Sacaba','Quillacollo','Tiquipaya','Otra zona'];
  var CIUDADES = ['Cochabamba','Sucre','Oruro','Potosí','Tarija','Trinidad','Cobija'];
  var BLOQUEADAS = ['La Paz','Santa Cruz'];
  var FORMS = {
    dueno: [
      [
        { k:'nombre', label:'Tu nombre', type:'text', ph:'Ej. Daniela', req:true },
        { k:'whatsapp', label:'WhatsApp', type:'tel', req:true },
        { k:'ciudad', label:'Ciudad', type:'ciudad', req:true },
        { k:'zona', label:'Barrio o zona', type:'zona', req:true },
        { k:'tamano', label:'Tamaño de tu perro', type:'multi', options:['Pequeño','Mediano','Grande'], req:true },
        { k:'cantidad', label:'¿Cuántos perros?', type:'chips', options:['1','2','3 o más'], req:true },
        { k:'frecuencia', label:'¿Cada cuánto quisieras paseos?', type:'chips', options:['1–2 por semana','3–4 por semana','Todos los días','Solo a veces'], req:true }
      ],
      [
        { k:'hoy', label:'Hoy, ¿quién lo pasea?', type:'chips', options:['Yo','Un vecino o familiar','Un paseador informal','Nadie'], req:true },
        { k:'pagaria', label:'¿Cuánto pagarías por un paseo de 30–60 min?', type:'chips', options:['Menos de 15 Bs','15–25 Bs','25–40 Bs','40–50 Bs','Más de 50 Bs'], req:true },
        { k:'viajes', label:'Cuando viajas, ¿qué haces con tu perro?', type:'chips', options:['Lo dejo con familia','Lo llevo conmigo','Guardería','Me cuesta resolverlo','Casi no viajo'], req:true },
        { k:'preocupacion', label:'¿Qué te preocupa más al dejarlo con alguien?', type:'area', ph:'Cuéntanos con tus palabras', req:false }
      ]
    ],
    paseador: [
      [
        { k:'nombre', label:'Tu nombre', type:'text', ph:'Ej. Marco', req:true },
        { k:'whatsapp', label:'WhatsApp', type:'tel', req:true },
        { k:'ciudad', label:'Ciudad', type:'ciudad', req:true },
        { k:'zona', label:'Zona donde vives', type:'zona', req:true },
        { k:'experiencia', label:'Experiencia con perros', type:'chips', options:['Tengo o tuve perros','He paseado perros','Lo hago profesionalmente','Aún ninguna'], req:true }
      ],
      [
        { k:'dias', label:'¿Qué días puedes?', type:'multi', options:['Lunes a viernes','Sábados','Domingos'], req:true },
        { k:'horarios', label:'¿En qué horarios?', type:'multi', options:['Mañana','Mediodía','Tarde','Noche'], req:true },
        { k:'cuidado', label:'¿Podrías cuidar mascotas durante viajes?', type:'chips', options:['En mi casa','En casa del dueño','Ambas','No'], req:true },
        { k:'verificacion', label:'¿Aceptarías un proceso de verificación?', type:'chips', options:['Sí','Tengo dudas','No'], req:true },
        { k:'pago_verif', label:'¿Pagarías por ser verificado?', type:'chips', options:['No pagaría','Hasta 30 Bs','30–60 Bs','Más de 60 Bs'], req:true }
      ]
    ]
  };
  var FAQS = [
    ['¿Cuándo empiezan?','Estamos lanzando en Cochabamba. Aún no hay fecha exacta: quienes se registren primero serán los primeros en recibir paseadores, y te avisaremos por WhatsApp.'],
    ['¿En qué zonas estarán?','Empezaremos por los barrios con más registros. Si tu zona no aparece en la lista, regístrate igual: así sabemos dónde hace falta.'],
    ['¿Cuánto cuesta un paseo?','Estimamos entre 15 y 50 Bs por paseo, según la duración y la cantidad de perros. Te confirmaremos el precio antes del primer paseo.'],
    ['¿Qué pasa si el paseador no llega o algo sale mal?','Te avisamos y buscamos un reemplazo verificado de tu zona. Y si algo sale mal, tienes a quién reclamar: a nosotros.'],
    ['¿Cómo se paga?','Al inicio, en efectivo o QR directamente al paseador, después de cada paseo. Sin pagos por adelantado.']
  ];

  // ---------- Utilidades ----------
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
    });
  }
  function $(sel, root) { return (root || document).querySelector(sel); }

  // ---------- Medición ----------
  var utm = {};
  (function () {
    var p = new URLSearchParams(location.search);
    ['utm_source','utm_medium','utm_campaign','utm_content'].forEach(function (k) { if (p.get(k)) utm[k] = p.get(k); });
  })();

  function track(ev, props) {
    props = props || {};
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(Object.assign({ event: ev }, props));
    if (window.plausible) window.plausible(ev, { props: props });
    if (window.gtag) window.gtag('event', ev, props);
    if (window.fbq && ev === 'form_submit') window.fbq('track', 'Lead', props);
  }

  // ---------- FAQ ----------
  var faqOpen = 0;
  var faqList = $('#faq-list');
  function renderFaq() {
    faqList.innerHTML = FAQS.map(function (qa, i) {
      var open = faqOpen === i;
      return '<div class="faq__item">' +
        '<button type="button" class="faq__q" data-faq="' + i + '" aria-expanded="' + open + '" aria-controls="faq-a-' + i + '">' +
        esc(qa[0]) + '<span class="faq__sign" aria-hidden="true">' + (open ? '–' : '+') + '</span></button>' +
        (open ? '<p class="faq__a" id="faq-a-' + i + '">' + esc(qa[1]) + '</p>' : '') +
        '</div>';
    }).join('');
  }
  faqList.addEventListener('click', function (e) {
    var b = e.target.closest('[data-faq]');
    if (!b) return;
    var i = +b.getAttribute('data-faq');
    faqOpen = faqOpen === i ? -1 : i;
    renderFaq();
  });
  renderFaq();

  // ---------- Modal / formularios ----------
  var overlay = $('#overlay');
  var sheet = $('#sheet');
  var lastFocus = null;
  var S = { modal: null, step: 0, done: false, data: {}, errors: {}, started: false, consent: false, consentError: false, returnTo: null };

  function isForm() { return S.modal === 'dueno' || S.modal === 'paseador'; }

  function lock(on) {
    document.body.classList.toggle('is-locked', on);
    overlay.hidden = !on;
  }

  function open(type, from, extra) {
    track('cta_click', { cta: type, location: from });
    lastFocus = document.activeElement;
    S = { modal: type, step: 0, done: false, data: extra || {}, errors: {}, started: false, consent: false, consentError: false, returnTo: null };
    lock(true);
    render();
    sheet.scrollTop = 0;
    var first = sheet.querySelector('input,select,textarea');
    (first || $('.sheet__close', sheet)).focus({ preventScroll: true });
  }

  function openPrivacy() {
    // Si se abre desde un formulario, al cerrar se vuelve al formulario sin perder lo escrito.
    var returnTo = isForm() && !S.done ? Object.assign({}, S) : null;
    if (!S.modal) lastFocus = document.activeElement;
    S = { modal: 'privacidad', step: 0, done: false, data: {}, errors: {}, started: false, consent: false, consentError: false, returnTo: returnTo };
    lock(true);
    render();
    sheet.scrollTop = 0;
    $('.sheet__close', sheet).focus({ preventScroll: true });
  }

  function close() {
    if (S.modal === 'privacidad' && S.returnTo) {
      S = S.returnTo;
      render();
      return;
    }
    S.modal = null;
    lock(false);
    sheet.innerHTML = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  function fieldDef(k) {
    return FORMS[S.modal][S.step].filter(function (f) { return f.k === k; })[0];
  }

  function zonaIsSelect() { return (S.data.ciudad || 'Cochabamba') === 'Cochabamba'; }

  function setField(k, v) {
    if (k === 'whatsapp') v = String(v).replace(/\D/g, '').replace(/^591/, '').slice(0, 8);
    if (!S.started) { S.started = true; track('form_start', { form: S.modal }); }
    var cityChanged = k === 'ciudad' && v !== S.data.ciudad;
    S.data[k] = v;
    if (cityChanged) S.data.zona = '';
    S.errors[k] = null;
    return cityChanged;
  }

  function validate() {
    var errors = {};
    FORMS[S.modal][S.step].forEach(function (f) {
      var v = S.data[f.k];
      if (f.req && (!v || (Array.isArray(v) && !v.length) || (typeof v === 'string' && !v.trim()))) {
        errors[f.k] = f.type === 'chips' || f.type === 'multi' ? 'Elige una opción' : 'Completa este campo';
      }
      if (f.k === 'whatsapp' && v && !/^[67]\d{7}$/.test(v)) errors[f.k] = 'Ingresa un número de Bolivia: 8 dígitos, empieza con 6 o 7';
      if (f.k === 'ciudad' && BLOQUEADAS.indexOf(v) !== -1) errors[f.k] = 'Aún no llegamos a ' + v;
    });
    S.errors = errors;
    return !Object.keys(errors).length;
  }

  function saveLead(lead) {
    try {
      var all = JSON.parse(localStorage.getItem('patacerca_leads') || '[]');
      all.push(lead);
      localStorage.setItem('patacerca_leads', JSON.stringify(all));
    } catch (e) {}
    if (LEADS_ENDPOINT) {
      try {
        fetch(LEADS_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead), keepalive: true })
          .catch(function () {});
      } catch (e) {}
    }
  }

  function next() {
    var steps = FORMS[S.modal];
    if (!validate()) {
      render();
      var err = sheet.querySelector('.field__error');
      if (err) err.closest('.field').scrollIntoView({ block: 'center', behavior: 'smooth' });
      return;
    }
    if (S.step < steps.length - 1) {
      track('form_step', { form: S.modal, step: S.step + 2 });
      S.step++;
      render();
      sheet.scrollTop = 0;
      return;
    }
    if (!S.consent) { S.consentError = true; render(); return; }
    var lead = Object.assign({ tipo: S.modal }, S.data, { whatsapp: '+591' + S.data.whatsapp }, utm, { fecha: new Date().toISOString() });
    saveLead(lead);
    track('form_submit', { form: S.modal, zona: lead.zona });
    S.done = true;
    render();
    sheet.scrollTop = 0;
  }

  // ----- Render de campos -----
  function fieldControlHtml(f) {
    var v = S.data[f.k];
    var id = 'f-' + f.k;
    if (f.type === 'tel') {
      return '<div class="tel' + (S.errors[f.k] ? ' has-error' : '') + '">' +
        '<span class="tel__code">BO +591</span>' +
        '<input id="' + id + '" class="tel__input" type="tel" data-k="' + f.k + '" value="' + esc(v || '') + '" placeholder="7XX XX XXX" inputmode="numeric" autocomplete="tel-national">' +
        '</div>';
    }
    if (f.type === 'ciudad' || (f.type === 'zona' && zonaIsSelect())) {
      var opts;
      if (f.type === 'ciudad') {
        opts = [{ value: '', label: 'Elige tu ciudad' }]
          .concat(CIUDADES.map(function (o) { return { value: o, label: o }; }))
          .concat(BLOQUEADAS.map(function (o) { return { value: o, label: o + ' — próximamente', disabled: true }; }));
      } else {
        opts = [{ value: '', label: 'Elige tu zona' }].concat(ZONAS.map(function (o) { return { value: o, label: o }; }));
      }
      return '<select id="' + id + '" class="input" data-k="' + f.k + '">' + opts.map(function (o) {
        return '<option value="' + esc(o.value) + '"' + (o.disabled ? ' disabled' : '') + ((v || '') === o.value ? ' selected' : '') + '>' + esc(o.label) + '</option>';
      }).join('') + '</select>';
    }
    if (f.type === 'text' || f.type === 'zona') {
      var ph = f.ph || (f.type === 'zona' ? 'Ej. Zona central' : '');
      var ac = f.k === 'nombre' ? ' autocomplete="given-name"' : '';
      return '<input id="' + id + '" class="input" type="text" data-k="' + f.k + '" value="' + esc(v || '') + '" placeholder="' + esc(ph) + '"' + ac + '>';
    }
    if (f.type === 'chips' || f.type === 'multi') {
      return '<div class="chips" role="group" aria-labelledby="l-' + f.k + '">' + f.options.map(function (o) {
        var sel = f.type === 'multi' ? (v || []).indexOf(o) !== -1 : v === o;
        return '<button type="button" class="chip" data-chip="' + f.k + '" data-val="' + esc(o) + '" aria-pressed="' + sel + '">' + esc(o) + '</button>';
      }).join('') + '</div>';
    }
    if (f.type === 'area') {
      return '<textarea id="' + id + '" class="input" data-k="' + f.k + '" rows="3" placeholder="' + esc(f.ph || '') + '">' + esc(v || '') + '</textarea>';
    }
    return '';
  }

  function fieldHtml(f) {
    var isGroup = f.type === 'chips' || f.type === 'multi';
    var tag = isGroup ? 'span' : 'label';
    var forAttr = isGroup ? '' : ' for="f-' + f.k + '"';
    return '<div class="field" data-field="' + f.k + '">' +
      '<' + tag + ' class="field__label" id="l-' + f.k + '"' + forAttr + '>' + esc(f.label) + ' <span class="field__hint">' + (f.req ? '' : '(opcional)') + '</span></' + tag + '>' +
      fieldControlHtml(f) +
      (S.errors[f.k] ? '<span class="field__error" role="alert">' + esc(S.errors[f.k]) + '</span>' : '') +
      '</div>';
  }

  function rerenderField(k) {
    var el = sheet.querySelector('[data-field="' + k + '"]');
    if (el) el.outerHTML = fieldHtml(fieldDef(k));
  }

  function clearFieldError(k) {
    var el = sheet.querySelector('[data-field="' + k + '"]');
    if (!el) return;
    var err = $('.field__error', el);
    if (err) err.remove();
    var tel = $('.tel', el);
    if (tel) tel.classList.remove('has-error');
  }

  function render() {
    var form = isForm();
    var showForm = form && !S.done;
    var steps = form ? FORMS[S.modal] : [];
    var isLast = showForm && S.step === steps.length - 1;
    var name = (S.data.nombre || '').trim().split(' ')[0];

    var title = '', sub = '';
    if (S.modal === 'privacidad') title = 'Aviso de privacidad';
    else if (S.done) {
      title = name ? '¡Listo, ' + name + '!' : '¡Listo!';
      sub = 'Te escribiremos por WhatsApp en menos de 24 horas.' + (S.modal === 'paseador' ? ' Si estás entre los primeros 20, serás paseador fundador.' : '');
    } else if (S.modal === 'dueno') {
      title = 'Busco paseador';
      sub = S.step === 0 ? 'Cuéntanos de tu perro. Toma menos de 2 minutos.' : 'Unas preguntas más para ayudarte mejor.';
    } else if (S.modal === 'paseador') {
      title = 'Quiero ser paseador';
      sub = S.step === 0 ? 'Súmate como paseador en tu barrio.' : 'Tu disponibilidad y la verificación.';
    }

    var h = '<div class="sheet__head"><div class="sheet__titles">' +
      (showForm ? '<span class="sheet__step">Paso ' + (S.step + 1) + ' de ' + steps.length + '</span>' : '') +
      '<h3 class="sheet__title" id="sheet-title">' + esc(title) + '</h3>' +
      (sub ? '<p class="sheet__sub">' + esc(sub) + '</p>' : '') +
      '</div><button type="button" class="sheet__close" data-close aria-label="Cerrar">×</button></div>';

    if (showForm) {
      h += '<div class="progress" aria-hidden="true"><div class="is-on"></div><div' + (S.step > 0 ? ' class="is-on"' : '') + '></div></div>';
      h += '<form class="form" novalidate>' + steps[S.step].map(fieldHtml).join('');
      if (isLast) {
        h += '<div class="consent">' +
          '<button type="button" class="consent__toggle" role="checkbox" aria-checked="' + S.consent + '" data-consent>' +
          '<span class="consent__box" aria-hidden="true">' + (S.consent ? '✓' : '') + '</span>' +
          '<span>Acepto que Patacerca me contacte por WhatsApp y el uso de mis datos según el aviso de privacidad.</span></button>' +
          '<a href="#privacidad" class="consent__link" data-privacy>Leer aviso de privacidad</a>' +
          (S.consentError ? '<span class="field__error" role="alert">Necesitamos tu consentimiento para escribirte.</span>' : '') +
          '</div>';
      }
      h += '<div class="form__actions">' +
        (S.step > 0 ? '<button type="button" class="btn btn--back" data-back>Atrás</button>' : '') +
        '<button type="submit" class="btn btn--primary btn--next">' + (isLast ? 'Enviar registro' : 'Continuar') + '</button>' +
        '</div></form>';
    }

    if (form && S.done) {
      var site = location.origin + location.pathname;
      var shareText = 'Mira Patacerca: paseadores verificados en tu barrio de Cochabamba ' + site + '?utm_source=referido&utm_medium=whatsapp&utm_campaign=gracias';
      h += '<div class="thanks">' +
        '<a class="thanks__join" href="' + esc(COMMUNITY_URL) + '" target="_blank" rel="noopener" data-track="join_group">Unirme a la comunidad en WhatsApp</a>' +
        '<a class="thanks__share" href="' + esc('https://wa.me/?text=' + encodeURIComponent(shareText)) + '" target="_blank" rel="noopener" data-track="share_click">Compártelo con alguien que tenga perro</a>' +
        '</div>';
    }

    if (S.modal === 'privacidad') {
      h += '<div class="privacy">' +
        '<p>Patacerca recoge tu nombre, WhatsApp, zona y respuestas del formulario solo para contactarte sobre el lanzamiento del servicio y entender qué necesitas.</p>' +
        '<p>No vendemos ni compartimos tus datos con terceros. Puedes pedir que los borremos en cualquier momento escribiéndonos por WhatsApp.</p>' +
        '<p>Estamos en etapa de lanzamiento: aún no ofrecemos el servicio, y te avisaremos cuando llegue a tu zona.</p>' +
        '</div>';
    }

    sheet.innerHTML = h;
  }

  // ----- Eventos del modal -----
  // Cierra solo si el clic empezó y terminó en el fondo (no al soltar una selección de texto).
  var downOnOverlay = false;
  overlay.addEventListener('mousedown', function (e) { downOnOverlay = e.target === overlay; });
  overlay.addEventListener('click', function (e) { if (e.target === overlay && downOnOverlay) close(); downOnOverlay = false; });

  sheet.addEventListener('click', function (e) {
    var t = e.target;
    if (t.closest('[data-close]')) { close(); return; }
    if (t.closest('[data-back]')) { S.step--; render(); sheet.scrollTop = 0; return; }
    if (t.closest('[data-consent]')) {
      S.consent = !S.consent; S.consentError = false;
      var box = t.closest('[data-consent]');
      box.setAttribute('aria-checked', S.consent);
      $('.consent__box', box).textContent = S.consent ? '✓' : '';
      var ce = $('.consent .field__error', sheet);
      if (ce) ce.remove();
      return;
    }
    var chip = t.closest('[data-chip]');
    if (chip) {
      var k = chip.getAttribute('data-chip'), o = chip.getAttribute('data-val');
      var f = fieldDef(k), v = S.data[k];
      var nv;
      if (f.type === 'multi') {
        v = v || [];
        nv = v.indexOf(o) !== -1 ? v.filter(function (x) { return x !== o; }) : v.concat(o);
      } else nv = o;
      setField(k, nv);
      rerenderField(k);
      var again = sheet.querySelector('[data-chip="' + k + '"][data-val="' + CSS.escape(o) + '"]');
      if (again) again.focus({ preventScroll: true });
      return;
    }
    var tr = t.closest('[data-track]');
    if (tr) track(tr.getAttribute('data-track'), { form: S.modal });
  });

  sheet.addEventListener('submit', function (e) { e.preventDefault(); next(); });

  sheet.addEventListener('input', function (e) {
    var k = e.target.getAttribute('data-k');
    if (!k || e.target.tagName === 'SELECT') return;
    setField(k, e.target.value);
    if (k === 'whatsapp' && e.target.value !== S.data.whatsapp) e.target.value = S.data.whatsapp;
    clearFieldError(k);
  });

  sheet.addEventListener('change', function (e) {
    var k = e.target.getAttribute('data-k');
    if (!k || e.target.tagName !== 'SELECT') return;
    var cityChanged = setField(k, e.target.value);
    clearFieldError(k);
    if (cityChanged) rerenderField('zona');
  });

  // Enlaces de privacidad (footer y formulario)
  document.addEventListener('click', function (e) {
    var p = e.target.closest('[data-privacy]');
    if (p) { e.preventDefault(); openPrivacy(); return; }
    var b = e.target.closest('[data-open]');
    if (b) open(b.getAttribute('data-open'), b.getAttribute('data-from'), b.hasAttribute('data-viajes') ? { interes_viajes: true } : {});
  });

  document.addEventListener('keydown', function (e) {
    if (S.modal && e.key === 'Escape') close();
  });

  track('page_view', utm);
})();
