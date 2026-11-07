-- 发布管理表
CREATE TABLE IF NOT EXISTS releases (
  id          TEXT PRIMARY KEY,
  version     TEXT NOT NULL UNIQUE,
  status      TEXT NOT NULL DEFAULT 'building',
  build_log   TEXT,
  created_at  TEXT NOT NULL,
  completed_at TEXT,
  created_by  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_releases_version ON releases(version DESC);
CREATE INDEX IF NOT EXISTS idx_releases_status ON releases(status);

-- 当前活跃版本
CREATE TABLE IF NOT EXISTS current_release (
  id          INTEGER PRIMARY KEY CHECK (id = 1),
  version     TEXT NOT NULL,
  activated_at TEXT NOT NULL
);
