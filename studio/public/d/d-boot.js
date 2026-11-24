// d-boot.js — 手势圣诞树（D 型）分享页引导（经典脚本，先于应用 module 执行）
// 无照片功能：分享内容 = 题字横幅（主行 + 可选副行）+ 一键清屏（隐藏信息面板与横幅）。
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

  function showBanner(title, sub) {
    if (!title && !sub) return;
    var make = function () {
      var b = document.createElement("div");
      b.id = "d-title-banner";
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
        "font-family:inherit;color:#e8d9a8;text-shadow:0 0 14px rgba(232,217,168,.45);" +
        "z-index:2147483000;pointer-events:none;white-space:nowrap;";
      document.body.appendChild(b);
    };
    if (document.body) make();
    else document.addEventListener("DOMContentLoaded", make);
  }

  // ===== 一键清屏：右下角 👁，toggle 隐藏应用自带信息面板 + 题字横幅 =====
  function setupCleanToggle() {
    var make = function () {
      if (document.getElementById("d-clean-btn")) return;
      var btn = document.createElement("button");
      btn.id = "d-clean-btn";
      btn.textContent = "👁";
      btn.title = "一键清屏 / 恢复文字";
      btn.setAttribute("style",
        "position:fixed;right:14px;bottom:14px;width:38px;height:38px;border-radius:50%;" +
        "border:1px solid rgba(232,217,168,.35);background:rgba(0,0,0,.45);color:#e8d9a8;" +
        "font-size:16px;cursor:pointer;z-index:2147482900;backdrop-filter:blur(4px);" +
        "transition:opacity .2s;line-height:1;padding:0;");
      btn.addEventListener("click", function () {
        var on = document.documentElement.classList.toggle("d-clean");
        btn.style.opacity = on ? ".45" : "1";
      });
      document.body.appendChild(btn);
      var css = document.createElement("style");
      css.textContent =
        "html.d-clean #d-info-panel{opacity:0!important;visibility:hidden!important}" +
        "html.d-clean #d-title-banner{display:none!important}";
      document.head.appendChild(css);
    };
    if (document.body) make();
    else document.addEventListener("DOMContentLoaded", make);
  }
  setupCleanToggle();

  if (PREVIEW) {
    var cfg = null;
    try { cfg = JSON.parse(sessionStorage.getItem("studio_preview_d") || "null"); } catch (e) {}
    var sub = cfg && cfg.custom && cfg.custom.sub ? cfg.custom.sub : "";
    showBanner(cfg && cfg.title, sub);
    loadModule();
    return;
  }

  fetch("/d/api/photos?id=" + encodeURIComponent(ID))
    .then(function (r) { if (!r.ok) throw new Error("photos " + r.status); return r.json(); })
    .then(function (data) {
      var sub = data.custom && data.custom.sub ? data.custom.sub : "";
      showBanner(data.title, sub);
    })
    .catch(function (e) { console.warn("[d-boot] 灌入失败，仍打开应用:", e); })
    .finally(loadModule);
})();
