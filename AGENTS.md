# OurTeam

课题组官方网站，Astro 7 + Cloudflare Workers + D1。

## 架构

- **三层目录**：
  - `frontend/` —— 站点（Astro `srcDir`）：页面、组件、样式、数据
  - `backend/` —— 后台：D1 操作、会话、API
  - `cloudflare/` —— 部署：wrangler.jsonc、静态资源
- **框架**：Astro 7 + `@astrojs/cloudflare` 适配器
- **数据库**：Cloudflare D1（SQLite），表结构在 `backend/db/migrations/`
- **存储**：Cloudflare R2（图片等媒体文件）
- **包管理**：pnpm

## 路由

- `/` —— 首页
- `/members/` —— 成员
- `/research/` —— 研究方向
- `/projects/` —— 项目
- `/outcomes/` —— 成果
- `/contact/` —— 联系
- `/news/` —— 动态
- `/blog/` —— 博客列表
- `/blog/[slug]/` —— 文章详情
- `/blog/tag/[tag]/` —— 标签页
- `/admin/` —— 后台管理
- `/admin/login` —— 登录
- `/api/admin/*` —— 后台 API
- `/api/members` `/api/research` `/api/projects` `/api/outcomes` `/api/news` —— 公开 API
- `/media/[...path]` —— R2 媒体文件
- `/rss.xml` —— RSS 订阅
- `/sitemap.xml` —— 站点地图
- `/robots.txt` —— 爬虫规则

## 配置

所有环境配置集中在 `config.env`（不入库），模板在 `config.env.example`。

后台凭据通过 `wrangler secret` 上传到 Cloudflare Worker。

## 构建流程

1. `pnpm prebuild` —— 运行 `apply-config.mjs` 填配置 + `export-d1-posts.mjs` 导出数据
2. `pnpm build` —— Astro 构建静态站点 + Worker 代码
3. `pnpm deploy` —— wrangler 部署到 Cloudflare

## 开发

```bash
pnpm dev          # 本地开发
pnpm build        # 构建
bash scripts/ops.sh doctor  # 体检
bash scripts/ops.sh init-db # 初始化数据库
```

## 域名

在 `config.env` 的 `SITE_URL` 中配置正式域名（模板默认 `https://example.com`）。
