// 同步 nobody-r/christmas-tree 静态资源到 studio/public/b/
import { spawnSync } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "studio", "public", "b");
const ORIGIN = "https://nobody-r.github.io/christmas-tree";
const PROXY = process.env.HTTPS_PROXY || "http://127.0.0.1:7897";

function curl(url, { allowEmpty = false } = {}) {
  const r = spawnSync("curl.exe", ["-sL", "--fail", "--proxy", PROXY, url], {
    encoding: "buffer", maxBuffer: 128 * 1024 * 1024,
  });
  if (r.status !== 0 || !r.stdout || (!allowEmpty && r.stdout.length === 0)) {
    throw new Error(`curl ${url} 失败 exit=${r.status}`);
  }
  return r.stdout || Buffer.alloc(0);
}

function save(rel, buf) {
  const dest = join(OUT, rel.replace(/^\//, "").replace(/^\.\//, ""));
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, buf);
  console.log(`  ✓ ${rel} (${(buf.length / 1024).toFixed(0)} KB)`);
  return buf.length;
}

mkdirSync(OUT, { recursive: true });
let total = 0, count = 0;
const index = curl(`${ORIGIN}/`).toString("utf8");

// 1. 通过 jsdelivr 列出仓库文件清单（main 分支）
let files = [];
try {
  const meta = JSON.parse(curl("https://data.jsdelivr.com/v1/packages/gh/nobody-r/christmas-tree@main").toString("utf8"));
  const walk = (nodes, prefix) => {
    for (const n of nodes) {
      if (n.type === "directory") walk(n.files || [], `${prefix}${n.name}/`);
      else if (n.type === "file") files.push(`${prefix}${n.name}`);
    }
  };
  walk(meta.files || [], "");
} catch (e) {
  console.warn("jsdelivr 清单失败，退化为只抓 index 引用:", e.message);
}
// 只镜像静态目录（不要 docs/README 等）
files = files.filter(f => /^(assets|audio|mediapipe|images)\//.test(f));
console.log("仓库静态文件:", files.length);

for (const f of files) {
  let buf;
  try {
    buf = curl(`https://cdn.jsdelivr.net/gh/nobody-r/christmas-tree@main/${f}`, { allowEmpty: true });
  } catch {
    console.log(`  ↻ jsdelivr 失败，改从源站抓 ${f}`);
    buf = curl(`${ORIGIN}/${f}`, { allowEmpty: true });
  }
  total += save("./" + f, buf);
  count++;
}
// index.html 本体从源站抓（含未来的路径形态）
total += save("./index.html", Buffer.from(index)); count++;

// 2. 改写 index.html
let html = index;
if (!/B-BOOTSTRAP/.test(html)) {
  const m = html.match(/<script\s+type="module"[^>]*src="([^"]+)"[^>]*>/i);
  if (!m) throw new Error("未找到 module script 标签");
  const rel = m[1].replace(/^\.\//, "./");
  html = html.replace(m[0],
    `<!--B-BOOTSTRAP-->\n<script type="text/x-module-defer" data-src="${rel}"></script>\n<script src="./boot.js"></script>`);
}
html = html.replace(/<title>/, '<meta name="robots" content="noindex">\n<title>');
writeFileSync(join(OUT, "index.html"), html);

// 3. 校验
const out = readFileSync(join(OUT, "index.html"), "utf8");
const absRefs = out.match(/(?:src|href)="\/(?:assets|audio|mediapipe)\//g);
if (absRefs) { console.error("✗ 仍有绝对引用:", absRefs); process.exit(1); }
if (!out.includes("B-BOOTSTRAP")) { console.error("✗ 缺 bootstrap 占位"); process.exit(1); }
if (!files.some(f => f.startsWith("assets/"))) { console.error("✗ assets 未抓到"); process.exit(1); }
if (!files.some(f => f.startsWith("mediapipe/"))) { console.error("✗ mediapipe 未抓到"); process.exit(1); }
console.log(`\n完成：${count} 个文件，共 ${(total / 1024 / 1024).toFixed(1)} MB → ${OUT}`);
