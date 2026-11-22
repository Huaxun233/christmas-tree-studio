// functions/stats.js — 创建统计：GET /api/stats（需管理密码）
// 返回 { total, today, daily: [{date, count}]（近 14 天，缺日补 0） }
import { getStore } from "@netlify/blobs";
import { todayUTC } from "./_stats.js";

export default async (req) => {
  const url = new URL(req.url);
  const key = url.searchParams.get("k") || req.headers.get("x-admin-key") || "";
  const secret = process.env.ADMIN_KEY || "";
  if (!secret) return json({ error: "未配置 ADMIN_KEY 环境变量" }, 500);
  if (key !== secret) return json({ error: "密码错误" }, 401);
  if (req.method !== "GET") return json({ error: "method not allowed" }, 405);

  try {
    const store = getStore({ name: "trees", consistency: "strong" });
    const rec = (await store.get("stats/total", { type: "json" })) || { total: 0, daily: {} };
    const daily = rec.daily || {};
    const today = todayUTC();
    const days = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      days.push({ date: d, count: daily[d] || 0 });
    }
    return json({ total: rec.total || 0, today: daily[today] || 0, daily: days });
  } catch (e) {
    return json({ error: String((e && e.message) || e) }, 500);
  }
};

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}
