-- 后台改过的默认文字。
-- key   —— 文案键（site.name / nav.home / hero.title …）
-- value —— 文案内容
-- 只存**改过的**：跟默认值一样的条目不落库（重置就是删行）。

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
