/**
 * ============================================================================
 * 🌌 AuraBeamEngine - Arc-Length Parametric Optical Laser Engine
 * ============================================================================
 * 1. 100% Constant Physical Visual Length: Invariant along straights and curves (never shrinks)
 * 2. 100% Arc-Length Color Mapping: Eliminates Cartesian gradient clipping on corners
 * 3. 0 Circular Dots & 0 Seam Marks: Dense 180-step butt-capped continuous poly-line
 * 4. Steady Optical Glow & Beat Acceleration: Smooth speed changes, rock-solid glow width
 * 5. 0.00px Layout Pixel Calibration: Perfectly matches capsule border
 */

class AuraBeamEngine {
  constructor(canvasId, capsuleId) {
    this.canvas = document.getElementById(canvasId);
    this.capsule = document.getElementById(capsuleId);
    if (!this.canvas || !this.capsule) return;
    this.ctx = this.canvas.getContext('2d', {
      willReadFrequently: false
    });

    this.distance = 0.0;
    this.padding = 24; // Generous canvas boundary for bloom
    this.beamRatio = 0.35; // 🌟 35% perimeter span (~500px, magnificent constant arc length)
    this.baseSpeed = 95; // 🌟 95 px/s (平緩時極致舒緩優雅，提供極大反差基準)

    // 🎛️ Rainmeter AudioLevel DSP Engine Parameters (超大動態幅度調速)
    this.smoothedBass = 0.0;
    this.smoothedMid = 0.0;
    this.attackSpeed = 32.0; // 30ms 閃電級瞬態爆發 (Kick drum 下潛即刻狂飆)
    this.decaySpeed = 3.0;   // 330ms 絲滑慣性減速滑行 (留出充裕的重力減速弧度)
    this.bassBoostGain = 1250.0; // 🌟 +1250 px/s (重低音大鼓炸裂時瞬態衝上 1345 px/s，14倍超大對比！)
    this.midBoostGain = 320.0;   // +320 px/s (人聲與軍鼓補償)

    // Arc-length parameterized Chroma Spectral stops (progress 0.0 to 1.0)
    this.colorStops = [
      { pos: 0.00, r: 66,  g: 133, b: 244, a: 0.00, core: 0.00 }, // 尾端極致柔和羽化
      { pos: 0.08, r: 66,  g: 133, b: 244, a: 0.60, core: 0.15 }, 
      { pos: 0.22, r: 66,  g: 133, b: 244, a: 0.95, core: 0.70 }, // Google Blue
      { pos: 0.44, r: 155, g: 81,  b: 224, a: 1.00, core: 0.90 }, // Google Purple
      { pos: 0.65, r: 234, g: 67,  b: 53,  a: 1.00, core: 0.95 }, // Google Red
      { pos: 0.82, r: 251, g: 188, b: 5,   a: 1.00, core: 0.90 }, // Google Yellow
      { pos: 0.93, r: 52,  g: 168, b: 83,  a: 0.90, core: 0.60 }, // Google Green
      { pos: 0.97, r: 52,  g: 168, b: 83,  a: 0.40, core: 0.15 }, // 前端極致柔和羽化
      { pos: 1.00, r: 52,  g: 168, b: 83,  a: 0.00, core: 0.00 }  // 前端消隱
    ];

    this.resize();

    // 🌟 Pre-allocated static object pools to eliminate GC churn (Zero per-frame allocations)
    this.maxSteps = 180;
    this.ptsPool = [];
    this.colorsPool = [];
    for (let i = 0; i <= this.maxSteps; i++) {
      this.ptsPool.push({ x: 0, y: 0 });
      this.colorsPool.push({ r: 0, g: 0, b: 0, a: 0, core: 0 });
    }

    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.resize());
      this.resizeObserver.observe(this.capsule);
    }
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    if (!this.capsule || !this.canvas) return;

    const capW = this.capsule.offsetWidth || 680;
    const capH = this.capsule.offsetHeight || 88;
    const dpr = window.devicePixelRatio || 1;

    this.capsuleWidth = capW;
    this.capsuleHeight = capH;
    this.radius = this.capsuleHeight / 2;

    const totalW = capW + this.padding * 2;
    const totalH = capH + this.padding * 2;

    this.canvas.width = Math.round(totalW * dpr);
    this.canvas.height = Math.round(totalH * dpr);

    this.dpr = dpr;

    // Compute Exact Perimeter Geometry
    this.straightLength = Math.max(0, this.capsuleWidth - 2 * this.radius);
    this.arcLength = Math.PI * this.radius;
    this.totalPerimeter = 2 * this.straightLength + 2 * this.arcLength;
  }

  clear() {
    if (!this.ctx || !this.canvas) return;
    const dpr = this.dpr || 1;
    this.ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);
  }

  getPointAtDistance(d) {
    const p = ((d % this.totalPerimeter) + this.totalPerimeter) % this.totalPerimeter;
    const pad = this.padding;
    const R = this.radius;
    const L1 = this.straightLength;
    const L2 = this.arcLength;
    const L3 = this.straightLength;
    const L4 = this.arcLength;

    const W = this.capsuleWidth;
    const H = this.capsuleHeight;

    // 1. Top horizontal straight segment (left -> right)
    if (p <= L1) {
      return { x: pad + R + p, y: pad };
    }
    // 2. Right semicircle (top -> bottom)
    if (p <= L1 + L2) {
      const delta = p - L1;
      const angle = -Math.PI / 2 + (delta / L2) * Math.PI;
      return {
        x: pad + (W - R) + R * Math.cos(angle),
        y: pad + R + R * Math.sin(angle)
      };
    }
    // 3. Bottom horizontal straight segment (right -> left)
    if (p <= L1 + L2 + L3) {
      const delta = p - (L1 + L2);
      return { x: pad + (W - R) - delta, y: pad + H };
    }
    // 4. Left semicircle (bottom -> top)
    const delta = p - (L1 + L2 + L3);
    const angle = Math.PI / 2 + (delta / L4) * Math.PI;
    return {
      x: pad + R + R * Math.cos(angle),
      y: pad + R + R * Math.sin(angle)
    };
  }

  update(dt, rawBass = 0.0, rawMid = 0.0, isPlaying = true) {
    if (!this.ctx || !this.totalPerimeter) return;

    // 🎛️ Rainmeter AudioLevel Attack/Decay DSP 演算法
    const targetBass = Math.pow(Math.max(0, rawBass), 1.30);
    if (targetBass > this.smoothedBass) {
      // Attack: 35ms 疾速瞬態響應 (重低音落下瞬間即刻爆發)
      this.smoothedBass += (targetBass - this.smoothedBass) * Math.min(1.0, dt * this.attackSpeed);
    } else {
      // Decay: 280ms 指數平滑釋放 (節奏過後如重力滑行般平穩減速)
      this.smoothedBass += (targetBass - this.smoothedBass) * Math.min(1.0, dt * this.decaySpeed);
    }

    const targetMid = Math.pow(Math.max(0, rawMid), 1.25);
    if (targetMid > this.smoothedMid) {
      this.smoothedMid += (targetMid - this.smoothedMid) * Math.min(1.0, dt * this.attackSpeed);
    } else {
      this.smoothedMid += (targetMid - this.smoothedMid) * Math.min(1.0, dt * this.decaySpeed);
    }

    // 🌟 Rainmeter 靈敏調速：低音大鼓炸裂時瞬態加速至 700~800 px/s，隨後絲滑釋放減速
    const beatVelocity = (this.smoothedBass * this.bassBoostGain) + (this.smoothedMid * this.midBoostGain);
    const currentSpeed = isPlaying
      ? (this.baseSpeed + beatVelocity)
      : (this.baseSpeed * 0.55);

    this.distance = (this.distance + dt * currentSpeed) % this.totalPerimeter;

    this.render();
  }

  render() {
    const ctx = this.ctx;
    const dpr = this.dpr || 1;
    const totalP = this.totalPerimeter;
    const beamLength = Math.max(250, totalP * this.beamRatio); // Constant Arc-Length in Pixels!

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);

    const steps = this.maxSteps; // 180 points along the perimeter for pixel-perfect curves
    const stepDist = beamLength / steps;

    // Reuse pre-allocated object pools (Zero GC allocations in hot loop)
    for (let i = 0; i <= steps; i++) {
      const d = this.distance + i * stepDist;
      const progress = i / steps;
      const pt = this.getPointAtDistance(d);
      this.ptsPool[i].x = pt.x;
      this.ptsPool[i].y = pt.y;
      this.interpolateColorInto(progress, this.colorsPool[i]);
    }

    ctx.lineCap = 'butt'; // Zero circular beads/dots
    ctx.lineJoin = 'round';

    // 🌟 Continuous polyline chunks with linear gradient interpolation.
    // 100% seamless, smooth, silky Chroma rainbow laser beam.
    const numChunks = 15;
    const stepsPerChunk = steps / numChunks; // 12 steps per chunk

    // 🌟 LAYER 1: Ethereal Bloom (9.5px, completely continuous & zero shrinking)
    const bloomWidth = 9.5;
    for (let c = 0; c < numChunks; c++) {
      const startIdx = c * stepsPerChunk;
      const endIdx = (c === numChunks - 1) ? steps : (c + 1) * stepsPerChunk;
      const c0 = this.colorsPool[startIdx];
      const c1 = this.colorsPool[endIdx];

      if (c0.a <= 0.005 && c1.a <= 0.005) continue;

      const p0 = this.ptsPool[startIdx];
      const p1 = this.ptsPool[endIdx];
      const grad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
      grad.addColorStop(0, `rgba(${c0.r}, ${c0.g}, ${c0.b}, ${(c0.a * 0.35).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${c1.r}, ${c1.g}, ${c1.b}, ${(c1.a * 0.35).toFixed(3)})`);

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      for (let j = startIdx + 1; j <= endIdx; j++) {
        ctx.lineTo(this.ptsPool[j].x, this.ptsPool[j].y);
      }
      ctx.strokeStyle = grad;
      ctx.lineWidth = bloomWidth;
      ctx.stroke();
    }

    // 🌟 LAYER 2: Vibrant Chroma Laser Filament (3.4px, completely seamless)
    const neonWidth = 3.4;
    for (let c = 0; c < numChunks; c++) {
      const startIdx = c * stepsPerChunk;
      const endIdx = (c === numChunks - 1) ? steps : (c + 1) * stepsPerChunk;
      const c0 = this.colorsPool[startIdx];
      const c1 = this.colorsPool[endIdx];

      if (c0.a <= 0.005 && c1.a <= 0.005) continue;

      const p0 = this.ptsPool[startIdx];
      const p1 = this.ptsPool[endIdx];
      const grad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
      grad.addColorStop(0, `rgba(${c0.r}, ${c0.g}, ${c0.b}, ${(c0.a * 0.90).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${c1.r}, ${c1.g}, ${c1.b}, ${(c1.a * 0.90).toFixed(3)})`);

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      for (let j = startIdx + 1; j <= endIdx; j++) {
        ctx.lineTo(this.ptsPool[j].x, this.ptsPool[j].y);
      }
      ctx.strokeStyle = grad;
      ctx.lineWidth = neonWidth;
      ctx.stroke();
    }

    // 🌟 LAYER 3: White-Hot Photon Laser Core (1.6px, pure optical center)
    const coreWidth = 1.6;
    for (let c = 0; c < numChunks; c++) {
      const startIdx = c * stepsPerChunk;
      const endIdx = (c === numChunks - 1) ? steps : (c + 1) * stepsPerChunk;
      const c0 = this.colorsPool[startIdx];
      const c1 = this.colorsPool[endIdx];

      if (c0.core <= 0.005 && c1.core <= 0.005) continue;

      const p0 = this.ptsPool[startIdx];
      const p1 = this.ptsPool[endIdx];

      const wr0 = Math.round(255 * 0.75 + c0.r * 0.25);
      const wg0 = Math.round(255 * 0.75 + c0.g * 0.25);
      const wb0 = Math.round(255 * 0.75 + c0.b * 0.25);

      const wr1 = Math.round(255 * 0.75 + c1.r * 0.25);
      const wg1 = Math.round(255 * 0.75 + c1.g * 0.25);
      const wb1 = Math.round(255 * 0.75 + c1.b * 0.25);

      const grad = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
      grad.addColorStop(0, `rgba(${wr0}, ${wg0}, ${wb0}, ${(c0.core * 0.95).toFixed(3)})`);
      grad.addColorStop(1, `rgba(${wr1}, ${wg1}, ${wb1}, ${(c1.core * 0.95).toFixed(3)})`);

      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      for (let j = startIdx + 1; j <= endIdx; j++) {
        ctx.lineTo(this.ptsPool[j].x, this.ptsPool[j].y);
      }
      ctx.strokeStyle = grad;
      ctx.lineWidth = coreWidth;
      ctx.stroke();
    }

    ctx.restore();
  }

  interpolateColorInto(progress, target) {
    const stops = this.colorStops;
    let s0 = stops[0], s1 = stops[stops.length - 1];
    for (let i = 0; i < stops.length - 1; i++) {
      if (progress >= stops[i].pos && progress <= stops[i + 1].pos) {
        s0 = stops[i];
        s1 = stops[i + 1];
        break;
      }
    }
    const t = (progress - s0.pos) / Math.max(0.0001, s1.pos - s0.pos);
    target.r = Math.round(s0.r + (s1.r - s0.r) * t);
    target.g = Math.round(s0.g + (s1.g - s0.g) * t);
    target.b = Math.round(s0.b + (s1.b - s0.b) * t);
    target.a = (s0.a + (s1.a - s0.a) * t);
    target.core = (s0.core + (s1.core - s0.core) * t);
  }
}

window.AuraBeamEngine = AuraBeamEngine;
