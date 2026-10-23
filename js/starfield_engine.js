/**
 * 🌌 Starfield Warp Engine (v1.5.0 Pure-White Optical Edition)
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

    // 3. Render Stars
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

      // Previous position projection (for warp streak)
      const pk = fov / Math.max(10, star.prevZ + (this.currentSpeed * this.warpTrailFactor));
      const prevX = star.x * pk + cx;
      const prevY = star.y * pk + cy;

      // Out-of-bounds check
      if (px < -60 || px > w + 60 || py < -60 || py > h + 60) {
        star.z = this.maxDepth;
        star.prevZ = this.maxDepth;
        continue;
      }

      // Depth fade & dynamic brightness
      const depthRatio = Math.max(0, Math.min(1.0, 1.0 - (star.z / this.maxDepth))); // 0 (far) to 1 (near)
      const baseAlpha = 0.45 + depthRatio * 0.55; // 待機時保持 0.45 ~ 1.0 的清晰亮度
      const twinkle = Math.sin(star.twinklePhase) * 0.22;
      const alpha = Math.min(1.0, Math.max(0.25, baseAlpha + twinkle));
      
      // 🌟 待機星星尺寸：遠處約 1.4px，近處約 3.2px (明顯清晰、精緻不粗糙)
      const currentRadius = Math.max(1.2, star.baseRadius * (0.65 + depthRatio * 0.65));

      if (isHighSpeed) {
        // 🚀 Warp Mode: Draw 100% Pure-White Shooting Light Beam / Streak Lines
        const streakDist = Math.hypot(px - prevX, py - prevY);
        if (streakDist > 1.0) {
          const grad = ctx.createLinearGradient(prevX, prevY, px, py);
          grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
          grad.addColorStop(0.55, `rgba(255, 255, 255, ${(alpha * 0.50).toFixed(3)})`);
          grad.addColorStop(1, `rgba(255, 255, 255, ${Math.min(1, alpha * 1.2).toFixed(3)})`);

          ctx.beginPath();
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(px, py);
          ctx.strokeStyle = grad;
          ctx.lineWidth = Math.min(3.2, currentRadius * 1.2);
          ctx.lineCap = 'round';
          ctx.stroke();
        }

        // Draw bright leading star head
        ctx.beginPath();
        ctx.arc(px, py, Math.min(2.8, currentRadius * 0.95), 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

      } else {
        // 🪐 Idle Mode: Draw Crisp, 100% Pure-White Stars with Soft Aura Glow
        // 1. Soft Pure-White Nebula Halo Glow
        const glowRadius = currentRadius * 2.8;
        const glowGrad = ctx.createRadialGradient(px, py, 0, px, py, glowRadius);
        glowGrad.addColorStop(0, `rgba(255, 255, 255, ${(alpha * 0.45).toFixed(3)})`);
        glowGrad.addColorStop(0.5, `rgba(255, 255, 255, ${(alpha * 0.15).toFixed(3)})`);
        glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.arc(px, py, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = glowGrad;
        ctx.fill();

        // 2. Pure-White Radiant Core (100% 純粹白曜核心)
        ctx.beginPath();
        ctx.arc(px, py, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
        ctx.fill();

        // 3. Subtle Cross Sparkle for prominent bright stars (精緻十字微芒星芒)
        if (star.hasSparkle && depthRatio > 0.45 && alpha > 0.65) {
          const sparkleLen = currentRadius * 2.2;
          ctx.strokeStyle = `rgba(255, 255, 255, ${(alpha * 0.45).toFixed(3)})`;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.moveTo(px - sparkleLen, py);
          ctx.lineTo(px + sparkleLen, py);
          ctx.moveTo(px, py - sparkleLen);
          ctx.lineTo(px, py + sparkleLen);
          ctx.stroke();
        }
      }
    }
  }
}

window.StarfieldEngine = StarfieldEngine;
