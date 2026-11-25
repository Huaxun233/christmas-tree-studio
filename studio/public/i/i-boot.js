// i-boot.js — HHk 圣诞树（I 型）分享注入
// ?id=xxx → /i/api/photos → { title, photos:[{url,name}] }；?preview=1 → 工作台预览
(function () {
  var P = new URLSearchParams(location.search);
  if (P.get("preview") === "1") {
    try {
      var raw = sessionStorage.getItem("studio_preview_i");
      if (raw) { var cfg = JSON.parse(raw); applyTitle(cfg.title); loadPhotos((cfg.photos || []).map(function (p) { return p.dataUrl || p.url; })); }
    } catch (e) {}
    return;
  }
  var id = P.get("id");
  if (!id) return;
  fetch("/i/api/photos?id=" + encodeURIComponent(id)).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d) return;
    applyTitle(d.title);
    loadPhotos(d.photos || []);
  }).catch(function () {});

  // 👁 清屏：隐藏标题/按钮组/手势面板，再点一次恢复
  function initClean() {
    if (document.getElementById("i-clean-btn")) return;
    var btn = document.createElement("button");
    btn.id = "i-clean-btn";
    btn.type = "button";
    btn.title = "净屏切换";
    btn.textContent = "👁";
    btn.addEventListener("click", function () {
      document.documentElement.classList.toggle("i-clean");
    });
    document.body.appendChild(btn);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initClean);
  else initClean();

  function applyTitle(t) {
    var h1 = document.querySelector("h1[data-i-title]") || document.querySelector("h1");
    if (!h1) return;
    if (t) h1.textContent = t;
    else h1.style.display = "none";
  }

  // 把分享照片画进画布后走原生 addPhotoCanvas（等 DOM ready，脚本在 head 提前执行）
  function loadPhotos(list) {
    if (!list.length) return;
    var urls = list.map(function (p) { return p.url; });
    function drain() {
      if (typeof addPhotoCanvas !== "function") { setTimeout(drain, 120); return; }
      urls.forEach(function (u) {
        var im = new Image();
        im.crossOrigin = "anonymous";
        im.onload = function () {
          var cv = document.createElement("canvas");
          cv.width = im.naturalWidth; cv.height = im.naturalHeight;
          cv.getContext("2d").drawImage(im, 0, 0);
          addPhotoCanvas(cv, im.naturalWidth, im.naturalHeight);
        };
        im.src = u;
      });
    }
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", drain);
    else drain();
  }
})();
