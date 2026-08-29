/**
 * 🎵 Audio Listener & Lively Media Integration
 * CRITICAL: Declared globally at top-level so Lively Wallpaper detects audio support immediately on WebView2 boot!
 */

// Global state and callbacks
window._livelyAudioCallback = null;
window._livelyTrackCallback = null;
window._livelyAudioRawFft = new Float32Array(128);

// 1. GLOBAL Lively 128-band Audio Spectrum Listener (WASAPI Loopback)
window.livelyAudioListener = function(audioArray) {
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

  if (window._livelyAudioCallback) {
    window._livelyAudioCallback(bass, mid, treble, window._livelyAudioRawFft);
  }
};

// 2. GLOBAL Lively System Track & Album Art Listener (Windows GSMTC)
window.livelyCurrentTrack = function(data) {
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

    if (window._livelyTrackCallback) {
      window._livelyTrackCallback(info);
    }
  } catch (e) {
    console.warn('Error parsing livelyCurrentTrack:', e);
  }
};

// 3. GLOBAL Lively Wallpaper Native Playback State Callback (Lively 系統全域暫停/播放回調)
window._livelyPlaybackChangedCallback = null;
window.livelyWallpaperPlaybackChanged = function(data) {
  try {
    const isPaused = typeof data === 'boolean' ? data : (data && typeof data.IsPaused !== 'undefined' ? data.IsPaused : false);
    if (window._livelyPlaybackChangedCallback) {
      window._livelyPlaybackChangedCallback(isPaused);
    }
  } catch (e) {
    console.warn('Error handling livelyWallpaperPlaybackChanged:', e);
  }
};

/**
 * AudioListenerEngine Class for UI binding & Web Audio fallback
 */
class AudioListenerEngine {
  constructor(onAudioUpdate, onTrackUpdate, onPlaybackChange = null) {
    window._livelyAudioCallback = onAudioUpdate;
    window._livelyTrackCallback = onTrackUpdate;
    window._livelyPlaybackChangedCallback = onPlaybackChange;

    this.setupWebAudioFallback();
  }

  setupWebAudioFallback() {
    this.audioElement = new Audio();
    this.audioElement.crossOrigin = 'anonymous';
    this.audioCtx = null;
    this.analyser = null;
    this.source = null;
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

        if (window._livelyAudioCallback) {
          window._livelyAudioCallback(bass, mid, treble, window._livelyAudioRawFft);
        }
      }
      requestAnimationFrame(updateLoop);
    };
    updateLoop();
  }

  get isLocalAudioPlaying() {
    return this.audioElement && !this.audioElement.paused;
  }
}

window.AudioListenerEngine = AudioListenerEngine;
