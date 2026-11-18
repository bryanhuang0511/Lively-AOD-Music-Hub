/**
 * Modular Unit Test: AuraBeamEngine & StarfieldEngine Zero-Alloc 2D Fallback & Geometry
 */
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const noop = () => {};
const mockCtx = {
  save: noop,
  restore: noop,
  scale: noop,
  clearRect: noop,
  fillRect: noop,
  beginPath: noop,
  moveTo: noop,
  lineTo: noop,
  arc: noop,
  stroke: noop,
  fill: noop,
  createLinearGradient: () => { throw new Error('Must not allocate LinearGradient in fallback loop'); },
  createRadialGradient: () => { throw new Error('Must not allocate RadialGradient in fallback loop'); }
};

// 1. AuraBeamEngine perimeter continuity + DSP speed modulation
const auraSrc = fs.readFileSync(path.join(__dirname, '../js/aura_beam.js'), 'utf8')
  + '\nglobalThis.__AURA = AuraBeamEngine;';
const auraBox = {
  window: { addEventListener() {}, devicePixelRatio: 1 },
  document: {
    getElementById: (id) => id === 'glassCapsule'
      ? { offsetWidth: 680, offsetHeight: 88 }
      : { width: 0, height: 0, getContext: (t) => t === '2d' ? mockCtx : null }
  },
  Uint8Array, Float32Array, Math, Number, String, Array, Object
};
vm.createContext(auraBox);
vm.runInContext(auraSrc, auraBox, { filename: 'aura_beam.js' });

const aura = new auraBox.__AURA('auraCanvas', 'glassCapsule');
const p0 = { x: 0, y: 0 };
const pEnd = { x: 0, y: 0 };
aura.populatePointAtDistance(0, p0);
aura.populatePointAtDistance(aura.totalPerimeter - 0.0001, pEnd);
assert(Math.hypot(p0.x - pEnd.x, p0.y - pEnd.y) < 0.01, 'Aura perimeter must close seamlessly at s=0 and s=P');

aura.update(0.016, 0.9, 0.6, true);
assert(aura.smoothedBass > 0, 'DSP attack must boost smoothedBass on active bass pulse');
aura.update(0.016, 0.0, 0.0, false);

// 2. StarfieldEngine fallback & resize proportional scaling
const starSrc = fs.readFileSync(path.join(__dirname, '../js/starfield_engine.js'), 'utf8')
  + '\nglobalThis.__STAR = StarfieldEngine;';
const starWin = { addEventListener() {}, devicePixelRatio: 1, innerWidth: 1920, innerHeight: 1080 };
const starBox = {
  window: starWin,
  document: { getElementById: () => ({ width: 0, height: 0, getContext: (t) => t === '2d' ? mockCtx : null }) },
  Uint8Array, Float32Array, Math, Number, String, Array, Object
};
vm.createContext(starBox);
vm.runInContext(starSrc, starBox, { filename: 'starfield_engine.js' });

const star = new starBox.__STAR('bgCanvas');
star.updateAudio(0.8, 0.5, 0.3, true);
star.render(0.016);
star.updateAudio(0.0, 0.0, 0.0, false);
star.currentSpeed = star.idleSpeed;
star.render(0.016);

starWin.innerWidth = 2560;
starWin.innerHeight = 1440;
star.resize();
assert.strictEqual(star.width, 2560, 'Starfield resize must adopt updated viewport width');
assert.strictEqual(star.height, 1440, 'Starfield resize must adopt updated viewport height');

console.log('PASS all Lively v1.0.0 rendering fallback and geometry unit tests');
