// f-boot.js — 星光璀璨树（F 型，timo）分享页引导（经典脚本，先于应用 module 执行）
// 无 ?id= 时直接放行 module（纯本地玩法）；有 ?id= / ?preview=1 时：
//   1. fetch /f/api/photos?id= 取题字与照片（dataUrl 数组）
//   2. 写 window.__F_SHARE_PHOTOS / window.__F_TITLE（photos.js 注入 + capture.js 导出图 + h1 题字）
//   3. 动态加载被延迟的 module
(function () {
  var TAG = document.querySelector('script[type="text/x-module-defer"]');
  var SRC = TAG && TAG.getAttribute("data-src");
  var PARAMS = new URLSearchParams(location.search);
  var ID = PARAMS.get("id") || "";
  var PREVIEW = PARAMS.get("preview") === "1";
  if (!SRC) return;
  if (!ID && !PREVIEW) return loadModule();

  function loadModule() {
    var s = document.createElement("script");
    s.type = "module";
    s.src = SRC;
    s.crossOrigin = "anonymous";
    document.head.appendChild(s);
  }

  function onReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  // 题字：timo 原生 #ui-layer h1（金色渐变），直接改文字；留空整块隐藏（默认留白）
  function applyTitle(title) {
    window.__F_TITLE = title || "";
    onReady(function () {
      var h1 = document.querySelector("#ui-layer h1");
      if (!h1) return;
      if (title) h1.textContent = title;
      else h1.style.display = "none";
    });
  }

  // ===== 一键清屏：右下角 👁，复用 timo 原生 ui-hidden-all（隐藏 UI 层 + 摄像头窗 + 引导）=====
  function setupCleanToggle() {
    onReady(function () {
      if (document.getElementById("f-clean-btn")) return;
      var btn = document.createElement("button");
      btn.id = "f-clean-btn";
      btn.textContent = "👁";
      btn.title = "一键清屏 / 恢复文字";
      btn.setAttribute("style",
        "position:fixed;right:14px;bottom:14px;width:38px;height:38px;border-radius:50%;" +
        "border:1px solid rgba(255,217,102,.35);background:rgba(5,13,26,.55);color:#ffd966;" +
        "font-size:16px;cursor:pointer;z-index:2147482900;backdrop-filter:blur(4px);" +
        "transition:opacity .2s;line-height:1;padding:0;");
      btn.addEventListener("click", function () {
        var on = document.body.classList.toggle("ui-hidden-all");
        btn.style.opacity = on ? ".45" : "1";
      });
      document.body.appendChild(btn);
    });
  }
  setupCleanToggle();

  if (PREVIEW) {
    // 工作台实时预览：sessionStorage studio_preview_f = {title, photos}
    var cfg = null;
    try { cfg = JSON.parse(sessionStorage.getItem("studio_preview_f") || "null"); } catch (e) {}
    var photos = (cfg && cfg.photos) || [];
    applyTitle(cfg && cfg.title);
    window.__F_SHARE_PHOTOS = photos.map(function (p) { return p.url; });
    loadModule();
    return;
  }

  fetch("/f/api/photos?id=" + encodeURIComponent(ID))
    .then(function (r) { if (!r.ok) throw new Error("photos " + r.status); return r.json(); })
    .then(function (data) {
      applyTitle(data.title);
      window.__F_SHARE_PHOTOS = (data.photos || []).map(function (p) { return p.url; });
    })
    .catch(function (e) {
      console.warn("[f-boot] 灌入失败，仍打开应用:", e);
      window.__F_SHARE_PHOTOS = []; // 失败也留白，不挂示例图
    })
    .finally(loadModule);
})();
