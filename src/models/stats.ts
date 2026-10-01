export interface DailyBucket {
  /** YYYY-MM-DD */
  dayKey: string;
  ms: number;
}

export interface SubjectStats {
  subjectId: string;
  /** 全部时间累计 */
  totalMs: number;
  /** 近 2 周（含今天） */
  last14DaysMs: number;
  /** 近 1 月（含今天） */
  last30DaysMs: number;
  /** 本周（自然周，周一起算） */
  weekMs: number;
  /** 本月（自然月） */
  monthMs: number;
  /** 今天 */
  todayMs: number;
  sessionCount: number;
  lastStudiedAt: number | null;
  /** 稀疏序列：只有真正学习过的日期才会有条目 */
  daily: DailyBucket[];
  /** 最近一次学习的日期键 */
  lastDayKey: string | null;
}

export interface LibraryTotals {
  totalMs: number;
  last14DaysMs: number;
  last30DaysMs: number;
  weekMs: number;
  monthMs: number;
  todayMs: number;
  sessionCount: number;
}

export interface LibrarySnapshot {
  subjects: import('./subject').Subject[];
  statsBySubject: Record<string, SubjectStats>;
  dailyAll: DailyBucket[];
  totals: LibraryTotals;
}

export interface Milestone {
  /** 小时阈值 */
  hours: number;
  title: string;
  description: string;
}
