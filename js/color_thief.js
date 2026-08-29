/**
 * 🎨 Dynamic Color Palette & Dominant Color Extractor
 * Crash-proof with debouncing to handle ultra-rapid song skipping smoothly!
 */
class ColorThiefEngine {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    this.canvas.width = 48;
    this.canvas.height = 48;

    this.currentPrimary = [160, 235, 255]; // Authentic Star Rail Nihility Platinum-Cyan
    this.currentSecondary = [0, 180, 216];
    this.extractDebounceTimer = null;
  }

  /**
   * Extract vibrant colors with debouncing to prevent UI freeze on fast skips
   */
  extractFromImage(imgElement) {
    if (!imgElement) return;

    if (this.extractDebounceTimer) {
      clearTimeout(this.extractDebounceTimer);
    }

    this.extractDebounceTimer = setTimeout(() => {
      try {
        if (!imgElement.complete || imgElement.naturalWidth === 0) return;

        this.ctx.clearRect(0, 0, 48, 48);
        this.ctx.drawImage(imgElement, 0, 0, 48, 48);
        const imgData = this.ctx.getImageData(0, 0, 48, 48).data;

        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        let maxVibrancy = 0;
        let vibrantR = 0, vibrantG = 240, vibrantB = 255;

        for (let i = 0; i < imgData.length; i += 16) {
          const r = imgData[i];
          const g = imgData[i + 1];
          const b = imgData[i + 2];
          const a = imgData[i + 3];

          if (a < 128) continue;

          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const delta = max - min;
          const sat = max === 0 ? 0 : delta / max;
          const bright = max / 255;

          if (bright > 0.15 && bright < 0.95 && sat > 0.3) {
            const score = sat * 1.5 + bright;
            if (score > maxVibrancy) {
              maxVibrancy = score;
              vibrantR = r;
              vibrantG = g;
              vibrantB = b;
            }
            rSum += r;
            gSum += g;
            bSum += b;
            count++;
          }
        }

        if (count > 0 && maxVibrancy > 0.5) {
          this.applyPalette(vibrantR, vibrantG, vibrantB);
        }
      } catch (e) {
        console.warn('Safe color extraction notice:', e);
      }
    }, 200);
  }

  applyPalette(r, g, b) {
    this.currentPrimary = [r, g, b];
    const root = document.documentElement;

    const primaryHex = `rgb(${r}, ${g}, ${b})`;
    const secondaryHex = `rgb(${Math.max(0, r - 35)}, ${Math.max(0, g - 20)}, ${Math.max(0, b - 20)})`;
    const glowRgba = `rgba(${r}, ${g}, ${b}, 0.65)`;
    const dimRgba = `rgba(${r}, ${g}, ${b}, 0.22)`;

    root.style.setProperty('--accent-primary', primaryHex);
    root.style.setProperty('--accent-secondary', secondaryHex);
    root.style.setProperty('--accent-glow', glowRgba);
    root.style.setProperty('--accent-dim', dimRgba);
  }

  getColorRGB() {
    return this.currentPrimary || [0, 240, 255];
  }
}

window.colorThief = new ColorThiefEngine();
