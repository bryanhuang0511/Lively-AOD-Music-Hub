# Lively AOD Music Hub — Domain Glossary

An OLED Always-On Display (AOD) Music Hub desktop wallpaper designed for Windows 10/11 running inside Lively Wallpaper via WebView2. It couples WebGL2 GPU spectrum/starfield rendering, analytical SDF optical Chroma laser animations, and depth-of-field conveyor lyrics while maintaining near 0% idle load.

## Ubiquitous Language

- **Playback Session** (`playback_session.js`): Encapsulated state machine (`standby`, `playing`, `paused`, `pure_audio`), monotonic playback clock, transient notification filter, silence timeout, and cut-song shield. _Avoid_: PlaybackState, Player, AudioStatus.
- **Track**: Normalized metadata describing the active musical piece (`title`, `artist`, `album`, `duration`). _Avoid_: Song, MediaItem, AudioInfo.
- **Aura Beam** (`aura_beam.js`): Constant-arc-length, analytical SDF WebGL2 optical Chroma laser rim animated along the perimeter of the liquid-glass capsule. _Avoid_: BorderGlow, Ring, OuterEffect.
- **Starfield** (`starfield_engine.js`): 3D radial pure-white WebGL2 instanced star acceleration layer reacting with warp streaks to bass energy. _Avoid_: SpaceBackground, ParticleLayer.
- **Conveyor Lyrics** (`lyrics_engine.js`): Vertically centered, three-line optical depth-of-field lyric viewport with viewport culling and synchronized syllable wipes. _Avoid_: LyricScroll, Subtitles, TextTrack.
- **Capsule**: Central obsidian liquid-glass pill container holding the marquee track title, artist name, and playback status badge. _Avoid_: HubCard, HeaderBox, Bar.
- **Standby Sleep**: Pure `#000000` power-saving display state engaged after 30 seconds of sustained audio silence. _Avoid_: InactiveMode, IdleState, ScreenOff.
