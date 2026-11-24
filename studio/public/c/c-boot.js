// c-boot.js — 记忆漩涡树（C 型）分享页引导（经典脚本，先于应用 module 执行）
// 无 ?id= 非预览：原样打开（应用读 globalThis.__C_NAMES/__C_URLS，未设置时用内置默认）。
// 有 ?id= 或 preview=1：先取照片与文字，写入 window 变量后再放行 module。
//   __C_NAMES: 合成文件名数组（"2025_01_1.jpg"…，用于树内 year/month 螺旋定位）
//   __C_URLS:  { "/photos/<名>": dataUrl }（bundle 补丁把纹理 URL 改为查这张表）
// 默认留白：无照片时两张表为空，bundle 的 picsum 兜底被守卫拦截 → 纯净空树。
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

  // 照片列表 → 合成文件名 + URL 表。文件名用 2025_XX_N 结构给树内年月定位。
  function applyPhotos(list) {
    var names = [], urls = {};
    var photos = list || [];
    for (var i = 0; i < photos.length; i++) {
      var name = "2025_" + pad(Math.floor(i / 3) + 1) + "_" + (i % 3 + 1) + ".jpg";
      names.push(name);
      urls["/photos/" + name] = photos[i].url || photos[i].dataUrl || "";
    }
    window.__C_NAMES = names;
    window.__C_URLS = urls;
    return names.length;
  }
  function pad(n) { return String(n).padStart(2, "0"); }

  function applyCustom(custom) {
    if (custom && typeof custom === "object") window.__C_CUSTOM = custom;
  }

  // 金色题字横幅（主行 = 题字，副行 = 自定义 sub），都空则不显示
  function showBanner(title, sub) {
    if (!title && !sub) return;
    var make = function () {
      var b = document.createElement("div");
      b.id = "c-title-banner";
      if (title) {
        var t1 = document.createElement("div");
        t1.textContent = title;
        t1.style.cssText = "font-size:clamp(18px,3vw,28px);letter-spacing:.14em;";
        b.appendChild(t1);
      }
      if (sub) {
        var t2 = document.createElement("div");
        t2.textContent = sub;
        t2.style.cssText = "font-size:13px;opacity:.8;margin-top:6px;letter-spacing:.24em;";
        b.appendChild(t2);
      }
      b.style.cssText =
        "position:fixed;top:14px;left:50%;transform:translateX(-50%);text-align:center;" +
        "font-family:'Cinzel','Noto Serif SC',serif;color:#e8d9a8;" +
        "text-shadow:0 0 14px rgba(232,217,168,.45);z-index:2147483000;pointer-events:none;white-space:nowrap;";
      document.body.appendChild(b);
    };
    if (document.body) make();
    else document.addEventListener("DOMContentLoaded", make);
  }

  // ===== 一键清屏：右下角 👁，toggle 隐藏 HUD 文字层 + 题字横幅 =====
  function setupCleanToggle() {
    var make = function () {
      if (document.getElementById("c-clean-btn")) return;
      var btn = document.createElement("button");
      btn.id = "c-clean-btn";
      btn.textContent = "👁";
      btn.title = "一键清屏 / 恢复文字";
      btn.setAttribute("style",
        "position:fixed;right:14px;bottom:14px;width:38px;height:38px;border-radius:50%;" +
        "border:1px solid rgba(232,217,168,.35);background:rgba(0,0,0,.45);color:#e8d9a8;" +
        "font-size:16px;cursor:pointer;z-index:2147482900;backdrop-filter:blur(4px);" +
        "transition:opacity .2s;line-height:1;padding:0;");
      btn.addEventListener("click", function () {
        var on = document.documentElement.classList.toggle("c-clean");
        btn.style.opacity = on ? ".45" : "1";
      });
      document.body.appendChild(btn);
      var css = document.createElement("style");
      css.textContent =
        "html.c-clean #c-hud{opacity:0!important;visibility:hidden!important}" +
        "html.c-clean #c-title-banner{display:none!important}";
      document.head.appendChild(css);
    };
    if (document.body) make();
    else document.addEventListener("DOMContentLoaded", make);
  }
  setupCleanToggle();

  if (PREVIEW) {
    var cfg = null;
    try { cfg = JSON.parse(sessionStorage.getItem("studio_preview_c") || "null"); } catch (e) {}
    var sub = cfg && cfg.custom && cfg.custom.sub ? cfg.custom.sub : "";
    applyCustom(cfg && cfg.custom);
    showBanner(cfg && cfg.title, sub);
    window.__C_SHARE = { preview: true, count: applyPhotos((cfg && cfg.photos) || []) };
    loadModule();
    return;
  }

  fetch("/c/api/photos?id=" + encodeURIComponent(ID))
    .then(function (r) { if (!r.ok) throw new Error("photos " + r.status); return r.json(); })
    .then(function (data) {
      var sub = data.custom && data.custom.sub ? data.custom.sub : "";
      applyCustom(data.custom);
      showBanner(data.title, sub);
      window.__C_SHARE = { id: ID, count: applyPhotos(data.photos) };
    })
    .catch(function (e) { console.warn("[c-boot] 灌入失败，仍打开应用:", e); })
    .finally(loadModule);
})();
