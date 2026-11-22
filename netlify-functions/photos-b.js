// functions/photos-b.js — 璀璨树照片读取：GET /b/api/photos?id=<id>
// 返回 { title, photos: [{url, name}] }（url 为 dataUrl，供分享页灌 IndexedDB）
import { getStore } from "@netlify/blobs";

export default async (req) => {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id || !/^[a-z0-9]{6,32}$/i.test(id)) return json({ error: "bad id" }, 400);

  let tree;
  try {
    const store = getStore({ name: "trees", consistency: "strong" });
    tree = await store.get(`btree/${id}`, { type: "json" });
  } catch (e) {
    return json({ error: "读取失败" }, 500);
  }
  if (!tree) return json({ error: "树不存在" }, 404);

  return json({
    title: tree.title || "",
    photos: (tree.photos || []).map(p => ({ url: p.dataUrl, name: p.name || "" })),
  });
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
