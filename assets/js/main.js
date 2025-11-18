// main.js - Header (Jekyll _includes) を使う前提のクライアントロジック
// dataPath は layout で設定される window.SITE_ASSET_PATH を利用します。
const main = (function () {
  // より堅牢な assets ベースパス検出（window.SITE_ASSET_PATH があればそれを使う）
  let baseAssets = (window && window.SITE_ASSET_PATH) ? window.SITE_ASSET_PATH : null;
  if (!baseAssets) {
    // this script is normally assets/js/main.js — それを手掛かりに検出
    try {
      const scripts = Array.from(document.getElementsByTagName('script'));
      const found = scripts.reverse().find(s => s.src && s.src.match(/\/assets\/js\/main(\.js)?(\?.*)?$/));
      if (found) {
        const src = found.src;
        baseAssets = src.replace(/\/assets\/js\/main(\.js)?(\?.*)?$/, '/assets/');
      }
    } catch (e) {
      // ignore
    }
  }
  if (!baseAssets) baseAssets = 'assets/';
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

  // === insert social links in header (X / niconico) ===
  function insertHeaderSocialLinks() {
    const nav = document.querySelector('.main-nav');
    if (!nav) return;

    // Avoid duplicate insertion
    if (nav.querySelector('.social-link-x') || nav.querySelector('.social-link-nico')) return;

    // Use the image paths provided
    const xLogoPath = '/Ruichiji-Website/assets/images/x-logo.png';
    const nicoLogoPath = '/Ruichiji-Website/assets/images/niconico-logo.png';

    // X link
    const aX = document.createElement('a');
    aX.href = 'https://x.com/ruichiji';
    aX.target = '_blank';
    aX.rel = 'noopener noreferrer';
    aX.className = 'social-link social-link-x';
    aX.title = 'X / ruichiji';
    aX.setAttribute('aria-label', 'X ruichiji');
    const imgX = document.createElement('img');
    imgX.src = xLogoPath;
    imgX.alt = 'X';
    imgX.width = 18;
    imgX.height = 18;
    imgX.style.display = 'block';
    imgX.style.objectFit = 'contain';
    aX.appendChild(imgX);

    // Nico link
    const aNico = document.createElement('a');
    aNico.href = 'https://www.nicovideo.jp/user/134010373';
    aNico.target = '_blank';
    aNico.rel = 'noopener noreferrer';
    aNico.className = 'social-link social-link-nico';
    aNico.title = 'ニコニコ動画';
    aNico.setAttribute('aria-label', 'ニコニコ動画');
    const imgNico = document.createElement('img');
    imgNico.src = nicoLogoPath;
    imgNico.alt = 'ニコニコ動画';
    imgNico.width = 18;
    imgNico.height = 18;
    imgNico.style.display = 'block';
    imgNico.style.objectFit = 'contain';
    aNico.appendChild(imgNico);

    // Insert icons at the beginning of nav
    if (nav.firstChild) {
      nav.insertBefore(aNico, nav.firstChild);
      nav.insertBefore(aX, nav.firstChild);
    } else {
      nav.appendChild(aX);
      nav.appendChild(aNico);
    }
  }
  // === end insert social links ===

  // === insert hamburger toggle for mobile navigation (accessible open/close with ESC, close on link, focus management) ===
  // Note: this function now only creates the hamburger when window.innerWidth <= 520.
  // If the viewport is wider, any existing hamburger is removed.
  function insertHamburgerToggle() {
    const container = document.querySelector('.site-header .container');
    const nav = document.querySelector('.main-nav');
    if (!container || !nav) return;

    // Ensure nav has an id for aria-controls
    if (!nav.id) nav.id = 'main-nav';

    const isMobile = window.innerWidth <= 520;

    // If not mobile, remove any existing hamburger and ensure nav visible
    if (!isMobile) {
      const existing = container.querySelector('.hamburger');
      if (existing) existing.remove();
      // ensure nav is visible on desktop
      nav.setAttribute('aria-hidden', 'false');
      document.body.classList.remove('nav-open');
      return;
    }

    // At this point, viewport is mobile: create hamburger only if not present
    if (container.querySelector('.hamburger')) {
      // already present — ensure aria states are correct
      const btn = container.querySelector('.hamburger');
      btn.setAttribute('aria-expanded', document.body.classList.contains('nav-open') ? 'true' : 'false');
      return;
    }

    const btn = document.createElement('button');
    btn.className = 'hamburger';
    btn.type = 'button';
    btn.setAttribute('aria-label', 'メニューを開く');
    btn.setAttribute('aria-expanded', 'false');
    btn.setAttribute('aria-controls', nav.id);

    // three bars
    const bar1 = document.createElement('span'); bar1.className = 'bar';
    const bar2 = document.createElement('span'); bar2.className = 'bar';
    const bar3 = document.createElement('span'); bar3.className = 'bar';
    btn.appendChild(bar1); btn.appendChild(bar2); btn.appendChild(bar3);

    // insert button to the LEFT of the site title on mobile (per request)
    const siteTitle = container.querySelector('.site-title');
    if (siteTitle) {
      container.insertBefore(btn, siteTitle);
    } else {
      container.insertBefore(btn, nav);
    }

    // state variables for focus management and handlers
    let previouslyFocused = null;
    let escHandler = null;

    function getFocusableInNav() {
      if (!nav) return [];
      return Array.from(nav.querySelectorAll('a, button, input, select, textarea, [tabindex]:not([tabindex="-1"])'))
        .filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
    }

    function openNav() {
      previouslyFocused = document.activeElement;
      document.body.classList.add('nav-open');
      btn.setAttribute('aria-expanded', 'true');
      nav.setAttribute('aria-hidden', 'false');

      // focus first focusable element inside nav (or the nav itself)
      const focusables = getFocusableInNav();
      if (focusables.length) focusables[0].focus();
      else {
        nav.setAttribute('tabindex', '-1');
        nav.focus();
      }

      // ESC handler to close
      escHandler = function (ev) {
        if (ev.key === 'Escape' || ev.key === 'Esc') {
          closeNav();
        }
      };
      document.addEventListener('keydown', escHandler);
    }

    function closeNav() {
      document.body.classList.remove('nav-open');
      btn.setAttribute('aria-expanded', 'false');
      nav.setAttribute('aria-hidden', 'true');
      // return focus
      try {
        if (previouslyFocused && previouslyFocused.focus) previouslyFocused.focus();
      } catch (e) { /* ignore */ }
      if (escHandler) {
        document.removeEventListener('keydown', escHandler);
        escHandler = null;
      }
    }

    // click handler toggles
    btn.addEventListener('click', function (ev) {
      ev.stopPropagation();
      const isOpen = document.body.classList.toggle('nav-open');
      if (isOpen) {
        btn.setAttribute('aria-expanded', 'true');
        nav.setAttribute('aria-hidden', 'false');
        // focus first link
        const f = getFocusableInNav();
        if (f.length) f[0].focus();
        // add ESC listener
        escHandler = function (ev2) {
          if (ev2.key === 'Escape' || ev2.key === 'Esc') closeNav();
        };
        document.addEventListener('keydown', escHandler);
      } else {
        btn.setAttribute('aria-expanded', 'false');
        nav.setAttribute('aria-hidden', 'true');
        if (escHandler) {
          document.removeEventListener('keydown', escHandler);
          escHandler = null;
        }
      }
    });

    // close nav when clicking outside on mobile
    document.addEventListener('click', function (e) {
      if (!document.body.classList.contains('nav-open')) return;
      const target = e.target;
      if (target.closest('.main-nav') || target.closest('.hamburger')) return;
      // clicked outside
      closeNav();
    });

    // close nav when a link inside nav is activated (mobile-friendly)
    nav.addEventListener('click', function (e) {
      const a = e.target.closest('a[href]');
      if (!a) return;
      // close the nav after navigation
      closeNav();
    });

    // ensure keyboard activation (space/enter handled by default for button)
    // Make sure nav is marked hidden by default on mobile-capable devices
    if (!nav.hasAttribute('aria-hidden')) nav.setAttribute('aria-hidden', 'true');
  }
  // === end hamburger ===

  // close mobile nav when resizing to wide screens and ensure hamburger presence toggles
  function watchResizeForNav() {
    let lastWidth = window.innerWidth;
    window.addEventListener('resize', function () {
      const w = window.innerWidth;
      // synchronize hamburger presence/state on resize
      insertHamburgerToggle();

      if (w > 520 && lastWidth <= 520) {
        // moving to desktop: ensure nav is visible (remove mobile-open class)
        document.body.classList.remove('nav-open');
        const btn = document.querySelector('.hamburger');
        if (btn) btn.setAttribute('aria-expanded', 'false');
        const nav = document.querySelector('.main-nav');
        if (nav) nav.setAttribute('aria-hidden', 'false');
      }
      lastWidth = w;
    });
  }

  window.addEventListener('DOMContentLoaded', function () {
    adjustHeaderSpacing();
    handleInitialHash();
    attachInternalLinkHandler();

    // insert social icons and mobile hamburger after DOM ready
    try {
      insertHeaderSocialLinks();
      // Ensure hamburger is only created on mobile, and kept in sync on resize
      insertHamburgerToggle();
      watchResizeForNav();
    } catch (e) {
      console.debug('header insertions failed', e);
    }
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

  // Default cover image path (relative to baseAssets)
  const DEFAULT_COVER_PATH = baseAssets + 'images/default-cover.svg';

  function thumbOrPlaceholder(url, w = 200, h = 200) {
    // If a URL is provided, use it; otherwise use the repository default cover image.
    if (url) return url;
    return DEFAULT_COVER_PATH;
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
    try {
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        let id = null;
        if (url.includes('youtu.be/')) id = url.split('youtu.be/')[1].split(/[?&]/)[0];
        if (url.includes('v=')) {
          const q = url.split('?')[1] || '';
          id = new URLSearchParams(q).get('v') || id;
        }
        if (!id) return `<a href="${url}" target="_blank">${escapeHtml(url)}</a>`;
        const embed = `https://www.youtube.com/embed/${id}`;
        return `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;"><iframe src="${embed}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe></div>`;
      }
    } catch (e) {
      console.debug('embedVideoHtml: youtube extraction failed', e, url);
    }

    // NicoNico - try to extract id and embed
    try {
      const nicoMatch = url.match(/(?:nicovideo\.jp\/watch\/|nico\.ms\/)([a-z0-9]+(?:[0-9]*))/i);
      if (nicoMatch && nicoMatch[1]) {
        const nid = nicoMatch[1];
        const embed = `https://embed.nicovideo.jp/watch/${nid}`;
        return `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;"><iframe src="${embed}" frameborder="0" scrolling="no" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%;"></iframe></div>`;
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
        // Title links to the topic individual page, and link text changed to Topic一覧へ (link to topics list page)
        const titleHref = `topic.html?id=${encodeURIComponent(latest.id)}`;
        html = `<h2 class="kicker"><a href="${titleHref}">${escapeHtml(latest.title)}</a></h2>
                <div class="meta-small">${latest.date || ''}</div>
                <p class="preview">${escapeHtml(truncate(latest.content || '', 140))}</p>
                <p><a class="more" href="topics.html">Topic一覧へ</a></p>`;
      } else if (kind === 'music') {
        // Title links to the music individual page, and link text changed to Music一覧へ (link to music list page)
        const titleHref = (linkPrefix ? linkPrefix : 'track.html?id=') + encodeURIComponent(latest.id);
        html = `<h2 class="kicker"><a href="${titleHref}">${escapeHtml(latest.title)}</a></h2>
                <div class="meta-small">リリース: ${latest.date || ''}</div>
                ${latest.audio ? `<audio controls src="${latest.audio}"></audio>` : `<p class="preview">${escapeHtml(truncate(latest.note||'',120))}</p>`}
                <p><a class="more" href="music.html">Music一覧へ</a></p>`;
      } else if (kind === 'movies') {
        // Title links to the video url if available, otherwise to movie page
        const titleHref = latest.video || latest.url || `movie.html?id=${encodeURIComponent(latest.id)}`;
        const titleLink = `<a href="${titleHref}" target="_blank" rel="noopener">${escapeHtml(latest.title)}</a>`;
        html = `<h2 class="kicker">${titleLink}</h2>
                <div class="meta-small">公開: ${latest.date || ''}</div>
                ${latest.video ? embedVideoHtml(latest.video) : `<p class="preview">${escapeHtml(truncate(latest.description||'',120))}</p>`}
                <p><a class="more" href="movie.html">動画一覧へ</a></p>`;
      } else if (kind === 'discography') {
        html = `
          <div style="float:left;margin-right:12px;text-align:center;">
            <img src="${thumbOrPlaceholder(latest.cover,120,120)}" alt="" class="thumb" style="display:block;margin-bottom:8px">
            <div><a href="discography.html">Discography一覧へ</a></div>
          </div>
          <div style="overflow:hidden;">
            <h2 class="kicker"><a href="album.html?id=${encodeURIComponent(latest.id)}">${escapeHtml(latest.title)}</a></h2>
            <div class="meta-small">参加アーティスト: ${escapeHtml((latest.artists||[]).join(', '))}</div>
            <p class="preview">${escapeHtml(latest.description||'（説明未設定）')}</p>
          </div>
          <div style="clear:both"></div>`;
      } else if (kind === 'live') {
        // Live latest: Title links to live-event page
        const titleHref = `live-event.html?id=${encodeURIComponent(latest.id)}`;
        html = `<h2 class="kicker"><a href="${titleHref}">${escapeHtml(latest.title)}</a></h2>
                <div class="meta-small">${latest.date || ''} ・ ${escapeHtml(latest.venue||'')}</div>
                <p class="preview">${escapeHtml(truncate(latest.note||'',140))}</p>
                <p><a class="more" href="live.html">Live一覧へ</a></p>`;
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
            <div class="preview">${escapeHtml(truncate(t.content || '', 20))}</div>
          </div>
        </div>
      `).join('');
    } catch (e) { console.error('renderTopicsList error', e); }
  }

  async function renderTopicPage(containerSelector) {
    try {
      const id = qParam('id');
      const container = document.querySelector(containerSelector);
      if (!container) return;
      if (!id) { container.innerHTML = '<p>idが指定されていません。</p>'; return; }
      const data = await fetchJSON('topics');
      const items = data.items || data;
      const item = items.find(x => x.id === id);
      if (!item) { container.innerHTML = '<p>記事が見つかりません。</p>'; return; }
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
      // Load music and discography concurrently
      const [musicData, discographyData] = await Promise.all([
        fetchJSON('music'),
        fetchJSON('discography').catch(() => ({ items: [] }))
      ]);

      const items = sortByDateDesc(musicData.items || musicData);
      const discItems = Array.isArray(discographyData.items) ? discographyData.items : (Array.isArray(discographyData) ? discographyData : []);

      // Build mapping: musicId -> [albums]
      const albumsByMusicId = new Map();
      for (const album of discItems) {
        if (!album || !Array.isArray(album.tracks)) continue;
        for (const t of album.tracks) {
          if (!t) continue;
          let mid = null;
          if (typeof t === 'string') mid = t;
          else if (t.musicID) mid = t.musicID;
          else if (t.id) mid = t.id;
          else if (t.track) mid = t.track;
          if (!mid) continue;
          mid = String(mid);
          const arr = albumsByMusicId.get(mid) || [];
          arr.push(album);
          albumsByMusicId.set(mid, arr);
        }
      }

      const container = document.querySelector(containerSelector);
      if (!container) return;

      container.innerHTML = items.map(m => {
        // Internal albums (from discography) that include this music id
        const internalAlbums = albumsByMusicId.get(m.id) || [];

        // Build HTML for internal albums (links to album.html?id=...)
        let internalHtml = '';
        if (internalAlbums.length > 0) {
          const links = internalAlbums.map(a => {
            const aid = a.id ? encodeURIComponent(a.id) : '';
            const text = escapeHtml(a.title || a.id || '（無題のアルバム）');
            const href = aid ? `album.html?id=${aid}` : 'discography.html';
            return `<a href="${href}">${text}</a>`;
          }).join(' ・ ');
          internalHtml = `<div class="meta-small">収録アルバム: ${links}</div>`;
        }

        // External albums from music.json -> albums array
        let externalHtml = '';
        if (Array.isArray(m.albums) && m.albums.length > 0) {
          const parts = m.albums.map(a => {
            const s = String(a);
            // markdown-style link [title](url)
            const md = s.match(/^\s*\[([^\]]+)\]\(([^)]+)\)\s*$/);
            if (md) {
              const title = escapeHtml(md[1].trim());
              const url = md[2].trim();
              return `<a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>`;
            }
            return escapeHtml(s);
          });
          externalHtml = `<div class="meta-small">収録アルバム (外部): ${parts.join(' ・ ')}</div>`;
        }

        // existing UI (cover, title, meta, audio/note)
        const coverHtml = `<img src="${thumbOrPlaceholder(m.cover,96,96)}" alt="" class="thumb">`;
        const titleHref = `track.html?id=${encodeURIComponent(m.id)}`;
        const dateAndDuration = `リリース: ${m.date || ''} ・ ${escapeHtml(m.duration || '')}`;

        const audioOrNote = m.audio ? `<audio controls src="${m.audio}"></audio>` : `<p class="preview">${escapeHtml(truncate(m.note || '', 20) || '（再生無し）')}</p>`;

        return `
        <div class="item">
          ${coverHtml}
          <div>
            <div class="kicker"><a href="${titleHref}">${escapeHtml(m.title)}</a></div>
            <div class="meta-small">${dateAndDuration}</div>
            ${internalHtml}
            ${externalHtml}
            <div>${audioOrNote}</div>
          </div>
        </div>
      `;
      }).join('');
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

      // --- NEW: build internal/external album lists for the track page ---
      // Internal: find albums in discography that include this music id
      const discographyData = await fetchJSON('discography').catch(()=>({items:[]}));
      const discItems = Array.isArray(discographyData.items) ? discographyData.items : (Array.isArray(discographyData) ? discographyData : []);
      const internalAlbums = (discItems || []).filter(album => {
        if (!album || !Array.isArray(album.tracks)) return false;
        return album.tracks.some(t => {
          if (!t) return false;
          if (typeof t === 'string') return String(t) === String(item.id);
          if (typeof t === 'object') {
            const keys = ['musicID','musicId','music_id','id','track','track_id'];
            for (const k of keys) {
              if (Object.prototype.hasOwnProperty.call(t, k) && t[k] && String(t[k]) === String(item.id)) return true;
            }
          }
          return false;
        });
      });

      let internalHtml = '';
      if (internalAlbums.length > 0) {
        const links = internalAlbums.map(a => {
          const aid = a.id ? encodeURIComponent(a.id) : '';
          const text = escapeHtml(a.title || a.id || '（無題のアルバム）');
          const href = aid ? `album.html?id=${aid}` : 'discography.html';
          return `<a href="${href}">${text}</a>`;
        }).join(' ・ ');
        internalHtml = `<div class="meta-small">収録アルバム: ${links}</div>`;
      }

      // External albums: from item.albums (music.json)
      let externalHtml = '';
      if (Array.isArray(item.albums) && item.albums.length > 0) {
        const parts = item.albums.map(a => {
          const s = String(a);
          const md = s.match(/^\s*\[([^\]]+)\]\(([^)]+)\)\s*$/);
          if (md) {
            const title = escapeHtml(md[1].trim());
            const url = md[2].trim();
            return `<a href="${url}" target="_blank" rel="noopener noreferrer">${title}</a>`;
          }
          return escapeHtml(s);
        });
        externalHtml = `<div class="meta-small">収録アルバム (外部): ${parts.join(' ・ ')}</div>`;
      }
      // --- END album lists ---

      // render page with lyrics, MV links, and album info
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

          ${internalHtml ? `<section><h3>収録アルバム</h3>${internalHtml}</section>` : ''}
          ${externalHtml ? `<section><h3>収録アルバム (外部)</h3>${externalHtml}</section>` : ''}

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
                <div style="margin-top:.5rem">${m.video ? embedVideoHtml(m.video) : '<p class="preview">リンクのみ</p>'}</div>
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
            ${item.video ? embedVideoHtml(item.video) : `<p class="preview">${escapeHtml(item.description||'')}</p>`}
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
      // Render cards (container expected to be #discography-list or similar);
      // CSS will enforce 2-column max layout.
      container.innerHTML = items.map(a => `
        <article class="card">
          <div style="display:flex;gap:1rem;align-items:center;">
            <img src="${thumbOrPlaceholder(a.cover,140,140)}" alt="" class="thumb">
            <div>
              <h3><a href="album.html?id=${a.id}">${escapeHtml(a.title)}</a></h3>
              <div class="meta-small">参加アーティスト: ${escapeHtml((a.artists||[]).join(', ') || '未設定')}</div>
              <div class="meta-small">トラック数: ${a.tracks ? a.tracks.length : (a.track_count || '不明')}</div>
              <p class="preview">${escapeHtml(truncate(a.description || '', 20))}</p>
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

      // Set body flag so CSS can target album page reliably (clear previous)
      try {
        document.body.removeAttribute('data-album-id');
        document.body.classList.remove('album-page');
        if (album && album.id) {
          document.body.setAttribute('data-album-id', album.id);
          document.body.classList.add('album-page');
        }
      } catch (e) {
        console.debug('renderAlbumPage: could not set body attributes', e);
      }

      const musicData = await fetchJSON('music').catch(()=>({items:[]}));
      const tracks = album.tracks || [];
      const trackHtml = tracks.map(t => {
        // Prefer new field musicID on track entries but handle many formats
        let musicRefId = null;
        if (!t) return '';
        if (typeof t === 'string') {
          musicRefId = t;
        } else if (typeof t === 'object') {
          const keys = ['musicID','musicId','music_id','id','track','track_id'];
          for (const k of keys) {
            if (Object.prototype.hasOwnProperty.call(t, k) && t[k]) {
              musicRefId = String(t[k]);
              break;
            }
          }
        }

        const trackNo = (t && t.track_no) ? t.track_no : '';
        if (musicRefId) {
          const trackRef = (musicData.items || []).find(m => m.id === musicRefId || (m.id && String(m.id).toLowerCase() === String(musicRefId).toLowerCase()));
          if (trackRef) {
            // IMPORTANT: prefer album-provided 'author' on the track entry.
            // If author is not provided, do NOT fall back to other credit fields — show nothing.
            let composerText = '';
            if (t && typeof t === 'object' && t.author) {
              composerText = t.author;
            }

            return `<li>${escapeHtml(trackNo)}. <a href="track.html?id=${encodeURIComponent(trackRef.id)}">${escapeHtml(trackRef.title)}</a>${composerText ? ' — ' + escapeHtml(composerText) : ''}</li>`;
          }
        }

        // fallback: show provided title and prefer 'author' field on album track entries only
        const titleText = (typeof t === 'object' && t.title) ? t.title : ((typeof t === 'string') ? '' : '');
        const authorText = (typeof t === 'object' && t.author) ? t.author : '';
        return `<li>${escapeHtml(trackNo)}. ${escapeHtml(titleText)}${authorText ? ' — ' + escapeHtml(authorText) : ''}</li>`;
      }).join('');

      container.innerHTML = `
        <article class="card">
          <div style="display:flex;gap:1rem;align-items:flex-start;">
            <img src="${thumbOrPlaceholder(album.cover,200,200)}" alt="${escapeHtml(album.title || '')}" class="thumb">
            <div>
              <h2 id="album-${escapeHtml(album.id)}">${escapeHtml(album.title)}</h2>
              <div class="meta-small">参加アーティスト: ${escapeHtml((album.artists||[]).join(', ') || '未設定')}</div>
              <div class="meta-small">リリース: ${album.date || ''}</div>
              <div class="content">${nl2br(escapeHtml(album.description || ''))}</div>
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
            <div class="preview">${escapeHtml(truncate(l.note||'', 20))}</div>
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
          return `<li>${idx+1}. <a href="track.html?id=${encodeURIComponent(found.id)}">${escapeHtml(found.title)}</a></li>`;
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