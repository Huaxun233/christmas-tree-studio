// m-boot.js — Gemini 3D 手势圣诞树（M 型，Aaronguoping/Gemini--3D- 镜像）分享页引导
// ?id=      : fetch /m/api/photos?id= 取题字与照片，window.__M_BOOT = promise → {title, photos}
// ?preview=1: 工作台预览，空数据
// 右下角 👁 一键清屏（隐藏顶部题字 h1 + 右上按钮组 + 摄像头预览）
(function () {
  var PARAMS = new URLSearchParams(location.search);
  var ID = PARAMS.get("id") || "";
  var PREVIEW = PARAMS.get("preview") === "1";

  if (ID) {
    window.__M_BOOT = fetch("/m/api/photos?id=" + encodeURIComponent(ID))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) { return { title: d.title || "", photos: (d.photos || []).map(function (p) { return p.url; }) }; })
      .catch(function () { return { photos: [] }; });
  } else if (PREVIEW) {
    window.__M_BOOT = Promise.resolve({ photos: [] });
  }

  function onReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }

  // ===== 一键清屏：右下角 👁，React 渲染的 h1 在 absolute 顶层容器里 =====
  function setupCleanToggle() {
    onReady(function () {
      if (document.getElementById("m-clean-btn")) return;
      var btn = document.createElement("button");
      btn.id = "m-clean-btn";
      btn.textContent = "👁";
      btn.title = "一键净屏观赏";
      btn.style.cssText = "position:fixed;right:18px;bottom:18px;z-index:9999;width:44px;height:44px;"
        + "border-radius:50%;border:1px solid rgba(255,215,0,.55);background:rgba(8,8,10,.72);"
        + "color:#ffd700;font-size:20px;cursor:pointer;backdrop-filter:blur(4px);";
      function findTargets() {
        var t = [];
        // 题字 h1（React 渲染，位于 absolute 顶层容器）
        document.querySelectorAll("h1").forEach(function (h) { t.push(h); });
        // 右上按钮组（音乐/上传/全屏的父容器）
        document.querySelectorAll("div.absolute.top-6.right-6, div.absolute.top-8").forEach(function (d) { t.push(d); });
        // 摄像头预览 video 元素
        document.querySelectorAll("video").forEach(function (v) { t.push(v); });
        return t;
      }
      var clean = false;
      btn.addEventListener("click", function () {
        clean = !clean;
        findTargets().forEach(function (el) { el.style.display = clean ? "none" : ""; });
        btn.textContent = clean ? "🎄" : "👁";
        btn.title = clean ? "恢复界面" : "一键净屏观赏";
      });
      document.body.appendChild(btn);
    });
  }

  if (ID || PREVIEW) setupCleanToggle();
})();
