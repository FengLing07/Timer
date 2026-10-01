import type { SQLiteDatabase } from 'expo-sqlite';

import { SEED_SUBJECTS } from '@/data/subjects';

export const DATABASE_NAME = 'kaoyan-study-library.db';

/**
 * 版本号。新增迁移时：
 * 1. 把 DATABASE_VERSION + 1
 * 2. 在 `migrateDatabase` 里追加一个 `if (version === n) { ... }` 分支
 */
export const DATABASE_VERSION = 1;

const CREATE_TABLES = `
PRAGMA journal_mode = 'wal';
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS subjects (
  id                  TEXT    PRIMARY KEY NOT NULL,
  name                TEXT    NOT NULL,
  subtitle            TEXT    NOT NULL DEFAULT '',
  category            TEXT    NOT NULL DEFAULT 'professional',
  weekly_goal_minutes INTEGER NOT NULL DEFAULT 420,
  palette             TEXT    NOT NULL DEFAULT '["#212A20","#141A15","#8ED6A4"]',
  monogram            TEXT    NOT NULL DEFAULT '',
  accent              TEXT    NOT NULL DEFAULT '#8ED6A4',
  cover_image         TEXT,
  sort_order          INTEGER NOT NULL DEFAULT 0,
  archived            INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id          TEXT    PRIMARY KEY NOT NULL,
  subject_id  TEXT    NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  started_at  INTEGER NOT NULL,
  ended_at    INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  paused_ms   INTEGER NOT NULL DEFAULT 0,
  day_key     TEXT    NOT NULL,
  source      TEXT    NOT NULL DEFAULT 'timer',
  note        TEXT,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_subject_started
  ON study_sessions (subject_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_day
  ON study_sessions (day_key);
CREATE INDEX IF NOT EXISTS idx_sessions_started
  ON study_sessions (started_at DESC);
`;

/**
 * 每个数据库连接都要单独设置 busy_timeout：
 * 后台通知任务与前台 App 会各自持有一个连接（WAL 模式下读写并行），
 * 加超时可以避免极短时间内的并发写直接抛 SQLITE_BUSY。
 */
const CONNECTION_PRAGMAS = `
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
`;

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(CONNECTION_PRAGMAS);

  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version === 0) {
    await db.execAsync(CREATE_TABLES);
    version = 1;
  }

  // 未来的迁移写在这里，例如：
  // if (version === 1) { await db.execAsync('ALTER TABLE ...'); version = 2; }

  await seedSubjects(db);

  if (version !== DATABASE_VERSION) {
    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  }
}

/**
 * 科目是「内置内容」，不是用户数据，因此每次启动都做一次幂等 upsert：
 * 名称/封面/排序以代码为准，但保留用户自己改过的每周目标。
 */
async function seedSubjects(db: SQLiteDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const subject of SEED_SUBJECTS) {
      await db.runAsync(
        `INSERT INTO subjects
           (id, name, subtitle, category, weekly_goal_minutes, palette, monogram, accent, cover_image, sort_order, archived)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name       = excluded.name,
           subtitle   = excluded.subtitle,
           category   = excluded.category,
           palette    = excluded.palette,
           monogram   = excluded.monogram,
           accent     = excluded.accent,
           cover_image = excluded.cover_image,
           sort_order = excluded.sort_order`,
        subject.id,
        subject.name,
        subject.subtitle,
        subject.category,
        subject.weeklyGoalMinutes,
        JSON.stringify(subject.palette),
        subject.monogram,
        subject.accent,
        subject.coverImage ?? null,
        subject.sortOrder,
        subject.archived ? 1 : 0
      );
    }
  });
}
