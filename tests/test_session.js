/**
 * Modular Unit Test: PlaybackSession State Machine & Zero-Width GSMTC Tunnel Decode
 */
const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const path = require('path');

// 1. Test Zero-Width GSMTC Steganography Encode -> Decode round-trip
const extSrc = fs.readFileSync(path.join(__dirname, '../tools/browser_sync_extension/content.js'), 'utf8');
const listenerSrc = fs.readFileSync(path.join(__dirname, '../js/audio_listener.js'), 'utf8')
  + '\nglobalThis.__AUDIO = { LivelyWasapiAdapter };';

function encodeZeroWidth(posSec, durSec, isPlaying, seq) {
  const START_MARKER = '\u200D\u200B\u200D';
  const END_MARKER = '\u200D\u200C\u200D';
  const payload = `${posSec.toFixed(2)}_${durSec.toFixed(1)}_${isPlaying ? 1 : 0}_${seq}`;
  let bits = '';
  for (let i = 0; i < payload.length; i++) {
    const code = payload.charCodeAt(i) & 0x7f;
    for (let b = 6; b >= 0; b--) {
      bits += ((code >> b) & 1) ? '\u200C' : '\u200B';
    }
  }
  return `${START_MARKER}${bits}${END_MARKER}`;
}

assert(extSrc.includes('\\u200D\\u200B\\u200D'), 'Extension content.js must expose zero-width START_MARKER');

const audioBox = {
  window: { _livelyAudioRawFft: new Float32Array(128) },
  document: { hidden: false },
  performance: { now: () => 1000 },
  Float32Array, Math, Number, String, Array, Object, JSON, console, setTimeout, AbortController
};
vm.createContext(audioBox);
vm.runInContext(listenerSrc, audioBox, { filename: 'audio_listener.js' });

const { LivelyWasapiAdapter } = audioBox.__AUDIO;
const hidden = encodeZeroWidth(84.25, 215.5, true, 3);
const decoded = LivelyWasapiAdapter.decodeZeroWidthTunnel(`BABYMONSTER${hidden}`);
assert.strictEqual(decoded.clean, 'BABYMONSTER', 'Clean artist string must strip all zero-width characters');
assert(decoded.data, 'Must decode steganographic payload');
assert(Math.abs(decoded.data.position - 84.25) < 0.01);
assert(Math.abs(decoded.data.duration - 215.5) < 0.1);
assert.strictEqual(decoded.data.isPlaying, true);

// 2. Test PlaybackSession state transitions & near-end seek guard
const sessionSrc = fs.readFileSync(path.join(__dirname, '../js/playback_session.js'), 'utf8')
  + '\nglobalThis.__SESSION = PlaybackSession;';
let fakeNow = 1000;
const sessionBox = {
  window: {},
  performance: { now: () => fakeNow },
  Float32Array, Math, Number, String, Array, Object, console
};
vm.createContext(sessionBox);
vm.runInContext(sessionSrc, sessionBox, { filename: 'playback_session.js' });

const session = new sessionBox.__SESSION();
assert.strictEqual(session.state, 'standby');

let trackChanges = 0;
session.on('trackChange', () => { trackChanges++; });

session.setTrack({ title: 'DRIP', artist: 'BABYMONSTER', duration: 180, position: 10 });
assert.strictEqual(session.state, 'playing');
assert.strictEqual(trackChanges, 1);

// Mid-song seek near end must NOT trigger bogus new-song reset
session.playbackTime = 172;
session.setTrack({ title: 'DRIP', artist: 'BABYMONSTER', duration: 180, position: 168 });
assert.strictEqual(trackChanges, 1, 'Near-end seek refresh must not re-trigger trackChange');
assert(Math.abs(session.playbackTime - 168) < 0.1, 'Mid-song seek must snap playbackTime');

// External timeline sync handles pause & resume cleanly
session.syncExternalTimeline({ position: 120.5, duration: 180, isPlaying: false });
assert.strictEqual(session.state, 'paused');
assert(Math.abs(session.playbackTime - 120.5) < 0.1);

session.syncExternalTimeline({ position: 121.0, duration: 180, isPlaying: true });
assert.strictEqual(session.state, 'playing');

console.log('PASS all Lively v1.0.0 session & GSMTC steganography unit tests');
