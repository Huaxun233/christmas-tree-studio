// functions/admin.js — 总管理：/api/admin（前端无入口，页面在 /aokorin/）
//   GET                             列出全部（需 key）
//   POST { action:"delete", id }     删除单棵
//   POST { action:"hard_delete", id } 硬删除：连回收站副本一起清掉，不进回收站
//   POST { action:"clear" }          全部清空
// 鉴权：query ?k= 或 header x-admin-key，对比环境变量 ADMIN_KEY
// 索引：Blobs 键 "index" → [{ id, title, photoCount, createdAt, thumb, oth, del? }]
import { getStore } from "@netlify/blobs";

const UNDO_MS = 3 * 60 * 1000;

export default async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get("k") || req.headers.get("x-admin-key") || "";
  const secret = process.env.ADMIN_KEY || "";
  if (!secret) return json({ error: "未配置 ADMIN_KEY 环境变量" }, 500);
  if (key !== secret) return json({ error: "密码错误" }, 401);

  const store = getStore({ name: "trees", consistency: "strong" });

  try {
    if (req.method === "GET") {
      let index = await store.get("index", { type: "json" });
      if (!index) {
        // 首次：扫描已有 tree/* 与 btree/* 重建索引
        const all = [];
        for (const prefix of ["tree/", "btree/"]) {
          const { blobs } = await store.list({ prefix });
          for (const b of blobs) all.push(b);
        }
        index = [];
        for (const b of all) {
          const rec = await store.get(b.key, { type: "json" });
          if (!rec) continue;
          index.push({
            id: b.key.replace(/^(b)?tree\//, ""),
            title: rec.title || "",
            photoCount: (rec.photos || []).length,
            createdAt: rec.createdAt || 0,
            thumb: (rec.photos && rec.photos[0] && rec.photos[0].dataUrl) || "",
            ...(b.key.startsWith("btree/") ? { type: "b" } : {}),
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

      if (action === "delete") {
        const id = String(body.id || "");
        if (!/^[a-z0-9]{6,32}$/i.test(id)) return json({ error: "id 不合法" }, 400);
        for (const k of [`tree/${id}`, `btree/${id}`, `trash/${id}`]) { try { await store.delete(k); } catch {} }
        index = index.filter(it => it.id !== id);
        await store.setJSON("index", index);
        return json({ ok: true, deleted: id, remaining: index.length });
      }

      if (action === "hard_delete") {
        const id = String(body.id || "");
        if (!/^[a-z0-9]{6,32}$/i.test(id)) return json({ error: "id 不合法" }, 400);
        for (const k of [`tree/${id}`, `btree/${id}`, `trash/${id}`]) { try { await store.delete(k); } catch {} }
        index = index.filter(it => it.id !== id);
        await store.setJSON("index", index);
        return json({ ok: true, hard: true, deleted: id, remaining: index.length });
      }

      if (action === "clear") {
        let removed = 0;
        for (const prefix of ["tree/", "btree/", "trash/"]) {
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
};

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

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
