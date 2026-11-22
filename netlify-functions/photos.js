// functions/photos.js — 树页取配置：GET /tree/api/photos?id=xxx
// 返回 { photos: [{url, name}] }，并顺带把题字写进响应头外由 studio-key+bootstrap 处理。
// Blobs 键：tree/{id} → { title, photos: [{name, dataUrl}] }
import { getStore } from "@netlify/blobs";

export default async (req) => {
  const url = new URL(req.url);
  let id = (url.searchParams.get("id") || "").trim();
  // 兼容旧缓存脚本：不带 id 的请求从 Referer（/tree/?id=xxx）里解析
  if (!/^[a-z0-9]{6,32}$/i.test(id)) {
    try {
      const ref = req.headers.get("referer") || "";
      const m = ref.match(/[?&]id=([a-z0-9]{6,32})/i);
      if (m) id = m[1];
    } catch (e) { /* ignore */ }
  }
  if (!/^[a-z0-9]{6,32}$/i.test(id)) {
    return json({ photos: [] });
  }
  try {
    const store = getStore({ name: "trees", consistency: "strong" });
    const raw = await store.get(`tree/${id}`, { type: "json" });
    if (!raw) return json({ photos: [] });
    return json({
      title: raw.title || "",
      custom: raw.custom || null,
      photos: (raw.photos || []).map((p, i) => ({
        url: p.dataUrl,
        name: p.name || `回忆 ${String(i + 1).padStart(2, "0")}`,
      })),
    });
  } catch (e) {
    return json({ photos: [], error: String(e && e.message || e) }, 500);
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
