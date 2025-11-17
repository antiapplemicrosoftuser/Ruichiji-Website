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

    // --- 追加: body に個別アルバムフラグを付与（CSS のターゲットにするため） ---
    try {
      // set data-album-id and class to target via CSS
      if (album && album.id) {
        document.body.setAttribute('data-album-id', album.id);
        document.body.classList.add('album-page');
      }
    } catch (e) {
      // ignore if environment doesn't allow DOM changes
      console.debug('renderAlbumPage: unable to set body dataset/class', e);
    }
    // --- ここまで追加 ---

    const musicData = await fetchJSON('music').catch(()=>({items:[]}));
    const trackHtml = (album.tracks || []).map(t => {
      // Prefer new field musicID on track entries
      const musicRefId = (t && t.musicID) ? t.musicID : (t && t.id) ? t.id : null;
      const trackRef = musicRefId ? (musicData.items||[]).find(m => m.id === musicRefId) : null;
      if (trackRef) {
        // 手動採番を残し、リンクは track.html?id=...
        return `<li>${escapeHtml(t.track_no || '')}. <a href="track.html?id=${encodeURIComponent(trackRef.id)}">${escapeHtml(trackRef.title)}</a> — ${escapeHtml(trackRef.composer || trackRef.author || '')}</li>`;
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