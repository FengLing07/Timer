import type { SQLiteDatabase } from 'expo-sqlite';

import type { CoverPalette, Subject, SubjectCategory } from '@/models/subject';

interface SubjectRow {
  id: string;
  name: string;
  subtitle: string;
  category: string;
  weekly_goal_minutes: number;
  palette: string;
  monogram: string;
  accent: string;
  cover_image: string | null;
  sort_order: number;
  archived: number;
}

const DEFAULT_PALETTE: CoverPalette = ['#212A20', '#141A15', '#8ED6A4'];

function parsePalette(raw: string): CoverPalette {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length >= 3) {
      const [from, to, glow] = parsed as string[];
      return [from ?? DEFAULT_PALETTE[0], to ?? DEFAULT_PALETTE[1], glow ?? DEFAULT_PALETTE[2]];
    }
  } catch {
    // 落回默认配色
  }
  return DEFAULT_PALETTE;
}

function mapSubject(row: SubjectRow): Subject {
  return {
    id: row.id,
    name: row.name,
    subtitle: row.subtitle,
    category: (row.category === 'public' ? 'public' : 'professional') as SubjectCategory,
    weeklyGoalMinutes: row.weekly_goal_minutes,
    palette: parsePalette(row.palette),
    monogram: row.monogram,
    accent: row.accent,
    coverImage: row.cover_image,
    sortOrder: row.sort_order,
    archived: row.archived === 1,
  };
}

export async function listSubjects(db: SQLiteDatabase): Promise<Subject[]> {
  const rows = await db.getAllAsync<SubjectRow>(
    'SELECT * FROM subjects WHERE archived = 0 ORDER BY sort_order ASC, name ASC'
  );
  return rows.map(mapSubject);
}

export async function getSubject(
  db: SQLiteDatabase,
  subjectId: string
): Promise<Subject | null> {
  const row = await db.getFirstAsync<SubjectRow>('SELECT * FROM subjects WHERE id = ?', subjectId);
  return row ? mapSubject(row) : null;
}

export async function updateWeeklyGoal(
  db: SQLiteDatabase,
  subjectId: string,
  minutes: number
): Promise<void> {
  await db.runAsync(
    'UPDATE subjects SET weekly_goal_minutes = ? WHERE id = ?',
    Math.max(0, Math.round(minutes)),
    subjectId
  );
}
