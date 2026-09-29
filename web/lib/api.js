// 分你一只耳机 · 前端跟自己后端说话的唯一出口。
// API_BASE 要和后端 mountMusicRoutes 挂的前缀一致；鉴权头按你们宿主的方式改 authHeaders()。
export const API_BASE = (typeof window !== 'undefined' && window.ONE_EARBUD_API_BASE) || '/api/music';

function authHeaders() {
  const token = (typeof localStorage !== 'undefined' && localStorage.getItem('one-earbud.token')) || '';
  return token ? { Authorization: 'Bearer ' + token } : {};
}

export class ApiError extends Error {
  constructor(message, { status = 0, code = '' } = {}) { super(message || 'Request failed'); this.status = status; this.code = code; }
}

export async function apiRequest(path, opts = {}) {
  const init = { method: opts.method || 'GET', headers: Object.assign({ Accept: 'application/json' }, authHeaders()) };
  if (opts.body !== undefined && init.method !== 'GET') { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opts.body); }
  const res = await fetch(path, init);
  let body = null; try { body = await res.json(); } catch (_) {}
  if (!res.ok || (body && body.ok === false)) {
    // 后端错误是 { ok:false, error:代码, message:给人看的话 }：message 给人，code 给程序判断
    throw new ApiError((body && body.message) || (body && body.error) || ('Request failed (' + res.status + ')'), { status: res.status, code: (body && body.error) || '' });
  }
  return body;
}
