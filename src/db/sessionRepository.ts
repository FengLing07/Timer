import type { SQLiteDatabase } from 'expo-sqlite';

import type { SessionDraft, SessionSource, StudySession } from '@/models/session';

interface SessionRow {
  id: string;
  subject_id: string;
  started_at: number;
  ended_at: number;
  duration_ms: number;
  paused_ms: number;
  day_key: string;
  source: string;
  note: string | null;
  created_at: number;
}

export interface DailyTotalRow {
  subject_id: string;
  day_key: string;
  ms: number;
  sessions: number;
}

export interface SubjectTotalRow {
  subject_id: string;
  ms: number;
  sessions: number;
  last_studied_at: number | null;
}

function mapSession(row: SessionRow): StudySession {
  return {
    id: row.id,
    subjectId: row.subject_id,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    durationMs: row.duration_ms,
    pausedMs: row.paused_ms,
    dayKey: row.day_key,
    source: row.source as SessionSource,
    note: row.note,
    createdAt: row.created_at,
  };
}

export async function insertSession(
  db: SQLiteDatabase,
  draft: SessionDraft
): Promise<StudySession> {
  const id = draft.id ?? `s_${draft.startedAt.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  const createdAt = draft.createdAt ?? Date.now();
  const session: StudySession = { ...draft, id, createdAt };

  await db.runAsync(
    `INSERT OR REPLACE INTO study_sessions
       (id, subject_id, started_at, ended_at, duration_ms, paused_ms, day_key, source, note, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    session.id,
    session.subjectId,
    session.startedAt,
    session.endedAt,
    Math.round(session.durationMs),
    Math.round(session.pausedMs),
    session.dayKey,
    session.source,
    session.note ?? null,
    session.createdAt
  );

  return session;
}

export async function listSessions(
  db: SQLiteDatabase,
  options: { subjectId?: string; limit?: number } = {}
): Promise<StudySession[]> {
  const limit = options.limit ?? 100;
  const rows = options.subjectId
    ? await db.getAllAsync<SessionRow>(
        'SELECT * FROM study_sessions WHERE subject_id = ? ORDER BY started_at DESC LIMIT ?',
        options.subjectId,
        limit
      )
    : await db.getAllAsync<SessionRow>(
        'SELECT * FROM study_sessions ORDER BY started_at DESC LIMIT ?',
        limit
      );
  return rows.map(mapSession);
}

/**
 * 按「科目 × 本地日期」聚合。
 *
 * 之所以在写库时就算好 `day_key`（本地时区的 YYYY-MM-DD），
 * 而不是在 SQL 里用 `date(started_at/1000,'unixepoch','localtime')`，
 * 是因为 SQLite 的 localtime 依赖设备时区设置，跨时区/夏令时时容易算错日期。
 * 存好 day_key 之后，日/周/月/近 14 天全部可以在这份结果上折叠出来。
 */
export async function aggregateDailyTotals(db: SQLiteDatabase): Promise<DailyTotalRow[]> {
  return db.getAllAsync<DailyTotalRow>(
    `SELECT subject_id,
            day_key,
            SUM(duration_ms) AS ms,
            COUNT(*)         AS sessions
       FROM study_sessions
      GROUP BY subject_id, day_key
      ORDER BY day_key ASC`
  );
}

export async function aggregateSubjectTotals(db: SQLiteDatabase): Promise<SubjectTotalRow[]> {
  return db.getAllAsync<SubjectTotalRow>(
    `SELECT subject_id,
            SUM(duration_ms) AS ms,
            COUNT(*)         AS sessions,
            MAX(ended_at)    AS last_studied_at
       FROM study_sessions
      GROUP BY subject_id`
  );
}

export async function getTotalDuration(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ ms: number | null }>(
    'SELECT SUM(duration_ms) AS ms FROM study_sessions'
  );
  return row?.ms ?? 0;
}

export async function deleteSession(db: SQLiteDatabase, sessionId: string): Promise<void> {
  await db.runAsync('DELETE FROM study_sessions WHERE id = ?', sessionId);
}

export async function deleteAllSessions(db: SQLiteDatabase): Promise<void> {
  await db.runAsync('DELETE FROM study_sessions');
}
