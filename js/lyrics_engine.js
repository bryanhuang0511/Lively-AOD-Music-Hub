/**
 * ============================================================================
 * 🎤 LyricsEngine - Deep Conveyor Lyrics Subsystem
 * ============================================================================
 * Deep Module Architecture:
 * - Small Interface: setTrack(track, isNew), sync(time, isPaused), reset(), loadLocalLRC(text)
 * - Internal Seams:
 *   1. LrcParser: Pure string -> tokenized timestamps + noise credit filtering (DOM-free & unit-testable)
 *   2. LrcCache: Transparent localStorage cache layer
 *   3. LrcFetcher: Session-locked, abortable network fetcher
 *   4. ConveyorRenderer: Vertical centering & karaoke progressive wipe
 * - Zero Global Leakage: Uses constructor onSeek callback instead of window globals
 */

class LrcParser {
  static isMetadataLine(text) {
    if (!text) return true;
    const clean = text.trim();
    if (clean.length < 2) return true;

    // Filter pure divider symbols (---, ***, ...)
    if (/^[\-_~*=·\s.]{2,}$/.test(clean)) return true;

    // Filter common production / credit prefixes
    const metaRegex = /^(作詞|作词|作曲|編曲|编曲|製作|制作|監製|监制|混音|母帶|母带|錄音|录音|吉他|貝斯|贝斯|鼓手|鍵盤|键盘|和聲|和声|弦樂|弦乐|企劃|企划|統籌|统筹|發行|发行|出品|OP|SP|Prod|Produced|Written|Arranged|Mixed|Mastered|Lyrics|Music|Composer|Vocal|Singer|Artist|Album|歌手|專輯|专辑|歌名|曲名)[:：\s\/／、]/i;
    if (metaRegex.test(clean)) return true;

    const pureMetaRegex = /^(純音樂|纯音乐|請欣賞|请欣赏|Instrumental|Intro|Interlude|Outro|Music|Ending)$/i;
    if (pureMetaRegex.test(clean)) return true;

    const creditRegex = /^(Written by|Composed by|Arranged by|Produced by|Directed by|Mastered by|Mixed by|Lyrics by|Music by)/i;
    if (creditRegex.test(clean)) return true;

    return false;
  }

  static parseLRC(text) {
    if (!text) return [];
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
          // Filter credit noise in first 22 seconds
          if (totalSeconds < 22.0 && LrcParser.isMetadataLine(content)) {
            continue;
          }
          temp.push({ time: totalSeconds, text: content });
        }
      }
    }

    temp.sort((a, b) => a.time - b.time);

    // Remove consecutive duplicates
    const deduplicated = [];
    let lastText = '';
    for (let item of temp) {
      if (item.text !== lastText) {
        deduplicated.push(item);
        lastText = item.text;
      }
    }
    return deduplicated;
  }

  static parsePlain(text) {
    if (!text) return [];
    const rawLines = text.split('\n').map(l => l.trim()).filter(l => l);
    const cleanList = [];
    let lastT = '';
    rawLines.forEach((l, idx) => {
      if (idx < 6 && LrcParser.isMetadataLine(l)) return;
      if (l !== lastT) {
        cleanList.push({ time: idx * 4.0, text: l });
        lastT = l;
      }
    });
    return cleanList;
  }

  static cleanTrackInfo(title, artist) {
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
}

class LrcCache {
  static get(queryKey) {
    try {
      const data = localStorage.getItem(`aod_lrc_${queryKey}`);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return null;
  }

  static set(queryKey, list) {
    try {
      if (queryKey && list && list.length > 0) {
        localStorage.setItem(`aod_lrc_${queryKey}`, JSON.stringify(list));
      }
    } catch (e) {}
  }
}

class LyricsEngine {
  constructor(options = {}) {
    this.viewport = document.getElementById(options.viewportId || 'lyricsViewport');
    this.track = document.getElementById(options.trackId || 'lyricsTrack');
    this.onSeek = options.onSeek || null;
    this.onDurationResolved = options.onDurationResolved || null;

    this.lyrics = [];
    this.currentIndex = -1;
    this.currentTrackQuery = '';
    this.sessionId = 0;
    this.activeController = null;
    this.noLyricsTimer = null;
    this.offset = 0.0;
    this.trackDuration = 210;

    this.reset();
  }

  // ==========================================================================
  // Public Deep Interface
  // ==========================================================================

  setTrack(trackInfo, isNew = true) {
    if (!trackInfo || !trackInfo.title) {
      this.reset();
      return;
    }

    const { cleanTitle, cleanArtist } = LrcParser.cleanTrackInfo(trackInfo.title, trackInfo.artist);
    if (!cleanTitle) {
      this.reset();
      return;
    }

    const queryKey = `${cleanTitle}_${cleanArtist}`;

    if (!isNew && queryKey === this.currentTrackQuery && this.lyrics.length > 0) {
      // Replay same track: immediately jump to 0:00
      this.resetToStart();
      return;
    }

    this.currentTrackQuery = queryKey;
    this.cancelRequests();
    this.sessionId++;
    const session = this.sessionId;

    // 0ms instant purge of prior song DOM
    this.purgeDOM();

    // Check local cache
    const cached = LrcCache.get(queryKey);
    if (cached) {
      this.applyLyrics(cached, session);
      return;
    }

    // Fetch from LRCLIB
    this.fetchOnline(cleanTitle, cleanArtist, queryKey, session);
  }

  sync(currentTime, isPaused = false) {
    if (!this.lyrics || this.lyrics.length === 0) return;

    const effectiveTime = Math.max(0, currentTime + this.offset);
    const firstItem = this.lyrics[0];
    const lastItem = this.lyrics[this.lyrics.length - 1];

    // 1. Outro Fade Out (4.0s after last line fades to 100% pure black)
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

    // 2. Intro Anchor Lock (locks on line 0 during instrumental intro)
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

    // 3. Binary Search / Line Search for Current Line
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

      // 4. Progressive Karaoke Wipe Calculation
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

  reset() {
    this.cancelRequests();
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

    this.purgeDOM();
  }

  loadLocalLRC(text) {
    this.cancelRequests();
    this.sessionId++;
    const parsed = LrcParser.parseLRC(text);
    if (parsed.length > 0) {
      this.applyLyrics(parsed, this.sessionId);
    }
  }

  // ==========================================================================
  // Internal Implementation
  // ==========================================================================

  cancelRequests() {
    if (this.activeController) {
      try {
        this.activeController.abort();
      } catch (e) {}
      this.activeController = null;
    }
  }

  purgeDOM() {
    if (this.track) {
      this.track.style.transition = 'none';
      this.track.innerHTML = '';
      this.track.style.opacity = '0';
      this.track.style.transform = 'translateY(110px)';
    }
  }

  resetToStart() {
    this.currentIndex = -1;
    if (this.lyrics && this.lyrics.length > 0) {
      this.scrollToIndex(0, false);
      if (this.track) {
        Array.from(this.track.children).forEach(el => {
          el.style.setProperty('--wipe-progress', '0%');
        });
      }
    } else {
      this.purgeDOM();
    }
  }

  async fetchOnline(cleanTitle, cleanArtist, queryKey, session) {
    this.activeController = new AbortController();
    const signal = this.activeController.signal;

    const timeoutId = setTimeout(() => {
      if (this.activeController) this.activeController.abort();
    }, 3000);

    try {
      let url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTitle)}&artist_name=${encodeURIComponent(cleanArtist)}`;
      let res = await fetch(url, { signal });

      if (!res.ok) {
        url = `https://lrclib.net/api/search?q=${encodeURIComponent(cleanTitle + ' ' + cleanArtist)}`;
        res = await fetch(url, { signal });
        if (res.ok) {
          const list = await res.json();
          if (this.sessionId !== session || signal.aborted) return;
          if (list && list.length > 0) {
            const best = list[0];
            clearTimeout(timeoutId);
            const parsed = best.syncedLyrics ? LrcParser.parseLRC(best.syncedLyrics) : LrcParser.parsePlain(best.plainLyrics);
            if (parsed.length > 0) {
              LrcCache.set(queryKey, parsed);
              this.applyLyrics(parsed, session);
              return;
            }
          }
        }
      } else {
        const data = await res.json();
        if (this.sessionId !== session || signal.aborted) return;
        clearTimeout(timeoutId);
        const parsed = data.syncedLyrics ? LrcParser.parseLRC(data.syncedLyrics) : LrcParser.parsePlain(data.plainLyrics);
        if (parsed.length > 0) {
          LrcCache.set(queryKey, parsed);
          this.applyLyrics(parsed, session);
          return;
        }
      }

      clearTimeout(timeoutId);
      if (this.sessionId === session && !signal.aborted) {
        this.setFallbackTitleDisplay(cleanTitle);
      }
    } catch (e) {
      if (this.sessionId === session && !signal.aborted) {
        this.setFallbackTitleDisplay(cleanTitle);
      }
    }
  }

  applyLyrics(list, session) {
    if (this.sessionId !== session) return;
    this.lyrics = list;
    this.currentIndex = -1;

    // Compute track duration estimate
    if (this.lyrics.length > 0) {
      const lastLine = this.lyrics[this.lyrics.length - 1];
      this.trackDuration = Math.max(120, lastLine.time + 8.0);
      if (this.onDurationResolved) {
        this.onDurationResolved(this.trackDuration);
      }
    }

    this.renderDOM();
    this.scrollToIndex(0, false);
  }

  setFallbackTitleDisplay(songName) {
    this.lyrics = [];
    this.currentIndex = -1;
    if (this.track) {
      if (songName) {
        this.track.innerHTML = `<div class="lyric-line is-active" id="fallbackTitleLine">🎵 ${songName}</div>`;
        this.track.style.transition = 'opacity 0.6s ease, transform 0.4s ease';
        this.track.style.opacity = '1';
        this.track.style.transform = 'translateY(110px)';

        this.noLyricsTimer = setTimeout(() => {
          const titleLine = document.getElementById('fallbackTitleLine');
          if (titleLine) {
            titleLine.className = 'lyric-line is-outro-faded';
          }
        }, 5000);
      } else {
        this.purgeDOM();
      }
    }
  }

  renderDOM() {
    if (!this.track) return;
    if (!this.lyrics || this.lyrics.length === 0) {
      this.purgeDOM();
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
        if (this.onSeek) {
          this.onSeek(item.time);
        }
      });
      fragment.appendChild(el);
    });

    this.track.innerHTML = '';
    this.track.appendChild(fragment);
    this.track.style.opacity = '1';
    this.track.style.transition = 'opacity 0.4s ease, transform 0.48s cubic-bezier(0.16, 1, 0.3, 1)';
  }

  scrollToIndex(index, animate = true) {
    if (!this.track || !this.viewport) return;
    const lines = this.track.children;
    if (!lines || lines.length === 0) return;

    const targetEl = lines[index];
    if (!targetEl) return;

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

    const viewportHeight = this.viewport.clientHeight || 290;
    const targetCenterY = targetEl.offsetTop + targetEl.offsetHeight / 2;
    const translateY = (viewportHeight / 2) - targetCenterY;

    if (!animate) {
      this.track.style.transition = 'none';
      this.track.style.transform = `translateY(${translateY}px)`;
      void this.track.offsetWidth;
      this.track.style.transition = 'transform 0.48s cubic-bezier(0.16, 1, 0.3, 1)';
    } else {
      this.track.style.transform = `translateY(${translateY}px)`;
    }
  }
}

// Attach globally for browser / WebView2 loading
window.LyricsEngine = LyricsEngine;
window.LrcParser = LrcParser;
window.LrcCache = LrcCache;
