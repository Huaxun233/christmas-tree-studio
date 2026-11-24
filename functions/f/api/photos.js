// functions/f/api/photos.js — 星光璀璨树照片读取：GET /f/api/photos?id=<id>（CF 版）
// 返回 { title, photos: [{url, name}] }（url 为 dataUrl，供 f-boot 灌 __F_SHARE_PHOTOS）
import { getStore } from "../../lib/store.js";
import { json } from "../../lib/http.js";

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get("id");
  if (!id || !/^[a-z0-9]{6,32}$/i.test(id)) return json({ error: "bad id" }, 400);

  let tree;
  try {
    const store = getStore(context.env.TREES);
    tree = await store.get(`ftree/${id}`, { type: "json" });
  } catch (e) {
    return json({ error: "读取失败" }, 500);
  }
  if (!tree) return json({ error: "树不存在" }, 404);

  return json({
    title: tree.title || "",
    photos: (tree.photos || []).map(p => ({ url: p.dataUrl, name: p.name || "" })),
  });
}
