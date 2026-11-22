# 实施计划：我的树 / 总管理分层（2026-11-22）

依据 `docs/specs/2026-11-22-mytrees-design.md`。按顺序执行，每步后可独立验证。

## Step 1 — 二维码库 vendored
- 下载 `qrcode-generator`（UMD 单文件）→ `studio/public/vendor/qrcode.min.js`（curl --proxy 走 Clash）。
- 验证：文件存在、`typeof qrcode === "function"`（node -e 快速 sanity）。

## Step 2 — functions/create.js 发 ownerToken
- 生成 32 hex `ownerToken`（crypto.randomBytes(16).toString("hex")）。
- 树记录 `tree/{id}` 增加 `ownerToken` 字段（记录里存明文，供超管核对；索引不存明文）。
- 索引条目增加 `oth = sha256(ownerToken).slice(0,16)`。
- 返回体加 `ownerToken`。
- 验证：本地 dev-server 创建一次，返回含 ownerToken；`.dev-data` 索引含 oth、不含明文。

## Step 3 — functions/my.js 新建
- GET：读索引，按 `oth === sha256(token).slice(0,16)` 过滤；顺带懒清理（del 超过 180s 的条目+trash 键删除）。
- POST delete：校验匹配 → `tree/{id}` 内容搬到 `trash/{id}`（记录原样+`deletedAt`），原键删除，索引条目加 `del: Date.now()`。
- POST restore：匹配且 `now-del < 180000` → `trash/{id}` 搬回 `tree/{id}`，去掉 del 与 deletedAt；超时 410。
- 鉴权：头 `x-owner-token`；不匹配一律 404。
- 依赖：@netlify/blobs（functions/ 已有）。

## Step 4 — 既有函数配合
- functions/photos.js：读取时若索引条目带 `del` 或键不存在 → 返回空 photos（视为不存在）。
- functions/admin.js：懒清理同款逻辑复用；列表条目显示 `oth` 前 4 位；新增 `{action:"hard_delete", id}`（删 tree/{id} 或 trash/{id} + 索引条目，不进回收站）。

## Step 5 — netlify.toml
- 加 `[[redirects]] from="/api/my" to="/.netlify/functions/my" status=200`。

## Step 6 — studio 页前端（index.html + studio.js）
- 删顶栏「⚙ 管理」链接。
- 发布成功面板：保留现有结果展示，追加两按钮——「📁 我的树」(→ /my/)、「🔗 我的管理链接」（弹层：明文链接 + 复制按钮 + 256px canvas 二维码，qrcode-generator 画；提示保存）。
- localStorage `studio_my_trees`：创建成功时 unshift {id,title,token,createdAt}，去重、slice(0,200)。

## Step 7 — 「我的树」页 studio/public/my/index.html + my.js
- token 顺序：URL `?t=` → localStorage；URL 有则写回 localStorage。
- 都空：空态页 +「去制作」按钮。
- 列表：缩略图/题字/张数/时间/打开/删除；删除后条目变灰显示「撤销(倒计时)」，3 分钟后消失。
- 调 /api/my，头 x-owner-token。
- 风格复用 studio 深色玻璃。

## Step 8 — 管理页搬家
- `studio/public/admin/` → `studio/public/aokorin/`（git mv，内容引用路径不变，相对路径自适应）。
- 原地放 `studio/public/admin/index.html`：仅 noindex + 空页（无跳转、无提示新路径）。
- admin 页面加「硬删除」按钮（红色，二次确认）。

## Step 9 — build.js 检查
- build.js 复制 public 时确认 vendor/、my/、aokorin/ 都会被带出（它是整目录复制，无需改；跑一遍确认 [4/4] 校验通过）。

## Step 10 — 端到端验证（本地 dev-server）
- dev-server.js 增加模拟路由：/api/my（GET/POST，同 functions/my.js 逻辑，读 .dev-data）。若模拟成本高，允许直接对线上验证（Step 11）。
- 创建 → 拿 ownerToken → GET /api/my 能列出 → delete → photos 返回空 → restore → 恢复 → 3 分钟后 restore 返回 410。

## Step 11 — 部署上线并验证
- CLI 26.1.0 部署（坑见 DEPLOY-NOTES.md）。
- curl 验证：/api/my 404（无 token）、创建→列出→删除→photos 空→恢复；/aokorin/ 200；/admin/ 空页；定制页顶栏无管理按钮。
- 推 GitHub。

## 完成定义
- 用户：生成后打开 /my/ 能看到自己的树，删除后 3 分钟内可撤销，分享链接立即失效。
- 站长：/aokorin/ + ADMIN_KEY 管所有树，可硬删；前端无任何入口。
