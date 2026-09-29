# 换成你们自己的

| 想换什么 | 在哪改 | 影响哪里 |
|---|---|---|
| TA 的名字 | `web/config.js` 的 `TA_NAME`；服务器环境变量 `ONE_EARBUD_TA_NAME` | 横幅「TA played / added this」、歌词页「TA：……」、按钮「这首给 TA」「选几句给 TA 看」、卡片「played by TA」、播放列表里的留言 |
| YOU 的称呼 | `web/config.js` 的 `YOU_NAME`；服务器 `ONE_EARBUD_YOU_NAME` | 卡片「shared by YOU」、TA 每轮看到的「[YOU 正在听：…]」 |
| TA 的图标 | `web/config.js` 的 `TA_ICON`（24×24 线条 SVG，用 currentColor） | 听歌栏标题前、播放列表里 TA 排的歌、歌词页那一行 |
| TA 的颜色 | `web/styles/music.css` 顶部 `--ta-color`（字和图标）、`--ta-soft`（底色） | TA 放的歌时的听歌栏、歌词页那一行 |
| 整体字体和配色 | `music.css` 顶部那组变量（`--ink` `--paper` `--serif-cn` …）；宿主有同名变量会优先用宿主的 | 所有控件 |
| 接口前缀 / 鉴权 | `web/lib/api.js` 的 `API_BASE`、`authHeaders()` | 前端所有请求 |
| 工具名 | `server/agent/tool-contract.js` 的 `TA_MUSIC_CAPABILITY_ID` | TA 看到的工具名 |
| 每轮注入的标签 | `server/agent/now-playing-prompt.js` 的 `BLOCK_TAG` | TA 上下文里那一块的标题 |

改完前端文件，记得给页面里引用它们的 URL 换版本号（`?v=...`），不然手机会继续用旧缓存。
