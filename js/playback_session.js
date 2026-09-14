/**
 * ============================================================================
 * 🌌 PlaybackSession - Deep Audio & State Machine Architecture
 * ============================================================================
 * Consolidates:
 * 1. Monotonic elapsed playback clock with boundary protection.
 * 2. 400ms Transient Notification Filter (prevents UI flutter on system beeps).
 * 3. Tiered Silence Protocol (1.6s pause -> 30s 100% pitch-black standby sleep).
 * 4. 4s Cut-Song Shield & GSMTC Authoritative Pause Lock.
 * 5. Clean Event Emitter Seam (stateChange, timeUpdate, trackChange, audioTick).
 */

class PlaybackSession {
  constructor(options = {}) {
    this.pauseTimeout = options.pauseTimeout || 1600;   // 1.6s silence -> Paused
    this.sleepTimeout = options.sleepTimeout || 30000;  // 30s silence -> Deep Standby Sleep
    this.defaultDuration = options.defaultDuration || 210;

    // Core States: 'standby' | 'playing' | 'paused' | 'pure_audio'
    this.state = 'standby';
    this.isAuthoritativePaused = false;
    this.hasGSMTCTrack = false;

    // Track metadata
    this.track = {
      title: '',
      artist: '',
      album: '',
      thumbnail: null
    };
    this.songSignature = '';
    this.trackDuration = this.defaultDuration;

    // Monotonic Clock & Silence Timing
    this.playbackTime = 0.0;
    this.lastAudioTime = performance.now();
    this.lastAudioTick = performance.now();
    this.sustainedAudioDuration = 0.0;
    this.trackTransitionUntil = 0.0;

    // Audio reactive state
    this.bass = 0.0;
    this.mid = 0.0;
    this.treble = 0.0;
    this.rawFft = new Float32Array(128);

    // Event listener map
    this.listeners = {
      stateChange: [],
      timeUpdate: [],
      trackChange: [],
      audioTick: []
    };
  }

  on(event, handler) {
    if (this.listeners[event]) {
      this.listeners[event].push(handler);
    }
    return this;
  }

  off(event, handler) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(h => h !== handler);
    }
    return this;
  }

  emit(event, ...args) {
    if (this.listeners[event]) {
      for (let i = 0; i < this.listeners[event].length; i++) {
        try {
          this.listeners[event][i](...args);
        } catch (e) {
          console.error(`Error in PlaybackSession event [${event}]:`, e);
        }
      }
    }
  }

  setState(newState) {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.emit('stateChange', newState, oldState);
    }
  }

  get isPlaying() {
    return this.state === 'playing' || this.state === 'pure_audio';
  }

  get isPaused() {
    return this.state === 'paused';
  }

  get isStandby() {
    return this.state === 'standby';
  }

  feedAudio(bass, mid, treble, rawFft = null) {
    const now = performance.now();
    const dtAudio = Math.min(0.1, (now - this.lastAudioTick) / 1000);
    this.lastAudioTick = now;

    this.bass = bass;
    this.mid = mid;
    this.treble = treble;
    if (rawFft) {
      this.rawFft = rawFft;
    }

    const currentEnergy = bass + mid + treble;

    // 400ms Transient Notification Filter
    if (currentEnergy > 0.005) {
      this.sustainedAudioDuration += dtAudio;
    } else {
      this.sustainedAudioDuration = Math.max(0, this.sustainedAudioDuration - dtAudio * 2.5);
    }

    const isLegitMusicStream = this.sustainedAudioDuration >= 0.38 || this.isPlaying;

    if (currentEnergy > 0.003 && isLegitMusicStream) {
      this.lastAudioTime = now;

      // Pure audio stream fallback when sound exists without GSMTC metadata
      if (!this.hasGSMTCTrack && this.songSignature !== 'PURE_AUDIO_STREAM') {
        this.songSignature = 'PURE_AUDIO_STREAM';
        this.track = {
          title: 'PURE AUDIO STREAM',
          artist: 'SYSTEM AUDIO',
          album: '',
          thumbnail: null
        };
        this.setState('pure_audio');
        this.emit('trackChange', this.track, true);
      }

      if (this.sustainedAudioDuration >= 0.5 && !this.isAuthoritativePaused) {
        if (!this.isPlaying) {
          this.setState(this.hasGSMTCTrack ? 'playing' : 'pure_audio');
        }
      }
    }

    this.emit('audioTick', this.bass, this.mid, this.treble, this.rawFft, this.isPlaying);
  }

  setTrack(trackInfo) {
    const now = performance.now();

    if (!trackInfo || (!trackInfo.title && !trackInfo.artist)) {
      this.hasGSMTCTrack = false;
      this.initCleanStandby();
      return;
    }

    const title = trackInfo.title || '未知歌曲';
    const artist = trackInfo.artist || '未知演出者';
    const songSig = `${title}_${artist}`;
    const isNewSong = songSig !== this.songSignature;

    this.playbackTime = 0.0;
    this.lastAudioTime = now;
    this.trackTransitionUntil = now + 4000; // 4s cut-song protection shield

    this.track = {
      title,
      artist,
      album: trackInfo.album || '',
      thumbnail: trackInfo.thumbnail || null
    };

    this.songSignature = songSig;
    this.hasGSMTCTrack = true;
    this.isAuthoritativePaused = false;

    this.setState('playing');
    this.emit('trackChange', this.track, isNewSong);
  }

  setDuration(duration) {
    if (duration && duration > 20) {
      this.trackDuration = duration;
    }
  }

  setAuthoritativePause(isPaused) {
    if (isPaused) {
      this.isAuthoritativePaused = true;
      this.sustainedAudioDuration = 0;
      this.setState('paused');
    } else {
      this.isAuthoritativePaused = false;
      this.setState(this.hasGSMTCTrack ? 'playing' : (this.songSignature === 'PURE_AUDIO_STREAM' ? 'pure_audio' : 'playing'));
    }
  }

  togglePlayPause() {
    if (this.isPaused) {
      this.setAuthoritativePause(false);
    } else {
      this.setAuthoritativePause(true);
    }
  }

  seek(targetSeconds) {
    this.playbackTime = Math.max(0, Math.min(this.trackDuration, targetSeconds));
    this.emit('timeUpdate', this.playbackTime, this.trackDuration);
  }

  initCleanStandby() {
    this.hasGSMTCTrack = false;
    this.isAuthoritativePaused = false;
    this.playbackTime = 0.0;
    this.trackDuration = this.defaultDuration;
    this.songSignature = '';
    this.track = { title: '', artist: '', album: '', thumbnail: null };
    this.trackTransitionUntil = 0;
    this.sustainedAudioDuration = 0;
    this.bass = 0.0;
    this.mid = 0.0;
    this.treble = 0.0;

    this.setState('standby');
    this.emit('trackChange', this.track, true);
    this.emit('audioTick', 0, 0, 0, this.rawFft, false);
  }

  tick(dt, isExternalAudioPlaying = false) {
    const now = performance.now();
    const isTransitioning = now < this.trackTransitionUntil;
    const silenceDuration = now - this.lastAudioTime;

    // Silence Protocol Handling
    if (!isExternalAudioPlaying && !isTransitioning) {
      // 1. 1.6s silence -> General Pause
      if (this.isPlaying && silenceDuration > this.pauseTimeout) {
        if (this.hasGSMTCTrack && this.track.title) {
          this.setState('paused');
        } else if (!this.hasGSMTCTrack) {
          this.initCleanStandby();
        }
      }

      // 2. 30s silence -> 100% Pure Pitch-Black Standby Sleep
      if (silenceDuration > this.sleepTimeout && (this.hasGSMTCTrack || this.track.title)) {
        this.initCleanStandby();
      }
    }

    // Advance Monotonic Clock
    if ((this.isPlaying && !this.isPaused) || isTransitioning) {
      this.playbackTime = (this.playbackTime + dt) % this.trackDuration;
      this.emit('timeUpdate', this.playbackTime, this.trackDuration);
    }
  }
}

// Attach globally for WebView2 vanilla script loading
window.PlaybackSession = PlaybackSession;
