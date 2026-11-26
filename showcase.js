(() => {
  const $ = (q, r = document) => r.querySelector(q);
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h != null) e.innerHTML = h; return e; };
  const P = window.PAPER || {}, SITE = window.SITE || {}, S = 'assets/story/';
  const onView = (e, f, th = 0.3) => { const io = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { f(); io.unobserve(x.target); } }), { threshold: th }); io.observe(e); };
  const lb = $('#lightbox');
  const zoom = (src, t) => { if (!lb) return; $('img', lb).src = src; $('p', lb).textContent = t || ''; lb.classList.add('show'); };
  const GC = { Proprietary: '#6aa8ff', 'Open-weight': '#a98bff', Embodied: '#fbbf4d' };

  (function wall() {
    const host = $('#libwall'), head = $('#lib-head'); if (!host || !SITE.gallery) return;
    const N = SITE.numbers.disciplines || {};
    const D = [['common', 'General laboratory', '#6aa8ff'], ['chemistry', 'Chemistry', '#fbbf4d'], ['biology', 'Biology', '#3fdca0'], ['medical_laboratory', 'Medical laboratory', '#ff7a9a'], ['physics', 'Physics', '#a98bff']];
    head.innerHTML = D.map(([k, n, c]) => `<button data-k="${k}" style="--c:${c}"><b data-count="${N[k] || 0}">${N[k] || 0}</b><span>${n}</span></button>`).join('');
    D.forEach(([k, n, c], r) => {
      const items = SITE.gallery.filter(g => g.discipline.slice(3) === k);
      if (!items.length) return;
      const row = el('div', 'lrow'); row.dataset.k = k; row.style.setProperty('--c', c);
      const track = el('div', 'ltrack' + (r % 2 ? ' rev' : ''));
      const card = g => `<figure data-id="${g.id}"><img src="assets/gallery/thumb/${g.id}.webp" loading="lazy" alt="${g.name}"><figcaption>${g.name}</figcaption></figure>`;
      const html = items.map(card).join('');
      track.innerHTML = html + html;
      track.style.animationDuration = `${Math.max(40, items.length * 3.2)}s`;
      row.append(el('span', 'ltag', n), track); host.append(row);
      track.addEventListener('click', e => { const f = e.target.closest('figure'); if (f) zoom(`assets/gallery/full/${f.dataset.id}.webp`, f.querySelector('figcaption').textContent); });
    });
    head.querySelectorAll('button').forEach(b => b.onclick = () => {
      const on = b.classList.toggle('on'); head.querySelectorAll('button').forEach(x => x !== b && x.classList.remove('on'));
      host.querySelectorAll('.lrow').forEach(r => r.classList.toggle('dim', on && r.dataset.k !== b.dataset.k));
    });
  })();

  function board(host, { title, tabs, models, value, fmt, max, note }) {
    host.innerHTML = `<div class="bhead"><h4>${title}</h4><div class="seg">${tabs.map((t, i) => `<button class="${i ? '' : 'on'}">${t[1]}</button>`).join('')}</div></div>
      <div class="blegend">${Object.entries(GC).map(([g, c]) => `<span><i style="background:${c}"></i>${g}</span>`).join('')}${note ? `<em>${note}</em>` : ''}</div><div class="bars"></div>`;
    const wrap = $('.bars', host);
    const rows = models.map(m => { const r = el('div', 'brow', `<span class="bn">${m.name}</span><span class="bt"><i style="background:${GC[m.group] || '#888'}"></i></span><b></b>`); wrap.append(r); return { m, r }; });
    const H = 30;
    wrap.style.height = `${rows.length * H}px`;
    const draw = key => {
      const sorted = rows.map(x => ({ ...x, v: value(x.m, key) })).sort((a, b) => b.v - a.v);
      const mx = max ? max(key) : Math.max(...sorted.map(x => x.v), 1);
      sorted.forEach((x, k) => { x.r.style.transform = `translateY(${k * H}px)`; $('i', x.r).style.width = `${(x.v / mx) * 100}%`; $('b', x.r).textContent = fmt(x.m, key, x.v); x.r.classList.toggle('top', k < 3 && x.v > 0); });
    };
    host.querySelectorAll('.seg button').forEach((b, i) => b.onclick = () => { host.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b)); draw(tabs[i][0]); });
    rows.forEach(x => { $('i', x.r).style.width = '0'; x.r.style.transform = 'translateY(0)'; });
    onView(host, () => draw(tabs[0][0]), 0.2);
  }

  (function x1() {
    const host = $('#x1'); if (!host) return;
    const Q = [
      { tag: 'Part grounding', img: 'q_P75_INS0213_x_axis_knob', crop: [150, 480, 900, 1130], size: [960, 1280], q: 'With the manual page, box the knob that moves the stage along X.', gt: [648, 1034, 725, 1098], pr: [638, 928, 732, 1097], a: 'Lower coaxial knob', who: 'Qwen3.8-Flash-Next', m: 'Boxes both coaxial knobs', ok: false, side: 'q_P75_INS0213_x_axis_knob_m1' },
      { tag: 'Reading', img: 'q_EXT_INS0181_step1_seconds', crop: [30, 70, 1570, 910], size: [1600, 1000], q: 'Ramping at 5 °C/s, then holding Step 1: how many seconds until Step 1 ends?', a: '194 s (14 s ramp from 25 to 95 °C + 3:00 hold)', who: 'GLM-5.3-Flash, Qwen3.8-Flash-Next', m: '194 s', ok: true },
      { tag: 'Action grounding', img: 'q_INS0104_next_action_grounding', crop: [110, 220, 880, 640], size: [960, 960], q: 'To replace the thermal block, what is the next action and where?', gt: [441, 323, 505, 352], pr: [452, 322, 508, 368], a: 'Press the release lever down', who: 'GLM-5.3-Flash', m: 'Right lever, but pulls it', ok: false },
      { tag: 'Readiness', img: 'q_EXP_INS0264_over_power', crop: [130, 140, 1500, 700], size: [1600, 900], q: 'Setting 7 A at 24 V: can this run start?', gt: [320, 288, 548, 344], pr: [315, 280, 845, 415], a: 'No: 168 W exceeds the 150 W rating', who: 'GLM-5.3-Flash', m: 'Right verdict, but boxes several readouts', ok: false },
      { tag: 'Readiness', img: 'q_EXP_INS0213_nosepiece_high', crop: [30, 230, 880, 740], size: [960, 960], q: 'Can the nosepiece be turned to the next objective now?', gt: [63, 353, 841, 719], pr: [270, 335, 580, 470], a: 'No: the stage is still raised under the objectives', who: 'GLM-5.3-Flash', m: 'Right verdict, boxes the objectives', ok: false },
      { tag: 'Part grounding', img: 'q_P75_INS0026_menu_next_item', crop: [120, 520, 820, 808], size: [960, 960], q: 'Box the key that steps to the next menu item.', gt: [393, 721, 481, 759], pr: [483, 699, 530, 727], a: 'The TARE key, as the manual specifies', who: 'Qwen3.8-Flash-Next', m: 'The key next to it', ok: false },
      { tag: 'Reading', img: 'q_INS0023_reading_temperature_set', crop: [180, 260, 1100, 640], size: [1280, 960], q: 'What is the temperature setpoint?', a: '175 °C', who: 'Claude Haiku 5.5, DeepSeek-V4.1-Flash', m: '750 °C (the 750 rpm speed setpoint)', ok: false },
    ];

    Q[1].num = [193, 195]; Q[1].unit = 's'; Q[6].num = [175, 175]; Q[6].unit = '°C';
    const kindOf = d => d.num ? 'read' : d.tag === 'Readiness' ? 'ready' : 'box';
    const ASK = { box: 'Tap the image where you would act.', ready: 'Can it be done right now?', read: 'Type your reading.' };
    host.innerHTML = `<div class="sc-list"></div><div class="sc-view"><div class="sc-img"><svg></svg><div class="sc-ask"></div></div><div class="sc-info"></div></div>
      <div class="sc-tally"><span>You <b id="t-you">0</b> / <i id="t-n">0</i></span><span>Models <b id="t-m">0</b> / <i id="t-n2">0</i></span></div>`;
    const list = $('.sc-list', host), svg = $('.sc-img svg', host), info = $('.sc-info', host), ask = $('.sc-ask', host);
    const res = Q.map(() => null); let k = 0, phase = 'ask', verdict = null;
    const tally = () => {
      $('#t-you').textContent = res.filter(r => r && r.ok).length; $('#t-n').textContent = $('#t-n2').textContent = res.filter(Boolean).length;
      $('#t-m').textContent = res.map((r, i) => r && Q[i].ok).filter(Boolean).length; };
    const box = (b, c, label, delay) => b ? `<rect class="bx" x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}" stroke="${c}" fill="${c}22" pathLength="1" style="animation-delay:${delay}s"/><text x="${b[0]}" y="${b[1] - 10}" fill="${c}" class="bl" style="animation-delay:${delay}s">${label}</text>` : '';
    const inside = (p, b) => p && b && p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3];
    function draw(d, extra = '') {
      const c = d.crop || [0, 0, d.size[0], d.size[1]];
      svg.setAttribute('viewBox', `${c[0]} ${c[1]} ${c[2] - c[0]} ${c[3] - c[1]}`);
      const sw = Math.max(3, (c[2] - c[0]) / 160);
      svg.innerHTML = `<image href="${S}${d.img}.webp" x="0" y="0" width="${d.size[0]}" height="${d.size[1]}"/>` + extra;
      svg.querySelectorAll('.bx').forEach(r => r.style.strokeWidth = sw); svg.querySelectorAll('.bl').forEach(t => t.style.fontSize = `${sw * 5}px`);
      svg.querySelectorAll('.pt').forEach(e => { e.setAttribute('r', sw * 3.2); e.style.strokeWidth = sw; });
      svg.querySelectorAll('.ptl').forEach(t => t.style.fontSize = `${sw * 5}px`);
    }
    function show(i) {
      k = i; const d = Q[i], r = res[i]; verdict = null;
      list.querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === i));
      if (r) return reveal(r.pt, r.val, r.v, true);
      phase = 'ask'; draw(d); host.classList.add('asking');
      const kd = kindOf(d);
      info.innerHTML = `<span class="pill">${d.tag}</span><p class="sc-q">${d.q}</p>${d.side ? `<button class="sc-side"><img src="${S}${d.side}.webp" alt=""><span>Open the manual page</span></button>` : ''}<p class="sc-hint">${ASK[kd]}</p>
        ${kd === 'ready' ? `<div class="sc-yn"><button data-v="1">Yes, go ahead</button><button data-v="0">No, not now</button></div>` : ''}
        ${kd === 'read' ? `<form class="sc-num"><input type="number" step="any" inputmode="decimal" placeholder="value" required><span>${d.unit}</span><button>Check</button></form>` : ''}
        <button class="sc-skip">Show the answer</button>`;
      ask.textContent = kd === 'box' ? 'Tap to answer' : ''; ask.style.display = kd === 'box' ? '' : 'none';
      info.querySelectorAll('.sc-yn button').forEach(b => b.onclick = () => {
        verdict = b.dataset.v === '1';
        if (verdict) return reveal(null, null, true);
        info.querySelectorAll('.sc-yn button').forEach(x => x.classList.toggle('on', x === b));
        $('.sc-hint', info).textContent = 'Then tap what stops it.'; ask.textContent = 'Tap the blocker'; ask.style.display = '';
      });
      const sd = $('.sc-side', info); if (sd) sd.onclick = () => zoom(`${S}${d.side}.webp`, 'Manual page given with the question');
      const f = $('.sc-num', info); if (f) f.onsubmit = e => { e.preventDefault(); reveal(null, +$('input', f).value); };
      $('.sc-skip', info).onclick = () => reveal(null, null, null, false, true);
    }
    svg.addEventListener('click', e => {
      if (phase !== 'ask') return; const d = Q[k], kd = kindOf(d);
      if (kd === 'read' || (kd === 'ready' && verdict !== false)) return;
      const m = svg.getScreenCTM().inverse(), p = new DOMPoint(e.clientX, e.clientY).matrixTransform(m);
      reveal([Math.round(p.x), Math.round(p.y)], null, verdict);
    });
    function reveal(pt, val, v, again, skipped) {
      const d = Q[k], kd = kindOf(d); phase = 'shown'; host.classList.remove('asking'); ask.style.display = 'none';
      let ok = null, you = '';
      if (!skipped) {
        if (kd === 'box') { ok = inside(pt, d.gt); you = ok ? 'on the target' : 'off the target'; }
        if (kd === 'ready') { ok = v === false && inside(pt, d.gt); you = v ? 'said yes' : ok ? 'said no and found the blocker' : 'said no, but tapped elsewhere'; }
        if (kd === 'read') { ok = val >= d.num[0] && val <= d.num[1]; you = `${val} ${d.unit}`; }
        if (!again) res[k] = { pt, val, v, ok };
      } else if (!again) res[k] = { skipped: true, ok: false };
      const r = res[k] || {};
      const dot = r.pt ? `<circle class="pt ${r.ok ? 'hit' : 'miss'}" cx="${r.pt[0]}" cy="${r.pt[1]}"/><text class="ptl" x="${r.pt[0] + 14}" y="${r.pt[1] + 5}">you</text>` : '';
      draw(d, box(d.gt, '#3fdca0', 'ground truth', 0.15) + box(d.pr, '#ff7a9a', 'model', 0.8) + dot);
      const youLine = r.skipped ? '' : `<div class="sc-a ${r.ok ? 'gt' : 'bad'}"><b>You</b>${r.ok ? '✓ ' : '✗ '}${kd === 'read' ? `${r.val} ${d.unit}` : kd === 'ready' ? (r.v ? 'said yes' : r.ok ? 'said no and found the blocker' : 'said no, but tapped elsewhere') : (r.ok ? 'on the target' : 'off the target')}</div>`;
      info.innerHTML = `<span class="pill">${d.tag}</span><p class="sc-q">${d.q}</p>
        <div class="sc-a gt"><b>Answer</b>${d.a}</div>${youLine}<div class="sc-a ${d.ok ? 'gt' : 'bad'}"><b>${d.who}</b>${d.ok ? '✓ ' : '✗ '}${d.m}</div>
        <div class="sc-next">${k < Q.length - 1 ? '<button class="go">Next question →</button>' : ''}<button class="again">Try again</button></div>`;
      const b = list.children[k]; b.querySelector('i').className = r.skipped ? 'sk' : r.ok ? 'ok' : 'no'; b.querySelector('i').textContent = r.skipped ? '–' : r.ok ? '✓' : '✗';
      const n = $('.go', info); if (n) n.onclick = () => show(k + 1);
      $('.again', info).onclick = () => { res[k] = null; b.querySelector('i').className = ''; b.querySelector('i').textContent = '?'; tally(); show(k); };
      tally();
    }
    Q.forEach((d, i) => { const b = el('button', '', `<i>?</i><span><b>${d.tag}</b><small>${d.q}</small></span>`); b.onclick = () => show(i); list.append(b); new Image().src = S + d.img + '.webp'; });
    show(0); tally();
    const M = P.models || [];
    board($('#b1'), { title: 'Perception and grounding · 18 models', models: M,
      tabs: [['all', 'All'], ['parts', 'Parts'], ['reading', 'Reading'], ['action', 'Action'], ['readiness', 'Readiness']],
      value: (m, k) => m[k], max: () => 100, fmt: (m, k, v) => `${v.toFixed(1)}%` });
  })();

  (function x2() {
    const host = $('#episode'); if (!host) return;
    const EPS = [['dsh_L1-02', 'Centrifuge · L1'], ['dsh_L1-14', 'Microscope at 40× · L1'], ['dsh_L2-06', 'Supply, load, meter · L2'], ['expert_L1-08', 'Expert · pH meter']];
    const CAM = new Set(['Zoom', 'ResetView', 'Rotate', 'Pan', 'Orbit', 'View']);
    const fmtA = a => {
      if (!a) return '';
      const t = a.type, xy = a.x != null ? `${a.x}, ${a.y}` : '';
      if (t === 'Zoom') return `Zoom(${xy}, ×${a.factor})`;
      if (t === 'Wait') return `Wait(${a.seconds} s)`;
      if (t === 'Load') return `Load(${a.sample} → ${a.slot})`;
      if (t === 'Orbit') return `Orbit(az ${a.d_azimuth >= 0 ? '+' : ''}${a.d_azimuth}°, el ${a.d_elevation >= 0 ? '+' : ''}${a.d_elevation}°)`;
      if (t === 'Turn') return a.part ? `Turn(${a.part} → ${a.value})` : `Turn(${xy}, ${a.direction} ${a.amount})`;
      if (t === 'Unload') return `Unload(${a.slot})`;
      if (t === 'Move') return `Move(${a.part ? a.part + ' → ' + a.to : xy + ', ' + (a.direction || a.to)})`;
      if (a.part) return `${t}(${a.part})`;
      if (a.accessory) return `${t}(${a.accessory})`;
      return `${t}(${xy})`;
    };
    host.innerHTML = `
      <div class="ep-tabs"><span class="ep-who">DeepSeek-V4.1-Flash</span>${EPS.map(([k, n], i) => `<button data-k="${k}" class="${i ? '' : 'on'}">${n}</button>`).join('')}</div>
      <div class="ep-play">
        <div class="ep-left">
          <div class="ep-view"><div class="ep-cam"><img class="a" alt="Agent view"><img class="b" alt=""></div>
            <span class="ep-mark"></span><span class="ep-zoom"></span>
            <span class="badge2 stp"></span><span class="badge2 cam"></span><span class="ep-flag"></span></div>
          <div class="ep-ctl">
            <button class="pp" aria-label="Play">▶</button><button class="pv" aria-label="Previous step">‹</button><button class="nx" aria-label="Next step">›</button>
            <div class="ep-track"><div class="ticks"></div><div class="fill"></div><input type="range" min="0" value="0" step="1" aria-label="Step"></div>
            <button class="sp">1×</button>
          </div>
          <div class="ep-legend"><span><i class="k-cam"></i>view change</span><span><i class="k-bad"></i>blocked</span><span><i class="k-vio"></i>safety violation</span><span class="hint">drag the bar or use ← →</span></div>
        </div>
        <div class="ep-side"><div class="task"></div><div class="ep-now"></div><div class="ep-log"></div><div class="ep-stats"></div><div class="score"></div></div>
      </div>`;
    const V = $('.ep-view', host), A = $('img.a', V), B = $('img.b', V), mark = $('.ep-mark', V), zbox = $('.ep-zoom', V), cam = $('.ep-cam', V);
    const range = $('input', host), fill = $('.fill', host), ticks = $('.ticks', host), log = $('.ep-log', host), now = $('.ep-now', host);
    const pp = $('.pp', host), sp = $('.sp', host);
    const cache = {}; let E, key, cur = 0, timer = 0, playing = false, speed = 1, seen = false;
    const src = n => `assets/ep/${key}/${String(n).padStart(3, '0')}.webp`;
    const pre = n => { for (let k = n; k < Math.min(n + 6, E.steps.length + 1); k++) { const u = src(k); if (!cache[u]) { cache[u] = new Image(); cache[u].src = u; } } };
    const kind = (s, i) => E.vio.has(i) ? 'vio' : s.r === 'blocked' ? 'bad' : CAM.has(s.a && s.a.type) ? 'cam' : s.a && s.a.type === 'Done' ? 'done' : '';
    async function load(k) {
      stop(); key = k; host.querySelectorAll('.ep-tabs button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
      E = await (await fetch(`assets/ep/${k}.json`)).json(); if (key !== k) return;
      E.vio = new Set(E.violations.map(v => E.steps.findIndex(s => s.step === v.step && s.r === 'blocked') >= 0 ? E.steps.findIndex(s => s.step === v.step && s.r === 'blocked') : E.steps.findIndex(s => s.step === v.step)));
      $('.task', host).innerHTML = `<b>${E.title}</b>${E.task}`; V.style.aspectRatio = `${E.res[0]} / ${E.res[1]}`;
      const st = E.stats, x = [`<div><b>${st.steps}</b>steps${st.expert_steps && st.expert_steps !== st.steps ? ` · expert ${st.expert_steps}` : ''}</div>`, `<div><b>${st.camera_moves}</b>view changes</div>`, `<div><b>${st.blocked}</b>blocked</div>`, `<div><b>${Math.round(st.sim_time_s)} s</b>simulated</div>`];
      $('.ep-stats', host).innerHTML = x.join('');
      $('.score', host).innerHTML = E.score.map(s => `<div class="${s[2] ? 'pass' : 'fail'}"><b>${s[0]}</b>${s[1]}</div>`).join('');
      range.max = E.steps.length; const N = E.steps.length;
      ticks.innerHTML = E.steps.map((s, i) => { const c = kind(s, i); return c ? `<i class="k-${c}" style="left:${(i + 1) / N * 100}%"></i>` : ''; }).join('');
      log.innerHTML = E.steps.map((s, i) => `<button data-i="${i + 1}" class="${kind(s, i)}"><span class="n">${s.step}</span><code>${fmtA(s.a)}</code>${s.r === 'blocked' ? '<em>blocked</em>' : ''}</button>`).join('');
      log.querySelectorAll('button').forEach(b => b.onclick = () => { stop(); go(+b.dataset.i, false); });
      A.src = src(0); B.style.opacity = 0; cur = -1; go(0, false); pre(1);
      if (seen) play();
    }
    function go(n, anim) {
      n = Math.max(0, Math.min(E.steps.length, n)); const prev = cur; cur = n; pre(n + 1);
      range.value = n; fill.style.width = `${n / E.steps.length * 100}%`;
      const s = n ? E.steps[n - 1] : null, a = s && s.a, [W, H] = E.res;
      log.querySelectorAll('button').forEach((b, i) => b.classList.toggle('on', i === n - 1));
      const on = log.querySelector('button.on'); if (on) log.scrollTop = on.offsetTop - log.clientHeight / 2;
      $('.stp', V).textContent = s ? `step ${s.step} · ${n}/${E.steps.length}` : 'start';
      const c = s ? s.cam : (E.steps[0] && E.steps[0].cam);
      $('.cam', V).innerHTML = c && c[0] != null ? `<i></i>az ${c[0]}° · el ${c[1]}° · span ${c[2].toFixed(2)} m` : '';
      const flag = $('.ep-flag', V), vio = s && E.vio.has(n - 1);
      flag.className = 'ep-flag' + (vio ? ' vio' : s && s.r === 'blocked' ? ' bad' : '');
      const why = s && s.d.replace(/^\w+Error: /, '');
      const vt = vio && E.violations.filter(v => v.step === s.step).map(v => v.text).filter(Boolean).join('; ');
      flag.textContent = vio ? 'Safety violation: ' + (vt || why || 'rule broken') : s && s.r === 'blocked' ? why : '';
      now.innerHTML = s ? `<code>${fmtA(a)}</code><p>${s.note || ''}</p>` : `<p class="dim">${E.task}</p>`;
      $('.score', host).classList.toggle('show', n === E.steps.length);
      const show = () => { A.src = src(n); };
      mark.className = 'ep-mark'; zbox.className = 'ep-zoom'; cam.style.transition = 'none'; cam.style.transform = '';
      if (!anim || prev !== n - 1 || !a) return show();
      const px = a.x != null ? a.x / W * 100 : null, py = a.y != null ? a.y / H * 100 : null;
      if (a.type === 'Zoom' && px != null && a.factor > 1) {

        zbox.style.cssText = `left:${px}%;top:${py}%;width:${100 / a.factor}%;height:${100 / a.factor}%`; zbox.className = 'ep-zoom go';
        cam.style.transformOrigin = `${px}% ${py}%`; void cam.offsetWidth;
        cam.style.transition = `transform ${0.5 / speed}s cubic-bezier(.5,0,.3,1)`; cam.style.transform = `scale(${Math.min(a.factor, 3)})`;
        setTimeout(() => { if (cur === n) { cam.style.transition = 'none'; cam.style.transform = ''; zbox.className = 'ep-zoom'; show(); } }, 500 / speed);
      } else if (a.type === 'ResetView' || (a.type === 'Zoom' && a.factor <= 1)) {
        B.src = src(n); cam.style.transformOrigin = '50% 50%'; cam.style.transition = 'none'; cam.style.transform = 'scale(1.18)'; void cam.offsetWidth;
        show(); cam.style.transition = `transform ${0.45 / speed}s cubic-bezier(.2,.7,.3,1)`; cam.style.transform = '';
      } else if (a.type === 'Orbit') {

        const dx = Math.sign(a.d_azimuth || 0) * 8, dy = Math.sign(a.d_elevation || 0) * -6;
        cam.style.transformOrigin = '50% 50%'; cam.style.transition = 'none'; cam.style.transform = `translate(${dx}%, ${dy}%) scale(1.08)`; cam.style.opacity = .4; void cam.offsetWidth;
        show(); cam.style.transition = `transform ${0.5 / speed}s cubic-bezier(.2,.7,.3,1), opacity ${0.4 / speed}s`; cam.style.transform = ''; cam.style.opacity = 1;
      } else if (px != null) {
        mark.style.left = `${px}%`; mark.style.top = `${py}%`; void mark.offsetWidth; mark.className = 'ep-mark go' + (s.r === 'blocked' ? ' bad' : '');
        setTimeout(() => { if (cur === n) show(); }, 380 / speed);
      } else show();
    }
    const dur = () => { const s = E.steps[cur]; const t = s && s.a && (s.a.type === 'Wait' || CAM.has(s.a.type)) ? 1100 : s && s.r === 'blocked' ? 1500 : 900; return t / speed; };
    function tick() { if (!playing) return; if (cur >= E.steps.length) { stop(); return; } go(cur + 1, true); timer = setTimeout(tick, dur()); }
    function play() { if (cur >= E.steps.length) go(0, false); playing = true; pp.textContent = '❚❚'; clearTimeout(timer); timer = setTimeout(tick, 500); }
    function stop() { playing = false; clearTimeout(timer); pp.textContent = '▶'; }
    pp.onclick = () => playing ? stop() : play();
    $('.pv', host).onclick = () => { stop(); go(cur - 1, false); };
    $('.nx', host).onclick = () => { stop(); go(cur + 1, true); };
    sp.onclick = () => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; sp.textContent = `${speed}×`; };
    range.oninput = () => { stop(); go(+range.value, false); };
    host.tabIndex = 0;
    host.addEventListener('keydown', e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); stop(); go(cur + (e.key === 'ArrowRight' ? 1 : -1), e.key === 'ArrowRight'); } else if (e.key === ' ') { e.preventDefault(); pp.click(); } });
    host.querySelectorAll('.ep-tabs button').forEach(b => b.onclick = () => load(b.dataset.k));
    onView(host, () => { seen = true; load(EPS[0][0]); }, 0.25);
    new IntersectionObserver(es => { if (!es[0].isIntersecting) stop(); }).observe(host);

  })();

  (function x3() {
    const host = $('#x3'); if (!host) return;
    const V = P.vla || [], T = P.vla_tasks || [], R = P.real || [];
    const PC = ['#5ff0e0', '#a98bff', '#fbbf4d', '#ff7a9a'];
    host.innerHTML = `<div class="vwall"><video data-lazy muted loop playsinline preload="none" poster="assets/motion/exp3_wall.jpg?v=20261125c"><source data-src="assets/motion/exp3_wall.mp4?v=20261125c" type="video/mp4"></video>
        ${['Cuvette into spectrophotometer', 'Vial pressed on vortex mixer', 'Vial onto balance', 'Vial into cabinet', 'Vial out of cabinet', 'Flask onto hotplate stirrer'].map((t, i) => `<span style="left:${(i % 3) * 33.33 + 1}%;top:${Math.floor(i / 3) * 50 + 2.5}%">${t}</span>`).join('')}
        </div>
      <div class="x3-charts">
        <div class="cpanel"><div class="bhead"><h4>Policy success in simulation (%)</h4><div class="seg" id="x3-pol">${V.map((v, i) => `<button class="${i === 2 ? 'on' : ''}" style="--c:${PC[i]}">${v.name}</button>`).join('')}</div></div>
          <div class="gbars" id="x3-g">${T.map((t, ti) => `<div class="gcol"><div class="gstack">${V.map((v, i) => `<i style="--c:${PC[i]};--h:${v.tasks[ti]}%" title="${v.name}: ${v.tasks[ti]}%"><em>${v.tasks[ti]}</em></i>`).join('')}</div><span>${t}</span></div>`).join('')}
          <div class="gcol avg"><div class="gstack">${V.map((v, i) => `<i style="--c:${PC[i]};--h:${v.avg}%"><em>${v.avg}</em></i>`).join('')}</div><span>Avg.</span></div></div></div>
        <div class="cpanel"><h4>Zero-shot sim-to-real</h4><p class="sub2">Flask onto a hotplate stirrer, start heating and stirring</p>
          <div class="s2r">${R.map(r => `<div><b>${r.name}</b><div class="pair"><span class="bar"><i class="sim" style="--w:${r.sim}%"></i></span><em>${r.sim}%</em></div><div class="pair"><span class="bar"><i class="real" style="--w:${r.real}%"></i></span><em>${r.real}%</em></div></div>`).join('')}
          <div class="s2rleg"><span><i class="sim"></i>simulation</span><span><i class="real"></i>real bench</span></div></div></div>
      </div>`;
    const g = $('#x3-g');
    const pick = i => { $('#x3-pol').querySelectorAll('button').forEach((b, j) => b.classList.toggle('on', j === i)); g.querySelectorAll('.gstack').forEach(s => s.querySelectorAll('i').forEach((x, j) => x.classList.toggle('hi', j === i))); };
    $('#x3-pol').querySelectorAll('button').forEach((b, i) => b.onclick = () => pick(i));
    pick(2);
    onView(host, () => { host.classList.add('in'); }, 0.25);
  })();
})();
