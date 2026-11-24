// h-boot.js — 黑金粒子树（H 型，electronicminer 镜像）分享页引导（普通脚本，先于内联 module 执行）
// ?id=  : fetch /h/api/photos?id= 取题字与照片，存 window.__H_DATA_P（loadPredefinedImages await）
// ?preview=1 : 工作台预览，空数据（不扫本地图）
// 右下角 👁 一键清屏（隐藏 UI 层 + 横幅类），仅分享/预览页注入
(function () {
  var PARAMS = new URLSearchParams(location.search);
  var ID = PARAMS.get("id") || "";
  var PREVIEW = PARAMS.get("preview") === "1";

  function onReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  // 题字：#ui-layer h1（金色悬挂），留空隐藏
  function applyTitle(title) {
    onReady(function () {
      var h1 = document.querySelector("#ui-layer h1");
      if (!h1) return;
      if (title) h1.textContent = title;
      else h1.style.display = "none";
    });
  }

  if (ID) {
    window.__H_DATA_P = fetch("/h/api/photos?id=" + encodeURIComponent(ID))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        window.__H_SHARE = true;
        applyTitle(d.title || "");
        return { photos: d.photos || [] };
      })
      .catch(function () { return { photos: [] }; });
  } else if (PREVIEW) {
    window.__H_DATA_P = Promise.resolve({ photos: [] });
  }

  // ===== 一键清屏：右下角 👁，隐藏全部 UI（h1/controls/webcam/debug/stats） =====
  function setupCleanToggle() {
    onReady(function () {
      if (document.getElementById("h-clean-btn")) return;
      var btn = document.createElement("button");
      btn.id = "h-clean-btn";
      btn.textContent = "👁";
      btn.title = "一键净屏观赏";
      btn.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:9999;width:44px;height:44px;"
        + "border-radius:50%;border:1px solid rgba(212,175,55,.55);background:rgba(10,10,14,.72);"
        + "color:#d4af37;font-size:20px;cursor:pointer;backdrop-filter:blur(4px);";
      var CLEAN = ["#ui-layer h1", ".controls-wrapper", "#webcam-wrapper", "#debug-info", "#footer-stats", "#msg-box"];
      var clean = false;
      btn.addEventListener("click", function () {
        clean = !clean;
        CLEAN.forEach(function (sel) {
          var el = document.querySelector(sel);
          if (el) el.style.display = clean ? "none" : "";
        });
        btn.textContent = clean ? "🎄" : "👁";
        btn.title = clean ? "恢复界面" : "一键净屏观赏";
      });
      document.body.appendChild(btn);
    });
  }

  if (ID || PREVIEW) setupCleanToggle();
})();
