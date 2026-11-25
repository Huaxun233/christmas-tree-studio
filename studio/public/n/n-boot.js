// n-boot.js — 手势 3D 圣诞树（N 型，elf-mouse/xmas 镜像）分享页引导
// ?id=      : fetch /n/api/photos?id= 取题字与照片，拦截 data.json 请求注入照片
// ?preview=1: 工作台预览，空照片 + 默认题字
(function () {
  var PARAMS = new URLSearchParams(location.search);
  var ID = PARAMS.get("id") || "";
  var PREVIEW = PARAMS.get("preview") === "1";

  var PHOTOS = [];
  if (ID) {
    fetch("/n/api/photos?id=" + encodeURIComponent(ID))
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (d) {
        PHOTOS = (d.photos || []).map(function (p, i) {
          return { id: String(i + 1), src: p.url, caption: p.name || ("照片 " + (i + 1)) };
        });
        if (d.title !== undefined) globalThis.__N_TITLE = d.title; // 空串=隐藏题字
      })
      .catch(function () {})
      .finally(function () { globalThis.__N_BOOT_READY = true; });
  } else {
    globalThis.__N_BOOT_READY = true;
    if (PREVIEW) {
      try {
        var raw = sessionStorage.getItem("studio_preview_n");
        var cfg = raw ? JSON.parse(raw) : {};
        PHOTOS = (cfg.photos || []).map(function (p, i) { return { id: String(i + 1), src: p.dataUrl || p.url, caption: p.name || ("照片 " + (i + 1)) }; });
        globalThis.__N_TITLE = cfg.title !== undefined ? cfg.title : "";
      } catch (e) { globalThis.__N_TITLE = ""; }
    }
  }

  // 拦截 data.json：分享页用注入照片，预览用空
  var _fetch = window.fetch;
  window.fetch = function (url) {
    if (typeof url === "string" && url.indexOf("data.json") !== -1) {
      if (PHOTOS.length) {
        return Promise.resolve(new Response(JSON.stringify({ photos: PHOTOS }), { headers: { "Content-Type": "application/json" } }));
      }
      return Promise.resolve(new Response(JSON.stringify({ photos: [] }), { headers: { "Content-Type": "application/json" } }));
    }
    return _fetch.apply(window, arguments);
  };

  // 右下角 👁 一键清屏（隐藏顶部题字与右上按钮组、摄像头预览）
  function onReady(fn) {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", fn);
    else fn();
  }
  onReady(function () {
    if (!document.getElementById("n-clean-btn")) {
      var b = document.createElement("button");
      b.id = "n-clean-btn";
      b.textContent = "👁";
      b.title = "一键清屏 / 恢复";
      b.style.cssText = "position:fixed;right:14px;bottom:14px;z-index:2147482000;width:40px;height:40px;border-radius:50%;border:1px solid rgba(255,255,255,.25);background:rgba(10,10,26,.7);color:#fff;font-size:18px;cursor:pointer;";
      var clean = false;
      b.addEventListener("click", function () {
        clean = !clean;
        document.documentElement.classList.toggle("n-clean", clean);
      });
      document.body.appendChild(b);
      var st = document.createElement("style");
      st.textContent = "html.n-clean h1,html.n-clean h2,html.n-clean video,html.n-clean .absolute.top-6,html.n-clean .absolute.top-8{display:none!important}";
      document.head.appendChild(st);
    }
  });
})();
