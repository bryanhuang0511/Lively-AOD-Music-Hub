/**
 * ============================================================================
 * 🚀 Lively AOD Music Hub - Zero-Width GSMTC Steganography Tunnel (v1.4.1)
 * ============================================================================
 * Root-Cause Engineered for Chromium (system_media_controls_win.cc) +
 * Lively Wallpaper (NpsmNowPlayingService.cs):
 *
 * 1. Chromium's Windows GSMTC bridge ONLY forwards `title` and `artist`
 *    (it completely drops `album`).
 * 2. Lively Wallpaper's C# `NpsmNowPlayingService.cs` ONLY invokes
 *    `window.livelyCurrentTrack` when:
 *      `media.Title != model.Title || media.Artist != model.Artist`
 *
 * Solution:
 * Whenever the user fast-forwards / rewinds (`seeked`), plays, or pauses,
 * this script encodes `{ position, duration, isPlaying, seq }` into 100%
 * invisible Unicode Zero-Width characters (\u200B = 0, \u200C = 1) and
 * appends them to `navigator.mediaSession.metadata.artist`.
 *
 * - Windows Media Overlay displays 100% clean Artist & Title (0px width).
 * - Chromium & Lively detect `media.Artist != model.Artist` -> instant callback!
 * - Lively_AOD_Music_Hub decodes the exact millisecond timestamp & strips the
 *   zero-width bits so the wallpaper snaps to the seeked lyric line in < 30ms!
 */
(() => {
  const START_MARKER = '\u200D\u200B\u200D';
  const END_MARKER = '\u200D\u200C\u200D';

  let boundMedia = null;
  let seqCounter = 0;
  let lastExpectedTime = 0;
  let lastCheckWallTime = performance.now();
  let lastTunnelUpdateWallTime = 0;

  // Store clean metadata so we never lose original Title / Artist / Artwork
  let cleanMeta = {
    title: '',
    artist: '',
    album: '',
    artwork: []
  };

  function stripZeroWidth(str) {
    const raw = String(str || '');
    const sIdx = raw.indexOf(START_MARKER);
    const eIdx = sIdx !== -1 ? raw.indexOf(END_MARKER, sIdx + 3) : -1;
    if (sIdx !== -1 && eIdx !== -1) {
      return (raw.slice(0, sIdx) + raw.slice(eIdx + 3)).replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
    }
    return raw.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
  }

  function encodeZeroWidthTunnel(posSec, durSec, isPlaying) {
    seqCounter = (seqCounter + 1) % 10;
    const payload = `${Math.max(0, posSec).toFixed(2)}_${Math.max(0, durSec).toFixed(1)}_${isPlaying ? 1 : 0}_${seqCounter}`;
    let bits = '';
    for (let i = 0; i < payload.length; i++) {
      const code = payload.charCodeAt(i) & 0x7f;
      for (let b = 6; b >= 0; b--) {
        bits += ((code >> b) & 1) ? '\u200C' : '\u200B';
      }
    }
    return START_MARKER + bits + END_MARKER;
  }

  // Intercept MediaSession.prototype.metadata setter so if YouTube Music updates metadata,
  // we automatically capture the clean fields.
  const nativeMetaDesc = typeof MediaSession !== 'undefined'
    ? Object.getOwnPropertyDescriptor(MediaSession.prototype, 'metadata')
    : null;

  function setNativeMetadata(metaObj) {
    if (!navigator.mediaSession) return;
    if (nativeMetaDesc && nativeMetaDesc.set) {
      nativeMetaDesc.set.call(navigator.mediaSession, metaObj);
    } else {
      navigator.mediaSession.metadata = metaObj;
    }
  }

  function getNativeMetadata() {
    if (!navigator.mediaSession) return null;
    if (nativeMetaDesc && nativeMetaDesc.get) {
      return nativeMetaDesc.get.call(navigator.mediaSession);
    }
    return navigator.mediaSession.metadata;
  }

  function refreshCleanMetaFromDOM() {
    const current = getNativeMetadata();
    if (current) {
      const t = stripZeroWidth(current.title);
      const a = stripZeroWidth(current.artist);
      if (t) cleanMeta.title = t;
      if (a) cleanMeta.artist = a;
      if (current.album) cleanMeta.album = stripZeroWidth(current.album);
      if (current.artwork && current.artwork.length) cleanMeta.artwork = current.artwork;
    }

    // Fallback DOM scraping for YouTube Music / YouTube
    const ytTitle = document.querySelector('ytmusic-player-bar .title, h1.ytd-watch-metadata yt-formatted-string');
    const ytArtist = document.querySelector('ytmusic-player-bar .byline a, ytd-channel-name a');
    if (ytTitle && ytTitle.textContent.trim()) {
      cleanMeta.title = stripZeroWidth(ytTitle.textContent.trim());
    } else if (!cleanMeta.title && document.title) {
      cleanMeta.title = stripZeroWidth(document.title.replace(/\s*-\s*YouTube(\s*Music)?$/i, ''));
    }
    if (ytArtist && ytArtist.textContent.trim()) {
      cleanMeta.artist = stripZeroWidth(ytArtist.textContent.trim());
    }
  }

  function pushZeroWidthSync(media, force = false) {
    if (!media || !Number.isFinite(media.currentTime)) return;
    if (!navigator.mediaSession || typeof MediaMetadata === 'undefined') return;

    const now = performance.now();
    if (!force && (now - lastTunnelUpdateWallTime) < 200) return;

    refreshCleanMetaFromDOM();
    if (!cleanMeta.title) return;

    const dur = (Number.isFinite(media.duration) && media.duration > 0) ? media.duration : 0;
    const isPlaying = !media.paused && !media.ended;
    const zwTag = encodeZeroWidthTunnel(media.currentTime, dur, isPlaying);

    // Attach invisible Zero-Width tag to Artist (or Title if Artist is empty)
    const baseArtist = cleanMeta.artist || 'YouTube';
    const taggedArtist = baseArtist + zwTag;

    try {
      setNativeMetadata(new MediaMetadata({
        title: cleanMeta.title,
        artist: taggedArtist,
        album: cleanMeta.album || '',
        artwork: cleanMeta.artwork || []
      }));
      lastTunnelUpdateWallTime = now;
      lastExpectedTime = media.currentTime;
      lastCheckWallTime = now;
    } catch (e) {}
  }

  function triggerSeekBurst(media) {
    pushZeroWidthSync(media, true);
    setTimeout(() => pushZeroWidthSync(media, true), 140);
    setTimeout(() => pushZeroWidthSync(media, true), 380);
  }

  function attachMediaListeners() {
    const media = document.querySelector('video, audio');
    if (media && media !== boundMedia) {
      boundMedia = media;

      ['seeking', 'seeked', 'play', 'pause', 'ratechange', 'loadeddata'].forEach(evt => {
        media.addEventListener(evt, () => triggerSeekBurst(media), { passive: true });
      });

      media.addEventListener('timeupdate', () => {
        const now = performance.now();
        const wallElapsed = (now - lastCheckWallTime) / 1000;
        const expected = lastExpectedTime + (media.paused ? 0 : wallElapsed * (media.playbackRate || 1));
        const jump = Math.abs(media.currentTime - expected);

        lastExpectedTime = media.currentTime;
        lastCheckWallTime = now;

        // Instant burst if time jumped by > 0.65s (seekbar click/drag) or every 4.5s heartbeat
        if (jump > 0.65) {
          triggerSeekBurst(media);
        } else if ((now - lastTunnelUpdateWallTime) > 4500) {
          pushZeroWidthSync(media, false);
        }
      }, { passive: true });
    }
  }

  setInterval(attachMediaListeners, 700);
  attachMediaListeners();
})();
