// functions/tree/api/photos.js — 树页取配置：GET /tree/api/photos?id=xxx（CF 版）
// 返回 { photos: [{url, name}] } + title/custom（题字与自定义文案由 studio-boot 处理）。
// KV 键：tree/{id} → { title, photos: [{name, dataUrl}] }
import { getStore } from "../../lib/store.js";
import { json } from "../../lib/http.js";

export async function onRequestGet(context) {
  const req = context.request;
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
    const store = getStore(context.env.TREES);
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
}
