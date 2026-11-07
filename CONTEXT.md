# OurTeam 项目上下文

## 技术栈

- Astro 7 + Cloudflare Workers
- D1 数据库（SQLite）
- R2 对象存储
- Tailwind CSS 4
- pnpm 包管理

## 目录结构

```
ourteam/
├── frontend/          # Astro srcDir
│   ├── components/    # UI 组件
│   ├── layouts/       # 页面布局
│   ├── pages/         # 路由页面
│   ├── lib/           # 工具函数
│   ├── styles/        # 全局样式
│   ├── data/          # 构建期导出的数据
│   └── content/       # Markdown 内容
├── backend/           # 后台逻辑
│   ├── lib/admin/     # 管理模块
│   ├── db/migrations/ # 数据库迁移
│   ├── middleware.ts   # 鉴权中间件
│   └── scripts/       # 构建脚本
├── cloudflare/        # 部署配置
│   ├── wrangler.jsonc # Worker 配置
│   └── public/        # 静态资源
├── scripts/           # 运维脚本
└── config.env.example # 配置模板
```

## 数据流

1. 后台写入 D1 数据库
2. 构建期 `export-d1-posts.mjs` 从 D1 导出数据到 `frontend/data/`
3. Astro 构建时读取导出数据生成静态页面
4. 部署到 Cloudflare Workers

## 安全

- 所有密钥通过 Worker secrets 管理
- 会话使用 HMAC-SHA256 签名
- 口令只存 SHA-256 哈希
- pre-commit hook 检查敏感信息
