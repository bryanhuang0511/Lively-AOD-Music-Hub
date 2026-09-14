/**
 * ============================================================================
 * 🎵 AudioPort & Adapters - Clean Audio Ingestion Architecture
 * ============================================================================
 * Two concrete adapters satisfy the AudioPort seam:
 * 1. LivelyWasapiAdapter: Windows GSMTC & WASAPI 128-band loopback (prod).
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
}

/**
 * LivelyWasapiAdapter - Concrete adapter for Windows WASAPI Loopback & GSMTC Media
 */
class LivelyWasapiAdapter {
  constructor(port) {
    this.port = port;
    this.bindLivelyGlobals();
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

    // 2. Windows GSMTC Track & Album Art Listener
    window.livelyCurrentTrack = (data) => {
      try {
        const track = typeof data === 'string' ? JSON.parse(data) : data;
        if (!track) return;

        const info = {
          title: track.Title || track.title || '',
          artist: track.Artist || track.artist || '',
          album: track.AlbumTitle || track.album || '',
          thumbnail: track.Thumbnail || track.thumbnail || null,
          genres: track.Genres || track.genres || []
        };

        this.port.emitTrack(info);
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
  constructor(onAudio, onTrack, onPlaybackChange) {
    this.port = new AudioPort()
      .onAudio(onAudio)
      .onTrack(onTrack)
      .onPlaybackChange(onPlaybackChange);

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
