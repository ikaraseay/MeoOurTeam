-- 成果（论文、竞赛、原型等）

CREATE TABLE outcomes (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  type        TEXT NOT NULL DEFAULT 'paper',
  description TEXT NOT NULL DEFAULT '',
  url         TEXT NOT NULL DEFAULT '',
  pdf_key     TEXT NOT NULL DEFAULT '',
  date        TEXT,
  authors     TEXT NOT NULL DEFAULT '[]',
  tags        TEXT NOT NULL DEFAULT '[]',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1,
  created_at  TEXT NOT NULL
);

CREATE INDEX idx_outcomes_type ON outcomes(type, is_active, sort_order);
