/**
 * 🌌 Starfield Warp Engine (v1.1.0 Preview)
 * - Idle Mode: Sparse, gentle, organic 3D/2D ambient drift with subtle twinkling.
 * - Warp Mode: Dynamic radial warp streams shooting from center origin with audio reactive streak length & speed.
 * - Smooth Inertial Damping: Decelerates naturally when music eases or pauses.
 */
class StarfieldEngine {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    // Configuration & Tuning Parameters
    this.starCount = options.starCount || 110; // Sparse point density
    this.maxDepth = options.maxDepth || 1000;
    this.idleSpeed = options.idleSpeed || 0.45; // Gentle float speed
    this.warpMaxSpeed = options.warpMaxSpeed || 32.0; // Peak speed under heavy bass
    this.warpTrailFactor = options.warpTrailFactor || 1.8;
    this.starBaseRadius = options.starBaseRadius || 1.6;
    
    // Dynamic State
    this.stars = [];
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
    
    // Audio Reactive Properties
    this.currentSpeed = this.idleSpeed;
    this.targetSpeed = this.idleSpeed;
    this.audioEnergy = 0.0;
    this.bassEnergy = 0.0;
    this.isWarping = false;
    this.idleAngle = 0.0;

    // Viewport resize
    this.resize();
    window.addEventListener('resize', () => this.resize());

    // Initialize Stars
    this.initStars();
  }

  resize() {
    if (!this.canvas) return;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;
  }

  clear() {
    if (!this.canvas || !this.ctx) return;
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  initStars() {
    this.stars = [];
    for (let i = 0; i < this.starCount; i++) {
      this.stars.push(this.createStar(true));
    }
  }

  createStar(randomDepth = false) {
    const spread = Math.max(this.width, this.height) * 1.2;
    return {
      x: (Math.random() - 0.5) * spread,
      y: (Math.random() - 0.5) * spread,
      z: randomDepth ? Math.random() * this.maxDepth : this.maxDepth,
      prevZ: randomDepth ? Math.random() * this.maxDepth : this.maxDepth,
      baseRadius: 1.6 + Math.random() * 1.8, // 🌟 待機時清晰可辨的星點半徑 (1.6px ~ 3.4px)
      twinklePhase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.02 + Math.random() * 0.035,
      driftAngle: Math.random() * Math.PI * 2,
      driftSpeed: 0.2 + Math.random() * 0.35,
      hasSparkle: Math.random() < 0.28 // 28% 星星具備精緻十字微芒星芒
    };
  }

  setStarCount(count) {
    this.starCount = count;
    while (this.stars.length < this.starCount) {
      this.stars.push(this.createStar(true));
    }
    if (this.stars.length > this.starCount) {
      this.stars.length = this.starCount;
    }
  }

  /**
   * Feed audio energy from AudioListener
   * @param {number} bass - Bass energy [0.0 - 1.0]
   * @param {number} mid - Mid frequency energy [0.0 - 1.0]
   * @param {number} treble - Treble frequency energy [0.0 - 1.0]
   * @param {boolean} isPlaying - Current playback state
   */
  updateAudio(bass, mid, treble, isPlaying = true) {
    const rawEnergy = (bass * 1.4 + mid * 0.8 + treble * 0.4);
    this.bassEnergy = bass;
    
    if (isPlaying && rawEnergy > 0.02) {
      this.isWarping = true;
      this.audioEnergy = rawEnergy;
      // Exponential warp speed curve based on bass drops
      const boost = Math.pow(Math.min(1.0, rawEnergy * 1.25), 1.8);
      this.targetSpeed = this.idleSpeed + boost * this.warpMaxSpeed;
    } else {
      this.isWarping = false;
      this.audioEnergy = 0.0;
      this.targetSpeed = this.idleSpeed;
    }
  }

  /**
   * Main Render Tick
   * @param {number} dt - Delta time in seconds
   */
  render(dt = 0.016) {
    if (!this.canvas || !this.ctx) return;

    // 1. Smooth Inertial Speed Interpolation (Fast Attack vs Smooth Inertial Decay)
    if (this.targetSpeed > this.currentSpeed) {
      // Fast Attack: ~45ms snap on beat hit
      this.currentSpeed += (this.targetSpeed - this.currentSpeed) * Math.min(1.0, dt * 18.0);
    } else {
      // Smooth Inertial Glide: ~400ms decay
      this.currentSpeed += (this.targetSpeed - this.currentSpeed) * Math.min(1.0, dt * 2.8);
    }

    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = this.centerX;
    const cy = this.centerY;
    const fov = 400; // Focal length

    // 2. Pure Pitch-Black OLED Background Wipe
    if (this.currentSpeed > 2.8) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.38)';
      ctx.fillRect(0, 0, w, h);
    } else {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);
    }

    this.idleAngle += dt * 0.12;
    const isHighSpeed = this.currentSpeed > 1.8;

    ctx.lineCap = 'round';

    // 3. Update Positions & Pre-compute 3D Perspective Projection
    const renderList = [];
    for (let i = 0; i < this.stars.length; i++) {
      const star = this.stars[i];
      star.twinklePhase += star.twinkleSpeed;

      // Update position
      star.prevZ = star.z;
      star.z -= this.currentSpeed * (dt * 60);

      // In idle mode, apply gentle subtle drift
      if (!isHighSpeed) {
        star.x += Math.cos(star.driftAngle + this.idleAngle) * star.driftSpeed;
        star.y += Math.sin(star.driftAngle + this.idleAngle) * star.driftSpeed;
      }

      // Recycle stars when passing camera
      if (star.z <= 10) {
        star.z = this.maxDepth;
        star.prevZ = this.maxDepth;
        const spread = Math.max(w, h) * 1.15;
        star.x = (Math.random() - 0.5) * spread;
        star.y = (Math.random() - 0.5) * spread;
      }

      // 3D Perspective Projection
      const k = fov / star.z;
      const px = star.x * k + cx;
      const py = star.y * k + cy;

      // Out-of-bounds check
      if (px < -60 || px > w + 60 || py < -60 || py > h + 60) {
        star.z = this.maxDepth;
        star.prevZ = this.maxDepth;
        continue;
      }

      // Depth fade & dynamic brightness
      const depthRatio = Math.max(0, Math.min(1.0, 1.0 - (star.z / this.maxDepth)));
      const baseAlpha = 0.45 + depthRatio * 0.55;
      const twinkle = Math.sin(star.twinklePhase) * 0.22;
      const alpha = Math.min(1.0, Math.max(0.25, baseAlpha + twinkle));
      const currentRadius = Math.max(1.2, star.baseRadius * (0.65 + depthRatio * 0.65));

      if (isHighSpeed) {
        const pk = fov / Math.max(10, star.prevZ + (this.currentSpeed * this.warpTrailFactor));
        const prevX = star.x * pk + cx;
        const prevY = star.y * pk + cy;
        renderList.push({ px, py, prevX, prevY, alpha, currentRadius });
      } else {
        renderList.push({ px, py, alpha, currentRadius, depthRatio, hasSparkle: star.hasSparkle });
      }
    }

    // 4. Batched Pure-White Vector Rendering (100% Pure White, 0 Gradients, 3 Draw Calls Total!)
    if (isHighSpeed) {
      // Pass 1: Faint Pure-White Comet Trails
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i < renderList.length; i++) {
        const s = renderList[i];
        const dx = s.px - s.prevX;
        const dy = s.py - s.prevY;
        if (dx * dx + dy * dy > 1.0) {
          ctx.moveTo(s.prevX, s.prevY);
          ctx.lineTo(s.px, s.py);
        }
      }
      ctx.stroke();

      // Pass 2: Bright Pure-White Front Leading Core
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      for (let i = 0; i < renderList.length; i++) {
        const s = renderList[i];
        const dx = s.px - s.prevX;
        const dy = s.py - s.prevY;
        if (dx * dx + dy * dy > 1.0) {
          ctx.moveTo((s.prevX + s.px) * 0.5, (s.prevY + s.py) * 0.5);
          ctx.lineTo(s.px, s.py);
        }
      }
      ctx.stroke();

      // Pass 3: Pure-White Star Heads
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      for (let i = 0; i < renderList.length; i++) {
        const s = renderList[i];
        const r = Math.min(2.8, s.currentRadius * 0.95);
        ctx.moveTo(s.px + r, s.py);
        ctx.arc(s.px, s.py, r, 0, Math.PI * 2);
      }
      ctx.fill();

    } else {
      // Pass 1: Soft Pure-White Nebula Halos
      ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.beginPath();
      for (let i = 0; i < renderList.length; i++) {
        const s = renderList[i];
        const glowRadius = s.currentRadius * 2.6;
        ctx.moveTo(s.px + glowRadius, s.py);
        ctx.arc(s.px, s.py, glowRadius, 0, Math.PI * 2);
      }
      ctx.fill();

      // Pass 2: Crisp Pure-White Radiant Star Cores
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      for (let i = 0; i < renderList.length; i++) {
        const s = renderList[i];
        ctx.moveTo(s.px + s.currentRadius, s.py);
        ctx.arc(s.px, s.py, s.currentRadius, 0, Math.PI * 2);
      }
      ctx.fill();

      // Pass 3: Delicate Cross Sparkles
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.40)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      for (let i = 0; i < renderList.length; i++) {
        const s = renderList[i];
        if (s.hasSparkle && s.depthRatio > 0.45 && s.alpha > 0.65) {
          const sparkleLen = s.currentRadius * 2.2;
          ctx.moveTo(s.px - sparkleLen, s.py);
          ctx.lineTo(s.px + sparkleLen, s.py);
          ctx.moveTo(s.px, s.py - sparkleLen);
          ctx.lineTo(s.px, s.py + sparkleLen);
        }
      }
      ctx.stroke();
    }
  }
}

window.StarfieldEngine = StarfieldEngine;
