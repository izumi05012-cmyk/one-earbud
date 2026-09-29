// 播放器模拟测试：把 web/music/player.js 放进一个假的浏览器（假 audio、假后端），一首一首「放完」，
// 检查顺序/随机/单曲循环、预取、加歌、慢网、放不了的歌等场景。用法：node server/test/player-sim.mjs
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { fileURLToPath, pathToFileURL } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'one-earbud-sim-'));
const src = fs.readFileSync(path.join(here, '..', '..', 'web', 'music', 'player.js'), 'utf8')
  .replace(/from '\.\.\/lib\/api\.js'/, "from './api.mjs'");
fs.writeFileSync(path.join(dir, 'player.mjs'), src);
fs.copyFileSync(path.join(here, 'player-sim.api.mjs'), path.join(dir, 'api.mjs'));
fs.copyFileSync(path.join(here, 'player-sim.scenarios.mjs'), path.join(dir, 'run.mjs'));
await import(pathToFileURL(path.join(dir, 'run.mjs')).href);
