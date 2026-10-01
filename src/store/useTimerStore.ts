import { create } from 'zustand';

import type { ActiveTimer } from '@/services/timerEngine';
import {
  discardActiveSession,
  finishStudySession,
  loadActiveTimerSnapshot,
  pauseStudySession,
  restartStudySession,
  resumeStudySession,
  startStudySession,
  type FinishOutcome,
  type StartOutcome,
} from '@/services/timerRuntime';

type TimerStatus = 'idle' | 'loading' | 'ready';

interface TimerState {
  /** 进行中的会话；null 表示没有在计时 */
  timer: ActiveTimer | null;
  status: TimerStatus;
  /** 最近一次「结束学习」的结果，用于在 UI 上给出反馈 */
  lastOutcome: FinishOutcome | null;
  /** 崩溃恢复时被裁剪掉的时长（毫秒），> 0 时需要提示用户 */
  recoveredClampedMs: number;
  /** 启动新会话时顺带结束掉的旧会话 */
  lastAutoFinished: FinishOutcome | null;
  error: string | null;

  /** App 启动时调用一次 */
  hydrate: () => Promise<void>;
  /** 回到前台时调用：以后台任务可能改过的磁盘状态为准 */
  syncFromDisk: () => Promise<void>;
  start: (subjectId: string) => Promise<StartOutcome | null>;
  restart: (subjectId: string) => Promise<StartOutcome | null>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  finish: () => Promise<FinishOutcome | null>;
  discard: () => Promise<void>;
  clearFeedback: () => void;
}

export const useTimerStore = create<TimerState>()((set, get) => ({
  timer: null,
  status: 'idle',
  lastOutcome: null,
  recoveredClampedMs: 0,
  lastAutoFinished: null,
  error: null,

  hydrate: async () => {
    set({ status: 'loading', error: null });
    try {
      const snapshot = await loadActiveTimerSnapshot();
      set({
        timer: snapshot?.timer ?? null,
        recoveredClampedMs: snapshot?.clampedMs ?? 0,
        status: 'ready',
      });
    } catch (error) {
      set({ status: 'ready', error: error instanceof Error ? error.message : '计时状态恢复失败' });
    }
  },

  syncFromDisk: async () => {
    try {
      const snapshot = await loadActiveTimerSnapshot();
      const next = snapshot?.timer ?? null;
      const current = get().timer;
      // 只有真的变了才写 store，避免每次回到前台都触发一轮重渲染
      if (current?.id !== next?.id || current?.phase !== next?.phase) {
        set({ timer: next, recoveredClampedMs: snapshot?.clampedMs ?? 0 });
      }
    } catch {
      // 恢复失败时保留内存中的状态
    }
  },

  start: async (subjectId) => {
    try {
      const outcome = await startStudySession(subjectId);
      set({ timer: outcome.timer, lastAutoFinished: outcome.autoFinished, error: null });
      return outcome;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '开始学习失败' });
      return null;
    }
  },

  restart: async (subjectId) => {
    try {
      const outcome = await restartStudySession(subjectId);
      set({ timer: outcome.timer, lastAutoFinished: outcome.autoFinished, error: null });
      return outcome;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '重新开始失败' });
      return null;
    }
  },

  pause: async () => {
    try {
      const timer = await pauseStudySession();
      if (timer) set({ timer });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '暂停失败' });
    }
  },

  resume: async () => {
    try {
      const timer = await resumeStudySession();
      if (timer) set({ timer });
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '继续失败' });
    }
  },

  finish: async () => {
    try {
      const outcome = await finishStudySession();
      if (outcome.ok) {
        set({ timer: null, lastOutcome: outcome, error: null });
      } else if (outcome.reason === 'no-active-timer') {
        set({ timer: null });
      } else {
        set({ error: '记录保存失败，请再试一次（学习时长仍然保留）' });
      }
      return outcome;
    } catch (error) {
      set({ error: error instanceof Error ? error.message : '结束学习失败' });
      return null;
    }
  },

  discard: async () => {
    await discardActiveSession();
    set({ timer: null, lastOutcome: null });
  },

  clearFeedback: () => set({ lastOutcome: null, lastAutoFinished: null, recoveredClampedMs: 0 }),
}));

export function useActiveTimer(): ActiveTimer | null {
  return useTimerStore((state) => state.timer);
}

export function useIsTimerActive(): boolean {
  return useTimerStore((state) => state.timer !== null);
}
