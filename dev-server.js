// dev-server.js — 本地联调：静态服务 studio/public + 模拟两个 Netlify Functions
// 用法：node dev-server.js  [端口默认 8090]
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.argv[2] || 8090);
const PUB = path.join(__dirname, "studio", "public");
const DATA = path.join(__dirname, ".dev-data");
fs.mkdirSync(DATA, { recursive: true });

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json; charset=utf-8",
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp",
  ".gif": "image/gif", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".task": "application/octet-stream", ".wasm": "application/wasm", ".glb": "model/gltf-binary",
  ".mp3": "audio/mpeg", ".bin": "application/octet-stream",
};

const UNDO_MS = 3 * 60 * 1000;
const INDEX_FILE = path.join(DATA, "index.json");
const TRASH = path.join(DATA, "trash");
const STATS_FILE = path.join(DATA, "stats.json");
fs.mkdirSync(TRASH, { recursive: true });

function readStats() {
  try { return JSON.parse(fs.readFileSync(STATS_FILE, "utf8")) || { total: 0, daily: {} }; }
  catch (e) { return { total: 0, daily: {} }; }
}
function bumpStats() {
  const today = new Date().toISOString().slice(0, 10);
  const rec = readStats();
  rec.total = (rec.total || 0) + 1;
  rec.daily = rec.daily || {};
  rec.daily[today] = (rec.daily[today] || 0) + 1;
  fs.writeFileSync(STATS_FILE, JSON.stringify(rec));
}

function readIndex() {
  try { return JSON.parse(fs.readFileSync(INDEX_FILE, "utf8")) || []; } catch (e) { return []; }
}
function writeIndex(list) { fs.writeFileSync(INDEX_FILE, JSON.stringify(list)); }
function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex").slice(0, 16);
}
function purgeExpired(index) {
  const now = Date.now();
  const expired = index.filter(it => it.del && now - it.del > UNDO_MS);
  if (!expired.length) return index;
  for (const it of expired) { try { fs.unlinkSync(path.join(TRASH, it.id + ".json")); } catch (e) {} }
  const keep = index.filter(it => !expired.some(e => e.id === it.id));
  writeIndex(keep);
  return keep;
}

function send(res, code, body, type) {
  res.writeHead(code, { "Content-Type": type || "text/plain; charset=utf-8" });
  res.end(body);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, "http://localhost:" + PORT);

  // 模拟 functions/create.js
  if (url.pathname === "/api/create" && req.method === "POST") {
    let chunks = [];
    let size = 0;
    req.on("data", (c) => { size += c.length; if (size > 12 * 1024 * 1024) req.destroy(); else chunks.push(c); });
    req.on("end", () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        // 留空不显示（blank）：与 functions/create.js 同逻辑
        const VALID_BLANK = ["title", "foot", "introZh", "introEn", "wishes"];
        const cb = body.custom && typeof body.custom === "object" ? body.custom : {};
        const blank = Array.isArray(cb.blank) ? [...new Set(cb.blank.map(String))].filter(k => VALID_BLANK.includes(k)) : [];
        const title = blank.includes("title") ? "" : String(body.title || "").slice(0, 60);
        const photos = Array.isArray(body.photos) ? body.photos.slice(0, 30) : [];
        if (!title && photos.length === 0) return send(res, 400, "title 或 photos 至少一项");
        const id = crypto.randomBytes(6).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "x").padEnd(10, "x").slice(0, 10);
        const ownerToken = crypto.randomBytes(16).toString("hex");
        const c = body.custom && typeof body.custom === "object" ? body.custom : {};
        const custom = {};
        if (!blank.includes("foot") && c.foot) custom.foot = String(c.foot).trim().slice(0, 40);
        if (!blank.includes("introZh") && c.introZh) custom.introZh = String(c.introZh).trim().slice(0, 30);
        if (!blank.includes("introEn") && c.introEn) custom.introEn = String(c.introEn).trim().slice(0, 40);
        if (!blank.includes("wishes") && Array.isArray(c.wishes)) custom.wishes = c.wishes.map(w => String(w).trim().slice(0, 80)).filter(Boolean).slice(0, 20);
        if (blank.length) custom.blank = blank;
        const rec = { title, photos, createdAt: Date.now(), ownerToken };
        if (Object.keys(custom).length) rec.custom = custom;
        fs.writeFileSync(path.join(DATA, id + ".json"), JSON.stringify(rec));
        const index = readIndex().filter(it => it.id !== id);
        index.unshift({
          id, title, photoCount: photos.length, createdAt: Date.now(),
          thumb: (photos[0] && photos[0].dataUrl) || "", oth: hashToken(ownerToken),
        });
        writeIndex(index.slice(0, 500));
        bumpStats();
        send(res, 200, JSON.stringify({ id, url: "/tree/?id=" + id, ownerToken }), "application/json; charset=utf-8");
      } catch (e) { send(res, 400, "bad json: " + e.message); }
    });
    return;
  }

  // 模拟 functions/create-b.js（璀璨树）
  if (url.pathname === "/api/create-b" && req.method === "POST") {
    let chunks = [];
    let size = 0;
    req.on("data", (c) => { size += c.length; if (size > 12 * 1024 * 1024) req.destroy(); else chunks.push(c); });
    req.on("end", () => {
      try {
        const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
        const title = String(body.title || "").slice(0, 60); // 题字默认空白
        const photos = Array.isArray(body.photos) ? body.photos.slice(0, 30) : [];
        if (photos.length === 0) return send(res, 400, "photos 至少一张");
        const id = crypto.randomBytes(6).toString("base64url").toLowerCase().replace(/[^a-z0-9]/g, "x").padEnd(10, "x").slice(0, 10);
        const ownerToken = crypto.randomBytes(16).toString("hex");
        const rec = { title, photos, createdAt: Date.now(), ownerToken, type: "b" };
        fs.writeFileSync(path.join(DATA, "b-" + id + ".json"), JSON.stringify(rec));
        const index = readIndex().filter(it => it.id !== id);
        index.unshift({
          id, title, photoCount: photos.length, createdAt: Date.now(),
          thumb: (photos[0] && photos[0].dataUrl) || "", oth: hashToken(ownerToken), type: "b",
        });
        writeIndex(index.slice(0, 500));
        bumpStats();
        send(res, 200, JSON.stringify({ id, url: "/b/?id=" + id, ownerToken }), "application/json; charset=utf-8");
      } catch (e) { send(res, 400, "bad json: " + e.message); }
    });
    return;
  }

  // 模拟 functions/my.js
  if (url.pathname === "/api/my") {
    const token = (req.headers["x-owner-token"] || url.searchParams.get("t") || "").trim();
    if (!/^[a-f0-9]{16,64}$/i.test(token)) return send(res, 404, JSON.stringify({ error: "not found" }), "application/json; charset=utf-8");
    const oth = hashToken(token);
    let index = purgeExpired(readIndex());

    if (req.method === "GET") {
      const mine = index.filter(it => it.oth === oth).map(it => ({
        id: it.id, title: it.title, photoCount: it.photoCount, createdAt: it.createdAt,
        thumb: it.thumb, deletedAt: it.del || null, canUndo: !!it.del && Date.now() - it.del < UNDO_MS,
      }));
      return send(res, 200, JSON.stringify({ count: mine.length, trees: mine }), "application/json; charset=utf-8");
    }

    if (req.method === "POST") {
      let chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        let body = {};
        try { body = JSON.parse(Buffer.concat(chunks).toString("utf8")); } catch (e) {}
        const action = String(body.action || "");
        const id = String(body.id || "");
        const pos = index.findIndex(it => it.id === id && it.oth === oth);
        const J = (o, code) => send(res, code || 200, JSON.stringify(o), "application/json; charset=utf-8");
        if (pos < 0) return J({ error: "not found" }, 404);

        if (action === "delete") {
          if (index[pos].del) return J({ ok: true, already: true, id });
          const isB = index[pos].type === "b";
          const src = path.join(DATA, (isB ? "b-" : "") + id + ".json");
          if (fs.existsSync(src)) {
            const rec = JSON.parse(fs.readFileSync(src, "utf8"));
            fs.writeFileSync(path.join(TRASH, id + ".json"), JSON.stringify({ ...rec, deletedAt: Date.now() }));
            fs.unlinkSync(src);
          }
          index[pos] = { ...index[pos], del: Date.now() };
          writeIndex(index);
          return J({ ok: true, id, undoMs: UNDO_MS });
        }

        if (action === "restore") {
          const del = index[pos].del;
          if (!del) return J({ error: "无需撤销" }, 409);
          if (Date.now() - del > UNDO_MS) return J({ error: "撤销期限已过" }, 410);
          const tf = path.join(TRASH, id + ".json");
          if (!fs.existsSync(tf)) return J({ error: "记录已不存在" }, 410);
          const rec = JSON.parse(fs.readFileSync(tf, "utf8"));
          delete rec.deletedAt;
          const isB = index[pos].type === "b";
          fs.writeFileSync(path.join(DATA, (isB ? "b-" : "") + id + ".json"), JSON.stringify(rec));
          fs.unlinkSync(tf);
          const { del: _d, ...rest } = index[pos];
          index[pos] = rest;
          writeIndex(index);
          return J({ ok: true, id });
        }

        return J({ error: "未知 action" }, 400);
      });
      return;
    }
  }

  // 模拟 functions/stats.js
  if (url.pathname === "/api/stats" && req.method === "GET") {
    const key = req.headers["x-admin-key"] || url.searchParams.get("k") || "";
    const secret = process.env.ADMIN_KEY || "dev-admin";
    if (key !== secret) return send(res, 401, JSON.stringify({ error: "密码错误" }), "application/json; charset=utf-8");
    const s = readStats();
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      days.push({ date: d, count: (s.daily || {})[d] || 0 });
    }
    return send(res, 200, JSON.stringify({ total: s.total || 0, today: (s.daily || {})[new Date().toISOString().slice(0, 10)] || 0, daily: days }), "application/json; charset=utf-8");
  }

  // 模拟 functions/photos.js
  if (url.pathname === "/tree/api/photos" || url.pathname === "/api/photos") {
    let id = (url.searchParams.get("id") || "").trim();
    // 兼容旧缓存脚本：不带 id 时从 Referer 解析
    if (!/^[a-z0-9]{6,20}$/i.test(id)) {
      const m = (req.headers.referer || "").match(/[?&]id=([a-z0-9]{6,20})/i);
      if (m) id = m[1];
    }
    if (!id || !/^[a-z0-9]{6,20}$/i.test(id)) return send(res, 400, "missing id");
    const file = path.join(DATA, id + ".json");
    if (!fs.existsSync(file)) return send(res, 404, "not found");
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return send(res, 200, JSON.stringify({
      title: data.title,
      custom: data.custom || null,
      photos: (data.photos || []).map((p, i) => ({ url: p.dataUrl, name: p.name || ("回忆 " + String(i + 1).padStart(2, "0")) })),
    }), "application/json; charset=utf-8");
  }

  // 模拟 functions/photos-b.js（璀璨树）
  if (url.pathname === "/b/api/photos") {
    const id = (url.searchParams.get("id") || "").trim();
    if (!/^[a-z0-9]{6,20}$/i.test(id)) return send(res, 400, "missing id");
    const file = path.join(DATA, "b-" + id + ".json");
    if (!fs.existsSync(file)) return send(res, 404, "not found");
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return send(res, 200, JSON.stringify({
      title: data.title || "",
      photos: (data.photos || []).map((p, i) => ({ url: p.dataUrl, name: p.name || ("回忆 " + String(i + 1).padStart(2, "0")) })),
    }), "application/json; charset=utf-8");
  }

  // 静态文件
  let rel = decodeURIComponent(url.pathname);
  if (rel.endsWith("/")) rel += "index.html";
  const file = path.normalize(path.join(PUB, rel));
  if (!file.startsWith(PUB)) return send(res, 403, "forbidden");
  fs.readFile(file, (err, buf) => {
    if (err) return send(res, 404, "404: " + rel);
    send(res, 200, buf, MIME[path.extname(file).toLowerCase()] || "application/octet-stream");
  });
});

server.listen(PORT, () => console.log("dev server: http://localhost:" + PORT + "  (数据目录 " + DATA + ")"));
