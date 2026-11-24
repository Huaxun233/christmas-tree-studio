// functions/api/create-h.js — 生成HHk 圣诞树（H 型，electronicminer 镜像）：POST /api/create-h（CF 版）
// body: { title, photos: [{name, dataUrl}] }
// 存 KV mtree/{id}，返回 { id, url, ownerToken }
import { getStore } from "../lib/store.js";
import { json, randomHex, tokenHash, newId } from "../lib/http.js";
import { bumpStats } from "../lib/stats.js";

const MAX_PHOTOS = 24;
const MAX_BODY_BYTES = 12 * 1024 * 1024; // 12MB

export async function onRequestPost(context) {
  const req = context.request;
  let body;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }

  const title = String(body.title || "").trim().slice(0, 60); // 题字默认空白，不回退
  let photos = Array.isArray(body.photos) ? body.photos : [];
  photos = photos
    .filter(p => typeof p?.dataUrl === "string" && p.dataUrl.startsWith("data:image/"))
    .slice(0, MAX_PHOTOS)
    .map(p => ({ name: String(p.name || "").slice(0, 40), dataUrl: p.dataUrl }));

  const size = JSON.stringify({ title, photos }).length;
  if (size > MAX_BODY_BYTES) return json({ error: "内容过大，请减少照片数量或尺寸" }, 413);

  const id = newId();
  const ownerToken = randomHex(32);

  try {
    const store = getStore(context.env.TREES);
    await store.setJSON(`mtree/${id}`, { title, photos, createdAt: Date.now(), ownerToken, type: "m" });
    // 维护管理索引（最新在最前）。索引里只放 token 的哈希前缀，不放明文。
    try {
      const oth = await tokenHash(ownerToken);
      let index = (await store.get("index", { type: "json" })) || [];
      index = [
        { id, title, photoCount: photos.length, createdAt: Date.now(), thumb: photos[0]?.dataUrl || "", oth, type: "m" },
        ...index.filter(it => it.id !== id),
      ].slice(0, 500);
      await store.setJSON("index", index);
    } catch { /* 索引失败不影响主流程 */ }
    try { await bumpStats(store); } catch {}
  } catch (e) {
    return json({ error: "存储失败: " + String(e && e.message || e) }, 500);
  }

  const origin = new URL(req.url).origin;
  return json({ id, url: `${origin}/h/?id=${id}`, ownerToken });
}

export async function onRequestGet(context) {
  return json({ error: "method not allowed" }, 405);
}
