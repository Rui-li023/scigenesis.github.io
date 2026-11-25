import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { tune, wheelAfterClick } from './lite.js?v=20261125b';

const host = document.querySelector('#mx');
if (host) init();

const D = Math.PI / 180, STOP = Symbol('stop');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mmss = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

const MECH = [
  { key: 'transmission', kind: 'physical', name: 'Kinematic transmission', cap: 'The focus knob drives the head along its rail.', id: 'INS0215',
    view: { focus: /focus|head|zoom|eyepiece|stand|column/i, k: 1.3, whole: 0.5, dir: [1, 0.15, 0.55] },
    tick(e) { const k = e.q('INS0215__focus_knob'); e.set('INS0215__focus', k >= 0 ? k * 0.02 / 1.2 : k * 0.026); },
    drag: [{ joint: 'INS0215__focus_knob', axis: 'y', k: 0.012 }],
    ctl: [{ t: 'range', label: 'Focus knob', joint: 'INS0215__focus_knob', fmt: v => `${Math.round(v / D)}°` }],
    state: e => [['Knob', `${Math.round(e.q('INS0215__focus_knob') / D)}°`], ['Head travel', `${(e.q('INS0215__focus') * 1000).toFixed(1)} mm`, 'hi']],
    async auto(e, w) { await e.to('INS0215__focus_knob', -1, 2000); await w(500); await e.to('INS0215__focus_knob', 1.2, 2600); await w(400); await e.to('INS0215__focus_knob', 0, 1400); } },

  { key: 'detent', kind: 'physical', name: 'Detent indexing', cap: 'The turret clicks into the next indenter and holds there.', id: 'INS0288',
    view: { focus: /turret|objective|indent/i, k: 1.6, whole: 0.2, dir: [0.35, 0.05, 1] },
    init(e) { e.s.n = 0; },
    tick(e) { e.s.n = clamp(Math.round(e.q('Turret') / (60 * D)), 0, 5); },
    click: [{ joint: 'Turret', on: e => detent(e, e.s.n >= 5 ? 0 : e.s.n + 1) }],
    drag: [{ joint: 'Turret', axis: 'x', k: 0.012, release: e => detent(e, clamp(Math.round(e.q('Turret') / (60 * D)), 0, 5)) }],
    ctl: [{ t: 'btn', label: 'Index ›', on: e => detent(e, e.s.n >= 5 ? 0 : e.s.n + 1) }],
    state: e => [['Position', `${e.s.n + 1} / 6`, 'hi'], ['Turret', `${Math.round(e.q('Turret') / D)}°`]],
    async auto(e, w) { for (const n of [1, 2, 3]) { await w(900); detent(e, n); } await w(1300); detent(e, 0); await w(1200); } },

  { key: 'elastic', kind: 'physical', name: 'Elastic return', cap: 'Lift the syringe clamp and let go: it springs back. Keys return the same way.', id: 'INS0033',
    view: { focus: /syringe_clamp|syringe|plunger/i, k: 1.25, whole: 0.35, dir: [0.45, 0.5, 1] },
    drag: [{ joint: 'INS0033__syringe_clamp_lift', axis: 'y', k: 0.00012, release: e => e.spring('INS0033__syringe_clamp_lift', 0, 160, 5) }],
    click: [{ re: /digit_up|rate|volume|diameter|direction|start_stop/, on: (e, j) => e.press(j) }],
    ctl: [{ t: 'btn', label: 'Lift clamp, release', on: async e => { await e.to('INS0033__syringe_clamp_lift', 0.016, 700); e.spring('INS0033__syringe_clamp_lift', 0, 160, 5); } },
          { t: 'btn', label: 'Press keys', on: async e => { for (const k of ['rate', 'volume', 'diameter', 'start_stop']) { e.press('INS0033__' + k); await e.w(260); } } }],
    state: e => [['Clamp lift', `${(e.q('INS0033__syringe_clamp_lift') * 1000).toFixed(1)} mm`, 'hi'], ['Spring', e.springing('INS0033__syringe_clamp_lift') ? 'returning' : 'at rest']],
    async auto(e, w) { await e.to('INS0033__syringe_clamp_lift', 0.016, 900); await w(500); e.spring('INS0033__syringe_clamp_lift', 0, 160, 5); await w(2000);
      for (const k of ['digit_up_0', 'digit_up_1', 'digit_up_2', 'digit_up_3', 'start_stop']) { e.press('INS0033__' + k); await w(300); } await w(800); } },

  { key: 'loading', kind: 'physical', name: 'Loading and assembly', cap: 'The rack seats in the block only when it arrives within tolerance.', id: 'INS0108',
    view: { dir: [0.6, 0.55, 1], k: 1.0 },
    init(e) { e.set('RackLift', 0); },
    tick(e) { e.s.seated = Math.abs(e.q('RackLift') + 0.12) < 0.0015; },
    drag: [{ joint: 'RackLift', axis: 'y', k: 0.0006, release: seat }],
    ctl: [{ t: 'btn', label: 'Lower to 1 cm above', on: async e => { await e.to('RackLift', -0.11, 1100); seat(e); } },
          { t: 'btn', label: 'Lower to 4 cm above', on: async e => { await e.to('RackLift', -0.08, 1100); seat(e); } },
          { t: 'btn', label: 'Lift', on: e => e.to('RackLift', 0, 1200) }],
    state: e => [['Rack', e.s.seated ? 'seated' : 'not seated', e.s.seated ? 'ok' : 'bad'], ['Height', `${((e.q('RackLift') + 0.12) * 1000).toFixed(0)} mm above seat`]],
    async auto(e, w) { await e.to('RackLift', -0.08, 1300); seat(e); await w(1300); await e.to('RackLift', -0.11, 900); seat(e); await w(1800); await e.to('RackLift', 0, 1400); } },

  { key: 'flexible', kind: 'physical', name: 'Flexible connection', cap: 'The probe cable stays anchored at both ends and follows the arm.', id: 'INS0043',
    view: { dir: [0.9, 0.5, 1], k: 1.0 },
    init: e => cable(e),
    drag: [{ joint: 'INS0043__holder_yaw', axis: 'x', k: 0.008 }, { joint: 'INS0043__probe_arm_lift', axis: 'y', k: 0.00015 }],
    ctl: [{ t: 'range', label: 'Arm lift', joint: 'INS0043__probe_arm_lift', fmt: v => `${(v * 1000).toFixed(0)} mm` },
          { t: 'range', label: 'Holder swing', joint: 'INS0043__holder_yaw', fmt: v => `${Math.round(v / D)}°` }],
    state: e => [['Arm', `${(e.q('INS0043__probe_arm_lift') * 1000).toFixed(0)} mm`], ['Swing', `${Math.round(e.q('INS0043__holder_yaw') / D)}°`], ['Cable', 'anchored', 'ok']],
    async auto(e, w) { await e.to('INS0043__probe_arm_lift', 0.035, 1400); await e.to('INS0043__holder_yaw', -0.75, 1600); await w(300); await e.to('INS0043__holder_yaw', 0.75, 2400);
      await w(300); await e.to('INS0043__holder_yaw', 0, 1300); await e.to('INS0043__probe_arm_lift', 0, 1200); } },

  { key: 'lock', kind: 'physical', name: 'Mechanical locking', cap: 'Vacuum holds the latch; vent first, then the latch frees the door.', id: 'INS0039',
    view: { dir: [0.75, 0.3, 1], k: 1.0 },
    init(e) { e.s.p = 0; e.s.venting = false; },
    tick(e, dt) { if (e.q('INS0039__vent_valve') > 1.2) e.s.p = Math.min(1013, e.s.p + dt * 520); },
    click: [{ joint: 'INS0039__vent_valve', on: e => vent(e) }, { joint: 'INS0039__door_latch', on: e => latch(e) }, { joint: 'INS0039__vacuum_door_hinge', on: e => door39(e) }],
    ctl: [{ t: 'btn', label: '1 · Open door', on: e => door39(e) }, { t: 'btn', label: '2 · Turn latch', on: e => latch(e) }, { t: 'btn', label: '3 · Vent', on: e => vent(e) }],
    state: e => [['Chamber', e.s.p >= 1013 ? '1013 mbar' : e.s.p > 0 ? `venting ${Math.round(e.s.p)} mbar` : 'vacuum', e.s.p >= 1013 ? 'ok' : 'warn'],
      ['Latch', e.q('INS0039__door_latch') > 1.4 ? 'free' : 'locked', e.q('INS0039__door_latch') > 1.4 ? 'ok' : 'bad'], ['Door', e.q('INS0039__vacuum_door_hinge') > 0.1 ? 'open' : 'closed']],
    async auto(e, w) { door39(e); await w(1500); latch(e); await w(1600); vent(e); await w(2700); latch(e); await w(1300); door39(e); await w(2400); } },

  { key: 'control', kind: 'electronic', name: 'Control input', cap: 'The knob writes the setpoint; the display and heater follow.', id: 'INS0095',
    view: { dir: [0.3, 0.45, 1], k: 1.05 },
    init(e) { e.set('INS0095__temperature_knob', knob95(60)); e.s.act = 20; e.s.blink = 0;
      e.s.lcd = e.screen('INS0095__lcd_surface', 480); },
    tick(e, dt) { const set = set95(e); if (set !== e.s.last) { e.s.blink = 1.6; e.s.last = set; } e.s.blink = Math.max(0, e.s.blink - dt); e.s.act += clamp(set - e.s.act, -dt * 6, dt * 6);
      const c = e.s.lcd; if (!c) return; const g = c.ctx, W = c.w, H = c.h;
      g.fillStyle = '#c9d6c2'; g.fillRect(0, 0, W, H); g.fillStyle = '#1b2a22'; g.textAlign = 'right';
      g.font = `700 ${H * 0.42}px ui-monospace, Menlo, monospace`; g.fillText(e.s.act.toFixed(0), W * 0.72, H * 0.5); g.font = `600 ${H * 0.13}px sans-serif`; g.fillText('°C', W * 0.9, H * 0.22);
      if (e.s.blink % 0.4 < 0.28) { g.font = `700 ${H * 0.24}px ui-monospace, Menlo, monospace`; g.fillText(String(set), W * 0.72, H * 0.86); }
      g.textAlign = 'left'; g.font = `700 ${H * 0.1}px sans-serif`; g.fillText('SET', W * 0.08, H * 0.82); g.fillText('ACT', W * 0.08, H * 0.3); c.tex.needsUpdate = true; },
    drag: [{ joint: 'INS0095__temperature_knob', axis: 'x', k: 0.01 }],
    ctl: [{ t: 'range', label: 'Temperature knob', joint: 'INS0095__temperature_knob', fmt: (v, e) => `${set95(e)} °C` }],
    state: e => [['Setpoint', `${set95(e)} °C`, 'hi'], ['Bath', `${e.s.act.toFixed(0)} °C`]],
    async auto(e, w) { await w(600); await e.to('INS0095__temperature_knob', knob95(150), 2200); await w(3200); await e.to('INS0095__temperature_knob', knob95(60), 1600); await w(1200); } },

  { key: 'screen', kind: 'electronic', name: 'Screen and touch', cap: 'Touch regions on the live screen switch pages and start the seal.', id: 'INS0142',
    view: { focus: /touchscreen/i, k: 2.2, dir: [0.45, 0.3, 1], whole: 0.5 },
    init(e) { e.s.page = 'main'; e.s.tap = null; e.s.seal = 0; e.s.lcd = e.screen('Touchscreen_glass', 640, 0.0008); },
    tick(e, dt) { const c = e.s.lcd; if (!c) return; drawSealer(e, c, dt); },
    tap: (e, x, y) => tapSealer(e, x, y),
    ctl: [{ t: 'btn', label: 'Tap SETTINGS', on: e => tapSealer(e, 0.5, 0.82) }, { t: 'btn', label: 'Tap BACK', on: e => tapSealer(e, 0.1, 0.62) }, { t: 'btn', label: 'Tap Seal', on: e => tapSealer(e, 0.5, 0.62) }],
    state: e => [['Page', e.s.page === 'main' ? 'home' : 'settings', 'hi'], ['Sealer', e.s.seal > 0 ? 'sealing' : 'idle', e.s.seal > 0 ? 'warn' : '']],
    async auto(e, w) { await w(800); tapSealer(e, 0.5, 0.82); await w(2000); tapSealer(e, 0.1, 0.62); await w(1500); tapSealer(e, 0.5, 0.62); await w(7000); } },

  { key: 'status', kind: 'electronic', name: 'Status indication', cap: 'Turning the regulator off its stop lights the power lamp; the heat lamp follows the heater as it cycles.', id: 'INS0038',
    view: { focus: /heat_level|lamp|heater_bowl/i, k: 1.15, whole: 0.38, dir: [0.25, 0.45, 1] },
    init(e) { e.s.t = 0; e.s.heat = false; e.s.lamps = { power: e.meshes(/power_lamp$/), heat: e.meshes(/heater_lamp$/), bowl: e.meshes(/woven_heater_bowl/) }; },
    tick(e, dt) { const lv = lv38(e), on = lv > 0.02; e.s.t += dt;
      e.s.heat = on && (e.s.t % 2.4) / 2.4 < lv; e.s.glow = (e.s.glow || 0) + ((e.s.heat ? 1 : 0) - (e.s.glow || 0)) * Math.min(1, dt * 1.5);
      e.emit(e.s.lamps.power, on ? 0xffffff : null, 2.2); e.emit(e.s.lamps.heat, e.s.heat ? 0xffc23a : null, 3); e.emit(e.s.lamps.bowl, on ? 0xff5a1a : null, e.s.glow * lv * 1.6); },
    drag: [{ joint: 'INS0038__heat_level', axis: 'x', k: 0.012 }],
    ctl: [{ t: 'btn', label: 'Off', on: e => e.to('INS0038__heat_level', 0, 900) },
          { t: 'range', label: 'Energy regulator', joint: 'INS0038__heat_level', fmt: (v, e) => (lv38(e) * 10).toFixed(1) }],
    state: e => [['Power', lv38(e) > 0.02 ? 'on' : 'off'], ['Heat level', (lv38(e) * 10).toFixed(1)], ['Heat lamp', e.s.heat ? 'on' : 'off', e.s.heat ? 'warn' : '']],
    async auto(e, w) { await w(700); await e.to('INS0038__heat_level', 2.1, 1500); await w(5000); await e.to('INS0038__heat_level', 4.4, 1200); await w(4500); await e.to('INS0038__heat_level', 0, 1000); await w(800); } },

  { key: 'actuation', kind: 'electronic', name: 'Actuation', cap: 'The motor slews the furnace to its target and stops there.', id: 'INS0019',
    view: { dir: [0.6, 0.35, 1], k: 1.0 },
    joints: e => furnaceJoint(e),
    init(e) { e.s.v = 0; e.s.goal = 0; e.emit(e.meshes(/Touchscreen_Glass/), 0x3a8dff, 0.6); },
    tick(e, dt) { const q = e.q('furnace_lift'), d = e.s.goal - q, vmax = e.s.lim * 0.35; const want = clamp(d * 4, -vmax, vmax);
      e.s.v += clamp(want - e.s.v, -dt * vmax * 2.5, dt * vmax * 2.5); e.set('furnace_lift', q + e.s.v * dt); },
    ctl: [{ t: 'btn', label: '▲ Raise', on: e => { e.s.goal = e.s.lim; } }, { t: 'btn', label: '▼ Lower', on: e => { e.s.goal = 0; } }],
    state: e => [['Furnace', `${(e.q('furnace_lift') * 1000).toFixed(0)} mm`, 'hi'], ['Motor', Math.abs(e.s.v) > 1e-4 ? (e.s.v > 0 ? 'raising' : 'lowering') : 'stopped', Math.abs(e.s.v) > 1e-4 ? 'warn' : '']],
    async auto(e, w) { await w(500); e.s.goal = e.s.lim; await w(4200); e.s.goal = 0; await w(4200); } },

  { key: 'program', kind: 'electronic', name: 'Program and timing', cap: 'Start runs the program: ramp to 12,000 rpm, count down 10 min, brake.', id: 'INS0096',
    view: { dir: [0.35, 0.55, 1], k: 0.95 },
    init(e) { Object.assign(e.s, { ph: 'READY', rpm: 0, t: 600 }); e.s.sp = e.screen('INS0096__speed_lcd_surface', 360); e.s.tm = e.screen('INS0096__timer_lcd_surface', 240); },
    tick(e, dt) { const s = e.s;
      if (s.ph === 'ACCEL') { s.rpm = Math.min(12000, s.rpm + dt * 3200); if (s.rpm >= 12000) s.ph = 'RUN'; }
      if (s.ph === 'RUN' || s.ph === 'ACCEL') { s.t = Math.max(0, s.t - dt * 60); if (s.t <= 0) s.ph = 'BRAKE'; }
      if (s.ph === 'BRAKE') { s.rpm = Math.max(0, s.rpm - dt * 4200); if (s.rpm <= 0) s.ph = 'END'; }
      if (s.rpm > 0) e.set('INS0096__centrifuge_rotor', e.q('INS0096__centrifuge_rotor') + dt * s.rpm / 12000 * 30);
      e.xray(e.meshes(/__lid/), s.rpm > 0);
      lcd(s.sp, (g, W, H) => { g.font = `700 ${H * 0.5}px ui-monospace, Menlo, monospace`; g.textAlign = 'right'; g.fillText(String(Math.round(s.rpm)), W * 0.8, H * 0.62);
        g.font = `600 ${H * 0.16}px sans-serif`; g.fillText('rpm', W * 0.95, H * 0.62); g.textAlign = 'left'; g.fillText(s.ph, W * 0.06, H * 0.9); g.textAlign = 'right'; g.fillText('12000', W * 0.95, H * 0.9); });
      lcd(s.tm, (g, W, H) => { g.font = `700 ${H * 0.42}px ui-monospace, Menlo, monospace`; g.textAlign = 'center'; g.fillText(mmss(s.t), W / 2, H * 0.6); g.font = `600 ${H * 0.15}px sans-serif`; g.fillText('min:s', W / 2, H * 0.88); }); },
    click: [{ joint: 'INS0096__start', on: e => start96(e) }, { joint: 'INS0096__stop', on: e => { e.press('INS0096__stop'); if (e.s.rpm > 0) e.s.ph = 'BRAKE'; } }],
    ctl: [{ t: 'btn', label: 'START', on: e => start96(e) }, { t: 'btn', label: 'STOP', on: e => { e.press('INS0096__stop'); if (e.s.rpm > 0) e.s.ph = 'BRAKE'; } }],
    state: e => [['Program', e.s.ph, e.s.ph === 'READY' || e.s.ph === 'END' ? '' : 'warn'], ['Speed', `${Math.round(e.s.rpm).toLocaleString('en-US')} rpm`, 'hi'], ['Time left', mmss(e.s.t)], ['Clock', '×60', 'dim']],
    async auto(e, w) { await w(600); start96(e); await w(16000); } },

  { key: 'interlock', kind: 'electronic', name: 'Electronic interlock', cap: 'While the run and cool-down last, the lid handle stays locked.', id: 'INS0014',
    view: { dir: [0.55, 0.65, 1], k: 1.0 },
    init(e) { Object.assign(e.s, { ph: 'READY', t: 0 }); e.s.lcd = e.screen('INS0014__microwave_touchscreen_surface', 560); },
    tick(e, dt) { const s = e.s;
      if (s.ph === 'RUN') { s.t -= dt; if (s.t <= 0) { s.ph = 'COOL'; s.t = 3; } } else if (s.ph === 'COOL') { s.t -= dt; if (s.t <= 0) { s.ph = 'DONE'; } }
      lcd(s.lcd, (g, W, H) => { const busy = s.ph === 'RUN' || s.ph === 'COOL';
        g.fillStyle = '#071019'; g.fillRect(0, 0, W, H); g.fillStyle = busy ? '#ff7a9a' : '#3fdca0'; g.font = `700 ${H * 0.16}px sans-serif`; g.textAlign = 'left';
        g.fillText({ READY: 'READY', RUN: 'HEATING', COOL: 'COOLING', DONE: 'RUN COMPLETE' }[s.ph], W * 0.06, H * 0.22);
        g.fillStyle = '#e8eef6'; g.font = `600 ${H * 0.11}px sans-serif`; g.fillText(busy ? '🔒 lid locked' : '🔓 lid can open', W * 0.06, H * 0.42);
        if (s.ph === 'RUN') { g.font = `700 ${H * 0.2}px ui-monospace, Menlo, monospace`; g.fillText(mmss(s.t * 10), W * 0.06, H * 0.7); }
        g.fillStyle = '#1f2a38'; g.fillRect(W * 0.06, H * 0.82, W * 0.88, H * 0.06); g.fillStyle = busy ? '#ff7a9a' : '#3fdca0';
        g.fillRect(W * 0.06, H * 0.82, W * 0.88 * (s.ph === 'RUN' ? 1 - s.t / 6 : s.ph === 'READY' ? 0 : 1), H * 0.06); }, '#071019'); },
    click: [{ joint: 'INS0014__lid_handle_latch', on: e => handle14(e) }, { joint: 'INS0014__chamber_lid_hinge', on: e => handle14(e) }],
    ctl: [{ t: 'btn', label: 'Start run', on: e => run14(e) }, { t: 'btn', label: 'Open lid', on: e => handle14(e) }],
    state: e => { const busy = e.s.ph === 'RUN' || e.s.ph === 'COOL'; return [['Run', e.s.ph, busy ? 'warn' : ''], ['Handle', busy ? 'locked' : e.q('INS0014__lid_handle_latch') > 0.3 ? 'released' : 'free to turn', busy ? 'bad' : 'ok'], ['Lid', e.q('INS0014__chamber_lid_hinge') < -0.1 ? 'open' : 'closed']]; },
    async auto(e, w) { await w(500); run14(e); await w(2200); handle14(e); await w(7800); handle14(e); await w(3200); await e.to('INS0014__chamber_lid_hinge', 0, 1200); await e.to('INS0014__lid_handle_latch', 0, 400); } },
];

function detent(e, n) { e.spring('Turret', n * 60 * D, 260, 9); e.flash(`click · position ${n + 1}`); }
function seat(e) { const q = e.q('RackLift'); if (Math.abs(q + 0.12) < 0.012) { e.to('RackLift', -0.12, 240); e.flash('seated ✓', 'ok'); } else e.flash('outside tolerance · not seated', 'bad'); }
function vent(e) { e.to('INS0039__vent_valve', 1.571, 700); e.flash('vent open · air flows in', 'ok'); }
function latch(e) { if (e.s.p < 1000) { e.shake('INS0039__door_latch', 0.18); e.flash('latch blocked · chamber under vacuum', 'bad'); return; } e.to('INS0039__door_latch', 1.571, 700); e.flash('latch free', 'ok'); }
function door39(e) { if (e.q('INS0039__door_latch') < 1.4) { e.shake('INS0039__vacuum_door_hinge', 0.035); e.flash('door held by the latch', 'bad'); return; } e.to('INS0039__vacuum_door_hinge', e.q('INS0039__vacuum_door_hinge') > 0.5 ? 0 : 1.7, 1300); }
const lv38 = e => Math.max(0, e.q('INS0038__heat_level')) / 5.288;
const set95 = e => Math.round((20 + (e.q('INS0095__temperature_knob') + 2.3) / 4.6 * 160) / 5) * 5;
const knob95 = t => (t - 20) / 160 * 4.6 - 2.3;
function start96(e) { e.press('INS0096__start'); if (e.q('INS0096__lid') < -0.05) { e.flash('close the lid first', 'bad'); return; } if (e.s.ph === 'READY' || e.s.ph === 'END') { Object.assign(e.s, { ph: 'ACCEL', t: 600 }); e.flash('program started', 'ok'); } }
function run14(e) { if (e.s.ph === 'RUN' || e.s.ph === 'COOL') return; e.press('INS0014__console_start'); e.to('INS0014__chamber_lid_hinge', 0, 600); e.to('INS0014__lid_handle_latch', 0, 400); Object.assign(e.s, { ph: 'RUN', t: 6 }); e.flash('run started', 'ok'); }
function handle14(e) {
  if (e.s.ph === 'RUN' || e.s.ph === 'COOL') { e.shake('INS0014__lid_handle_latch', 0.08); e.flash('interlock · handle locked during the run', 'bad'); return; }
  if (e.q('INS0014__chamber_lid_hinge') < -0.1) { e.to('INS0014__chamber_lid_hinge', 0, 1000); return; }
  e.to('INS0014__lid_handle_latch', 0.7, 400).then(() => e.to('INS0014__chamber_lid_hinge', -1.2, 1400)); e.flash('interlock released', 'ok');
}
function lcd(c, draw, bg = '#b8c9a6') { if (!c) return; const g = c.ctx; g.fillStyle = bg; g.fillRect(0, 0, c.w, c.h); g.fillStyle = '#16231b'; draw(g, c.w, c.h); c.tex.needsUpdate = true; }

const SEAL_BTN = { main: [['seal', 0.5, 0.62, 0.44, 0.13], ['settings', 0.5, 0.82, 0.44, 0.11]], settings: [['temp', 0.5, 0.18, 0.4, 0.12], ['time', 0.5, 0.38, 0.4, 0.12], ['load', 0.5, 0.58, 0.4, 0.12], ['back', 0.1, 0.62, 0.16, 0.18], ['next', 0.9, 0.62, 0.16, 0.18]] };
function tapSealer(e, x, y) {
  e.s.tap = { x, y, t: 0 };
  const b = SEAL_BTN[e.s.page].find(([, cx, cy, w, h]) => Math.abs(x - cx) < w / 2 && Math.abs(y - cy) < h / 2);
  if (!b) return;
  if (b[0] === 'settings') e.s.page = 'settings';
  else if (b[0] === 'back' || b[0] === 'next') e.s.page = 'main';
  else if (b[0] === 'seal' && !e.s.seal) sealRun(e);
}
async function sealRun(e) {
  e.s.seal = 1; e.flash('Seal · carriage in, head down', 'ok');
  try { await e.to('INS0142__carriage', 0.17, 1500); e.to('INS0142__film', e.q('INS0142__film') + 2, 1400); await e.to('INS0142__hot_head', -0.027, 700); e.s.sealT = 3;
    await e.w(3000); await e.to('INS0142__hot_head', 0, 600); await e.to('INS0142__carriage', 0, 1500); } catch (err) {  }
  e.s.seal = 0;
}
function drawSealer(e, c, dt) {
  const g = c.ctx, W = c.w, H = c.h, s = e.s; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
  const btn = ([, cx, cy, w, h], fill, text, tc = '#fff') => { g.fillStyle = fill; g.fillRect((cx - w / 2) * W, (cy - h / 2) * H, w * W, h * H); g.fillStyle = tc; g.font = `600 ${H * 0.07}px sans-serif`; g.textAlign = 'center'; g.fillText(text, cx * W, cy * H + H * 0.025); };
  if (s.page === 'main') {
    g.font = `600 ${H * 0.085}px sans-serif`; g.textAlign = 'left';
    [['Temp Set', '145', '#38e04a', '°C'], ['Temp Act', '145', '#ff3b30', '°C'], ['Time Set', '3.0', '#ffd60a', 'secs']].forEach(([l, v, col, u], k) => {
      const y = H * (0.16 + k * 0.13); g.fillStyle = '#fff'; g.fillText(`${l}  =`, W * 0.14, y); g.fillStyle = col; g.textAlign = 'right'; g.fillText(v, W * 0.74, y); g.textAlign = 'left'; g.fillStyle = '#fff'; g.fillText(u, W * 0.78, y); });
    btn(SEAL_BTN.main[0], s.seal ? '#ffb020' : '#2fd52f', s.seal ? 'Sealing…' : 'Seal'); btn(SEAL_BTN.main[1], '#6d8cff', 'SETTINGS');
  } else {
    btn(SEAL_BTN.settings[0], '#6d8cff', 'TEMP'); btn(SEAL_BTN.settings[1], '#6d8cff', 'TIME'); btn(SEAL_BTN.settings[2], '#6d8cff', 'LOAD');
    [[3, -1, 'BACK'], [4, 1, 'NEXT']].forEach(([i, d, t]) => { const [, cx, cy] = SEAL_BTN.settings[i]; g.fillStyle = '#ffd60a'; g.beginPath(); g.moveTo((cx - d * 0.07) * W, cy * H); g.lineTo((cx + d * 0.03) * W, (cy - 0.1) * H); g.lineTo((cx + d * 0.03) * W, (cy + 0.1) * H); g.fill(); g.fillStyle = '#111'; g.font = `700 ${H * 0.04}px sans-serif`; g.textAlign = 'center'; g.fillText(t, cx * W, cy * H + 4); });
  }
  if (s.tap) { s.tap.t += dt; const k = s.tap.t / 0.7; if (k >= 1) s.tap = null; else { g.strokeStyle = `rgba(95,240,224,${1 - k})`; g.lineWidth = 6; g.beginPath(); g.arc(s.tap.x * W, s.tap.y * H, 10 + k * H * 0.22, 0, 7); g.stroke(); g.fillStyle = `rgba(95,240,224,${0.5 * (1 - k)})`; g.beginPath(); g.arc(s.tap.x * W, s.tap.y * H, H * 0.05, 0, 7); g.fill(); } }
  c.tex.needsUpdate = true;
}

function cable(e) {
  const f = e.meta.flex[0]; if (!f) return;
  e.meshes(/probe_cable/).forEach(o => { o.visible = false; });
  const pts = f.pts.map(p => new THREE.Vector3(...p));
  const hold = e.groups[e.joint('INS0043__holder_yaw').child]; e.root.updateMatrixWorld(true);
  const box = new THREE.Box3(); meshesIn(hold).forEach(o => box.expandByObject(o)); const hc = e.root.worldToLocal(box.getCenter(new THREE.Vector3()));
  const moveFirst = pts[0].distanceTo(hc) < pts.at(-1).distanceTo(hc); if (!moveFirst) pts.reverse();
  const mat = new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.45, metalness: 0.1 });
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat); mesh.castShadow = true; mesh.userData.keep = true; e.root.add(mesh);
  const tmp = new THREE.Vector3();
  e.s.cableTick = () => {
    const M = hold.matrix, end = pts[0].clone().applyMatrix4(M), dv = end.clone().sub(pts[0]);
    const cur = pts.map((p, i) => { const t = 1 - i / (pts.length - 1); return tmp.copy(dv).multiplyScalar(t * t * (3 - 2 * t)).add(p).clone(); });
    mesh.geometry.dispose(); mesh.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cur), 90, f.radius, 10, false);
  };
}
function furnaceJoint(e) {
  const g = new THREE.Group(); g.matrixAutoUpdate = false; e.root.add(g);
  const list = []; e.root.traverse(o => { if (/Furnace_/.test(o.name)) list.push(o); });
  list.filter(o => !list.includes(o.parent)).forEach(o => g.attach(o));
  e.root.updateMatrixWorld(true); const b = new THREE.Box3().setFromObject(g), lo = e.root.worldToLocal(b.min.clone()), hi = e.root.worldToLocal(b.max.clone());
  e.s.lim = (hi.y - lo.y) * 1.05;
  e.groups.__furnace = g;
  return [{ name: 'furnace_lift', kind: 'prismatic', axis: [0, 1, 0], pivot: [0, 0, 0], limits: [0, e.s.lim], parent: '', child: '__furnace' }];
}
const meshesIn = g => { const a = []; g && g.traverse(o => o.isMesh && !o.userData.keep && a.push(o)); return a; };

async function init() {
  const META = await fetch('assets/3d/mech.json').then(r => r.json());
  const btn = (m, i) => `<button data-i="${i}" class="${m.kind}"><img src="assets/gallery/thumb/${m.id}.webp" alt="" loading="lazy"><span><b>${m.name}</b><small>${m.cap}</small></span><i class="mx-bar"></i></button>`;
  host.innerHTML = `<div class="mx-list">
      <div class="mx-g physical"><h4><i></i>Physical<em>6</em></h4>${MECH.map((m, i) => m.kind === 'physical' ? btn(m, i) : '').join('')}</div>
      <div class="mx-g electronic"><h4><i></i>Electronic<em>6</em></h4>${MECH.map((m, i) => m.kind === 'electronic' ? btn(m, i) : '').join('')}</div></div>
    <div class="mx-stage"><div class="mx-top"><span class="mx-kind"></span><h3></h3><p></p></div><div class="mx-state"></div><div class="mx-flash"></div>
      <div class="mx-ctl"></div><div class="mx-hint">Drag or click the glowing parts</div><button class="mx-tour on">■ Stop tour</button><div class="mx-load"><span></span></div></div>`;
  const stage = host.querySelector('.mx-stage'), $ = q => stage.querySelector(q), list = host.querySelectorAll('.mx-list button');

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping;
  const tick = tune(renderer); stage.prepend(renderer.domElement);
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture; scene.environmentIntensity = 0.9;
  const camera = new THREE.PerspectiveCamera(30, 1, 0.005, 50);
  const controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.enablePan = false; controls.maxPolarAngle = Math.PI * 0.52; wheelAfterClick(controls, renderer.domElement);
  scene.add(new THREE.HemisphereLight(0xdfeaff, 0x0b0f17, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(1.6, 3, 2.6); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.normalBias = 0.02;
  Object.assign(key.shadow.camera, { left: -1, right: 1, top: 1, bottom: -1 }); scene.add(key);
  const rimA = new THREE.DirectionalLight(0xffb84d, 1.3); rimA.position.set(-3, 1.4, -2); scene.add(rimA);
  const rimB = new THREE.DirectionalLight(0xa98bff, 1.1); rimB.position.set(3, 1, -3); scene.add(rimB);
  const floor = new THREE.Mesh(new THREE.CircleGeometry(3, 96), new THREE.ShadowMaterial({ opacity: 0.45 })); floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const grid = new THREE.Group(); scene.add(grid);
  for (let i = 1; i <= 6; i++) { const r = new THREE.Mesh(new THREE.RingGeometry(0.2 * i - 0.0015, 0.2 * i + 0.0015, 128), new THREE.MeshBasicMaterial({ color: i % 2 ? 0xfbbf4d : 0xa98bff, transparent: true, opacity: 0.22 / i, depthWrite: false })); r.rotation.x = -Math.PI / 2; r.position.y = 0.001; grid.add(r); }
  const resize = () => { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  new ResizeObserver(resize).observe(stage); resize();

  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const glbs = new Map();
  const getGlb = id => { if (!glbs.has(id)) glbs.set(id, loader.loadAsync(`assets/3d/${id}.glb`)); return glbs.get(id); };
  const san = THREE.PropertyBinding.sanitizeNodeName;
  const T = [new THREE.Matrix4(), new THREE.Matrix4(), new THREE.Matrix4()];

  async function build(m) {
    const gltf = await getGlb(m.id), root = gltf.scene.clone(true), meta = META[m.id];
    root.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.castShadow = o.receiveShadow = true; o.userData.mat0 = o.material; } });
    const junk = []; root.traverse(o => { if (/studio_floor|__hit_|__readout_|collider|collision|__page$/i.test(o.name)) junk.push(o); }); junk.forEach(o => o.parent && o.parent.remove(o));
    const e = { m, meta, root, groups: {}, s: {}, tw: [], sp: {}, alive: true };
    const bodyOf = {}; for (const [k, v] of Object.entries(meta.part_body)) bodyOf[san(k)] = v;
    const used = new Set(Object.values(meta.part_body)); meta.joints.forEach(j => { if (!used.has(j.child)) bodyOf[san(j.child)] = j.child; });
    meta.joints.forEach(j => { if (!e.groups[j.child]) { const g = new THREE.Group(); g.matrixAutoUpdate = false; g.name = '__g_' + j.child; root.add(g); e.groups[j.child] = g; } });
    root.updateMatrixWorld(true);
    const hits = []; root.traverse(o => { if (bodyOf[o.name] && e.groups[bodyOf[o.name]]) hits.push(o); }); const hs = new Set(hits);
    hits.forEach(o => { let a = o.parent, skip = false; while (a && a !== root) { if (hs.has(a) && bodyOf[a.name] === bodyOf[o.name]) { skip = true; break; } a = a.parent; } if (!skip) e.groups[bodyOf[o.name]].attach(o); });
    e.J = meta.joints.slice(); if (m.joints) e.J.push(...m.joints(e));
    e.byName = Object.fromEntries(e.J.map((j, i) => [j.name, i])); e.byChild = Object.fromEntries(e.J.map((j, i) => [j.child, i]));
    e.Q = e.J.map(j => clamp(0, j.limits[0], j.limits[1]));

    e.joint = n => e.J[e.byName[n]];
    e.q = n => e.Q[e.byName[n]] ?? 0;
    e.set = (n, v) => { const i = e.byName[n]; if (i === undefined) return; const j = e.J[i]; e.Q[i] = j.kind === 'revolute' && j.limits[1] - j.limits[0] > 1000 ? v : clamp(v, j.limits[0], j.limits[1]); e.dirty = true; };
    e.w = ms => new Promise((res, rej) => setTimeout(() => e.alive ? res() : rej(STOP), ms));
    e.to = (n, v, ms) => { delete e.sp[n]; e.tw = e.tw.filter(t => t.n !== n); return new Promise(res => e.tw.push({ n, from: e.q(n), to: v, t0: performance.now(), ms, res })); };
    e.spring = (n, target, k = 200, c = 10) => { e.tw = e.tw.filter(t => t.n !== n); e.sp[n] = { target, k, c, v: 0 }; };
    e.springing = n => !!e.sp[n];
    e.press = n => { const j = e.joint(n); if (!j) return; const [lo, hi] = j.limits, d = Math.abs(hi) >= Math.abs(lo) ? hi : lo; e.to(n, d, 90).then(() => e.spring(n, 0, 900, 30)); pulse(e.groups[j.child]); };
    e.shake = (n, a) => { const q0 = e.q(n); e.to(n, q0 + a, 120).then(() => e.to(n, q0 - a * 0.4, 120)).then(() => e.to(n, q0, 160)); };
    e.meshes = re => { const a = []; root.traverse(o => { if (!o.isMesh || o.userData.keep) return; let n = o; while (n && n !== root) { if (re.test(n.name)) { a.push(o); break; } n = n.parent; } }); return a; };
    e.emit = (list, color, k = 1) => list.forEach(o => { const mt = o.material; if (!mt.emissive) return; if (color == null || k <= 0.001) { mt.emissive.copy(o.userData.mat0e || (o.userData.mat0e = mt.emissive.clone())); mt.emissiveIntensity = 1; return; } o.userData.mat0e = o.userData.mat0e || mt.emissive.clone(); mt.emissive.set(color); mt.emissiveIntensity = k; });
    e.xray = (list, on) => list.forEach(o => { const mt = o.material; if (on === !!o.userData.xr) return; o.userData.xr = on; mt.transparent = on || o.userData.mat0.transparent; mt.opacity = on ? 0.22 : 1; mt.depthWrite = !on; mt.needsUpdate = true; });
    e.flash = (t, cls = '') => flash(t, cls);
    e.screen = (name, W, lift = 0.0004) => {
      let mesh = null; root.traverse(o => { if (!mesh && o.isMesh && o.name === san(name)) mesh = o; }); if (!mesh) return null;
      const pre = san(name).replace(/_surface$/, ''); root.traverse(o => { if (o !== mesh && o.name.startsWith(pre) && /__gfx_|_line_\d/.test(o.name)) o.visible = false; });
      mesh.geometry.computeBoundingBox(); const b = mesh.geometry.boundingBox, w = b.max.x - b.min.x, h = b.max.z - b.min.z;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = Math.round(W * h / w);
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
      const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })); p.rotation.x = -Math.PI / 2;
      p.position.set((b.min.x + b.max.x) / 2, b.max.y + lift, (b.min.z + b.max.z) / 2); p.userData.keep = true; p.userData.screen = true; mesh.add(p);
      return { cv, ctx: cv.getContext('2d'), tex, mesh: p, w: cv.width, h: cv.height };
    };
    const world = {};
    const pose = b => { if (world[b]) return world[b]; const i = e.byChild[b]; if (i === undefined) return null; const j = e.J[i], M = new THREE.Matrix4(), ax = new THREE.Vector3(...j.axis).normalize(), p = new THREE.Vector3(...j.pivot);
      if (j.kind === 'revolute') M.copy(T[0].makeTranslation(p.x, p.y, p.z)).multiply(T[1].makeRotationAxis(ax, e.Q[i])).multiply(T[2].makeTranslation(-p.x, -p.y, -p.z)); else M.makeTranslation(ax.x * e.Q[i], ax.y * e.Q[i], ax.z * e.Q[i]);
      const par = pose(j.parent); if (par) M.premultiply(par); return (world[b] = M); };
    e.apply = () => { for (const k in world) delete world[k]; for (const b in e.groups) { const M = pose(b); if (M) { e.groups[b].matrix.copy(M); e.groups[b].matrixWorldNeedsUpdate = true; } } e.dirty = false; };
    e.apply();
    const holder = new THREE.Group(); holder.add(root); root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    root.position.set(-c.x, -box.min.y, -c.z); e.scale = 1 / Math.max(size.x, size.y, size.z); holder.scale.setScalar(e.scale); e.holder = holder; e.size = size;
    m.init && m.init(e); e.apply();

    e.inter = new Map();
    (m.drag || []).forEach(d => { const g = e.groups[e.joint(d.joint)?.child]; if (g) e.inter.set(g, { drag: d }); });
    (m.click || []).forEach(c => { if (c.joint) { const g = e.groups[e.joint(c.joint)?.child]; if (g) e.inter.set(g, { ...(e.inter.get(g) || {}), click: c }); }
      else e.J.forEach(j => { if (c.re.test(j.name)) { const g = e.groups[j.child]; if (g) e.inter.set(g, { ...(e.inter.get(g) || {}), click: c, jn: j.name }); } }); });
    return e;
  }

  const fl = $('.mx-flash'); let flT = 0;
  function flash(t, cls) { fl.textContent = t; fl.className = 'mx-flash show ' + cls; clearTimeout(flT); flT = setTimeout(() => fl.classList.remove('show'), 1900); }
  const pulses = [];
  function pulse(g, color = 0x5ff0e0, ms = 500) { if (g) pulses.push({ list: meshesIn(g), t0: performance.now(), ms, color }); }
  let cur = null, fly = null, tour = true, idx = -1, runTok = 0;
  async function select(i, fromTour = false) {
    if (cur) { cur.alive = false; scene.remove(cur.holder); }
    idx = i; const m = MECH[i], tok = ++runTok;
    list.forEach(b => { b.classList.toggle('on', +b.dataset.i === i); b.querySelector('.mx-bar').style.transform = 'scaleX(0)'; });
    $('.mx-kind').textContent = m.kind; $('.mx-kind').className = 'mx-kind ' + m.kind; $('h3').textContent = m.name; $('.mx-top p').textContent = m.cap;
    $('.mx-top').classList.remove('in'); void $('.mx-top').offsetWidth; $('.mx-top').classList.add('in');
    $('.mx-load').classList.add('show'); $('.mx-ctl').innerHTML = ''; $('.mx-state').innerHTML = '';
    const e = await build(m); if (tok !== runTok) return;
    $('.mx-load').classList.remove('show');
    cur = e; scene.add(e.holder); frame(e);

    const ctl = $('.mx-ctl');
    (m.ctl || []).forEach(c => {
      if (c.t === 'btn') { const b = document.createElement('button'); b.textContent = c.label; b.onclick = () => { user(); c.on(e); }; ctl.append(b); }
      else { const j = e.joint(c.joint), L = document.createElement('label'); L.innerHTML = `<span>${c.label}<b></b></span><input type="range" min="${j.limits[0]}" max="${j.limits[1]}" step="${(j.limits[1] - j.limits[0]) / 400}">`;
        const inp = L.querySelector('input'); inp.oninput = () => { user(); e.set(c.joint, +inp.value); }; c._el = L; ctl.append(L); }
    });
    e.inter.forEach((v, g) => pulse(g, 0x5ff0e0, 1400));
    play(e, tok);
  }
  async function play(e, tok) {
    const m = e.m, t0 = performance.now(), bar = [...list].find(b => +b.dataset.i === idx).querySelector('.mx-bar');
    const live = () => e.alive && tok === runTok;

    const A = Object.create(e);
    A.w = ms => new Promise((res, rej) => setTimeout(() => live() ? res() : rej(STOP), ms));
    A.to = (...a) => live() ? e.to(...a).then(r => live() ? r : Promise.reject(STOP)) : Promise.reject(STOP);
    e.prog = () => { if (live()) bar.style.transform = `scaleX(${Math.min(1, (performance.now() - t0) / (EST[m.key] || 12000))})`; };
    try { await A.w(400); await m.auto(A, A.w); EST[m.key] = performance.now() - t0 + 1600; await A.w(1600); } catch (err) { if (err !== STOP) throw err; return; }
    bar.style.transform = 'scaleX(1)';
    if (tour && live()) select((idx + 1) % MECH.length, true);
  }
  const EST = {};
  function user() { runTok++; if (cur) cur.prog = null; if (!tour) return; tour = false; $('.mx-tour').classList.remove('on'); $('.mx-tour').textContent = '▶ Tour'; }
  $('.mx-tour').onclick = () => { tour = !tour; $('.mx-tour').classList.toggle('on', tour); $('.mx-tour').textContent = tour ? '■ Stop tour' : '▶ Tour'; if (tour) select((idx + 1) % MECH.length, true); };
  list.forEach(b => b.onclick = () => { user(); select(+b.dataset.i); });

  function frame(e) {
    const v = e.m.view || {}, root = e.root; root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(e.holder);
    let c = box.getCenter(new THREE.Vector3()), R = box.getSize(new THREE.Vector3()).length() / 2 * (v.k || 1);
    if (v.focus) { const fb = new THREE.Box3(); e.meshes(v.focus).forEach(o => fb.expandByObject(o));
      if (!fb.isEmpty()) { c = fb.getCenter(new THREE.Vector3()); R = Math.max(fb.getSize(new THREE.Vector3()).length() * (v.k || 1.5), box.getSize(new THREE.Vector3()).length() * (v.whole || 0.6)) / 2; } }
    const d = R / Math.sin(camera.fov * Math.PI / 360) * 0.92, dir = new THREE.Vector3(...(v.dir || [0.6, 0.35, 1])).normalize();
    fly = { t: 0, fP: camera.position.clone(), fT: controls.target.clone(), tP: c.clone().addScaledVector(dir, d), tT: c };
    if (!frame.done) { camera.position.copy(fly.tP); controls.target.copy(fly.tT); fly = null; frame.done = true; }
    controls.minDistance = d * 0.35; controls.maxDistance = d * 2.2;
  }

  const ray = new THREE.Raycaster(), ptr = new THREE.Vector2(); let drag = null, hover = null;
  const pick = ev => { const r = renderer.domElement.getBoundingClientRect(); ptr.set((ev.clientX - r.left) / r.width * 2 - 1, -(ev.clientY - r.top) / r.height * 2 + 1); ray.setFromCamera(ptr, camera);
    const h = ray.intersectObject(cur.holder, true).find(x => x.object.visible && (x.object.isMesh)); if (!h) return null;
    if (h.object.userData.screen) return { screen: h };
    let o = h.object; while (o && !cur.inter.has(o)) o = o.parent; return o ? { g: o, ...cur.inter.get(o) } : null; };
  renderer.domElement.addEventListener('pointerdown', ev => {
    if (!cur) return; const p = pick(ev); if (!p) return;
    if (p.screen && cur.m.tap) { user(); const uv = p.screen.uv; cur.m.tap(cur, uv.x, 1 - uv.y); return; }
    if (p.drag) { user(); controls.enabled = false; drag = { ...p, x: ev.clientX, y: ev.clientY, q0: cur.q(p.drag.joint), moved: false }; delete cur.sp[p.drag.joint]; renderer.domElement.setPointerCapture(ev.pointerId); return; }
    if (p.click) { user(); p.click.on(cur, p.jn); }
  });
  renderer.domElement.addEventListener('pointermove', ev => {
    if (!cur) return;
    if (drag) { const d = drag.drag, dd = d.axis === 'x' ? ev.clientX - drag.x : drag.y - ev.clientY; if (Math.abs(dd) > 3) drag.moved = true; cur.set(d.joint, drag.q0 + dd * d.k); return; }
    const p = ev.buttons ? null : pick(ev); const g = p && (p.g || (p.screen && cur.m.tap && 'screen'));
    renderer.domElement.style.cursor = g ? (p.drag ? 'grab' : 'pointer') : '';
    if (g !== hover) { hover = g; if (g && g !== 'screen') pulse(g, 0x5ff0e0, 600); }
  });
  const end = () => { if (!drag) return; const d = drag; drag = null; controls.enabled = true; if (!d.moved && d.click) d.click.on(cur, d.jn); else d.drag.release && d.drag.release(cur); };
  renderer.domElement.addEventListener('pointerup', end); renderer.domElement.addEventListener('pointercancel', end);

  let seen = false; new IntersectionObserver(es => { seen = es[0].isIntersecting; if (seen && idx < 0) select(0); }, { rootMargin: '300px' }).observe(stage);
  const clock = new THREE.Clock(); let hudT = 0;
  renderer.setAnimationLoop(() => {
    const dt = Math.min(clock.getDelta(), 0.05), now = performance.now(); if (!seen) return; tick();
    if (fly) { fly.t = Math.min(1, fly.t + dt / 1.1); const k = 1 - Math.pow(1 - fly.t, 3); camera.position.lerpVectors(fly.fP, fly.tP, k); controls.target.lerpVectors(fly.fT, fly.tT, k); if (fly.t >= 1) fly = null; }
    const e = cur;
    if (e) {
      for (let n = e.tw.length - 1; n >= 0; n--) { const w = e.tw[n], a = Math.min(1, (now - w.t0) / w.ms), s = a < 0.5 ? 4 * a * a * a : 1 - Math.pow(-2 * a + 2, 3) / 2; e.set(w.n, w.from + (w.to - w.from) * s); if (a >= 1) { e.tw.splice(n, 1); w.res(); } }
      for (const n in e.sp) { const s = e.sp[n], x = e.q(n); s.v += (-(x - s.target) * s.k - s.v * s.c) * dt; e.set(n, x + s.v * dt); if (Math.abs(x - s.target) < 1e-5 && Math.abs(s.v) < 1e-4) { e.set(n, s.target); delete e.sp[n]; } }
      e.m.tick && e.m.tick(e, dt, now);
      if (e.dirty) e.apply();
      e.s.cableTick && e.s.cableTick();
      e.prog && e.prog();
      if ((hudT += dt) > 0.1) { hudT = 0;
        $('.mx-state').innerHTML = (e.m.state ? e.m.state(e) : []).map(([l, v, c]) => `<div class="${c || ''}"><small>${l}</small><b>${v}</b></div>`).join('');
        (e.m.ctl || []).forEach(c => { if (c._el) { const inp = c._el.querySelector('input'); if (document.activeElement !== inp) inp.value = e.q(c.joint); c._el.querySelector('b').textContent = c.fmt(e.q(c.joint), e); } }); }
    }
    for (let n = pulses.length - 1; n >= 0; n--) { const p = pulses[n], a = (now - p.t0) / p.ms, k = Math.sin(Math.min(1, a) * Math.PI);
      p.list.forEach(o => { const mt = o.material; if (!mt.emissive) return; if (!o.userData.e0) o.userData.e0 = [mt.emissive.clone(), mt.emissiveIntensity]; if (a >= 1) { mt.emissive.copy(o.userData.e0[0]); mt.emissiveIntensity = o.userData.e0[1]; } else { mt.emissive.set(p.color); mt.emissiveIntensity = k * 0.7; } });
      if (a >= 1) pulses.splice(n, 1); }
    grid.rotation.y += dt * 0.05; controls.update(); renderer.render(scene, camera);
  });
}
