const MS_PER_MINUTE = 60_000;
const MS_PER_HOUR = 3_600_000;

/** Steam 风格：`已学习 127.3 小时` */
export function formatHours(ms: number, digits = 1): string {
  const hours = ms / MS_PER_HOUR;
  if (hours > 0 && hours < 0.1) return '< 0.1';
  return hours.toFixed(digits);
}

/** Steam 的短文案：`127.3 小时` / `48 分钟` */
export function formatDurationShort(ms: number): string {
  if (ms <= 0) return '0 分钟';
  if (ms < MS_PER_HOUR) {
    const minutes = Math.max(1, Math.round(ms / MS_PER_MINUTE));
    return `${minutes} 分钟`;
  }
  return `${formatHours(ms)} 小时`;
}

/** 列表卡片上的主文案：`已学习 127.3 小时` */
export function formatLearned(ms: number): string {
  if (ms <= 0) return '尚未开始学习';
  return `已学习 ${formatHours(ms)} 小时`;
}

/** 近 2 周文案 */
export function formatLastTwoWeeks(ms: number): string {
  if (ms <= 0) return '近 2 周：0 小时';
  return `近 2 周：${formatHours(ms)} 小时`;
}

/** 计时器上的 `HH:MM:SS`（超过 99 小时也不截断） */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((v) => String(v).padStart(2, '0')).join(':');
}

/** 通知栏里的紧凑文案：`1 小时 23 分` */
export function formatCompact(ms: number): string {
  if (ms < MS_PER_MINUTE) return '不足 1 分钟';
  const totalMinutes = Math.floor(ms / MS_PER_MINUTE);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes} 分钟`;
  if (minutes === 0) return `${hours} 小时`;
  return `${hours} 小时 ${minutes} 分`;
}

export function formatHoursValue(ms: number, digits = 1): number {
  return Number((ms / MS_PER_HOUR).toFixed(digits));
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
