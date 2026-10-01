import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ActiveTimer } from '@/services/timerEngine';

/**
 * 进行中的计时会话单独存 AsyncStorage。
 *
 * 为什么不放 SQLite：这是「当前状态」而不是「历史记录」，
 * 读写发生在每一次开始/暂停/继续上，AsyncStorage 的键值语义更贴合，
 * 而且被系统杀掉后重建时读取路径最短（不需要等数据库迁移完成）。
 * 已完成的记录才写入 SQLite。
 */
const ACTIVE_TIMER_KEY = 'kaoyan.activeTimer.v1';

function isValidTimer(value: unknown): value is ActiveTimer {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<ActiveTimer>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.subjectId === 'string' &&
    typeof candidate.startedAt === 'number' &&
    typeof candidate.accumulatedMs === 'number' &&
    (candidate.phase === 'running' || candidate.phase === 'paused') &&
    (candidate.segmentStartedAt === null || typeof candidate.segmentStartedAt === 'number')
  );
}

export async function readActiveTimer(): Promise<ActiveTimer | null> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_TIMER_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isValidTimer(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export async function writeActiveTimer(timer: ActiveTimer | null): Promise<void> {
  try {
    if (timer === null) {
      await AsyncStorage.removeItem(ACTIVE_TIMER_KEY);
      return;
    }
    await AsyncStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(timer));
  } catch {
    // 持久化失败不应该让计时中断；下一次状态变更会再写一次
  }
}

export async function clearActiveTimer(): Promise<void> {
  await writeActiveTimer(null);
}

export const ACTIVE_TIMER_STORAGE_KEY = ACTIVE_TIMER_KEY;
