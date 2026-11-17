// Careers: resume picker + application form (no backend here — shows the confirmation)
(() => {
  const form = document.querySelector('.cr-form');
  if (!form) return;
  const file = form.querySelector('#a-resume');
  const fileBox = form.querySelector('.cr-file');
  const fileName = form.querySelector('.cr-file__name');
  file.addEventListener('change', () => {
    const f = file.files[0];
    fileBox.classList.toggle('has-file', !!f);
    fileName.textContent = f ? f.name : 'Attach resume';
  });

  const error = form.querySelector('.cr-error');
  const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
  const box = (el) => el.closest('.float, .cr-select, .cta__check') || el;
  form.addEventListener('input', (e) => box(e.target).classList.remove('is-invalid'));
  form.addEventListener('change', (e) => box(e.target).classList.remove('is-invalid'));

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
    const bad = [...form.querySelectorAll('[required]')].filter((el) =>
      el.type === 'checkbox' ? !el.checked : el.type === 'email' ? !EMAIL.test(el.value.trim()) : !el.value.trim());
    if (bad.length) {
      bad.forEach((el) => box(el).classList.add('is-invalid'));
      error.textContent = bad.some((el) => el.type === 'checkbox') && bad.length === 1
        ? 'Please accept the Terms of Use to continue.'
        : 'Please fill in the highlighted fields.';
      error.hidden = false;
      if (bad[0].type !== 'checkbox') (bad[0].tagName === 'SELECT' ? box(bad[0]).querySelector('.csel__btn') : bad[0]).focus();
      return;
    }
    error.hidden = true;
    const done = document.querySelector('.tr-join__done');
    done.querySelector('.cr-email').textContent = form.querySelector('#a-email').value.trim();
    form.hidden = true;
    done.hidden = false;
  });
})();

// Requirements card: the resume sheet and the chips appear once, one after another
(() => {
  const media = document.querySelector('.cr-req__media');
  if (!media || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  media.classList.add('js-chips');
  const io = new IntersectionObserver(([e]) => {
    if (e.isIntersecting) { media.classList.add('is-in'); io.disconnect(); }
  }, { threshold: 0.3 });
  io.observe(media);
})();
