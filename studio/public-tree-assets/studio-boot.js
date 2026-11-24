// studio/tree 注入引导：在 app.js 模块执行前运行（经典脚本，同步执行）
// 职责：
//  1) ?id=xxx（分享链接）→ GET ./api/photos?id= → 题字/自定义文案 + 锁定纯观赏模式
//     （照片本体由 app.js 既有 loadLocalPhotos 经 ./api/photos 拉取，服务端返回 title+photos+custom）
//  2) ?preview=1（studio 预览 iframe）→ 从 sessionStorage 读 studio_preview
//     （studio 页面在设置 src 前写入，保证先于本脚本执行）→ 题字/自定义文案进 DOM、
//     照片列表进 localStorage 的 studio_preview_photos（app.js 预览分支读取）
(function () {
  "use strict";
  var params = new URLSearchParams(location.search);
  var id = (params.get("id") || "").trim();

  function applyTitle(title) {
    try {
      if (!window.STUDIO_DEDICATION_KEY || typeof title !== "string") return;
      if (title.trim()) {
        localStorage.setItem(window.STUDIO_DEDICATION_KEY, title.trim());
      } else {
        // 题字留空：清掉旧值（可能残留上次预览的题字）
        localStorage.removeItem(window.STUDIO_DEDICATION_KEY);
      }
    } catch (e) { /* 隐私模式忽略 */ }
  }

  // 留空不显示：清空文本并整块隐藏
  function hideEl(el) {
    if (!el) return;
    el.textContent = "";
    el.style.setProperty("display", "none", "important");
  }

  // 应用自定义文案：落款 / 主文案 / 英文 / 心愿短句 + 留空不显示（c.blank）
  function applyCustom(c) {
    if (!c || typeof c !== "object") return;
    try {
      var blank = Array.isArray(c.blank) ? c.blank : [];
      if (c.foot) { var f = document.getElementById("dedication-foot"); if (f) f.textContent = c.foot; }
      if (c.introZh) { var z = document.querySelector(".intro__zh"); if (z) z.textContent = c.introZh; }
      if (c.introEn) { var e2 = document.querySelector(".intro__en"); if (e2) e2.textContent = c.introEn; }
      if (Array.isArray(c.wishes) && c.wishes.length) {
        window.STUDIO_WISHES = c.wishes.map(function (w) {
          if (Array.isArray(w)) return w;
          var s = String(w), i = s.indexOf("|");
          return i < 0 ? [s, ""] : [s.slice(0, i), s.slice(i + 1)];
        });
      }
      // 留空不显示：blank 里的字段整块隐藏
      if (blank.indexOf("foot") >= 0) hideEl(document.getElementById("dedication-foot"));
      if (blank.indexOf("introZh") >= 0) hideEl(document.querySelector(".intro__zh"));
      if (blank.indexOf("introEn") >= 0) hideEl(document.querySelector(".intro__en"));
      if (blank.indexOf("wishes") >= 0) {
        window.STUDIO_WISHES = [];          // 空数组
        window.STUDIO_WISHES_BLANK = true;  // showWishQuote 补丁据此直接 return
      }
      if (blank.indexOf("title") >= 0) {
        var dn = document.getElementById("dedication-name");
        if (dn) { dn.textContent = ""; dn.style.setProperty("display", "none", "important"); }
        // 名字和落款都不显示 → 整块牌子藏掉
        if (!c.foot || blank.indexOf("foot") >= 0) {
          var d = document.getElementById("dedication");
          if (d) d.style.setProperty("display", "none", "important");
        }
      }
    } catch (e) {}
  }

  /* ============ 纯观赏锁定（?id= 分享页） ============ */
  function lockCinema() {
    // 样式：藏训练师/退出按钮，顶栏禁点（只留回忆按钮给收礼人看照片）
    var css = document.createElement("style");
    css.textContent =
      "html.studio-lock #trainer-panel,html.studio-lock #cinema-exit{display:none!important}" +
      "html.studio-lock #experience:not(.is-cinema) .trainer-hud{display:none!important}" +
      // 净屏下顶栏整体拉回可见（原版隐藏一切），但只留「回忆」「摄像头」两个按钮可点
      "html.studio-lock #experience.is-cinema .topbar{opacity:1!important;visibility:visible!important}" +
      "html.studio-lock .top-actions .icon-btn:not(#memory-btn):not(#camera-toggle)," +
      "html.studio-lock .top-actions .action-rule{pointer-events:none!important;opacity:.3}" +
      // 摄像头按钮保持可用：点开/关掉屏幕上的摄像头画面
      "html.studio-lock .top-actions #camera-toggle{pointer-events:auto!important;opacity:1!important}" +
      "html.studio-lock .top-actions #memory-btn{pointer-events:auto!important;opacity:1!important}" +
      "html.studio-lock #experience.is-cinema .camera-panel.is-visible{display:flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;z-index:2147483000!important;right:24px!important;bottom:96px!important}" +
      // 分享页保留原版手势控制提示（底部胶囊说明 + 移动手掌提示）——用 id 级选择器确保压过原版 .is-live 门控
      "html.studio-lock #gesture-dock{display:flex!important;visibility:visible!important;opacity:1!important;transition:none!important}" +
      "html.studio-lock .move-hint{display:block!important;visibility:visible!important;opacity:1!important;transition:none!important}" +
      "html.studio-lock #experience.is-cinema .gesture-dock{display:flex!important;visibility:visible!important;opacity:.92}" +
      "html.studio-lock #experience.is-cinema .move-hint{display:block!important;visibility:visible!important;opacity:.8}" +
      "@media (max-width:760px){" +
      "html.studio-lock #experience.is-cinema .gesture-dock{flex-wrap:wrap;gap:6px;padding:0 10px 8px}" +
      ".studio-fab{bottom:88px!important;font-size:12px!important;padding:8px 13px!important;opacity:.85}" +
      ".memory-panel{padding-bottom:120px!important}" +
      "}";
    document.documentElement.appendChild(css);
    document.documentElement.classList.add("studio-lock");

    // 键盘：Esc / P 不许退出净屏
    var KEYS = { "Escape": 1, "p": 1, "P": 1 };
    document.addEventListener("keydown", function (ev) {
      if (KEYS[ev.key]) { ev.stopImmediatePropagation(); ev.preventDefault(); }
    }, true);

    // 兜底：任何时刻掉出净屏就拉回来；手势提示用内联样式强制常驻
    setInterval(function () {
      var exp = document.getElementById("experience");
      if (exp && !exp.classList.contains("is-cinema")) exp.classList.add("is-cinema");
      var tr = document.getElementById("trainer-panel");
      if (tr) tr.classList.add("is-hidden");
      var ce = document.getElementById("cinema-exit");
      if (ce) ce.style.display = "none";
      // 原版手势提示：底部说明胶囊 + 移动手掌提示（原版靠 .is-live 门控，这里内联 !important 强制显示）
      var dock = document.getElementById("gesture-dock");
      if (dock) {
        dock.style.setProperty("display", "flex", "important");
        dock.style.setProperty("visibility", "visible", "important");
        dock.style.setProperty("opacity", "0.92", "important");
      }
      var mh = document.querySelector(".move-hint");
      if (mh) {
        mh.style.setProperty("display", "block", "important");
        mh.style.setProperty("visibility", "visible", "important");
        mh.style.setProperty("opacity", "0.8", "important");
      }
    }, 500);
  }

  if (params.get("preview") === "1") {
    try {
      var raw = sessionStorage.getItem("studio_preview");
      if (raw) {
        var cfg = JSON.parse(raw);
        applyTitle(cfg && cfg.title);
        applyCustom(cfg && cfg.custom);
        localStorage.setItem("studio_preview_photos", JSON.stringify((cfg && cfg.photos) || []));
      }
    } catch (e) {}
    return;
  }

  // 「制作同款」悬浮按钮已由 studio-fab.js 统一处理（含可隐藏）
  if (!id) {
    return; // 普通访问：走原逻辑
  }

  // ============ 分享页（?id=）：锁定 + 拉自定义文案 ============
  lockCinema();
  fetch("./api/photos?id=" + encodeURIComponent(id), { cache: "no-store" })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (data) {
      if (!data) return;
      if (typeof data.title === "string") applyTitle(data.title);
      applyCustom(data.custom);
      // 题字留空：不放名字牌（原版初始化会回退「亲爱的」，需在 module 读取前清掉 + 渲染后隐藏）
      var t = typeof data.title === "string" ? data.title.trim() : "";
      if (!t) {
        try { if (window.STUDIO_DEDICATION_KEY) localStorage.removeItem(window.STUDIO_DEDICATION_KEY); } catch (e) {}
        // DOM 可能未就绪：等渲染后再隐藏（module 初始化也可能回写「亲爱的」，双保险 interval）
        var hideDed = function () {
          var d = document.getElementById("dedication");
          if (d) d.style.setProperty("display", "none", "important");
        };
        if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hideDed);
        else setTimeout(hideDed, 0);
        setTimeout(hideDed, 600);
        var n = 0;
        var iv = setInterval(function () {
          hideDed();
          if (++n > 6) clearInterval(iv);
        }, 500);
      }
    })
    .catch(function () {});
})();
