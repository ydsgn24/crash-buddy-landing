// Request page: one screen for an Estimate or a Supplement (request.html?type=estimate|supplement)
(() => {
  const page = document.querySelector('.req');
  if (!page) return;

  const form = page.querySelector('.req__form');
  const error = page.querySelector('.req__error');
  const NOTES = {
    estimate: 'Prior damage, parts already identified, claim number, special instructions…',
    supplement: 'Hidden damage, teardown findings, insurer comments, requested operations…',
  };
  const MAX_PHOTOS = 40;
  let kind = 'estimate';
  let photos = [];   // { id, file, url }
  let estFile = null;

  // ---- type switch ----
  const setKind = (k, push) => {
    kind = k === 'supplement' ? 'supplement' : 'estimate';
    page.dataset.kind = kind;
    page.querySelectorAll('[data-for]').forEach((el) => { el.hidden = el.dataset.for !== kind; });
    page.querySelectorAll('input[name="kind"]').forEach((r) => { r.checked = r.value === kind; });
    document.getElementById('r-notes').placeholder = NOTES[kind];
    document.title = `Request ${kind === 'estimate' ? 'an Estimate' : 'a Supplement'} — Crash Buddy Estimating`;
    clearErrors();
    if (push) {
      const url = new URL(location.href);
      url.searchParams.set('type', kind);
      history.replaceState(null, '', url);
    }
  };
  page.querySelectorAll('input[name="kind"]').forEach((r) => r.addEventListener('change', () => setKind(r.value, true)));
  setKind(new URLSearchParams(location.search).get('type'), false);
  window.addEventListener('pageshow', (e) => e.persisted && setKind(new URLSearchParams(location.search).get('type'), false));

  // ---- Supplement: current Estimate file ----
  const fileWrap = page.querySelector('.req__file');
  const fileInput = document.getElementById('r-est');
  const fileName = fileWrap.querySelector('.req__file-name');
  const fileRemove = fileWrap.querySelector('.req__file-remove');
  const renderFile = () => {
    fileWrap.classList.toggle('has-file', !!estFile);
    fileName.textContent = estFile ? estFile.name : 'Attach current Estimate';
    fileRemove.hidden = !estFile;
    if (estFile) fileWrap.classList.remove('is-invalid');
  };
  fileInput.addEventListener('change', () => { estFile = fileInput.files[0] || null; renderFile(); });
  fileRemove.addEventListener('click', () => { estFile = null; fileInput.value = ''; renderFile(); });

  // ---- Photos: iPhone-style grid ----
  // tap = full-screen viewer (swipe, pinch to zoom, swipe down to close, trash),
  // hold = lift and reorder, ✕ or trash = remove with "Undo"; the last tile adds more.
  const photoBox = page.querySelector('.req__photos');
  const photoInput = document.getElementById('r-photos');
  const thumbs = page.querySelector('.req__thumbs');
  const dropTitle = page.querySelector('.req__drop-title');
  const gesture = page.querySelector('.req__gesture');
  const toast = document.querySelector('.req__toast');
  let uid = 0;
  let pswp = null;

  const ICON_X = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 3l6 6M9 3L3 9"/></svg>';
  const ICON_TRASH = '<svg viewBox="0 0 24 24" aria-hidden="true" class="pswp__icn"><path d="M4.5 6.5h15M9.5 6.5V5a1.5 1.5 0 0 1 1.5-1.5h2A1.5 1.5 0 0 1 14.5 5v1.5M6.5 6.5l.8 12a1.5 1.5 0 0 0 1.5 1.4h6.4a1.5 1.5 0 0 0 1.5-1.4l.8-12M10 10.5v6M14 10.5v6"/></svg>';

  const renderPhotos = () => {
    thumbs.innerHTML = '';
    photos.forEach((p, i) => {
      const li = document.createElement('li');
      li.className = 'req__thumb';
      li.dataset.id = p.id;
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'req__thumb-open';
      open.setAttribute('aria-label', `View ${p.file.name}`);
      if (p.url) {
        const img = document.createElement('img');
        img.src = p.url;
        img.alt = '';
        img.draggable = false;
        open.append(img);
      } else {
        const d = document.createElement('span');
        d.className = 'req__thumb-doc';
        d.textContent = p.file.name;
        open.append(d);
      }
      open.addEventListener('click', () => { if (!thumbs.classList.contains('is-sorting')) openViewer(photos.indexOf(p)); });
      li.append(open);
      if (i === 0 && photos.length > 1) {
        const c = document.createElement('span');
        c.className = 'req__thumb-cover';
        c.textContent = 'Cover';
        li.append(c);
      }
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.className = 'req__thumb-x';
      rm.innerHTML = ICON_X;
      rm.setAttribute('aria-label', `Remove ${p.file.name}`);
      rm.addEventListener('click', () => removePhoto(p));
      li.append(rm);
      thumbs.append(li);
    });
    if (photos.length && photos.length < MAX_PHOTOS) {
      const add = document.createElement('li');
      add.className = 'req__thumb req__thumb--add';
      add.innerHTML = '<label for="r-photos"><span aria-hidden="true">+</span>Add</label>';
      thumbs.append(add);
    }
    photoBox.classList.toggle('has-photos', photos.length > 0);
    gesture.hidden = photos.length === 0;
    dropTitle.textContent = 'Add damage photos';
    if (photos.length) photoBox.classList.remove('is-invalid');
  };

  const addFiles = (list) => {
    [...list].forEach((file) => {
      if (photos.length >= MAX_PHOTOS) return;
      if (!/^image\//.test(file.type) && !/\.(heic|heif|pdf)$/i.test(file.name) && file.type !== 'application/pdf') return;
      const previewable = /^image\/(jpeg|png|gif|webp|avif)$/.test(file.type);
      const p = { id: ++uid, file, url: previewable ? URL.createObjectURL(file) : '', w: 0, h: 0 };
      if (p.url) { const im = new Image(); im.onload = () => { p.w = im.naturalWidth; p.h = im.naturalHeight; }; im.src = p.url; }
      photos.push(p);
    });
    renderPhotos();
  };
  photoInput.addEventListener('change', () => { addFiles(photoInput.files); photoInput.value = ''; });
  ['dragenter', 'dragover'].forEach((t) => photoBox.addEventListener(t, (e) => {
    if (!e.dataTransfer || ![...e.dataTransfer.types].includes('Files')) return; // ignore reordering drags
    e.preventDefault(); photoBox.classList.add('is-drag');
  }));
  ['dragleave', 'drop'].forEach((t) => photoBox.addEventListener(t, (e) => {
    if (t === 'dragleave' && photoBox.contains(e.relatedTarget)) return;
    photoBox.classList.remove('is-drag');
  }));
  photoBox.addEventListener('drop', (e) => {
    if (!e.dataTransfer || !e.dataTransfer.files.length) return;
    e.preventDefault(); addFiles(e.dataTransfer.files);
  });

  // remove + "Undo" toast (the file stays in memory until the toast is gone)
  let undo = null;
  let toastTimer = 0;
  const dropUndo = () => { if (undo && undo.p.url) URL.revokeObjectURL(undo.p.url); undo = null; };
  const hideToast = () => { toast.classList.remove('is-on'); clearTimeout(toastTimer); toastTimer = setTimeout(() => { toast.hidden = true; }, 250); };
  function removePhoto(p) {
    const index = photos.indexOf(p);
    if (index < 0) return;
    dropUndo();
    undo = { p, index };
    photos.splice(index, 1);
    renderPhotos();
    clearTimeout(toastTimer);
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('is-on'));
    toastTimer = setTimeout(() => { hideToast(); dropUndo(); }, 4000);
  }
  toast.querySelector('.req__toast-undo').addEventListener('click', () => {
    if (!undo) return;
    photos.splice(Math.min(undo.index, photos.length), 0, undo.p);
    undo = null;
    renderPhotos();
    hideToast();
  });

  // hold to reorder (touch: 0.3 s press; mouse: drag right away)
  if (window.Sortable) {
    Sortable.create(thumbs, {
      draggable: '.req__thumb:not(.req__thumb--add)',
      filter: '.req__thumb-x, .req__thumb--add',
      preventOnFilter: false,
      delay: 300,
      delayOnTouchOnly: true,
      touchStartThreshold: 6,
      animation: 220,
      easing: 'cubic-bezier(.2, .8, .2, 1)',
      chosenClass: 'is-lifted',
      ghostClass: 'is-ghost',
      dragClass: 'is-drag-img',
      forceFallback: true,
      fallbackOnBody: true,
      onChoose: () => { if (navigator.vibrate) navigator.vibrate(8); },
      onStart: () => thumbs.classList.add('is-sorting'),
      onEnd: (e) => {
        setTimeout(() => thumbs.classList.remove('is-sorting'), 50); // swallow the click that ends a drag
        if (e.oldIndex === e.newIndex) return;
        const [moved] = photos.splice(e.oldIndex, 1);
        photos.splice(e.newIndex, 0, moved);
        renderPhotos();
      },
    });
  }

  // full-screen viewer: swipe between photos, pinch to zoom, swipe down to close, trash at the bottom
  function openViewer(index) {
    if (!window.PhotoSwipe || index < 0) return;
    const items = photos.map((p) => (p.url
      ? { src: p.url, msrc: p.url, width: p.w || 1600, height: p.h || 1200, alt: p.file.name }
      : { html: `<div class="req__pswp-doc"><b>${p.file.name.replace(/[<&]/g, (c) => (c === '<' ? '&lt;' : '&amp;'))}</b><span>Preview not available</span></div>` }));
    const imgs = () => [...thumbs.querySelectorAll('.req__thumb:not(.req__thumb--add) .req__thumb-open')];
    pswp = new PhotoSwipe({
      dataSource: items,
      index,
      bgOpacity: 1,
      showHideAnimationType: 'zoom',
      indexIndicatorSep: ' of ',
      wheelToZoom: true,
      zoom: false,
      // always fill the screen, even for small images (phone photos are big anyway)
      initialZoomLevel: (z) => Math.min(z.panAreaSize.x / z.elementSize.x, z.panAreaSize.y / z.elementSize.y),
      secondaryZoomLevel: (z) => Math.max(2.5, 2 * Math.min(z.panAreaSize.x / z.elementSize.x, z.panAreaSize.y / z.elementSize.y)),
      maxZoomLevel: (z) => Math.max(4, 4 * Math.min(z.panAreaSize.x / z.elementSize.x, z.panAreaSize.y / z.elementSize.y)),
      returnFocus: true,
      paddingFn: () => ({ top: 56, bottom: 88, left: 0, right: 0 }),
    });
    pswp.addFilter('thumbEl', (el, data, i) => { const t = imgs()[i]; return t ? (t.querySelector('img') || t) : el; });
    pswp.addFilter('placeholderSrc', (src, slide) => slide.data.msrc || src);
    pswp.on('uiRegister', () => {
      pswp.ui.registerElement({
        name: 'trash',
        order: 9,
        isButton: true,
        appendTo: 'root',
        title: 'Delete photo',
        html: ICON_TRASH,
        onClick: () => {
          const i = pswp.currIndex;
          const p = photos[i];
          items.splice(i, 1);
          removePhoto(p);
          if (!items.length) { pswp.close(); return; }
          const next = Math.min(i, items.length - 1);
          [i - 1, i, i + 1].forEach((k) => { if (k >= 0 && k < items.length) pswp.refreshSlideContent(k); });
          pswp.goTo(next);
          pswp.refreshSlideContent(next);
          pswp.dispatch('change');
        },
      });
    });
    pswp.on('destroy', () => { pswp = null; });
    pswp.init();
  }

  // ---- optional fields: notes, referral code ----
  page.querySelectorAll('.req__link').forEach((btn) => {
    const wrap = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', () => {
      const open = wrap.hidden;
      wrap.hidden = !open;
      btn.setAttribute('aria-expanded', String(open));
      if (open) wrap.querySelector('input, textarea').focus();
    });
  });

  // ---- validation + submit ----
  const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  function clearErrors() {
    page.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    error.hidden = true;
  }
  form.addEventListener('input', (e) => {
    const box = e.target.closest('.float, .req__check');
    if (box) box.classList.remove('is-invalid');
  });
  form.addEventListener('change', (e) => {
    const box = e.target.closest('.req__check');
    if (box) box.classList.remove('is-invalid');
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    clearErrors();
    const missing = [];
    const bad = (el, label) => { el.classList.add('is-invalid'); missing.push({ el, label }); };

    const veh = document.getElementById('r-veh');
    const email = document.getElementById('r-email');
    const terms = form.querySelector('input[name="terms"]');

    if (kind === 'estimate' && !veh.value.trim()) bad(veh.closest('.float'), 'Year / Make / Model');
    if (kind === 'supplement' && !estFile) bad(fileWrap, 'the current Estimate');
    if (!EMAIL.test(email.value.trim())) bad(email.closest('.float'), 'a valid work email');
    if (!photos.length) bad(photoBox, 'damage photos');
    if (!terms.checked) bad(terms.closest('.req__check'), 'agreement to the terms');

    if (missing.length) {
      error.textContent = `Please add ${missing.map((m) => m.label).join(', ')}.`;
      error.hidden = false;
      const first = missing[0].el;
      first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const focusable = first.querySelector('input, textarea');
      if (focusable && focusable.type !== 'file') focusable.focus({ preventScroll: true });
      return;
    }

    // No backend in this prototype: here the request (fields + files) is sent to the server.
    page.querySelector('.req__done-kind').textContent = kind === 'estimate' ? 'Estimate' : 'Supplement';
    page.querySelector('.req__done-email').textContent = email.value.trim();
    page.querySelector('.req__again').href = `request.html?type=${kind}`;
    form.hidden = true;
    page.querySelector('.req__head').hidden = true;
    page.querySelector('.req__done').hidden = false;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
