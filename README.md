# 🎵 Lively AOD Music Hub

> **OLED Always-On Display Obsidian Liquid-Glass Music Wallpaper & WebGL2 GPU Engine (`v1.0.0`)**  
> WebGL2 Instanced Starfield ・ Analytical Capsule SDF Chroma Aura ・ Unified Multi-Source Synced Lyrics ・ Zero-Width GSMTC Fast-Forward Tunnel ・ 144Hz Ultra-Low CPU Architecture

[📘 正體中文完整架構與操作指引 (指引.md)](指引.md) ｜ [📜 更新紀錄 (CHANGELOG.md)](CHANGELOG.md)

---

## ✨ Highlights (`v1.0.0`)

- **WebGL2 GPU Render Pipeline (`144Hz`-Ready)**:
  - **`StarfieldEngine`**: Single-draw-call `drawArraysInstanced` GPU particle renderer with `Float32Array` SOA buffers, optical cross-sparkle standby stars, bass-reactive warp streaks, and `dt * 60` frame-rate independence (plus zero-gradient Canvas 2D fallback).
  - **`AuraBeamEngine`**: Fragment-shader analytical Stadium Capsule SDF with exact perimeter arc-length parameterization, pre-baked `256x2` Chroma LUT texture, 3-layer optical bloom, and Rainmeter `30ms`/`330ms` Attack/Decay DSP velocity modulation.
- **Standby Power Saving & Viewport Lyrics Culling**:
  Renders only `[activeIndex - 2, activeIndex + 2]` visible lyric rows (disabling offscreen CSS blur compositing), pauses glass specular sheen animations in `standby`, and uses adaptive frame pacing for near-zero idle overhead.
- **Unified Multi-Source Synced Lyrics (`LyricsEngine`)**:
  Parallel queries across **5 `LyricsPlus` mirrors**, **`BetterLyrics` TTML**, and **structured `LRCLIB`** with bilingual parenthesis decomposition, Korean Hangul authentic-script defense, unified `scoreCandidate` progressive upgrades, instant OpenCC Simplified-to-Taiwan Traditional Chinese conversion, and `aod_lrc_v3_` cache (pure display mode without accidental desktop mouse/wheel interaction).
- **Zero-Width GSMTC Fast-Forward Tunnel (`tools/browser_sync_extension`)**:
  Optional Chromium MV3 content script encoding playback seek/play/pause state as invisible Unicode zero-width characters in MediaSession `artist` metadata for instant timeline sync inside Lively Wallpaper.

---

## 📂 Module Architecture

| Path | Role | Description |
| :--- | :--- | :--- |
| [`LivelyInfo.json`](LivelyInfo.json) | Wallpaper Manifest | Lively metadata, thumbnail/preview path, and `--audio --system-nowplaying` runtime flags (`1.0.0.0`). |
| [`index.html`](index.html) | Wallpaper Entrypoint | Pure pitch-black `#000000` AOD layout hosting starfield canvas, obsidian capsule, and conveyor lyrics viewport. |
| [`js/`](js/) | Modular Runtime Core | Single-responsibility ES modules: `audio_listener.js`, `playback_session.js`, `starfield_engine.js`, `aura_beam.js`, `lyrics_engine.js`, and `app.js`. |
| [`css/style.css`](css/style.css) | Optical Stylesheet | Deep obsidian glass layers, GPU compositing hints, viewport-culled depth-of-field lyric rows, and standby sleep rules. |
| [`tools/`](tools/) | Companion Sync Tools | Chromium MV3 extension (`browser_sync_extension/`, `1.0.0`) and optional Windows GSMTC HTTP timeline bridge (`timeline_bridge.ps1`). |
| [`assets/`](assets/) | Static Media Assets | Preview thumbnail (`preview.png`) and offline sample lyrics (`demo_lyrics.lrc`). |
| [`tests/`](tests/) | Automated Verification | Domain unit suites (`test_lyrics.js`, `test_rendering.js`, `test_session.js`) plus Headless Edge WebGL2/CPU benchmark (`run_perf_test.js`). |
| [`docs/`](docs/) | Engineering Docs | System architecture notes ([`ARCHITECTURE.md`](docs/ARCHITECTURE.md)) and ubiquitous domain glossary ([`DOMAIN_GLOSSARY.md`](docs/DOMAIN_GLOSSARY.md)). |

---

## 🚀 Quick Start (Lively Wallpaper ZIP Release)

1. Download **`Lively_AOD_Music_Hub_v1.0.0.zip`** from [GitHub Releases](https://github.com/bryanhuang0511/Lively-AOD-Music-Hub/releases).
2. Open **[Lively Wallpaper](https://rocksdanister.github.io/lively/)** and drag the `.zip` archive directly into the Lively window to apply.
3. *(Optional)* To sync browser seek / fast-forward timestamps from YouTube Music, YouTube, or Spotify Web:
   - Open `chrome://extensions` or `edge://extensions`, enable **Developer Mode**, and load [`tools/browser_sync_extension`](tools/browser_sync_extension).

---

## 🛠️ Development & Packaging

```powershell
# 1. Build clean Lively Wallpaper release archive -> releases/Lively_AOD_Music_Hub_v1.0.0.zip
.\build.ps1 -PackageZip

# 2. Run modular unit tests, Headless Edge GPU/CPU benchmark & ZIP validation
.\verify_build.ps1
```

---

## 📄 License

Released under the [MIT License](LICENSE).
