# OurTeam 后端数据管理

本项目使用 Cloudflare D1 数据库存储所有内容，通过构建时导出脚本将数据转换为原始前端可消费的格式。

## 架构概览

```
D1 数据库
    ↓ (构建时)
export-d1-posts.mjs
    ↓
data/runtime/site-content.json  ← 原始前端读取
data/content/blog/*.md          ← 博客文章
    ↓
Astro 构建
    ↓
dist/client/ (静态站点)
```

## 数据导入导出

### 1. 导出 D1 数据为 JSON（备份）

```bash
# 导出远程 D1 数据
pnpm data:export > backup.json

# 导出本地 D1 数据
node scripts/export-data.mjs --local > backup.json
```

导出的 JSON 包含所有表的数据：
- `members` - 团队成员
- `research_directions` - 研究方向
- `projects` - 科研项目
- `outcomes` - 成果（论文、竞赛）
- `news` - 新闻动态
- `documents` - 博客文章
- `settings` - 站点设置
- `media` - 媒体文件元数据

### 2. 从 JSON 导入数据到 D1

```bash
# 导入到远程 D1
pnpm data:import backup.json

# 导入到本地 D1
node scripts/import-data.mjs backup.json --local

# 只导入指定表
node scripts/import-data.mjs backup.json --tables members,projects

# 预览 SQL（不执行）
node scripts/import-data.mjs backup.json --dry-run
```

### 3. 从 Team 项目生成种子数据

```bash
# 生成种子 JSON 文件
pnpm seed:json
# 输出: backend/db/seeds/seed.json

# 生成 SQL 并导入远程 D1
pnpm seed:apply

# 生成 SQL 并导入本地 D1
node backend/scripts/seed-data.mjs --apply --local

# 只生成 SQL（不执行）
pnpm seed > seed.sql
```

种子数据从原始 Team 项目的 JSON 文件生成：
- `frontend/lib/team-profiles.json` → `members` 表
- `frontend/lib/research-directions.json` → `research_directions` 表
- `frontend/lib/projects.json` → `projects` 表
- `frontend/lib/publication-details.json` → `outcomes` 表
- 竞赛成果 → `outcomes` 表
- 站点设置 → `settings` 表

## 构建流程

### 开发环境

```bash
# 1. 应用配置（从 config.env 填充占位符）
node scripts/apply-config.mjs

# 2. 从 D1 导出数据
node backend/scripts/export-d1-posts.mjs

# 3. 启动开发服务器
pnpm dev
```

### 生产构建

```bash
# 自动执行上述步骤
pnpm build
```

构建时会自动：
1. 运行 `apply-config.mjs` 填充配置
2. 运行 `export-d1-posts.mjs` 从 D1 导出数据
3. 生成 `data/runtime/site-content.json`
4. 生成博客文章到 `data/content/blog/`
5. Astro 构建静态站点

## 数据库迁移

数据库表结构定义在 `backend/db/migrations/`：

```bash
# 初始化远程数据库（创建所有表）
bash scripts/ops.sh init-db

# 初始化本地数据库
bash scripts/ops.sh init-db --local
```

迁移文件：
- `0001_admin.sql` - documents, media, login_attempts
- `0002_settings.sql` - settings
- `0003_members.sql` - members
- `0004_research.sql` - research_directions
- `0005_projects.sql` - projects
- `0006_outcomes.sql` - outcomes
- `0007_news.sql` - news
- `0008_texts.sql` - text_resources, text_audit
- `0009_releases.sql` - releases, current_release

## 配置文件

### config.env

所有敏感配置都在 `config.env`（不入库）：

```bash
SITE_URL="https://example.com"
WORKER_NAME="ourteam"
D1_DATABASE_NAME="ourteam-content"
D1_DATABASE_ID="your-database-id"
R2_BUCKET_NAME="ourteam-media"
CLOUDFLARE_ACCOUNT_ID="your-account-id"
ADMIN_PASSWORD_HASH="sha256-hash"
SESSION_SECRET="random-secret"
```

### 占位符配置

以下文件使用占位符，构建时由 `apply-config.mjs` 填充：

- `cloudflare/wrangler.jsonc` - `{{WORKER_NAME}}`, `{{D1_DATABASE_ID}}`, etc.
- `astro.config.mjs` - `{{SITE_URL}}`

## 脚本说明

### backend/scripts/

| 脚本 | 用途 |
|------|------|
| `export-d1-posts.mjs` | 从 D1 导出到 site-content.json 和博客文件 |
| `seed-data.mjs` | 从 Team 项目生成种子 SQL |
| `generate-seed-json.mjs` | 从 Team 项目生成种子 JSON |
| `d1-query.mjs` | D1 查询工具函数 |
| `check-remote-updates.mjs` | 检查远程 D1 是否有更新 |
| `clean-generated.mjs` | 清理生成的文件 |

### scripts/

| 脚本 | 用途 |
|------|------|
| `apply-config.mjs` | 从 config.env 填充配置占位符 |
| `export-data.mjs` | 导出 D1 全部数据为 JSON |
| `import-data.mjs` | 从 JSON 导入数据到 D1 |
| `hash-password.mjs` | 生成管理员密码哈希 |
| `ops.sh` | 运维命令集合 |

## 常用运维命令

```bash
# 体检（检查配置和依赖）
bash scripts/ops.sh doctor

# 同步密钥到 Cloudflare Worker
bash scripts/ops.sh secrets

# 查看当前配置
bash scripts/ops.sh config show

# 校验配置
bash scripts/ops.sh config check

# 写本地开发凭据
bash scripts/ops.sh env

# 构建并部署
bash scripts/ops.sh deploy

# 登录 Cloudflare
bash scripts/ops.sh login

# 初始化数据库
bash scripts/ops.sh init-db

# 导入种子数据
bash scripts/ops.sh seed

# 生成种子 JSON
bash scripts/ops.sh generate-seed

# 导出 D1 数据
bash scripts/ops.sh export-data

# 导入数据到 D1
bash scripts/ops.sh import-data backup.json
```

## 数据安全

### 敏感信息

以下信息**绝不**提交到 Git：
- `config.env` - 包含所有密钥和 ID
- `cloudflare/.dev.vars` - 本地开发变量
- `data/` - 运行时数据
- `backend/db/seeds/*.json` - 数据备份
- `backend/db/seeds/*.sql` - 生成的 SQL

### .gitignore

已配置忽略：
```
config.env
.dev.vars
data/
backend/db/seeds/*.json
backend/db/seeds/*.sql
*.tmp
```

## 故障排查

### 构建失败：找不到 site-content.json

```bash
# 手动运行导出
node backend/scripts/export-d1-posts.mjs

# 检查 D1 连接
bash scripts/ops.sh doctor
```

### 导入失败：表不存在

```bash
# 先初始化数据库
bash scripts/ops.sh init-db

# 再导入数据
pnpm data:import backup.json
```

### 配置未生效

```bash
# 构建时由 scripts/apply-config.mjs 自动注入真实值；
# 本地只需确认 config.env 齐全，仓库里的 wrangler.jsonc 应保持占位符
bash scripts/ops.sh doctor

# 验证
grep "database_id" cloudflare/wrangler.jsonc   # 应为 REPLACE_WITH_YOUR_D1_DATABASE_ID
```

## 开发建议

1. **本地开发**：使用 `--local` 标志操作本地 D1
2. **备份**：定期运行 `pnpm data:export > backup.json`
3. **测试**：导入前先用 `--dry-run` 预览 SQL
4. **版本控制**：只提交占位符配置，不提交真实值
5. **团队协作**：共享 `config.env.example`，不共享 `config.env`
