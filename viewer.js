import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { tune, wheelAfterClick } from './lite.js?v=20261125b';

const $ = q => document.querySelector(q);
const stage = $('#stage'), tip = $('#v-tip'), load = $('#v-load');
if (stage) init();

async function init() {
  const models = await (await fetch('assets/3d/models.json')).json();

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const tick = tune(renderer);
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.85;

  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  wheelAfterClick(controls, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.07;
  controls.autoRotate = true; controls.autoRotateSpeed = 0.8;
  controls.maxPolarAngle = Math.PI * 0.53;

  scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x0b0f17, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(2.2, 3.4, 2.6); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048); key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 1.2, bottom: -1.2, near: 0.1, far: 10 });
  scene.add(key);
  const rimA = new THREE.DirectionalLight(0x5ff0e0, 1.4); rimA.position.set(-3, 1.6, -2.4); scene.add(rimA);
  const rimB = new THREE.DirectionalLight(0xa98bff, 1.1); rimB.position.set(3, 1.0, -3); scene.add(rimB);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 96), new THREE.ShadowMaterial({ opacity: 0.45 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d');
    const r = g.createRadialGradient(128, 128, 0, 128, 128, 128);
    r.addColorStop(0, 'rgba(95,240,224,0.35)'); r.addColorStop(0.45, 'rgba(106,168,255,0.12)'); r.addColorStop(1, 'rgba(106,168,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 256, 256); return new THREE.CanvasTexture(c);
  })();
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), new THREE.MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  glow.rotation.x = -Math.PI / 2; glow.position.y = -0.001; scene.add(glow);
  const rings = new THREE.Group(); scene.add(rings);
  for (let i = 1; i <= 4; i++) {
    const g = new THREE.RingGeometry(0.32 * i - 0.002, 0.32 * i + 0.002, 128);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x6aa8ff, transparent: true, opacity: 0.22 / i, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.position.y = 0.0005; rings.add(m);
  }

  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const cache = new Map();
  let cur = null, playing = false, playT = 0, visible = true, hovered = null;
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
  const tmpA = new THREE.Matrix4(), tmpB = new THREE.Matrix4(), tmpC = new THREE.Matrix4();

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage); resize();

  function articulate(info, root) {
    const san = THREE.PropertyBinding.sanitizeNodeName;
    const bodyOf = {}; for (const [k, v] of Object.entries(info.part_body)) bodyOf[san(k)] = v;

    { const used = new Set(Object.values(info.part_body)); info.joints.forEach(j => { if (!used.has(j.child)) bodyOf[san(j.child)] = j.child; }); }
    const groups = {};
    for (const j of info.joints) {
      if (groups[j.child]) continue;
      const g = new THREE.Group(); g.matrixAutoUpdate = false; g.name = 'body:' + j.child; root.add(g); groups[j.child] = g;
    }
    root.updateMatrixWorld(true);
    const hits = []; root.traverse(o => { if (bodyOf[o.name] && groups[bodyOf[o.name]]) hits.push(o); });
    const set = new Set(hits);
    for (const o of hits) {
      let a = o.parent, skip = false;
      while (a && a !== root) { if (set.has(a) && bodyOf[a.name] === bodyOf[o.name]) { skip = true; break; } a = a.parent; }
      if (!skip) groups[bodyOf[o.name]].attach(o);
    }
    const byChild = {}; info.joints.forEach((j, i) => { byChild[j.child] = i; });
    const q = info.joints.map(() => 0);
    info.joints.forEach((j, i) => { const lo = j.limits[0], hi = j.limits[1]; q[i] = Math.min(hi, Math.max(lo, 0)); });
    const world = {};
    const pose = body => {
      if (world[body]) return world[body];
      const i = byChild[body]; if (i === undefined) return null;
      const j = info.joints[i], M = new THREE.Matrix4();
      const ax = new THREE.Vector3(...j.axis).normalize(), p = new THREE.Vector3(...j.pivot);
      if (j.kind === 'revolute') M.copy(tmpA.makeTranslation(p.x, p.y, p.z)).multiply(tmpB.makeRotationAxis(ax, q[i])).multiply(tmpC.makeTranslation(-p.x, -p.y, -p.z));
      else M.makeTranslation(ax.x * q[i], ax.y * q[i], ax.z * q[i]);
      const parent = pose(j.parent); if (parent) M.premultiply(parent);
      return (world[body] = M);
    };
    const apply = () => {
      for (const k in world) delete world[k];
      for (const b in groups) { const M = pose(b); if (M) { groups[b].matrix.copy(M); groups[b].matrixWorldNeedsUpdate = true; } }
    };
    apply();
    return { q, apply };
  }

  async function getModel(info) {
    if (cache.has(info.id)) return cache.get(info.id);
    load.classList.remove('hide'); load.querySelector('div').firstChild.textContent = `Loading ${info.kind.toLowerCase()}`;
    const gltf = await loader.loadAsync(`assets/3d/${info.id}.glb`, e => { if (e.total) load.style.setProperty('--p', `${(e.loaded / e.total * 100).toFixed(0)}%`); });
    const root = gltf.scene;

    const junk = []; root.traverse(o => { if (/studio_floor|__hit_|__readout_|collider|collision/i.test(o.name)) junk.push(o); });
    junk.forEach(o => o.parent && o.parent.remove(o));
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; if (o.material) o.material.envMapIntensity = 1; } });
    const holder = new THREE.Group(); holder.add(root);
    const art = articulate(info, root);

    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const s = 1.15 / Math.max(size.x, size.y, size.z);
    root.position.set(-c.x, -box.min.y, -c.z); holder.scale.setScalar(s);
    const entry = { info, holder, root, art, height: size.y * s, radius: size.length() * s / 2 };
    cache.set(info.id, entry);
    return entry;
  }

  function frame(e, instant) {

    const R = e.radius * 1.18, fov = camera.fov * Math.PI / 180;
    const fit = Math.max(R / Math.sin(fov / 2), R / Math.sin(Math.atan(Math.tan(fov / 2) * camera.aspect)));
    const d = fit * 1.12, target = new THREE.Vector3(0, e.height * 0.5, 0);
    const dir = new THREE.Vector3(0.62, 0.42, 0.78).normalize();
    const pos = target.clone().addScaledVector(dir, d);
    if (instant) { controls.target.copy(target); camera.position.copy(pos); }
    else flyTo = { t: 0, fromP: camera.position.clone(), fromT: controls.target.clone(), toP: pos, toT: target };
    controls.minDistance = d * 0.3; controls.maxDistance = d * 2.2;
  }
  let flyTo = null;

  const fmtQ = (j, v) => j.kind === 'revolute' ? `${Math.round(v * 180 / Math.PI)}°` : `${(v * 1000).toFixed(0)} mm`;
  function panel(e) {
    const { info, art } = e;
    $('#v-kind').textContent = info.kind;
    $('#v-name').textContent = info.name;
    const dims = info.dims ? info.dims.map(x => Math.round(x * 100)).join(' × ') + ' cm' : '';
    $('#v-stats').innerHTML = `<div><b>${info.parts}</b><span>parts</span></div><div><b>${info.njoints}</b><span>joints</span></div><div><b>${info.screens || '–'}</b><span>screens</span></div>` + (dims ? `<div style="grid-column:1/-1"><b style="font-size:.95rem">${dims}</b><span>real size</span></div>` : '');
    const box = $('#v-joints'); box.innerHTML = '';
    const seen = {};
    info.shown.forEach(i => {
      const j = info.joints[i];
      seen[j.label] = (seen[j.label] || 0) + 1;
      const name = seen[j.label] > 1 ? `${j.label} ${seen[j.label]}` : j.label;
      const tag = j.role && !['mechanism'].includes(j.role) ? `<em>${j.role.replace('_', ' ')}</em>` : '';
      const d = document.createElement('div'); d.className = 'joint';
      if (j.continuous) {
        d.innerHTML = `<label><b>${name}${tag}</b><span>continuous</span></label><button class="spin">Spin</button>`;
        const b = d.querySelector('button');
        b.onclick = () => { j._spin = !j._spin; b.classList.toggle('on', !!j._spin); b.textContent = j._spin ? 'Stop' : 'Spin'; };
      } else {
        const [lo, hi] = j.limits;
        d.innerHTML = `<label><b>${name}${tag}</b><span>${fmtQ(j, art.q[i])}</span></label><input type="range" min="${lo}" max="${hi}" step="${(hi - lo) / 400}" value="${art.q[i]}">`;
        const r = d.querySelector('input'), sp = d.querySelector('label span');
        const paint = () => r.style.setProperty('--v', `${(art.q[i] - lo) / (hi - lo) * 100}%`);
        r.oninput = () => { stopPlay(); art.q[i] = +r.value; sp.textContent = fmtQ(j, art.q[i]); paint(); art.apply(); };
        j._sync = () => { r.value = art.q[i]; sp.textContent = fmtQ(j, art.q[i]); paint(); };
        paint();
      }
      box.append(d);
    });
    if (!info.shown.length) box.innerHTML = '<p class="vnote" style="margin:0">This instrument is operated through keys and its screen.</p>';
  }

  async function select(id, btn) {
    document.querySelectorAll('#v-picker .vstrip button').forEach(b => b.classList.toggle('on', b === btn));
    const info = models.find(m => m.id === id);
    const e = await getModel(info);
    if (cur) scene.remove(cur.holder);
    cur = e; scene.add(e.holder); clearHover();
    e.info.joints.forEach((j, i) => { e.art.q[i] = Math.min(j.limits[1], Math.max(j.limits[0], 0)); j._spin = false; });
    e.art.apply(); panel(e); frame(e, !select.done); select.done = true;
    load.classList.add('hide');
    startPlay(2600);
  }

  let playDur = 0;
  function startPlay(ms = 4200) { playing = true; playT = 0; playDur = ms; $('#v-play').classList.add('on'); }
  function stopPlay() { playing = false; $('#v-play').classList.remove('on'); }
  $('#v-play').onclick = () => playing ? stopPlay() : startPlay(4200);
  $('#v-rotate').onclick = e => { controls.autoRotate = !controls.autoRotate; e.currentTarget.classList.toggle('on', controls.autoRotate); };
  $('#v-reset').onclick = () => { if (!cur) return; stopPlay(); cur.info.joints.forEach((j, i) => { cur.art.q[i] = Math.min(j.limits[1], Math.max(j.limits[0], 0)); j._spin = false; }); cur.art.apply(); panel(cur); frame(cur); };

  const hiMat = new Map();
  const pretty = n => { const s = n.split('__').pop().replace(/_-?\d+(_\d+)?$/, '').replace(/_/g, ' ').trim(); return s.charAt(0).toUpperCase() + s.slice(1); };
  function clearHover() {
    if (hovered) { hovered.material = hiMat.get(hovered); hovered = null; }
    tip.classList.remove('show');
  }
  renderer.domElement.addEventListener('pointermove', ev => {
    if (!cur || ev.buttons) { clearHover(); return; }
    const r = renderer.domElement.getBoundingClientRect();
    pointer.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObject(cur.holder, true).find(h => h.object.isMesh && h.object.visible);
    if (!hit) { clearHover(); return; }
    const m = hit.object;
    if (m !== hovered) {
      clearHover(); hovered = m;
      if (!hiMat.has(m)) hiMat.set(m, m.material);
      const hm = m.material.clone(); if (hm.emissive) { hm.emissive = new THREE.Color(0x2fd8c8); hm.emissiveIntensity = 0.55; }
      m.material = hm;
      let o = m, name = ''; while (o && !name) { if (o.name && o.name.includes('__')) name = o.name; o = o.parent; }
      const body = cur.info.part_body[name] ? 'moving part' : 'part';
      tip.innerHTML = `<small>${body}</small>${pretty(name || m.name || 'part')}`;
    }
    tip.style.left = `${ev.clientX - r.left}px`; tip.style.top = `${ev.clientY - r.top}px`;
    tip.classList.add('show');
  });
  renderer.domElement.addEventListener('pointerleave', clearHover);
  controls.addEventListener('start', () => { stopPlay(); });

  new IntersectionObserver(es => { visible = es[0].isIntersecting; }, { rootMargin: '200px' }).observe(stage);
  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!visible) return;
    tick();
    if (flyTo) {
      flyTo.t = Math.min(1, flyTo.t + dt / 0.9); const k = 1 - Math.pow(1 - flyTo.t, 3);
      camera.position.lerpVectors(flyTo.fromP, flyTo.toP, k); controls.target.lerpVectors(flyTo.fromT, flyTo.toT, k);
      if (flyTo.t >= 1) flyTo = null;
    }
    if (cur) {
      let dirty = false;
      const J = cur.info.joints;
      if (playing) {
        playT += dt * 1000; const ph = Math.min(1, playT / playDur);
        const k = 0.5 - 0.5 * Math.cos(ph * Math.PI * 2);
        cur.info.shown.forEach(i => { const j = J[i]; if (j.continuous) { cur.art.q[i] += dt * 6 * Math.sin(ph * Math.PI); } else { const [lo, hi] = j.limits; const open = Math.abs(hi) >= Math.abs(lo) ? hi : lo; const base = Math.min(hi, Math.max(lo, 0)); cur.art.q[i] = base + (open - base) * k; } j._sync && j._sync(); });
        dirty = true; if (ph >= 1) stopPlay();
      }
      cur.info.shown.forEach(i => { if (J[i]._spin) { cur.art.q[i] += dt * 9; dirty = true; } });
      if (dirty) cur.art.apply();
    }
    rings.rotation.y += dt * 0.05;
    controls.update();
    renderer.render(scene, camera);
  });

  const pick = $('#v-picker');
  const DN = [['all', 'All'], ['common', 'General'], ['chemistry', 'Chemistry'], ['biology', 'Biology'], ['medical_laboratory', 'Medical'], ['physics', 'Physics']];
  pick.innerHTML = `<div class="vtabs"><span class="vind"></span>${DN.map(([k, n], i) => `<button data-k="${k}" class="${i ? '' : 'on'}">${n}<i>${k === 'all' ? models.length : models.filter(m => m.discipline === k).length}</i></button>`).join('')}<span class="vcount">${models.length} interactive models</span></div>
    <div class="vstrip-wrap"><button class="vnav l" aria-label="Scroll left">&#8249;</button><div class="vstrip"></div><button class="vnav r" aria-label="Scroll right">&#8250;</button></div>`;
  const strip = pick.querySelector('.vstrip'), ind = pick.querySelector('.vind');
  const btnOf = {};
  const DC = { common: '#6aa8ff', chemistry: '#fbbf4d', biology: '#3fdca0', medical_laboratory: '#ff7a9a', physics: '#a98bff' };

  const center = (b, smooth = true) => strip.scrollTo({ left: b.offsetLeft + b.offsetWidth / 2 - strip.clientWidth / 2, behavior: smooth ? 'smooth' : 'auto' });
  let dragged = false;
  models.forEach(m => {
    const b = document.createElement('button'); b.dataset.d = m.discipline; b.style.setProperty('--dc', DC[m.discipline] || '#5ff0e0');
    b.innerHTML = `<img src="assets/gallery/thumb/${m.id}.webp" alt="${m.kind}" loading="lazy"><em></em><span>${m.kind}</span>`;
    b.onclick = () => { if (dragged) return; stopTour(); select(m.id, b); center(b); };
    b.addEventListener('pointermove', e => { const r = b.getBoundingClientRect(); b.style.setProperty('--mx', `${(e.clientX - r.left) / r.width * 100}%`); b.style.setProperty('--my', `${(e.clientY - r.top) / r.height * 100}%`); });
    strip.append(b); btnOf[m.id] = b;
  });

  let raf = 0;
  const depth = () => { raf = 0;
    const c = strip.scrollLeft + strip.clientWidth / 2, half = strip.clientWidth / 2;
    strip.querySelectorAll('button').forEach(b => { if (b.style.display === 'none') return;
      const d = Math.max(-1.4, Math.min(1.4, (b.offsetLeft + b.offsetWidth / 2 - c) / half)), a = Math.abs(d);
      b.style.setProperty('--ry', `${(-d * 22).toFixed(1)}deg`); b.style.setProperty('--sc', (1 - a * 0.14).toFixed(3)); b.style.setProperty('--op', (1 - a * 0.3).toFixed(3)); });
  };
  const queue = () => { if (!raf) raf = requestAnimationFrame(depth); };
  strip.addEventListener('scroll', queue, { passive: true }); addEventListener('resize', queue);

  let dx = null;
  strip.addEventListener('pointerdown', e => { if (e.pointerType !== 'mouse') return; dx = { x: e.clientX, l: strip.scrollLeft }; dragged = false; });
  addEventListener('pointermove', e => { if (!dx) return; const m = e.clientX - dx.x; if (Math.abs(m) > 5) { dragged = true; strip.classList.add('drag'); } if (dragged) strip.scrollLeft = dx.l - m; });
  addEventListener('pointerup', () => { if (!dx) return; dx = null; strip.classList.remove('drag'); setTimeout(() => { dragged = false; }, 0); });

  const moveInd = t => { ind.style.width = `${t.offsetWidth}px`; ind.style.transform = `translateX(${t.offsetLeft}px)`; };
  pick.querySelectorAll('.vtabs button').forEach(t => t.onclick = () => {
    pick.querySelectorAll('.vtabs button').forEach(x => x.classList.toggle('on', x === t)); moveInd(t);
    let n = 0;
    strip.querySelectorAll('button').forEach(b => { const show = t.dataset.k === 'all' || b.dataset.d === t.dataset.k; b.style.display = show ? '' : 'none';
      if (show) { b.classList.remove('enter'); void b.offsetWidth; b.style.animationDelay = `${Math.min(n++, 24) * 25}ms`; b.classList.add('enter'); } });
    const vis = [...strip.children].filter(b => b.style.display !== 'none');
    const on = vis.find(b => b.classList.contains('on')) || vis[Math.floor(vis.length / 4) * 2];
    depth(); on && center(on);
  });
  requestAnimationFrame(() => { moveInd(pick.querySelector('.vtabs button.on')); depth(); });
  addEventListener('resize', () => moveInd(pick.querySelector('.vtabs button.on')));
  pick.querySelector('.vnav.l').onclick = () => strip.scrollBy({ left: -strip.clientWidth * 0.6, behavior: 'smooth' });
  pick.querySelector('.vnav.r').onclick = () => strip.scrollBy({ left: strip.clientWidth * 0.6, behavior: 'smooth' });
  const choose = id => { const b = btnOf[id]; select(id, b); center(b); };

  let tour = null;
  const tourBtn = document.createElement('button'); tourBtn.textContent = 'Tour all'; tourBtn.id = 'v-tour';
  $('.stage-ui').prepend(tourBtn);
  function stopTour() { clearInterval(tour); tour = null; tourBtn.classList.remove('on'); tourBtn.textContent = 'Tour all'; }
  tourBtn.onclick = () => {
    if (tour) return stopTour();
    tourBtn.classList.add('on'); tourBtn.textContent = '■ Stop tour';
    const vis = [...strip.querySelectorAll('button')].filter(b => b.style.display !== 'none');
    let k = Math.max(0, vis.findIndex(b => b.classList.contains('on')));
    const next = () => { k = (k + 1) % vis.length; const id = models[[...strip.children].indexOf(vis[k])].id; choose(id); };
    next(); tour = setInterval(next, 7000);
  };

  const go = new IntersectionObserver(es => { if (es[0].isIntersecting) { go.disconnect(); select(models[0].id, btnOf[models[0].id]); center(btnOf[models[0].id], false); } }, { rootMargin: '600px' });
  go.observe(stage);
}
