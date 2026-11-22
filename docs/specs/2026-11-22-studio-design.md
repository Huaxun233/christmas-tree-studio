# 圣诞树在线定制平台 · 设计文档

日期：2026-11-22
状态：已获用户批准的方向（A 方案在线版），本文档为实施依据

## 意图

把现有的手势交互圣诞树（christmas-tree，Three.js + MediaPipe 纯静态项目）
变成一个**在线定制平台**：任何人（主要是手机用户）打开定制页，改题字、传照片、
实时预览，点「生成」得到一棵专属圣诞树的永久链接，分享给朋友即可打开。
使用者零账号、零成本。

## 目标

1. 定制页（主站首页）：题字输入、照片上传/删除/排序、树的实时预览
2. 生成专属链接：配置存入 Netlify Blobs，返回 `tree?id=xxx` 永久链接
3. 树页（tree?id=xxx）：完整复用 christmas-tree 的手势交互 + 题字 + 照片
4. GUI 上放一个跳转按钮，链到站长的 GitHub 主页
5. 整个项目（平台 + 改造后的树）作为新项目发布到 GitHub

## 非目标 / 反目标

- 不做多用户账号体系、不做登录
- 不自建后端服务器（C 方案已否决）
- 不把配置塞 URL（B 方案已否决：链接过长、微信截断）
- 不改动 christmas-tree 的核心渲染与手势逻辑，只做数据接入

## 约束

- 托管与存储全部用 Netlify 免费额度：Netlify 部署 + Netlify Blobs 存配置与照片
- 站长需一次性注册 Netlify 并提供 deploy token；使用者无任何要求
- 移动端优先：定制页按手机竖屏设计，桌面兼容
- 照片需在客户端压缩（canvas 重绘限制长边），控制单张体积，防止 Blobs 超限
- 现有 christmas-tree 代码本地化在 vendor/，平台直接复用，不需要 CDN

## 方案取舍（已定）

- A（选定）：静态定制页 + Netlify Functions + Netlify Blobs。零运维、免费、体验完整。
- B（否决）：配置编码进 URL——链接过长，微信分享不可靠。
- C（否决）：自建服务器——成本与运维不匹配项目量级。

## 实施要点（留给构建者的决策空间）

- Netlify Functions 用 JavaScript（Node 运行时），与主项目语言一致
- Blobs 键空间：`tree/{id}` 存 { title, photos[] }，id 用短随机串
- tree 页加载时 fetch 配置注入现有 app.js 的题字与照片列表逻辑
- 定制页预览直接 iframe/复用树的渲染，参数实时注入
- GUI 顶栏放「站长 GitHub」图标按钮（链接站长主页，部署前向站长要主页 URL）
- 仓库结构建议：新仓库 christmas-tree-studio，内含 studio（定制页）+
  tree（原项目改造版）两个目录，或 monorepo 单站点双路由，构建者定

## 开放项（需站长提供）

1. Netlify token（发布时）
2. 站长 GitHub 主页 URL（GUI 跳转按钮用）
3. 上传 GitHub 的凭据（PAT 或浏览器授权，届时处理）
