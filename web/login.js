// 分你一只耳机 · 授权页
import { apiRequest, API_BASE } from './lib/api.js';
import { escapeHtml } from './lib/escape.js';

const QR_POLL_MS = 2000;

async function svgDataUriToPng(dataUri, size = 480) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size; canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, 0, 0, size, size);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) { reject(e); }
    };
    img.onerror = reject;
    img.src = dataUri;
  });
}

export function mountMusicLogin({ host }) {
  const ctrl = new AbortController();
  const signal = ctrl.signal;
  let poll = 0, alive = true;
  const stop = () => { alive = false; ctrl.abort(); clearTimeout(poll); };

  async function render() {
    clearTimeout(poll);
    host.innerHTML = '<h1 class="oe-title">网易云登录</h1><p class="oe-sub">只用来听歌；登录态只存在你自己的服务器上</p><div data-body><p class="oe-help">读取中…</p></div>';
    const body = host.querySelector('[data-body]');
    let st; try { st = await apiRequest(API_BASE + '/status'); } catch (e) { body.innerHTML = '<p class="oe-help">' + escapeHtml(e.message || '读不到状态') + '</p>'; return; }
    if (!alive) return;
    if (st.connected) {
      const p = st.profile || {};
      body.innerHTML = '<section class="oe-card"><div class="oe-label">已连上网易云</div><div class="oe-value">' + escapeHtml(p.nickname || '') + (st.vip ? ' · 会员' : '') + '</div>'
        + '<p class="oe-help">回到聊天页，打开听歌入口就能搜歌、放歌。</p><button type="button" class="oe-btn" data-logout>退出登录</button></section>';
      body.querySelector('[data-logout]').addEventListener('click', async () => { if (!confirm('退出网易云登录？')) return; await apiRequest(API_BASE + '/logout', { method: 'POST' }).catch(() => {}); render(); });
      return;
    }
    body.innerHTML = '<section class="oe-card"><div class="oe-label">还没连上网易云</div><p class="oe-help">用网易云 App 扫一下码。二维码三分钟内有效；在同一台手机上：长按二维码存进相册，再在网易云 App 的扫一扫里选相册。</p>'
      + '<button type="button" class="oe-btn is-go" data-qr>生成二维码</button></section><div data-qr-box></div>';
    body.querySelector('[data-qr]').addEventListener('click', startQr);
  }

  async function startQr() {
    if (signal.aborted) return;
    const box = host.querySelector('[data-qr-box]');
    if (!box) return;
    box.innerHTML = '<p class="oe-help">生成中…</p>';
    let q;
    try { q = await apiRequest(API_BASE + '/login/qr', { method: 'POST', signal }); }
    catch (e) { if (signal.aborted) return; box.innerHTML = `<p class="oe-help">${escapeHtml(e.message || '生成失败')}</p>`; return; }
    if (signal.aborted) return;
    const raw = q.qrImage || q.qrimg || q.qrUrl || '';
    if (!raw) { box.innerHTML = '<p class="oe-help">后端没返回二维码图片</p>'; return; }
    box.innerHTML = `<section class="oe-card" style="text-align:center"><img alt="网易云登录二维码" style="width:260px;height:260px;border-radius:8px;background:#fff"><p class="oe-help" data-state>加载中…</p></section>`;
    const img = box.querySelector('img');
    const stateEl = box.querySelector('[data-state]');
    const isSvg = typeof raw === 'string' && (raw.startsWith('data:image/svg+xml') || raw.includes('<svg'));
    if (!isSvg) { img.src = raw; stateEl.textContent = '等你扫码'; }
    else {
      try { img.src = await svgDataUriToPng(raw); stateEl.textContent = '等你扫码'; }
      catch (e) { img.src = raw; stateEl.textContent = '等你扫码'; }
    }
    const tick = async () => {
      if (signal.aborted) return;
      try {
        const r = await apiRequest(API_BASE + '/login/qr/' + encodeURIComponent(q.key), { signal });
        if (signal.aborted) return;
        if (r.status === 'success') { render(); return; }
        if (r.status === 'expired') { stateEl.textContent = '过期了，再生成一张'; return; }
        stateEl.textContent = r.status === 'scanned' ? '扫到了，在 App 里点确认' : '等你扫码';
      } catch (e) { if (signal.aborted) return; stateEl.textContent = (e && e.message) || '出错了'; return; }
      setTimeout(tick, QR_POLL_MS);
    };
    setTimeout(tick, QR_POLL_MS);
  }
  render();
  return stop;
}
