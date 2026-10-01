/** 本地时区下的 YYYY-MM-DD */
export function toDayKey(date: Date | number): string {
  const d = typeof date === 'number' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfDay(date: Date | number): Date {
  const d = typeof date === 'number' ? new Date(date) : new Date(date.getTime());
  d.setHours(0, 0, 0, 0);
  return d;
}

/** 以周一为一周的第一天 */
export function startOfWeek(date: Date | number): Date {
  const d = startOfDay(date);
  const weekday = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - weekday);
  return d;
}

export function startOfMonth(date: Date | number): Date {
  const d = startOfDay(date);
  d.setDate(1);
  return d;
}

export function addDays(date: Date | number, days: number): Date {
  const d = typeof date === 'number' ? new Date(date) : new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date | number, months: number): Date {
  const d = typeof date === 'number' ? new Date(date) : new Date(date.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

/** 生成 [from, to] 之间全部日期键（含两端） */
export function enumerateDayKeys(from: Date | number, to: Date | number): string[] {
  const keys: string[] = [];
  let cursor = startOfDay(from);
  const end = startOfDay(to);
  // 兜底上限，避免脏数据导致死循环
  for (let i = 0; i < 4000 && cursor.getTime() <= end.getTime(); i += 1) {
    keys.push(toDayKey(cursor));
    cursor = addDays(cursor, 1);
  }
  return keys;
}

/** 「9月26日」 */
export function formatMonthDay(ts: number): string {
  const d = new Date(ts);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

/** 「9/26」 */
export function formatShortDay(dayKey: string): string {
  const [, month, day] = dayKey.split('-');
  return `${Number(month)}/${Number(day)}`;
}

/** 「14:32」 */
export function formatTimeOfDay(ts: number): string {
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** 「9月26日 星期六」 */
export function formatFullDay(ts: number): string {
  const d = new Date(ts);
  const weekday = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()] ?? '';
  return `${d.getMonth() + 1}月${d.getDate()}日 星期${weekday}`;
}

export function isSameDayKey(a: string, b: string): boolean {
  return a === b;
}
