/**
 * ============================================================================
 * 🚀 Liquid Glass AOD Music Hub - Main Application Lifecycle
 * ============================================================================
 * Deep Modular Architecture:
 * - PlaybackSession: Encapsulates state machine, silence protocols & monotonic clock.
 * - LyricsEngine: Self-contained conveyor viewport & LRC parser/cache seams.
 * - AudioListenerEngine: AudioPort with Lively WASAPI & WebAudio adapters.
 * - AuraBeamEngine & StarfieldEngine: Optical laser & warp background stages.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. DOM Elements
  const trackTitle = document.getElementById('trackTitle');
  const trackArtist = document.getElementById('trackArtist');
  const statusIcon = document.getElementById('statusIcon');
  const playStatusBadge = document.getElementById('playStatusBadge');
  const titleWrapper = document.getElementById('titleWrapper');
  const capsuleDivider = document.getElementById('capsuleDivider');
  const capsuleWrapper = document.getElementById('capsuleWrapper');

  // 2. Marquee Controller for Long Track Titles
  function updateCapsuleTitle(titleText) {
    if (!trackTitle) return;
    trackTitle.textContent = titleText;
    trackTitle.classList.remove('is-marquee');
    trackTitle.style.removeProperty('--marquee-distance');
    trackTitle.style.removeProperty('--marquee-duration');

    if (!titleText) {
      if (capsuleDivider) capsuleDivider.style.opacity = '0';
      return;
    }

    if (capsuleDivider) capsuleDivider.style.opacity = '1';

    requestAnimationFrame(() => {
      const wrapperWidth = titleWrapper ? titleWrapper.clientWidth : 620;
      const titleWidth = trackTitle.scrollWidth;
      const overflow = titleWidth - wrapperWidth;

      if (overflow > 10) {
        const overflowPx = overflow + 36;
        const durationSec = Math.max(10, Math.min(24, Math.round(overflowPx / 35 + 8)));
        trackTitle.style.setProperty('--marquee-distance', `-${overflowPx}px`);
        trackTitle.style.setProperty('--marquee-duration', `${durationSec}s`);
        trackTitle.classList.add('is-marquee');
      }
    });
  }

  // 3. Initialize Core Deep Modules
  const playbackSession = new PlaybackSession({
    pauseTimeout: 2400,
    sleepTimeout: 30000,
    defaultDuration: 210
  });

  const lyricsEngine = new LyricsEngine({
    viewportId: 'lyricsViewport',
    trackId: 'lyricsTrack',
    onSeek: (targetTime) => playbackSession.seek(targetTime),
    onDurationResolved: (duration) => {
      playbackSession.setDuration(duration);
      lyricsEngine.sync(playbackSession.playbackTime, playbackSession.isPaused);
    }
  });

  const auraBeamEngine = new AuraBeamEngine('auraCanvas', 'glassCapsule');

  const starfieldEngine = new StarfieldEngine('bgCanvas', {
    starCount: 110,
    idleSpeed: 0.45,
    warpMaxSpeed: 32.0,
    warpTrailFactor: 1.8,
    starBaseRadius: 2.2
  });

  // 4. Session Event Listeners
  playbackSession
    .on('stateChange', (newState) => {
      if (newState === 'playing' || newState === 'pure_audio') {
        if (statusIcon) statusIcon.textContent = '▶';
        if (playStatusBadge) playStatusBadge.className = 'capsule-status-badge playing';
      } else if (newState === 'paused') {
        if (statusIcon) statusIcon.textContent = '⏸';
        if (playStatusBadge) playStatusBadge.className = 'capsule-status-badge paused';
      } else if (newState === 'standby') {
        // 100% Pure Pitch-Black Standby AOD
        updateCapsuleTitle('');
        if (trackArtist) trackArtist.textContent = '';
        if (capsuleDivider) capsuleDivider.style.opacity = '0';
        if (statusIcon) statusIcon.textContent = '';
        if (playStatusBadge) playStatusBadge.className = 'capsule-status-badge';
        lyricsEngine.reset();
      }
    })
    .on('trackChange', (track, isNew) => {
      updateCapsuleTitle(track.title);
      if (trackArtist) trackArtist.textContent = track.artist;
      lyricsEngine.setTrack(track, isNew);
    })
    .on('timeUpdate', (currentTime) => {
      lyricsEngine.sync(currentTime, playbackSession.isPaused);
    })
    .on('audioTick', (bass, mid, treble, rawFft, isPlaying) => {
      if (starfieldEngine) {
        starfieldEngine.updateAudio(bass, mid, treble, isPlaying);
      }
    });

  // 5. Connect Audio & Timeline Ingestion via AudioListenerEngine
  const audioEngine = new AudioListenerEngine(
    (bass, mid, treble, rawFft) => playbackSession.feedAudio(bass, mid, treble, rawFft),
    (trackInfo) => playbackSession.setTrack(trackInfo),
    (isPaused) => playbackSession.setAuthoritativePause(isPaused),
    (timelineData) => playbackSession.syncExternalTimeline(timelineData)
  );

  // 6. User Interactions
  if (playStatusBadge) {
    playStatusBadge.style.cursor = 'pointer';
    playStatusBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      playbackSession.togglePlayPause();
    });
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      playbackSession.setAuthoritativePause(true);
    }
  });

  // 7. Drag & Drop Media Loader
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    for (let file of files) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
        const title = file.name.replace(/\.[^/.]+$/, '');
        playbackSession.setTrack({ title, artist: 'LOCAL AUDIO FILE' });
        audioEngine.initLocalAudio(file);
      } else if (ext === 'lrc') {
        const reader = new FileReader();
        reader.onload = (ev) => lyricsEngine.loadLocalLRC(ev.target.result);
        reader.readAsText(file);
      }
    }
  });

  // 8. Unified Animation Loop with Standby Sleep & Visibility Gating
  let lastFrameTime = performance.now();
  let isStandbyCleared = false;

  function mainLoop(now) {
    requestAnimationFrame(mainLoop);

    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    // Advance Playback Clock & Silence Machine
    playbackSession.tick(dt, audioEngine.isLocalAudioPlaying);

    // 🌟 Document Visibility Gating:
    // Only halt rendering when the window/wallpaper is completely hidden (e.g. full-screen game/app running)
    if (document.hidden) {
      return;
    }

    // Render Visual Stages (Stars gently drift and Aura Beam gracefully cruises in idle)
    if (starfieldEngine) {
      starfieldEngine.render(dt);
    }

    if (auraBeamEngine) {
      auraBeamEngine.update(
        dt,
        playbackSession.bass,
        playbackSession.mid,
        playbackSession.isPlaying
      );
    }
  }
  requestAnimationFrame(mainLoop);
});
