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

  // ---- Back: return to the page the visitor came from when it is ours ----
  const back = page.querySelector('.req__back');
  back.addEventListener('click', (e) => {
    try {
      if (document.referrer && new URL(document.referrer).origin === location.origin && history.length > 1) {
        e.preventDefault();
        history.back();
      }
    } catch (_) { /* fall through to the link */ }
  });

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

  // ---- Photos: click or drag & drop, thumbnails with remove ----
  const photoBox = page.querySelector('.req__photos');
  const photoInput = document.getElementById('r-photos');
  const thumbs = page.querySelector('.req__thumbs');
  const dropTitle = page.querySelector('.req__drop-title');
  let uid = 0;

  const renderPhotos = () => {
    thumbs.innerHTML = '';
    photos.forEach((p) => {
      const li = document.createElement('li');
      li.className = 'req__thumb';
      if (p.url) {
        const img = document.createElement('img');
        img.src = p.url;
        img.alt = p.file.name;
        li.append(img);
      } else {
        const d = document.createElement('span');
        d.className = 'req__thumb-doc';
        d.textContent = p.file.name;
        li.append(d);
      }
      const rm = document.createElement('button');
      rm.type = 'button';
      rm.textContent = '✕';
      rm.setAttribute('aria-label', `Remove ${p.file.name}`);
      rm.addEventListener('click', () => {
        if (p.url) URL.revokeObjectURL(p.url);
        photos = photos.filter((x) => x !== p);
        renderPhotos();
      });
      li.append(rm);
      thumbs.append(li);
    });
    dropTitle.textContent = photos.length ? `${photos.length} photo${photos.length > 1 ? 's' : ''} added · Add more` : 'Add damage photos';
    if (photos.length) photoBox.classList.remove('is-invalid');
  };

  const addFiles = (list) => {
    [...list].forEach((file) => {
      if (photos.length >= MAX_PHOTOS) return;
      if (!/^image\//.test(file.type) && !/\.(heic|heif|pdf)$/i.test(file.name) && file.type !== 'application/pdf') return;
      const previewable = /^image\/(jpeg|png|gif|webp|avif)$/.test(file.type);
      photos.push({ id: ++uid, file, url: previewable ? URL.createObjectURL(file) : '' });
    });
    renderPhotos();
  };
  photoInput.addEventListener('change', () => { addFiles(photoInput.files); photoInput.value = ''; });
  ['dragenter', 'dragover'].forEach((t) => photoBox.addEventListener(t, (e) => { e.preventDefault(); photoBox.classList.add('is-drag'); }));
  ['dragleave', 'drop'].forEach((t) => photoBox.addEventListener(t, (e) => {
    e.preventDefault();
    if (t === 'dragleave' && photoBox.contains(e.relatedTarget)) return;
    photoBox.classList.remove('is-drag');
  }));
  photoBox.addEventListener('drop', (e) => { if (e.dataTransfer) addFiles(e.dataTransfer.files); });

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
