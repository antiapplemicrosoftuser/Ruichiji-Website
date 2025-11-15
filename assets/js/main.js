// main.js - Header (Jekyll _includes) を使う前提のクライアントロジック
// dataPath は layout で設定される window.SITE_ASSET_PATH を利用します。
const main = (function () {
  const baseAssets = (window && window.SITE_ASSET_PATH) ? window.SITE_ASSET_PATH : 'assets/';
  const dataPath = baseAssets + 'data/';

  // ---- ヘッダー固定に伴う body の padding-top を設定 ----
  let currentHeaderHeight = 0;
  function adjustHeaderSpacing() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const h = Math.ceil(header.getBoundingClientRect().height);
    currentHeaderHeight = h;
    document.documentElement.style.setProperty('--header-height', `${h}px`);
    document.body.style.paddingTop = `${h}px`;
    document.documentElement.style.scrollPaddingTop = `${h}px`;
    document.documentElement.style.setProperty('scroll-padding-top', `${h}px`);
  }

  function offsetScrollToElement(el, instant = false) {
    if (!el) return;
    const extraOffset = 8;
    const headerH = currentHeaderHeight || parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 0;
    const rect = el.getBoundingClientRect();
    const targetY = window.scrollY + rect.top - headerH - extraOffset;
    if (instant) window.scrollTo(0, targetY);
    else window.scrollTo({ top: targetY, behavior: 'smooth' });
  }

  function attachInternalLinkHandler() {
    document.addEventListener('click', function (e) {
      const a = e.target.closest('a[href]');
      if (!a) return;
      const href = a.getAttribute('href');
      if (!href) return;
      if (href.startsWith('#') || (a.origin === location.origin && a.pathname === location.pathname && href.includes('#'))) {
        const hash = href.includes('#') ? href.split('#')[1] : '';
        if (!hash) return;
        const target = document.getElementById(decodeURIComponent(hash)) || document.querySelector(`[name="${decodeURIComponent(hash)}"]`);
        if (target) {
          e.preventDefault();
          history.pushState(null, '', '#' + decodeURIComponent(hash));
          setTimeout(() => offsetScrollToElement(target), 10);
          // ensure highlight updates when internal link uses pushState
          try { setTimeout(highlightMovieByHash, 120); } catch (_) { /* highlight may be defined later */ }
        }
      }
    }, { passive: false });
  }

  // --- begin highlight movie by hash additions ---

  // Inject highlight CSS once
  (function ensureMovieHighlightStyle() {
    if (document.getElementById('movie-highlight-style')) return;
    const style = document.createElement('style');
    style.id = 'movie-highlight-style';
    style.textContent = `
/* highlight for selected movie card when jumped to via hash */
.selected-movie {
  background: linear-gradient(90deg, rgba(255,230,150,0.12), rgba(255,230,150,0.04));
  border-radius: 8px;
  box-shadow: inset 0 0 0 2px rgba(255,200,0,0.08);
  transition: background 240ms ease, box-shadow 240ms ease;
}

/* slightly emphasize the kicker/title inside the selected card */
.selected-movie .kicker {
  padding: 2px 6px;
  border-radius: 6px;
  background: rgba(255,255,255,0.02);
}

/* respect reduced motion preference */
@media (prefers-reduced-motion: reduce) {
  .selected-movie { transition: none; }
}
    `;
    document.head.appendChild(style);
  })();

  // Highlight the movie item corresponding to the current hash (movie-<id>)
  function highlightMovieByHash() {
    // remove previous
    const prev = document.querySelector('.selected-movie');
    if (prev) prev.classList.remove('selected-movie');

    const rawHash = location.hash ? decodeURIComponent(location.hash.slice(1)) : '';
    if (!rawHash) return;

    // Accept either "movie-<id>" or just "<id>"
    const targetId = rawHash.startsWith('movie-') ? rawHash : 'movie-' + rawHash;
    const el = document.getElementById(targetId);
    if (!el) return;

    el.classList.add('selected-movie');

    // If element is partially off-screen, ensure it's scrolled into view nicely
    // Use smooth scroll but only if user does not prefer reduced motion
    try {
      const prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!prefersReduced) {
        // Slight delay to allow any offsetScroll adjustments to finish
        setTimeout(() => {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 80);
      }
    } catch (e) {
      // ignore
    }
  }

  // Ensure highlight updates on navigation events
  window.addEventListener('hashchange', highlightMovieByHash);
  window.addEventListener('popstate', highlightMovieByHash);

  // --- end highlight movie by hash additions ---

  function handleInitialHash() {
    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
      if (el) setTimeout(() => offsetScrollToElement(el, true), 50);
    }
  }

  window.addEventListener('DOMContentLoaded', function () {
    adjustHeaderSpacing();
    handleInitialHash();
    attachInternalLinkHandler();
  });
  window.addEventListener('resize', adjustHeaderSpacing);

  // -------------------------
  // データ読み込み・レンダリング関数群
  // -------------------------
  async function fetchJSON(name) {
    const url = dataPath + name + '.json';
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load ' + url + ' status=' + res.status);
    return res.json();
  }

  async function fetchText(path) {
    // path may be absolute or relative. If relative, resolve against baseAssets.
    let url = String(path || '');
    if (!url) return '';
    if (!/^[a-z]+:\/\//i.test(url) && !url.startsWith('/')) {
      url = baseAssets + url;
    }
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error('Failed to fetch text ' + url + ' status=' + res.status);
    }
    return res.text();
  }

  function qParam(key) {
    const params = new URLSearchParams(location.search);
    return params.get(key);
  }

  function sortByDateDesc(items, field = 'date') {
    return items.slice().sort((a, b) => {
      const da = new Date(a[field] || 0).getTime();
      const db = new Date(b[field] || 0).getTime();
      return db - da;
    });
  }

  function thumbOrPlaceholder(url, w = 200, h = 200) {
    return url || `https://via.placeholder.com/${w}x${h}?text=Image`;
  }

  // Utilities for flexible music lookup
  function normalize(str) {
    if (!str) return '';
    return String(str).trim().toLowerCase().replace(/\s+/g, ' ');
  }
  function slugify(str) {
    if (!str) return '';
    return String(str).toLowerCase().replace(/[^\w]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function findMusicRef(musicItems = [], ref) {
    if (!ref) return null;
    const r = String(ref).trim();
    let found = (musicItems || []).find(x => x.id === r);
    if (found) return found;
    found = (musicItems || []).find(x => x.id && x.id.toLowerCase() === r.toLowerCase());
    if (found) return found;
    found = (musicItems || []).find(x => x.id && x.id.toLowerCase().includes(r.toLowerCase()));
    if (found) return found;
    found = (musicItems || []).find(x => x.title && normalize(x.title) === normalize(r));
    if (found) return found;
    found = (musicItems || []).find(x => x.title && normalize(x.title).includes(normalize(r)));
    if (found) return found;
    found = (musicItems || []).find(x => x.title && normalize(r).includes(normalize(x.title)));
    if (found) return found;
    const refSlug = slugify(r);
    found = (musicItems || []).find(x => slugify(x.title) === refSlug || (x.id && slugify(x.id) === refSlug));
    if (found) return found;
    return null;
  }

  // Strict ID-only finder (exact or case-insensitive) - for musicID matching
  function findMusicById(musicItems = [], ref) {
    if (!ref) return null;
    const r = String(ref).trim();
    let found = (musicItems || []).find(x => x.id === r);
    if (found) return found;
    found = (musicItems || []).find(x => x.id && x.id.toLowerCase() === r.toLowerCase());
    if (found) return found;
    return null;
  }

  // Find movies that reference a given music id (support musicID/musicIDs/tracks[].musicID and legacy fields)
  function findMoviesByMusicId(movieItems = [], musicId) {
    if (!musicId) return [];
    const r = String(musicId).trim();
    const list = (movieItems || []).filter(m => {
      // new fields
      if (m.musicID && String(m.musicID).trim().toLowerCase() === r.toLowerCase()) return true;
      if (Array.isArray(m.musicIDs) && m.musicIDs.some(x => String(x).trim().toLowerCase() === r.toLowerCase())) return true;
      if (Array.isArray(m.tracks) && m.tracks.some(t => t && t.musicID && String(t.musicID).trim().toLowerCase() === r.toLowerCase())) return true;
      // legacy fields: track, track_id, tracks[].id
      if (m.track && String(m.track).trim().toLowerCase() === r.toLowerCase()) return true;
      if (m.track_id && String(m.track_id).trim().toLowerCase() === r.toLowerCase()) return true;
      if (Array.isArray(m.tracks) && m.tracks.some(t => t && (String(t.id||'').trim().toLowerCase() === r.toLowerCase()))) return true;
      return false;
    });
    return list;
  }

  function embedVideoHtml(url) {
    if (!url) return '';
    // YouTube
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let id = null;
      if (url.includes('youtu.be/')) id = url.split('youtu.be/')[1].split(/[?&]/)[0];
      if (url.includes('v=')) {
        const q = url.split('?')[1] || '';
        id = new URLSearchParams(q).get('v') || id;
      }
      if (!id) return `<a href="${url}" target="_blank">${escapeHtml(url)}</a>`;
      const embed = `https://www.youtube.com/embed/${id}`;
      return `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;"><iframe src="${embed}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe></div>`;
    }

    // NicoNico - try to extract id and embed
    // examples:
    // https://www.nicovideo.jp/watch/sm12345678  -> sm12345678
    // https://nico.ms/sm12345678                -> sm12345678
    try {
      const nicoMatch = url.match(/(?:nicovideo\.jp\/watch\/|nico\.ms\/)([a-z0-9]+(?:[0-9]*))/i);
      if (nicoMatch && nicoMatch[1]) {
        const nid = nicoMatch[1];
        const embed = `https://embed.nicovideo.jp/watch/${nid}`;
        return `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;"><iframe src="${embed}" frameborder="0" scrolling="no" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe></div>`;
      }
    } catch (e) {
      console.debug('embedVideoHtml: nico embed extraction failed', e, url);
    }

    // Fallback: plain link
    return `<p><a href="${url}" target="_blank" rel="noopener">${escapeHtml(url)}</a></p>`;
  }

  // ---- loadLatest ----
  async function loadLatest(kind, containerSelector, linkPrefix) {
    try {
      const data = await fetchJSON(kind);
      const sorted = sortByDateDesc(data.items || data);
      const latest = sorted[0];
      const container = document.querySelector(containerSelector);
      if (!latest || !container) return;
      let html = '';
      if (kind === 'topics') {
        html = `<div class="kicker">${escapeHtml(latest.title)}</div>
                <div class="meta-small">${latest.date || ''}</div>
                <p>${escapeHtml(truncate(latest.content || '', 140))}</p>
                <a href="${linkPrefix + latest.id}">続きを読む</a>`;
      } else if (kind === 'music') {
        html = `<div class="kicker">${escapeHtml(latest.title)}</div>
                <div class="meta-small">リリース: ${latest.date || ''}</div>
                ${latest.audio ? `<audio controls src="${latest.audio}"></audio>` : `<p>${escapeHtml(truncate(latest.note||'',120))}</p>`}
                <p><a href="${linkPrefix + latest.id}">曲のページへ</a></p>`;
      } else if (kind === 'movies') {
        html = `<div class="kicker">${escapeHtml(latest.title)}</div>
                <div class="meta-small">公開: ${latest.date || ''}</div>
                ${latest.video ? embedVideoHtml(latest.video) : `<p>${escapeHtml(truncate(latest.description||'',120))}</p>`}
                <p><a href="${linkPrefix + latest.id}">動画ページへ</a></p>`;
      } else if (kind === 'discography') {
        html = `<img src="${thumbOrPlaceholder(latest.cover,120,120)}" alt="" class="thumb" style="float:left;margin-right:12px">
                <div class="kicker">${escapeHtml(latest.title)}</div>
                <div class="meta-small">参加: ${escapeHtml((latest.artists||[]).join(', '))}</div>
                <p>${escapeHtml(latest.description||'（説明未設定）')}</p>
                <p><a href="${linkPrefix + latest.id}">アルバムページへ</a></p>
                <div style="clear:both"></div>`;
      } else if (kind === 'live') {
        html = `<img src="${thumbOrPlaceholder(latest.image,160,90)}" alt="" class="thumb" style="float:left;margin-right:12px">
                <div class="kicker">${escapeHtml(latest.title)}</div>
                <div class="meta-small">${latest.date || ''} ・ ${escapeHtml(latest.venue||'')}</div>
                <p>${escapeHtml(truncate(latest.note||'',120))}</p>
                <p><a href="${linkPrefix + latest.id}">公演ページへ</a></p>
                <div style="clear:both"></div>`;
      }
      container.innerHTML = html;
    } catch (e) {
      console.error('loadLatest error', e);
    }
  }

  // ---- Topics list / topic page ----
  async function renderTopicsList(containerSelector) {
    try {
      const data = await fetchJSON('topics');
      const items = sortByDateDesc(data.items || data);
      const container = document.querySelector(containerSelector);
      if (!container) return;
      container.innerHTML = items.map(t => `
        <div class="item">
          <div class="meta">${t.date || ''}</div>
          <div>
            <div class="kicker"><a href="topic.html?id=${t.id}">${escapeHtml(t.title)}</a></div>
            <div>${escapeHtml(truncate(t.content || '', 220))}</div>
          </div>
        </div>
      `).join('');
    } catch (e) { console.error('renderTopicsList error', e); }
  }

  async function renderTopicPage(containerSelector) {
    try {
      const id = qParam('id');
      const container = document.querySelector(containerSelector);
      if (!id) { if (container) container.innerHTML = '<p>idが指定されていません。</p>'; return; }
      const data = await fetchJSON('topics');
      const items = data.items || data;
      const item = items.find(x => x.id === id);
      if (!item) { if (container) container.innerHTML = '<p>記事が見つかりません。</p>'; return; }
      container.innerHTML = `
        <article class="card">
          <h2 id="topic-${escapeHtml(item.id)}">${escapeHtml(item.title)}</h2>
          <div class="meta-small">${item.date || ''}</div>
          <div class="content">${nl2br(escapeHtml(item.content || ''))}</div>
        </article>
      `;
    } catch (e) { console.error('renderTopicPage error', e); }
  }

  // ---- Music list / track page ----
  async function renderMusicList(containerSelector) {
    try {
      const data = await fetchJSON('music');
      const items = sortByDateDesc(data.items || data);
      const container = document.querySelector(containerSelector);
      if (!container) return;
      container.innerHTML = items.map(m => `
        <div class="item">
          <img src="${thumbOrPlaceholder(m.cover,96,96)}" alt="" class="thumb">
          <div>
            <div class="kicker"><a href="track.html?id=${m.id}">${escapeHtml(m.title)}</a></div>
            <div class="meta-small">リリース: ${m.date || ''} ・ ${escapeHtml(m.duration||'')}</div>
            <div>${m.audio ? `<audio controls src="${m.audio}"></audio>` : `<p>${escapeHtml(m.note||'（再生無し）')}</p>`}</div>
          </div>
        </div>
      `).join('');
    } catch (e) { console.error('renderMusicList error', e); }
  }

  async function renderTrackPage(containerSelector) {
    try {
      const id = qParam('id');
      const container = document.querySelector(containerSelector);
      if (!container) return;
      if (!id) { container.innerHTML = '<p>idが指定されていません。</p>'; return; }
      const data = await fetchJSON('music');
      const items = data.items || data;
      const item = items.find(x => x.id === id);
      if (!item) { container.innerHTML = '<p>曲が見つかりません。</p>'; return; }

      // If lyrics are in external file, fetch it. Support item.lyricsFile (relative to baseAssets) or absolute URL.
      let lyricsText = item.lyrics || '';
      if (item.lyricsFile) {
        try {
          lyricsText = await fetchText(item.lyricsFile);
        } catch (e) {
          console.warn('Failed to load lyrics file', item.lyricsFile, e);
          // fallback: keep item.lyrics if any
          lyricsText = item.lyrics || '';
        }
      }

      // Find related MV(s) by musicID
      const moviesData = await fetchJSON('movies').catch(()=>({items:[]}));
      const relatedMovies = findMoviesByMusicId(moviesData.items || [], item.id);

      const relatedMVHtml = (relatedMovies || []).map(mv => {
        // link to movie list page anchored to the item so it scrolls into view
        const anchor = `movie.html#movie-${encodeURIComponent(mv.id)}`;
        return `<li><a href="${anchor}">${escapeHtml(mv.title)}</a>（${escapeHtml(mv.date||'')}）</li>`;
      }).join('');

      // render page with lyrics and MV links
      container.innerHTML = `
        <article class="card">
          <h2 id="track-${escapeHtml(item.id)}">${escapeHtml(item.title)}</h2>
          <div class="meta-small">リリース: ${item.date || ''} ・ ${escapeHtml(item.duration||'')}</div>
          <div style="margin: .8rem 0;">
            ${item.audio ? `<audio controls src="${item.audio}"></audio>` : `<p class="meta-small">この曲の音源は用意されていません。</p>`}
          </div>

          ${relatedMVHtml ? `<section><h3>関連MV</h3><ul>${relatedMVHtml}</ul></section>` : ''}

          <section>
            <h3>Credits</h3>
            <p class="meta-small">${escapeHtml((item.credits||[]).join(', ') || '未設定')}</p>
          </section>
          <section>
            <h3>Lyrics</h3>
            <div class="content" id="lyrics-content">${nl2br(escapeHtml(lyricsText || '歌詞は未設定です。'))}</div>
          </section>
          <section>
            <h3>収録アルバム</h3>
            <ul>${(item.albums||[]).map(aId=>`<li><a href="album.html?id=${aId}">${escapeHtml(aId)}</a></li>`).join('') || '<li>収録アルバムはありません。</li>'}</ul>
          </section>
        </article>
      `;
    } catch (e) { console.error('renderTrackPage error', e); }
  }

  // ---- Movie list / page (match using musicID field) ----
  async function renderMovieList(containerSelector) {
    try {
      const data = await fetchJSON('movies');
      const items = sortByDateDesc(data.items || data);
      const musicData = await fetchJSON('music').catch(()=>({items:[]}));
      const container = document.querySelector(containerSelector);
      if (!container) return;
      const html = items.map(m => {
        try {
          // Collect candidate musicID references from new fields
          const relatedCandidates = [];
          if (m.musicID) relatedCandidates.push(m.musicID);
          if (Array.isArray(m.musicIDs)) m.musicIDs.forEach(t => relatedCandidates.push(t));
          if (Array.isArray(m.tracks)) {
            m.tracks.forEach(t => {
              if (t && t.musicID) relatedCandidates.push(t.musicID);
            });
          }

          // Only create links when movie-provided musicID matches a music.id (exact or case-insensitive).
          const relatedLinks = (relatedCandidates || []).map(ref => {
            const refItem = findMusicById(musicData.items || [], ref);
            if (refItem) return `<a href="track.html?id=${refItem.id}">${escapeHtml(refItem.title)}</a>`;
            return null;
          }).filter(Boolean);

          const linksHtml = relatedLinks.length ? `<p class="meta-small">関連曲: ${relatedLinks.join(' ・ ')}</p>` : '';

          // add id to container so other pages can link to movie.html#movie-<id>
          const itemIdAttr = `movie-${escapeHtml(m.id)}`;

          // Title should link to video (or external url) if available, otherwise to movie page
          const titleHref = m.video || m.url || `movie.html?id=${m.id}`;
          const titleHrefEncoded = encodeURI(String(titleHref));

          return `
            <div class="item" id="${itemIdAttr}">
              <div class="meta">${m.date || ''}</div>
              <div>
                <div class="kicker"><a href="${titleHrefEncoded}" target="_blank" rel="noopener">${escapeHtml(m.title)}</a></div>
                <div class="meta-small">${escapeHtml(m.service || '')} ${escapeHtml(m.uploader||'')}</div>
                <div style="margin-top:.5rem">${m.video ? embedVideoHtml(m.video) : '<p>リンクのみ</p>'}</div>
                ${linksHtml}
              </div>
            </div>
          `;
        } catch (innerErr) {
          console.error('renderMovieList: item render error', innerErr, m);
          return '';
        }
      }).join('');
      container.innerHTML = html;
      // after list rendered, ensure highlight for current hash (if any)
      try { setTimeout(highlightMovieByHash, 50); } catch (_) {}
    } catch (e) {
      console.error('renderMovieList error', e);
    }
  }

  async function renderMoviePage(containerSelector) {
    try {
      const id = qParam('id');
      const container = document.querySelector(containerSelector);
      if (!container) return;
      if (!id) { container.innerHTML = '<p>idが指定されていません。</p>'; return; }
      const data = await fetchJSON('movies');
      const items = data.items || data;
      const item = items.find(x => x.id === id);
      if (!item) { container.innerHTML = '<p>動画が見つかりません。</p>'; return; }

      const musicData = await fetchJSON('music').catch(()=>({items:[]}));

      const relatedCandidates = [];
      if (item.musicID) relatedCandidates.push(item.musicID);
      if (Array.isArray(item.musicIDs)) item.musicIDs.forEach(t => relatedCandidates.push(t));
      if (Array.isArray(item.tracks)) {
        item.tracks.forEach(t => {
          if (t && t.musicID) relatedCandidates.push(t.musicID);
        });
      }

      // Only create links for ID matches
      const relatedHtml = (relatedCandidates || []).map(ref => {
        const refItem = findMusicById(musicData.items || [], ref);
        if (refItem) return `<li><a href="track.html?id=${refItem.id}">${escapeHtml(refItem.title)}</a></li>`;
        return '';
      }).filter(Boolean).join('');

      container.innerHTML = `
        <article class="card">
          <h2 id="movie-${escapeHtml(item.id)}">${escapeHtml(item.title)}</h2>
          <div class="meta-small">公開: ${item.date || ''} ・ ${escapeHtml(item.service || '')} ${escapeHtml(item.uploader || '')}</div>
          <div style="margin-top:.8rem">
            ${item.video ? embedVideoHtml(item.video) : `<p>${escapeHtml(item.description||'')}</p>`}
          </div>

          ${relatedHtml ? `<section style="margin-top:1rem"><h3>関連曲</h3><ul>${relatedHtml}</ul></section>` : ''}

          <section style="margin-top:1rem">
            <h3>詳細</h3>
            <div class="content">${nl2br(escapeHtml(item.description || ''))}</div>
          </section>
        </article>
      `;
    } catch (e) {
      console.error('renderMoviePage error', e);
    }
  }

  // ---- Discography / Album ----
  async function renderDiscography(containerSelector) {
    try {
      const data = await fetchJSON('discography');
      const items = sortByDateDesc(data.items || data);
      const container = document.querySelector(containerSelector);
      if (!container) return;
      container.innerHTML = items.map(a => `
        <article class="card">
          <div style="display:flex;gap:1rem;align-items:center;">
            <img src="${thumbOrPlaceholder(a.cover,140,140)}" alt="" class="thumb">
            <div>
              <h3><a href="album.html?id=${a.id}">${escapeHtml(a.title)}</a></h3>
              <div class="meta-small">参加アーティスト: ${escapeHtml((a.artists||[]).join(', ') || '未設定')}</div>
              <div class="meta-small">トラック数: ${a.tracks ? a.tracks.length : (a.track_count || '不明')}</div>
              <p>${escapeHtml(a.description || '')}</p>
            </div>
          </div>
        </article>
      `).join('');
    } catch (e) { console.error('renderDiscography error', e); }
  }

  async function renderAlbumPage(containerSelector) {
    try {
      const id = qParam('id');
      const container = document.querySelector(containerSelector);
      if (!container) return;
      if (!id) { container.innerHTML = '<p>id が指定されていません。</p>'; return; }
      const data = await fetchJSON('discography');
      const items = data.items || data;
      const album = items.find(x => x.id === id);
      if (!album) { container.innerHTML = '<p>アルバムが見つかりません。</p>'; return; }

      const musicData = await fetchJSON('music').catch(()=>({items:[]}));
      const trackHtml = (album.tracks || []).map(t => {
        // Prefer new field musicID on track entries
        const musicRefId = (t && t.musicID) ? t.musicID : (t && t.id) ? t.id : null;
        const trackRef = musicRefId ? (musicData.items||[]).find(m => m.id === musicRefId) : null;
        if (trackRef) {
          // 手動採番を残し、リンクは track.html?id=...
          return `<li>${escapeHtml(t.track_no || '')}. <a href="track.html?id=${trackRef.id}">${escapeHtml(trackRef.title)}</a> — ${escapeHtml(trackRef.composer || trackRef.author || '')}</li>`;
        } else {
          // 非連携曲では内部IDの表示をしない
          return `<li>${escapeHtml(t.track_no || '')}. ${escapeHtml(t.title)} — ${escapeHtml(t.author || '')}</li>`;
        }
      }).join('');

      container.innerHTML = `
        <article class="card">
          <div style="display:flex;gap:1rem;align-items:flex-start;">
            <img src="${thumbOrPlaceholder(album.cover,200,200)}" alt="" class="thumb">
            <div>
              <h2 id="album-${escapeHtml(album.id)}">${escapeHtml(album.title)}</h2>
              <div class="meta-small">参加: ${escapeHtml((album.artists||[]).join(', ') || '未設定')}</div>
              <div class="meta-small">リリース: ${album.date || ''}</div>
              <p>${escapeHtml(album.description || '')}</p>
            </div>
          </div>

          <section style="margin-top:1rem">
            <h3>収録曲</h3>
            <ol class="manual-number">
              ${trackHtml || '<li>収録曲データがありません</li>'}
            </ol>
          </section>
        </article>
      `;
    } catch (e) { console.error('renderAlbumPage error', e); }
  }

  // ---- Live list / page ----
  async function renderLiveList(containerSelector) {
    try {
      const data = await fetchJSON('live');
      const items = sortByDateDesc(data.items || data);
      const container = document.querySelector(containerSelector);
      if (!container) return;
      container.innerHTML = items.map(l => `
        <div class="item">
          <img src="${thumbOrPlaceholder(l.image,96,96)}" alt="" class="thumb">
          <div>
            <div class="kicker"><a href="live-event.html?id=${l.id}">${escapeHtml(l.title)}</a></div>
            <div class="meta-small">${l.date || ''} ・ ${escapeHtml(l.venue||'')}</div>
            <div>${escapeHtml(truncate(l.note||'',140))}</div>
          </div>
        </div>
      `).join('');
    } catch (e) { console.error('renderLiveList error', e); }
  }

  async function renderLivePage(containerSelector) {
    try {
      const id = qParam('id');
      const container = document.querySelector(containerSelector);
      if (!container) return;
      if (!id) { container.innerHTML = '<p>idが指定されていません。</p>'; return; }
      const data = await fetchJSON('live');
      const item = (data.items || data).find(x => x.id === id);
      if (!item) { container.innerHTML = '<p>ライブ情報が見つかりません。</p>'; return; }

      const musicData = await fetchJSON('music').catch(()=>({items:[]}));
      const setlistHtml = (item.setlist || []).map((s, idx) => {
        const found = (musicData.items||[]).find(m => m.id === s.id || m.title === s.title);
        if (found) {
          return `<li>${idx+1}. <a href="track.html?id=${found.id}">${escapeHtml(found.title)}</a></li>`;
        } else {
          return `<li>${idx+1}. ${escapeHtml(s.title || s)}</li>`;
        }
      }).join('');

      const containerHtml = `
        <article class="card">
          <h2 id="live-${escapeHtml(item.id)}">${escapeHtml(item.title)}</h2>
          <div class="meta-small">${item.date || ''} ・ ${escapeHtml(item.venue || '')}</div>
          <div style="margin-top:.8rem">
            <img src="${thumbOrPlaceholder(item.image,700,200)}" alt="" style="width:100%;max-height:300px;object-fit:cover;border-radius:8px">
          </div>
          <section style="margin-top:1rem">
            <h3>説明</h3>
            <div class="content">${nl2br(escapeHtml(item.note || ''))}</div>
          </section>
          <section style="margin-top:1rem">
            <h3>セットリスト</h3>
            <ol class="manual-number">${setlistHtml || '<li>セットリスト情報がありません</li>'}</ol>
          </section>
        </article>
      `;
      container.innerHTML = containerHtml;
    } catch (e) { console.error('renderLivePage error', e); }
  }

  // Utilities
  function truncate(str, n) {
    if (!str) return '';
    return str.length > n ? str.slice(0, n - 1) + '…' : str;
  }

  function escapeHtml(unsafe) {
    if (unsafe == null) return '';
    return String(unsafe)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function nl2br(str) {
    return String(str).replace(/\n/g, '<br>');
  }

  return {
    loadLatest,
    renderTopicsList,
    renderTopicPage,
    renderMusicList,
    renderTrackPage,
    renderMovieList,
    renderMoviePage,
    renderDiscography,
    renderAlbumPage,
    renderLiveList,
    renderLivePage
  };
})();

// window オブジェクトにも参照を設定しておく（ページ側から呼び出せるように）
window.main = main;