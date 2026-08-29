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
    this.ctx = this.canvas.getContext('2d');

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

    const steps = 180; // High-density continuous sampling (~2.5px per micro-step)
    const stepDist = beamLength / steps;

    // Pre-calculate coordinates and colors along the arc
    const pts = [];
    const colors = [];
    for (let i = 0; i <= steps; i++) {
      const d = this.distance + i * stepDist;
      const progress = i / steps;
      pts.push(this.getPointAtDistance(d));
      colors.push(this.interpolateColor(progress));
    }

    ctx.lineCap = 'butt'; // Zero circular beads/dots
    ctx.lineJoin = 'round';

    // 🌟 LAYER 1: Ethereal Bloom (9.5px, completely continuous & zero shrinking)
    const bloomWidth = 9.5;
    for (let i = 0; i < steps; i++) {
      const col = colors[i];
      if (col.a <= 0.005) continue;

      ctx.beginPath();
      ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${(col.a * 0.35).toFixed(3)})`;
      ctx.lineWidth = bloomWidth;
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
      ctx.stroke();
    }

    // 🌟 LAYER 2: Vibrant Chroma Laser Filament (3.4px, completely seamless)
    const neonWidth = 3.4;
    for (let i = 0; i < steps; i++) {
      const col = colors[i];
      if (col.a <= 0.005) continue;

      ctx.beginPath();
      ctx.strokeStyle = `rgba(${col.r}, ${col.g}, ${col.b}, ${(col.a * 0.90).toFixed(3)})`;
      ctx.lineWidth = neonWidth;
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
      ctx.stroke();
    }

    // 🌟 LAYER 3: White-Hot Photon Laser Core (1.6px, pure optical center)
    const coreWidth = 1.6;
    for (let i = 0; i < steps; i++) {
      const col = colors[i];
      if (col.core <= 0.005) continue;

      ctx.beginPath();
      const wr = Math.round(255 * 0.75 + col.r * 0.25);
      const wg = Math.round(255 * 0.75 + col.g * 0.25);
      const wb = Math.round(255 * 0.75 + col.b * 0.25);
      ctx.strokeStyle = `rgba(${wr}, ${wg}, ${wb}, ${(col.core * 0.95).toFixed(3)})`;
      ctx.lineWidth = coreWidth;
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[i + 1].x, pts[i + 1].y);
      ctx.stroke();
    }

    ctx.restore();
  }

  interpolateColor(progress) {
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
    return {
      r: Math.round(s0.r + (s1.r - s0.r) * t),
      g: Math.round(s0.g + (s1.g - s0.g) * t),
      b: Math.round(s0.b + (s1.b - s0.b) * t),
      a: (s0.a + (s1.a - s0.a) * t),
      core: (s0.core + (s1.core - s0.core) * t)
    };
  }
}

window.AuraBeamEngine = AuraBeamEngine;
