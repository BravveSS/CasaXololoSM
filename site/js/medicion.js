/* Medición de Casa Xololo: Google Analytics 4 + Pixel de Meta.
   No envía fechas, nombres ni mensajes: solo que hubo una consulta y por qué canal.
   Los IDs se ponen en js/config.js (GA4_ID y PIXEL_ID). */
(function () {
  'use strict';
  var config = window.XOLOLO_CONFIG || {};
  var GA4 = config.GA4_ID, PIXEL = config.PIXEL_ID;

  function leer(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function guardar(k, v) { try { sessionStorage.setItem(k, v); } catch (e) {} }

  // Origen de la visita: utm_source, anuncios o la red de la que viene
  var q = new URLSearchParams(location.search);
  var origen = q.get('utm_source') ? (q.get('utm_source') + (q.get('utm_medium') ? '-' + q.get('utm_medium') : '')) :
    q.get('fbclid') ? 'facebook-ads' : q.get('gclid') ? 'google-ads' : null;
  if (!origen && document.referrer && document.referrer.indexOf(location.hostname) === -1) {
    var r = document.referrer;
    origen = /instagram/.test(r) ? 'instagram' : /facebook|fb\./.test(r) ? 'facebook' : /tiktok/.test(r) ? 'tiktok' :
      /google/.test(r) ? 'google' : /airbnb/.test(r) ? 'airbnb' : 'otro';
  }
  if (origen) guardar('xololo_origen', origen.toLowerCase());
  var ORIGEN = leer('xololo_origen') || 'directo';

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  if (GA4) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA4;
    document.head.appendChild(s);
    gtag('js', new Date());
    gtag('config', GA4, { origen: ORIGEN });
  }
  if (PIXEL && !window.fbq) {
    /* eslint-disable */
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};
    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
    /* eslint-enable */
    fbq('init', PIXEL);
    fbq('track', 'PageView');
  }

  function evento(nombre, datos) {
    datos = datos || {}; datos.origen = ORIGEN;
    try { if (GA4) gtag('event', nombre, datos); } catch (e) {}
  }
  function pixel(nombre, datos) {
    try { if (window.fbq && PIXEL) fbq('track', nombre, datos || {}); } catch (e) {}
  }
  // Un contacto por visita (formulario + botón de la misma persona = 1)
  function contacto(metodo, extra) {
    evento('contacto_' + metodo, extra);
    if (leer('xololo_lead')) return;
    guardar('xololo_lead', '1');
    evento('generate_lead', Object.assign({ metodo: metodo }, extra || {}));
    pixel(metodo === 'formulario' ? 'Lead' : 'Contact', { content_name: 'casa-xololo' });
  }

  // El formulario de la web avisa con este evento cuando alguien manda su consulta
  document.addEventListener('xololo:contact', function (e) {
    var noches = 0;
    var ci = document.getElementById('checkin'), co = document.getElementById('checkout');
    if (ci && co && ci.value && co.value) noches = Math.round((new Date(co.value) - new Date(ci.value)) / 864e5);
    var personas = Number((document.getElementById('guests') || {}).value) || 0;
    contacto('formulario', { canal: (e.detail && e.detail.channel) || '', noches: noches, personas: personas });
    if (noches > 0) evento('begin_checkout', { value: noches * 6300, currency: 'MXN', noches: noches, personas: personas });
  });

  // Enlaces directos: WhatsApp, correo, Instagram y Airbnb
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a) return;
    var h = a.href;
    if (/wa\.me|whatsapp/i.test(h) && !a.closest('#contact-result')) contacto('whatsapp');
    else if (/^mailto:/i.test(h)) contacto('correo');
    else if (/instagram\.com/i.test(h)) evento('clic_instagram');
    else if (/airbnb\./i.test(h)) evento('clic_airbnb');
  }, true);

  // Interés: llegar a la sección de consulta y abrir preguntas frecuentes
  var consulta = document.getElementById('consulta');
  if (consulta && 'IntersectionObserver' in window) {
    var visto = false;
    new IntersectionObserver(function (entradas, obs) {
      if (!visto && entradas[0].isIntersecting) { visto = true; evento('ver_consulta'); obs.disconnect(); }
    }, { threshold: 0.4 }).observe(consulta);
  }
  document.addEventListener('toggle', function (e) {
    var d = e.target;
    if (d.tagName === 'DETAILS' && d.open) {
      var q = d.querySelector('[data-i18n]');
      evento('ver_pregunta', { pregunta: q ? q.getAttribute('data-i18n') : '' });
    }
  }, true);

  window.XololoMedicion = { evento: evento, origen: ORIGEN };
})();
