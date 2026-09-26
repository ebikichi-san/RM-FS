-- SQLite-compatible apply of supabase/migrations/20260925120000_diagnosis_results.sql
-- jsonb/uuid/RLS are Postgres-only. Types are mapped for local Prisma/SQLite.

CREATE TABLE IF NOT EXISTS diagnosis_results (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  session_id TEXT,
  user_id TEXT,
  department_name TEXT NOT NULL DEFAULT '',
  position_level TEXT NOT NULL DEFAULT 'STAFF',
  overall_score REAL NOT NULL DEFAULT 0,
  overall_status TEXT NOT NULL DEFAULT 'YELLOW',
  gap_index REAL NOT NULL DEFAULT 0,
  role_gap_index REAL NOT NULL DEFAULT 0,
  high_alert INTEGER NOT NULL DEFAULT 0,
  red_card_forced INTEGER NOT NULL DEFAULT 0,
  unknown_count INTEGER NOT NULL DEFAULT 0,
  unknown_rate REAL NOT NULL DEFAULT 0,
  answered_count INTEGER NOT NULL DEFAULT 0,
  answers_json TEXT NOT NULL DEFAULT '[]',
  domains_json TEXT NOT NULL DEFAULT '[]',
  domain_gaps_json TEXT NOT NULL DEFAULT '[]',
  red_cards_json TEXT NOT NULL DEFAULT '[]',
  black_box_risks_json TEXT NOT NULL DEFAULT '[]',
  diagnosis_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS diagnosis_results_project_created_idx
  ON diagnosis_results (project_id, created_at);

CREATE INDEX IF NOT EXISTS diagnosis_results_user_created_idx
  ON diagnosis_results (user_id, created_at);
