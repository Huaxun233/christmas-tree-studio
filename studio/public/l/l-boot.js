// l-boot.js — 星屿（L 型）分享注入
// ?id=xxx → /l/api/photos → { title }；?preview=1 → 工作台预览灌入
(function () {
  var P = new URLSearchParams(location.search);
  if (P.get("preview") === "1") {
    try {
      var raw = sessionStorage.getItem("studio_preview_l");
      if (raw) {
        var cfg = JSON.parse(raw);
        applyTitle(cfg.title);
      }
    } catch (e) {}
    return;
  }
  var id = P.get("id");
  if (!id) return;
  fetch("/l/api/photos?id=" + encodeURIComponent(id)).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
    if (!d) return;
    applyTitle(d.title);
  }).catch(function () {});

  function applyTitle(t) {
    var h1 = document.querySelector("h1");
    if (!h1) return;
    if (t) h1.textContent = t;
    else h1.style.display = "none";
  }
})();
