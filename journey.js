import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { tune } from './lite.js?v=20261125h';

const host = document.querySelector('#journey');
if (host) init();

async function init() {
  const S = 'assets/story/';
  const [models, curves] = await Promise.all([fetch('assets/3d/models.json?v=20261125h').then(r => r.json()), fetch(S + 'curves.json').then(r => r.json())]);
  const P = window.PAPER || {};
  const byId = Object.fromEntries(models.map(m => [m.id, m]));

  const STEPS = [
    { t: 'Real instrument', s: 'Photos, manual, dimensions', h: 'Start from the real device' },
    { t: 'Part-level asset', s: 'Named parts, joints, slots', h: 'Every part is its own part' },
    { t: 'Mechanisms', s: 'Physical and electronic', h: 'Mechanisms make it respond' },
    { t: 'Scientific environment', s: 'Process, samples, readings', h: 'Actions have consequences' },
    { t: 'Tasks and scoring', s: 'Checked on simulator state', h: 'Scored on state, not reports' },
    { t: 'Training and evaluation', s: 'See, operate, touch', h: 'Three ways to test an agent' },
    { t: 'Real laboratory', s: 'Sim-to-real transfer', h: 'Back to the real bench' },
  ];
  host.innerHTML = `<div class="j-rail">${STEPS.map((s, i) => `<button><span class="jn">${String(i + 1).padStart(2, '0')}</span><span><b>${s.t}</b><small>${s.s}</small></span><i class="jbar"></i></button>`).join('')}</div>
    <div class="j-3d"><div class="j-hud"><span class="step" id="j-step"></span><h3 id="j-h"></h3><div class="j-w" id="j-w"></div></div><div class="j-legend" id="j-legend"></div></div>`;
  const stage = host.querySelector('.j-3d'), hud = host.querySelector('.j-hud'), W = host.querySelector('#j-w'), legend = host.querySelector('#j-legend');
  const btns = host.querySelectorAll('.j-rail button');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const tick = tune(renderer);
  stage.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.85;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 100);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.autoRotate = true; controls.autoRotateSpeed = 1.1; controls.enableZoom = false; controls.maxPolarAngle = Math.PI * 0.5;
  scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x0b0f17, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 2.1); key.position.set(2.2, 3.4, 2.6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -1.2, right: 1.2, top: 1.2, bottom: -1.2 }); scene.add(key);
  const rA = new THREE.DirectionalLight(0x5ff0e0, 1.5); rA.position.set(-3, 1.6, -2.4); scene.add(rA);
  const rB = new THREE.DirectionalLight(0xa98bff, 1.2); rB.position.set(3, 1, -3); scene.add(rB);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 96), new THREE.ShadowMaterial({ opacity: 0.45 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const rings = new THREE.Group(); scene.add(rings);
  for (let i = 1; i <= 5; i++) { const m = new THREE.Mesh(new THREE.RingGeometry(0.28 * i - 0.002, 0.28 * i + 0.002, 128), new THREE.MeshBasicMaterial({ color: i % 2 ? 0x5ff0e0 : 0xa98bff, transparent: true, opacity: 0.25 / i, depthWrite: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.001; rings.add(m); }
  const resize = () => { const cv = renderer.domElement, w = cv.clientWidth || stage.clientWidth, h = cv.clientHeight || stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h;
    if (w > 900) camera.setViewOffset(w, h, -w * 0.17, 0, w, h); else camera.clearViewOffset();
    controls.enableRotate = w > 760; cv.style.touchAction = w > 760 ? 'none' : 'pan-y';
    camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(stage); resize();

  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const cache = new Map();
  const tmp = [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()];
  async function load(id) {
    if (cache.has(id)) return cache.get(id);
    const info = byId[id] || { id, part_body: {}, joints: [], shown: [] }, gltf = await loader.loadAsync(`assets/3d/${id}.glb?v=20261125h`), root = gltf.scene;
    const junk = []; root.traverse(o => { if (/studio_floor|__hit_|__readout_|collider|collision/i.test(o.name)) junk.push(o); }); junk.forEach(o => o.parent && o.parent.remove(o));
    root.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; o.userData.mat0 = o.material; } });

    const san = THREE.PropertyBinding.sanitizeNodeName, bodyOf = {};
    for (const [k, v] of Object.entries(info.part_body)) bodyOf[san(k)] = v;

    { const used = new Set(Object.values(info.part_body)); info.joints.forEach(j => { if (!used.has(j.child)) bodyOf[san(j.child)] = j.child; }); }
    const groups = {};
    info.joints.forEach(j => { if (!groups[j.child]) { const g = new THREE.Group(); g.matrixAutoUpdate = false; g.userData.body = j.child; root.add(g); groups[j.child] = g; } });
    root.updateMatrixWorld(true);
    const hits = []; root.traverse(o => { if (bodyOf[o.name] && groups[bodyOf[o.name]]) hits.push(o); });
    const set = new Set(hits);
    hits.forEach(o => { let a = o.parent, skip = false; while (a && a !== root) { if (set.has(a) && bodyOf[a.name] === bodyOf[o.name]) { skip = true; break; } a = a.parent; } if (!skip) groups[bodyOf[o.name]].attach(o); });
    const byChild = {}; info.joints.forEach((j, i) => { byChild[j.child] = i; });
    const q = info.joints.map(j => Math.min(j.limits[1], Math.max(j.limits[0], 0)));
    const world = {};
    const pose = b => { if (world[b]) return world[b]; const i = byChild[b]; if (i === undefined) return null; const j = info.joints[i], M = new THREE.Matrix4(), ax = new THREE.Vector3(...j.axis).normalize(), p = new THREE.Vector3(...j.pivot);
      if (j.kind === 'revolute') M.copy(tmp[0].makeTranslation(p.x, p.y, p.z)).multiply(tmp[1].makeRotationAxis(ax, q[i])).multiply(tmp[2].makeTranslation(-p.x, -p.y, -p.z)); else M.makeTranslation(ax.x * q[i], ax.y * q[i], ax.z * q[i]);
      const par = pose(j.parent); if (par) M.premultiply(par); return (world[b] = M); };
    const apply = () => { for (const k in world) delete world[k]; for (const b in groups) { const M = pose(b); if (M) { groups[b].matrix.copy(M); groups[b].matrixWorldNeedsUpdate = true; } } };
    apply();
    const holder = new THREE.Group(); holder.add(root);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3()), s = 1.15 / Math.max(size.x, size.y, size.z);
    root.position.set(-c.x, -box.min.y, -c.z); holder.scale.setScalar(s);
    const e = { info, holder, root, groups, q, apply, height: size.y * s, radius: size.length() * s / 2 };
    cache.set(id, e); return e;
  }
  let cur = null, fly = null, gen = 0;
  async function show(id, dir = [0.7, 0.42, 0.75], dk = 1, ty = 0.5) {
    const g = gen, e = await load(id);
    if (g !== gen) throw new Error('stale step');
    if (cur !== e) { if (cur) scene.remove(cur.holder); cur = e; scene.add(e.holder); }
    const R = e.radius * 1.15, fov = camera.fov * Math.PI / 180, d = R / Math.sin(fov / 2) * 1.05 * dk;
    const tgt = new THREE.Vector3(0, e.height * ty, 0), pos = tgt.clone().addScaledVector(new THREE.Vector3(...dir).normalize(), d);
    fly = { t: 0, fP: camera.position.clone(), fT: controls.target.clone(), tP: pos, tT: tgt };
    if (!show.done) { camera.position.copy(pos); controls.target.copy(tgt); fly = null; show.done = true; }
    return e;
  }
  const J = (e, re) => e.info.joints.findIndex(j => re.test(j.role || '') || re.test(j.label));

  const tint = (obj, color) => obj.traverse(o => { if (!o.isMesh || o.userData.keep) return; if (!color) { o.material = o.userData.mat0; return; } const m = o.userData.mat0.clone(); m.color = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.15); if (m.emissive) { m.emissive = new THREE.Color(color); m.emissiveIntensity = 0.35; } if ('transmission' in m) m.transmission = 0; m.opacity = 1; m.transparent = false; o.material = m; });
  const resetLook = e => { tint(e.root, null); e.root.traverse(o => { if (o.userData.pos0) o.position.copy(o.userData.pos0); if (o.isMesh) o.visible = true; if (o.userData.edge) o.userData.edge.visible = false; }); if (e.disc) e.disc.visible = false; if (e.flask) e.flask.visible = false; e.decel = 0; tagEl.classList.remove('show'); e.info.joints.forEach((j, i) => { e.q[i] = Math.min(j.limits[1], Math.max(j.limits[0], 0)); }); e.apply(); };
  const tweens = [];
  const tween = (e, i, to, ms) => { if (i < 0) return; tweens.push({ e, i, from: e.q[i], to, t0: performance.now(), ms }); };

  const fx = [];
  const tagEl = document.createElement('div'); tagEl.className = 'j-tag'; stage.append(tagEl);
  let tagAt = null;
  const tag = (html, obj, cls = '') => { tagEl.innerHTML = html; tagEl.className = 'j-tag show ' + cls; tagAt = obj; };
  const meshesOf = g => { const a = []; g && g.traverse(o => o.isMesh && !o.userData.keep && a.push(o)); return a; };
  const ghostMat = c => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.035, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  const edgeMat = c => new THREE.LineBasicMaterial({ color: c, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending });
  function ghost(list, color) {
    const gm = ghostMat(color), em = edgeMat(color);
    list.forEach(o => { o.material = gm;
      if (!o.userData.edge) { o.userData.edge = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry, 40), em); o.add(o.userData.edge); }
      o.userData.edge.material = em; o.userData.edge.visible = true; });
  }

  const named = (e, re) => { const a = []; e.root.traverse(o => { if (!o.isMesh || o.userData.keep) return; let n = o; while (n && n !== e.root) { if (re.test(n.name)) { a.push(o); break; } n = n.parent; } }); return a; };
  const glow = (list, color, k = 0.8) => list.forEach(o => { const m = o.userData.mat0.clone(); if (m.emissive) { m.emissive = new THREE.Color(color); m.emissiveIntensity = k; } m.color = new THREE.Color(color); o.material = m; if (o.userData.edge) o.userData.edge.visible = false; });
  const xray = (e, keep, color = 0x6aa8ff) => { const k = new Set(keep.flatMap(x => x.isMesh ? [x] : meshesOf(x))); ghost(meshesOf(e.root).filter(o => !k.has(o)), color); };
  function blurDisc(e, j) {
    if (e.disc) return e.disc;
    const g = e.groups[e.info.joints[j].child]; e.root.updateMatrixWorld(true);
    const wb = new THREE.Box3().setFromObject(g), a = e.root.worldToLocal(wb.min.clone()), b = e.root.worldToLocal(wb.max.clone());
    const box = new THREE.Box3().setFromPoints([a, b]), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    const ax = new THREE.Vector3(...e.info.joints[j].axis).normalize(), along = Math.abs(size.dot(ax));
    const r = Math.sqrt(Math.max(1e-6, size.lengthSq() - along * along)) / 2;
    const cv = document.createElement('canvas'); cv.width = cv.height = 512; const x = cv.getContext('2d');
    for (let i = 0; i < 140; i++) { const rr = 40 + Math.random() * 210, a0 = Math.random() * Math.PI * 2; x.strokeStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.5})`; x.lineWidth = 1 + Math.random() * 3; x.beginPath(); x.arc(256, 256, rr, a0, a0 + 0.6 + Math.random() * 2.2); x.stroke(); }
    const grd = x.createRadialGradient(256, 256, 20, 256, 256, 256); grd.addColorStop(0, 'rgba(255,255,255,.5)'); grd.addColorStop(0.85, 'rgba(255,255,255,.12)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = grd; x.beginPath(); x.arc(256, 256, 256, 0, Math.PI * 2); x.fill();
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const d = new THREE.Mesh(new THREE.CircleGeometry(r * 1.05, 96), new THREE.MeshBasicMaterial({ map: tex, color: 0x5ff0e0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    d.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), ax); d.position.copy(c).addScaledVector(ax, along / 2 + 0.002);
    d.renderOrder = 5; d.userData.mat0 = d.material; d.userData.keep = true; e.root.add(d); e.disc = d; return d;
  }

  const discFx = (e, j) => { const d = blurDisc(e, j); d.visible = true; fx.push((now, dt) => { const v = e.spinV || 0; d.material.opacity = Math.min(0.42, v / 30); d.material.color.set(spinRate < 0 ? 0xfbbf4d : 0x5ff0e0); d.rotateZ(v * dt * 1.7); }); };
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x5ff0e0, wireframe: true, transparent: true, opacity: 0.85 });
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xbffcf6 });
  async function build(id, ms = 3600) {
    const e = await show(id, [0.75, 0.5, 0.7]); resetLook(e);
    e.root.updateMatrixWorld(true);
    const ctr = new THREE.Vector3(0, e.height * 0.5, 0), its = [];
    e.root.traverse(o => { if (!o.isMesh) return; o.userData.pos0 = o.userData.pos0 || o.position.clone(); its.push({ o, wc: new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()) }); });
    its.sort((a, b) => a.wc.y - b.wc.y);
    its.forEach((it, k) => { const dir = it.wc.clone().sub(ctr); dir.y = Math.abs(dir.y) + 0.35; dir.normalize();
      const p0 = it.o.parent.worldToLocal(it.wc.clone()), p1 = it.o.parent.worldToLocal(it.wc.clone().addScaledVector(dir, e.radius * 1.3));
      it.off = p1.sub(p0); it.t = k / its.length * ms; it.o.visible = false; it.o.material = wireMat; });
    const t0 = performance.now(), cnt = W.querySelector('#j-cnt');
    fx.push(now => { let n = 0; its.forEach(it => { const a = Math.min(1, Math.max(0, (now - t0 - it.t) / 650)); if (a <= 0) return; const o = it.o; o.visible = true;
      o.position.copy(o.userData.pos0).addScaledVector(it.off, Math.pow(1 - a, 3));
      if (a >= 1) { n++; o.material = now - t0 - it.t < 820 ? flashMat : o.userData.mat0; } });
      if (cnt) cnt.textContent = `${n} / ${its.length}`; });
    return e;
  }

  const pip = document.createElement('figure'); pip.className = 'j-pip';
  pip.innerHTML = `<video src="assets/motion/hotplate_demo.mp4" poster="assets/motion/hotplate_demo.jpg" muted loop playsinline preload="none"></video><figcaption>Calibrated simulation scene · expert demonstration</figcaption>`; stage.append(pip);
  function flask(e, plate) {
    if (e.flask) return e.flask;
    e.holder.updateMatrixWorld(true);
    const wb = new THREE.Box3(); plate.forEach(o => wb.expandByObject(o));
    const c = e.root.worldToLocal(wb.getCenter(new THREE.Vector3())), y = e.root.worldToLocal(wb.max.clone()).y;
    const prof = [[0, 0], [0.036, 0], [0.04, 0.006], [0.036, 0.03], [0.014, 0.096], [0.0125, 0.1], [0.0125, 0.134], [0.0145, 0.137], [0.0135, 0.14]].map(([r, h]) => new THREE.Vector2(r, h));
    const g = new THREE.Group(), keep = m => { m.userData.keep = true; m.userData.mat0 = m.material; m.castShadow = true; return m; };
    g.add(keep(new THREE.Mesh(new THREE.LatheGeometry(prof, 48), new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.05, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }))));
    g.children[0].renderOrder = 4;
    const liq = [[0, 0.002], [0.034, 0.002], [0.037, 0.007], [0.033, 0.03], [0.028, 0.045], [0, 0.045]].map(([r, h]) => new THREE.Vector2(r, h));
    g.add(keep(new THREE.Mesh(new THREE.LatheGeometry(liq, 48), new THREE.MeshStandardMaterial({ color: 0x2f9be8, roughness: 0.25, emissive: 0x0b3a66, emissiveIntensity: 0.6 }))));
    const bar = keep(new THREE.Mesh(new THREE.CapsuleGeometry(0.004, 0.024, 4, 12), new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.4 })));
    bar.rotation.z = Math.PI / 2; const bh = new THREE.Group(); bh.position.y = 0.007; bh.add(bar); g.add(bh);
    g.userData.top = new THREE.Vector3(c.x, y + 0.0005, c.z); g.userData.bar = bh; g.visible = false;
    e.root.add(g); e.flask = g; return g;
  }
  const PAL = ['#5ff0e0', '#a98bff', '#fbbf4d', '#ff7a9a', '#6aa8ff', '#3fdca0'];
  let stepTimers = [], spinRate = 0, spinIdx = -1, pulse = null, curveRun = null;
  const later = (ms, f) => stepTimers.push(setTimeout(f, ms));
  function clearStep() {
    stepTimers.forEach(clearTimeout); stepTimers = []; fx.length = 0; tagAt = null; tagEl.classList.remove('show'); tweens.length = 0; spinRate = 0; spinIdx = -1; pulse = null; curveRun = null; legend.innerHTML = ''; pip.classList.remove('show'); pip.querySelector('video').pause();
  }
  async function colorParts(id) {
    const e = await show(id).catch(() => null); if (!e) return; resetLook(e);
    const shown = e.info.shown.filter(i => !e.info.joints[i].continuous || true).slice(0, 5);
    legend.innerHTML = `<b>${e.info.kind}</b>` + shown.map((i, k) => `<span><i style="background:${PAL[k]}"></i>${e.info.joints[i].label}</span>`).join('');
    shown.forEach((i, k) => { const g = e.groups[e.info.joints[i].child]; if (g) tint(g, PAL[k]); });
    shown.forEach((i, k) => { const j = e.info.joints[i]; if (!j.continuous) { const [lo, hi] = j.limits; tween(e, i, Math.abs(hi) >= Math.abs(lo) ? hi : lo, 1400); later(1900, () => tween(e, i, Math.min(hi, Math.max(lo, 0)), 1200)); } });
  }
  const fsm = `<svg viewBox="0 0 420 200" class="fsm2"><defs><marker id="jarr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0L10,5L0,10z" fill="rgba(255,255,255,.4)"/></marker></defs>
    <path class="edge" d="M150,36 H262"/><path class="edge" d="M330,58 V128"/><path class="edge" d="M262,150 H150"/><path class="edge" d="M90,128 V58"/>
    ${[['Idle', 30, 14], ['Run', 270, 14], ['Brake', 270, 128], ['Standstill', 30, 128]].map(([t, x, y], k) => `<g class="node" data-s="${k}"><rect x="${x}" y="${y}" width="120" height="44" rx="12"/><text x="${x + 60}" y="${y + 23}">${t}</text></g>`).join('')}
    <text class="lock" id="j-lock" x="210" y="98" text-anchor="middle"></text></svg>`;
  const setFsm = (s, locked) => { W.querySelectorAll('.node').forEach(n => n.classList.toggle('on', +n.dataset.s === s)); const l = W.querySelector('#j-lock'); if (l) { l.textContent = locked ? '🔒 lid locked' : '🔓 lid unlocked'; l.style.fill = locked ? '#ff7a9a' : '#3fdca0'; } };

  const RUN = [
    async () => {
      const e = await show('INS0025'); resetLook(e);
      W.innerHTML = `<div class="j-photos"><img src="${S}pl_cover.webp" alt=""><img src="${S}pl_controls.webp" alt=""></div><p>Photos and the manual define the asset.</p>`;
      const lid = J(e, /door|lid/); later(900, () => tween(e, lid, e.info.joints[lid].limits[0], 1600));
    },
    async () => {
      const ids = ['INS0129', 'INS0025', 'INS0213'];
      W.innerHTML = `<p>Assembled from named parts; each moving part gets real joints.</p><div class="j-build"><b id="j-cnt">0</b><span>parts placed</span></div><div class="j-models">${ids.map(id => `<span data-id="${id}">${byId[id].kind}</span>`).join('')}</div>`;
      const mark = id => W.querySelectorAll('.j-models span').forEach(s => s.classList.toggle('on', s.dataset.id === id));
      mark(ids[0]); await build(ids[0]);
      later(5200, () => { fx.length = 0; W.querySelector('.j-build').classList.add('done'); mark(ids[1]); colorParts(ids[1]); });
      later(8600, () => { mark(ids[2]); colorParts(ids[2]); });
    },
    async () => {
      const e = await show('INS0025', [0.75, 0.75, 0.6], 1.14, 0.45); resetLook(e); W.innerHTML = fsm;
      const lid = J(e, /door|lid/), rot = J(e, /rotor/), L = e.info.joints[lid], lidG = e.groups[L.child], rotG = e.groups[e.info.joints[rot].child];
      const locks = named(e, /lock_hook|lock_tooth|latch_receiver/);
      spinIdx = rot; e.spinV = 0;
      e.q[lid] = L.limits[0]; e.apply();
      setFsm(0, false); tag('🔓 lid open', lidG, 'ok'); later(300, () => tween(e, lid, 0, 1100));
      later(1500, () => { setFsm(1, true); xray(e, [rotG, ...locks]); ghost(meshesOf(lidG).filter(o => !locks.includes(o)), 0xff5d82); glow(locks, 0xff3b6b, 1.4);
        tag('🔒 locked · rotor running', lidG, 'bad'); spinRate = 16; discFx(e, rot); });
      later(3600, () => { tag('✋ open request refused', lidG, 'bad'); tween(e, lid, L.limits[0] * 0.05, 200); later(220, () => tween(e, lid, 0, 260)); });
      later(4500, () => tag('🔒 locked · rotor running', lidG, 'bad'));
      later(5300, () => { setFsm(2, true); spinRate = -1; glow(locks, 0xfbbf4d, 1.2); tag('🔒 braking · still locked', lidG, 'warn'); });
      later(7600, () => { setFsm(3, false); spinRate = 0; resetLook(e); spinIdx = rot; glow(locks, 0x3fdca0, 1.2); tag('🔓 unlocked at standstill', lidG, 'ok'); tween(e, lid, L.limits[0], 1200); });
    },
    async () => {
      const e = await show('INS0025', [0.55, 1, 0.5], 1.0, 0.5); resetLook(e);
      const rot = J(e, /rotor/); spinIdx = rot; e.spinV = 0;
      xray(e, [e.groups[e.info.joints[rot].child]]); glow(named(e, /^INS0025__tube_(cap|wall)_\d/), 0xfbbf4d, 0.5); discFx(e, rot);
      const cen = curves.centrifuge, T = cen.at(-1)[0];
      const pts = cen.map(p => `${(p[0] / T * 300).toFixed(1)},${(110 - p[1] / 3400 * 100).toFixed(1)}`).join(' ');
      W.innerHTML = `<div class="j-rpm"><b id="j-rpm">0</b><span>rpm</span><em id="j-st">running</em></div><svg viewBox="0 0 300 120" class="j-mini"><line x1="0" x2="300" y1="${110 - 3000 / 3400 * 100}" y2="${110 - 3000 / 3400 * 100}" stroke="#a98bff" stroke-dasharray="4 4"/><polyline points="${pts}" fill="none" stroke="#5ff0e0" stroke-width="2.4" style="filter:drop-shadow(0 0 5px #5ff0e0)"/><line id="j-cur" y1="0" y2="112" stroke="#fff" stroke-opacity=".6"/></svg>`;
      curveRun = { t0: performance.now(), T, dur: 7600, cen };
    },
    async () => {
      const e = await show('INS0025', [0.72, 0.62, 0.7], 1.16, 0.46); resetLook(e);
      const lid = J(e, /door|lid/), rot = J(e, /rotor/), L = e.info.joints[lid], lidG = e.groups[L.child], rotG = e.groups[e.info.joints[rot].child];
      spinIdx = rot; e.spinV = 0;
      const plain = () => { tint(e.root, null); e.root.traverse(o => { if (o.userData.edge) o.userData.edge.visible = false; }); };
      W.innerHTML = `<div class="tk-head"><span class="lv">L1-02</span><b>Centrifuge samples A–E at 2000 ×g for 5 min</b></div>
        <div class="tk-rcf">RCF = 1.118·10<sup>−5</sup>·r·n² → 4458 rpm at r = 9 cm</div>
        <ol class="tk-list">${['Open the lid', 'Load A–E, balance with the water tube', 'Close the lid over the loaded rotor', 'Set 4346–4568 rpm and ≥ 290 s', 'Spin ≥ 290 s in the window, then stop'].map((t, k) => `<li><i></i>${t}<em>${k < 3 ? 'action' : 'target'}</em></li>`).join('')}</ol>
        <div class="tk-live"><span><b id="t5-set">4000</b>rpm set</span><span><b id="t5-rpm">0</b>rpm actual</span><span><b id="t5-t">0</b>s simulated</span><span><b id="t5-m">idle</b>mode</span></div>
        <div class="tk-verdict" id="t5-v"><b>Pass</b><span>all 8 goal predicates hold · 0 safety violations · read from simulator state</span></div>
        <div class="tk-traps"><small>Trap variants, each must be scored as a failure</small>${['Empty tube as balance', 'Only five tubes', 'Speed left at 4000 rpm', '4600 rpm, RCF off by > 5%'].map(t => `<span>${t}</span>`).join('')}</div>`;
      const li = W.querySelectorAll('.tk-list li'), $ = id => W.querySelector(id);
      const check = k => li[k] && li[k].classList.add('ok'), cur5 = k => li.forEach((x, n) => x.classList.toggle('now', n === k));
      const tubes = named(e, /tube_|blue_cap|red_cap/);
      cur5(0); later(300, () => tween(e, lid, L.limits[0], 1000));
      later(1300, () => { check(0); cur5(1); xray(e, [rotG]); glow(tubes, 0xfbbf4d, 0.7); tag('A–E + H₂O · six tubes, balanced', rotG, 'ok'); });
      later(2900, () => { check(1); cur5(2); plain(); tagEl.classList.remove('show'); tagAt = null; tween(e, lid, 0, 1000); });
      later(4000, () => { check(2); cur5(3); tag('🔒 lid locked', lidG, 'ok'); [4100, 4200, 4300, 4400, 4500].forEach((v, n) => later(n * 160, () => { $('#t5-set').textContent = v; })); });
      later(5200, () => { check(3); cur5(4); spinRate = 16; discFx(e, rot); $('#t5-m').textContent = 'running'; tag('▶ 4500 rpm ≈ 2038 ×g', lidG, 'ok'); });
      const T0 = performance.now();
      fx.push(now => { const t = now - T0; let r = 0, sec = 0;
        if (t >= 5200 && t < 9200) { r = 4500 * Math.min(1, (t - 5200) / 1200); sec = Math.min(1, (t - 5200) / 3800) * 300; } else if (t >= 9200) { r = Math.max(0, 4500 * (1 - (t - 9200) / 1700)); sec = 300; }
        const a = $('#t5-rpm'), b = $('#t5-t'); if (a) { a.textContent = Math.round(r / 10) * 10; b.textContent = Math.round(sec); } });
      later(9200, () => { spinRate = -1; $('#t5-m').textContent = 'braking'; tag('braking · lid stays locked', lidG, 'warn'); });
      later(10900, () => { check(4); cur5(-1); spinRate = 0; $('#t5-m').textContent = 'idle'; $('#t5-v').classList.add('show'); tagEl.classList.remove('show'); tagAt = null; });
      W.querySelectorAll('.tk-traps span').forEach((x, n) => later(11700 + n * 650, () => x.classList.add('f')));
    },
    async () => {
      const PH = [0, 6000, 13600];
      W.innerHTML = `<div class="ev-tabs">${['See', 'Operate', 'Touch'].map(t => `<span>${t}<i></i></span>`).join('')}</div><div class="ev-pane" id="ev-p"></div>`;
      const tabs = W.querySelectorAll('.ev-tabs span'), pane = W.querySelector('#ev-p');
      const phase = k => { tabs.forEach((x, n) => { x.classList.toggle('on', n === k); x.classList.toggle('done', n < k); }); pane.classList.remove('in'); void pane.offsetWidth; pane.classList.add('in'); };
      const see = async () => {
        const e = await show('INS0025', [0.62, 0.5, 0.8], 0.95, 0.5); resetLook(e); phase(0);
        const lid = J(e, /door|lid/), rot = J(e, /rotor/), L = e.info.joints[lid], lidG = e.groups[L.child], rotG = e.groups[e.info.joints[rot].child];
        pane.innerHTML = `<svg class="ev-img" viewBox="40 200 880 440"><image href="${S}q_V2_INS0025_open_while_braking.webp" width="960" height="960"/><rect class="gt" x="443" y="330" width="104" height="40" rx="4"/></svg>
          <p class="ev-q"><span class="k">Readiness</span><span>The set time has elapsed. Press <b>open</b> now?</span></p>
          <p class="ev-a"><b>No.</b> The readout still shows a live speed: the rotor is braking. The answer must box that readout.</p>
          <div class="ev-stats"><span><b>${(P.numbers || {}).bench1_questions || 823}</b>questions</span><span><b>4</b>tracks</span><span><b>${(P.numbers || {}).bench1_instruments || 224}</b>instruments</span></div>
          <p class="ev-f">Models pick the right action on 93.4% of items but the right control on only 62.9%.</p>`;
        spinIdx = rot; e.spinV = 9; e.decel = 1.4; spinRate = -1; discFx(e, rot);
        xray(e, [rotG, ...named(e, /display|5810r_|lid_release/)]);
        tag('open now? → no, still braking', lidG, 'warn');
        later(2600, () => { tween(e, lid, L.limits[0] * 0.05, 200); later(220, () => tween(e, lid, 0, 260)); tag('✋ lid stays locked until standstill', lidG, 'bad'); });
      };
      const operate = async () => {
        const e = await show('INS0025', [0.7, 0.55, 0.72], 1.0, 0.5); resetLook(e); phase(1);
        const lid = J(e, /door|lid/), rot = J(e, /rotor/), lidG = e.groups[e.info.joints[lid].child];
        const F = [[9, 'Move(lid, open)', 'executed', ''], [51, 'Press(arrow_up) ×14', 'executed', '4500 rpm ≈ 2038 ×g'], [57, 'Press(start_stop)', 'blocked', 'rotor load is not balanced'], [84, 'Load(H₂O → slot 6)', 'executed', 'six tubes, balanced'], [100, 'Press(start_stop)', 'executed', 'runs 5 min']];
        F.forEach(f => { new Image().src = `assets/ep/dsh_L1-02/${String(f[0]).padStart(3, '0')}.webp`; });
        pane.innerHTML = `<div class="ev-flip"><img alt=""><div class="ev-call"><code></code><em></em></div></div>
          <p class="ev-who">DeepSeek-V4.1-Flash on L1-02 · one tool call per step, RGB view back</p>
          <div class="ev-score"><span class="pass">Goal ✓</span><span class="pass">Validity ✓</span><span class="fail">Safety ✗</span><b>→ rejected</b></div>
          <div class="ev-stats"><span><b>${(P.numbers || {}).bench2_tasks || 35}</b>tasks</span><span><b>60.4%</b>L1 success</span><span><b>30.8%</b>L2 success</span><span><b>1</b>L3 completion</span></div>`;
        const img = pane.querySelector('.ev-flip img'), code = pane.querySelector('.ev-call code'), em = pane.querySelector('.ev-call em'), call = pane.querySelector('.ev-call');
        const keys = named(e, /start_stop/);
        F.forEach((f, n) => later(n * 1150, () => {
          img.src = `assets/ep/dsh_L1-02/${String(f[0]).padStart(3, '0')}.webp`; code.textContent = f[1]; em.textContent = f[3] ? `${f[2]} · ${f[3]}` : f[2]; call.className = 'ev-call ' + (f[2] === 'blocked' ? 'bad' : 'ok');
          if (n === 0) tween(e, lid, e.info.joints[lid].limits[0], 700);
          if (n === 1) tween(e, lid, 0, 700);
          if (n === 2) { glow(keys, 0xff3b6b, 1.4); tag('start refused: load not balanced → safety violation', lidG, 'bad'); }
          if (n === 3) { tint(e.root, null); tag('rebalanced', lidG, 'ok'); }
          if (n === 4) { glow(keys, 0x3fdca0, 1.2); spinIdx = rot; e.spinV = 0; spinRate = 14; discFx(e, rot); tag('▶ running', lidG, 'ok'); }
        }));
        later(F.length * 1150, () => pane.querySelector('.ev-score').classList.add('show'));
      };
      const touch = async () => {
        clearSpin(); const e = await show('INS0027', [0.75, 0.45, 0.78], 1.0, 0.5); resetLook(e); phase(2);
        const V = P.vla || [], best = Math.max(...V.map(v => v.avg), 1);
        pane.innerHTML = `<video class="ev-vid" src="assets/motion/exp3_wall.mp4" poster="assets/motion/exp3_wall.jpg" muted autoplay loop playsinline preload="none"></video>
          <div class="ev-stats"><span><b>5</b>tasks</span><span><b>100</b>verified demos each</span><span><b>50</b>rollouts per task</span></div>
          <div class="ev-vla">${V.slice().sort((a, b) => b.avg - a.avg).map(v => `<div><b>${v.name}</b><span class="bar"><i style="--w:${v.avg / best * 100}%"></i></span><em>${v.avg}%</em></div>`).join('')}</div>
          <p class="ev-f">Average success over five simulated tasks; OpenWAM reaches 84% on cabinet loading.</p>`;
        requestAnimationFrame(() => pane.querySelectorAll('.ev-vla i').forEach(i => i.style.width = 'var(--w)'));
        const door = J(e, /^door$/), D = e.info.joints[door];
        if (door >= 0) { tween(e, door, D.limits[1], 1600); tag('cabinet tasks: hinged door, rigid-body contact', e.groups[D.child], 'ok'); later(4200, () => tween(e, door, 0, 1400)); }
      };
      const clearSpin = () => { spinRate = 0; spinIdx = -1; fx.length = 0; tagEl.classList.remove('show'); tagAt = null; };
      const g = gen, guard = f => async () => { if (g !== gen) return; try { await f(); } catch (err) { if (err.message !== 'stale step') throw err; } };
      await see();
      later(PH[1], guard(async () => { clearSpin(); await operate(); }));
      later(PH[2], guard(touch));
    },
    async () => {
      const e = await show('INS0401', [0.55, 0.62, 0.85], 1.5, 1.15); resetLook(e);
      const R = P.real || [];
      W.innerHTML = `<p>Trained only on SciGenesis demonstrations, deployed zero-shot.</p>
        <div class="rl-flow">${['Calibrated sim scene', '100 expert demos', 'Fine-tune π0.5, OpenWAM', 'Zero-shot on real bench'].map(a => `<span><b>${a}</b></span>`).join('')}</div>
        <ol class="tk-list rl-check">${['Flask rests stably on the plate', 'Heating switched on', 'Stirring switched on'].map(t => `<li><i></i>${t}</li>`).join('')}</ol>
        <div class="j-bars">${R.map(r => `<div><b>${r.name}</b><span class="bar"><i class="sim" style="--w:${r.sim}%"></i></span><em>${r.sim}% sim</em><span class="bar"><i class="real" style="--w:${r.real}%"></i></span><em>${r.real}% real</em></div>`).join('')}</div>
        <small class="rl-note">Same success check in simulation (50 episodes) and on the real bench (50 trials).</small>`;
      pip.classList.add('show'); const pv = pip.querySelector('video'); pv.currentTime = 0; pv.play().catch(() => {});
      const flow = W.querySelectorAll('.rl-flow span'), li = W.querySelectorAll('.rl-check li');
      flow.forEach((x, n) => later(150 + n * 350, () => x.classList.add('on')));
      const plate = named(e, /ceramic_workplate/), fl = flask(e, plate);
      const top = fl.userData.top, start = top.clone().add(new THREE.Vector3(-0.13, 0.08, 0.05));
      fl.position.copy(start); fl.visible = true;
      const T0 = performance.now();
      fx.push(now => { const t = now - T0;
        const a = Math.min(1, Math.max(0, (t - 900) / 1700)), ez = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2, h = ez(Math.min(1, a / 0.65)), v = ez(Math.max(0, (a - 0.45) / 0.55));
        fl.position.set(start.x + (top.x - start.x) * h, start.y + (top.y - start.y) * v, start.z + (top.z - start.z) * h);
        if (t > 4700) fl.userData.bar.rotation.y += Math.min(1, (t - 4700) / 1500) * 0.35; });
      later(2700, () => { li[0].classList.add('ok'); tag('flask on the plate', plate[0], 'ok'); });
      later(3300, () => { glow(named(e, /key_start_stop/), 0x5ff0e0, 1.2); glow([...plate, ...named(e, /heating_wave/)], 0xff6a2a, 0.55); });
      later(4000, () => { li[1].classList.add('ok'); tag('heating on', plate[0], 'warn'); });
      later(4700, () => { glow(named(e, /rotation_indicator|rpm_set|actual_rpm/), 0x5ff0e0, 1); });
      later(5600, () => { li[2].classList.add('ok'); tag('stirring on · success', plate[0], 'ok'); W.querySelectorAll('.j-bars .bar i').forEach(i => i.style.width = 'var(--w)'); });
    },
  ];
  const DUR = [6500, 12200, 9800, 8200, 15600, 20600, 12000];

  let step = -1, t0 = 0, seen = false;
  async function go(i) {
    clearStep(); step = i; t0 = performance.now();
    btns.forEach((b, k) => { b.classList.toggle('on', k === i); b.classList.toggle('done', k < i); b.querySelector('.jbar').style.transform = 'scaleX(0)'; });
    const rail = host.querySelector('.j-rail'), rb = btns[i];
    if (rail.scrollWidth > rail.clientWidth) rail.scrollTo({ left: rb.offsetLeft - (rail.clientWidth - rb.offsetWidth) / 2, behavior: 'smooth' });
    hud.classList.remove('in'); void hud.offsetWidth; hud.classList.add('in');
    host.querySelector('#j-step').textContent = `Step ${i + 1} / 7`; host.querySelector('#j-h').textContent = STEPS[i].h;
    gen++;
    try { await RUN[i](); } catch (err) { if (err.message !== 'stale step') throw err; }
  }
  btns.forEach((b, i) => b.onclick = () => go(i));
  ['INS0129', 'INS0213', 'INS0027', 'INS0401'].forEach(id => load(id).catch(() => {}));
  new IntersectionObserver(es => { seen = es[0].isIntersecting; }, { threshold: 0.2 }).observe(host);
  await go(0);

  const clock = new THREE.Clock();
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05), now = performance.now();
    if (!seen) { t0 += dt * 1000; return; }
    tick();
    const k = Math.min(1, (now - t0) / DUR[step]); btns[step].querySelector('.jbar').style.transform = `scaleX(${k})`;
    if (k >= 1) go((step + 1) % 7);
    if (fly) { fly.t = Math.min(1, fly.t + dt / 1.1); const e = 1 - Math.pow(1 - fly.t, 3); camera.position.lerpVectors(fly.fP, fly.tP, e); controls.target.lerpVectors(fly.fT, fly.tT, e); if (fly.t >= 1) fly = null; }
    if (cur) {
      let dirty = false;
      for (let n = tweens.length - 1; n >= 0; n--) { const w = tweens[n]; if (w.e !== cur) { tweens.splice(n, 1); continue; } const a = Math.min(1, (now - w.t0) / w.ms), s = a < 0.5 ? 2 * a * a : 1 - Math.pow(-2 * a + 2, 2) / 2; w.e.q[w.i] = w.from + (w.to - w.from) * s; dirty = true; if (a >= 1) tweens.splice(n, 1); }
      if (spinIdx >= 0) {
        if (spinRate < 0) { cur.spinV = Math.max(0, (cur.spinV || 0) - dt * (cur.decel || 9)); } else if (spinRate > 0) cur.spinV = Math.min(spinRate, (cur.spinV || 0) + dt * 9); else cur.spinV = Math.max(0, (cur.spinV || 0) - dt * 30);
        if (curveRun) {
          const tt = Math.min(1, (now - curveRun.t0) / curveRun.dur) * curveRun.T, p = curveRun.cen.reduce((a, b) => Math.abs(b[0] - tt) < Math.abs(a[0] - tt) ? b : a);
          cur.spinV = p[1] / 3000 * 16; const r = W.querySelector('#j-rpm'); if (r) { r.textContent = Math.round(p[1]); W.querySelector('#j-st').textContent = p[2]; W.querySelector('#j-cur').setAttribute('x1', tt / curveRun.T * 300); W.querySelector('#j-cur').setAttribute('x2', tt / curveRun.T * 300); }
        }
        if (cur.spinV) { cur.q[spinIdx] += cur.spinV * dt; dirty = true; }
      }
      if (pulse) { const v = 0.5 + 0.5 * Math.sin(now / 220); pulse.forEach(o => { if (o.material === o.userData.mat0) { o.material = o.userData.mat0.clone(); } if (o.material.emissive) { o.material.emissive.set(0xfbbf4d); o.material.emissiveIntensity = 0.25 + v * 0.9; } }); }
      if (dirty) cur.apply();
    }
    fx.forEach(f => f(now, dt));
    if (tagAt) { const b = new THREE.Box3().setFromObject(tagAt), p = b.getCenter(new THREE.Vector3()); p.y = b.max.y; p.project(camera);
      const cv = renderer.domElement; tagEl.style.left = `${(p.x * 0.5 + 0.5) * cv.clientWidth}px`; tagEl.style.top = `${(-p.y * 0.5 + 0.5) * cv.clientHeight}px`; }
    rings.rotation.y += dt * 0.08;
    controls.update(); renderer.render(scene, camera);
  });
}
