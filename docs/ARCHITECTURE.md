# System Architecture

## Modular Data & GPU Render Pipeline (`WebGL2-First + Zero-Alloc Fallback`)

```text
+-------------------------------------------------------------------+
|                     Windows Audio / GSMTC                         |
+-----------------------+--------------------------+----------------+
                        |                          |
                        v (WASAPI 128-FFT)         v (GSMTC + Zero-Width Seek)
        +---------------+--------------------------+----------------+
        | AudioPort & LivelyWasapiAdapter (js/audio_listener.js)    |
        +-------------------------------+---------------------------+
                                        |
                                        v
        +-------------------------------+---------------------------+
        | PlaybackSession (js/playback_session.js)                  |
        |  * Monotonic time integration & soft pause / 30s standby  |
        |  * 4s cut-song shield & authoritative pause lock          |
        +-------+-----------------------+-------------------+-------+
                |                       |                   |
                v                       v                   v
  +-------------+-------+   +-----------+---------+   +-----+---------------+
  | StarfieldEngine     |   | AuraBeamEngine      |   | LyricsEngine        |
  | (js/starfield_...)  |   | (js/aura_beam.js)   |   | (js/lyrics_engine)  |
  | * WebGL2 1x Draw    |   | * WebGL2 SDF Shader |   | * 5 LyricsPlus      |
  | * 110 SOA Stars     |   | * 256x2 Chroma LUT  |   | * BetterLyrics TTML |
  | * 2D Zero-Alloc FB  |   | * 2D Pre-Baked FB   |   | * LRCLIB + Hangul   |
  +---------------------+   +---------------------+   +---------------------+
```

---

## Core Physics & Shader Formulas

### 1. Constant-Arc-Length Capsule Parameterization

For a rounded-rectangle capsule of width $W$, height $H$, corner radius $R = H / 2$, and straight segment $L_{\text{straight}} = W - 2R$:

$$P = 2(W - 2R) + 2\pi R = 2(W - H) + \pi H$$

- **WebGL2 SDF Shader (`aura_beam.js`)**: Evaluates the exact signed distance $d(p)$ to the stadium capsule and projects any perimeter pixel $\mathbf{p}$ onto the continuous arc-length coordinate $s \in [0, P)$ in O(1) inside the fragment shader. Color lookup reads from a pre-baked `256 x 2` RGBA8 Chroma LUT texture in a single draw call.
- **Beam Length**: Locked at $L_{\text{beam}} = 0.35 \times P$ so linear velocity remains strictly uniform across straightaways and semicircular caps.

### 2. Rainmeter `AudioLevel` Attack / Decay DSP Velocity

$$\text{TargetBass} = (\text{RawBass})^{1.30}$$

- **Transient Attack ($\tau_{\text{att}} \approx 30\text{ ms}$)**: `min(1.0, dt * 32.0)`
- **Exponential Decay ($\tau_{\text{dec}} \approx 330\text{ ms}$)**: `min(1.0, dt * 3.0)`
- **Tangential Speed**:

$$v(t) = v_{\text{base}} + (\text{SmoothedBass} \times 1250.0) + (\text{SmoothedMid} \times 320.0)$$

### 3. Lyrics Viewport Culling & Candidate Scoring

1. **Zero-Allocation DOM Purge**: Switching tracks calls `purgePreviousSong()` (`AbortController.abort()` + `innerHTML = ''`) synchronously on `isNewSong`.
2. **Viewport Culling**: Only lines within `[activeIndex - 2, activeIndex + 2]` carry active transforms; offscreen nodes receive `visibility: hidden` and disable CSS blur filters (`filter: none; will-change: auto`) so Chromium skips offscreen filter layers.
3. **Outro Fade**: After $t_{\text{effective}} > t_{\text{last}} + 4.0\text{s}$, `.is-outro-faded` fades the viewport cleanly back to pure `#000000`.

---

## Key Maintenance Invariants

1. **Do NOT alter `.liquid-glass-capsule-wrapper` padding**: Wrapper padding must stay `0`, and `AuraBeamEngine` must measure unscaled `capsule.offsetWidth` / `offsetHeight` instead of `getBoundingClientRect()` (avoids double-scaling against CSS `scale(1.2)`).
2. **Keep `LivelyInfo.json` `"Arguments"` clean**: Keep `"--audio --system-nowplaying"`. Do not pass raw Chromium CLI switches inside `"Arguments"` (causes `WallpaperPluginException` in Lively).
3. **Zero per-frame allocations in render loops**: Both WebGL2 shaders and Canvas 2D fallbacks must remain free of per-frame `createLinearGradient`, `createRadialGradient`, or object allocations.
4. **Separate runtime root vs dev/packaging folders**: `index.html`, `LivelyInfo.json`, `assets/`, `css/`, `js/`, and `tools/` live at the wallpaper root so Lively Wallpaper loads directly without build steps; tests (`tests/`), docs (`docs/`), and release archives (`releases/`) stay isolated from packaged Lively ZIPs via `build.ps1`.
