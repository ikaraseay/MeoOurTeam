-- 新闻动态

CREATE TABLE news (
  id          TEXT PRIMARY KEY,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  summary     TEXT NOT NULL DEFAULT '',
  pub_date    TEXT,
  category    TEXT NOT NULL DEFAULT '',
  tags        TEXT NOT NULL DEFAULT '[]',
  status      TEXT NOT NULL DEFAULT 'draft',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  updated_at  TEXT NOT NULL
);

CREATE INDEX idx_news_status ON news(status, pub_date DESC);
