import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import { presentTimerNotification } from '@/services/notifications';
import { NOTIFICATION_REFRESH_INTERVAL_MS } from '@/services/notificationConstants';
import type { ActiveTimer } from '@/services/timerEngine';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useTimerStore } from '@/store/useTimerStore';

/**
 * 回到前台时重新对一次账。
 *
 * 两大用途：
 * 1. 后台任务（通知按钮）可能已经暂停/结束了会话 —— 以磁盘状态为准，重新读一遍；
 * 2. 结束的那段记录已经写进 SQLite —— 重新聚合并刷新统计。
 */
export function useAppLifecycle(onForeground?: () => void): void {
  const backgroundedAt = useRef<number | null>(null);
  const handlerRef = useRef(onForeground);

  useEffect(() => {
    handlerRef.current = onForeground;
  }, [onForeground]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (status: AppStateStatus) => {
      if (status === 'background' || status === 'inactive') {
        backgroundedAt.current = Date.now();
        return;
      }
      if (status !== 'active') return;

      const away = backgroundedAt.current;
      backgroundedAt.current = null;
      // 前台 <-> 系统弹窗之间来回切换时不重复拉数据
      if (away !== null && Date.now() - away < 1_000) return;

      void useTimerStore.getState().syncFromDisk();
      void useLibraryStore.getState().load({ silent: true });
      handlerRef.current?.();
    });
    return () => subscription.remove();
  }, []);
}

/**
 * 前台期间的常驻通知刷新。
 *
 * 只更新通知文案（"已学习 1 小时 12 分"），真正的时长永远来自时间戳；
 * 即使这个刷新一次都没跑成，通知上仍然写着开始时刻，信息不会失真。
 */
export function useTimerNotificationHeartbeat(
  timer: ActiveTimer | null,
  subjectName: string | null
): void {
  const timerId = timer?.id ?? null;
  const phase = timer?.phase ?? null;
  const subjectId = timer?.subjectId ?? null;

  useEffect(() => {
    if (!timerId || !phase || !subjectId) return;
    const tick = () => {
      const current = useTimerStore.getState().timer;
      if (!current || current.id !== timerId) return;
      void presentTimerNotification(current, subjectName ?? '学习', Date.now()).catch(
        () => undefined
      );
    };
    // 进入时先刷一次，让通知立刻反映最新状态
    tick();
    if (phase !== 'running') return;
    const handle = setInterval(tick, NOTIFICATION_REFRESH_INTERVAL_MS);
    return () => clearInterval(handle);
  }, [timerId, phase, subjectId, subjectName]);
}

/** 计时进行中保持屏幕常亮（可选，失败静默降级） */
export function useKeepAwakeWhileActive(active: boolean, enabled: boolean): void {
  useEffect(() => {
    if (!active || !enabled) return;
    let deactivated: (() => void) | null = null;
    let cancelled = false;

    void import('expo-keep-awake')
      .then((mod) => {
        if (cancelled) return;
        mod.activateKeepAwakeAsync('kaoyan-timer').catch(() => undefined);
        deactivated = () => {
          mod.deactivateKeepAwake('kaoyan-timer').catch(() => undefined);
        };
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      deactivated?.();
    };
  }, [active, enabled]);
}
