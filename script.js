// Mobile menu
(() => {
  const nav = document.querySelector('.nav');
  const toggle = nav.querySelector('.nav__toggle');

  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  });

  nav.querySelectorAll('.nav__menu a').forEach((link) =>
    link.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-label', 'Open menu');
    })
  );
})();

// "4 simple steps": steps light up one by one on scroll (earlier ones stay lit),
// and the phone screen reveals the matching part of the claim.
(() => {
  const section = document.querySelector('.steps');
  if (!section) return;

  const track = section.querySelector('.steps__track');
  const steps = [...section.querySelectorAll('.step')];
  const fx = [...section.querySelectorAll('.phone [data-step]')];
  const bars = [...section.querySelectorAll('.steps__bars i')];
  const fill = (p) => bars.forEach((b, i) => {
    const f = Math.min(1, Math.max(0, p * bars.length - i)).toFixed(3);
    if (b.dataset.f !== f) { b.dataset.f = f; b.style.setProperty('--f', f); }
  });

  const formScreen = section.querySelector('.scr--form');
  const pdfScreen = section.querySelector('.scr--pdf');

  document.documentElement.classList.add('js-steps');

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const desktop = window.matchMedia('(min-width: 1141px)');
  const STAGE_H = 729;
  const HEADER = 96;
  let current = -1;
  let stableVh = window.innerHeight, stableW = window.innerWidth;

  // FLIP: how far the form's photos / file must travel to land on the claim screen's ones
  const flipPairs = [
    [formScreen.querySelector('.form__photos'), section.querySelector('.claim__photos')],
    [formScreen.querySelector('.form__file'), section.querySelector('.claim__file')],
  ];
  const measureFlip = () => {
    const k = formScreen.getBoundingClientRect().width / formScreen.offsetWidth || 1; // sticky stage scale
    flipPairs.forEach(([from, to]) => {
      from.style.transition = 'none';
      from.style.transform = 'none';
      const a = from.getBoundingClientRect();
      from.style.transform = '';
      void from.offsetWidth;
      from.style.transition = '';
      const b = to.getBoundingClientRect();
      if (!a.width || !a.height) return;
      const dx = (b.left - a.left) / k;
      const dy = (b.top - a.top) / k;
      from.style.setProperty('--flip', `translate(${dx}px, ${dy}px) scale(${b.width / a.width}, ${b.height / a.height})`);
    });
  };

  // mobile card stack: current card on top, earlier ones peek out behind, later ones wait below
  const stackCards = (k) => steps.forEach((card, i) => {
    const d = k - i;
    card.dataset.pos = d < 0 ? 'next' : d === 0 ? 'current' : `past${Math.min(d, 3)}`;
  });

  const setStep = (n) => {
    if (n === current) return;
    current = n;
    steps.forEach((s, i) => s.classList.toggle('is-active', i < n));
    fx.forEach((el) => {
      const need = Number(el.dataset.step || 0);
      if (need) el.classList.toggle('is-on', need <= n);
    });
    // 1: fill in the form and send · 2–3: claim screen · 4: the PDF opens with a confirmation
    formScreen.classList.toggle('is-play', n >= 1);
    if (n >= 2 && !formScreen.classList.contains('is-out')) measureFlip();
    formScreen.classList.toggle('is-out', n >= 2);
    pdfScreen.classList.toggle('is-on', n >= 4);
  };

  const layout = () => {
    if (!desktop.matches) return;
    const vh = window.innerHeight;
    const scale = Math.min(1, (vh - HEADER - 24) / STAGE_H);
    const top = Math.max(HEADER, (vh - STAGE_H * scale) / 2 + HEADER / 3);
    section.style.setProperty('--s', scale.toFixed(4));
    section.style.setProperty('--top', `${Math.round(top)}px`);
  };

  const update = () => {
    if (reduced) { stackCards(steps.length - 1); fill(1); return setStep(steps.length); }

    if (desktop.matches) {
      section.style.height = '';
      steps.forEach((c) => delete c.dataset.pos);
      // progress 0..1 while the sticky stage is pinned
      const rect = track.getBoundingClientRect();
      const top = parseFloat(getComputedStyle(section).getPropertyValue('--top')) || HEADER;
      const range = track.offsetHeight - STAGE_H * (parseFloat(section.style.getPropertyValue('--s')) || 1);
      const progress = Math.min(1, Math.max(0, (top - rect.top) / range));
      const pinnedOrPast = rect.top <= top + 1;
      setStep(pinnedOrPast ? Math.min(steps.length, 1 + Math.floor(progress * steps.length)) : (rect.top < window.innerHeight * 0.6 ? 1 : 0));
    } else {
      // mobile: heading + phone + cards are pinned (.steps__pin); scroll moves through the 4 steps
      const pin = section.querySelector('.steps__pin');
      const head = section.querySelector('.section-head');
      const headH = head.offsetHeight + (parseFloat(getComputedStyle(track).marginTop) || 0);
      pin.style.setProperty('--head-h', `${headH}px`);
      const vh = stableVh;
      section.style.height = `${pin.offsetHeight + steps.length * 0.6 * vh}px`;
      const rect = section.getBoundingClientRect();
      const top = parseFloat(getComputedStyle(pin).top) || 0;
      const range = Math.max(1, section.offsetHeight - pin.offsetHeight);
      const progress = Math.min(1, Math.max(0, (top - rect.top) / range));
      const pinned = rect.top <= top + 1;
      const n = pinned ? Math.min(steps.length, 1 + Math.floor(progress * steps.length)) : rect.top < vh * 0.5 ? 1 : 0;
      setStep(n);
      stackCards(Math.max(0, n - 1));
      fill(pinned ? progress : 0);
    }
  };

  layout();
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('load', update);
  window.addEventListener('resize', () => {
    if (window.innerWidth !== stableW || Math.abs(window.innerHeight - stableVh) > 160) { stableW = window.innerWidth; stableVh = window.innerHeight; }
    layout();
    update();
    if (current >= 2) measureFlip();
  });
  desktop.addEventListener('change', () => { layout(); current = -1; update(); });
})();

// "Less time writing": stacked cards + image entrance
(() => {
  const cards = [...document.querySelectorAll('.feature')];
  if (!cards.length) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const wide = window.matchMedia('(min-width: 1001px)');

  if (!reduced) {
    document.documentElement.classList.add('js-anim');
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
      });
    }, { threshold: 0.35 });
    cards.forEach((c) => io.observe(c));
  }

  // Desktop: 20px strips + 20px shrink per side. Mobile: cards are tall, so each one sticks
  // when its bottom reaches the screen bottom (or at the header if it fits), shrinking 10px per side.
  const stack = () => {
    const desk = wide.matches;
    if (!desk) { cards.forEach((c) => { c.style.top = ''; c.style.transform = ''; }); return; } // mobile: no stacking
    const vh = window.innerHeight;
    const STEP = desk ? 20 : 10;
    const deskTop = Math.max(100, vh / 2 - 268);
    const targets = cards.map((c, i) => {
      if (desk) { c.style.top = ''; return deskTop + 20 * i; }
      const t = Math.min(72 + 12 * i, vh - c.offsetHeight - 12);
      c.style.top = `${t}px`;
      return t;
    });
    cards.forEach((card, i) => {
      let covered = 0;
      for (let j = i + 1; j < cards.length; j++) {
        const r = cards[j].getBoundingClientRect();
        covered += Math.min(1, Math.max(0, 1 - (r.top - targets[j]) / Math.min(card.offsetHeight, vh)));
      }
      const w = card.offsetWidth;
      card.style.transform = covered && !reduced ? `scale(${(w - 2 * STEP * covered) / w})` : '';
    });
  };
  stack();
  window.addEventListener('scroll', stack, { passive: true });
  window.addEventListener('resize', stack);
})();

// Stats: count up when the numbers come into view
(() => {
  const nums = [...document.querySelectorAll('.count')];
  if (!nums.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fmt = (n) => n.toLocaleString('en-US');

  nums.forEach((el) => { el.textContent = '0'; });

  const run = (el) => {
    const target = Number(el.dataset.count);
    const dur = 1600;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      el.textContent = fmt(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };

  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { nums.forEach(run); io.disconnect(); }
    });
  }, { threshold: 0.5 });
  io.observe(document.querySelector('.stats__grid'));
})();

// Apple-style reveal: elements rise a little, sharpen out of a blur and fade in as they
// enter the viewport; neighbours that appear together are staggered.
(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const selectors = [
    '.hero__title', '.hero__lead', '.order-card', '.hero .coverage',
    '.steps .section-head > *',
    '.section:not(.steps) > .section-head > *',
    '.feature .tag', '.feature__text > *', '.feature .checklist li', '.feature .btn',
    '.stat', '.team-card', '.clients',
    '.plan',
    '.handle__title',
    '.faq__title', '.faq__item',
    '.refer .team__art', '.refer__body > *',
    '.cta__head > *', '.cta__form > :not(.visually-hidden):not([hidden])',
    '.footer__brand', '.footer__col', '.footer__bottom',
  ];

  const els = [...new Set(selectors.flatMap((sel) => [...document.querySelectorAll(sel)]))];
  els.forEach((el) => el.classList.add('reveal'));

  const io = new IntersectionObserver((entries) => {
    const shown = entries.filter((e) => e.isIntersecting).map((e) => e.target);
    shown
      .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top || a.getBoundingClientRect().left - b.getBoundingClientRect().left)
      .forEach((el, i) => {
        el.style.setProperty('--rd', `${Math.min(i, 8) * 0.08}s`);
        el.classList.add('is-revealed');
        io.unobserve(el);
      });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });

  els.forEach((el) => io.observe(el));
})();

// Demo form: "Have a referral code?" reveals the referral field
(() => {
  const btn = document.querySelector('.cta__referral');
  const field = document.getElementById('f-ref');
  const wrap = field && (field.closest('.float') || field);
  if (!btn || !field) return;
  btn.addEventListener('click', () => {
    const open = wrap.hidden;
    wrap.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
    if (open) field.focus();
  });
})();

// Aurora backgrounds: only animate while on screen
(() => {
  const els = document.querySelectorAll('.aurora');
  if (!els.length || !('IntersectionObserver' in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => e.target.classList.toggle('is-paused', !e.isIntersecting));
  });
  els.forEach((el) => io.observe(el));
})();

// "We handle…": card 1 → dot → line → dot → card 2 → item 1 → divider → item 2
(() => {
  const box = document.querySelector('.handle__cards');
  if (!box || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  box.classList.add('js-handle');
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { box.classList.add('is-play'); io.disconnect(); }
  }, { threshold: 0.15, rootMargin: '0px 0px -15% 0px' }); // tall stacked cards on phones still trigger
  io.observe(box);
})();

// Mobile first screen: place the content so the last line ("Remote estimating support…")
// ends just above the bottom edge of the screen; on short phones tighten the spacing first
(() => {
  const hero = document.querySelector('.hero');
  const last = hero && hero.querySelector('.coverage');
  if (!hero || !last) return;
  const mobile = window.matchMedia('(max-width: 768px)');
  let lastW = 0;
  const MIN_TOP = 16;     // gap under the header (the header itself takes its own place in the flow)
  const BOTTOM_GAP = 12; // the last line ends just above the screen edge
  const fit = () => {
    hero.style.marginTop = '';
    hero.classList.remove('is-tight');
    if (!mobile.matches) return;
    const vh = window.innerHeight;
    const place = () => {
      const base = parseFloat(getComputedStyle(hero).marginTop) || 0;
      const bottom = last.getBoundingClientRect().bottom + window.scrollY;
      const want = base + (vh - BOTTOM_GAP - bottom);
      hero.style.marginTop = `${Math.max(MIN_TOP, want)}px`;
      return want >= MIN_TOP;
    };
    hero.style.marginTop = '';
    if (!place()) {                       // short phone: tighten the spacing and place again
      hero.style.marginTop = '';
      hero.classList.add('is-tight');
      place();
    }
  };
  fit();
  window.addEventListener('load', fit);
  window.addEventListener('resize', () => { if (window.innerWidth !== lastW) { lastW = window.innerWidth; fit(); } });
  document.fonts && document.fonts.ready.then(fit);
})();

// Header over dark blocks (main page; the variant page does this in smoke.js together with its backdrops)
(() => {
  if (document.body.classList.contains('variant-smoke')) return;
  const header = document.querySelector('.header');
  const nav = header && header.querySelector('.nav');
  if (!nav) return;
  const dark = [...document.querySelectorAll('.team-card, .cta__card')];
  const update = () => {
    const n = nav.getBoundingClientRect();
    const mid = n.top + n.height / 2;
    header.classList.toggle('on-dark', dark.some((el) => {
      const r = el.getBoundingClientRect();
      return mid > r.top && mid < r.bottom;
    }));
  };
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();
})();
