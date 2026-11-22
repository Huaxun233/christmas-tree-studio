# 部署备忘

netlify-cli **27.x 有 bug**（Project not found，项目端点 404）。
用 26.1.0：
```
$env:NETLIFY_AUTH_TOKEN = "nfp_..."; $env:HTTPS_PROXY = "http://127.0.0.1:7897"
npx --yes netlify-cli@26.1.0 deploy --prod --site <site_id>
```
site_id: 31a9093d-fb76-4b6c-922b-524b483cb907

deploy-api.ps1 是纯 REST 备用方案（未能传函数 zip，仅作参考）。
