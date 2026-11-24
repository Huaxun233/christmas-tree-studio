// studio/public/studio.js — 定制页逻辑：题字 + 照片（客户端压缩）+ 预览 + 发布
(function () {
  "use strict";
  var OWNER_GITHUB_URL = "https://github.com/Huaxun233"; // 发布时由脚本替换
  // 上面的占位符在本地开发时也保留原样——构建时替换；此处做兜底：
  var ghLink = document.querySelector(".gh-link");
  if (ghLink && ghLink.getAttribute("href").includes("{{")) {
    ghLink.href = "https://github.com/Huaxun233";
  }

  var photos = []; // [{name, dataUrl}]
  var MAX_PHOTOS = 30;
  var MAX_EDGE = 1280; // 压缩后长边
  var QUALITY = 0.82;

  var $ = function (id) { return document.getElementById(id); };
  var titleInput = $("title-input");
  var footInput = $("foot-input");
  var introZhInput = $("introzh-input");
  var introEnInput = $("introen-input");
  var wishesInput = $("wishes-input");
  var blankTitle = $("blank-title");
  var blankFoot = $("blank-foot");
  var blankIntroZh = $("blank-introzh");
  var blankIntroEn = $("blank-introen");
  var blankWishes = $("blank-wishes");
  // 勾选「留空不显示」后把对应输入框调暗（值保留但不发送）
  var BLANK_PAIRS = [
    [blankTitle, "title-wrap"], [blankFoot, "foot-wrap"],
    [blankIntroZh, "introzh-wrap"], [blankIntroEn, "introen-wrap"],
    [blankWishes, "wishes-wrap"],
  ];
  BLANK_PAIRS.forEach(function (pair) {
    var cb = pair[0], wrap = pair[1] && document.getElementById(pair[1]);
    if (!cb) return;
    cb.addEventListener("change", function () {
      if (wrap) wrap.classList.toggle("field-off", cb.checked);
      updatePreview();
    });
  });
  var advToggle = $("adv-toggle");
  var advBody = $("adv-body");
  var uploadZone = $("upload-zone");
  var fileInput = $("file-input");
  var thumbs = $("thumbs");
  var countEl = $("count");
  var preview = $("preview");
  var publishBtn = $("publish");
  var resultBox = $("result");
  var bNote = $("b-note");
  var advArea = $("adv-area");

  /* ---- 树类型选择：a=经典 / b=璀璨 ---- */
  var treeType = "a";
  var typeInputs = document.querySelectorAll('input[name="tree-type"]');
  Array.prototype.forEach.call(typeInputs, function (el) {
    el.addEventListener("change", function () {
      treeType = el.value;
      applyTypeUI();
      updatePreview();
    });
  });
  function applyTypeUI() {
    var isB = treeType === "b";
    var isC = treeType === "c";
    var isD = treeType === "d";
    var isFG = ["f","g","h","i","j","k","l","m"].indexOf(treeType) !== -1;
    if (advArea) advArea.style.display = (isB || isFG) ? "none" : "block";
    var bTextArea = $("b-text-area");
    if (bTextArea) bTextArea.style.display = isB ? "block" : "none";
    var cdTextArea = $("cd-text-area");
    if (cdTextArea) cdTextArea.style.display = (isC || isD) ? "block" : "none";
    // D 型没有照片功能：隐藏上传区
    if (uploadZone) uploadZone.style.display = isD ? "none" : "block";
    if (thumbs) thumbs.style.display = isD ? "none" : "block";
    if (countEl) countEl.textContent = isD ? "" : countEl.textContent;
    if (bNote) bNote.style.display = "none"; // 已有 B 型专属文字自定义，不再提示
  }

  // B 型树顶部文字：留空用默认
  function collectBCustom() {
    var g = function (id) { var el = $(id); return el ? el.value.trim() : ""; };
    var c = {};
    if (g("bsmall-input")) c.small = g("bsmall-input");
    if (g("btitle-input")) c.title = g("btitle-input");
    if (g("bsub-input")) c.sub = g("bsub-input");
    return Object.keys(c).length ? c : undefined;
  }
  ["bsmall-input", "btitle-input", "bsub-input"].forEach(function (id) {
    var el = $(id);
    if (el) el.addEventListener("input", updatePreview);
  });

  // C/D 型横幅副行
  var cdSubInput = $("cdsub-input");
  if (cdSubInput) cdSubInput.addEventListener("input", updatePreview);

  /* ---- 照片压缩 ---- */
  function compress(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
          var w = Math.round(img.width * scale), h = Math.round(img.height * scale);
          var canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL("image/jpeg", QUALITY));
        };
        img.onerror = function () { reject(new Error("图片读取失败")); };
        img.src = reader.result;
      };
      reader.onerror = function () { reject(new Error("文件读取失败")); };
      reader.readAsDataURL(file);
    });
  }

  function render() {
    thumbs.innerHTML = "";
    photos.forEach(function (p, i) {
      var d = document.createElement("div");
      d.className = "thumb";
      var img = document.createElement("img");
      img.src = p.dataUrl; img.alt = p.name;
      var del = document.createElement("button");
      del.textContent = "×"; del.setAttribute("aria-label", "删除");
      del.onclick = function () { photos.splice(i, 1); render(); };
      var idx = document.createElement("div");
      idx.className = "idx"; idx.textContent = i + 1;
      d.appendChild(img); d.appendChild(del); d.appendChild(idx);
      thumbs.appendChild(d);
    });
    countEl.textContent = photos.length ? "已选 " + photos.length + " 张照片" : "";
  }

  async function addFiles(files) {
    var list = Array.prototype.slice.call(files).filter(function (f) { return f.type.startsWith("image/"); });
    for (var i = 0; i < list.length && photos.length < MAX_PHOTOS; i++) {
      try {
        var dataUrl = await compress(list[i]);
        photos.push({ name: list[i].name.replace(/\.[^.]+$/, "").slice(0, 12), dataUrl: dataUrl });
      } catch (e) { console.warn(e); }
    }
    render();
    updatePreview();
  }

  /* ---- 自定义文案收集 ---- */
  function collectCustom() {
    var c = {};
    var blank = [];
    if (blankFoot && blankFoot.checked) { blank.push("foot"); }
    else if (footInput && footInput.value.trim()) { c.foot = footInput.value.trim(); }
    if (blankIntroZh && blankIntroZh.checked) { blank.push("introZh"); }
    else if (introZhInput && introZhInput.value.trim()) { c.introZh = introZhInput.value.trim(); }
    if (blankIntroEn && blankIntroEn.checked) { blank.push("introEn"); }
    else if (introEnInput && introEnInput.value.trim()) { c.introEn = introEnInput.value.trim(); }
    if (blankWishes && blankWishes.checked) { blank.push("wishes"); }
    else if (wishesInput && wishesInput.value.trim()) {
      c.wishes = wishesInput.value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 20);
    }
    if (blankTitle && blankTitle.checked) { blank.push("title"); }
    if (blank.length) c.blank = blank;
    return c;
  }

  // 题字默认空白：不填就传空串（树上不放题字），不回退默认文案
  function titleValue() {
    if (blankTitle && blankTitle.checked) return "";
    return titleInput.value.trim();
  }

  /* ---- 预览：sessionStorage 传配置（同源），iframe 加载后 boot 先于 app.js 执行 ---- */
  var previewTimer = null;
  function updatePreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(function () {
      var cfg = {
        title: titleValue(),
        custom: collectCustom(),
        photos: photos.map(function (p) { return { name: p.name, dataUrl: p.dataUrl }; }),
      };
      var isB = treeType === "b";
      var isC = treeType === "c";
      var isD = treeType === "d";
      var isF = treeType === "f";
      var isG = treeType === "g";
      var isH = treeType === "h"; var isI = treeType === "i"; var isJ = treeType === "j"; var isK = treeType === "k"; var isL = treeType === "l"; var isM = treeType === "m";
      if (isB) cfg.custom = collectBCustom();
      if (isC || isD) {
        cfg.custom = { sub: (cdSubInput && cdSubInput.value.trim()) || "" };
        if (isD) cfg.photos = []; // D 型无照片
      }
      if (isF || isG || isH) cfg.custom = undefined; // F/G/H 无文字自定义，题字即横幅
      var pkey = isB ? "studio_preview_b" : (isC ? "studio_preview_c" : (isD ? "studio_preview_d" : (isF ? "studio_preview_f" : (isG ? "studio_preview_g" : (isH ? "studio_preview_h" : (isI ? "studio_preview_i" : (isJ ? "studio_preview_j" : (isK ? "studio_preview_k" : (isL ? "studio_preview_l" : (isM ? "studio_preview_m" : "studio_preview"))))))))))
      try { sessionStorage.setItem(pkey, JSON.stringify(cfg)); } catch (e) {}
      var pdir = isB ? "b" : (isC ? "c" : (isD ? "d" : (isF ? "f" : (isG ? "g" : (isH ? "h" : (isI ? "i" : (isJ ? "j" : (isK ? "k" : (isL ? "l" : (isM ? "m" : "tree"))))))))));
      preview.src = "./" + pdir + "/?preview=1&t=" + Date.now();
    }, 400);
  }

  /* ---- 事件绑定 ---- */
  titleInput.addEventListener("input", updatePreview);
  [footInput, introZhInput, introEnInput, wishesInput].forEach(function (el) {
    if (el) el.addEventListener("input", updatePreview);
  });
  if (advToggle && advBody) {
    advToggle.addEventListener("click", function () {
      var open = advBody.style.display !== "none";
      advBody.style.display = open ? "none" : "block";
      advToggle.textContent = open ? "▸ 更多文字自定义" : "▾ 收起";
    });
  }
  uploadZone.addEventListener("click", function () { fileInput.click(); });
  fileInput.addEventListener("change", function () { addFiles(fileInput.files); fileInput.value = ""; });
  ["dragover", "dragenter"].forEach(function (ev) {
    uploadZone.addEventListener(ev, function (e) { e.preventDefault(); uploadZone.classList.add("drag"); });
  });
  ["dragleave", "drop"].forEach(function (ev) {
    uploadZone.addEventListener(ev, function (e) { e.preventDefault(); uploadZone.classList.remove("drag"); });
  });
  uploadZone.addEventListener("drop", function (e) { addFiles(e.dataTransfer.files); });

  publishBtn.addEventListener("click", async function () {
    publishBtn.disabled = true;
    publishBtn.textContent = "✦ 正在生成…";
    resultBox.classList.remove("show");
    try {
      var isB = treeType === "b";
      var isC = treeType === "c";
      var isD = treeType === "d";
      var isF = treeType === "f";
      var isG = treeType === "g";
      var isH = treeType === "h"; var isI = treeType === "i"; var isJ = treeType === "j"; var isK = treeType === "k"; var isL = treeType === "l"; var isM = treeType === "m";
      var api = isB ? "/api/create-b" : (isC ? "/api/create-c" : (isD ? "/api/create-d" : (isF ? "/api/create-f" : (isG ? "/api/create-g" : (isH ? "/api/create-h" : (isI ? "/api/create-i" : (isJ ? "/api/create-j" : (isK ? "/api/create-k" : (isL ? "/api/create-l" : (isM ? "/api/create-m" : "/api/create"))))))))));
      var custom = isB ? collectBCustom() : ((isC || isD) ? { sub: (cdSubInput && cdSubInput.value.trim()) || "" } : (isF || isG || isH ? undefined : collectCustom()));
      var res = await fetch(api, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title: titleValue(), photos: isD ? [] : photos, custom: custom }),
      });
      var data = await res.json();
      if (!res.ok) throw new Error(data.error || ("HTTP " + res.status));
      saveMyTree(data);
      var qr = qrDataUrl(data.url);
      var typeLabel = isB ? "✨ 璀璨圣诞树" : (isC ? "🌌 记忆漩涡树" : (isD ? "🫱 手势圣诞树" : (isF ? "🌟 星光璀璨树" : (isG ? "🎁 圣诞树空间" : (isH ? "🖤 黑金粒子树" : (isI ? "🎄 HHk手势树" : (isJ ? "🔷 赛博粒子树" : (isK ? "🎆 花火圣诞树" : (isL ? "🏝 星屿圣诞树" : (isM ? "🔮 魔法手势树" : "🎄 经典圣诞树"))))))))));
      resultBox.innerHTML =
        typeLabel + " 生成成功！永久链接：<br><a href=\"" + data.url + "\" target=\"_blank\" rel=\"noopener\">" + data.url + "</a><br>" +
        "<span style=\"color:var(--dim);font-size:12px\">点开即可玩，分享给朋友也用这条链接；长按二维码可保存/识别</span><br>" +
        (qr ? "<img class='result-qr' src='" + qr + "' alt='圣诞树链接二维码' width='132' height='132'>" : "") +
        "<div class=\"result-actions\">" +
        "<a class=\"mini-btn\" href=\"/my/\">📁 我的树</a>" +
        "<button class=\"mini-btn\" id=\"btn-mylink\">🔗 管理链接/二维码</button>" +
        "</div>";
      resultBox.classList.add("show");
      $("btn-mylink").onclick = function () { showLinkPanel(data); };
    } catch (e) {
      resultBox.innerHTML = "<span class='err'>生成失败：" + (e.message || e) + "</span>";
      resultBox.classList.add("show");
    } finally {
      publishBtn.disabled = false;
      publishBtn.textContent = "✦ 生成我的圣诞树链接";
    }
  });

  /* ---- 我的树：本地保存令牌 ---- */
  function myTrees() {
    try { return JSON.parse(localStorage.getItem("studio_my_trees")) || []; }
    catch (e) { return []; }
  }
  function saveMyTree(data) {
    if (!data || !data.ownerToken) return;
    var list = myTrees().filter(function (t) { return t.id !== data.id; });
    list.unshift({ id: data.id, title: titleValue(), token: data.ownerToken, type: treeType, createdAt: Date.now() });
    try { localStorage.setItem("studio_my_trees", JSON.stringify(list.slice(0, 200))); } catch (e) {}
  }
  // 面板里要展示的链接：把本机所有 token 打包进 ?t=（换设备找回用）
  function myLinkUrl() {
    var tokens = myTrees().map(function (t) { return t.token; });
    return location.origin + "/my/?t=" + tokens.join(",");
  }

  /* ---- 二维码：本地生成，返回 dataURL（img 可长按保存） ---- */
  function qrDataUrl(text) {
    try {
      var qr = qrcode(0, "M");
      qr.addData(text);
      qr.make();
      var cell = 4, margin = 4, n = qr.getModuleCount(), size = (n + margin * 2) * cell;
      var canvas = document.createElement("canvas");
      canvas.width = size; canvas.height = size;
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = "#0d1424";
      for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
        if (qr.isDark(r, c)) ctx.fillRect((c + margin) * cell, (r + margin) * cell, cell, cell);
      }
      return canvas.toDataURL("image/png");
    } catch (e) { return null; }
  }

  /* ---- 管理链接面板（含二维码，本地生成） ---- */
  function showLinkPanel(data) {
    if (data && data.ownerToken) saveMyTree(data);
    var old = document.getElementById("link-panel");
    if (old) old.remove();
    var url = myLinkUrl();
    var panel = document.createElement("div");
    panel.id = "link-panel";
    panel.innerHTML =
      "<div class='lp-card'>" +
      "<div class='lp-title'>我的管理链接</div>" +
      "<p class='lp-hint'>把它存到备忘录 / 收藏 / 微信收藏——<b>换手机或清缓存后，用它找回你所有的树</b>。链接能进你的管理页，别发给别人。</p>" +
      "<div class='lp-url'>" + url + "</div>" +
      "<div class='lp-actions'><button class='mini-btn' id='lp-copy'>复制链接</button><button class='mini-btn lp-ghost' id='lp-close'>关闭</button></div>" +
      "<div id='lp-qr' class='lp-qr'></div>" +
      "<p class='lp-hint dim'>手机扫码可直接打开；二维码在本机生成，不经过任何第三方。</p>" +
      "</div>";
    document.body.appendChild(panel);
    $("lp-close").onclick = function () { panel.remove(); };
    $("lp-copy").onclick = function () {
      var btn = $("lp-copy");
      var done = function () { btn.textContent = "✓ 已复制"; setTimeout(function () { btn.textContent = "复制链接"; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done, function () { fallbackCopy(url); done(); });
      } else { fallbackCopy(url); done(); }
    };
    // 二维码（qrcode-generator，vendored，离线；img 形式可长按保存）
    var qrImg = qrDataUrl(url);
    if (qrImg) {
      $("lp-qr").innerHTML = "<img src='" + qrImg + "' alt='管理链接二维码' width='168' height='168'>";
    } else {
      $("lp-qr").innerHTML = "<span class='lp-hint dim'>二维码生成失败，请用复制链接</span>";
    }
  }
  function fallbackCopy(text) {
    var ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } catch (e) {}
    ta.remove();
  }

  render();
  updatePreview();
})();
