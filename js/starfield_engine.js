/**
 * 🌌 Starfield Warp Engine (v1.0.0 WebGL2 GPU Instanced Edition + Zero-Alloc 2D Fallback)
 * - GPU-first WebGL2 single-draw-call instanced rendering: 0 gradient allocations, near-0% CPU at 144Hz.
 * - Pure-White Optical Aesthetic (Idle soft nebula halo + core + cross sparkles; Warp luminous comet beams).
 * - Frame-rate independent physics (dt-normalized drift & twinkle across 60Hz/144Hz displays).
 */
class StarfieldEngine {
  constructor(canvasId, options = {}) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    // Configuration & Tuning Parameters
    this.starCount = options.starCount || 110;
    this.maxDepth = options.maxDepth || 1000;
    this.idleSpeed = options.idleSpeed || 0.45;
    this.warpMaxSpeed = options.warpMaxSpeed || 32.0;
    this.warpTrailFactor = options.warpTrailFactor || 1.8;
    this.starBaseRadius = options.starBaseRadius || 1.6;

    // Dynamic State
    this.width = Math.max(1, window.innerWidth || 1920);
    this.height = Math.max(1, window.innerHeight || 1080);
    this.dpr = Math.min(2.0, window.devicePixelRatio || 1);
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    // Audio Reactive Properties
    this.currentSpeed = this.idleSpeed;
    this.targetSpeed = this.idleSpeed;
    this.audioEnergy = 0.0;
    this.bassEnergy = 0.0;
    this.isWarping = false;
    this.idleAngle = 0.0;

    // Typed-Array SOA Star Pool (Zero GC churn)
    this._allocArrays(this.starCount);
    this._initSpread = Math.max(this.width, this.height);
    this.initStars();

    // Initialize WebGL2 GPU Pipeline (or lean Canvas 2D fallback)
    this.isWebGL = false;
    this.gl = null;
    this.ctx = null;
    this._initRenderer();

    this.resize();
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
  }

  _allocArrays(count) {
    this.starX = new Float32Array(count);
    this.starY = new Float32Array(count);
    this.starZ = new Float32Array(count);
    this.starPrevZ = new Float32Array(count);
    this.starRadius = new Float32Array(count);
    this.starTwinklePhase = new Float32Array(count);
    this.starTwinkleSpeed = new Float32Array(count);
    this.starDriftAngle = new Float32Array(count);
    this.starDriftSpeed = new Float32Array(count);
    this.starHasSparkle = new Uint8Array(count);

    // 7 floats per instance: px, py, prevX, prevY, radius, alpha, sparkleLen
    this.instanceFloats = 7;
    this.instanceData = new Float32Array(count * this.instanceFloats);
  }

  _initRenderer() {
    let gl = null;
    try {
      gl = this.canvas.getContext('webgl2', {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: 'high-performance'
      });
    } catch (e) {
      gl = null;
    }

    if (gl && this._setupWebGL2(gl)) {
      this.gl = gl;
      this.isWebGL = true;
      return;
    }

    this.ctx = this.canvas.getContext('2d', {
      alpha: false,
      willReadFrequently: false
    });
    this.isWebGL = false;
  }

  _compileShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  _setupWebGL2(gl) {
    const vsSrc = `#version 300 es
      precision highp float;
      in vec2 a_corner;
      in vec2 a_pos;
      in vec2 a_prev;
      in vec3 a_params; // x: radius, y: alpha, z: sparkleLen

      uniform vec2 u_resolution;
      uniform float u_isHighSpeed;

      out vec2 v_local;
      out float v_streakLen;
      out vec3 v_params;
      out float v_mode;

      void main() {
        vec2 delta = a_pos - a_prev;
        float rawLen = length(delta);
        vec2 screenPos;

        if (u_isHighSpeed > 0.5 && rawLen > 1.0) {
          vec2 dir = delta / rawLen;
          vec2 perp = vec2(-dir.y, dir.x);
          float halfW = max(min(3.2, a_params.x * 1.2) * 0.5, min(2.8, a_params.x * 0.95)) + 1.6;
          float along = mix(-halfW, rawLen + halfW, a_corner.x * 0.5 + 0.5);
          float across = a_corner.y * halfW;
          screenPos = a_prev + dir * along + perp * across;
          v_local = vec2(along, across);
          v_streakLen = rawLen;
          v_mode = 1.0;
        } else {
          float boxR = max(a_params.x * 2.8, a_params.z) + 2.2;
          vec2 local = a_corner * boxR;
          screenPos = a_pos + local;
          v_local = local;
          v_streakLen = 0.0;
          v_mode = 0.0;
        }

        v_params = a_params;
        vec2 ndc = (screenPos / u_resolution) * 2.0 - 1.0;
        gl_Position = vec4(ndc.x, -ndc.y, 0.0, 1.0);
      }
    `;

    const fsSrc = `#version 300 es
      precision mediump float;
      in vec2 v_local;
      in float v_streakLen;
      in vec3 v_params;
      in float v_mode;

      out vec4 fragColor;

      void main() {
        float r = v_params.x;
        float alpha = v_params.y;
        float sparkleLen = v_params.z;

        if (v_mode > 0.5) {
          float len = max(v_streakLen, 0.001);
          float t = clamp(v_local.x / len, 0.0, 1.0);
          float distToSeg = length(vec2(v_local.x - t * len, v_local.y));
          float lineHalfW = min(3.2, r * 1.2) * 0.5;
          float strokeMask = 1.0 - smoothstep(max(0.0, lineHalfW - 0.55), lineHalfW + 0.75, distToSeg);
          float tailFade = pow(t, 1.35) * min(1.0, alpha * 1.15);

          float headDist = length(vec2(v_local.x - len, v_local.y));
          float headR = min(2.8, r * 0.95);
          float headMask = 1.0 - smoothstep(max(0.0, headR - 0.55), headR + 0.75, headDist);

          float outA = clamp(max(strokeMask * tailFade, headMask), 0.0, 1.0);
          if (outA <= 0.002) discard;
          fragColor = vec4(outA, outA, outA, outA);
        } else {
          float d = length(v_local);
          float glowR = r * 2.4;
          float u = d / max(glowR, 0.001);
          float halo = (alpha > 0.35) ? (alpha * 0.22 * exp(-3.2 * u * u) * smoothstep(1.15, 0.2, u)) : 0.0;
          float core = alpha * (1.0 - smoothstep(max(0.0, r - 0.55), r + 0.7, d));

          float sparkle = 0.0;
          if (sparkleLen > 0.0) {
            float sH = (1.0 - smoothstep(0.0, 1.1, abs(v_local.y))) * (1.0 - smoothstep(0.0, sparkleLen, abs(v_local.x)));
            float sV = (1.0 - smoothstep(0.0, 1.1, abs(v_local.x))) * (1.0 - smoothstep(0.0, sparkleLen, abs(v_local.y)));
            sparkle = alpha * 0.45 * max(sH, sV);
          }

          float outA = clamp(max(core, halo + sparkle), 0.0, 1.0);
          if (outA <= 0.002) discard;
          fragColor = vec4(outA, outA, outA, outA);
        }
      }
    `;

    const vs = this._compileShader(gl, gl.VERTEX_SHADER, vsSrc);
    const fs = this._compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
    if (!vs || !fs) return false;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      return false;
    }

    this.glProg = prog;
    this.uResolution = gl.getUniformLocation(prog, 'u_resolution');
    this.uIsHighSpeed = gl.getUniformLocation(prog, 'u_isHighSpeed');

    this.vao = gl.createVertexArray();
    gl.bindVertexArray(this.vao);

    // Static quad buffer
    const quadVerts = new Float32Array([
      -1, -1, 1, -1, -1, 1,
      -1, 1, 1, -1, 1, 1
    ]);
    this.quadVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVbo);
    gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);
    const locCorner = gl.getAttribLocation(prog, 'a_corner');
    gl.enableVertexAttribArray(locCorner);
    gl.vertexAttribPointer(locCorner, 2, gl.FLOAT, false, 0, 0);

    // Dynamic instance buffer
    this.instVbo = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.instVbo);
    gl.bufferData(gl.ARRAY_BUFFER, this.instanceData.byteLength, gl.DYNAMIC_DRAW);

    const stride = this.instanceFloats * 4;
    const locPos = gl.getAttribLocation(prog, 'a_pos');
    gl.enableVertexAttribArray(locPos);
    gl.vertexAttribPointer(locPos, 2, gl.FLOAT, false, stride, 0);
    gl.vertexAttribDivisor(locPos, 1);

    const locPrev = gl.getAttribLocation(prog, 'a_prev');
    gl.enableVertexAttribArray(locPrev);
    gl.vertexAttribPointer(locPrev, 2, gl.FLOAT, false, stride, 8);
    gl.vertexAttribDivisor(locPrev, 1);

    const locParams = gl.getAttribLocation(prog, 'a_params');
    gl.enableVertexAttribArray(locParams);
    gl.vertexAttribPointer(locParams, 3, gl.FLOAT, false, stride, 16);
    gl.vertexAttribDivisor(locParams, 1);

    gl.bindVertexArray(null);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    return true;
  }

  resize() {
    if (!this.canvas) return;
    this.width = Math.max(1, window.innerWidth || 1920);
    this.height = Math.max(1, window.innerHeight || 1080);
    this.dpr = this.isWebGL ? Math.min(2.0, window.devicePixelRatio || 1) : 1;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.centerX = this.width / 2;
    this.centerY = this.height / 2;

    if (this.isWebGL && this.gl) {
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }

    const curMax = Math.max(this.width, this.height);
    if (this._initSpread && curMax > this._initSpread * 1.25) {
      this._initSpread = curMax;
      this.initStars();
    }
  }

  clear() {
    if (!this.canvas) return;
    if (this.isWebGL && this.gl) {
      this.gl.clearColor(0.0, 0.0, 0.0, 1.0);
      this.gl.clear(this.gl.COLOR_BUFFER_BIT);
    } else if (this.ctx) {
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  _resetStar(i, randomDepth = false) {
    const spread = Math.max(this.width, this.height) * 1.2;
    const z = randomDepth ? Math.random() * this.maxDepth : this.maxDepth;
    this.starX[i] = (Math.random() - 0.5) * spread;
    this.starY[i] = (Math.random() - 0.5) * spread;
    this.starZ[i] = z;
    this.starPrevZ[i] = z;
    this.starRadius[i] = 1.6 + Math.random() * 1.8;
    this.starTwinklePhase[i] = Math.random() * Math.PI * 2;
    this.starTwinkleSpeed[i] = 0.02 + Math.random() * 0.035;
    this.starDriftAngle[i] = Math.random() * Math.PI * 2;
    this.starDriftSpeed[i] = 0.2 + Math.random() * 0.35;
    this.starHasSparkle[i] = Math.random() < 0.28 ? 1 : 0;
  }

  initStars() {
    for (let i = 0; i < this.starCount; i++) {
      this._resetStar(i, true);
    }
  }

  setStarCount(count) {
    const next = Math.max(1, count | 0);
    if (next === this.starCount) return;
    this.starCount = next;
    this._allocArrays(next);
    this.initStars();
    if (this.isWebGL && this.gl && this.instVbo) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.instVbo);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, this.instanceData.byteLength, this.gl.DYNAMIC_DRAW);
    }
  }

  updateAudio(bass, mid, treble, isPlaying = true) {
    const rawEnergy = (bass * 1.4 + mid * 0.8 + treble * 0.4);
    this.bassEnergy = bass;

    if (isPlaying && rawEnergy > 0.02) {
      this.isWarping = true;
      this.audioEnergy = rawEnergy;
      const boost = Math.pow(Math.min(1.0, rawEnergy * 1.25), 1.8);
      this.targetSpeed = this.idleSpeed + boost * this.warpMaxSpeed;
    } else {
      this.isWarping = false;
      this.audioEnergy = 0.0;
      this.targetSpeed = this.idleSpeed;
    }
  }

  render(dt = 0.016) {
    if (!this.canvas) return;
    if (!this.isWebGL && !this.ctx) return;

    // 1. Smooth Inertial Speed Interpolation
    if (this.targetSpeed > this.currentSpeed) {
      this.currentSpeed += (this.targetSpeed - this.currentSpeed) * Math.min(1.0, dt * 18.0);
    } else {
      this.currentSpeed += (this.targetSpeed - this.currentSpeed) * Math.min(1.0, dt * 2.8);
    }

    const w = this.width;
    const h = this.height;
    const cx = this.centerX;
    const cy = this.centerY;
    const fov = 400;
    const frameScale = dt * 60.0;

    this.idleAngle += dt * 0.12;
    const isHighSpeed = this.currentSpeed > 1.8;
    const trailBoost = isHighSpeed ? (1.0 + Math.min(1.4, (this.currentSpeed - 1.8) * 0.045)) : 1.0;
    const effectiveTrail = this.currentSpeed * this.warpTrailFactor * trailBoost;
    const spreadRecycle = Math.max(w, h) * 1.15;

    let activeCount = 0;
    const inst = this.instanceData;
    const stride = this.instanceFloats;

    for (let i = 0; i < this.starCount; i++) {
      this.starTwinklePhase[i] += this.starTwinkleSpeed[i] * frameScale;
      this.starPrevZ[i] = this.starZ[i];
      this.starZ[i] -= this.currentSpeed * frameScale;

      if (!isHighSpeed) {
        const angle = this.starDriftAngle[i] + this.idleAngle;
        const dStep = this.starDriftSpeed[i] * frameScale;
        this.starX[i] += Math.cos(angle) * dStep;
        this.starY[i] += Math.sin(angle) * dStep;
      }

      if (this.starZ[i] <= 10) {
        this.starZ[i] = this.maxDepth;
        this.starPrevZ[i] = this.maxDepth;
        this.starX[i] = (Math.random() - 0.5) * spreadRecycle;
        this.starY[i] = (Math.random() - 0.5) * spreadRecycle;
      }

      const sx = this.starX[i];
      const sy = this.starY[i];
      const sz = this.starZ[i];

      const k = fov / sz;
      const px = sx * k + cx;
      const py = sy * k + cy;

      if (px < -60 || px > w + 60 || py < -60 || py > h + 60) {
        this.starZ[i] = this.maxDepth;
        this.starPrevZ[i] = this.maxDepth;
        continue;
      }

      const pk = fov / Math.max(10, this.starPrevZ[i] + effectiveTrail);
      const prevX = sx * pk + cx;
      const prevY = sy * pk + cy;

      const depthRatio = Math.max(0, Math.min(1.0, 1.0 - (sz / this.maxDepth)));
      const baseAlpha = 0.45 + depthRatio * 0.55;
      const twinkle = Math.sin(this.starTwinklePhase[i]) * 0.22;
      const alpha = Math.min(1.0, Math.max(0.25, baseAlpha + twinkle));
      const currentRadius = Math.max(1.2, this.starRadius[i] * (0.65 + depthRatio * 0.65));

      const sparkleLen = (!isHighSpeed && this.starHasSparkle[i] && depthRatio > 0.45 && alpha > 0.65)
        ? currentRadius * 2.2
        : 0.0;

      const off = activeCount * stride;
      inst[off] = px;
      inst[off + 1] = py;
      inst[off + 2] = prevX;
      inst[off + 3] = prevY;
      inst[off + 4] = currentRadius;
      inst[off + 5] = alpha;
      inst[off + 6] = sparkleLen;
      activeCount++;
    }

    if (this.isWebGL && this.gl) {
      const gl = this.gl;
      gl.clear(gl.COLOR_BUFFER_BIT);
      if (activeCount === 0) return;

      gl.useProgram(this.glProg);
      gl.uniform2f(this.uResolution, w, h);
      gl.uniform1f(this.uIsHighSpeed, isHighSpeed ? 1.0 : 0.0);

      gl.bindVertexArray(this.vao);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.instVbo);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, inst.subarray(0, activeCount * stride));
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, activeCount);
      gl.bindVertexArray(null);
      return;
    }

    // Zero-Allocation Pure-White Batched Canvas 2D Fallback (3 draw calls total)
    this._renderCanvas2DFallback(activeCount, isHighSpeed);
  }

  _renderCanvas2DFallback(activeCount, isHighSpeed) {
    const ctx = this.ctx;
    const inst = this.instanceData;
    const stride = this.instanceFloats;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.width, this.height);
    if (activeCount === 0) return;

    if (isHighSpeed) {
      ctx.lineCap = 'round';

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.32)';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      for (let i = 0; i < activeCount; i++) {
        const off = i * stride;
        const px = inst[off], py = inst[off + 1];
        const prevX = inst[off + 2], prevY = inst[off + 3];
        const dx = px - prevX, dy = py - prevY;
        if (dx * dx + dy * dy > 1.0) {
          ctx.moveTo(prevX, prevY);
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      for (let i = 0; i < activeCount; i++) {
        const off = i * stride;
        const px = inst[off], py = inst[off + 1];
        const prevX = inst[off + 2], prevY = inst[off + 3];
        const dx = px - prevX, dy = py - prevY;
        if (dx * dx + dy * dy > 1.0) {
          ctx.moveTo((prevX + px) * 0.5, (prevY + py) * 0.5);
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      for (let i = 0; i < activeCount; i++) {
        const off = i * stride;
        const px = inst[off], py = inst[off + 1];
        const r = Math.min(2.8, inst[off + 4] * 0.95);
        ctx.moveTo(px + r, py);
        ctx.arc(px, py, r, 0, Math.PI * 2);
      }
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
      ctx.beginPath();
      for (let i = 0; i < activeCount; i++) {
        const off = i * stride;
        const px = inst[off], py = inst[off + 1];
        const glowR = inst[off + 4] * 2.4;
        ctx.moveTo(px + glowR, py);
        ctx.arc(px, py, glowR, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
      ctx.beginPath();
      for (let i = 0; i < activeCount; i++) {
        const off = i * stride;
        const px = inst[off], py = inst[off + 1];
        const r = inst[off + 4];
        ctx.moveTo(px + r, py);
        ctx.arc(px, py, r, 0, Math.PI * 2);
      }
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
      ctx.lineWidth = 1.0;
      ctx.beginPath();
      for (let i = 0; i < activeCount; i++) {
        const off = i * stride;
        const sLen = inst[off + 6];
        if (sLen > 0.0) {
          const px = inst[off], py = inst[off + 1];
          ctx.moveTo(px - sLen, py);
          ctx.lineTo(px + sLen, py);
          ctx.moveTo(px, py - sLen);
          ctx.lineTo(px, py + sLen);
        }
      }
      ctx.stroke();
    }
  }
}

window.StarfieldEngine = StarfieldEngine;
