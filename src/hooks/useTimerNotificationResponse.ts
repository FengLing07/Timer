import { useEffect } from 'react';

import { subscribeToNotificationResponses } from '@/services/notifications';
import { handleTimerNotificationAction } from '@/services/timerRuntime';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useTimerStore } from '@/store/useTimerStore';

/**
 * App 活着（前台或后台）时，通知按钮的点击由这个监听器处理。
 * App 被划掉时改由 Android 的 headless 任务处理（见 backgroundTasks.ts），
 * 两者调用的是同一个 `handleTimerNotificationAction`。
 */
export function useTimerNotificationResponse(): void {
  useEffect(() => {
    let cancelled = false;
    let subscription: { remove: () => void } | null = null;

    void subscribeToNotificationResponses((actionIdentifier) => {
      void (async () => {
        await handleTimerNotificationAction(actionIdentifier);
        await useTimerStore.getState().syncFromDisk();
        await useLibraryStore.getState().load({ silent: true });
      })();
    }).then((result) => {
      if (cancelled) {
        result?.remove();
        return;
      }
      subscription = result;
    });

    return () => {
      cancelled = true;
      subscription?.remove();
    };
  }, []);
}
