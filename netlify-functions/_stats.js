// functions/_stats.js — 创建计数（下划线开头不会被当作独立函数部署，供 create/create-b 引用）
// Blobs 键 stats/total = { total, daily: { "YYYY-MM-DD": count } }
// 总数从本功能上线日起算（用户确认：此前的经典树不计入）。

export async function bumpStats(store) {
  const today = new Date().toISOString().slice(0, 10); // UTC 日期即可
  const rec = (await store.get("stats/total", { type: "json" })) || { total: 0, daily: {} };
  rec.total = (rec.total || 0) + 1;
  rec.daily = rec.daily || {};
  rec.daily[today] = (rec.daily[today] || 0) + 1;
  await store.setJSON("stats/total", rec);
}

export function todayUTC() {
  return new Date().toISOString().slice(0, 10);
}
