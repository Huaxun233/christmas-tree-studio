# 🎄 Christmas Tree Studio

在线圣诞树定制平台：改题字、传照片、实时预览，一键生成专属圣诞树永久链接。
使用者**零账号、零成本**——打开网页就能定制，分享链接给朋友即可。

线上地址：**https://christmas-tree-studio.netlify.app**

## 使用

1. 打开定制页，输入题字（如「宝贝圣诞快乐」）
2. 上传照片（手机相册直接选，自动压缩）
3. 右侧实时预览手势交互圣诞树
4. 点「生成专属链接」→ 得到 `tree/?id=xxx` 永久链接，发给别人就能看

树页完整保留原项目的手势交互（挥手撒彩带、抓取装饰等，基于 Three.js + MediaPipe）。

## 技术栈

- 定制页：原生 HTML/JS（无框架），照片 canvas 压缩（长边 1280，JPEG 82%）
- 树：[christmas-tree](https://github.com/Mzying022/christmas-tree)（MIT）原样复用，构建脚本注入配置
- 存储：Netlify Blobs（`trees` store，强一致）
- 函数：Netlify Functions（`create.js` 生成链接 / `photos.js` 读取配置）
- 构建：`node studio/build.js`（复制树 → 提取题字键 → 注入引导脚本与预览补丁）

## 本地开发

```bash
node studio/build.js   # 构建到 studio/public/
node dev-server.js     # http://localhost:8090（模拟 Functions，数据存 .dev-data/）
```

## 部署（Netlify）

1. Fork 本仓库
2. Netlify → Import from Git → 选仓库，`netlify.toml` 已配置好
3. 站点设置开启 Netlify Blobs（免费额度内）
4. 想换 GitHub 主页链接：改 `studio/build.js` 里的 `OWNER` 常量

## 目录

```
studio/
  build.js           构建脚本（复制树+注入）
  public/            定制页（构建产物的一部分）
  public-tree-assets/studio-boot.js  树页引导脚本
functions/
  create.js          POST /api/create
  photos.js          GET  /tree/api/photos?id=
netlify.toml         部署配置
dev-server.js        本地联调服务器
```

## 致谢

树本体来自 [Mzying022/christmas-tree](https://github.com/Mzying022/christmas-tree)（MIT License）。

---
Made with 🎄 by [Huaxun233](https://github.com/Huaxun233)
