// studio/build.js — 构建 studio 站点：
// 1) 复制 christmas-tree → public/tree/（保持原样，零改动）
// 2) 从 tree/app.js 提取 DEDICATION_KEY 常量值，写入 public/tree/studio-key.js
//    （题字注入需要 localStorage 键名；由脚本在本地提取，避免手抄出错）
// 3) 校验关键文件齐全
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SRC = path.resolve(ROOT, "..", "tree-src");
const PUB = path.join(ROOT, "public");
const TREE = path.join(PUB, "tree");

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

console.log("[1/3] 复制 christmas-tree → public/tree ...");
fs.rmSync(TREE, { recursive: true, force: true });
copyDir(SRC, TREE);

console.log("[2/3] 提取 DEDICATION_KEY ...");
const appJs = fs.readFileSync(path.join(TREE, "app.js"), "utf8");
const m = appJs.match(/const DEDICATION_KEY\s*=\s*"([^"]+)"/);
if (!m) { console.error("未能从 app.js 提取 DEDICATION_KEY"); process.exit(1); }
fs.writeFileSync(
  path.join(TREE, "studio-key.js"),
  `// 由 build.js 自动生成：题字 localStorage 键名\nwindow.STUDIO_DEDICATION_KEY = ${JSON.stringify(m[1])};\n`,
  "utf8"
);

console.log("[3/3] 注入引导脚本与预览补丁 ...");
const treeHtmlPath = path.join(TREE, "index.html");
let treeHtml = fs.readFileSync(treeHtmlPath, "utf8");
const injectTag = '<script src="studio-key.js"></script>\n<script src="studio-boot.js"></script>\n';
if (!treeHtml.includes("studio-boot.js")) {
  const origTag = '<script type="module" src="./app.js"></script>';
  if (!treeHtml.includes(origTag)) { console.error("index.html 中找不到 app.js 标签"); process.exit(1); }
  treeHtml = treeHtml.replace(origTag, injectTag + origTag);
  fs.writeFileSync(treeHtmlPath, treeHtml, "utf8");
}

// app.js 预览分支补丁：loadLocalPhotos 开头优先吃 studio_preview_photos
const appJsPath = path.join(TREE, "app.js");
let treeAppJs = fs.readFileSync(appJsPath, "utf8");
if (!treeAppJs.includes("studio_preview_photos")) {
  const anchor = "localPhotosLoaded = true;";
  const patch = anchor + `
  // [studio] 预览模式：优先加载 studio_preview_photos（由 studio-boot 从 sessionStorage 落盘）
  try {
    if (new URLSearchParams(location.search).get("preview") === "1") {
      const __pv = JSON.parse(localStorage.getItem("studio_preview_photos") || "[]");
      for (let __i = 0; __i < __pv.length; __i++) {
        addPhoto(__pv[__i].dataUrl, __pv[__i].name || ("回忆 " + String(__i + 1).padStart(2, "0")));
      }
      return;
    }
  } catch (__e) { /* 忽略 */ }`;
  if (!treeAppJs.includes(anchor)) { console.error("app.js 中找不到锚点，预览补丁未应用"); process.exit(1); }
  treeAppJs = treeAppJs.replace(anchor, patch);
  fs.writeFileSync(appJsPath, treeAppJs, "utf8");
}

// app.js 分享模式补丁：?id= 存在时自动进入净屏观赏（纯圣诞树）
let treeAppJs2 = fs.readFileSync(appJsPath, "utf8");
if (!treeAppJs2.includes("[studio] 分享模式")) {
  const anchor2 = "loadLocalPhotos();";
  const patch2 = anchor2 + `
  // [studio] 分享模式：?id= 存在时锁死净屏观赏，只留纯圣诞树（Esc / P / 退出按钮全部失效）
  if (new URLSearchParams(location.search).get("id")) {
    const __enter = () => { try { setPreviewMode(true); } catch (e) {} };
    setTimeout(__enter, 400);
    // 吞掉 Esc / P：捕获阶段拦在 app.js 的按键处理之前
    window.addEventListener("keydown", (__e) => {
      if (__e.key === "Escape" || __e.key === "Esc" || __e.key === "p" || __e.key === "P") {
        __e.stopImmediatePropagation();
        __e.preventDefault();
      }
    }, true);
    // 兜底：任何途径退出净屏都立刻拉回来
    setInterval(() => { if (!learnConfig.previewMode) __enter(); }, 600);
    // 隐藏「退出观赏」按钮
    const __hideExit = () => { const b = document.getElementById("cinema-exit"); if (b) b.style.display = "none"; };
    setTimeout(__hideExit, 500);
    setInterval(__hideExit, 1500);
  }`;
  if (!treeAppJs2.includes(anchor2)) { console.error("app.js 中找不到 loadLocalPhotos 调用，分享模式补丁未应用"); process.exit(1); }
  treeAppJs2 = treeAppJs2.replace(anchor2, patch2);
  fs.writeFileSync(appJsPath, treeAppJs2, "utf8");
}

// app.js 照片修复：/tree/?id= 分享页取照片时带上 id（否则函数返回空列表，图片不上树）
let treeAppJs4 = fs.readFileSync(appJsPath, "utf8");
if (!treeAppJs4.includes("[studio] 带id取照片")) {
  const anchor4 = 'const res = await fetch("./api/photos");';
  const patch4 = `// [studio] 带id取照片：分享页必须带上 ?id=，否则 /tree/api/photos 返回空
  const __sid = new URLSearchParams(location.search).get("id");
  const res = await fetch("./api/photos" + (__sid ? "?id=" + encodeURIComponent(__sid) : ""));`;
  if (!treeAppJs4.includes(anchor4)) { console.error("app.js 中找不到照片 fetch 锚点，带id补丁未应用"); process.exit(1); }
  treeAppJs4 = treeAppJs4.replace(anchor4, patch4);
  fs.writeFileSync(appJsPath, treeAppJs4, "utf8");
}

// app.js 自定义心愿短句补丁：showWishQuote 优先用 window.STUDIO_WISHES（studio-boot 注入）；
// window.STUDIO_WISHES_BLANK = true 时（心愿短句留空不显示）直接跳过，OK 手势不再浮现短句。
// 三个锚点都是单行（多行锚点会被 CRLF 坑），逐行替换。
let treeAppJs3 = fs.readFileSync(appJsPath, "utf8");
if (!treeAppJs3.includes("STUDIO_WISHES")) {
  const a = "  let i = Math.floor(Math.random() * WISHES.length);";
  const pa = `  // [studio] 心愿短句：留空不显示 → 直接跳过；否则优先用 STUDIO_WISHES
  if (window.STUDIO_WISHES_BLANK) return;
  const __W = (window.STUDIO_WISHES && window.STUDIO_WISHES.length) ? window.STUDIO_WISHES : WISHES;
  let i = Math.floor(Math.random() * __W.length);`;
  const b = "  if (i === lastWishIndex) i = (i + 1) % WISHES.length;";
  const pb = "  if (i === lastWishIndex) i = (i + 1) % __W.length;";
  const c3 = "  const [zh, en] = WISHES[i];";
  const pc = `  const __pick = __W[i];
  const zh = __pick[0];
  const en = __pick[1] || "";`;
  for (const [anc, pat, name] of [[a, pa, "随机段"], [b, pb, "去重段"], [c3, pc, "取值段"]]) {
    if (!treeAppJs3.includes(anc)) { console.error(`app.js 中找不到 showWishQuote ${name}锚点，心愿补丁未应用`); process.exit(1); }
    treeAppJs3 = treeAppJs3.replace(anc, pat);
  }
  fs.writeFileSync(appJsPath, treeAppJs3, "utf8");
}

// 复制 studio 自有树页资源（先于校验）
fs.copyFileSync(path.join(ROOT, "public-tree-assets", "studio-boot.js"), path.join(TREE, "studio-boot.js"));
fs.copyFileSync(path.join(ROOT, "public-tree-assets", "studio-fab.js"), path.join(TREE, "studio-fab.js"));

// 经典树页 index.html 引入「制作同款」可隐藏按钮（在 studio-boot 之后）
{
  const p = path.join(TREE, "index.html");
  let t = fs.readFileSync(p, "utf8");
  if (!t.includes("studio-fab.js")) {
    t = t.replace('<script src="studio-boot.js"></script>', '<script src="studio-boot.js"></script>\n<script src="studio-fab.js"></script>');
    fs.writeFileSync(p, t, "utf8");
  }
}
// 璀璨树 index.html 引入同一按钮
{
  const p = path.join(PUB, "b", "index.html");
  let t = fs.readFileSync(p, "utf8");
  if (!t.includes("studio-fab.js")) {
    t = t.replace('<script src="./boot.js"></script>', '<script src="./boot.js"></script>\n<script src="./studio-fab.js"></script>');
    fs.writeFileSync(p, t, "utf8");
  }
}
// 璀璨树目录放入按钮脚本（原版文件直接复用）
{
  const bDir = path.join(PUB, "b");
  if (fs.existsSync(bDir)) fs.copyFileSync(path.join(ROOT, "public-tree-assets", "studio-fab.js"), path.join(bDir, "studio-fab.js"));
}

// 璀璨树顶部文字自定义补丁：三个硬编码 children 改为读 window.__B_CUSTOM（boot.js 注入），
// 并给顶栏根 div 加 id="b-top-text"（供一键清屏 CSS 隐藏）。
{
  const p = path.join(PUB, "b", "assets", "index-CZPyPNXc.js");
  let t = fs.readFileSync(p, "utf8");
  if (!t.includes("__B_CUSTOM")) {
    const reps = [
      ['children:"CHRISTMAS EVE IS COMING"', 'children:window.__B_CUSTOM&&window.__B_CUSTOM.small||"CHRISTMAS EVE IS COMING"'],
      ['tracking-tight drop-shadow-lg",children:"Merry Christmas"', 'tracking-tight drop-shadow-lg",children:window.__B_CUSTOM&&window.__B_CUSTOM.title||"Merry Christmas"'],
      ['children:"璀璨圣诞树 · 点亮冬日心愿"', 'children:window.__B_CUSTOM&&window.__B_CUSTOM.sub||"璀璨圣诞树 · 点亮冬日心愿"'],
      ['return re.jsxs("div",{className:"absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 md:p-8"', 'return re.jsxs("div",{id:"b-top-text",className:"absolute inset-0 pointer-events-none z-10 flex flex-col justify-between p-6 md:p-8"'],
    ];
    for (const [anc, rep] of reps) {
      if (!t.includes(anc)) { console.error("璀璨树 bundle 找不到锚点: " + anc.slice(0, 50)); process.exit(1); }
      t = t.replace(anc, rep);
    }
    fs.writeFileSync(p, t, "utf8");
  }
}

// ===== C 型树（记忆漩涡，yftan）：路径改相对 + module 延迟 + bundle 补丁 =====
{
  const cDir = path.join(PUB, "c");
  if (fs.existsSync(cDir)) {
    // index.html：/assets/ 绝对路径 → ./assets/；module 标签换成 defer + c-boot 引导
    const hp = path.join(cDir, "index.html");
    let t = fs.readFileSync(hp, "utf8");
    if (!t.includes("c-boot.js")) {
      t = t.split('src="/assets/').join('src="./assets/');
      t = t.split('href="/assets/').join('href="./assets/');
      const modTag = t.match(/<script type="module" crossorigin src="\.\/assets\/[^"]+"><\/script>/);
      if (!modTag) { console.error("C index.html 找不到 module 标签"); process.exit(1); }
      const src = modTag[0].match(/src="([^"]+)"/)[1];
      t = t.replace(modTag[0],
        '<meta name="robots" content="noindex">\n' +
        '<script type="text/x-module-defer" data-src="' + src + '"></script>\n' +
        '<script src="./c-boot.js"></script>\n<script src="./studio-fab.js"></script>');
      fs.writeFileSync(hp, t, "utf8");
    }
    fs.copyFileSync(path.join(ROOT, "public-tree-assets", "studio-fab.js"), path.join(cDir, "studio-fab.js"));

    // bundle 补丁（一次性，打过的文件已含 __C_NAMES 标记）
    const bp = path.join(cDir, "assets", "index-DBC90deG.js");
    let b = fs.readFileSync(bp, "utf8");
    if (!b.includes("__C_NAMES")) {
      // ① 照片文件名数组：boot 注入 __C_NAMES 时用它，否则回落原 24 张（本地图缺失）
      const arrM = b.match(/const H=(\["2024_06_1\.jpg"[^\]]*\]);H\.sort\(\);/);
      if (!arrM) { console.error("C bundle 找不到照片数组锚点"); process.exit(1); }
      b = b.replace(arrM[0], () =>
        'const H=(globalThis.__C_NAMES&&globalThis.__C_NAMES.length?globalThis.__C_NAMES:' + arrM[1] + ');H.sort();');
      // ② 纹理 URL：优先查 __C_URLS（"/photos/<名>" → dataUrl），否则原路径
      const urlA = "Be=`/photos/${J}`;";
      if (!b.includes(urlA)) { console.error("C bundle 找不到 /photos/${J} 锚点"); process.exit(1); }
      b = b.replace(urlA, () => 'Be=(globalThis.__C_URLS&&globalThis.__C_URLS["/photos/"+J])||`/photos/${J}`;');
      // ③ picsum 随机网图兜底：默认留白必须关掉（__C_URLS 没有该图就直接放弃）
      const picA = 'p=>{console.warn(`⚠️ Local image not found: ${t}, loading random photo...`);';
      if (!b.includes(picA)) { console.error("C bundle 找不到 picsum 回退锚点"); process.exit(1); }
      b = b.replace(picA, () => 'p=>{if(!(globalThis.__C_URLS&&globalThis.__C_URLS[t]))return;console.warn(`⚠️ Local image not found: ${t}, loading random photo...`);');
      // ④ HUD 文字层加 id（一键清屏用）
      const hudA = 'className:"fixed inset-0 pointer-events-none z-20"';
      if (!b.includes(hudA)) { console.error("C bundle 找不到 HUD 根锚点"); process.exit(1); }
      b = b.replace(hudA, () => 'id:"c-hud",className:"fixed inset-0 pointer-events-none z-20"');
      // ⑤ MediaPipe wasm/模型绝对路径 → 相对（/c/ 子目录下 /wasm、/models 会 404 卡加载）
      const wasmA = 'oc.forVisionTasks("/wasm")';
      if (b.includes(wasmA)) b = b.replace(wasmA, () => 'oc.forVisionTasks("./wasm")');
      const modelA = 'modelAssetPath:"/models/gesture_recognizer.task"';
      if (b.includes(modelA)) b = b.replace(modelA, () => 'modelAssetPath:"./models/gesture_recognizer.task"');
      // ⑥ 3D 文字字体绝对路径 → 相对（troika 加载 /fonts 会 404 退化默认字体）
      const fontA = 'font:"/fonts/Cinzel-Bold.ttf"';
      if (b.includes(fontA)) b = b.split(fontA).join('font:"./fonts/Cinzel-Bold.ttf"');
      fs.writeFileSync(bp, b, "utf8");
    }
  }
}

// ===== D 型树（手势圣诞树，fuguther）：module 延迟 + 信息面板加 id =====
{
  const dDir = path.join(PUB, "d");
  if (fs.existsSync(dDir)) {
    const hp = path.join(dDir, "index.html");
    let t = fs.readFileSync(hp, "utf8");
    if (!t.includes("d-boot.js")) {
      const modTag = t.match(/<script type="module" crossorigin src="\.\/assets\/[^"]+"><\/script>/);
      if (!modTag) { console.error("D index.html 找不到 module 标签"); process.exit(1); }
      const src = modTag[0].match(/src="([^"]+)"/)[1];
      t = t.replace(modTag[0],
        '<meta name="robots" content="noindex">\n' +
        '<script type="text/x-module-defer" data-src="' + src + '"></script>\n' +
        '<script src="./d-boot.js"></script>\n<script src="./studio-fab.js"></script>');
      fs.writeFileSync(hp, t, "utf8");
    }
    fs.copyFileSync(path.join(ROOT, "public-tree-assets", "studio-fab.js"), path.join(dDir, "studio-fab.js"));

    const bp = path.join(dDir, "assets", "index-DHT1CRUH.js");
    let b = fs.readFileSync(bp, "utf8");
    if (!b.includes("d-info-panel")) {
      const panA = 'className:"bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-xl"';
      if (!b.includes(panA)) { console.error("D bundle 找不到信息面板锚点"); process.exit(1); }
      b = b.replace(panA, () => 'id:"d-info-panel",className:"bg-black/60 backdrop-blur-md p-4 rounded-xl border border-white/10 shadow-xl"');
      fs.writeFileSync(bp, b, "utf8");
    }
  }
}

console.log("[4/4] 校验 ...");
for (const f of ["index.html", "app.js", "vendor/three/three.module.js", "hand_landmarker.task", "studio-key.js", "studio-boot.js", "studio-fab.js"]) {
  if (!fs.existsSync(path.join(TREE, f))) { console.error("缺少 " + f); process.exit(1); }
}
// C/D 型校验
for (const [dir, boot, marker] of [
  ["c", "c-boot.js", "__C_NAMES"],
  ["d", "d-boot.js", "d-info-panel"],
]) {
  const base = path.join(PUB, dir);
  for (const f of ["index.html", boot, "studio-fab.js"]) {
    if (!fs.existsSync(path.join(base, f))) { console.error("缺少 /" + dir + "/" + f); process.exit(1); }
  }
  if (dir === "c") {
    const b = fs.readFileSync(path.join(base, "assets", "index-DBC90deG.js"), "utf8");
    if (!b.includes(marker)) { console.error("C bundle 补丁缺失"); process.exit(1); }
  } else {
    const b = fs.readFileSync(path.join(base, "assets", "index-DHT1CRUH.js"), "utf8");
    if (!b.includes(marker)) { console.error("D bundle 补丁缺失"); process.exit(1); }
  }
}

// 替换站长 GitHub 主页占位符（发布前由本脚本统一写入）
const OWNER = "https://github.com/Huaxun233";
for (const f of ["index.html", "studio.js"]) {
  const p = path.join(PUB, f);
  let t = fs.readFileSync(p, "utf8");
  if (t.includes("{{OWNER_GITHUB_URL}}")) {
    t = t.split("{{OWNER_GITHUB_URL}}").join(OWNER);
    fs.writeFileSync(p, t, "utf8");
  }
}

console.log("构建完成 → public/tree/");
