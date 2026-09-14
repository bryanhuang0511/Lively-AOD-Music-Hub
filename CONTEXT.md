# Lively_AOD_Music_Hub Context

An OLED Always-On Display (AOD) Music Hub desktop wallpaper designed for Windows 10/11 running inside Lively Wallpaper via WebView2. It couples real-time audio spectrum visualization, dynamic optical Chroma laser animations, and depth-of-field conveyor lyrics while maintaining near 0% GPU/CPU idle load.

## Language

**Playback Session**:
The encapsulated state and monotonic time tracking model for audio playback, coordinating active audio streaming, silence timeouts, and deep sleep transitions.
_Avoid_: PlaybackState, Player, AudioStatus

**Track**:
The metadata describing the currently active musical piece, including title, artist, album name, and duration.
_Avoid_: Song, MediaItem, AudioInfo

**Aura Beam**:
The constant-arc-length, arc-length-parameterized optical Chroma laser rim animated along the perimeter of the liquid-glass capsule.
_Avoid_: BorderGlow, Ring, OuterEffect

**Starfield**:
The 3D radial star acceleration background canvas layer reacting with warp streaks to bass energy drops.
_Avoid_: SpaceBackground, ParticleLayer

**Conveyor Lyrics**:
The vertically centering, three-line optical depth-of-field lyric viewport featuring synchronized progressive karaoke wipes.
_Avoid_: LyricScroll, Subtitles, TextTrack

**Capsule**:
The central obsidian liquid-glass pill container holding the dynamic marquee track title, artist name, and playback status badge.
_Avoid_: HubCard, HeaderBox, Bar

**Standby Sleep**:
The 100% pitch-black `#000000` power-saving display state automatically engaged after 30 seconds of complete audio silence.
_Avoid_: InactiveMode, IdleState, ScreenOff
