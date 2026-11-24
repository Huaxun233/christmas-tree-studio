// j-boot.js — 赛博粒子圣诞树（J 型）分享注入
// ?id=xxx → /j/api/photos → { title, photos:[{url}] }；?preview=1 → 工作台预览
(function () {
  var P = new URLSearchParams(location.search);
  if (P.get("preview") === "1") {
    try {
      var raw = sessionStorage.getItem("studio_preview_j");
      if (raw) { var cfg = JSON.parse(raw); applyTitle(cfg.title); loadPhotos(cfg.photos || []); }
    } catch (e) {}
    return;
  }
  var id = P.get("id");
  if (!id) return;
  fetch("/j/api/photos?id=" + encodeURIComponent(id)).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d) return;
    applyTitle(d.title);
    loadPhotos(d.photos || []);
  }).catch(function () {});

  function applyTitle(t) {
    var el = document.querySelector("[data-j-title]");
    if (!el) return;
    if (t) el.textContent = t;
  }

  function loadPhotos(list) {
    if (!list.length) return;
    function drain() {
      if (typeof window.__cyberTreeAddPhoto !== "function") { setTimeout(drain, 150); return; }
      list.forEach(function (p) {
        var im = new Image();
        im.crossOrigin = "anonymous";
        im.onload = function () { window.__cyberTreeAddPhoto(im); };
        im.src = p.url;
      });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", drain);
    else drain();
  }
})();
