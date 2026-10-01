import type { DailyTotalRow, SubjectTotalRow } from '@/db/sessionRepository';
import type { Subject } from '@/models/subject';
import type { DailyBucket, LibrarySnapshot, LibraryTotals, SubjectStats } from '@/models/stats';
import {
  addDays,
  addMonths,
  enumerateDayKeys,
  formatShortDay,
  startOfDay,
  startOfMonth,
  startOfWeek,
  toDayKey,
} from '@/utils/date';

export type DetailRange = 'last14' | 'last30' | 'all';

export interface SeriesPoint {
  key: string;
  /** 横轴标签 */
  label: string;
  /** 该点代表的时长（毫秒） */
  ms: number;
}

function sumKeys(daily: Map<string, number>, keys: readonly string[]): number {
  let total = 0;
  for (const key of keys) {
    total += daily.get(key) ?? 0;
  }
  return total;
}

/**
 * 把「按天」的稀疏序列折成 Map。
 * 同一天出现多条时求和而不是覆盖 —— 调用方如果传进来还没合并的数据也不会算错。
 */
function toDayMap(daily: DailyBucket[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const bucket of daily) {
    map.set(bucket.dayKey, (map.get(bucket.dayKey) ?? 0) + bucket.ms);
  }
  return map;
}

export function buildSubjectStats(
  subjectId: string,
  dailyRows: DailyTotalRow[],
  totalRow: SubjectTotalRow | undefined,
  now: number
): SubjectStats {
  const daily = new Map<string, number>();
  for (const row of dailyRows) {
    if (row.subject_id !== subjectId) continue;
    daily.set(row.day_key, (daily.get(row.day_key) ?? 0) + row.ms);
  }

  const todayKey = toDayKey(now);
  const last14Keys = enumerateDayKeys(addDays(startOfDay(now), -13), now);
  const last30Keys = enumerateDayKeys(addDays(startOfDay(now), -29), now);
  const weekKeys = enumerateDayKeys(startOfWeek(now), now);
  const monthKeys = enumerateDayKeys(startOfMonth(now), now);

  const sortedKeys = [...daily.keys()].sort();
  const lastDayKey = sortedKeys.length > 0 ? (sortedKeys[sortedKeys.length - 1] ?? null) : null;

  return {
    subjectId,
    totalMs: totalRow?.ms ?? 0,
    last14DaysMs: sumKeys(daily, last14Keys),
    last30DaysMs: sumKeys(daily, last30Keys),
    weekMs: sumKeys(daily, weekKeys),
    monthMs: sumKeys(daily, monthKeys),
    todayMs: daily.get(todayKey) ?? 0,
    sessionCount: totalRow?.sessions ?? 0,
    lastStudiedAt: totalRow?.last_studied_at ?? null,
    daily: sortedKeys.map((dayKey) => ({ dayKey, ms: daily.get(dayKey) ?? 0 })),
    lastDayKey,
  };
}

export function buildLibrarySnapshot(
  subjects: Subject[],
  dailyRows: DailyTotalRow[],
  subjectRows: SubjectTotalRow[],
  now: number
): LibrarySnapshot {
  const totalBySubject = new Map(subjectRows.map((row) => [row.subject_id, row]));

  const statsBySubject: Record<string, SubjectStats> = {};
  for (const subject of subjects) {
    statsBySubject[subject.id] = buildSubjectStats(
      subject.id,
      dailyRows,
      totalBySubject.get(subject.id),
      now
    );
  }

  const dailyAllMap = new Map<string, number>();
  const sessionCountByDay = new Map<string, number>();
  for (const row of dailyRows) {
    dailyAllMap.set(row.day_key, (dailyAllMap.get(row.day_key) ?? 0) + row.ms);
    sessionCountByDay.set(row.day_key, (sessionCountByDay.get(row.day_key) ?? 0) + row.sessions);
  }

  const dailyAll: DailyBucket[] = [...dailyAllMap.entries()]
    .map(([dayKey, ms]) => ({ dayKey, ms }))
    .sort((a, b) => (a.dayKey < b.dayKey ? -1 : 1));

  const totals: LibraryTotals = {
    totalMs: subjectRows.reduce((sum, row) => sum + row.ms, 0),
    last14DaysMs: 0,
    last30DaysMs: 0,
    weekMs: 0,
    monthMs: 0,
    todayMs: 0,
    sessionCount: subjectRows.reduce((sum, row) => sum + row.sessions, 0),
  };

  for (const stats of Object.values(statsBySubject)) {
    totals.last14DaysMs += stats.last14DaysMs;
    totals.last30DaysMs += stats.last30DaysMs;
    totals.weekMs += stats.weekMs;
    totals.monthMs += stats.monthMs;
    totals.todayMs += stats.todayMs;
  }

  return { subjects, statsBySubject, dailyAll, totals };
}

/** 把稀疏的按天数据补齐成连续序列，图表不会因为"那天没学习"而断开 */
function fillDays(daily: DailyBucket[], from: Date | number, to: Date | number): SeriesPoint[] {
  const map = toDayMap(daily);
  return enumerateDayKeys(from, to).map((dayKey) => ({
    key: dayKey,
    label: formatShortDay(dayKey),
    ms: map.get(dayKey) ?? 0,
  }));
}

function fillMonths(daily: DailyBucket[], from: Date | number, to: Date | number): SeriesPoint[] {
  const map = new Map<string, number>();
  for (const [dayKey, ms] of toDayMap(daily)) {
    const monthKey = dayKey.slice(0, 7);
    map.set(monthKey, (map.get(monthKey) ?? 0) + ms);
  }
  const points: SeriesPoint[] = [];
  let cursor = startOfMonth(from);
  const end = startOfMonth(to);
  for (let i = 0; i < 240 && cursor.getTime() <= end.getTime(); i += 1) {
    const monthKey = toDayKey(cursor).slice(0, 7);
    points.push({
      key: monthKey,
      label: `${Number(monthKey.slice(5, 7))}月`,
      ms: map.get(monthKey) ?? 0,
    });
    cursor = addMonths(cursor, 1);
  }
  return points;
}

/**
 * 科目详情页的时长曲线。
 * 「全部时间」跨度较大时自动按月聚合，避免横轴挤成一团。
 */
export function buildRangeSeries(
  daily: DailyBucket[],
  range: DetailRange,
  now: number
): SeriesPoint[] {
  if (range === 'last14') {
    return fillDays(daily, addDays(startOfDay(now), -13), startOfDay(now));
  }
  if (range === 'last30') {
    return fillDays(daily, addDays(startOfDay(now), -29), startOfDay(now));
  }
  const first = daily[0]?.dayKey ?? toDayKey(now);
  const from = startOfDay(new Date(`${first}T00:00:00`));
  const spanDays = Math.round((startOfDay(now).getTime() - from.getTime()) / 86_400_000) + 1;
  return spanDays > 60 ? fillMonths(daily, from, now) : fillDays(daily, from, now);
}

/** 统计页：最近 N 天的柱状图数据 */
export function buildDailySeries(daily: DailyBucket[], days: number, now: number): SeriesPoint[] {
  return fillDays(daily, addDays(startOfDay(now), -(days - 1)), startOfDay(now));
}

/** 统计页：最近 N 个自然周（周一为起点）的柱状图数据 */
export function buildWeeklySeries(daily: DailyBucket[], weeks: number, now: number): SeriesPoint[] {
  const map = toDayMap(daily);
  const points: SeriesPoint[] = [];
  for (let i = weeks - 1; i >= 0; i -= 1) {
    const weekStart = startOfWeek(addDays(now, -7 * i));
    const keys = enumerateDayKeys(weekStart, addDays(weekStart, 6));
    const ms = keys.reduce((sum, key) => sum + (map.get(key) ?? 0), 0);
    points.push({
      key: toDayKey(weekStart),
      label: formatShortDay(toDayKey(weekStart)),
      ms,
    });
  }
  return points;
}

/** 统计页：最近 N 个自然月的柱状图数据 */
export function buildMonthlySeries(daily: DailyBucket[], months: number, now: number): SeriesPoint[] {
  const map = new Map<string, number>();
  for (const [dayKey, ms] of toDayMap(daily)) {
    const monthKey = dayKey.slice(0, 7);
    map.set(monthKey, (map.get(monthKey) ?? 0) + ms);
  }
  const points: SeriesPoint[] = [];
  for (let i = months - 1; i >= 0; i -= 1) {
    // 必须先归一到当月 1 号再减月份：
    // 否则 3 月 31 日减 1 个月会溢出成 3 月 3 日，月份键重复
    const monthStart = addMonths(startOfMonth(now), -i);
    const monthKey = toDayKey(monthStart).slice(0, 7);
    points.push({
      key: monthKey,
      label: `${Number(monthKey.slice(5, 7))}月`,
      ms: map.get(monthKey) ?? 0,
    });
  }
  return points;
}

export function seriesTotal(points: SeriesPoint[]): number {
  return points.reduce((sum, point) => sum + point.ms, 0);
}

export function seriesPeak(points: SeriesPoint[]): number {
  return points.reduce((max, point) => Math.max(max, point.ms), 0);
}

/** 某个时间戳所属自然周（周一为起点）的日期键，例如 '2026-09-21' */
export function buildWeekKey(ts: number): string {
  return toDayKey(startOfWeek(ts));
}
