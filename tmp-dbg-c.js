// dbg-c.js — 排查 C 型分享页卡加载
const { chromium } = require("C:/Users/itsuka/AppData/Roaming/npm/node_modules/@playwright/cli/node_modules/playwright-core");
(async () => {
  const browser = await chromium.launch({ channel: "msedge", headless: true, args: ["--enable-unsafe-swiftshader"] });
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage();
  const logs = [];
  p.on("console", m => logs.push(`[${m.type()}] ${m.text().slice(0, 300)}`));
  p.on("pageerror", e => logs.push(`[pageerror] ${String(e).slice(0, 400)}`));
  p.on("requestfailed", r => logs.push(`[reqfail] ${r.url().slice(0, 160)} :: ${r.failure() && r.failure().errorText}`));
  await p.goto("https://christmas-tree-studio-cd0.pages.dev/c/?id=0341493d1a", { waitUntil: "domcontentloaded", timeout: 60000 }).catch(e => logs.push("[goto-err] " + e.message));
  await p.waitForTimeout(12000);
  const state = await p.evaluate(() => ({
    moduleLoaded: !!document.querySelector('script[type="module"]'),
    canvasCount: document.querySelectorAll("canvas").length,
    bodyChildren: [...document.querySelectorAll("body > *")].map(el => el.tagName + (el.id ? "#" + el.id : "") + (el.className && typeof el.className === "string" ? "." + el.className.split(" ").slice(0,2).join(".") : "")).slice(0, 12),
    rootHTML: (document.getElementById("root") || document.querySelector("#root, #app, main") || {}).innerHTML?.slice(0, 200),
    cNames: window.__C_NAMES && window.__C_NAMES.length,
    cUrls: window.__C_URLS && Object.keys(window.__C_URLS || {}).length,
    banner: document.getElementById("c-title-banner")?.textContent || null,
  })).catch(e => ({ evalErr: String(e) }));
  console.log(JSON.stringify(state, null, 1));
  console.log("--- console ---");
  logs.slice(-40).forEach(l => console.log(l));
  await p.screenshot({ path: process.env.TEMP + "/c-share.png" });
  await browser.close();
})();
