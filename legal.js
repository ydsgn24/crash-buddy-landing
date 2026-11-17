// Legal pages: the contents list highlights the section being read
(() => {
  const links = [...document.querySelectorAll('.legal__toc a')];
  if (!links.length || !('IntersectionObserver' in window)) return;
  const byId = new Map(links.map((a) => [a.getAttribute('href').slice(1), a]));
  const seen = new Set();
  const mark = () => {
    const secs = [...seen].sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);
    const cur = secs[0];
    links.forEach((a) => a.classList.toggle('is-active', !!cur && byId.get(cur.id) === a));
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => (e.isIntersecting ? seen.add(e.target) : seen.delete(e.target)));
    mark();
  }, { rootMargin: '-110px 0px -55% 0px' });
  document.querySelectorAll('.legal__sec').forEach((s) => io.observe(s));
})();

// Contents starts collapsed on phones / tablets, open on desktop
(() => {
  const toc = document.querySelector('.legal__toc');
  if (!toc) return;
  const mq = window.matchMedia('(min-width: 1001px)');
  const sync = () => { toc.open = mq.matches; };
  sync();
  mq.addEventListener('change', sync);
  // on phones, picking a section closes the list
  toc.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => { if (!mq.matches) toc.open = false; }));
  // keep the current tab in view on phones
  const cur = document.querySelector('.legal__tab.is-current');
  if (cur) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
})();
