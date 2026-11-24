// functions/api/admin.js — 总管理：/api/admin（前端无入口，页面在 /aokorin/）（CF 版）
//   GET                             列出全部（需 key）
//   POST { action:"delete", id }     删除单棵
//   POST { action:"hard_delete", id } 硬删除：连回收站副本一起清掉，不进回收站
//   POST { action:"clear" }          全部清空
// 鉴权：query ?k= 或 header x-admin-key，对比环境变量 ADMIN_KEY
// 索引：KV 键 "index" → [{ id, title, photoCount, createdAt, thumb, oth, del? }]
import { getStore } from "../lib/store.js";
import { json, adminKey } from "../lib/http.js";

const UNDO_MS = 3 * 60 * 1000;

async function handle(context, req) {
  const url = new URL(req.url);
  const key = url.searchParams.get("k") || req.headers.get("x-admin-key") || "";
  const secret = adminKey(context);
  if (!secret) return json({ error: "未配置 ADMIN_KEY 环境变量" }, 500);
  if (key !== secret) return json({ error: "密码错误" }, 401);

  const store = getStore(context.env.TREES);

  try {
    if (req.method === "GET") {
      let index = await store.get("index", { type: "json" });
      if (!index) {
        // 首次：扫描全部类型前缀重建索引（a=tree/ b=btree/ c=ctree/ d=dtree/）
        const TYPE_BY_PREFIX = { "tree/": "a", "btree/": "b", "ctree/": "c", "dtree/": "d" };
        const all = [];
        for (const prefix of Object.keys(TYPE_BY_PREFIX)) {
          const { blobs } = await store.list({ prefix });
          for (const b of blobs) all.push(b);
        }
        index = [];
        for (const b of all) {
          const rec = await store.get(b.key, { type: "json" });
          if (!rec) continue;
          const prefix = b.key.replace(/^(tree|btree|ctree|dtree)\/.*/, "$1/") || "tree/";
          index.push({
            id: b.key.replace(/^(b|c|d)?tree\//, ""),
            title: rec.title || "",
            photoCount: (rec.photos || []).length,
            createdAt: rec.createdAt || 0,
            thumb: (rec.photos && rec.photos[0] && rec.photos[0].dataUrl) || "",
            type: rec.type || TYPE_BY_PREFIX[prefix] || "a",
          });
        }
        index.sort((a, b) => b.createdAt - a.createdAt);
        await store.setJSON("index", index);
      }
      index = await purgeExpired(store, index);
      const totalBytes = index.reduce((s, it) => s + (it.thumb ? it.thumb.length * 0.75 : 0), 0);
      const trees = index.map(it => ({
        ...it,
        ownerTag: it.oth ? it.oth.slice(0, 4) : "",
        trash: !!it.del,
      }));
      return json({ count: trees.length, approxBytes: Math.round(totalBytes), trees });
    }

    if (req.method === "POST") {
      let body = {};
      try { body = await req.json(); } catch {}
      const action = String(body.action || "");
      let index = (await store.get("index", { type: "json" })) || [];
      index = await purgeExpired(store, index);

      if (action === "delete" || action === "hard_delete") {
        const id = String(body.id || "");
        if (!/^[a-z0-9]{6,32}$/i.test(id)) return json({ error: "id 不合法" }, 400);
        for (const k of [`tree/${id}`, `btree/${id}`, `ctree/${id}`, `dtree/${id}`, `trash/${id}`]) { try { await store.delete(k); } catch {} }
        index = index.filter(it => it.id !== id);
        await store.setJSON("index", index);
        return json({ ok: true, hard: action === "hard_delete", deleted: id, remaining: index.length });
      }

      if (action === "clear") {
        let removed = 0;
        for (const prefix of ["tree/", "btree/", "ctree/", "dtree/", "trash/"]) {
          const { blobs } = await store.list({ prefix });
          for (const b of blobs) { await store.delete(b.key); removed++; }
        }
        await store.setJSON("index", []);
        return json({ ok: true, deleted: removed });
      }

      return json({ error: "未知 action" }, 400);
    }

    return json({ error: "method not allowed" }, 405);
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
}

export async function onRequestGet(context) { return handle(context, context.request); }
export async function onRequestPost(context) { return handle(context, context.request); }

async function purgeExpired(store, index) {
  const now = Date.now();
  const expired = index.filter(it => it.del && now - it.del > UNDO_MS);
  if (!expired.length) return index;
  for (const it of expired) {
    try { await store.delete(`trash/${it.id}`); } catch {}
  }
  const keep = index.filter(it => !expired.some(e => e.id === it.id));
  await store.setJSON("index", keep);
  return keep;
}
