/**
 * 🌟 Apple Music Style Continuous Conveyor Lyrics Engine
 * 100% Zero Overlapping, Race-Condition Immune Session Lock
 */
class LyricsEngine {
  constructor() {
    this.lyrics = [];
    this.currentIndex = -1;
    this.currentTrackQuery = '';
    this.isFetching = false;
    this.offset = 0.0;
    this.trackDuration = 210;
    this.activeController = null;
    this.fetchDebounceTimer = null;
    this.sessionId = 0; // 🛡️ Monotonic session ID to eliminate async race conditions

    this.viewport = document.getElementById('lyricsViewport');
    this.track = document.getElementById('lyricsTrack');

    this.resetStandbyDisplay();
  }

  /**
   * 🧹 Instant 0ms Complete Purge of Previous Song Cache, DOM & State
   */
  purgePreviousSong() {
    this.cancelActiveRequests();
    this.sessionId++; // Invalidate all prior in-flight fetch promises
    this.lyrics = [];
    this.currentIndex = -1;
    this.currentTrackQuery = '';
    this.offset = 0.0;
    this.trackDuration = 210;

    if (this.track) {
      // 🚀 0.0ms 極速清空：秒清舊歌詞 DOM，絕不殘留任何多餘過渡
      this.track.style.transition = 'none';
      this.track.innerHTML = '';
      this.track.style.transform = 'translateY(110px)';
    }
  }

  resetStandbyDisplay() {
    this.cancelActiveRequests();
    this.sessionId++;
    this.lyrics = [];
    this.currentIndex = -1;
    this.currentTrackQuery = '';
    this.offset = 0.0;
    this.trackDuration = 210;

    if (this.noLyricsTimer) {
      clearTimeout(this.noLyricsTimer);
      this.noLyricsTimer = null;
    }

    if (this.track) {
      // 🌌 15 秒待機休眠：歌詞區域 100% 純黑消隱，保留極致深邃美感
      this.track.innerHTML = '';
      this.track.style.transition = 'opacity 0.6s ease';
      this.track.style.opacity = '0';
    }
  }

  setPausedDisplay() {
    // Keep current 3-line display static in paused state
  }

  setAudioOnlyDisplay(title = '') {
    this.setNoLyricsDisplay(title);
  }

  setNoLyricsDisplay(cleanTitle = '') {
    this.cancelActiveRequests();
    this.sessionId++;
    this.lyrics = [];
    this.currentIndex = -1;

    if (this.noLyricsTimer) {
      clearTimeout(this.noLyricsTimer);
      this.noLyricsTimer = null;
    }

    const songName = cleanTitle || '';
    if (this.track) {
      if (songName) {
        // 🌟 僅顯示當前歌曲標題 5 秒，隨後 100% 純黑消隱（0 廣告、0 雜訊）
        this.track.innerHTML = `<div class="lyric-line is-active" id="fallbackTitleLine">🎵 ${songName}</div>`;
        this.track.style.transition = 'opacity 0.6s ease, transform 0.4s ease';
        this.track.style.transform = 'translateY(110px)';

        this.noLyricsTimer = setTimeout(() => {
          if (this.track) {
            const titleLine = document.getElementById('fallbackTitleLine');
            if (titleLine) {
              titleLine.className = 'lyric-line is-outro-faded';
            }
          }
        }, 5000);
      } else {
        this.track.innerHTML = '';
      }
    }
  }

  /**
   * 🔁 Reset Current Song Position to Start (for Replay & Previous Track)
   */
  resetToStart() {
    this.currentIndex = -1;
    if (this.lyrics && this.lyrics.length > 0) {
      this.scrollToIndex(0, false);
      if (this.track) {
        Array.from(this.track.children).forEach(el => {
          el.style.setProperty('--wipe-progress', '0%');
        });
      }
    } else if (this.track) {
      this.track.style.transition = 'none';
      this.track.style.transform = 'translateY(110px)';
    }
  }

  cancelActiveRequests() {
    if (this.fetchDebounceTimer) {
      clearTimeout(this.fetchDebounceTimer);
      this.fetchDebounceTimer = null;
    }
    if (this.activeController) {
      try {
        this.activeController.abort();
      } catch (e) {}
      this.activeController = null;
    }
    this.isFetching = false;
  }

  cleanTrackInfo(title, artist) {
    let cleanTitle = (title || '')
      .replace(/\s*[\(\[](feat|ft|with|official|music video|mv|audio|remix|version|live|hd|4k|lyric video)[\.\s\w]*[\)\]]/gi, '')
      .replace(/ - \w+ remix$/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    let cleanArtist = (artist || '')
      .replace(/\s*[\(\[](feat|ft|with)[\.\s\w]*[\)\]]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    return { cleanTitle, cleanArtist };
  }

  fetchOnlineLyrics(rawTitle, rawArtist, callback, getPlaybackTimeFn) {
    const { cleanTitle, cleanArtist } = this.cleanTrackInfo(rawTitle, rawArtist);
    if (!cleanTitle) return;

    const queryKey = `${cleanTitle}_${cleanArtist}`;
    if (queryKey === this.currentTrackQuery && this.lyrics.length > 0) {
      // 🌟 Replay / Skip back to same title: Immediately reset to 0:00
      this.resetToStart();
      if (callback) callback(this.trackDuration);
      return;
    }

    // 🧹 1. 瞬時同步清空上一首（銷毀所有舊歌詞 DOM 節點）
    this.purgePreviousSong();
    this.currentTrackQuery = queryKey;
    const currentSession = this.sessionId;

    // Instant local cache check
    const cacheKey = `aod_lrc_${queryKey}`;
    const cachedLrc = localStorage.getItem(cacheKey);
    if (cachedLrc) {
      try {
        const parsed = JSON.parse(cachedLrc);
        if (parsed && parsed.length > 0) {
          if (this.sessionId === currentSession) {
            const curTime = getPlaybackTimeFn ? getPlaybackTimeFn() : 0.0;
            this.applyParsedLyrics(parsed, cacheKey, currentSession, curTime);
            if (callback) callback(this.trackDuration);
            return;
          }
        }
      } catch (e) {}
    }

    // 🚀 0ms 零延遲立即異步請求（秒清秒載）
    this.activeController = new AbortController();
    const signal = this.activeController.signal;
    this.isFetching = true;

    const timeoutId = setTimeout(() => {
      if (this.activeController) this.activeController.abort();
    }, 3000);

    (async () => {
      try {
        let url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
        let res = await fetch(url, { signal });

        if (!res.ok) {
          url = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle + ' ' + cleanArtist)}`;
          res = await fetch(url, { signal });
          if (res.ok) {
            const list = await res.json();
            if (this.sessionId !== currentSession || signal.aborted) return;
            if (list && list.length > 0) {
              const best = list[0];
              clearTimeout(timeoutId);
              const curTime = getPlaybackTimeFn ? getPlaybackTimeFn() : 0.0;
              if (best.syncedLyrics) {
                this.parseLRC(best.syncedLyrics, cacheKey, currentSession, curTime);
              } else if (best.plainLyrics) {
                this.parsePlainLyrics(best.plainLyrics, cacheKey, currentSession, curTime);
              }
              if (callback) callback(this.trackDuration);
              return;
            }
          }
        } else {
          const data = await res.json();
          if (this.sessionId !== currentSession || signal.aborted) return;
          clearTimeout(timeoutId);
          const curTime = getPlaybackTimeFn ? getPlaybackTimeFn() : 0.0;
          if (data.syncedLyrics) {
            this.parseLRC(data.syncedLyrics, cacheKey, currentSession, curTime);
          } else if (data.plainLyrics) {
            this.parsePlainLyrics(data.plainLyrics, cacheKey, currentSession, curTime);
          }
          if (callback) callback(this.trackDuration);
          return;
        }

        clearTimeout(timeoutId);
        if (this.sessionId === currentSession && !signal.aborted) {
          this.setNoLyricsDisplay(cleanTitle);
        }
      } catch (e) {
        if (this.sessionId === currentSession && !signal.aborted) {
          this.setNoLyricsDisplay(cleanTitle);
        }
      } finally {
        if (this.sessionId === currentSession) {
          this.isFetching = false;
        }
      }
    })();
  }

  saveToCache(cacheKey) {
    if (cacheKey && this.lyrics && this.lyrics.length > 0) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(this.lyrics));
      } catch (e) {}
    }
  }

  computeDuration() {
    if (this.lyrics.length > 0) {
      const lastLine = this.lyrics[this.lyrics.length - 1];
      this.trackDuration = Math.max(120, lastLine.time + 8.0);
    }
  }

  /**
   * 🧹 智慧判斷是否為非歌唱元數據（作詞/作曲/編曲/製作人等名單雜訊）
   */
  isMetadataLine(text) {
    if (!text) return true;
    const clean = text.trim();
    if (clean.length < 2) return true;
    
    // 過濾純符號或空標籤 (e.g. ---, ***, ...)
    if (/^[\-_~*=·\s.]{2,}$/.test(clean)) return true;

    // 正則匹配常見製作名單前綴
    const metaRegex = /^(作詞|作词|作曲|編曲|编曲|製作|制作|監製|监制|混音|母帶|母带|錄音|录音|吉他|貝斯|贝斯|鼓手|鍵盤|键盘|和聲|和声|弦樂|弦乐|企劃|企划|統籌|统筹|發行|发行|出品|OP|SP|Prod|Produced|Written|Arranged|Mixed|Mastered|Lyrics|Music|Composer|Vocal|Singer|Artist|Album|歌手|專輯|专辑|歌名|曲名)[:：\s\/／、]/i;
    if (metaRegex.test(clean)) return true;

    const pureMetaRegex = /^(純音樂|纯音乐|請欣賞|请欣赏|Instrumental|Intro|Interlude|Outro|Music|Ending)$/i;
    if (pureMetaRegex.test(clean)) return true;

    const creditRegex = /^(Written by|Composed by|Arranged by|Produced by|Directed by|Mastered by|Mixed by|Lyrics by|Music by)/i;
    if (creditRegex.test(clean)) return true;

    return false;
  }

  parsePlainLyrics(text, cacheKey = null, sessionId = null, currentPlaybackTime = 0.0) {
    if (sessionId !== null && this.sessionId !== sessionId) return;
    if (!text) return;
    const rawLines = text.split('\n').map(l => l.trim()).filter(l => l);
    const cleanList = [];
    let lastT = '';
    rawLines.forEach((l, idx) => {
      // 🛡️ 過濾前 5 行中的非歌詞元數據
      if (idx < 6 && this.isMetadataLine(l)) return;
      if (l !== lastT) {
        cleanList.push({ time: idx * 4.0, text: l });
        lastT = l;
      }
    });
    this.applyParsedLyrics(cleanList, cacheKey, sessionId, currentPlaybackTime);
  }

  parseLRC(text, cacheKey = null, sessionId = null, currentPlaybackTime = 0.0) {
    if (sessionId !== null && this.sessionId !== sessionId) return;
    if (!text) return;
    const temp = [];
    const lines = text.split('\n');
    const timeReg = /\[(\d{2}):(\d{2})\.?(\d{2,3})?\]/g;

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      let match;
      timeReg.lastIndex = 0;
      while ((match = timeReg.exec(line)) !== null) {
        const min = parseInt(match[1]);
        const sec = parseInt(match[2]);
        const ms = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3)) : 0;
        const totalSeconds = min * 60 + sec + ms / 1000;
        const content = line.replace(/\[\d{2}:\d{2}\.?\d*\]/g, '').trim();

        if (content && !content.startsWith('by:') && !content.startsWith('ar:') && !content.startsWith('ti:')) {
          // 🛡️ 智慧過濾前 20 秒內的作詞/作曲/編曲等名單雜訊，避免前奏提前搶跑
          if (totalSeconds < 22.0 && this.isMetadataLine(content)) {
            continue;
          }
          temp.push({ time: totalSeconds, text: content });
        }
      }
    }

    temp.sort((a, b) => a.time - b.time);

    // 🛡️ Remove consecutive duplicate lines
    const deduplicated = [];
    let lastText = '';
    for (let item of temp) {
      if (item.text !== lastText) {
        deduplicated.push(item);
        lastText = item.text;
      }
    }

    this.applyParsedLyrics(deduplicated, cacheKey, sessionId, currentPlaybackTime);
  }

  applyParsedLyrics(list, cacheKey = null, sessionId = null, currentPlaybackTime = 0.0) {
    if (sessionId !== null && this.sessionId !== sessionId) return;
    if (!list || list.length === 0) {
      this.setNoLyricsDisplay();
      return;
    }

    this.lyrics = list;
    this.computeDuration();
    this.currentIndex = -1;
    this.renderTrackDOM();

    if (this.track) {
      this.track.style.opacity = '1';
    }

    // 🌟 核心修復：立即對齊當前真實已播放的時間戳，絕不錯過第 1 秒歌詞！
    if (currentPlaybackTime > 0.05) {
      this.updateTime(currentPlaybackTime);
    } else {
      this.scrollToIndex(0, false);
    }

    if (cacheKey) this.saveToCache(cacheKey);
  }

  /**
   * 🏗️ Build Complete Conveyor DOM Elements
   */
  renderTrackDOM() {
    if (!this.track) return;
    if (!this.lyrics || this.lyrics.length === 0) {
      this.setNoLyricsDisplay();
      return;
    }

    const fragment = document.createDocumentFragment();
    this.lyrics.forEach((item, idx) => {
      const el = document.createElement('div');
      el.className = 'lyric-line';
      el.dataset.idx = idx;
      el.textContent = item.text;
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.seekToTime) window.seekToTime(item.time);
      });
      fragment.appendChild(el);
    });

    this.track.innerHTML = '';
    this.track.appendChild(fragment);
    this.track.style.opacity = '1';
    this.track.style.transition = 'opacity 0.4s ease, transform 0.48s cubic-bezier(0.16, 1, 0.3, 1)';
  }

  /**
   * 🌟 Precision Line Scroll Update & Karaoke Progress Wipe
   */
  updateTime(currentTime) {
    if (!this.lyrics || this.lyrics.length === 0) return;

    const effectiveTime = Math.max(0, currentTime + this.offset);
    const lastItem = this.lyrics[this.lyrics.length - 1];
    const firstItem = this.lyrics[0];

    // 🌌 結尾尾奏自動淡出為純黑 (消除殘影)：最後一句唱完 4.0s 後，所有歌詞全數淡出消隱
    if (lastItem && effectiveTime > lastItem.time + 4.0) {
      if (this.currentIndex !== -999) {
        this.currentIndex = -999;
        if (this.track) {
          Array.from(this.track.children).forEach(el => {
            el.className = 'lyric-line is-outro-faded';
          });
        }
      }
      return;
    }

    // 🛡️ 核心修復：前奏時間軸鎖定保護 (Intro Anchor Lock)
    // 當歌曲仍在前奏階段（尚未到達歌手開口唱的第一句時間戳），鎖定在第一句就緒聚焦點，絕不提早空跑滾動！
    if (firstItem && effectiveTime < firstItem.time) {
      if (this.currentIndex !== 0) {
        this.currentIndex = 0;
        this.scrollToIndex(0, true);
      }
      if (this.track && this.track.children[0]) {
        this.track.children[0].style.setProperty('--wipe-progress', '0%');
      }
      return;
    }

    let targetIndex = -1;
    for (let i = 0; i < this.lyrics.length; i++) {
      if (effectiveTime >= this.lyrics[i].time) {
        targetIndex = i;
      } else {
        break;
      }
    }

    if (targetIndex >= 0) {
      if (targetIndex !== this.currentIndex) {
        this.currentIndex = targetIndex;
        this.scrollToIndex(targetIndex, true);
      }

      // 🎤 Real-Time Karaoke Wipe Calculation (唱到哪抹到哪)
      const currentItem = this.lyrics[targetIndex];
      const nextItem = this.lyrics[targetIndex + 1];
      const startTime = currentItem.time;
      const endTime = nextItem ? nextItem.time : (startTime + 4.5);
      const duration = Math.max(0.6, endTime - startTime);
      const elapsed = Math.max(0, effectiveTime - startTime);
      const ratio = Math.min(1.0, Math.max(0.0, elapsed / duration));
      const percentStr = (ratio * 100).toFixed(1) + '%';

      if (this.track && this.track.children[targetIndex]) {
        this.track.children[targetIndex].style.setProperty('--wipe-progress', percentStr);
      }
    }
  }

  scrollToIndex(index, animate = true) {
    if (!this.track || !this.viewport) return;
    const lines = this.track.children;
    if (!lines || lines.length === 0) return;

    const targetEl = lines[index];
    if (!targetEl) return;

    // 1. Update State Classes & Reset Wipe
    for (let i = 0; i < lines.length; i++) {
      const el = lines[i];
      if (i === index) {
        el.className = 'lyric-line is-active';
      } else if (i === index - 1) {
        el.className = 'lyric-line is-prev';
        el.style.setProperty('--wipe-progress', '100%');
      } else if (i === index + 1) {
        el.className = 'lyric-line is-next';
        el.style.setProperty('--wipe-progress', '0%');
      } else {
        el.className = 'lyric-line';
        el.style.setProperty('--wipe-progress', '0%');
      }
    }

    // 2. Compute Viewport Centering Y Offset
    const viewportHeight = this.viewport.clientHeight || 290;
    const targetCenterY = targetEl.offsetTop + targetEl.offsetHeight / 2;
    const translateY = (viewportHeight / 2) - targetCenterY;

    if (!animate) {
      this.track.style.transition = 'none';
      this.track.style.transform = `translateY(${translateY}px)`;
      void this.track.offsetWidth; // Force layout
      this.track.style.transition = 'transform 0.48s cubic-bezier(0.16, 1, 0.3, 1)';
    } else {
      this.track.style.transform = `translateY(${translateY}px)`;
    }
  }

  getLineTime(offsetFromCurrent) {
    if (this.lyrics.length === 0) return null;
    const targetIdx = Math.max(0, Math.min(this.lyrics.length - 1, (this.currentIndex >= 0 ? this.currentIndex : 0) + offsetFromCurrent));
    return this.lyrics[targetIdx] ? this.lyrics[targetIdx].time : null;
  }
}

window.LyricsEngine = LyricsEngine;
