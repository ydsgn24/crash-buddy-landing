// Estimator Training page: countdown to the next class + the "Join the Next Training" form
(() => {
  // Countdown(s): hero + price card. The class date lives in data-start on each .tr-start.
  document.querySelectorAll('.tr-start').forEach((box) => {
    const start = new Date(box.dataset.start);
    const dateEl = box.querySelector('.tr-start__date');
    const timer = box.querySelector('.tr-timer');
    const u = (k) => timer.querySelector(`[data-u="${k}"]`);
    if (isNaN(start)) {
      dateEl.textContent = 'Next class date coming soon';
      timer.hidden = true;
      return;
    }
    dateEl.querySelector('b').textContent = start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const pad = (n) => String(n).padStart(2, '0');
    const tick = () => {
      let s = Math.max(0, Math.floor((start - Date.now()) / 1000));
      const d = Math.floor(s / 86400); s %= 86400;
      const h = Math.floor(s / 3600); s %= 3600;
      const m = Math.floor(s / 60); s %= 60;
      u('d').textContent = pad(d); u('h').textContent = pad(h); u('m').textContent = pad(m); u('s').textContent = pad(s);
      if (d + h + m + s > 0) setTimeout(tick, 1000);
    };
    tick();
  });

  // Join form: email only is required. No backend here — show the confirmation.
  const form = document.querySelector('.tr-join__form');
  if (!form) return;
  const email = form.querySelector('#t-email');
  const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  email.addEventListener('input', () => email.closest('.float').classList.remove('is-invalid'));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!EMAIL.test(email.value.trim())) {
      email.closest('.float').classList.add('is-invalid');
      email.focus();
      return;
    }
    const done = document.querySelector('.tr-join__done');
    done.querySelector('.tr-join__email').textContent = email.value.trim();
    form.hidden = true;
    done.hidden = false;
  });
})();

// "What you'll learn" timeline: the item at the middle of the screen is active,
// earlier items are marked as passed and the line fills down to the active dot
(() => {
  const list = document.querySelector('.tr-tl');
  if (!list) return;
  const items = [...list.querySelectorAll('.tr-tl__item')];
  let raf = 0;
  const update = () => {
    raf = 0;
    const mid = window.innerHeight * 0.55;
    let active = 0;
    items.forEach((el, i) => { if (el.getBoundingClientRect().top + el.offsetHeight / 2 <= mid) active = i; });
    items.forEach((el, i) => {
      el.classList.toggle('is-active', i === active);
      el.classList.toggle('is-past', i <= active);
    });
    const dot = items[active].querySelector('.tr-tl__dot').getBoundingClientRect();
    const first = items[0].querySelector('.tr-tl__dot').getBoundingClientRect();
    const last = items[items.length - 1].querySelector('.tr-tl__dot').getBoundingClientRect();
    const top = list.getBoundingClientRect().top;
    list.style.setProperty('--t', `${first.top + first.height / 2 - top}px`);
    list.style.setProperty('--h', `${last.top - first.top}px`);
    list.style.setProperty('--f', `${dot.top - first.top}px`);
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(update); };
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue);
  update();
})();


// Hero date pill: the date comes from data-start
document.querySelectorAll('.tr-date[data-start]').forEach((el) => {
  const d = new Date(el.dataset.start);
  if (!isNaN(d)) el.querySelector('.tr-date__day').textContent = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
});

// Price card: "N days to go" pill + start date from the same data-start; hover (desktop) or tap opens the countdown
(() => {
  const box = document.querySelector('.cd');
  if (!box) return;
  const pill = box.querySelector('.cd__pill');
  const start = new Date(box.dataset.start);
  if (isNaN(start)) return;
  const dateEl = document.querySelector('.tc__start');
  if (dateEl) dateEl.textContent = start.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const days = () => {
    const d = Math.max(0, Math.floor((start - Date.now()) / 86400000));
    box.querySelector('.cd__days').textContent = `${d} ${d === 1 ? 'day' : 'days'}`;
  };
  days(); setInterval(days, 60000);
  const set = (open) => { box.classList.toggle('is-open', open); pill.setAttribute('aria-expanded', String(open)); };
  pill.addEventListener('click', (e) => { e.stopPropagation(); set(!box.classList.contains('is-open')); });
  document.addEventListener('click', () => set(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') set(false); });
})();
