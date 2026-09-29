import express from "express";
import { randomUUID } from "crypto";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const MUSIC_BASE = process.env.MUSIC_BASE || "https://one-earbud.onrender.com/api/music";
const MUSIC_TOKEN = process.env.MUSIC_TOKEN || "myearbud123";
const FETCH_TIMEOUT_MS = 15000;

async function musicFetch(path, options = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const r = await fetch(`${MUSIC_BASE}${path}`, {
      ...options,
      headers: {
        "Authorization": MUSIC_TOKEN,
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {}),
      },
      signal: ctrl.signal,
    });
    const text = await r.text();
    let data; try { data = JSON.parse(text); } catch { data = { raw: text.slice(0, 500) }; }
    if (!r.ok) throw new Error(data.message || data.error || `HTTP ${r.status}`);
    return data;
  } finally { clearTimeout(timer); }
}

function createServer() {
  const server = new Server(
    { name: "image-render", version: "1.6.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "render_image",
        description: "加载网络表情包图片并在对话中显示",
        inputSchema: {
          type: "object",
          properties: {
            imageUrl: { type: "string" },
            width: { type: "number" },
            borderRadius: { type: "number" }
          },
          required: ["imageUrl"]
        }
      },
      {
        name: "music_tool",
        description: "和用户一起听网易云。actions: now_playing(看用户在听啥,无参数)、search(搜歌,需 query)、lyrics(读歌词,需 songId)、queue(看列表)、play_next(把歌排到当前这首后面,需 songId/name/artist)、play_now(直接给用户放,需 songId/name/artist)、queue_add(加到列表最后,需 songId/name/artist)。可选 note 是给用户的一句话≤300字。",
        inputSchema: {
          type: "object",
          properties: {
            action: {
              type: "string",
              enum: ["now_playing", "search", "lyrics", "queue", "play_next", "play_now", "queue_add"]
            },
            songId: { type: "number" },
            query: { type: "string" },
            name: { type: "string", description: "歌曲名（排歌时用）" },
            artist: { type: "string", description: "歌手名（排歌时用）" },
            note: { type: "string" }
          },
          required: ["action"]
        }
      }
    ]
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const name = request.params.name;
    const args = request.params.arguments || {};

    if (name === "render_image") {
      const { imageUrl, width = 160, borderRadius = 12 } = args;
      try {
        const resp = await fetch(imageUrl);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const buf = Buffer.from(await resp.arrayBuffer());
        const mimeType = resp.headers.get("content-type") || "image/png";
        return { content: [{ type: "image", data: buf.toString("base64"), mimeType }] };
      } catch (e) {
        return { content: [{ type: "text", text: `图片加载失败: ${e.message}` }] };
      }
    }

    if (name === "music_tool") {
      try {
        const { action } = args;
        let result;
        if (action === "now_playing") result = await musicFetch("/now-playing");
        else if (action === "search") result = await musicFetch(`/search?q=${encodeURIComponent(args.query || "")}&limit=10`);
        else if (action === "lyrics") result = await musicFetch(`/song/${args.songId}`);
        else if (action === "queue") result = await musicFetch("/queue");
        else if (action === "play_next") result = await musicFetch("/queue/next", { method: "POST", body: JSON.stringify({ song: { id: String(args.songId), name: args.name || "", artist: args.artist || "" } }) });
        else if (action === "play_now") result = await musicFetch("/queue/now", { method: "POST", body: JSON.stringify({ song: { id: String(args.songId), name: args.name || "", artist: args.artist || "" } }) });
        else if (action === "queue_add") result = await musicFetch("/queue/append", { method: "POST", body: JSON.stringify({ songs: [{ id: String(args.songId), name: args.name || "", artist: args.artist || "" }] }) });
        else return { content: [{ type: "text", text: "unknown action: " + action }], isError: true };
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
      } catch (e) {
        return { content: [{ type: "text", text: `音乐接口错误: ${e.message}` }], isError: true };
      }
    }

    return { content: [{ type: "text", text: "unknown tool: " + name }], isError: true };
  });

  return server;
}

const app = express();
app.use(express.json({ limit: "2mb" }));
const sessions = new Map();

async function handleNewConnection(req, res) {
  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (sid) => {
      sessions.set(sid, { transport, server });
      console.log("new session:", sid, "| total:", sessions.size);
    },
  });
  await server.connect(transport);
  transport.onclose = () => {
    if (transport.sessionId) sessions.delete(transport.sessionId);
  };
  await transport.handleRequest(req, res, req.body);
}

app.post("/", async (req, res) => {
  try {
    const sessionId = req.headers["mcp-session-id"];
    const session = sessionId ? sessions.get(sessionId) : undefined;
    if (session) await session.transport.handleRequest(req, res, req.body);
    else await handleNewConnection(req, res);
  } catch (e) {
    console.error("POST error:", e);
    if (!res.headersSent) res.status(500).json({ jsonrpc: "2.0", error: { message: e.message } });
  }
});

app.get("/", (_req, res) => res.send("MCP v1.6"));
app.get("/health", (_req, res) => res.json({ ok: true, version: "1.6.0" }));

app.listen(process.env.PORT || 3000, "0.0.0.0", () => console.log("✅ MCP v1.6"));
