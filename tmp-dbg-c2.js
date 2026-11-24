// dbg-c2.js — 修复后验证 C 分享页完整加载
const { chromium } = require("C:/Users/itsuka/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core");
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage();
  const logs = [];
  p.on("console", m => logs.push(`[${m.type()}] ${m.text().slice(0, 200)}`));
  p.on("pageerror", e => logs.push(`[pageerror] ${String(e).slice(0, 300)}`));
  p.on("requestfailed", r => logs.push(`[reqfail] ${r.url().slice(0, 140)}`));
  await p.goto("https://christmas-tree-studio-cd0.pages.dev/c/?id=034l493d1a", { waitUntil: "domcontentloaded", timeout: 60000 }).catch(e => logs.push("[goto] " + e.message));
  await p.waitForTimeout(15000);
  const state = await p.evaluate(() => ({
    canvasCount: document.querySelectorAll("canvas").length,
    loadingGone: !document.body.textContent.includes("LOADING CHRISTMAS MAGIC"),
    hudText: (document.getElementById("c-hud") || {}).textContent?.slice(0, 60) || null,
    banner: document.getElementById("c-title-banner") ? "yes" : "no",
    cleanBtn: !!document.getElementById("c-clean-btn"),
    fab: !!document.getElementById("studio-fab"),
  })).catch(e => ({ evalErr: String(e) }));
  console.log(JSON.stringify(state, null, 1));
  console.log("--- 关键 console ---");
  logs.filter(l => /error|fail|404|MediaPipe|初始化/.test(l)).slice(-10).forEach(l => console.log(l));
  await p.screenshot({ path: process.env.TEMP + "/c-share2.png" });
  await browser.close();
})();
