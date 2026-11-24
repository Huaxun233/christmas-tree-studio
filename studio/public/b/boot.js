// boot.js — 璀璨树分享页引导（经典脚本，先于应用 module 执行）
// 无 ?id= 时直接放行 module（纯本地玩法）；有 ?id= 时：
//   1. fetch /b/api/photos?id= 取题字与照片
//   2. 清空 IndexedDB(christmas-tree/gallery) 防串树，灌入本棵照片 blob
//   3. 清除 ct_removed_defaults（避免本地黑名单屏蔽灌入的默认图）
//   4. 注入金色题字横幅，再动态加载被延迟的 module
(function () {
  var TAG = document.querySelector('script[type="text/x-module-defer"]');
  var SRC = TAG && TAG.getAttribute("data-src");
  var PARAMS = new URLSearchParams(location.search);
  var ID = PARAMS.get("id") || "";
  var PREVIEW = PARAMS.get("preview") === "1";
  if (!SRC) return;
  if (!ID && !PREVIEW) return loadModule(); // 无 id 非预览：原样打开

  function loadModule() {
    var s = document.createElement("script");
    s.type = "module";
    s.src = SRC;
    s.crossOrigin = "anonymous";
    document.head.appendChild(s);
  }

  function dataURLToBlob(dataUrl) {
    var parts = dataUrl.split(",");
    var mime = (parts[0].match(/data:([^;]+)/) || [])[1] || "image/jpeg";
    var bin = atob(parts[1]);
    var arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  function openGallery() {
    return new Promise(function (res, rej) {
      var rq = indexedDB.open("christmas-tree", 1);
      rq.onupgradeneeded = function () {
        var db = rq.result;
        if (!db.objectStoreNames.contains("gallery")) {
          db.createObjectStore("gallery", { keyPath: "id" });
        }
      };
      rq.onsuccess = function () { res(rq.result); };
      rq.onerror = function () { rej(rq.error); };
    });
  }

  // 清旧照片 + 灌入 photos（[{url:dataUrl,name}]），返回张数
  function injectPhotos(photos) {
    return openGallery().then(function (db) {
      return new Promise(function (res, rej) {
        var tx = db.transaction("gallery", "readwrite");
        tx.objectStore("gallery").clear();
        var n = 0, list = photos || [];
        list.forEach(function (p, i) {
          try {
            tx.objectStore("gallery").put({ id: "share-" + i, blob: dataURLToBlob(p.url) });
            n++;
          } catch (e) { /* 单张失败跳过 */ }
        });
        tx.oncomplete = function () { res(n); };
        tx.onerror = function () { rej(tx.error); };
      });
    });
  }

  function showBanner(title) {
    if (!title) return;
    var make = function () {
      var b = document.createElement("div");
      b.id = "b-title-banner";
      b.textContent = title;
      b.setAttribute("style",
        "position:fixed;top:14px;left:50%;transform:translateX(-50%);" +
        "font-family:'Noto Serif SC','Playfair Display',serif;font-size:clamp(18px,3vw,28px);" +
        "color:#ffd98a;text-shadow:0 0 14px rgba(255,217,138,.55);letter-spacing:.12em;" +
        "z-index:2147483000;pointer-events:none;white-space:nowrap;");
      document.body.appendChild(b);
    };
    // boot.js 在 <head> 里执行时 body 尚不存在
    if (document.body) make();
    else document.addEventListener("DOMContentLoaded", make);
  }

  // ===== 一键清屏：右下角 👁 按钮，toggle 隐藏顶部文字区 + 题字横幅 =====
  function setupCleanToggle() {
    var make = function () {
      if (document.getElementById("b-clean-btn")) return;
      var btn = document.createElement("button");
      btn.id = "b-clean-btn";
      btn.textContent = "👁";
      btn.title = "一键清屏 / 恢复文字";
      btn.setAttribute("style",
        "position:fixed;right:14px;bottom:14px;width:38px;height:38px;border-radius:50%;" +
        "border:1px solid rgba(255,217,138,.35);background:rgba(0,0,0,.45);color:#ffd98a;" +
        "font-size:16px;cursor:pointer;z-index:2147482900;backdrop-filter:blur(4px);" +
        "transition:opacity .2s;line-height:1;padding:0;");
      btn.addEventListener("click", function () {
        var on = document.documentElement.classList.toggle("b-clean");
        btn.style.opacity = on ? ".45" : "1";
      });
      document.body.appendChild(btn);
      var css = document.createElement("style");
      css.textContent =
        "html.b-clean #b-top-text{opacity:0!important;visibility:hidden!important}" +
        "html.b-clean #b-title-banner{display:none!important}";
      document.head.appendChild(css);
    };
    if (document.body) make();
    else document.addEventListener("DOMContentLoaded", make);
  }
  setupCleanToggle();

  // ===== 顶部文字自定义：window.__B_CUSTOM = {small, title, sub}（须在 module 加载前写入）=====
  function applyBCustom(custom) {
    if (custom && typeof custom === "object") window.__B_CUSTOM = custom;
  }

  if (PREVIEW) {
    // 工作台实时预览：sessionStorage studio_preview_b = {title, photos}
    var cfg = null;
    try { cfg = JSON.parse(sessionStorage.getItem("studio_preview_b") || "null"); } catch (e) {}
    var photos = (cfg && cfg.photos) || [];
    var title = (cfg && cfg.title) || "";
    applyBCustom(cfg && cfg.custom);
    showBanner(title);
    injectPhotos(photos)
      .then(function (n) {
        try { localStorage.removeItem("ct_removed_defaults"); } catch (e) {}
        window.__B_SHARE = { preview: true, count: n };
      })
      .catch(function (e) { console.warn("[b-boot] 预览灌入失败:", e); })
      .finally(loadModule);
    return;
  }

  fetch("/b/api/photos?id=" + encodeURIComponent(ID))
    .then(function (r) { if (!r.ok) throw new Error("photos " + r.status); return r.json(); })
    .then(function (data) {
      applyBCustom(data.custom);
      showBanner(data.title);
      return injectPhotos(data.photos);
    })
    .then(function (n) {
      try { localStorage.removeItem("ct_removed_defaults"); } catch (e) {}
      window.__B_SHARE = { id: ID, count: n };
    })
    .catch(function (e) {
      console.warn("[b-boot] 灌入失败，仍打开应用:", e);
      try { localStorage.removeItem("ct_removed_defaults"); } catch (_) {}
    })
    .finally(loadModule);
})();
