/**
 * ============================================================================
 * 🚀 Lively AOD Music Hub - Zero-Server GSMTC Metadata Tunnel (v1.4.0)
 * ============================================================================
 * Breakthrough Solution for Lively Wallpaper Fast-Forward / Seek Sync:
 * Lively Wallpaper's C# backend only forwards GSMTC MediaProperties (Title,
 * Artist, AlbumTitle) to window.livelyCurrentTrack() and ignores GSMTC
 * TimelineProperties.
 *
 * Since Lively_AOD_Music_Hub only renders Title and Artist on the Obsidian
 * Capsule, this script embeds a lightweight timestamp tag (#aod_t=pos_dur_play)
 * into navigator.mediaSession.metadata.album whenever the user seeks, fast-
 * forwards, rewinds, pauses, or plays. Windows GSMTC immediately triggers
 * MediaPropertiesChanged -> Lively calls window.livelyCurrentTrack ->
 * Lively_AOD_Music_Hub snaps lyrics to the exact millisecond with ZERO
 * background servers or ports required!
 */
(() => {
  let boundMedia = null;
  let lastExpectedTime = 0;
  let lastCheckWallTime = performance.now();
  let lastTunnelUpdateWallTime = 0;

  function syncViaMediaSessionTunnel(media, force = false) {
    if (!media || !Number.isFinite(media.currentTime)) return;
    if (!navigator.mediaSession) return;

    const now = performance.now();
    if (!force && (now - lastTunnelUpdateWallTime) < 250) return;

    const meta = navigator.mediaSession.metadata;
    let title = meta ? meta.title : '';
    let artist = meta ? meta.artist : '';
    let rawAlbum = meta ? (meta.album || '') : '';
    const artwork = meta ? (meta.artwork || []) : [];

    if (!title) {
      const ytTitle = document.querySelector('ytmusic-player-bar .title, h1.ytd-watch-metadata yt-formatted-string');
      const ytArtist = document.querySelector('ytmusic-player-bar .byline a, ytd-channel-name a');
      title = ytTitle ? ytTitle.textContent.trim() : document.title.replace(/\s*-\s*YouTube(\s*Music)?$/i, '');
      artist = ytArtist ? ytArtist.textContent.trim() : '';
    }
    if (!title) return;

    const cleanAlbum = rawAlbum.replace(/\s*#aod_t=[\d.]+_[\d.]+_[01]$/, '').trim();
    const posStr = Math.max(0, media.currentTime).toFixed(2);
    const durStr = (Number.isFinite(media.duration) && media.duration > 0 ? media.duration : 0).toFixed(1);
    const playFlag = (!media.paused && !media.ended) ? '1' : '0';

    const taggedAlbum = `${cleanAlbum} #aod_t=${posStr}_${durStr}_${playFlag}`.trim();

    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title,
        artist,
        album: taggedAlbum,
        artwork
      });
      lastTunnelUpdateWallTime = now;
      lastExpectedTime = media.currentTime;
      lastCheckWallTime = now;
    } catch (e) {}
  }

  function attachMediaListeners() {
    const media = document.querySelector('video, audio');
    if (media && media !== boundMedia) {
      boundMedia = media;

      // Instant sync on seek (fast-forward/rewind), play, pause, ratechange, and track load
      ['seeked', 'play', 'pause', 'ratechange', 'loadedmetadata'].forEach(evt => {
        media.addEventListener(evt, () => syncViaMediaSessionTunnel(media, true), { passive: true });
      });

      // Detect unexpected jumps (e.g. clicking YouTube chapters or keyboard arrow seeking)
      media.addEventListener('timeupdate', () => {
        const now = performance.now();
        const wallElapsed = (now - lastCheckWallTime) / 1000;
        const expected = lastExpectedTime + (media.paused ? 0 : wallElapsed * (media.playbackRate || 1));
        const jump = Math.abs(media.currentTime - expected);

        lastExpectedTime = media.currentTime;
        lastCheckWallTime = now;

        // If playback jumped by > 0.75s (seek) or every 6s heartbeat, push tunnel update
        if (jump > 0.75 || (now - lastTunnelUpdateWallTime) > 6000) {
          syncViaMediaSessionTunnel(media, jump > 0.75);
        }
      }, { passive: true });
    }
  }

  setInterval(attachMediaListeners, 800);
  attachMediaListeners();
})();
