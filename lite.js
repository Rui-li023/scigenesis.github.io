import * as THREE from 'three';

const weak = !!(window.SG && window.SG.weak);

export function tune(renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, weak ? 1 : 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = weak ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
  let last = 0, slow = 0; const d = [];
  return function tick() {
    const t = performance.now(), dt = t - last; last = t;
    if (dt > 250 || document.hidden) { d.length = 0; slow = 0; return; }
    d.push(dt); if (d.length < 60) return;
    const med = d.sort((a, b) => a - b)[30], pr = renderer.getPixelRatio(); d.length = 0;
    slow = med > 30 ? slow + 1 : 0;
    if (slow >= 2 && pr > 0.75) { renderer.setPixelRatio(Math.max(0.75, pr - 0.25)); slow = 0; }
  };
}

export function wheelAfterClick(controls, el) {
  controls.enableZoom = false;
  el.addEventListener('pointerdown', () => { controls.enableZoom = true; el.classList.add('zoomable'); });
  el.addEventListener('pointerleave', () => { controls.enableZoom = false; el.classList.remove('zoomable'); });
}
