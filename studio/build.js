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

console.log("[4/4] 校验 ...");
for (const f of ["index.html", "app.js", "vendor/three/three.module.js", "hand_landmarker.task", "studio-key.js", "studio-boot.js"]) {
  if (!fs.existsSync(path.join(TREE, f))) { console.error("缺少 " + f); process.exit(1); }
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
