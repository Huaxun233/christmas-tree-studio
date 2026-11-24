// studio-fab.js — 「制作同款」悬浮按钮（两款树通用）
// 无 ?id= 非预览：普通访问也给入口；分享页/预览 iframe 由页面各自逻辑控制。
// 可隐藏：右上角小 ✕，只隐藏当前这次访问（点 ✕ 直接移除；下次打开树会重新出现）。
(function () {
  var PARAMS = new URLSearchParams(location.search);
  if (PARAMS.get("preview") === "1") return; // 工作台预览 iframe 里不显示

  function createFab() {
    var fab = document.createElement("a");
    fab.href = "/";
    fab.textContent = "✨ 制作同款";
    fab.className = "studio-fab";
    fab.id = "studio-fab";
    fab.style.cssText = "position:fixed;left:14px;bottom:14px;z-index:2147482000;" +
      "display:inline-block;padding:10px 16px;border-radius:999px;" +
      "background:rgba(255,255,255,.92);color:#c0392b;font:bold 14px/1 sans-serif;" +
      "text-decoration:none;box-shadow:0 4px 14px rgba(0,0,0,.35);user-select:none;transition:opacity .15s;";
    fab.addEventListener("touchstart", function () {}, { passive: true });

    // 隐藏小按钮：紧贴 fab 右上角的 ✕（仅本次访问生效）
    var hide = document.createElement("span");
    hide.textContent = "✕";
    hide.title = "隐藏这个按钮（下次打开会重新出现）";
    hide.setAttribute("style",
      "position:fixed;left:158px;bottom:44px;z-index:2147482001;width:18px;height:18px;" +
      "line-height:17px;text-align:center;border-radius:50%;background:rgba(60,60,60,.55);" +
      "color:#fff;font:11px/1 sans-serif;cursor:pointer;user-select:none;");
    hide.addEventListener("click", function (ev) {
      ev.preventDefault(); ev.stopPropagation();
      fab.remove();
      hide.remove();
    });
    document.body.appendChild(fab);
    document.body.appendChild(hide);
  }

  if (document.body) createFab();
  else document.addEventListener("DOMContentLoaded", createFab);
})();
