/**
 * ============================================================================
 * 🎵 AudioPort & Adapters - Clean Audio & Timeline Ingestion Architecture
 * ============================================================================
 * Concrete adapters satisfy the AudioPort seam:
 * 1. LivelyWasapiAdapter: Windows GSMTC, WASAPI 128-band loopback & Local Timeline Bridge.
 * 2. WebAudioFileAdapter: Local file AudioContext & AnalyserNode playback (local/fallback).
 *
 * CRITICAL FOR LIVELY WALLPAPER:
 * window.livelyAudioListener, window.livelyCurrentTrack, window.livelyWallpaperPlaybackChanged
 * are bound immediately at root level so WebView2 registers audio listeners on launch!
 */

// Global storage for normalized FFT data
window._livelyAudioRawFft = new Float32Array(128);

/**
 * AudioPort - Event dispatch seam between concrete audio adapters and PlaybackSession
 */
class AudioPort {
  constructor() {
    this.audioCallback = null;
    this.trackCallback = null;
    this.playbackCallback = null;
    this.timelineCallback = null;
  }

  onAudio(callback) {
    this.audioCallback = callback;
    return this;
  }

  onTrack(callback) {
    this.trackCallback = callback;
    return this;
  }

  onPlaybackChange(callback) {
    this.playbackCallback = callback;
    return this;
  }

  onTimeline(callback) {
    this.timelineCallback = callback;
    return this;
  }

  emitAudio(bass, mid, treble, rawFft) {
    if (this.audioCallback) {
      this.audioCallback(bass, mid, treble, rawFft);
    }
  }

  emitTrack(trackInfo) {
    if (this.trackCallback) {
      this.trackCallback(trackInfo);
    }
  }

  emitPlaybackChange(isPaused) {
    if (this.playbackCallback) {
      this.playbackCallback(isPaused);
    }
  }

  emitTimeline(timelineData) {
    if (this.timelineCallback) {
      this.timelineCallback(timelineData);
    }
  }
}

/**
 * LivelyWasapiAdapter - Concrete adapter for Windows WASAPI Loopback, GSMTC Media & Timeline Sync
 */
class LivelyWasapiAdapter {
  constructor(port) {
    this.port = port;
    this.bridgeConnected = false;
    this.bindLivelyGlobals();
    // Zero-Width GSMTC Steganography Tunnel handles real-time seek natively;
    // only poll localhost HTTP bridge if explicitly requested.
    if (window.ENABLE_LOCAL_TIMELINE_BRIDGE === true) {
      this.startTimelineBridgePoller();
    }
  }

  /**
   * Decodes invisible Zero-Width Binary Steganography (\u200B=0, \u200C=1)
   * embedded inside GSMTC Artist / Title strings by the Browser Sync Extension.
   * Since Chromium's SystemMediaControlsWin only forwards Title & Artist to
   * Windows GSMTC, and Lively Wallpaper's NpsmNowPlayingService checks
   * (media.Title != model.Title || media.Artist != model.Artist), encoding
   * the seek timestamp in zero-width characters triggers instant Lively callbacks
   * while remaining 100% invisible in Windows UI!
   */
  static decodeZeroWidthTunnel(str) {
    const raw = String(str || '');
    const startMarker = '\u200D\u200B\u200D';
    const endMarker = '\u200D\u200C\u200D';
    const sIdx = raw.indexOf(startMarker);
    const eIdx = sIdx !== -1 ? raw.indexOf(endMarker, sIdx + 3) : -1;

    if (sIdx === -1 || eIdx === -1) {
      return {
        clean: raw.replace(/[\u200B-\u200D\uFEFF]/g, '').trim(),
        data: null
      };
    }

    const bits = raw.slice(sIdx + 3, eIdx);
    let ascii = '';
    for (let i = 0; i + 7 <= bits.length; i += 7) {
      let code = 0;
      for (let b = 0; b < 7; b++) {
        code = (code << 1) | (bits[i + b] === '\u200C' ? 1 : 0);
      }
      ascii += String.fromCharCode(code);
    }

    const clean = (raw.slice(0, sIdx) + raw.slice(eIdx + 3))
      .replace(/[\u200B-\u200D\uFEFF]/g, '')
      .trim();

    const parts = ascii.split('_');
    if (parts.length >= 3) {
      const pos = parseFloat(parts[0]);
      const dur = parseFloat(parts[1]);
      const playing = parts[2] === '1';
      if (Number.isFinite(pos) && pos >= 0) {
        return {
          clean,
          data: {
            position: pos,
            duration: Number.isFinite(dur) && dur > 20 ? dur : undefined,
            isPlaying: playing
          }
        };
      }
    }
    return { clean, data: null };
  }

  bindLivelyGlobals() {
    // 1. WASAPI 128-Band Audio Spectrum Listener
    window.livelyAudioListener = (audioArray) => {
      if (!audioArray || audioArray.length === 0) return;

      let bSum = 0, mSum = 0, tSum = 0;
      for (let i = 0; i < 128; i++) {
        const val = audioArray[i] || 0;
        window._livelyAudioRawFft[i] = val;

        if (i < 16) bSum += val;        // Bass (0-15)
        else if (i < 64) mSum += val;   // Mid (16-63)
        else tSum += val;               // Treble (64-127)
      }

      const bass = Math.min(1.0, (bSum / 16) * 2.2);
      const mid = Math.min(1.0, (mSum / 48) * 2.5);
      const treble = Math.min(1.0, (tSum / 64) * 2.8);

      this.port.emitAudio(bass, mid, treble, window._livelyAudioRawFft);
    };

    // 2. Windows GSMTC Track, Album Art & Zero-Width Steganography Tunnel Listener
    window.livelyCurrentTrack = (data) => {
      try {
        const track = typeof data === 'string' ? JSON.parse(data) : data;
        if (!track) return;

        const decodedTitle = LivelyWasapiAdapter.decodeZeroWidthTunnel(track.Title || track.title || '');
        const decodedArtist = LivelyWasapiAdapter.decodeZeroWidthTunnel(track.Artist || track.artist || '');
        let rawAlbum = String(track.AlbumTitle || track.album || '').replace(/[\u200B-\u200D\uFEFF]/g, '');

        let tunnelPos = typeof track.Position === 'number' ? track.Position : (typeof track.position === 'number' ? track.position : undefined);
        let tunnelDur = typeof track.Duration === 'number' ? track.Duration : (typeof track.duration === 'number' ? track.duration : undefined);
        let tunnelPlaying = undefined;

        const zwData = decodedArtist.data || decodedTitle.data;
        if (zwData) {
          tunnelPos = zwData.position;
          if (zwData.duration) tunnelDur = zwData.duration;
          tunnelPlaying = zwData.isPlaying;
        }

        // Fallback text tag check on AlbumTitle
        const tunnelMatch = rawAlbum.match(/\s*#aod_t=([\d.]+)_([\d.]+)_([01])$/);
        if (tunnelMatch) {
          tunnelPos = parseFloat(tunnelMatch[1]);
          const parsedDur = parseFloat(tunnelMatch[2]);
          if (parsedDur > 20) tunnelDur = parsedDur;
          tunnelPlaying = tunnelMatch[3] === '1';
          rawAlbum = rawAlbum.replace(/\s*#aod_t=[\d.]+_[\d.]+_[01]$/, '').trim();
        }

        const info = {
          title: decodedTitle.clean,
          artist: decodedArtist.clean,
          album: rawAlbum,
          thumbnail: track.Thumbnail || track.thumbnail || null,
          genres: track.Genres || track.genres || [],
          position: tunnelPos,
          duration: tunnelDur
        };

        this.port.emitTrack(info);

        if (typeof tunnelPos === 'number' && Number.isFinite(tunnelPos)) {
          this.port.emitTimeline({
            title: info.title,
            artist: info.artist,
            position: tunnelPos,
            duration: tunnelDur,
            isPlaying: tunnelPlaying
          });
        }
      } catch (e) {
        console.warn('Error parsing livelyCurrentTrack:', e);
      }
    };

    // 3. Lively System Playback State Callback
    window.livelyWallpaperPlaybackChanged = (data) => {
      try {
        const isPaused = typeof data === 'boolean'
          ? data
          : (data && typeof data.IsPaused !== 'undefined' ? data.IsPaused : false);
        this.port.emitPlaybackChange(isPaused);
      } catch (e) {
        console.warn('Error handling livelyWallpaperPlaybackChanged:', e);
      }
    };

    // 4. Direct Timeline Sync Hook (for external injection or custom WebView2 bridges)
    window.livelyTimelineSync = (data) => {
      try {
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;
        if (parsed) {
          this.port.emitTimeline(parsed);
        }
      } catch (e) {}
    };
  }

  /**
   * Adaptive Localhost Timeline Poller (http://127.0.0.1:8974/timeline)
   * Syncs millisecond-exact playback position & fast-forward/rewind events
   * from Windows GSMTC Timeline Bridge or Browser Extension when active.
   * Zero console noise & backs off to 4.5s when bridge is not running.
   */
  startTimelineBridgePoller() {
    const BRIDGE_URL = 'http://127.0.0.1:8974/timeline';

    const poll = async () => {
      if (document.hidden) {
        setTimeout(poll, 2000);
        return;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 800);

      try {
        const res = await fetch(BRIDGE_URL, {
          method: 'GET',
          cache: 'no-store',
          signal: controller.signal
        });
        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json();
          this.bridgeConnected = true;
          if (data && data.active) {
            if (data.title) {
              this.port.emitTrack({
                title: data.title,
                artist: data.artist || '',
                album: data.album || '',
                position: data.position,
                duration: data.duration
              });
            }
            this.port.emitTimeline({
              title: data.title || '',
              artist: data.artist || '',
              position: data.position,
              duration: data.duration,
              isPlaying: data.isPlaying
            });
          }
          setTimeout(poll, 320);
          return;
        }
      } catch (e) {
        clearTimeout(timer);
        this.bridgeConnected = false;
      }

      setTimeout(poll, this.bridgeConnected ? 1000 : 4500);
    };

    setTimeout(poll, 1200);
  }
}

/**
 * WebAudioFileAdapter - Concrete adapter for Local Audio Files via Web Audio API
 */
class WebAudioFileAdapter {
  constructor(port) {
    this.port = port;
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
    this.isLoopRunning = false;
  }

  initLocalAudio(audioFile) {
    if (!this.audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioCtx();
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.source = this.audioCtx.createMediaElementSource(this.audioElement);
      this.source.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.audioElement.src = URL.createObjectURL(audioFile);
    this.audioElement.play();

    if (!this.isLoopRunning) {
      this.isLoopRunning = true;
      const freqData = new Uint8Array(this.analyser.frequencyBinCount);
      const updateLoop = () => {
        if (!this.audioElement.paused) {
          this.analyser.getByteFrequencyData(freqData);

          let bSum = 0, mSum = 0, tSum = 0;
          for (let i = 0; i < 128; i++) {
            const val = (freqData[i] || 0) / 255.0;
            window._livelyAudioRawFft[i] = val;
            if (i < 16) bSum += val;
            else if (i < 64) mSum += val;
            else tSum += val;
          }

          const bass = Math.min(1.0, (bSum / 16) * 2.2);
          const mid = Math.min(1.0, (mSum / 48) * 2.5);
          const treble = Math.min(1.0, (tSum / 64) * 2.8);

          this.port.emitAudio(bass, mid, treble, window._livelyAudioRawFft);
          if (Number.isFinite(this.audioElement.currentTime)) {
            this.port.emitTimeline({
              position: this.audioElement.currentTime,
              duration: Number.isFinite(this.audioElement.duration) ? this.audioElement.duration : undefined,
              isPlaying: !this.audioElement.paused
            });
          }
        }
        requestAnimationFrame(updateLoop);
      };
      requestAnimationFrame(updateLoop);
    }
  }

  get isPlaying() {
    return this.audioElement && !this.audioElement.paused;
  }
}

/**
 * AudioListenerEngine - Unified Facade combining AudioPort and both Adapters
 */
class AudioListenerEngine {
  constructor(onAudio, onTrack, onPlaybackChange, onTimeline) {
    this.port = new AudioPort()
      .onAudio(onAudio)
      .onTrack(onTrack)
      .onPlaybackChange(onPlaybackChange)
      .onTimeline(onTimeline);

    this.livelyAdapter = new LivelyWasapiAdapter(this.port);
    this.webAudioAdapter = new WebAudioFileAdapter(this.port);
  }

  initLocalAudio(file) {
    this.webAudioAdapter.initLocalAudio(file);
  }

  get isLocalAudioPlaying() {
    return this.webAudioAdapter.isPlaying;
  }
}

window.AudioPort = AudioPort;
window.LivelyWasapiAdapter = LivelyWasapiAdapter;
window.WebAudioFileAdapter = WebAudioFileAdapter;
window.AudioListenerEngine = AudioListenerEngine;
