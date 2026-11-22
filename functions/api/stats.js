// functions/api/stats.js — 创建统计：GET /api/stats（需管理密码）（CF 版）
// 返回 { total, today, daily: [{date, count}]（近 14 天，缺日补 0） }
import { getStore } from "../lib/store.js";
import { json, adminKey } from "../lib/http.js";
import { todayUTC } from "../lib/stats.js";

export async function onRequestGet(context) {
  const req = context.request;
  const url = new URL(req.url);
  const key = url.searchParams.get("k") || req.headers.get("x-admin-key") || "";
  const secret = adminKey(context);
  if (!secret) return json({ error: "未配置 ADMIN_KEY 环境变量" }, 500);
  if (key !== secret) return json({ error: "密码错误" }, 401);

  try {
    const store = getStore(context.env.TREES);
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
}
