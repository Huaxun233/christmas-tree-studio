// g-boot.js — 圣诞树空间（G 型，zebo）分享页引导（经典脚本，先于应用 module 执行）
// 无 ?id= 时直接放行 module（纯本地玩法）；有 ?id= / ?preview=1 时：
//   1. fetch /g/api/photos?id= 取题字与照片（dataUrl 数组，上限 12）
//   2. 写 window.__G_PHOTOS / __G_TITLE / __G_SHARE（bundle 补丁读取）
//   3. 注入金色题字横幅（常显，CustomTextOverlay 仅聚焦星星时出现）
//   4. 动态加载被延迟的 module
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

  function showBanner(title) {
    if (!title) return;
    var make = function () {
      var b = document.createElement("div");
      b.id = "g-title-banner";
      b.textContent = title;
      b.setAttribute("style",
        "position:fixed;top:14px;left:50%;transform:translateX(-50%);" +
        "font-size:clamp(18px,3vw,28px);font-weight:600;" +
        "background:linear-gradient(90deg,#fef08a,#fbbf24,#fde68a);" +
        "-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;" +
        "filter:drop-shadow(0 0 12px rgba(253,224,71,.45));" +
        "z-index:2147483000;pointer-events:none;white-space:nowrap;");
      document.body.appendChild(b);
    };
    if (document.body) make();
    else document.addEventListener("DOMContentLoaded", make);
  }

  // ===== 一键清屏：右下角 👁，隐藏题字横幅 + glass 悬浮组件（手势指示/上传/音频等）=====
  function setupCleanToggle() {
    onReady(function () {
      if (document.getElementById("g-clean-btn")) return;
      var btn = document.createElement("button");
      btn.id = "g-clean-btn";
      btn.textContent = "👁";
      btn.title = "一键清屏 / 恢复文字";
      btn.setAttribute("style",
        "position:fixed;right:14px;bottom:14px;width:38px;height:38px;border-radius:50%;" +
        "border:1px solid rgba(253,224,71,.35);background:rgba(0,0,0,.45);color:#fde047;" +
        "font-size:16px;cursor:pointer;z-index:2147482900;backdrop-filter:blur(4px);" +
        "transition:opacity .2s;line-height:1;padding:0;");
      btn.addEventListener("click", function () {
        var on = document.documentElement.classList.toggle("g-clean");
        btn.style.opacity = on ? ".45" : "1";
      });
      document.body.appendChild(btn);
      var css = document.createElement("style");
      css.textContent =
        "html.g-clean #g-title-banner{display:none!important}" +
        "html.g-clean .glass,html.g-clean .glass-gold{opacity:0!important;pointer-events:none!important}";
      document.head.appendChild(css);
    });
  }
  setupCleanToggle();

  if (PREVIEW) {
    // 工作台实时预览：sessionStorage studio_preview_g = {title, photos}
    var cfg = null;
    try { cfg = JSON.parse(sessionStorage.getItem("studio_preview_g") || "null"); } catch (e) {}
    var photos = (cfg && cfg.photos) || [];
    window.__G_SHARE = true;
    window.__G_PHOTOS = photos.map(function (p) { return p.url; });
    window.__G_TITLE = (cfg && cfg.title) || "";
    showBanner(cfg && cfg.title);
    loadModule();
    return;
  }

  fetch("/g/api/photos?id=" + encodeURIComponent(ID))
    .then(function (r) { if (!r.ok) throw new Error("photos " + r.status); return r.json(); })
    .then(function (data) {
      window.__G_SHARE = true;
      window.__G_PHOTOS = (data.photos || []).map(function (p) { return p.url; });
      window.__G_TITLE = data.title || "";
      showBanner(data.title);
    })
    .catch(function (e) {
      console.warn("[g-boot] 灌入失败，仍打开应用:", e);
      window.__G_SHARE = true;
      window.__G_PHOTOS = []; // 失败留白，不挂占位图
    })
    .finally(loadModule);
})();
