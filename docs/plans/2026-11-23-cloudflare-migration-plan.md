# 迁移计划：Netlify → Cloudflare Pages（2026-11-23）

对应设计：`docs/specs/2026-11-23-cloudflare-migration.md`

## 任务

1. **目录调整**：`git mv functions netlify-functions`；netlify.toml `functions="netlify-functions"`（回退保留）。✅
2. **CF 函数**：`functions/lib/{store,http,stats}.js` + 7 个路由函数（module 格式，`context.env.TREES` / `context.env.ADMIN_KEY`）。
3. **配置**：`wrangler.toml`（pages_build_output_dir="studio/public"，KV binding TREES）；`.dev.vars`（本地密码，gitignore）；`.gitignore` 补 `.dev.vars`、`.wrangler/`。
4. **本地验证**：`npx wrangler pages dev` 起本地（默认 8788）→ node 脚本端到端（创建 A/B、photos 带 id/Referer、my 删/恢、admin 列表/删/清、stats、错密码 401）。
5. **部署**：向用户要 CF API token（Pages:Edit + KV:Edit）+ account_id；`wrangler kv namespace create TREES` → 回填 wrangler.toml id → `wrangler pages deploy`（先 `node studio/build.js`）→ 设置 ADMIN_KEY 环境变量（`wrangler pages secret put` 或 API）。
6. **线上验证**：curl 全链路 + 真实发布一棵树。
7. **收尾**：提交推送 GitHub；DEPLOY-NOTES.md 更新（新部署命令、额度教训）。

## 全局约束

- 凭据只进环境变量，绝不写进任何文件（MEMORY.md 铁律）。
- 中文文件一律用 write 工具整体重写，不用 PowerShell 改写。
- 本地测试用 node 脚本（PowerShell 中文 curl 会 GBK 乱码）。
- 推送命令：`git -c http.proxy=http://127.0.0.1:7897 -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=20 push "https://<TOKEN>@github.com/Huaxun233/christmas-tree-studio.git" main`（卡死则重试）。

## 完成定义

- 线上 `*.pages.dev`：工作台发布 A/B 树成功、分享页照片+题字正常、/my/ 自助管理、/aokorin/ 总管理+统计、款式选择器（b85b2d2 内容）在线上可见。
- GitHub main 已推送。
