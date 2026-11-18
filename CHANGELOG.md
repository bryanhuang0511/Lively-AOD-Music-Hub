# Changelog

All notable changes to **Lively AOD Music Hub** will be documented in this file.

## [v1.0.0] - 2026-11-18
### Added
- **WebGL2 GPU Instanced Starfield (`StarfieldEngine`)**: Single `drawArraysInstanced` GPU draw call with `Float32Array` SOA typed arrays, pure-white standby halo + cross-sparkle optical shader, warp bass streaks, `dt * 60` frame-rate independence across 60Hz/144Hz monitors, proportional viewport resize scaling, and zero-gradient Canvas 2D fallback.
- **WebGL2 Analytical Capsule SDF Aura Beam (`AuraBeamEngine`)**: Fragment-shader signed distance field (SDF) with exact arc-length perimeter parameterization, pre-baked `256x2` RGBA8 Google Chroma LUT texture, 3-layer optical bloom (`9.5px` Halo + `3.4px` Neon + `1.6px` White-Hot Core), Rainmeter `30ms`/`330ms` Attack/Decay DSP velocity modulation, and pre-baked chunk Canvas 2D fallback.
- **Unified Multi-Source Synced Lyrics Engine (`LyricsEngine`)**: Parallel 3-source / 5-mirror `LyricsPlus` + `BetterLyrics` TTML + structured LRCLIB search with bilingual parenthesis decomposition, Korean Hangul authentic lyric defense, unified `scoreCandidate` progressive upgrades (`commitCollected`), OpenCC zero-latency Simplified-to-Taiwan Traditional Chinese conversion, and `aod_lrc_v3_` cache (pure display-only desktop without accidental wheel/click interaction).
- **Zero-Width GSMTC Steganography Tunnel (`tools/browser_sync_extension`)**: Native Chromium MediaSession -> Windows GSMTC zero-width seek/play/pause carrier with debounced timers and buffering jump protection.
- **Standby Power-Saving & Viewport Culling**: `index ± 2` visible lyrics culling (disabling offscreen CSS blur compositing), paused CSS sheen animation in standby, adaptive `IDLE_FRAME_INTERVAL_MS` frame pacing, and clean `Lively` playback pause/visibility gating.
- **Modular Engineering Layout**: Aligned repository structure (`docs/`, `tests/`, `tools/`, `releases/`, `build.ps1`, `verify_build.ps1`, `指引.md`, `CHANGELOG.md`, `LICENSE`) and reset version numbering cleanly to `v1.0.0`.
