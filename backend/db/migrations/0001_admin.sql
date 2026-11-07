-- 后台的数据层：文档草稿 / 图库元数据 / 登录限流
-- ⚠️ 改了这份文件要再跑一次：wrangler d1 migrations apply ourteam-content --remote

CREATE TABLE documents (
  id            TEXT PRIMARY KEY,
  slug          TEXT NOT NULL,
  locale        TEXT NOT NULL DEFAULT 'zh',
  title         TEXT NOT NULL,
  description   TEXT NOT NULL DEFAULT '',
  body          TEXT NOT NULL DEFAULT '',
  pub_date      TEXT,
  updated_date  TEXT,
  status        TEXT NOT NULL DEFAULT 'draft',
  category      TEXT,
  tags          TEXT NOT NULL DEFAULT '[]',
  license       TEXT NOT NULL DEFAULT 'cc-by',
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL,
  published_at  TEXT,
  UNIQUE (slug, locale)
);

CREATE TABLE media (
  id         TEXT PRIMARY KEY,
  key        TEXT NOT NULL UNIQUE,
  filename   TEXT NOT NULL,
  mime       TEXT NOT NULL,
  size       INTEGER NOT NULL,
  alt        TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);

CREATE TABLE login_attempts (
  ip        TEXT PRIMARY KEY,
  count     INTEGER NOT NULL,
  window_at TEXT NOT NULL
);

CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_locale ON documents(locale, status);
