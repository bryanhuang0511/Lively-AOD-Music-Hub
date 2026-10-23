/**
 * ============================================================================
 * 🎤 LyricsEngine v1.4 - Multi-Source Syllable & Conveyor Lyrics Subsystem
 * ============================================================================
 * Deep Module Architecture (Upgraded with YTM_Immersion LyricsPlus & Smart Scorer):
 * - Small Interface: setTrack(track, isNew), sync(time, isPaused), reset(), loadLocalLRC(text)
 * - Internal Seams:
 *   1. LrcParser:
 *      - LyricsPlus Syllable JSON parser (Apple Music / QQ / Musixmatch word-by-word sync)
 *      - Enhanced & Standard LRC parser with [offset:+/-ms] & <mm:ss.xx> support
 *      - Smart YouTube / GSMTC Title & Artist decomposer ('Song', 【Song】, Artist - Song, - Topic)
 *      - YTM_Immersion candidate scoring algorithm (duration match, variant penalty, artist match)
 *   2. LrcCache: Versioned localStorage cache layer (aod_lrc_v2_)
 *   3. LrcFetcher: Parallel LyricsPlus mirror racer + smart LRCLIB fallback
 *   4. ConveyorRenderer: 3-line optical depth-of-field centering & syllable karaoke wipe
 */

const LYRICSPLUS_MIRRORS = [
  'https://lyricsplus.prjktla.my.id',
  'https://lyricsplus.prjktla.workers.dev',
  'https://lyricsplus-seven.vercel.app'
];

class LrcParser {
  static isMetadataLine(text) {
    if (!text) return true;
    const clean = text.trim();
    if (clean.length < 2) return true;

    // Filter pure divider symbols (---, ***, ...)
    if (/^[\-_~*=·\s.]{2,}$/.test(clean)) return true;

    // Filter common production / credit prefixes
    const metaRegex = /^(作詞|作词|作曲|編曲|编曲|製作|制作|監製|监制|混音|母帶|母带|錄音|录音|吉他|貝斯|贝斯|鼓手|鍵盤|键盘|和聲|和声|弦樂|弦乐|企劃|企划|統籌|统筹|發行|发行|出品|詞|词|曲|編|编|OP|SP|Prod|Produced|Written|Arranged|Mixed|Mastered|Lyrics|Lyricist|Music|Composer|Vocal|Singer|Artist|Album|歌手|專輯|专辑|歌名|曲名)[:：\s\/／、]/i;
    if (metaRegex.test(clean)) return true;

    const pureMetaRegex = /^(純音樂|纯音乐|請欣賞|请欣赏|Instrumental|Intro|Interlude|Outro|Music|Ending)$/i;
    if (pureMetaRegex.test(clean)) return true;

    const creditRegex = /^(Written by|Composed by|Arranged by|Produced by|Directed by|Mastered by|Mixed by|Lyrics by|Music by)/i;
    if (creditRegex.test(clean)) return true;

    return false;
  }

  static normalizeKey(str) {
    return String(str || '')
      .normalize('NFKC')
      .toLowerCase()
      .replace(/[\s\-_.,!?'":;()\[\]【】「」『』《》〈〉~·•]/g, '')
      .trim();
  }

  /**
   * Smart YouTube / YouTube Music / GSMTC Track Title & Artist Cleaner
   * Handles:
   * - "BABYMONSTER - 'DESERVE' M/V" -> title: "DESERVE", artist: "BABYMONSTER"
   * - "[MV] GFRIEND(여자친구) _ Rough(시간을 달려서)" -> title: "Rough(시간을 달려서)", artist: "GFRIEND(여자친구)"
   * - "盧廣仲 Crowd Lu 【魚仔】 Official MV" -> title: "魚仔", artist: "盧廣仲 Crowd Lu"
   * - "BABYMONSTER - Topic" -> artist: "BABYMONSTER"
   */
  static cleanTrackInfo(rawTitle, rawArtist) {
    let artist = String(rawArtist || '')
      .replace(/\s*-\s*Topic$/i, '')
      .replace(/\s*[\(\[](Official|YouTube|Channel|VEVO|Music|Entertainment|Labels?)[\.\s\w]*[\)\]]/gi, '')
      .replace(/\b(VEVO|Official YouTube Channel|Official Channel)\b/gi, '')
      .replace(/\s*[\(\[](feat|ft|with)[\.\s\w]*[\)\]]/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    let title = String(rawTitle || '')
      // Strip leading tags like [MV], [Official Video], [4K]
      .replace(/^\s*[\[\(【](mv|m\/v|official|music video|lyric|audio|live|4k|hd|teaser|clip|special|performance)[^\]\)】]*[\]\)】]\s*/gi, '')
      // Strip trailing video noise in brackets/parentheses
      .replace(/\s*[\(\[【](feat|ft|with|official|music video|mv|m\/v|audio|remix|version|ver\.|live|hd|4k|lyric video|lyrics|visualizer|performance|special clip|dance practice)[^)\]]*[\)\]】]/gi, '')
      // Strip bare trailing M/V or Official Video
      .replace(/\s+\b(official\s+music\s+video|official\s+video|official\s+audio|official\s+mv|music\s+video|lyric\s+video|m\/v|mv)\b.*$/i, '')
      .replace(/ - \w+ remix$/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    let extractedArtist = '';
    let extractedTitle = '';

    // 1. Check if title contains "Artist - Title" or "Artist _ Title"
    const dashMatch = title.match(/^(.+?)\s+(?:[-–—_]|\/\/)\s+(.+)$/);
    if (dashMatch) {
      const left = dashMatch[1].trim();
      const right = dashMatch[2].trim();
      const normArtist = LrcParser.normalizeKey(artist);
      const normLeft = LrcParser.normalizeKey(left);

      const isGenericChannel = !artist || /1thek|smtown|jyp|hybe|yg\s*entertainment|stone\s*music|kakao|genie|bugs|딩고|dingo|the\s*first\s*take|팀이어|添翼|滾石|相信音樂|華研|愛貝克思/i.test(artist);

      if (normArtist && (normLeft.includes(normArtist) || normArtist.includes(normLeft))) {
        title = right;
      } else if (isGenericChannel) {
        extractedArtist = left;
        title = right;
      } else {
        extractedTitle = right;
        extractedArtist = left;
      }
    }

    // 2. Check if title wraps the actual song name in quotes or CJK brackets:
    // e.g. "BABYMONSTER 'DESERVE'" or "盧廣仲 Crowd Lu 【魚仔】"
    const bracketMatch = title.match(/^(.*?)\s*(?:['"‘’“”「」『』《》【】])([^'"‘’“”「」『』《》【】]{2,})(?:['"‘’“”「」『』《》【】])\s*(.*)$/);
    if (bracketMatch) {
      const prefix = bracketMatch[1].replace(/^[\s\-–—_]+|[\s\-–—_]+$/g, '').trim();
      const innerSong = bracketMatch[2].trim();
      if (innerSong.length >= 2) {
        if (!extractedArtist && prefix && prefix.length >= 2) {
          extractedArtist = prefix;
        }
        extractedTitle = innerSong;
        // If prefix matches known artist, strip prefix immediately
        const normArtist = LrcParser.normalizeKey(artist || extractedArtist);
        const normPrefix = LrcParser.normalizeKey(prefix);
        if (!prefix || (normArtist && (normPrefix.includes(normArtist) || normArtist.includes(normPrefix)))) {
          title = innerSong;
        }
      }
    }

    // Remove surrounding quotes if any remain
    title = title.replace(/^['"‘’“”「」『』《》【】]+|['"‘’“”「」『』《》【】]+$/g, '').trim();
    if (!artist && extractedArtist) {
      artist = extractedArtist;
    }

    return {
      cleanTitle: title,
      cleanArtist: artist,
      altTitle: extractedTitle && extractedTitle !== title ? extractedTitle : '',
      altArtist: extractedArtist && extractedArtist !== artist ? extractedArtist : ''
    };
  }

  /**
   * Parse LyricsPlus JSON (Apple Music / QQ Music / Musixmatch Syllable & Line Sync)
   */
  static parseLyricsPlus(json) {
    const rows = Array.isArray(json?.lyrics)
      ? json.lyrics
      : (Array.isArray(json?.data?.lyrics) ? json.data.lyrics : []);
    if (!rows || rows.length === 0) return [];

    const result = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowTimeMs = Number(row?.time);
      const rowDurMs = Number(row?.duration);
      const syllabus = Array.isArray(row?.syllabus) ? row.syllabus : [];

      const words = [];
      const bgWords = [];

      for (let s = 0; s < syllabus.length; s++) {
        const syl = syllabus[s];
        const tMs = Number(syl?.time);
        const dMs = Number(syl?.duration);
        const txt = String(syl?.text ?? '');
        if (!Number.isFinite(tMs) || !txt) continue;

        const wStart = tMs / 1000;
        const wEnd = (Number.isFinite(dMs) && dMs > 0) ? (tMs + dMs) / 1000 : wStart + 0.25;

        if (syl?.isBackground) {
          bgWords.push({ time: wStart, end: wEnd, text: txt });
        } else {
          words.push({ time: wStart, end: wEnd, text: txt });
        }
      }

      const activeWords = words.length > 0 ? words : bgWords;
      // Clamp monotonic word times
      for (let w = 1; w < activeWords.length; w++) {
        if (activeWords[w].time < activeWords[w - 1].time) {
          activeWords[w].time = activeWords[w - 1].time;
        }
        if (activeWords[w].end < activeWords[w].time) {
          activeWords[w].end = activeWords[w].time + 0.15;
        }
      }

      const startTime = Number.isFinite(rowTimeMs)
        ? rowTimeMs / 1000
        : (activeWords.length > 0 ? activeWords[0].time : null);
      if (startTime === null) continue;

      const lineText = (words.length > 0 && bgWords.length > 0)
        ? words.map(w => w.text).join('').trim()
        : (String(row?.text ?? '').trim() || activeWords.map(w => w.text).join('').trim());

      if (!lineText) continue;

      if (startTime < 22.0 && LrcParser.isMetadataLine(lineText)) {
        continue;
      }

      let endTime = (Number.isFinite(rowTimeMs) && Number.isFinite(rowDurMs) && rowDurMs > 0)
        ? (rowTimeMs + rowDurMs) / 1000
        : (activeWords.length > 0 ? activeWords[activeWords.length - 1].end : null);

      result.push({
        time: Math.max(0, startTime),
        endTime: endTime && endTime > startTime ? endTime : null,
        text: lineText,
        words: activeWords.length > 1 ? activeWords : null
      });
    }

    result.sort((a, b) => a.time - b.time);

    // Deduplicate identical consecutive lines at identical timestamps
    const deduplicated = [];
    for (let item of result) {
      const prev = deduplicated[deduplicated.length - 1];
      if (!prev || prev.text !== item.text || Math.abs(prev.time - item.time) > 0.5) {
        deduplicated.push(item);
      }
    }
    return deduplicated;
  }

  /**
   * Parse Standard & Enhanced LRC (with [offset:+/-ms] and <mm:ss.xx> word tags)
   */
  static parseLRC(text) {
    if (!text) return [];
    const temp = [];
    const lines = String(text).replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const timeReg = /\[(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?\]/g;
    const inlineWordReg = /<(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?>([^<]*)/g;

    // 1. Check for [offset:+/-ms] tag in LRC header
    let globalOffsetSec = 0.0;
    const offsetMatch = String(text).match(/\[offset:\s*([+-]?\d+)\s*\]/i);
    if (offsetMatch) {
      const offsetMs = parseInt(offsetMatch[1], 10);
      if (Number.isFinite(offsetMs)) {
        // In LRC specification, positive offset means lyrics appear earlier (subtract from timestamp)
        globalOffsetSec = -offsetMs / 1000;
      }
    }

    const parseTimeParts = (m, s, msStr) => {
      const min = parseInt(m, 10);
      const sec = parseInt(s, 10);
      const ms = msStr ? parseInt(String(msStr).padEnd(3, '0').slice(0, 3), 10) : 0;
      return min * 60 + sec + ms / 1000;
    };

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      let match;
      const lineTimes = [];
      timeReg.lastIndex = 0;
      while ((match = timeReg.exec(line)) !== null) {
        lineTimes.push(parseTimeParts(match[1], match[2], match[3]));
      }

      if (lineTimes.length === 0) continue;

      // Strip line timestamps and optional speaker prefix (v1:, bg:)
      let rawContent = line
        .replace(/\[\d{1,3}:\d{2}(?:[.:]\d{1,3})?\]/g, '')
        .replace(/^(?:v\d{1,3}|bg)\s*:\s*/i, '')
        .trim();

      // Check for Enhanced LRC inline word tags <mm:ss.xx>
      const words = [];
      if (/<\d{1,3}:\d{2}/.test(rawContent)) {
        inlineWordReg.lastIndex = 0;
        let wm;
        while ((wm = inlineWordReg.exec(rawContent)) !== null) {
          const wTime = Math.max(0, parseTimeParts(wm[1], wm[2], wm[3]) + globalOffsetSec);
          const wText = wm[4];
          if (wText) {
            words.push({ time: wTime, end: wTime + 0.25, text: wText });
          }
        }
        for (let i = 0; i < words.length - 1; i++) {
          words[i].end = Math.max(words[i].time + 0.05, words[i + 1].time);
        }
        rawContent = rawContent.replace(/<\d{1,3}:\d{2}(?:[.:]\d{1,3})?>/g, '').trim();
      }

      if (!rawContent || /^(by|ar|ti|al|offset|re|ve):/i.test(rawContent)) {
        continue;
      }

      for (const rawTime of lineTimes) {
        const totalSeconds = Math.max(0, rawTime + globalOffsetSec);
        if (totalSeconds < 22.0 && LrcParser.isMetadataLine(rawContent)) {
          continue;
        }
        temp.push({
          time: totalSeconds,
          endTime: words.length > 0 ? words[words.length - 1].end : null,
          text: rawContent,
          words: words.length > 1 ? words : null
        });
      }
    }

    temp.sort((a, b) => a.time - b.time);

    // Remove consecutive identical duplicates
    const deduplicated = [];
    let lastText = '';
    let lastTime = -10;
    for (let item of temp) {
      if (item.text !== lastText || (item.time - lastTime) > 8.0) {
        deduplicated.push(item);
        lastText = item.text;
        lastTime = item.time;
      }
    }
    return deduplicated;
  }

  static parsePlain(text) {
    if (!text) return [];
    const rawLines = String(text).split('\n').map(l => l.trim()).filter(l => l);
    const cleanList = [];
    let lastT = '';
    rawLines.forEach((l, idx) => {
      if (idx < 6 && LrcParser.isMetadataLine(l)) return;
      if (l !== lastT) {
        cleanList.push({ time: idx * 4.0, endTime: (idx + 1) * 4.0, text: l, words: null });
        lastT = l;
      }
    });
    return cleanList;
  }

  /**
   * YTM_Immersion Smart Candidate Scorer for LRCLIB search results
   */
  static pickBestLrcLibHit(items, wantTitle, wantArtist, wantDuration = 0) {
    if (!Array.isArray(items) || items.length === 0) return null;

    const targetTitle = LrcParser.normalizeKey(wantTitle);
    const targetArtist = LrcParser.normalizeKey(wantArtist);
    const targetDur = Number(wantDuration) > 20 ? Number(wantDuration) : null;
    const variantKeywords = /\b(remix|live|instrumental|karaoke|cover|sped\s*up|slowed|nightcore|8d|acoustic|demo|ver\.|version)\b/i;
    const wantHasVariant = variantKeywords.test(wantTitle);

    let bestItem = null;
    let bestScore = -Infinity;

    for (const item of items) {
      if (!item) continue;
      const hasSynced = Boolean(item.syncedLyrics && item.syncedLyrics.trim());
      const hasPlain = Boolean(item.plainLyrics && item.plainLyrics.trim());
      if (!hasSynced && !hasPlain) continue;

      let score = hasSynced ? 150 : 10;

      const candRawTitle = String(item.trackName || item.track_name || item.name || '');
      const candRawArtist = String(item.artistName || item.artist_name || item.artist || '');
      const candTitle = LrcParser.normalizeKey(candRawTitle);
      const candArtist = LrcParser.normalizeKey(candRawArtist);

      // 1. Title Matching
      if (targetTitle && candTitle) {
        if (candTitle === targetTitle) {
          score += 100;
        } else if (targetTitle.includes(candTitle) || candTitle.includes(targetTitle)) {
          score += 45;
        } else {
          score -= 50;
        }
      }

      // 2. Penalize unwanted Remix / Live / Instrumental variants
      if (!wantHasVariant && variantKeywords.test(candRawTitle)) {
        score -= 85;
      }

      // 3. Artist Matching
      if (targetArtist && candArtist) {
        if (candArtist === targetArtist) {
          score += 70;
        } else if (candArtist.includes(targetArtist) || targetArtist.includes(candArtist)) {
          score += 40;
        } else {
          score -= 25;
        }
      }

      // 4. Duration Closeness
      const candDur = Number(item.duration);
      if (targetDur && Number.isFinite(candDur) && candDur > 0) {
        const diff = Math.abs(candDur - targetDur);
        if (diff <= 2.5) score += 55;
        else if (diff <= 6.0) score += 25;
        else if (diff <= 12.0) score += 5;
        else score -= Math.min(60, diff * 1.5);
      }

      // 5. Reject broken 1~3 line fragments
      if (hasSynced) {
        const lineCount = item.syncedLyrics.split('\n').length;
        if (lineCount < 5) score -= 120;
      }

      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    }

    return bestItem;
  }
}

class LrcCache {
  static get(queryKey) {
    try {
      const data = localStorage.getItem(`aod_lrc_v2_${queryKey}`);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && parsed.length >= 3) return parsed;
      }
    } catch (e) {}
    return null;
  }

  static set(queryKey, list) {
    try {
      if (queryKey && list && list.length >= 3) {
        localStorage.setItem(`aod_lrc_v2_${queryKey}`, JSON.stringify(list));
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

    this.bindViewportOffsetWheel();
    this.reset();
  }

  /**
   * Allow fine-tuning lyric offset with Mouse Wheel over the lyrics viewport (±0.25s)
   * Middle-click resets offset to 0.0s.
   */
  bindViewportOffsetWheel() {
    if (!this.viewport) return;
    this.viewport.addEventListener('wheel', (e) => {
      if (!this.lyrics || this.lyrics.length === 0) return;
      e.preventDefault();
      const step = e.deltaY < 0 ? 0.25 : -0.25;
      this.offset = Math.max(-30.0, Math.min(30.0, this.offset + step));
    }, { passive: false });

    this.viewport.addEventListener('auxclick', (e) => {
      if (e.button === 1) {
        e.preventDefault();
        this.offset = 0.0;
      }
    });
  }

  // ==========================================================================
  // Public Deep Interface
  // ==========================================================================

  setTrack(trackInfo, isNew = true) {
    if (!trackInfo || !trackInfo.title) {
      this.reset();
      return;
    }

    const cleaned = LrcParser.cleanTrackInfo(trackInfo.title, trackInfo.artist);
    const { cleanTitle, cleanArtist } = cleaned;
    if (!cleanTitle) {
      this.reset();
      return;
    }

    const queryKey = `${cleanTitle}_${cleanArtist}`;

    // If same track and not a new song / replay, keep current lyrics state intact!
    if (!isNew && queryKey === this.currentTrackQuery && this.lyrics.length > 0) {
      return;
    }

    // If replaying the exact same song from the start, jump to 0:00 without refetching
    if (isNew && queryKey === this.currentTrackQuery && this.lyrics.length > 0) {
      this.offset = 0.0;
      this.resetToStart();
      return;
    }

    this.currentTrackQuery = queryKey;
    this.offset = 0.0;
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

    // Fetch from LyricsPlus (YTM_Immersion Syllable Sync) + Smart LRCLIB
    this.fetchOnline(cleaned, queryKey, session, trackInfo.duration || 0);
  }

  sync(currentTime, isPaused = false) {
    if (!this.lyrics || this.lyrics.length === 0) return;

    const effectiveTime = Math.max(0, currentTime + this.offset);
    const firstItem = this.lyrics[0];
    const lastItem = this.lyrics[this.lyrics.length - 1];

    // 1. Outro Fade Out (4.0s after last line fades to 100% pure black)
    const lastEndTime = lastItem.endTime || (lastItem.time + 4.0);
    if (lastItem && effectiveTime > Math.max(lastItem.time + 4.0, lastEndTime + 2.5)) {
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

    // 3. Binary Search for Current Line (O(log N))
    let low = 0;
    let high = this.lyrics.length - 1;
    let targetIndex = -1;
    while (low <= high) {
      const mid = (low + high) >>> 1;
      if (effectiveTime >= this.lyrics[mid].time) {
        targetIndex = mid;
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    if (targetIndex >= 0) {
      if (targetIndex !== this.currentIndex) {
        this.currentIndex = targetIndex;
        this.scrollToIndex(targetIndex, true);
      }

      // 4. Syllable-Accurate / Line Wipe Progress Calculation
      const currentItem = this.lyrics[targetIndex];
      const nextItem = this.lyrics[targetIndex + 1];
      let ratio = 0.0;

      if (currentItem.words && currentItem.words.length > 1) {
        // Syllable-level progress (LyricsPlus / Enhanced LRC)
        const words = currentItem.words;
        let completedChars = 0;
        let totalChars = 0;
        for (let w = 0; w < words.length; w++) {
          const word = words[w];
          const wLen = Math.max(1, word.text.length);
          totalChars += wLen;
          if (effectiveTime >= word.end) {
            completedChars += wLen;
          } else if (effectiveTime > word.time) {
            const wDur = Math.max(0.05, word.end - word.time);
            completedChars += wLen * Math.min(1.0, (effectiveTime - word.time) / wDur);
          }
        }
        ratio = totalChars > 0 ? Math.min(1.0, Math.max(0.0, completedChars / totalChars)) : 0.0;
      } else {
        const startTime = currentItem.time;
        const naturalEnd = currentItem.endTime
          ? currentItem.endTime
          : (nextItem ? Math.min(nextItem.time, startTime + 5.5) : (startTime + 4.5));
        const duration = Math.max(0.5, naturalEnd - startTime);
        const elapsed = Math.max(0, effectiveTime - startTime);
        ratio = Math.min(1.0, Math.max(0.0, elapsed / duration));
      }

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
  // Internal Multi-Source Fetch Implementation
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

  async fetchFromLyricsPlus(title, artist, durationSec, signal) {
    if (!title) return null;
    const params = new URLSearchParams({ title });
    if (artist) params.set('artist', artist);
    if (durationSec && durationSec > 20) {
      params.set('duration', String(Math.round(durationSec)));
    }
    const queryStr = params.toString();

    const mirrorPromises = LYRICSPLUS_MIRRORS.map(async (base) => {
      const res = await fetch(`${base}/v2/lyrics/get?${queryStr}`, {
        method: 'GET',
        cache: 'no-store',
        signal
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json?.error) throw new Error('API Error');
      const parsed = LrcParser.parseLyricsPlus(json);
      if (!parsed || parsed.length < 3) throw new Error('Empty lyrics');
      return parsed;
    });

    try {
      return await Promise.any(mirrorPromises);
    } catch (e) {
      return null;
    }
  }

  async fetchFromLrcLib(title, artist, durationSec, signal) {
    if (!title) return null;

    // 1. Try exact /api/get when artist is known
    if (artist) {
      try {
        const getUrl = `https://lrclib.net/api/get?track_name=${encodeURIComponent(title)}&artist_name=${encodeURIComponent(artist)}`;
        const res = await fetch(getUrl, { signal });
        if (res.ok) {
          const data = await res.json();
          if (data && data.syncedLyrics) {
            const parsed = LrcParser.parseLRC(data.syncedLyrics);
            if (parsed.length >= 4) return parsed;
          }
        }
      } catch (e) {
        if (signal.aborted) return null;
      }
    }

    // 2. Search /api/search and rank with YTM_Immersion scorer
    const queries = [];
    if (artist) queries.push(`${title} ${artist}`);
    queries.push(title);

    for (const q of queries) {
      if (signal.aborted) return null;
      try {
        const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(q)}`;
        const res = await fetch(searchUrl, { signal });
        if (!res.ok) continue;
        const list = await res.json();
        if (!Array.isArray(list) || list.length === 0) continue;

        const best = LrcParser.pickBestLrcLibHit(list, title, artist, durationSec);
        if (best) {
          const parsed = best.syncedLyrics
            ? LrcParser.parseLRC(best.syncedLyrics)
            : LrcParser.parsePlain(best.plainLyrics);
          if (parsed && parsed.length >= 3) {
            return parsed;
          }
        }
      } catch (e) {
        if (signal.aborted) return null;
      }
    }
    return null;
  }

  async fetchOnline(cleaned, queryKey, session, durationSec = 0) {
    this.activeController = new AbortController();
    const signal = this.activeController.signal;

    const timeoutId = setTimeout(() => {
      if (this.activeController) this.activeController.abort();
    }, 5500);

    const { cleanTitle, cleanArtist, altTitle, altArtist } = cleaned;
    const searchPairs = [{ title: cleanTitle, artist: cleanArtist }];
    if (altTitle || altArtist) {
      searchPairs.push({
        title: altTitle || cleanTitle,
        artist: altArtist || cleanArtist
      });
    }

    try {
      for (const pair of searchPairs) {
        if (this.sessionId !== session || signal.aborted) return;

        // Run LyricsPlus (Syllable Sync) and LRCLIB in parallel for maximum speed & accuracy
        const [lyricsPlusRes, lrcLibRes] = await Promise.all([
          this.fetchFromLyricsPlus(pair.title, pair.artist, durationSec, signal),
          this.fetchFromLrcLib(pair.title, pair.artist, durationSec, signal)
        ]);

        if (this.sessionId !== session || signal.aborted) return;

        // Prefer LyricsPlus when it has syllable-level timing, otherwise pick whichever succeeded
        let chosen = null;
        const hasSyllables = lyricsPlusRes && lyricsPlusRes.some(l => l.words && l.words.length > 1);
        if (hasSyllables) {
          chosen = lyricsPlusRes;
        } else if (lrcLibRes && lrcLibRes.length >= 4) {
          chosen = lrcLibRes;
        } else if (lyricsPlusRes && lyricsPlusRes.length >= 3) {
          chosen = lyricsPlusRes;
        }

        if (chosen && chosen.length > 0) {
          clearTimeout(timeoutId);
          LrcCache.set(queryKey, chosen);
          this.applyLyrics(chosen, session);
          return;
        }
      }

      clearTimeout(timeoutId);
      if (this.sessionId === session && !signal.aborted) {
        this.setFallbackTitleDisplay(cleanTitle);
      }
    } catch (e) {
      clearTimeout(timeoutId);
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
      const lastEnd = lastLine.endTime || (lastLine.time + 8.0);
      this.trackDuration = Math.max(120, lastEnd + 4.0);
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
