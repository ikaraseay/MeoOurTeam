# OurTeam

实验室官方网站模板，Astro 7 + Cloudflare Workers + D1 数据库。

## 架构

三层目录结构：

- `frontend/` —— 站点本体（Astro 的 `srcDir`）：页面、组件、样式、数据
- `backend/` —— 后台逻辑：D1 数据库操作、会话管理、API 路由
- `cloudflare/` —— 部署配置：wrangler.jsonc、静态资源

## 快速开始

```bash
# 安装依赖
pnpm install

# 复制配置文件
cp config.env.example config.env
# 编辑 config.env 填入你的 Cloudflare 信息

# 体检
bash scripts/ops.sh doctor

# 登录 Cloudflare
bash scripts/ops.sh login

# 初始化数据库
bash scripts/ops.sh init-db

# 同步密钥
bash scripts/ops.sh secrets

# 本地开发
pnpm dev

# 构建
pnpm build

# 部署
bash scripts/ops.sh deploy
```

## 配置

所有配置集中在 `config.env`（不入库），从 `config.env.example` 复制：

| 变量 | 说明 |
|------|------|
| `SITE_URL` | 站点地址，如 `https://example.com` |
| `WORKER_NAME` | Cloudflare Worker 名称 |
| `D1_DATABASE_NAME` | D1 数据库名称 |
| `D1_DATABASE_ID` | D1 数据库 ID |
| `R2_BUCKET_NAME` | R2 存储桶名称 |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare 账号 ID |
| `ADMIN_PASSWORD_HASH` | 后台口令 SHA-256 |
| `SESSION_SECRET` | 会话签名密钥 |

## 后台管理

访问 `/admin/` 进入后台管理界面，可管理：

- 文档（博客文章）
- 成员
- 项目
- 成果（论文、获奖、原型）
- 新闻
- 图库（R2 存储）
- 设置（站点文案覆盖）

## 数据库

使用 Cloudflare D1（SQLite 兼容），表结构在 `backend/db/migrations/`：

1. `0001_admin.sql` - 文档、图库、登录限流
2. `0002_settings.sql` - 站点设置
3. `0003_members.sql` - 成员
4. `0004_research.sql` - 研究方向
5. `0005_projects.sql` - 项目
6. `0006_outcomes.sql` - 成果
7. `0007_news.sql` - 新闻
8. `0008_texts.sql` - 文案与修改记录
9. `0009_releases.sql` - 发布记录与当前版本

## 运维命令

```bash
bash scripts/ops.sh doctor    # 体检
bash scripts/ops.sh status    # 状态
bash scripts/ops.sh secrets   # 同步密钥
bash scripts/ops.sh config    # 查看配置
bash scripts/ops.sh env       # 写本地凭据
bash scripts/ops.sh deploy    # 构建部署
bash scripts/ops.sh login     # 登录 CF
bash scripts/ops.sh init-db   # 初始化数据库
```

## 安全

- 所有敏感信息（密码、密钥、token）只存在 `config.env` 和 Cloudflare Worker secrets
- `.gitignore` 已排除 `config.env`、`.env*`、`.dev.vars`
- pre-commit hook 自动检查提交中的敏感信息
- 后台使用 HMAC-SHA256 签名会话，口令只存哈希

## 域名

在 `config.env` 中设置 `SITE_URL` 为你的正式域名，再在 Cloudflare Dashboard 的 Worker 设置中添加自定义域名。
