'use strict';
// 分你一只耳机 · 最小接线示例：一个 express 服务，把授权页、前端和 /api/music 挂起来。
// 你已经有自己的宿主（聊天页、Agent 运行时）的话，照这个样子把三件事接进去就行：
//   1) mountMusicRoutes(router, authority) 挂到某个前缀下（默认 /api/music），外面包你自己的鉴权
//   2) 把 web/ 当静态文件发出去
//   3) 拼 TA 的 prompt 时接上 renderNowPlayingBlock(authority)；把 agent/tool-contract.js 注册成 TA 的工具
const path = require('path');
const express = require('express');
const { createMusicAuthority } = require('./music/authority');
const { mountMusicRoutes } = require('./music/routes');

const PORT = Number(process.env.PORT) || 8787;
const TOKEN = process.env.ONE_EARBUD_TOKEN || '';          // 访问口令：前端放在 localStorage 'one-earbud.token'
if (!TOKEN) console.warn('[one-earbud] 没设 ONE_EARBUD_TOKEN：任何人都能用你的网易云登录态，只建议本机试用');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '..', 'web')));

const router = express.Router(); // 挂在 /api 下
router.use((req, res, next) => {
  if (!TOKEN) return next();
  const got = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (got !== TOKEN) return res.status(401).json({ ok: false, error: 'UNAUTHORIZED', message: '口令不对' });
  next();
});
const authority = createMusicAuthority();
mountMusicRoutes(router, authority);
app.use('/api', router); // 路由里自带 /music 前缀，最终是 /api/music/*

app.listen(PORT, () => console.log('[one-earbud] http://localhost:' + PORT + '/login.html'));
module.exports = { app, authority };
