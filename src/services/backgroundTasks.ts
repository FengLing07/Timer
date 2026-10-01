import type { NotificationTaskPayload } from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';

import { TIMER_BACKGROUND_TASK } from './notificationConstants';
import { handleTimerNotificationAction } from './timerRuntime';

/**
 * App 被划掉之后，用户仍然可以在通知栏点「暂停 / 继续」。
 *
 * Android 会把这类通知按钮点击派发给我们注册的 headless 任务；
 * 任务在全新的 JS 上下文里执行（没有 React 树），因此这里调用的
 * `handleTimerNotificationAction` 只依赖 AsyncStorage + SQLite，不依赖任何 store。
 *
 * 两个约束：
 * 1. `TaskManager.defineTask` 必须在模块顶层执行，所以这个文件要在应用入口尽早 import
 *    （见 index.ts 的第一行）。
 * 2. `expo-notifications` 只能以 `import type` 形式出现 —— 它在 Expo Go 的 Android 上
 *    一旦被求值就会抛错（详见 notificationRuntime.ts）。类型会在编译期擦除，没有副作用。
 *
 * 整个注册过程包了 try/catch：这个文件位于 bundle 入口路径上，
 * 任何意外都不应该让 App 起不来 —— 大不了没有后台按钮，计时本身不受影响。
 */
try {
  TaskManager.defineTask<NotificationTaskPayload>(
    TIMER_BACKGROUND_TASK,
    async ({ data, error }) => {
      if (error) return;
      if (!data || typeof data !== 'object' || !('actionIdentifier' in data)) return;
      const actionIdentifier = data.actionIdentifier;
      if (typeof actionIdentifier !== 'string') return;
      await handleTimerNotificationAction(actionIdentifier);
    }
  );
} catch {
  // 任务已定义或当前环境不支持，忽略
}

/** 供设置页展示：后台任务是否已经被系统接受 */
export async function isTimerBackgroundTaskRegistered(): Promise<boolean> {
  try {
    return await TaskManager.isTaskRegisteredAsync(TIMER_BACKGROUND_TASK);
  } catch {
    return false;
  }
}

export { TIMER_BACKGROUND_TASK };
