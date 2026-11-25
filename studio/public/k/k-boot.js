// k-boot.js — 花火（K 型）分享注入
// 通过 window.__K_BOOT_READY 把分享数据喂给主模块的 BOOT_CONFIG
(function () {
  var P = new URLSearchParams(location.search);
  window.HANABI_MODE = "appreciation"; // 分享/预览页一律欣赏模式（自动渲染粒子树）
  var base = { standalone: true, sharedDeveloper: true, draftKey: "hanabi-friend-developer-draft-v1", colorKey: "hanabi-friend-color-v1", legacyColorKey: "" };

  if (P.get("preview") === "1") {
    try {
      var raw = sessionStorage.getItem("studio_preview_k");
      if (raw) {
        var cfg = JSON.parse(raw);
        window.__K_BOOT_READY = Promise.resolve(merge(cfg.title, cfg.photos || []));
        return;
      }
    } catch (e) {}
    window.__K_BOOT_READY = Promise.resolve(base);
    return;
  }

  var id = P.get("id");
  if (!id) { window.__K_BOOT_READY = Promise.resolve(base); return; }
  window.__K_BOOT_READY = fetch("/k/api/photos?id=" + encodeURIComponent(id))
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) { return d ? merge(d.title, d.photos || []) : base; })
    .catch(function () { return base; });

  function merge(title, photos) {
    var c = Object.assign({}, base);
    if (title) c.message = title;
    if (photos && photos.length) {
      c.photos = photos.slice(0, 12).map(function (p) { return { src: p.dataUrl || p.url }; });
    }
    return c;
  }
})();
