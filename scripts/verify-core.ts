/**
 * 核心逻辑验证（纯 Node，不依赖模拟器）：
 *   node --import ./scripts/register-loader.mjs scripts/verify-core.ts
 *
 * 覆盖「时间戳差值法」的全部关键路径：
 * 1. 时长 = 当前时间 − 开始时间，与调用次数无关
 * 2. 暂停会冻结时长，继续会开新分段
 * 3. 进程被杀后重新打开，间隔期间照样计入
 * 4. 忘记结束的超长分段会被裁剪
 * 5. 时钟回拨不会产生负数
 * 6. 日/周/月聚合与里程碑判定
 */
import { enumerateDayKeys, startOfMonth, startOfWeek, toDayKey } from '@/utils/date';
import { formatClock, formatCompact, formatHours, formatLearned } from '@/utils/format';
import {
  elapsedMs,
  pauseTimer,
  recoverTimer,
  resumeTimer,
  settleTimer,
  startTimer,
} from '@/services/timerEngine';
import {
  buildDailySeries,
  buildMonthlySeries,
  buildWeekKey,
  buildWeeklySeries,
  buildRangeSeries,
  buildSubjectStats,
  buildLibrarySnapshot,
} from '@/services/statsService';
import { evaluateMilestones } from '@/services/milestones';
import type { Subject } from '@/models/subject';

let failures = 0;
let checks = 0;

function check(label: string, actual: unknown, expected: unknown) {
  checks += 1;
  const ok = Object.is(actual, expected);
  if (!ok) failures += 1;
  const status = ok ? 'PASS' : 'FAIL';
  console.log(`${status}  ${label}${ok ? '' : `  → 实际 ${String(actual)}，期望 ${String(expected)}`}`);
}

const MINUTE = 60_000;
const HOUR = 3_600_000;

// 固定一个基准时刻，避免测试结果随运行时间变化
const T0 = new Date('2026-09-26T09:00:00+08:00').getTime();

console.log('\n── 1. 时间戳差值法 ──');
{
  const timer = startTimer('data-structure', T0);
  check('刚开始时为 0', elapsedMs(timer, T0), 0);
  check('10 分钟后 = 10 分钟', elapsedMs(timer, T0 + 10 * MINUTE), 10 * MINUTE);
  // 关键：不依赖任何 tick 调用，直接跳到 2.5 小时后仍然是准确值
  check('2.5 小时后 = 2.5 小时', elapsedMs(timer, T0 + 150 * MINUTE), 2.5 * HOUR);
}

console.log('\n── 2. 暂停 / 继续 ──');
{
  let timer = startTimer('advanced-math', T0);
  timer = pauseTimer(timer, T0 + 30 * MINUTE);
  check('暂停瞬间累计 30 分钟', elapsedMs(timer, T0 + 30 * MINUTE), 30 * MINUTE);
  check('暂停期间不再增长', elapsedMs(timer, T0 + 90 * MINUTE), 30 * MINUTE);

  timer = resumeTimer(timer, T0 + 90 * MINUTE);
  check('继续后累加 15 分钟', elapsedMs(timer, T0 + 105 * MINUTE), 45 * MINUTE);

  const { draft, durationMs } = settleTimer(timer, T0 + 105 * MINUTE);
  check('结束：有效时长 45 分钟', durationMs, 45 * MINUTE);
  check('结束：会话跨度 = endedAt − startedAt', draft.endedAt - draft.startedAt, 105 * MINUTE);
  check('结束：暂停时长 = 跨度 − 有效时长', draft.pausedMs, 60 * MINUTE);
  check('结束：day_key 按开始时间归属', draft.dayKey, '2026-09-26');
}

console.log('\n── 3. App 被杀后恢复 ──');
{
  const timer = startTimer('english', T0);
  // 模拟：9:00 开始 → 9:40 进程被杀 → 10:00 重新打开
  const recovery = recoverTimer(timer, T0 + 60 * MINUTE);
  check('没有触发裁剪', recovery.clamped, false);
  check('恢复后时长 = 1 小时', elapsedMs(recovery.timer, T0 + 60 * MINUTE), HOUR);
}

console.log('\n── 4. 忘记结束时裁剪超长分段 ──');
{
  const timer = startTimer('politics', T0);
  const recovery = recoverTimer(timer, T0 + 20 * HOUR, { maxSegmentMs: 8 * HOUR });
  check('触发裁剪', recovery.clamped, true);
  check('被裁掉的时长 = 12 小时', recovery.clampedMs, 12 * HOUR);
  check('结算按上限 8 小时', elapsedMs(recovery.timer, T0 + 20 * HOUR), 8 * HOUR);
}

console.log('\n── 5. 时钟回拨保护 ──');
{
  const timer = startTimer('data-structure', T0);
  check('now 早于开始时间时取 0', elapsedMs(timer, T0 - 5 * MINUTE), 0);
}

console.log('\n── 6. 格式化 ──');
{
  check('92 分钟 → 1.5 小时', formatHours(90 * MINUTE), '1.5');
  check('列表主文案', formatLearned(127.3 * HOUR), '已学习 127.3 小时');
  check('秒表 2:03:04', formatClock(2 * HOUR + 3 * MINUTE + 4_000), '02:03:04');
  check('紧凑文案', formatCompact(HOUR + 23 * MINUTE), '1 小时 23 分');
  check('0 时长文案', formatLearned(0), '尚未开始学习');
}

console.log('\n── 7. 日期聚合 ──');
{
  check('14 天窗口长度', enumerateDayKeys(T0 - 13 * 24 * HOUR, T0).length, 14);
  check('周一为一周起点', toDayKey(startOfWeek(T0)), '2026-09-21');
  check('月初', toDayKey(startOfMonth(T0)), '2026-09-01');
  check('周键', buildWeekKey(T0), '2026-09-21');
}

console.log('\n── 8. 统计聚合 ──');
{
  const dailyRows = [
    { subject_id: 'data-structure', day_key: '2026-09-26', ms: 2 * HOUR, sessions: 1 },
    { subject_id: 'data-structure', day_key: '2026-09-25', ms: HOUR, sessions: 1 },
    { subject_id: 'english', day_key: '2026-09-26', ms: 30 * MINUTE, sessions: 1 },
    { subject_id: 'english', day_key: '2026-07-01', ms: 5 * HOUR, sessions: 2 },
  ];
  const subjectRows = [
    { subject_id: 'data-structure', ms: 3 * HOUR, sessions: 2, last_studied_at: T0 },
    { subject_id: 'english', ms: 5.5 * HOUR, sessions: 3, last_studied_at: T0 + 30 * MINUTE },
  ];

  const stats = buildSubjectStats('data-structure', dailyRows, subjectRows[0], T0 + 4 * HOUR);
  check('累计 = 3 小时', stats.totalMs, 3 * HOUR);
  check('今天 = 2 小时', stats.todayMs, 2 * HOUR);
  check('本周 = 3 小时（两天都在本周）', stats.weekMs, 3 * HOUR);
  check('本月 = 3 小时', stats.monthMs, 3 * HOUR);
  check('近 14 天 = 3 小时', stats.last14DaysMs, 3 * HOUR);
  check('稀疏序列只有 2 天', stats.daily.length, 2);

  const englishStats = buildSubjectStats('english', dailyRows, subjectRows[1], T0 + 4 * HOUR);
  check('7 月的记录不计入近 14 天', englishStats.last14DaysMs, 30 * MINUTE);
  check('但计入累计', englishStats.totalMs, 5.5 * HOUR);

  const subjectSeeds: Subject[] = [
      { id: 'data-structure', name: '数据结构', subtitle: '', category: 'professional', weeklyGoalMinutes: 600, palette: ['#000', '#111', '#222'], monogram: 'DS', accent: '#0ff', sortOrder: 1, archived: false },
      { id: 'english', name: '英语', subtitle: '', category: 'public', weeklyGoalMinutes: 420, palette: ['#000', '#111', '#222'], monogram: 'EN', accent: '#f0f', sortOrder: 2, archived: false },
    ];

  const snapshot = buildLibrarySnapshot(
    subjectSeeds,
    dailyRows,
    subjectRows,
    T0 + 4 * HOUR
  );
  check('全库累计 = 8.5 小时', formatHours(snapshot.totals.totalMs), '8.5');
  check('全库今天 = 2.5 小时', formatHours(snapshot.totals.todayMs), '2.5');
  check('全库记录数', snapshot.totals.sessionCount, 5);

  const daily = buildDailySeries(dailyRows.map((r) => ({ dayKey: r.day_key, ms: r.ms })), 7, T0 + 4 * HOUR);
  check('每日序列长度 7', daily.length, 7);
  check('最后一天是今天', daily[daily.length - 1]?.key, '2026-09-26');

  // 故意传入还没合并的原始行（09-26 有两科），验证聚合函数会求和而不是覆盖
  const weekly = buildWeeklySeries(
    dailyRows.map((r) => ({ dayKey: r.day_key, ms: r.ms })),
    4,
    T0 + 4 * HOUR
  );
  check('每周序列长度 4', weekly.length, 4);
  check('最近一周汇总 = 3.5 小时', formatHours(weekly[weekly.length - 1]?.ms ?? -1), '3.5');
  check('上上周为空', weekly[weekly.length - 3]?.ms, 0);

  const monthly = buildMonthlySeries(
    dailyRows.map((r) => ({ dayKey: r.day_key, ms: r.ms })),
    6,
    T0 + 4 * HOUR
  );
  check('每月序列长度 6', monthly.length, 6);
  check('9 月汇总 = 3.5 小时', formatHours(monthly[monthly.length - 1]?.ms ?? -1), '3.5');
  check('7 月汇总 = 5 小时', formatHours(monthly[monthly.length - 3]?.ms ?? -1), '5.0');
  check('月份键不重复', new Set(monthly.map((p) => p.key)).size, 6);

  const all = buildRangeSeries(
    [{ dayKey: '2026-05-01', ms: 4 * HOUR }],
    'all',
    T0 + 4 * HOUR
  );
  check('跨度 > 60 天时按月聚合', all[0]?.label, '5月');
  check('按月聚合覆盖到 9 月', all[all.length - 1]?.label, '9月');
}

console.log('\n── 9. 里程碑 ──');
{
  const at9h = evaluateMilestones(9 * HOUR);
  check('9 小时：10h 未解锁', at9h[0]?.unlocked, false);
  check('9 小时：10h 进度 0.9', at9h[0]?.progress, 0.9);
  const at120h = evaluateMilestones(120 * HOUR);
  check('120 小时：10/50/100 解锁', at120h.slice(0, 3).every((m) => m.unlocked), true);
  check('120 小时：500 未解锁', at120h[3]?.unlocked, false);
  check('700 小时全解锁', evaluateMilestones(700 * HOUR).every((m) => m.unlocked), true);
  check('阈值就是 10/50/100/500', evaluateMilestones(0).map((m) => m.milestone.hours).join(','), '10,50,100,500');
}

console.log(`\n${failures === 0 ? '✅' : '❌'} ${checks - failures}/${checks} 项通过`);
// 不引入 @types/node，用可选链拿到退出码
const nodeProcess = (globalThis as { process?: { exitCode?: number } }).process;
if (nodeProcess) nodeProcess.exitCode = failures > 0 ? 1 : 0;
