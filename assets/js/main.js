// main.js - Header (Jekyll _includes) を使う前提のクライアントロジック
// dataPath は layout で設定される window.SITE_ASSET_PATH を利用します。
const main = (function () {
  const baseAssets = (window && window.SITE_ASSET_PATH) ? window.SITE_ASSET_PATH : 'assets/';
  const dataPath = baseAssets + 'data/';

  // ---- ヘッダー固定に伴う body の padding-top を設定（Version1 相当） ----
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

  // ハッシュや内部リンクで移動するときにヘッダー分を補正してスクロールする
  function offsetScrollToElement(el, instant = false) {
    if (!el) return;
    const extraOffset = 8; // small extra
    const headerH = currentHeaderHeight || parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 0;
    const rect = el.getBoundingClientRect();
    const targetY = window.scrollY + rect.top - headerH - extraOffset;
    if (instant) {
      window.scrollTo(0, targetY);
    } else {
      window.scrollTo({ top: targetY, behavior: 'smooth' });
    }
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
        }
      }
    }, { passive: false });
  }

  function handleInitialHash() {
    if (location.hash) {
      const id = decodeURIComponent(location.hash.slice(1));
      const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
      if (el) {
        setTimeout(() => offsetScrollToElement(el, true), 50);
      }
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
    if (!res.ok) throw new Error('Failed to load ' + url);
    return res.json();
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
      console.error(e);
    }
  }

  async function renderTopicsList(containerSelector) {
    try {
      const data = await fetchJSON('topics');
      const items = sortByDateDesc(data.items || data);
      const container = document.querySelector(containerSelector);
      container.innerHTML = items.map(t => `
        <div class="item">
          <div class="meta">${t.date || ''}</div>
          <div>
            <div class="kicker"><a href="topic.html?id=${t.id}">${escapeHtml(t.title)}</a></div>
            <div>${escapeHtml(truncate(t.content || '', 220))}</div>
          </div>
        </div>
      `).join('');
    } catch (e) {
      console.error(e);
    }
  }

  async function renderTopicPage(containerSelector) {
    const id = qParam('id');
    if (!id) { document.querySelector(containerSelector).innerHTML = '<p>idが指定されていません。</p>'; return; }
    try {
      const data = await fetchJSON('topics');
      const items = data.items || data;
      const item = items.find(x => x.id === id);
      const container = document.querySelector(containerSelector);
      if (!item) { container.innerHTML = '<p>記事が見つかりません。</p>'; return; }
      container.innerHTML = `
        <article class="card">
          <h2 id="topic-${escapeHtml(item.id)}">${escapeHtml(item.title)}</h2>
          <div class="meta-small">${item.date || ''}</div>
          <div class="content">${nl2br(escapeHtml(item.content || ''))}</div>
        </article>
      `;
    } catch (e) { console.error(e); }
  }

  async function renderMusicList(containerSelector) {
    try {
      const data = await fetchJSON('music');
      const items = sortByDateDesc(data.items || data);
      const container = document.querySelector(containerSelector);
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
    } catch (e) { console.error(e); }
  }

  async function renderTrackPage(containerSelector) {
    const id = qParam('id');
    if (!id) { document.querySelector(containerSelector).innerHTML = '<p>idが指定されていません。</p>'; return; }
    try {
      const data = await fetchJSON('music');
      const items = data.items || data;
      const item = items.find(x => x.id === id);
      const container = document.querySelector(containerSelector);
      if (!item) { container.innerHTML = '<p>曲が見つかりません。</p>'; return; }

      const disc = await fetchJSON('discography').catch(()=>({items:[]}));

      const albumHtml = (item.albums||[]).map(albumId => {
        const a = (disc.items || disc).find(x => x.id === albumId);
        if (a) {
          return `<li><a href="album.html?id=${a.id}"><img src="${thumbOrPlaceholder(a.cover,64,64)}" alt="" style="height:48px;width:48px;object-fit:cover;margin-right:8px;vertical-align:middle;border-radius:6px;"> ${escapeHtml(a.title)}</a></li>`;
        } else {
          return `<li>${escapeHtml(albumId)} (アルバム情報未設定)</li>`;
        }
      }).join('');

      container.innerHTML = `
        <article class="card">
          <h2 id="track-${escapeHtml(item.id)}">${escapeHtml(item.title)}</h2>
          <div class="meta-small">リリース: ${item.date || ''} ・ ${escapeHtml(item.duration||'')}</div>
          <div style="margin: .8rem 0;">
            ${item.audio ? `<audio controls src="${item.audio}"></audio>` : `<p class="meta-small">この曲の音源は用意されていません。</p>`}
          </div>
          <section>
            <h3>Credits</h3>
            <p class="meta-small">${escapeHtml((item.credits||[]).join(', ') || '未設定')}</p>
          </section>
          <section>
            <h3>Lyrics</h3>
            <div class="content">${nl2br(escapeHtml(item.lyrics || '歌詞は未設定です。'))}</div>
          </section>
          <section>
            <h3>収録アルバム</h3>
            <ul>${albumHtml || '<li>収録アルバムはありません。</li>'}</ul>
          </section>
        </article>
      `;
    } catch (e) { console.error(e); }
  }

  async function renderMovieList(containerSelector) {
    try {
      const data = await fetchJSON('movies');
      const items = sortByDateDesc(data.items || data);
      const container = document.querySelector(containerSelector);
      container.innerHTML = items.map(m => `
        <div class="item">
          <div class="meta">${m.date || ''}</div>
          <div>
            <div class="kicker">${escapeHtml(m.title)}</div>
            <div class="meta-small">${escapeHtml(m.service || '')} ${escapeHtml(m.uploader||'')}</div>
            <div style="margin-top:.5rem">${m.video ? embedVideoHtml(m.video) : '<p>リンクのみ</p>'}</div>
            <p><a href="${m.url || '#'}" target="_blank" rel="noopener">動画ページへ</a></p>
          </div>
        </div>
      `).join('');
    } catch (e) { console.error(e); }
  }

  function embedVideoHtml(url) {
    if (!url) return '';
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      let id = null;
      if (url.includes('youtu.be/')) id = url.split('youtu.be/')[1].split(/[?&]/)[0];
      if (url.includes('v=')) id = new URLSearchParams(url.split('?')[1]).get('v');
      if (!id) return `<a href="${url}" target="_blank">${escapeHtml(url)}</a>`;
      const embed = `https://www.youtube.com/embed/${id}`;
      return `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;"><iframe src="${embed}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen style="position:absolute;top:0;left:0;width:100%;height:100%"></iframe></div>`;
    }
    if (url.includes('nicovideo.jp') || url.includes('nico.ms')) {
      return `<p><a href="${url}" target="_blank" rel="noopener">ニコニコ動画で見る</a></p>`;
    }
    return `<p><a href="${url}" target="_blank" rel="noopener">${escapeHtml(url)}</a></p>`;
  }

  async function renderDiscography(containerSelector) {
    try {
      const data = await fetchJSON('discography');
      const items = sortByDateDesc(data.items || data);
      const container = document.querySelector(containerSelector);
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
    } catch (e) { console.error(e); }
  }

  async function renderAlbumPage(containerSelector) {
    const id = qParam('id');
    if (!id) { document.querySelector(containerSelector).innerHTML = '<p>id が指定されていません。</p>'; return; }
    try {
      const data = await fetchJSON('discography');
      const items = data.items || data;
      const album = items.find(x => x.id === id);
      const container = document.querySelector(containerSelector);
      if (!album) { container.innerHTML = '<p>アルバムが見つかりません。</p>'; return; }

      const musicData = await fetchJSON('music').catch(()=>({items:[]}));
      const trackHtml = (album.tracks || []).map(t => {
        const trackRef = (musicData.items||[]).find(m => m.id === t.id || m.title === t.title);
        if (trackRef) {
          return `<li>${escapeHtml(t.track_no || '')}. <a href="track.html?id=${trackRef.id}">${escapeHtml(trackRef.title)}</a> — ${escapeHtml(trackRef.composer || trackRef.author || '')}</li>`;
        } else {
          return `<li>${escapeHtml(t.track_no || '')}. ${escapeHtml(t.title)} — ${escapeHtml(t.author || '')} ${t.id ? `(id: ${escapeHtml(t.id)})` : ''}</li>`;
        }
      }).join('');

      container.innerHTML = `
        <article class="card">
          <div style="display:flex;gap:1rem;align-items:flex-start;">
            <img src="${thumbOrPlaceholder(album.cover,200,200)}" alt="" class="thumb" style="width:180px;height:180px">
            <div>
              <h2 id="album-${escapeHtml(album.id)}">${escapeHtml(album.title)}</h2>
              <div class="meta-small">参加: ${escapeHtml((album.artists||[]).join(', ') || '未設定')}</div>
              <div class="meta-small">リリース: ${album.date || ''}</div>
              <p>${escapeHtml(album.description || '')}</p>
            </div>
          </div>

          <section style="margin-top:1rem">
            <h3>収録曲</h3>
            <ol>
              ${trackHtml || '<li>収録曲データがありません</li>'}
            </ol>
          </section>
        </article>
      `;
    } catch (e) { console.error(e); }
  }

  async function renderLiveList(containerSelector) {
    try {
      const data = await fetchJSON('live');
      const items = sortByDateDesc(data.items || data);
      const container = document.querySelector(containerSelector);
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
    } catch (e) { console.error(e); }
  }

  async function renderLivePage(containerSelector) {
    const id = qParam('id');
    if (!id) { document.querySelector(containerSelector).innerHTML = '<p>idが指定されていません。</p>'; return; }
    try {
      const data = await fetchJSON('live');
      const item = (data.items || data).find(x => x.id === id);
      const container = document.querySelector(containerSelector);
      if (!item) { container.innerHTML = '<p>ライブ情報が見つかりません。</p>'; return; }

      const musicData = await fetchJSON('music').catch(()=>({items:[]}));
      const setlistHtml = (item.setlist || []).map((s, idx) => {
        const found = (musicData.items||[]).find(m => m.id === s.id || m.title === s.title);
        if (found) {
          return `<li>${idx+1}. <a href="tfrack.html?id=${found.id}">${escapeHtml(found.title)}</a></li>`;
        } else {
          return `<li>${idx+1}. ${escapeHtml(s.title || s)}</li>`;
        }
      }).join('');

      container.innerHTML = `
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
            <ol>${setlistHtml || '<li>セットリスト情報がありません</li>'}</ol>
          </section>
        </article>
      `;
    } catch (e) { console.error(e); }
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
    renderDiscography,
    renderAlbumPage,
    renderLiveList,
    renderLivePage
  };
})();

// ← ここを追加：window オブジェクトにも参照を設定しておく
window.main = main;