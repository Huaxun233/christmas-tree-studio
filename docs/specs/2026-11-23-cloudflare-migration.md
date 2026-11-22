# 迁移设计：Netlify → Cloudflare Pages（2026-11-23）

## 背景

Netlify 免费额度被 `studio/public/b/`（29.3MB）多次全量部署吃光，新部署被拦：
`{"error":"Account credit usage exceeded - new deploys are blocked until credits are added"}`。
用户选择免费迁移 Cloudflare Pages（用户决策 m02110）。

## 方案

- **托管**：CF Pages，静态资源 = `studio/public`（构建流程不变：`node studio/build.js`）。
- **函数**：Netlify Functions → Pages Functions（module 格式，文件路由，无需 redirects）：

| 路由 | 文件 | 方法 |
|---|---|---|
| /api/create | functions/api/create.js | POST |
| /api/create-b | functions/api/create-b.js | POST |
| /api/admin | functions/api/admin.js | GET+POST |
| /api/my | functions/api/my.js | GET+POST |
| /api/stats | functions/api/stats.js | GET |
| /tree/api/photos | functions/tree/api/photos.js | GET |
| /b/api/photos | functions/b/api/photos.js | GET |

- **存储**：Netlify Blobs → Cloudflare KV，binding 名 `TREES`。键完全沿用：
  `tree/{id}`、`btree/{id}`、`trash/{id}`、`index`、`stats/total`。
  `functions/lib/store.js` 提供 `getStore(env)` shim（getJSON/setJSON/delete/list），原业务逻辑零改动移植。
- **环境变量**：`ADMIN_KEY`（管理密码）→ CF Pages 环境变量；本地 `.dev.vars`（已 gitignore）。
- **回退**：原 Netlify 版函数整体 `git mv` 到 `netlify-functions/`，netlify.toml 指向它，Netlify 端等额度恢复即可重新部署。
- **域名**：`*.pages.dev`；Netlify 旧站在额度恢复前保持旧版。

## 免费额度（够用性）

- KV：每天 1000 写 / 10 万读；单值上限 25MB（现有最大树 JSON 4.8MB ✓）。
- Pages 函数：10 万请求/天；静态流量不限。

## 已知差异 / 风险

1. KV 强一致只有「读后写 60s 窗口」，`index` 高频覆盖写可能读到旧值（低频使用场景可接受）。
2. KV 写同一 key 限 1 次/秒；「清空全部」等批量操作串行执行即可。
3. `store.list({prefix})` 需处理分页（cursor）。
4. 静态资源优先于函数：`/tree/api/photos` 无同名静态文件，不冲突。

## 验证

- 本地：`npx wrangler pages dev`（Miniflare 模拟 KV）→ 端到端：创建 A/B 树 → 分享页读取 → my 删除/恢复 → admin 列表/删除 → stats。
- 线上：同套 curl 验证 + 前端发布走一遍。
