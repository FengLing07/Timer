import { getDatabase } from '@/db/client';
import { insertSession } from '@/db/sessionRepository';
import { getSubject } from '@/db/subjectRepository';
import type { StudySession } from '@/models/session';
import { readSettingsSnapshot, type AppSettings } from '@/store/useSettingsStore';
import {
  DEFAULT_MAX_SEGMENT_MS,
  createTimerId,
  elapsedMs,
  pauseTimer,
  recoverTimer,
  resumeTimer,
  settleTimer,
  startTimer,
  type ActiveTimer,
  type TimerRecovery,
} from '@/services/timerEngine';
import {
  TIMER_ACTION_FINISH,
  TIMER_ACTION_PAUSE,
  TIMER_ACTION_RESUME,
  dismissTimerNotification,
  presentTimerNotification,
} from '@/services/notifications';
import { clearActiveTimer, readActiveTimer, writeActiveTimer } from '@/services/timerStorage';

/** 计时状态的读写都在同一条队列上串行执行，避免 UI 与通知按钮同时操作产生竞态 */
let mutationQueue: Promise<unknown> = Promise.resolve();

function serialize<T>(task: () => Promise<T>): Promise<T> {
  const run = mutationQueue.then(task, task);
  mutationQueue = run.catch(() => undefined);
  return run;
}

function maxSegmentMsOf(settings: AppSettings): number {
  const hours = Number.isFinite(settings.maxSegmentHours) ? settings.maxSegmentHours : 8;
  return Math.max(1, hours) * 3_600_000 || DEFAULT_MAX_SEGMENT_MS;
}

const SUBJECT_NAME_FALLBACK = '学习';

export async function getSubjectName(subjectId: string): Promise<string> {
  try {
    const db = await getDatabase();
    const subject = await getSubject(db, subjectId);
    return subject?.name ?? SUBJECT_NAME_FALLBACK;
  } catch {
    return SUBJECT_NAME_FALLBACK;
  }
}

/** 按设置决定是否推送常驻通知；失败一律吞掉，绝不影响计时本身 */
async function syncNotification(timer: ActiveTimer | null, now: number): Promise<void> {
  const settings = await readSettingsSnapshot();
  if (!settings.persistentTimerNotification) {
    await dismissTimerNotification();
    return;
  }
  if (!timer) {
    await dismissTimerNotification();
    return;
  }
  const subjectName = await getSubjectName(timer.subjectId);
  await presentTimerNotification(timer, subjectName, now).catch(() => undefined);
}

export interface ActiveTimerSnapshot {
  timer: ActiveTimer;
  /** 恢复时是否裁剪了异常超长的一段 */
  clamped: boolean;
  clampedMs: number;
}

/**
 * 启动 / 回到前台时的恢复入口。
 *
 * 这里体现了「时间戳差值法」最关键的好处：
 * 进程被杀掉、甚至手机重启，只要 AsyncStorage 里的 startTimestamp 还在，
 * 重新打开就能算出正确的累计时长，完全不需要后台常驻计数器。
 */
export async function loadActiveTimerSnapshot(now: number = Date.now()): Promise<ActiveTimerSnapshot | null> {
  return serialize(async () => {
    const stored = await readActiveTimer();
    if (!stored) return null;

    const settings = await readSettingsSnapshot();
    const recovery: TimerRecovery = recoverTimer(stored, now, {
      maxSegmentMs: maxSegmentMsOf(settings),
    });

    if (recovery.clamped) {
      // 裁剪结果落盘，避免每次回到前台都重复裁剪
      await writeActiveTimer(recovery.timer);
      await syncNotification(recovery.timer, now);
    }

    return { timer: recovery.timer, clamped: recovery.clamped, clampedMs: recovery.clampedMs };
  });
}

export interface StartOutcome {
  timer: ActiveTimer;
  /**
   * 同一时间只允许一个进行中的会话。
   * 如果用户在「数据结构」计时中又去点了「英语」的开始，
   * 旧会话会先被结算入库（而不是被静默丢弃），结果从这里返回。
   */
  autoFinished: FinishOutcome | null;
}

export async function startStudySession(
  subjectId: string,
  now: number = Date.now()
): Promise<StartOutcome> {
  return serialize(async () => {
    const existing = await readActiveTimer();
    let autoFinished: FinishOutcome | null = null;

    if (existing) {
      if (existing.subjectId === subjectId) {
        // 同科目重复进入计时页：继续用原来的会话，不重置开始时间
        return { timer: existing, autoFinished: null };
      }
      autoFinished = await settleAndPersist(existing, now);
      if (!autoFinished.ok) {
        // 旧记录没能落库，此时绝不能覆盖进行中状态，否则那段学习就真丢了
        return { timer: existing, autoFinished };
      }
    }

    const timer = startTimer(subjectId, now);
    await writeActiveTimer(timer);
    await syncNotification(timer, now);
    return { timer, autoFinished };
  });
}

/** 强制开一段全新的会话（用于"重新开始计时"） */
export async function restartStudySession(
  subjectId: string,
  now: number = Date.now()
): Promise<StartOutcome> {
  return serialize(async () => {
    const existing = await readActiveTimer();
    const autoFinished = existing ? await settleAndPersist(existing, now) : null;
    const timer: ActiveTimer = { ...startTimer(subjectId, now), id: createTimerId(now) };
    await writeActiveTimer(timer);
    await syncNotification(timer, now);
    return { timer, autoFinished };
  });
}

export async function pauseStudySession(now: number = Date.now()): Promise<ActiveTimer | null> {
  return serialize(async () => {
    const current = await readActiveTimer();
    if (!current || current.phase === 'paused') return current;
    const settings = await readSettingsSnapshot();
    const next = pauseTimer(current, now, { maxSegmentMs: maxSegmentMsOf(settings) });
    await writeActiveTimer(next);
    await syncNotification(next, now);
    return next;
  });
}

export async function resumeStudySession(now: number = Date.now()): Promise<ActiveTimer | null> {
  return serialize(async () => {
    const current = await readActiveTimer();
    if (!current || current.phase === 'running') return current;
    const next = resumeTimer(current, now);
    await writeActiveTimer(next);
    await syncNotification(next, now);
    return next;
  });
}

export interface SavedOutcome {
  ok: true;
  subjectId: string;
  /** 有效学习时长 */
  durationMs: number;
  /** 因为短于 minSessionSeconds 被丢弃 */
  discarded: boolean;
  /** 真正写入数据库的记录；被丢弃时为 null */
  session: StudySession | null;
}

export interface FinishFailure {
  ok: false;
  reason: 'no-active-timer' | 'persist-failed';
  subjectId: string | null;
  durationMs: number;
}

export type FinishOutcome = SavedOutcome | FinishFailure;

/**
 * 结算一段会话并写入数据库。调用前必须已经持有进行中的 timer。
 * 返回 ok:false / persist-failed 时不会清除进行中状态，用户可以再点一次结束。
 */
async function settleAndPersist(current: ActiveTimer, now: number): Promise<FinishOutcome> {
  const settings = await readSettingsSnapshot();
  const settlement = settleTimer(current, now, { maxSegmentMs: maxSegmentMsOf(settings) });
  const durationMs = settlement.durationMs;
  const tooShort = durationMs < Math.max(0, settings.minSessionSeconds) * 1000;

  if (tooShort) {
    return {
      ok: true,
      subjectId: current.subjectId,
      durationMs,
      discarded: true,
      session: null,
    };
  }

  try {
    const db = await getDatabase();
    const session = await insertSession(db, settlement.draft);
    return {
      ok: true,
      subjectId: current.subjectId,
      durationMs,
      discarded: false,
      session,
    };
  } catch {
    return { ok: false, reason: 'persist-failed', subjectId: current.subjectId, durationMs };
  }
}

/**
 * 结束学习：结算时间戳差值 → 写入 SQLite → 清掉进行中状态 → 移除常驻通知。
 * 步骤顺序刻意如此：先落库再清状态，任何一步失败都不会丢记录。
 */
export async function finishStudySession(now: number = Date.now()): Promise<FinishOutcome> {
  return serialize(async () => {
    const current = await readActiveTimer();
    if (!current) {
      return { ok: false, reason: 'no-active-timer', subjectId: null, durationMs: 0 };
    }

    const outcome = await settleAndPersist(current, now);
    if (!outcome.ok) return outcome;

    await clearActiveTimer();
    await syncNotification(null, now);
    return outcome;
  });
}

/** 丢弃当前进行中的会话（用于"重新开始"或调试） */
export async function discardActiveSession(): Promise<void> {
  await serialize(async () => {
    await clearActiveTimer();
    await syncNotification(null, Date.now());
  });
}

/** 通知/UI 都用得到的实时时长 */
export function currentElapsedMs(timer: ActiveTimer, now: number = Date.now()): number {
  return elapsedMs(timer, now);
}

/**
 * 处理常驻通知上的按钮。
 * 既可能来自前台的事件监听（App 活着），也可能来自 Android 的 headless 任务（App 被杀）。
 * 两条路径共用这一份实现，行为完全一致。
 */
export async function handleTimerNotificationAction(actionIdentifier: string): Promise<void> {
  switch (actionIdentifier) {
    case TIMER_ACTION_PAUSE:
      await pauseStudySession();
      break;
    case TIMER_ACTION_RESUME:
      await resumeStudySession();
      break;
    case TIMER_ACTION_FINISH:
      await finishStudySession();
      break;
    default:
      break;
  }
}
