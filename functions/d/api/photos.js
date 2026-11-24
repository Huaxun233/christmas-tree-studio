// functions/d/api/photos.js — 手势圣诞树读取：GET /d/api/photos?id=<id>（CF 版）
// D 型无照片，返回 { title, custom, photos: [] }
import { getStore } from "../../lib/store.js";
import { json } from "../../lib/http.js";

export async function onRequestGet(context) {
  const url = new URL(context.request.url);
  const id = url.searchParams.get("id");
  if (!id || !/^[a-z0-9]{6,32}$/i.test(id)) return json({ error: "bad id" }, 400);

  let tree;
  try {
    const store = getStore(context.env.TREES);
    tree = await store.get(`dtree/${id}`, { type: "json" });
  } catch (e) {
    return json({ error: "读取失败" }, 500);
  }
  if (!tree) return json({ error: "树不存在" }, 404);

  return json({
    title: tree.title || "",
    custom: tree.custom || null,
    photos: [],
  });
}
