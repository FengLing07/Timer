import type { SessionDraft } from '@/models/session';
import { toDayKey } from '@/utils/date';
import { clamp } from '@/utils/format';

export type TimerPhase = 'running' | 'paused';

/**
 * 正在进行的计时会话。
 *
 * 关键设计：这里 **不保存任何"已经跑了多少秒"的计数器**，
 * 只保存时间戳与已经结算过的分段时长，任何时候的时长都由
 * `elapsedMs()` 用 `now - segmentStartedAt` 现算出来。
 * 因此 App 被系统杀掉再打开，甚至重启手机，时长都不会丢也不会跑偏。
 */
export interface ActiveTimer {
  /** 本次学习会话 id，结束时直接作为 study_sessions.id */
  id: string;
  subjectId: string;
  /** 第一次点击「开始学习」的时间戳 */
  startedAt: number;
  /** 当前这一段的起点；暂停状态为 null */
  segmentStartedAt: number | null;
  /** 已结算（暂停时）的分段时长之和 */
  accumulatedMs: number;
  phase: TimerPhase;
  /** 最近一次状态变更时间，用于诊断 */
  updatedAt: number;
  /**
   * 最近一次确认「进程还活着」的时间。
   * 只用于崩溃恢复时判断是否需要裁剪异常超长的分段。
   */
  heartbeatAt: number;
}

export interface TimerRecovery {
  timer: ActiveTimer;
  /** 是否发生了裁剪（进程被杀后重新打开，且间隔超过上限） */
  clamped: boolean;
  /** 被裁剪掉的时长（毫秒） */
  clampedMs: number;
}

export interface TimerRecoveryOptions {
  /**
   * 单个运行分段允许的最大长度（毫秒）。
   * 默认 8 小时：超过就认为用户忘了结束，按上限结算，避免出现"一天学了 14 小时"的假数据。
   */
  maxSegmentMs?: number;
}

export const DEFAULT_MAX_SEGMENT_MS = 8 * 60 * 60 * 1000;

/** 极小的随机后缀，避免同一毫秒内两次开始产生相同 id */
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

export function createTimerId(now: number): string {
  return `s_${now.toString(36)}_${randomSuffix()}`;
}

/** 点击「开始学习」：只记录开始时间戳 */
export function startTimer(subjectId: string, now: number): ActiveTimer {
  return {
    id: createTimerId(now),
    subjectId,
    startedAt: now,
    segmentStartedAt: now,
    accumulatedMs: 0,
    phase: 'running',
    updatedAt: now,
    heartbeatAt: now,
  };
}

/**
 * 时长完全由时间戳差值得到：
 * `已结算分段之和 + (当前时间 - 当前分段起点)`。
 * `Math.max(0, ...)` 用来兜住系统校时/用户手动改时间导致时钟回拨的情况。
 */
export function elapsedMs(timer: ActiveTimer, now: number): number {
  const currentSegment =
    timer.phase === 'running' && timer.segmentStartedAt !== null
      ? Math.max(0, now - timer.segmentStartedAt)
      : 0;
  return Math.max(0, timer.accumulatedMs + currentSegment);
}

/** 暂停：先把当前分段结算进 accumulatedMs，再把分段起点清空 */
export function pauseTimer(timer: ActiveTimer, now: number, options?: TimerRecoveryOptions): ActiveTimer {
  if (timer.phase === 'paused') return timer;
  const segmentStart = timer.segmentStartedAt ?? now;
  const segmentMs = clamp(now - segmentStart, 0, options?.maxSegmentMs ?? DEFAULT_MAX_SEGMENT_MS);
  return {
    ...timer,
    segmentStartedAt: null,
    accumulatedMs: timer.accumulatedMs + segmentMs,
    phase: 'paused',
    updatedAt: now,
    heartbeatAt: now,
  };
}

/** 继续：只需要新的分段起点，不改变已有累计时长 */
export function resumeTimer(timer: ActiveTimer, now: number): ActiveTimer {
  if (timer.phase === 'running') return timer;
  return {
    ...timer,
    segmentStartedAt: now,
    phase: 'running',
    updatedAt: now,
    heartbeatAt: now,
  };
}

export interface TimerSettlement {
  timer: ActiveTimer;
  draft: SessionDraft;
  durationMs: number;
}

/**
 * 结束：把当前分段结算掉，产出可写入数据库的记录草稿。
 * `startedAt` / `endedAt` 都是真实时间戳，`durationMs` 是差值减去暂停。
 */
export function settleTimer(timer: ActiveTimer, now: number, options?: TimerRecoveryOptions): TimerSettlement {
  const settled = timer.phase === 'running' ? pauseTimer(timer, now, options) : timer;
  const endedAt = Math.max(now, settled.startedAt);
  const durationMs = Math.max(0, settled.accumulatedMs);
  return {
    timer: settled,
    durationMs,
    draft: {
      id: settled.id,
      subjectId: settled.subjectId,
      startedAt: settled.startedAt,
      endedAt,
      durationMs,
      // 暂停总时长 = 会话总跨度 - 有效学习时长，不需要额外维护计数器
      pausedMs: Math.max(0, endedAt - settled.startedAt - durationMs),
      dayKey: toDayKey(settled.startedAt),
      source: 'timer',
      note: null,
    },
  };
}

/**
 * App 启动 / 回到前台时的状态恢复。
 *
 * 因为时长是时间戳差值，进程被杀掉期间"学习仍在继续"是符合直觉的：
 * 用户 9:00 开始、9:40 App 被杀、10:00 重新打开，就应该看到 1 小时。
 * 但如果间隔长得离谱（比如隔夜），说明用户忘了结束，这里按 `maxSegmentMs` 裁剪。
 */
export function recoverTimer(
  timer: ActiveTimer,
  now: number,
  options?: TimerRecoveryOptions
): TimerRecovery {
  const maxSegmentMs = options?.maxSegmentMs ?? DEFAULT_MAX_SEGMENT_MS;
  if (timer.phase !== 'running' || timer.segmentStartedAt === null) {
    return { timer: { ...timer, heartbeatAt: now }, clamped: false, clampedMs: 0 };
  }
  const segmentMs = now - timer.segmentStartedAt;
  if (segmentMs <= maxSegmentMs) {
    return { timer: { ...timer, heartbeatAt: now }, clamped: false, clampedMs: 0 };
  }
  const clampedStart = now - maxSegmentMs;
  return {
    timer: {
      ...timer,
      segmentStartedAt: clampedStart,
      updatedAt: now,
      heartbeatAt: now,
    },
    clamped: true,
    clampedMs: segmentMs - maxSegmentMs,
  };
}

/** 从通知按钮等外部入口拿到动作后，判断是否合法 */
export function canPause(timer: ActiveTimer): boolean {
  return timer.phase === 'running';
}

export function canResume(timer: ActiveTimer): boolean {
  return timer.phase === 'paused';
}
