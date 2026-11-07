-- 文案管理表
CREATE TABLE IF NOT EXISTS text_resources (
  id         TEXT PRIMARY KEY,
  module     TEXT NOT NULL,
  key        TEXT NOT NULL,
  value      TEXT NOT NULL,
  locale     TEXT NOT NULL DEFAULT 'zh',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(module, key, locale)
);

CREATE INDEX IF NOT EXISTS idx_text_module ON text_resources(module);
CREATE INDEX IF NOT EXISTS idx_text_key ON text_resources(key);
CREATE INDEX IF NOT EXISTS idx_text_locale ON text_resources(locale);

-- 文案审计日志
CREATE TABLE IF NOT EXISTS text_audit (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  action     TEXT NOT NULL,
  module     TEXT NOT NULL,
  key        TEXT NOT NULL,
  locale     TEXT NOT NULL,
  old_value  TEXT,
  new_value  TEXT,
  actor      TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_created ON text_audit(created_at DESC);
