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

  const titleWrapper = document.getElementById('titleWrapper');
  const artistWrapper = document.getElementById('artistWrapper');
  const capsuleDivider = document.getElementById('capsuleDivider');

  // 🌟 20X 慢速單調時間積分器（保證永遠順時針、絕對不倒退、無任何頻閃逆轉）
  let borderAngle = 0.0;
  let currentBass = 0.0;
  let currentMid = 0.0;
  let currentTreble = 0.0;

  // 🌟 膠囊標題自適應跑馬燈控制器 (計算真實未截斷文字寬度，平滑循環滾動露出所有文字)
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

      // 當文字寬度超出剪裁視窗 10px 以上，啟動平滑來回跑馬燈
      if (overflow > 10) {
        const overflowPx = overflow + 36;
        const durationSec = Math.max(10, Math.min(24, Math.round(overflowPx / 35 + 8)));
        trackTitle.style.setProperty('--marquee-distance', `-${overflowPx}px`);
        trackTitle.style.setProperty('--marquee-duration', `${durationSec}s`);
        trackTitle.classList.add('is-marquee');
      }
    });
  }

  // 2. Clean Initial Standby Setup (待機 0 文字純黑極致 AOD 規範)
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

    // 🌌 待機休眠：膠囊內部 100% 清空（0 任何文字、0 STANDBY、0 AOD MUSIC HUB）
    updateCapsuleTitle('');
    if (trackArtist) trackArtist.textContent = '';
    if (capsuleDivider) capsuleDivider.style.opacity = '0';
    if (statusIcon) statusIcon.textContent = '';
    if (playStatusBadge) playStatusBadge.className = 'capsule-status-badge';

    if (capsuleWrapper) {
      capsuleWrapper.style.setProperty('--rgb-blur', '10px');
      capsuleWrapper.style.setProperty('--rgb-opacity', '0.55');
      capsuleWrapper.style.setProperty('--specular-duration', '7.5s');
    }
    if (starfieldEngine) {
      starfieldEngine.updateAudio(0, 0, 0, false);
    }
    if (lyricsEngine) {
      lyricsEngine.resetStandbyDisplay();
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

  // 🛡️ v1.2.0 核心演算法：GSMTC 權威暫停鎖定 & 400ms 突波通知聲抗噪計時器
  let isAuthoritativePaused = false;
  let sustainedAudioDuration = 0;
  let lastAudioTick = performance.now();

  // Expose global seek function for clicking lyric lines
  window.seekToTime = (targetTime) => {
    playbackTime = Math.max(0, Math.min(trackDuration, targetTime));
    lyricsEngine.updateTime(playbackTime);
  };

  function setPlayingState(force = false) {
    if (isAuthoritativePaused && !force) {
      return;
    }
    if (!isPlaying || isPaused) {
      isPlaying = true;
      isPaused = false;
      isAuthoritativePaused = false;
      if (statusIcon) statusIcon.textContent = '▶';
      if (playStatusBadge) playStatusBadge.className = 'capsule-status-badge playing';
    }
  }

  function setPausedState(authoritative = false) {
    if (authoritative) {
      isAuthoritativePaused = true;
    }
    if (isPlaying || !isPaused) {
      isPlaying = false;
      isPaused = true;
      sustainedAudioDuration = 0;
      if (statusIcon) statusIcon.textContent = '⏸';
      if (playStatusBadge) playStatusBadge.className = 'capsule-status-badge paused';
      lyricsEngine.setPausedDisplay();
    }
  }

  // 4. Audio & Track Callback Handlers
  const audioEngine = new AudioListenerEngine(
    // onAudioUpdate (🌟 音樂節奏舞動響應：400ms 持續性抗噪濾波 ✖ 重低音曲速加速)
    (bass, mid, treble, rawFft) => {
      try {
        const now = performance.now();
        const dtAudio = Math.min(0.1, (now - lastAudioTick) / 1000);
        lastAudioTick = now;

        const currentEnergy = bass + mid + treble;
        currentBass = bass;
        currentMid = mid;
        currentTreble = treble;

        // 🛡️ 400ms 持續性音樂特徵濾波器 (Transient Notification Filter)
        if (currentEnergy > 0.005) {
          sustainedAudioDuration += dtAudio;
        } else {
          sustainedAudioDuration = Math.max(0, sustainedAudioDuration - dtAudio * 2.5);
        }

        const isLegitMusicStream = sustainedAudioDuration >= 0.38 || isPlaying;

        if (currentEnergy > 0.003 && isLegitMusicStream) {
          lastAudioTime = now;

          // 🛡️ 偵測到新音源但無 GSMTC 歌曲資訊時：立即轉為純音訊律動
          if (!hasGSMTCTrack && currentSongSignature !== 'PURE_AUDIO_STREAM') {
            currentSongSignature = 'PURE_AUDIO_STREAM';
            updateCapsuleTitle('PURE AUDIO STREAM');
            if (trackArtist) trackArtist.textContent = 'SYSTEM AUDIO';
            if (statusIcon) statusIcon.textContent = '▶';
            lyricsEngine.setAudioOnlyDisplay('PURE AUDIO STREAM');
          }

          setPlayingState(sustainedAudioDuration >= 0.5);
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
          hasGSMTCTrack = false;
          initCleanStandby();
          return;
        }

        const songSig = `${trackInfo.title}_${trackInfo.artist}`;
        const isNewSong = songSig !== currentSongSignature;
        const now = performance.now();

        playbackTime = 0.0;
        lastAudioTime = now;
        trackTransitionUntil = now + 4000;

        if (isNewSong) {
          currentSongSignature = songSig;
          currentTrackTitle = trackInfo.title || '未知歌曲';
          currentTrackArtist = trackInfo.artist || '未知演出者';

          // 🧹 瞬時 100% 關閉並銷毀上一首的所有歌詞 DOM 與網路請求
          lyricsEngine.purgePreviousSong();

          updateCapsuleTitle(currentTrackTitle);
          if (trackArtist) trackArtist.textContent = currentTrackArtist;

          // 請求新在線歌詞，傳入即時 playbackTime 取得器以在載入完成時毫秒級對齊
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
        isAuthoritativePaused = false;
        setPlayingState(true);
      } catch (e) {
        console.warn('Track update handled safely:', e);
      }
    },
    // onPlaybackChange (Lively 系統全域暫停/播放回調)
    (isLivelyPaused) => {
      if (isLivelyPaused) {
        setPausedState(true); // 🛡️ 鎖定權威暫停
      } else {
        setPlayingState(true); // 🛡️ 權威播放
      }
    }
  );

  // 🖱️ 手動點擊膠囊播放/暫停按鈕切換
  if (playStatusBadge) {
    playStatusBadge.style.cursor = 'pointer';
    playStatusBadge.addEventListener('click', (e) => {
      e.stopPropagation();
      if (isPaused) {
        setPlayingState(true);
      } else {
        setPausedState(true);
      }
    });
  }

  // 🖥️ 視窗隱藏/全螢幕自動暫停監聽
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      setPausedState(true);
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

    // 🛡️ 靜音檢測與 30 秒分級休眠協議 (Tiered Silence & 30s Deep Sleep Protocol)
    const isTransitioning = now < trackTransitionUntil;
    const pauseTimeout = 1600;      // 1.6 秒無聲 ➔ 進入一般暫停 (保留歌詞與歌名，膠囊顯示 ⏸)
    const sleepTimeout = 30000;     // 30 秒無聲 ➔ 進入 100% 純黑待機休眠 (膠囊 0 文字、歌詞純黑清空)

    const silenceDuration = now - lastAudioTime;

    if (!audioEngine.isLocalAudioPlaying && !isTransitioning) {
      if (isPlaying && silenceDuration > pauseTimeout) {
        if (hasGSMTCTrack && currentTrackTitle) {
          setPausedState();
        } else if (!hasGSMTCTrack) {
          initCleanStandby();
        }
      }

      // 🌌 超過 30 秒完全無音訊 ➔ 智慧休眠：自動清空所有舊歌詞與膠囊文字，回歸 0 文字純黑 AOD
      if (silenceDuration > sleepTimeout && (hasGSMTCTrack || currentTrackTitle)) {
        initCleanStandby();
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
        updateCapsuleTitle(currentTrackTitle);
        if (trackArtist) trackArtist.textContent = currentTrackArtist;
        setPlayingState(true);
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
