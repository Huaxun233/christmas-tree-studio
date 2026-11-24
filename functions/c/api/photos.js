// functions/c/api/photos.js — 记忆漩涡树照片读取：GET /c/api/photos?id=<id>（CF 版）
// 返回 { title, custom, photos: [{url, name}] }（url 为 dataUrl）
import { getStore } from "../../lib/store.js";
import { json } from "../../lib/http.js";

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get("id");
  if (!id || !/^[a-z0-9]{6,32}$/i.test(id)) return json({ error: "bad id" }, 400);

  let tree;
  try {
    const store = getStore(context.env.TREES);
    tree = await store.get(`ctree/${id}`, { type: "json" });
  } catch (e) {
    return json({ error: "读取失败" }, 500);
  }
  if (!tree) return json({ error: "树不存在" }, 404);

  return json({
    title: tree.title || "",
    custom: tree.custom || null,
    photos: (tree.photos || []).map(p => ({ url: p.dataUrl, name: p.name || "" })),
  });
}
