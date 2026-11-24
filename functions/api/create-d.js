// functions/api/create-d.js — 生成手势圣诞树（D 型，无照片）：POST /api/create-d（CF 版）
// body: { title, custom: {sub} }
// 存 KV dtree/{id}，返回 { id, url, ownerToken }
import { getStore } from "../lib/store.js";
import { json, randomHex, tokenHash, newId } from "../lib/http.js";
import { bumpStats } from "../lib/stats.js";

export async function onRequestPost(context) {
  const req = context.request;
  let body;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }

  const title = String(body.title || "").trim().slice(0, 60); // 题字默认空白，不回退

  const c = body.custom && typeof body.custom === "object" ? body.custom : {};
  const custom = {};
  const sub = String(c.sub || "").trim().slice(0, 40);
  if (sub) custom.sub = sub;
  const hasCustom = Object.keys(custom).length > 0;

  const id = newId();
  const ownerToken = randomHex(32);

  try {
    const store = getStore(context.env.TREES);
    await store.setJSON(`dtree/${id}`, { title, photos: [], createdAt: Date.now(), ownerToken, type: "d", ...(hasCustom ? { custom } : {}) });
    try {
      const oth = await tokenHash(ownerToken);
      let index = (await store.get("index", { type: "json" })) || [];
      index = [
        { id, title, photoCount: 0, createdAt: Date.now(), thumb: "", oth, type: "d" },
        ...index.filter(it => it.id !== id),
      ].slice(0, 500);
      await store.setJSON("index", index);
    } catch { /* 索引失败不影响主流程 */ }
    try { await bumpStats(store); } catch {}
  } catch (e) {
    return json({ error: "存储失败：" + String(e && e.message || e) }, 500);
  }

  const origin = new URL(req.url).origin;
  return json({ id, url: `${origin}/d/?id=${id}`, ownerToken });
}

export async function onRequestGet(context) {
  return json({ error: "method not allowed" }, 405);
}
