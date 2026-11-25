(() => {
  const S = window.SITE;
  if (window.PAPER) Object.assign(S.numbers, window.PAPER.numbers);
  const N = S.numbers;
  const $ = (q, r = document) => r.querySelector(q);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const fmt = v => typeof v === 'number' ? v.toLocaleString('en-US') : v;

  const nav = $('#topnav');
  const onScroll = () => nav.classList.toggle('solid', scrollY > 40);
  addEventListener('scroll', onScroll, { passive: true }); onScroll();
  addEventListener('load', () => document.body.classList.toggle('embedded', !!$('.project-site-nav')));

  document.querySelectorAll('[data-n]').forEach(e => { e.textContent = fmt(N[e.dataset.n]); });
  document.querySelectorAll('[data-fig]').forEach(e => { e.src = `assets/fig/${e.dataset.fig}.webp`; e.loading = 'lazy'; });

  const strip = $('#numbers');
  [[N.instruments, 'instrument assets', 'blue'], [N.parts, 'modeled parts', 'blue'],
   [N.mechanisms, 'mechanisms', 'amber'], [N.substances, 'substances', 'green'],
   [N.bench1_questions, 'visual questions', 'violet'], [N.bench2_tasks, 'closed-loop tasks', 'violet']]
    .forEach(([v, l, c], i) => strip.append(el('div', `n ${c} rv d${i % 4}`, `<b data-count="${v}">0</b><span>${l}</span>`)));
  const countUp = b => {
    const to = +b.dataset.count, t0 = performance.now(), D = 1600;
    const step = t => { const k = Math.min(1, (t - t0) / D), e = 1 - Math.pow(1 - k, 4); b.textContent = fmt(Math.round(to * e)); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };

  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('in'); io.unobserve(e.target);
    e.target.querySelectorAll('[data-count]').forEach(countUp);
  }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.rv').forEach(e => io.observe(e));

  const px = document.querySelector('[data-parallax]');
  if (px && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const pano = px.parentElement;
    const upd = () => { const r = pano.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; const k = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; px.style.transform = `translateY(${k * -9}%) scale(1.04)`; };
    addEventListener('scroll', upd, { passive: true }); upd();
  }

  document.addEventListener('pointermove', e => {
    const g = e.target.closest && e.target.closest('.glow'); if (!g) return;
    const r = g.getBoundingClientRect(); g.style.setProperty('--mx', `${e.clientX - r.left}px`); g.style.setProperty('--my', `${e.clientY - r.top}px`);
  }, { passive: true });

  const lb = $('#lightbox');
  lb.onclick = () => lb.classList.remove('show');
  addEventListener('keydown', e => { if (e.key === 'Escape') lb.classList.remove('show'); });

  $('#bib').textContent = S.bibtex;
  $('#bib-copy').onclick = () => navigator.clipboard.writeText(S.bibtex).then(() => { $('#bib-copy').textContent = 'Copied'; setTimeout(() => $('#bib-copy').textContent = 'Copy', 1500); });
})();
