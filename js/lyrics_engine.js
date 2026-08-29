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

    if (this.track) {
      this.track.innerHTML = '<div class="lyric-line is-active">🎵 播放音樂時自動同步歌詞</div>';
      this.track.style.transition = 'none';
      this.track.style.transform = 'translateY(110px)';
      const singleLine = this.track.querySelector('.lyric-line');
      if (singleLine) {
        singleLine.style.setProperty('--wipe-progress', '100%');
      }
    }
  }

  setPausedDisplay() {
    // Keep current display static
  }

  setAudioOnlyDisplay(title = '') {
    this.cancelActiveRequests();
    this.sessionId++;
    this.lyrics = [];
    this.currentIndex = -1;
    this.currentTrackQuery = '';
    this.offset = 0.0;

    if (this.track) {
      this.track.innerHTML = `<div class="lyric-line is-active">🎵 ${title ? title + ' (純音樂律動)' : '純音樂律動中'}</div>`;
      this.track.style.transition = 'none';
      this.track.style.transform = 'translateY(110px)';
      const singleLine = this.track.querySelector('.lyric-line');
      if (singleLine) {
        singleLine.style.setProperty('--wipe-progress', '100%');
      }
    }
  }

  setNoLyricsDisplay(cleanTitle = '') {
    this.lyrics = [];
    this.currentIndex = -1;
    if (this.track) {
      this.track.innerHTML = `<div class="lyric-line is-active">🎵 ${cleanTitle ? cleanTitle + ' (純音樂律動)' : '純音樂律動中'}</div>`;
      this.track.style.transition = 'none';
      this.track.style.transform = 'translateY(110px)';
      const singleLine = this.track.querySelector('.lyric-line');
      if (singleLine) {
        singleLine.style.setProperty('--wipe-progress', '100%');
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

  parsePlainLyrics(text, cacheKey = null, sessionId = null, currentPlaybackTime = 0.0) {
    if (sessionId !== null && this.sessionId !== sessionId) return;
    if (!text) return;
    const rawLines = text.split('\n').map(l => l.trim()).filter(l => l);
    const cleanList = [];
    let lastT = '';
    rawLines.forEach((l, idx) => {
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
      el.addEventListener('click', () => {
        if (window.seekToTime) window.seekToTime(item.time);
      });
      fragment.appendChild(el);
    });

    this.track.innerHTML = '';
    this.track.appendChild(fragment);
  }

  /**
   * 🌟 Precision Line Scroll Update & Karaoke Progress Wipe
   */
  updateTime(currentTime) {
    if (!this.lyrics || this.lyrics.length === 0) return;

    const effectiveTime = Math.max(0, currentTime + this.offset);
    const lastItem = this.lyrics[this.lyrics.length - 1];

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
