/**
 * 🚀 Liquid Glass AOD Music Hub - Main Application Lifecycle
 * Rock-Solid Geometry: Pure Optical RGB Flow Modulation & Zero Layout Vibration
 */
document.addEventListener('DOMContentLoaded', () => {
  // 1. DOM Elements
  const capsuleWrapper = document.getElementById('capsuleWrapper');
  const trackTitle = document.getElementById('trackTitle');
  const trackArtist = document.getElementById('trackArtist');
  const statusIcon = document.getElementById('statusIcon');
  const playStatusBadge = document.getElementById('playStatusBadge');

  // State Machine Flags
  let isPlaying = false;
  let isPaused = false;
  let hasGSMTCTrack = false;
  let lastAudioTime = performance.now();
  let trackTransitionUntil = 0; // Cut-song protection shield timestamp
  let lastFrameTime = performance.now();
  let playbackTime = 0.0;
  let trackDuration = 210;
  
  let currentTrackTitle = '';
  let currentTrackArtist = '';
  let currentSongSignature = '';

  // 🌟 20X 慢速單調時間積分器（保證永遠順時針、絕對不倒退、無任何頻閃逆轉）
  let borderAngle = 0.0;
  let currentBass = 0.0;
  let currentMid = 0.0;

  // 2. Clean Initial Standby Setup
  function initCleanStandby() {
    isPlaying = false;
    isPaused = false;
    hasGSMTCTrack = false;
    playbackTime = 0.0;
    trackDuration = 210;
    currentSongSignature = '';
    currentTrackTitle = '';
    currentTrackArtist = '';
    trackTransitionUntil = 0;
    currentBass = 0.0;
    currentMid = 0.0;
    currentTreble = 0.0;

    if (trackTitle) trackTitle.textContent = 'STANDBY';
    if (trackArtist) trackArtist.textContent = 'AOD MUSIC HUB';
    if (statusIcon) statusIcon.textContent = '▶';
    if (playStatusBadge) playStatusBadge.className = 'capsule-status-badge';
    if (capsuleWrapper) {
      capsuleWrapper.style.setProperty('--rgb-blur', '10px');
      capsuleWrapper.style.setProperty('--rgb-opacity', '0.55');
      capsuleWrapper.style.setProperty('--specular-duration', '7.5s');
    }
    if (starfieldEngine) {
      starfieldEngine.updateAudio(0, 0, 0, false);
    }
  }

  // 3. Initialize Engines
  const starfieldEngine = new StarfieldEngine('bgCanvas', {
    starCount: 110,
    idleSpeed: 0.45,
    warpMaxSpeed: 32.0,
    warpTrailFactor: 1.8,
    starBaseRadius: 2.2
  });
  const lyricsEngine = new LyricsEngine();
  const auraBeamEngine = new AuraBeamEngine('auraCanvas', 'glassCapsule');

  initCleanStandby();

  // Expose global seek function for clicking lyric lines
  window.seekToTime = (targetTime) => {
    playbackTime = Math.max(0, Math.min(trackDuration, targetTime));
    lyricsEngine.updateTime(playbackTime);
  };

  function setPlayingState() {
    if (!isPlaying || isPaused) {
      isPlaying = true;
      isPaused = false;
      if (statusIcon) statusIcon.textContent = '▶';
      if (playStatusBadge) playStatusBadge.className = 'capsule-status-badge playing';
    }
  }

  function setPausedState() {
    if (isPlaying || !isPaused) {
      isPlaying = false;
      isPaused = true;
      if (statusIcon) statusIcon.textContent = '⏸';
      if (playStatusBadge) playStatusBadge.className = 'capsule-status-badge paused';
      lyricsEngine.setPausedDisplay();
    }
  }

  // 4. Audio & Track Callback Handlers
  const audioEngine = new AudioListenerEngine(
    // onAudioUpdate (🌟 音樂節奏舞動響應：光暈半徑呼吸、亮度增強與低音瞬時加速)
    (bass, mid, treble, rawFft) => {
      try {
        const now = performance.now();
        const currentEnergy = bass + mid + treble;

        currentBass = bass;
        currentMid = mid;
        currentTreble = treble;

        if (currentEnergy > 0.003) {
          lastAudioTime = now;
          setPlayingState();

          // 🛡️ 偵測到新音源但無 GSMTC 歌曲資訊時：立即關閉舊歌資訊，轉為純音訊律動
          if (!hasGSMTCTrack && currentSongSignature !== 'PURE_AUDIO_STREAM') {
            currentSongSignature = 'PURE_AUDIO_STREAM';
            if (trackTitle) trackTitle.textContent = 'PURE AUDIO STREAM';
            if (trackArtist) trackArtist.textContent = 'SYSTEM SOUND';
            lyricsEngine.setAudioOnlyDisplay();
          }

        }

        // 🌌 即時更新星空引擎能量
        if (starfieldEngine) {
          starfieldEngine.updateAudio(bass, mid, treble, isPlaying && !isPaused);
        }
      } catch (e) {
        console.warn('Audio update handled safely:', e);
      }
    },
    // onTrackUpdate (Triggered by Lively Wallpaper / Windows GSMTC Media)
    (trackInfo) => {
      try {
        if (!trackInfo || (!trackInfo.title && !trackInfo.artist)) {
          // 🛑 音源中斷或關閉：第一時間立刻關閉並清除原本播放的所有資訊
          hasGSMTCTrack = false;
          initCleanStandby();
          lyricsEngine.resetStandbyDisplay();
          return;
        }

        const songSig = `${trackInfo.title}_${trackInfo.artist}`;
        const isNewSong = songSig !== currentSongSignature;
        const now = performance.now();

        // 🛡️ 每次偵測到新音源或切歌訊號：第 0 毫秒立即重置時間軸並關閉舊歌狀態
        playbackTime = 0.0;
        lastAudioTime = now;
        trackTransitionUntil = now + 4000;

        if (isNewSong) {
          currentSongSignature = songSig;
          currentTrackTitle = trackInfo.title || '未知歌曲';
          currentTrackArtist = trackInfo.artist || '未知演出者';

          // 🧹 瞬時 100% 關閉並銷毀上一首的所有歌詞 DOM 與網路請求
          lyricsEngine.purgePreviousSong();

          // 即刻更新為新音源的標題與歌手（絕不殘留上一首）
          if (trackTitle) trackTitle.textContent = currentTrackTitle;
          if (trackArtist) trackArtist.textContent = currentTrackArtist;

          // 請求新在線歌詞，傳入即時 playbackTime 取得器以在載入完成時毫秒級對齊（絕不錯過第 1 秒歌詞）
          lyricsEngine.fetchOnlineLyrics(
            currentTrackTitle,
            currentTrackArtist,
            (duration) => {
              if (duration && duration > 30) {
                trackDuration = duration;
              }
            },
            () => playbackTime
          );
        } else {
          // 🔁 同曲回播 / 上一首按鈕：重置回第 0 秒與第 1 句歌詞
          lyricsEngine.resetToStart();
        }

        hasGSMTCTrack = true;
        setPlayingState();
      } catch (e) {
        console.warn('Track update handled safely:', e);
      }
    },
    // onPlaybackChange (Lively 系統全域暫停/播放回調)
    (isLivelyPaused) => {
      if (isLivelyPaused) {
        setPausedState();
      } else {
        setPlayingState();
      }
    }
  );

  // 🖱️ 手動點擊膠囊播放/暫停按鈕切換
  if (playStatusBadge) {
    playStatusBadge.style.cursor = 'pointer';
    playStatusBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isPaused) {
        setPlayingState();
      } else {
        setPausedState();
      }
    });
  }

  // 🖥️ 視窗隱藏/全螢幕自動暫停監聽
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      setPausedState();
    }
  });

  // 5. Main Playback Loop with True Delta Time & Robust State Machine
  function mainLoop(now) {
    requestAnimationFrame(mainLoop);

    const dt = Math.min(0.05, (now - lastFrameTime) / 1000);
    lastFrameTime = now;

    // 🌌 StarfieldEngine: 渲染動態星空背景 (待機漂移 / 重低音曲速穿梭)
    if (starfieldEngine) {
      starfieldEngine.render(dt);
    }

    // 🌟 AuraBeamEngine: 100% 視覺等弧長 (長邊不拉長、圓角不縮短) ✖ 等線速 ✖ 音樂節奏調速
    if (auraBeamEngine) {
      auraBeamEngine.update(dt, currentBass, currentMid, isPlaying && !isPaused);
    }

    // 🛡️ Immunity check: If in the 4s transition period of cutting song, NEVER trigger fake pause!
    const isTransitioning = now < trackTransitionUntil;
    const silenceTimeout = 1600;

    if (isPlaying && !isTransitioning && (now - lastAudioTime > silenceTimeout) && !audioEngine.isLocalAudioPlaying) {
      if (hasGSMTCTrack && currentTrackTitle) {
        setPausedState();
      } else if (!hasGSMTCTrack) {
        initCleanStandby();
        lyricsEngine.resetStandbyDisplay();
      }
    }

    // Advance Playback & Lyrics using Real Delta Time
    if ((isPlaying && !isPaused) || isTransitioning) {
      playbackTime = (playbackTime + dt) % trackDuration;
      lyricsEngine.updateTime(playbackTime);
    }
  }
  requestAnimationFrame(mainLoop);

  // 6. Drag & Drop File Loader (MP3, LRC)
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    for (let file of files) {
      const ext = file.name.split('.').pop().toLowerCase();

      if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
        lyricsEngine.purgePreviousSong();
        hasGSMTCTrack = true;
        currentTrackTitle = file.name.replace(/\.[^/.]+$/, '');
        currentTrackArtist = 'LOCAL AUDIO FILE';
        if (trackTitle) trackTitle.textContent = currentTrackTitle;
        if (trackArtist) trackArtist.textContent = currentTrackArtist;
        setPlayingState();
        playbackTime = 0.0;
        trackTransitionUntil = performance.now() + 4000;
        audioEngine.initLocalAudio(file);
      } else if (ext === 'lrc') {
        const reader = new FileReader();
        reader.onload = (ev) => lyricsEngine.parseLRC(ev.target.result);
        reader.readAsText(file);
      }
    }
  });
});
