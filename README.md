# 🎄 Christmas Tree Studio

在线圣诞树定制平台：改题字、传照片、实时预览，一键生成专属圣诞树永久链接。
使用者**零账号、零成本**——打开网页就能定制，分享链接给朋友即可。

线上地址：**https://christmas-tree-studio-cd0.pages.dev**

## 使用

1. 打开定制页，选择圣诞树款式（经典树 / 璀璨圣诞树）
2. 输入题字、上传照片（手机相册直接选，自动压缩），更多文字可自定义（开屏文案、落款、心愿短句，均可留空隐藏）
3. 右侧实时预览手势交互圣诞树
4. 点「生成专属链接」→ 得到 `tree/?id=xxx` 永久链接 + 二维码，发给别人就能看

树页完整保留原项目的手势交互（挥手撒彩带、抓取装饰等，基于 Three.js + MediaPipe）。

## 技术栈

- 定制页：原生 HTML/JS（无框架），照片 canvas 压缩（长边 1280，JPEG 82%）
- 树：[christmas-tree](https://github.com/Mzying022/christmas-tree)（MIT）+ [nobody-r/christmas-tree](https://github.com/nobody-r/christmas-tree)（璀璨圣诞树）原样复用，构建脚本注入配置
- 托管：Cloudflare Pages（静态资源 + Pages Functions）
- 存储：Cloudflare KV（binding `TREES`：`tree/`、`btree/`、`trash/`、索引、统计）
- 函数：`functions/api/create.js` 生成链接、`functions/tree/api/photos.js` 读取配置、`functions/api/my.js` 我的树自助管理（ownerToken 令牌 + 3 分钟撤销）、`functions/api/stats.js` 创建统计、`functions/api/admin.js` 总管理
- 构建：`node studio/build.js`（复制树 → 提取题字键 → 注入引导脚本与预览补丁）

## 本地开发

```bash
node studio/build.js   # 构建到 studio/public/
npx wrangler pages dev studio/public   # 本地模拟 KV（需 wrangler + .dev.vars）
```

## 部署（Cloudflare Pages）

1. Fork 本仓库
2. Cloudflare → Workers 和 Pages → 创建 Pages 项目，构建输出 `studio/public`，绑定 KV 命名空间（binding 名 `TREES`，见 `wrangler.toml`）
3. 添加环境变量/密钥 `ADMIN_KEY`（总管理页 `/aokorin/` 的密码）
4. 璀璨圣诞树镜像更新：`node scripts/sync-b.mjs`
5. 想换 GitHub 主页链接：改 `studio/build.js` 里的 `OWNER` 常量

## 目录

```
studio/
  build.js           构建脚本（复制树+注入）
  public/            定制页、我的树、总管理、分享页
  public-tree-assets/studio-boot.js  树页引导脚本
functions/
  api/               Pages Functions（create / my / admin / stats / create-b）
  tree/api/photos.js GET /tree/api/photos?id=
  b/api/photos.js    GET /b/api/photos?id=
  lib/               KV shim / 工具
netlify-functions/   旧 Netlify 版函数（留存备查）
wrangler.toml        Cloudflare 配置
netlify.toml         旧 Netlify 配置（留存备查）
dev-server.js        本地联调服务器
```

## 致谢

树本体来自 [Mzying022/christmas-tree](https://github.com/Mzying022/christmas-tree)（MIT License）与 [nobody-r/christmas-tree](https://github.com/nobody-r/christmas-tree)。

---
Made with 🎄 by [Huaxun233](https://github.com/Huaxun233)
