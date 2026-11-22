# 璀璨圣诞树接入（B 方案）+ 创建统计 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 nobody-r/christmas-tree 镜像自托管为「璀璨树」第二种可创建树型（/b/ + /api/create-b + /b/?id= 分享），后台 /aokorin/ 加总创建数/今日创建数/近 14 天柱状图统计。

**Architecture:** 现有平台（studio 静态页 + Netlify Functions + Blobs store "trees"，键 `tree/{id}`、`trash/{id}`、`index`、`stats/daily`、`stats/total`）上加 type:"b" 分支：璀璨树存 `btree/{id}`，索引条目带 `type:"b"` 与 `oth`；分享页 bootstrap 先清后灌 IndexedDB 再让应用启动；统计走独立 stats 键 + index 重建兜底。

**Tech Stack:** Node（dev-server/build/sync 脚本）、Netlify Functions（ESM）、Netlify Blobs @netlify/blobs、qrcode-generator（已有 vendored）、无新依赖。

**Spec:** `docs/specs/2026-11-22-treeb-design.md`（用户已批准：照搬自托管、不冻结版本有 sync 脚本、总数从上线日起算）

## Global Constraints

- 部署：`$env:NETLIFY_AUTH_TOKEN="<NETLIFY_TOKEN>"; $env:HTTPS_PROXY="http://127.0.0.1:7897"; npx --yes netlify-cli@26.1.0 deploy --prod --site 31a9093d-fb76-4b6c-922b-524b483cb907`（必须 26.1.0；token 只放环境变量，不写进文档）。
- 中文/含 emoji 文件一律用 write 工具整体重写（PowerShell 批量替换会 GBK 乱码）。
- 照片上限沿用 create.js：MAX_PHOTOS=30、MAX_BODY_BYTES=12MB；压缩长边 1280 / JPEG 0.82。
- token 约定：ownerToken=randomHex(32)，索引存 `oth=sha256(token).slice(0,16)`（与 create.js:44-53 一致）。
- dev-server 起在 8091；测试脚本一律写临时 .js 文件跑（不用 node -e 单行对象字面量）。
- 提交推送模板：`git -c http.proxy=http://127.0.0.1:7897 -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=20 push "https://<TOKEN>@github.com/Huaxun233/christmas-tree-studio.git" main`（卡死就重试；模板里不写真实 token，凭据只放环境变量）。

## Review Focus

- Vite 绝对路径在 /b/ 子目录 404 → sync 脚本必须把 `/assets/`、`/audio/`、`/mediapipe/`、`/vite.svg` 等引用改成相对 `./`，且 modulepreload href 一并改。（Task 1 步骤 4 验证：本地 curl /b/ 下的资源 200）
- IndexedDB 灌入时序竞态 → bootstrap 内联脚本必须置于 module script 之前且完成所有 put 再放行。（Task 4 步骤 3：playwright 打开 /b/?id= 验证照片上树）
- 回访串树：访客 IndexedDB 残留旧分享照片 → bootstrap 先清空 gallery store 再灌。（Task 4 步骤 4：两次不同 id 访问只显示第二棵的照片）
- admin 索引重建/clear 遗漏 btree → admin.js rebuild 扫描 tree/ 与 btree/ 两前缀，clear 同清。（Task 6 步骤 2 测试）
- photos-b 大响应（30 张 ≈ 数 MB，函数响应上限 ~6MB）→ 上限与现有 photos.js 相同属既有风险；Task 5 验证 2 张照片响应完整、Content-Length 正常。

---

### Task 1: 镜像同步脚本 + 璀璨树静态资源

**Files:**
- Create: `scripts/sync-b.mjs`
- Create: `studio/public/b/`（脚本产物：index.html、assets/、audio/、mediapipe/）

**Interfaces:**
- Produces: `studio/public/b/index.html`（含相对路径 + bootstrap 注入点注释 `<!--B-BOOTSTRAP-->`）；资源路径全部相对。

- [ ] **Step 1: 写 scripts/sync-b.mjs**

node 20+ ESM，无第三方依赖：
1. GET `https://nobody-r.github.io/christmas-tree/`（走 `HTTPS_PROXY=http://127.0.0.1:7897`，用 node 内置 fetch + `undici` 无需——直接 fetch 支持 env 代理不行，须用 `https.request` 经 proxy 或调用 curl.exe。决定：spawn `curl.exe -sL --proxy http://127.0.0.1:7897 <url>`，子进程取 stdout Buffer，简单可靠）。
2. 从 index.html 提取所有本地资源引用（`/assets/…`、`/audio/…`、`/mediapipe/…`）。
3. 下载每个资源到 `studio/public/b/<path>`（保留子目录）。
4. 改写 index.html：所有 `src="/x"`、`href="/x"` 引用改为 `./x`；在 `<script type="module"` 标签之前插入占位行 `<!--B-BOOTSTRAP-->`；标题后追加 `<meta name="robots" content="noindex">`。
5. 打印下载文件数与总字节，任一资源失败即退出码 1。

- [ ] **Step 2: 运行脚本**

Run: `node scripts/sync-b.mjs`
Expected: 下载成功，列出文件数（预期 index.html + 至少 assets/index-*.js、assets/index-*.css、audio/christmas-by-ikson.mp3、mediapipe/ 下模型与 wasm）。

- [ ] **Step 3: 验证资源完整性**

Run: `node -e` 替代方案——写临时脚本检查 `studio/public/b/index.html` 含 `<!--B-BOOTSTRAP-->`、不含 `src="/assets` 绝对引用；`studio/public/b/assets/` 下 JS ≥1MB。
Expected: 全部通过。

- [ ] **Step 4: Commit**

```bash
git add scripts/sync-b.mjs studio/public/b
git commit -m "feat: sync script mirrors 璀璨圣诞树 into /b/"
```

### Task 2: /api/create-b 函数

**Files:**
- Create: `functions/create-b.js`
- Modify: `netlify.toml`（追加 `[[redirects]] from="/api/create-b" to="/.netlify/functions/create-b" status=200`）
- Modify: `dev-server.js`（加 /api/create-b 模拟分支）
- Test: 临时脚本 `tmp-test-createb.js`（用完删）

**Interfaces:**
- Consumes: functions/create.js 的 randomHex/tokenHash 语义（复制实现，不 import，保持函数独立可部署）。
- Produces: `POST /api/create-b` body `{title, photos:[{name,dataUrl}]}` → Blobs `btree/{id}` = `{title, photos, createdAt, type:"b", ownerToken}`；`index` 条目 `{id, title, thumb, createdAt, oth, type:"b"}`（unshift，slice(0,500)）；响应 `{id, url:"/b/?id=<id>", ownerToken}`。校验失败 400；title 缺省 "圣诞快乐"。

- [ ] **Step 1: 写 functions/create-b.js**（结构与 create.js 同构：randomHex(32)、tokenHash、MAX_PHOTOS=30、MAX_BODY_BYTES=12MB、Blobs store "trees" consistency strong、索引 try/catch 不阻塞主流程）
- [ ] **Step 2: netlify.toml + dev-server.js 加 /api/create-b**
- [ ] **Step 3: 本地验证**：起 dev-server（8091），临时脚本 POST 1 张 1×1 JPEG dataURL → 断言响应含 id/ownerToken、`.dev-data` 出现 `btree/<id>.json` 且索引条目 `type==="b"`。跑完删临时脚本。
- [ ] **Step 4: Commit** `feat: create-b API for 璀璨树`

### Task 3: photos-b 读取函数

**Files:**
- Create: `functions/photos-b.js`
- Modify: `netlify.toml`（`from="/b/api/photos" to="/.netlify/functions/photos-b" status=200`）
- Modify: `dev-server.js`（/b/api/photos 分支）

**Interfaces:**
- Produces: `GET /b/api/photos?id=<id>` → 读 `btree/{id}`（不存在 404 `{error}`）→ `{title, photos:[{url:<dataUrl>, name}]}`。无 id 400。

- [ ] **Step 1: 写 functions/photos-b.js**（photos.js 同构，键改 btree/，响应不带 custom）
- [ ] **Step 2: netlify.toml + dev-server.js**
- [ ] **Step 3: 本地验证**：GET Task 2 建的 id → `{title, photos:[{url,name}]}`；GET 不存在 id → 404。删临时脚本。
- [ ] **Step 4: Commit** `feat: photos-b read API`

### Task 4: 分享页 bootstrap（IndexedDB 灌入 + 净屏 + 题字横幅）

**Files:**
- Create: `studio/public/b/boot.js`
- Modify: `studio/public/b/index.html`（把 Task 1 的 `<!--B-BOOTSTRAP-->` 占位替换为内联 bootstrap + `<script src="./boot.js"></script>`；末尾追加 `<style>` 净屏与题字横幅样式）
- Modify: `dev-server.js`（/b/ 路由已由静态服务覆盖，无需改）

**Interfaces:**
- Consumes: Task 3 的 `/b/api/photos?id=` 响应 `{title, photos:[{url,name}]}`。
- Produces: 打开 `/b/?id=X` 时：gallery store 被清空并写入本棵照片 blob；页面顶部金色题字横幅显示 title；布置面板/状态栏被隐藏。

- [ ] **Step 1: 写 studio/public/b/boot.js**（经典脚本，内容：
  1. 内联部分（index.html 里）：同步 fetch 是不行的，boot.js 里异步执行——`fetch('/b/api/photos?id='+id)` → dataURL→Blob（atob+Uint8Array）→ 清空 gallery（openDB→tx clear）→ 逐条 put `{id:'share-'+i, blob}` → 写 localStorage 移除 `ct_removed_defaults` → `window.__B_READY=true`；
  2. 由于源应用 module 脚本可能先于灌入完成读 IndexedDB，boot.js 必须在 index.html 中位于 module 标签**之前**，且把 module 标签的加载改为动态：内联脚本把原 module 标签 type 改成 `text/x-module-defer`，boot.js 灌入完成后新建 module script 元素插入其内容。）
- [ ] **Step 2: 净屏样式**：`<style>` 追加——隐藏圣诞布置面板按钮/状态栏（选择器运行时从 DOM 观察，先按 class 模糊匹配 `backdrop-blur-md` 顶栏与设置面板按钮，具名选择器以实测 DOM 为准）；题字横幅 `#b-title-banner{position:fixed;top:14px;left:50%;transform:translateX(-50%);font-family:'Noto Serif SC',serif;color:#ffd98a;text-shadow:0 0 12px rgba(255,217,138,.5);z-index:9999;pointer-events:none}`。
- [ ] **Step 3: 本地验证（playwright-cli，Edge）**：dev-server 8091 下打开 `/b/?id=<id>` → 照片出现在树的默认图序列表（IndexedDB gallery 有 'share-*' 记录）、横幅显示 title、控制台无未捕获错误。
- [ ] **Step 4: 串树验证**：再建一棵只含另一张图的树 B，同一浏览器上下文先开 A 再开 B → gallery 中只含 B 的照片。
- [ ] **Step 5: Commit** `feat: /b share page with IndexedDB bootstrap`

### Task 5: 工作台创建入口（树类型选择 + 发布）

**Files:**
- Modify: `studio/public/index.html`（顶栏下加树类型切换段：两个大按钮「🎄 经典树」「✨ 璀璨树」，选中态高亮；选璀璨树时标题改「✨ 发布璀璨树」，隐藏「更多文字自定义」折叠区（璀璨树只支持题字），按钮文案改「✨ 发布璀璨树」）
- Modify: `studio/public/studio.js`（加 `treeType` 状态与 `setTreeType(t)`；`publish()` 按 treeType 分流：b → POST /api/create-b `{title, photos}`；成功面板同现有（链接 /b/?id= + 二维码 + 我的树）；`saveMyTree` 不变）

**Interfaces:**
- Consumes: Task 2 `/api/create-b`；现有 `saveMyTree/compressedPhotos/qrDataUrl`。
- Produces: 工作台可发布璀璨树并得到链接。

- [ ] **Step 1: 改 index.html（样式与结构，write 整体重写相关区块）**
- [ ] **Step 2: 改 studio.js 分流逻辑**
- [ ] **Step 3: 本地验证（playwright）**：选璀璨树 → 填题字 → 传 1 图 → 发布 → 结果面板出现 `/b/?id=` 链接与二维码；localStorage `studio_my_trees` 新增该条目。
- [ ] **Step 4: 回归验证**：切回经典树完整发布一次 → `/tree/?id=` 链接正常（确认经典流程无回归）。
- [ ] **Step 5: Commit** `feat: studio tree-type picker`

### Task 6: 统计（/api/stats + 后台统计卡）

**Files:**
- Create: `functions/stats.js`
- Modify: `netlify.toml`（`from="/api/stats" to="/.netlify/functions/stats" status=200`）
- Modify: `functions/create.js` 与 `functions/create-b.js`（发布成功后累加 `stats/total`（数字）与 `stats/daily`（`{"2026-11-22":n,...}`，键=UTC+8 日期；失败 try/catch 不阻塞）
- Modify: `functions/admin.js`（GET 返回加 `stats:{total,today}`；索引重建扫描 `tree/`+`btree/`；`clear` 与 `hard_delete` 处理 `btree/`；首次运行若无 `stats/total` 键则按 `store.list` 前缀 `tree/`+`btree/` 计数建立基线——只数 `type` 已写入的记录）
- Modify: `studio/public/aokorin/index.html`（顶部统计卡：总创建数、今日创建数、近 14 天纯 CSS 柱状图（/api/stats 返回 byDay）；列表行加「经典/璀璨」徽标）
- Modify: `dev-server.js`（/api/stats 模拟 + create/create-b 累加 .dev-data/stats.json）

**Interfaces:**
- Produces: `GET /api/stats`（header `x-admin-key` 或 `?k=`，与 admin.js 相同鉴权）→ `{total, today, byDay:[{date:"2026-11-22", count}]}`（byDay 近 14 天含今天）。

- [ ] **Step 1: 写 functions/stats.js**（鉴权复用 admin.js 逻辑；today 键 `new Date(Date.now()+8*3600e3).toISOString().slice(0,10)`）
- [ ] **Step 2: create.js/create-b.js 累加 + admin.js 基线与 btree 支持**
- [ ] **Step 3: dev-server 模拟 + aokorin 统计卡**
- [ ] **Step 4: 本地验证**：创建 2 棵（1 经典 1 璀璨）→ /api/stats 返回 total=2 today=2 byDay 最后一格=2；admin 列表含 type 徽标；hard_delete 璀璨树成功。
- [ ] **Step 5: Commit** `feat: creation stats + admin dashboard cards`

### Task 7: 部署上线 + 线上验证 + 收尾

**Files:**
- Modify: `DEPLOY-NOTES.md`（追加璀璨树与统计一节）

- [ ] **Step 1: 全量构建检查**：`node studio/build.js` 通过；`node --input-type=module -e "await import('./functions/stats.js')"` 等逐个 functions 语法检查。
- [ ] **Step 2: 部署**（Global Constraints 命令）。
- [ ] **Step 3: 线上验证**（curl --proxy）：
  - `/b/` 200 且含 bootstrap；`/b/assets/index-*.js` 200；
  - POST /api/create-b 建测试树 → GET /b/api/photos?id= 返回照片；
  - playwright 打开线上 /b/?id= → 照片上树 + 横幅；
  - /api/stats 带正确 key → total/today 数字合理；
  - /aokorin/ 统计卡渲染。
- [ ] **Step 4: 删测试树**（admin hard_delete），Commit `docs: deploy notes for tree-b`，推送 GitHub（Global Constraints 命令）。
- [ ] **Step 5: 汇报用户**：链接、统计口径（上线日起算）、同步脚本用法（`node scripts/sync-b.mjs` 后让我重新部署）。
