// functions/create.js — 生成专属树：POST /api/create
// body: { title, photos: [{name, dataUrl}], custom: {foot, introZh, introEn, wishes, blank:[...]} }
// 存 Blobs tree/{id}，返回 { id, url, ownerToken }
import { getStore } from "@netlify/blobs";
import { bumpStats } from "./_stats.js";

const MAX_PHOTOS = 30;
const MAX_BODY_BYTES = 12 * 1024 * 1024; // 12MB

export default async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ error: "bad json" }, 400); }

  // 自定义文案：落款 / 主文案 / 英文 / 心愿短句（可选）+ 留空不显示（blank）
  const VALID_BLANK = ["title", "foot", "introZh", "introEn", "wishes"];
  const c = body.custom && typeof body.custom === "object" ? body.custom : {};
  const blank = Array.isArray(c.blank)
    ? [...new Set(c.blank.map(String))].filter(k => VALID_BLANK.includes(k))
    : [];
  // 题字留空 → title 存空串（分享页整块不显示），否则回退默认「亲爱的」
  const title = blank.includes("title")
    ? ""
    : (String(body.title || "").trim().slice(0, 60) || "亲爱的");
  let photos = Array.isArray(body.photos) ? body.photos : [];
  photos = photos
    .filter(p => typeof p?.dataUrl === "string" && p.dataUrl.startsWith("data:image/"))
    .slice(0, MAX_PHOTOS)
    .map(p => ({ name: String(p.name || "").slice(0, 40), dataUrl: p.dataUrl }));

  const size = JSON.stringify({ title, photos }).length;
  if (size > MAX_BODY_BYTES) return json({ error: "内容过大，请减少照片数量或尺寸" }, 413);

  // 自定义文案：留空的字段不存值，只记进 blank（分享页据此隐藏对应元素）
  const custom = {};
  if (!blank.includes("foot") && c.foot) custom.foot = String(c.foot).trim().slice(0, 40);
  if (!blank.includes("introZh") && c.introZh) custom.introZh = String(c.introZh).trim().slice(0, 30);
  if (!blank.includes("introEn") && c.introEn) custom.introEn = String(c.introEn).trim().slice(0, 40);
  if (!blank.includes("wishes") && Array.isArray(c.wishes)) {
    custom.wishes = c.wishes
      .map(w => String(w).trim().slice(0, 80))
      .filter(Boolean)
      .slice(0, 20);
  }
  if (blank.length) custom.blank = blank;
  const hasCustom = Object.keys(custom).length > 0;

  const id = [...crypto.getRandomValues(new Uint8Array(8))]
    .map(b => b.toString(36).padStart(2, "0")).join("").slice(0, 10);
  const ownerToken = randomHex(32);

  try {
    const store = getStore({ name: "trees", consistency: "strong" });
    await store.setJSON(`tree/${id}`, { title, photos, createdAt: Date.now(), ownerToken, ...(hasCustom ? { custom } : {}) });
    // 维护管理索引（最新在最前）。索引里只放 token 的哈希前缀，不放明文。
    try {
      const oth = await tokenHash(ownerToken);
      let index = (await store.get("index", { type: "json" })) || [];
      index = [
        { id, title, photoCount: photos.length, createdAt: Date.now(), thumb: photos[0]?.dataUrl || "", oth },
        ...index.filter(it => it.id !== id),
      ].slice(0, 500);
      await store.setJSON("index", index);
    } catch { /* 索引失败不影响主流程 */ }
    // 创建计数（总数从上线日起算；失败不影响主流程）
    try { await bumpStats(store); } catch {}
  } catch (e) {
    return json({ error: "存储失败：" + String(e && e.message || e) }, 500);
  }

  const origin = new URL(req.url).origin;
  return json({ id, url: `${origin}/tree/?id=${id}`, ownerToken });
};

function randomHex(n) {
  const bytes = crypto.getRandomValues(new Uint8Array(n / 2));
  return [...bytes].map(b => b.toString(16).padStart(2, "0")).join("");
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
