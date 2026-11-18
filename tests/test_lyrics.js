/**
 * Modular Unit Test: LyricsEngine (5 Mirrors, S2T, Hangul Defense, Score Ranking, Cache v3)
 */
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

const lyricsSrc = fs.readFileSync(path.join(__dirname, '../js/lyrics_engine.js'), 'utf8')
  + '\nglobalThis.__LIVELY = { LrcParser, LyricsEngine, LrcCache, S2TConverter, LYRICSPLUS_MIRRORS };';

const sandbox = {
  window: {},
  document: {
    getElementById: () => null,
    createDocumentFragment: () => ({ appendChild() {} }),
    createElement: () => ({ style: {}, className: '', dataset: {}, addEventListener() {} })
  },
  localStorage: {
    _m: new Map(),
    getItem(k) { return this._m.get(k) || null; },
    setItem(k, v) { this._m.set(k, v); }
  },
  setTimeout,
  clearTimeout,
  AbortController,
  URLSearchParams,
  fetch: async () => { throw new Error('network disabled in unit test'); },
  DOMParser: undefined,
  console, Map, Set, Math, Number, String, Array, Object, RegExp, JSON, Date, Promise
};

vm.createContext(sandbox);
vm.runInContext(lyricsSrc, sandbox, { filename: 'lyrics_engine.js' });

const { LrcParser, LyricsEngine, LrcCache, S2TConverter, LYRICSPLUS_MIRRORS } = sandbox.__LIVELY;

// 1. 5 LyricsPlus Mirrors
assert.strictEqual(LYRICSPLUS_MIRRORS.length, 5, 'Should expose all 5 LyricsPlus mirrors');
assert(LYRICSPLUS_MIRRORS.includes('https://lyricsplus.atomix.one'));
assert(LYRICSPLUS_MIRRORS.includes('https://lyricsplus.binimum.org'));

// 2. OpenCC S2T lyric context disambiguation
assert.strictEqual(S2TConverter.toTraditional('头发吹干舍不得皇后'), '頭髮吹乾捨不得皇后');

// 3. LRC native [offset:+500] and <word> parsing
const parsed = LrcParser.parseLRC('[offset:+500]\n[00:10.00]first line\n[00:15.00]second line');
assert.strictEqual(parsed.length, 2);
assert(Math.abs(parsed[0].time - 9.5) < 0.001, 'LRC offset must shift timestamp');

// 4. Korean Hangul Defense in pickBestLrcLibHit
const romanized = {
  trackName: 'DRIP',
  artistName: 'BABYMONSTER',
  duration: 180,
  syncedLyrics: '[00:05.00]Baby got no brakes\n[00:10.00]Nae mamsogeul\n[00:15.00]Bling bling\n[00:20.00]Drip drip\n[00:25.00]Let it go'
};
const authenticHangul = {
  trackName: 'DRIP',
  artistName: 'BABYMONSTER',
  duration: 180,
  syncedLyrics: '[00:05.00]베이비 갓 노 브레이크\n[00:10.00]내 맘속을 울려\n[00:15.00]블링 블링\n[00:20.00]드립 드립\n[00:25.00]멈추지 않아'
};
const bestHit = LrcParser.pickBestLrcLibHit([romanized, authenticHangul], 'DRIP', 'BABYMONSTER', 180);
assert.strictEqual(bestHit, authenticHangul, 'Korean Hangul defense must prefer authentic Hangul over romanization');

// 5. Unified scoreCandidate & candidate selection
const engine = new LyricsEngine({});
const sHangul = engine.scoreCandidate({
  title: 'DRIP',
  artist: 'BABYMONSTER',
  lyrics: [
    { time: 1, text: '내 맘속을' },
    { time: 2, text: '드립' },
    { time: 3, text: '멈추지 않아' },
    { time: 4, text: '가자' },
    { time: 5, text: '끝까지' }
  ]
}, 'DRIP', 'BABYMONSTER', 180);
const sRoman = engine.scoreCandidate({
  title: 'DRIP',
  artist: 'BABYMONSTER',
  lyrics: [
    { time: 1, text: 'nae mamsogeul' },
    { time: 2, text: 'drip' },
    { time: 3, text: 'stop' },
    { time: 4, text: 'go' },
    { time: 5, text: 'end' }
  ]
}, 'DRIP', 'BABYMONSTER', 180);
assert(sHangul > sRoman, 'scoreCandidate must rank Hangul lyrics higher than romanized lyrics for K-pop');

engine.candidates = [{ source: 'test', score: sHangul, lyrics: parsed }];
assert.strictEqual(engine.selectCandidate(0), true);
assert.strictEqual(engine.lyrics.length, 2);

// 6. Cache key prefix aod_lrc_v3_ (requires >= 3 lines)
const parsed3 = LrcParser.parseLRC('[00:05.00]line one\n[00:10.00]line two\n[00:15.00]line three');
LrcCache.set('song_artist', parsed3);
assert(sandbox.localStorage._m.has('aod_lrc_v3_song_artist'), 'Cache must use v3 prefix');
assert.strictEqual(LrcCache.get('song_artist').length, 3, 'Cache get must restore saved lyrics');

// 7. TTML export present & pure display-only (no accidental desktop wheel offset handler)
assert.strictEqual(typeof LrcParser.parseTTML, 'function');
assert.strictEqual(typeof engine.bindViewportOffsetWheel, 'undefined');

console.log('PASS all Lively v1.0.0 lyrics unit tests');
