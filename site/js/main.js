(() => {
  'use strict';
  const root = document.documentElement;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const config = window.XOLOLO_CONFIG || {};
  const dict = window.XOLOLO_TEXT;
  const photos = window.XOLOLO_PHOTOS;
  const params = new URLSearchParams(location.search);
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  root.classList.add('js');
  let lang = 'es', filter = 'all', expanded = false, viewerIndex = 0;
  let viewerPhotos = photos, errorKey = '', copyKey = '', currentChapter = 0;
  let journeyTrigger = null, journeyTimeline = null;
  const dialogs = $$('dialog');
  const menu = $('#menu-dialog');
  const lightbox = $('#lightbox');
  const form = $('#inquiry-form');
  const fields = {in: $('#checkin'), out: $('#checkout'), guests: $('#guests')};
  const result = $('#contact-result');
  const number = String(config.WHATSAPP_NUMBER || '').trim().replace(/[\s+()-]/g, '');
  const validNumber = /^[1-9]\d{7,14}$/.test(number);
  const origin = (params.get('utm_source') || config.DEFAULT_ORIGIN || 'WEB').replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 50).toUpperCase() || 'WEB';
  function t(key, args = {}) {
    let value = dict[lang][key] ?? dict.es[key] ?? key;
    for (const [k, v] of Object.entries(args)) value = value.replaceAll('{' + k + '}', String(v));
    return value;
  }
  function setLanguage(next) {
    lang = next === 'en' ? 'en' : 'es'; root.lang = lang;
    $$('[data-i18n]').forEach(el => { el.innerHTML = t(el.dataset.i18n); });
    $$('[data-i18n-alt]').forEach(el => { el.alt = t(el.dataset.i18nAlt); });
    $$('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); });
    $$('[data-lang]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.lang === lang)));
    document.title = t('meta.title');
    $('meta[name="description"]').content = t('meta.description');
    try { localStorage.setItem('xololo-lang', lang); } catch (_) {}
    updateGallery(); updateSummary();
    if (errorKey) $('#form-error').textContent = t(errorKey);
    if (copyKey) $('#copy-status').textContent = t(copyKey);
    if (!result.hidden) $('#message-preview').value = composeMessage();
    if (lightbox.open) updateViewer();
    if (menu.open) previewMenu(lastPreview);
    window.ScrollTrigger?.refresh();
  }
  $$('[data-lang]').forEach(button => button.addEventListener('click', () => setLanguage(button.dataset.lang)));

  /* Header contrast, calculated once per animation frame. */
  let scrollQueued = false;
  function headerStyle() {
    $('.header').classList.toggle('solid', scrollY > $('.hero').offsetHeight - 86);
    const range = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    $('.read-progress span').style.transform = 'scaleX(' + Math.max(0, Math.min(1, scrollY / range)).toFixed(4) + ')';
    const passage = $('#recorrido').getBoundingClientRect();
    const readingPassage = passage.top < innerHeight && passage.bottom > 0;
    const inquiry = $('#consulta').getBoundingClientRect();
    const atInquiry = inquiry.top < innerHeight && inquiry.bottom > 0;
    $('.quick-dock').classList.toggle('is-visible', scrollY > $('.hero').offsetHeight * .75 && !readingPassage && !atInquiry && !menu.open);
    scrollQueued = false;
  }
  addEventListener('scroll', () => { if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(headerStyle); } }, {passive: true});
  addEventListener('resize', headerStyle); headerStyle();
  $('#share-page').addEventListener('click', async () => {
    const url = location.origin + location.pathname;
    try {
      if (navigator.share) { await navigator.share({title:document.title,url}); return; }
      await navigator.clipboard.writeText(url);
      $('#share-status').textContent = t('dock.shared');
    } catch (error) {
      if (error?.name === 'AbortError') return;
      try {
        const field = document.createElement('textarea'); field.value = url; field.style.position = 'fixed'; field.style.opacity = '0'; document.body.append(field); field.select();
        let copied = false;
        try { copied = document.execCommand('copy'); } finally { field.remove(); }
        if (!copied) throw new Error('copy failed');
        $('#share-status').textContent = t('dock.shared');
      } catch (_) { $('#share-status').textContent = t('dock.sharefailed'); }
    }
  });

  /* Full-screen menu and image viewer: native dialogs keep focus inside. */
  function openDialog(dialog) {
    if (dialog.open) return;
    dialog.showModal(); document.body.classList.add('modal-open');
    if (dialog === menu) $('.menu-toggle').setAttribute('aria-expanded', 'true');
  }
  dialogs.forEach(dialog => {
    $('.close-dialog', dialog)?.addEventListener('click', () => dialog.close());
    dialog.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const focusable = $$('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', dialog)
        .filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
      if (!focusable.length) { event.preventDefault(); dialog.focus(); return; }
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    dialog.addEventListener('close', () => {
      if (!dialogs.some(d => d.open)) document.body.classList.remove('modal-open');
      if (dialog === menu) $('.menu-toggle').setAttribute('aria-expanded', 'false');
    });
    dialog.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
    });
  });
  $('.menu-toggle').addEventListener('click', () => openDialog(menu));
  $('#privacy-open').addEventListener('click', () => openDialog($('#privacy-dialog')));
  let lastPreview = 'alberca-pergola';
  function previewMenu(name) {
    lastPreview = name;
    const image = $('.menu-image img');
    image.src = 'img/' + name + '-800.webp';
    image.srcset = 'img/' + name + '-800.webp 800w, img/' + name + '-1600.webp 1600w';
    image.alt = photos.find(p => p.name === name)?.[lang] || 'Casa Xololo';
  }
  $$('.menu-content nav a').forEach(link => {
    link.addEventListener('pointerenter', () => { if (innerWidth > 800) previewMenu(link.dataset.preview); });
    link.addEventListener('focus', () => { if (innerWidth > 800) previewMenu(link.dataset.preview); });
    link.addEventListener('click', event => {
      event.preventDefault(); menu.close();
      const target = $(link.getAttribute('href'));
      requestAnimationFrame(() => {
        history.pushState(null, '', link.getAttribute('href'));
        target.scrollIntoView({behavior: motion.matches ? 'instant' : 'smooth'});
        const heading = $('h2', target);
        if (heading) { heading.tabIndex = -1; heading.focus({preventScroll: true}); }
      });
    });
  });

  /* Photograph filters and viewer. No fabricated images or architecture. */
  function matchingPhotos() { return photos.filter(p => filter === 'all' || p.category === filter); }
  function updateGallery() {
    const matching = $$('.gallery-item').filter(el => filter === 'all' || el.dataset.category === filter);
    $$('.gallery-item').forEach(el => { el.hidden = true; });
    const visible = expanded ? matching : matching.slice(0, 6);
    visible.forEach(el => { el.hidden = false; });
    $$('[data-filter]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.filter === filter)));
    $('#gallery-count').textContent = t('gallery.count', {shown: visible.length, total: matching.length});
    const more = $('#gallery-more');
    more.hidden = matching.length <= 6;
    $('[data-i18n]', more).dataset.i18n = expanded ? 'gallery.less' : 'gallery.more';
    $('[data-i18n]', more).textContent = t(expanded ? 'gallery.less' : 'gallery.more');
    requestAnimationFrame(() => window.ScrollTrigger?.refresh());
  }
  $$('[data-filter]').forEach(button => button.addEventListener('click', () => { filter = button.dataset.filter; expanded = false; updateGallery(); }));
  $('#gallery-more').addEventListener('click', () => {
    expanded = !expanded; updateGallery();
    if (!expanded) $('#galeria').scrollIntoView({behavior: motion.matches ? 'instant' : 'smooth'});
  });
  $$('.gallery-open').forEach(button => button.addEventListener('click', () => {
    const photo = photos[Number(button.dataset.photo)];
    viewerPhotos = matchingPhotos(); viewerIndex = viewerPhotos.indexOf(photo);
    $('#lightbox-thumbs').replaceChildren();
    viewerPhotos.forEach((p, i) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.index = i;
      const img = document.createElement('img'); img.src = 'img/' + p.name + '-800.webp'; img.alt = ''; img.loading = 'lazy'; img.width = 58; img.height = 49;
      b.append(img); b.addEventListener('click', () => { viewerIndex = i; updateViewer(); }); $('#lightbox-thumbs').append(b);
    });
    updateViewer(); openDialog(lightbox);
  }));
  function updateViewer() {
    const p = viewerPhotos[viewerIndex];
    const img = $('#lightbox-image'); img.src = 'img/' + p.name + '-1600.webp'; img.alt = p[lang];
    img.width = p.width; img.height = p.height;
    $('#lightbox-caption').textContent = p[lang];
    $('#lightbox-count').textContent = (viewerIndex + 1) + ' / ' + viewerPhotos.length;
    $$('#lightbox-thumbs button').forEach((b, i) => { b.setAttribute('aria-current', String(i === viewerIndex)); b.setAttribute('aria-label', viewerPhotos[i][lang]); });
    const selected = $$('#lightbox-thumbs button')[viewerIndex];
    if (selected) { const rail = $('#lightbox-thumbs'); rail.scrollLeft = selected.offsetLeft - rail.offsetLeft - rail.clientWidth / 2 + selected.offsetWidth / 2; }
    for (const index of [(viewerIndex + 1) % viewerPhotos.length, (viewerIndex - 1 + viewerPhotos.length) % viewerPhotos.length]) { const next = new Image(); next.src = 'img/' + viewerPhotos[index].name + '-1600.webp'; }
  }
  function stepViewer(by) { viewerIndex = (viewerIndex + by + viewerPhotos.length) % viewerPhotos.length; updateViewer(); }
  $('.lightbox-prev').addEventListener('click', () => stepViewer(-1));
  $('.lightbox-next').addEventListener('click', () => stepViewer(1));
  lightbox.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); stepViewer(event.key === 'ArrowRight' ? 1 : -1); }
    if (event.key === 'Home' || event.key === 'End') { event.preventDefault(); viewerIndex = event.key === 'Home' ? 0 : viewerPhotos.length - 1; updateViewer(); }
  });
  let touch = null;
  $('#lightbox-image').addEventListener('touchstart', event => { const p = event.touches[0]; touch = {x:p.clientX, y:p.clientY}; }, {passive:true});
  $('#lightbox-image').addEventListener('touchend', event => {
    if (!touch) return; const p = event.changedTouches[0], dx = p.clientX - touch.x, dy = p.clientY - touch.y;
    if (Math.abs(dx) > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) stepViewer(dx < 0 ? 1 : -1); touch = null;
  }, {passive:true});

  /* Coastal guide: ARIA tabs and arrow-key navigation. */
  const coastTabs = $$('.coast-tabs button');
  function selectCoast(i, focus = false) {
    coastTabs.forEach((tab, k) => { tab.setAttribute('aria-selected', String(k === i)); tab.tabIndex = k === i ? 0 : -1; $('#' + tab.getAttribute('aria-controls')).hidden = k !== i; });
    if (!motion.matches && window.gsap) window.gsap.fromTo($('#' + coastTabs[i].getAttribute('aria-controls')), {opacity:.15, y:22}, {opacity:1, y:0, duration:.65, ease:'power2.out', clearProps:'all'});
    if (focus) coastTabs[i].focus(); window.ScrollTrigger?.refresh();
  }
  coastTabs.forEach((tab, i) => {
    tab.addEventListener('click', () => selectCoast(i));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      event.preventDefault(); selectCoast(event.key === 'Home' ? 0 : event.key === 'End' ? coastTabs.length - 1 : (i + (event.key === 'ArrowRight' ? 1 : -1) + coastTabs.length) % coastTabs.length, true);
    });
  });
  $$('.faq details').forEach(detail => detail.addEventListener('toggle', () => window.ScrollTrigger?.refresh()));

  /* Local calendar dates; no UTC drift at the boundary of a day. */
  function today() { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
  function dayNumber(iso) { const [y,m,d] = iso.split('-').map(Number); return Date.UTC(y,m-1,d) / 86400000; }
  function nextDay(iso) { const d = new Date(iso + 'T12:00:00'); d.setDate(d.getDate()+1); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); }
  function dateValid(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
    const [y,m,d] = iso.split('-').map(Number), v = new Date(Date.UTC(y,m-1,d));
    return v.getUTCFullYear() === y && v.getUTCMonth() === m-1 && v.getUTCDate() === d;
  }
  function updateSummary() {
    const ci = fields.in.value, co = fields.out.value, g = Number(fields.guests.value);
    fields.in.min = today(); fields.out.min = ci && dateValid(ci) ? nextDay(ci) : today();
    const nights = ci && co && dateValid(ci) && dateValid(co) ? dayNumber(co) - dayNumber(ci) : 0;
    const key = nights > 0 ? (nights === 1 ? (g === 1 ? 'form.summaryBoth' : 'form.summaryOne') : (g === 1 ? 'form.summaryGuest' : 'form.summary')) : (g === 1 ? 'form.generalOne' : 'form.general');
    $('#stay-summary').textContent = t(key, {n:nights, g}); $('#loft-note').hidden = g <= 4;
  }
  function readable(iso) { return new Intl.DateTimeFormat(lang === 'es' ? 'es-MX' : 'en-GB', {day:'numeric',month:'short',year:'numeric'}).format(new Date(iso + 'T12:00:00')); }
  function composeMessage() {
    const ci = fields.in.value, co = fields.out.value, g = Number(fields.guests.value);
    let message = ci && co && dateValid(ci) && dateValid(co) ? t('wa.dates', {in:readable(ci),out:readable(co),g}) : t('wa.general',{g});
    if (g > 4) message += '\n' + t('wa.loft');
    return message + '\n' + t('wa.origin', {o:origin});
  }
  const submitText = $('#contact-submit [data-i18n]'); submitText.dataset.i18n = validNumber ? 'form.sendWA' : 'form.sendIG';
  function showError(key, target) { errorKey = key; $('#form-error').textContent = t(key); target.focus(); }
  form.addEventListener('input', () => { errorKey = ''; copyKey = ''; $('#form-error').textContent = ''; $('#copy-status').textContent = ''; result.hidden = true; updateSummary(); });
  form.addEventListener('change', updateSummary);
  form.addEventListener('submit', event => {
    event.preventDefault(); errorKey = ''; $('#form-error').textContent = ''; result.hidden = true;
    const ci = fields.in.value, co = fields.out.value, g = Number(fields.guests.value);
    if (!Number.isInteger(g) || g < 1 || g > 8) return showError('form.invalid', fields.guests);
    if ((ci && !dateValid(ci)) || (co && !dateValid(co))) return showError('form.invalid', fields.in);
    if (!!ci !== !!co) return showError('form.pair', ci ? fields.out : fields.in);
    if (ci && ci < today()) return showError('form.past', fields.in);
    if (ci && co <= ci) return showError('form.order', fields.out);
    const message = composeMessage(); $('#message-preview').value = message; result.hidden = false; copyKey = ''; $('#copy-status').textContent = '';
    const info = $('[data-i18n]', result), link = $('#instagram-contact');
    if (validNumber) {
      const url = 'https://wa.me/' + number + '?text=' + encodeURIComponent(message);
      info.dataset.i18n = 'wa.sent'; info.textContent = t('wa.sent');
      link.href = url; link.dataset.i18n = 'wa.fallback'; link.textContent = t('wa.fallback');
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      info.dataset.i18n = 'form.copyhint'; info.textContent = t('form.copyhint');
      link.href = config.INSTAGRAM_URL || 'https://www.instagram.com/casaxololo/'; link.dataset.i18n = 'form.openIG'; link.textContent = t('form.openIG');
      $('#copy-message').focus({preventScroll:true});
      result.scrollIntoView({behavior:motion.matches ? 'instant':'smooth',block:'nearest'});
    }
    document.dispatchEvent(new CustomEvent('xololo:contact', {detail:{channel:validNumber ? 'whatsapp':'instagram',source:origin}}));
  });
  $('#copy-message').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText($('#message-preview').value); copyKey = 'form.copied';
    } catch (_) {
      $('#message-preview').focus(); $('#message-preview').select();
      try { copyKey = document.execCommand('copy') ? 'form.copied' : 'form.copyfailed'; } catch (_) { copyKey = 'form.copyfailed'; }
    }
    $('#copy-status').textContent = t(copyKey);
  });

  /* Five real photographs form a scroll-directed passage through the house. */
  const scenes = $$('.scene');
  const chapterButtons = $$('[data-chapter]');
  function updateJourney(progress) {
    const time = progress * scenes.length;
    currentChapter = Math.min(scenes.length - 1, Math.floor(time + .1));
    chapterButtons.forEach((b,i) => {
      b.setAttribute('aria-current', i === currentChapter ? 'step':'false');
      $('.chapter-track i', b).style.transform = 'scaleX(' + Math.max(0,Math.min(1,time-i)).toFixed(4) + ')';
    });
    scenes.forEach((s,i) => s.setAttribute('aria-hidden', String(i !== currentChapter)));
    $('[data-step="-1"]').disabled = currentChapter === 0; $('[data-step="1"]').disabled = currentChapter === scenes.length - 1;
  }
  function goToChapter(i) {
    if (!journeyTrigger) return;
    i = Math.max(0, Math.min(scenes.length - 1, i));
    const progress = (i + .45) / scenes.length;
    window.scrollTo({top:journeyTrigger.start + progress * (journeyTrigger.end - journeyTrigger.start),behavior:motion.matches ? 'instant':'smooth'});
  }
  chapterButtons.forEach(b => b.addEventListener('click', () => goToChapter(Number(b.dataset.chapter))));
  $$('[data-step]').forEach(b => b.addEventListener('click', () => goToChapter(currentChapter + Number(b.dataset.step))));
  $('#recorrido').addEventListener('keydown', e => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); goToChapter(currentChapter + (e.key === 'ArrowRight' ? 1 : -1)); } });
  if (window.gsap && window.ScrollTrigger) {
    const gsap = window.gsap; gsap.registerPlugin(window.ScrollTrigger);
    const mm = gsap.matchMedia();
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      root.classList.add('cinematic');
      gsap.set(scenes,{autoAlpha:0}); gsap.set(scenes[0],{autoAlpha:1});
      const timeline = gsap.timeline({defaults:{ease:'none'}});
      timeline.to({}, {duration:scenes.length},0);
      scenes.forEach((scene,i) => {
        const start = Math.max(0,i-.22);
        timeline.fromTo($$('img',scene),{scale:1.18,xPercent:i%2 ? -2.5 : 2.5,yPercent:1.5},{scale:1.015,xPercent:0,yPercent:-1.5,duration:i === 0 ? 1.15 : 1.3},start);
        if (i > 0) {
          timeline.fromTo(scene,{autoAlpha:1,clipPath:'inset(0 100% 0 0)'},{clipPath:'inset(0 0% 0 0)',duration:.55,ease:'power2.inOut'},start);
          timeline.to(scenes[i-1],{autoAlpha:0,duration:.12},i+.27);
          timeline.fromTo($('.scene-caption',scene),{y:48,autoAlpha:0},{y:0,autoAlpha:1,duration:.48,ease:'power2.out'},i-.02);
        }
      });
      timeline.eventCallback('onUpdate', () => updateJourney(timeline.progress()));
      journeyTimeline = timeline;
      journeyTrigger = ScrollTrigger.create({trigger:'#recorrido',start:'top top',end:'bottom bottom',animation:timeline,scrub:.55,invalidateOnRefresh:true});
      updateJourney(0);
      // Load the journey just before the visitor reaches it, rather than all images on entry.
      const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { $$('.scene img').forEach(img => {img.loading='eager';}); observer.disconnect(); } },{rootMargin:'700px'});
      observer.observe($('#recorrido'));
      const revealTargets = $$('.intro-copy > *, .section-heading > *, .coast-top > *, .stay-heading > *, .inquiry-content > h2, .inquiry-content > p, .interlude-inner > *');
      revealTargets.forEach((el,i) => gsap.fromTo(el,{y:Math.min(70,34+i%3*12),autoAlpha:0},{y:0,autoAlpha:1,duration:.95,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 90%',once:true}}));
      gsap.fromTo('.intro-photo img',{scale:1.2,yPercent:-6},{scale:1.04,yPercent:6,ease:'none',scrollTrigger:{trigger:'.intro',start:'top bottom',end:'bottom top',scrub:.8}});
      gsap.fromTo('.interlude-media img',{scale:1.2,yPercent:-8},{scale:1.04,yPercent:8,ease:'none',scrollTrigger:{trigger:'.interlude',start:'top bottom',end:'bottom top',scrub:.7}});
      gsap.fromTo('.inquiry-photo img',{scale:1.12,yPercent:-4},{scale:1.025,yPercent:4,ease:'none',scrollTrigger:{trigger:'.inquiry',start:'top bottom',end:'bottom top',scrub:.7}});
      gsap.fromTo('.gallery-grid',{y:65,opacity:.75},{y:0,opacity:1,duration:1,ease:'power3.out',scrollTrigger:{trigger:'.gallery-grid',start:'top 89%',once:true}});
      gsap.fromTo('.coast-panel>img',{scale:1.08},{scale:1,ease:'none',scrollTrigger:{trigger:'.coast',start:'top bottom',end:'bottom top',scrub:.6}});
      gsap.fromTo('.hero-image',{scale:1.04},{scale:1,duration:1.6,ease:'power2.out'});
      gsap.fromTo('.hero-content',{y:18,opacity:0},{y:0,opacity:1,duration:1.05,delay:.12,ease:'power2.out'});
      return () => { observer.disconnect(); journeyTrigger?.kill(); journeyTrigger=null; journeyTimeline=null; root.classList.remove('cinematic'); scenes.forEach(scene => scene.removeAttribute('aria-hidden')); };
    });
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
    addEventListener('load', () => ScrollTrigger.refresh(), {once:true});
  }
  let initial = params.get('lang') || 'es';
  try { initial = params.get('lang') || localStorage.getItem('xololo-lang') || 'es'; } catch (_) {}
  setLanguage(initial);
})();
