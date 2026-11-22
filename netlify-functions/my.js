// functions/my.js — 用户自助管理自己的树：/api/my
//   鉴权：header x-owner-token（或 ?t=），令牌由 /api/create 下发
//   GET                          列出自己的树（含回收站状态）
//   POST { action:"delete", id } 移入回收站（3 分钟内可撤销）
//   POST { action:"restore", id } 撤销删除
// 索引：Blobs "index" → [{ id, title, photoCount, createdAt, thumb, oth, del? }]
// 记录：Blobs "tree/{id}"；回收站 "trash/{id}"
import { getStore } from "@netlify/blobs";

const UNDO_MS = 3 * 60 * 1000; // 3 分钟内可撤销

export default async (req) => {
  const url = new URL(req.url);
  const token = (req.headers.get("x-owner-token") || url.searchParams.get("t") || "").trim();
  if (!/^[a-f0-9]{16,64}$/i.test(token)) return json({ error: "not found" }, 404);

  const store = getStore({ name: "trees", consistency: "strong" });
  const oth = await tokenHash(token);

  try {
    let index = (await store.get("index", { type: "json" })) || [];
    index = await purgeExpired(store, index);

    if (req.method === "GET") {
      const mine = index
        .filter(it => it.oth && it.oth === oth)
        .map(it => ({
          id: it.id, title: it.title, photoCount: it.photoCount, createdAt: it.createdAt,
          thumb: it.thumb, deletedAt: it.del || null, canUndo: !!it.del && Date.now() - it.del < UNDO_MS,
        }));
      return json({ count: mine.length, trees: mine });
    }

    if (req.method === "POST") {
      let body = {};
      try { body = await req.json(); } catch {}
      const action = String(body.action || "");
      const id = String(body.id || "");
      if (!/^[a-z0-9]{6,32}$/i.test(id)) return json({ error: "not found" }, 404);

      const pos = index.findIndex(it => it.id === id && it.oth && it.oth === oth);
      if (pos < 0) return json({ error: "not found" }, 404);

      if (action === "delete") {
        if (index[pos].del) return json({ ok: true, already: true, id });
        const prefix = index[pos].type === "b" ? "btree/" : "tree/";
        const rec = await store.get(`${prefix}${id}`, { type: "json" });
        if (rec) await store.setJSON(`trash/${id}`, { ...rec, deletedAt: Date.now() });
        await store.delete(`${prefix}${id}`);
        index[pos] = { ...index[pos], del: Date.now() };
        await store.setJSON("index", index);
        return json({ ok: true, id, undoMs: UNDO_MS });
      }

      if (action === "restore") {
        const del = index[pos].del;
        if (!del) return json({ error: "无需撤销" }, 409);
        if (Date.now() - del > UNDO_MS) {
          await store.delete(`trash/${id}`);
          index = index.filter(it => it.id !== id);
          await store.setJSON("index", index);
          return json({ error: "撤销期限已过" }, 410);
        }
        const rec = await store.get(`trash/${id}`, { type: "json" });
        if (!rec) return json({ error: "记录已不存在" }, 410);
        const { deletedAt, ...clean } = rec;
        const prefix = index[pos].type === "b" ? "btree/" : "tree/";
        await store.setJSON(`${prefix}${id}`, clean);
        await store.delete(`trash/${id}`);
        const { del: _drop, ...rest } = index[pos];
        index[pos] = rest;
        await store.setJSON("index", index);
        return json({ ok: true, id });
      }

      return json({ error: "未知 action" }, 400);
    }

    return json({ error: "method not allowed" }, 405);
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
};

// 懒清理：删除过期回收站记录与索引条目（没有 cron，靠访问触发）
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

async function tokenHash(token) {
  const data = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 16);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
