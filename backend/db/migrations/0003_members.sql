-- 团队成员

CREATE TABLE members (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  role        TEXT NOT NULL DEFAULT '',
  bio         TEXT NOT NULL DEFAULT '',
  avatar_key  TEXT NOT NULL DEFAULT '',
  email       TEXT NOT NULL DEFAULT '',
  homepage    TEXT NOT NULL DEFAULT '',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL
);

CREATE INDEX idx_members_active ON members(is_active, sort_order);
