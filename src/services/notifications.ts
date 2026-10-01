import type { NotificationContentInput } from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';

import type { ActiveTimer } from '@/services/timerEngine';
import { elapsedMs } from '@/services/timerEngine';
import { formatTimeOfDay } from '@/utils/date';
import { formatCompact } from '@/utils/format';
import {
  NOTIFICATION_REFRESH_INTERVAL_MS,
  TIMER_ACTION_FINISH,
  TIMER_ACTION_PAUSE,
  TIMER_ACTION_RESUME,
  TIMER_BACKGROUND_TASK,
  TIMER_CATEGORY_PAUSED,
  TIMER_CATEGORY_RUNNING,
  TIMER_CHANNEL_ID,
  TIMER_NOTIFICATION_ID,
} from './notificationConstants';
import {
  loadNotifications,
  notificationUnavailableShortLabel,
} from './notificationRuntime';

export {
  TIMER_ACTION_FINISH,
  TIMER_ACTION_PAUSE,
  TIMER_ACTION_RESUME,
  TIMER_CATEGORY_PAUSED,
  TIMER_CATEGORY_RUNNING,
  TIMER_CHANNEL_ID,
  TIMER_NOTIFICATION_ID,
  TIMER_BACKGROUND_TASK,
};

export {
  isNotificationRuntimeAvailable,
  notificationUnavailableHint,
} from './notificationRuntime';

/** 加载成功后的模块类型；所有需要原生能力的函数都收这个参数 */
type NotificationsModule = NonNullable<Awaited<ReturnType<typeof loadNotifications>>>;

/**
 * 前台收到自己的通知时的表现：
 * 不进横幅（不打断学习），但保留在通知列表里，这样常驻计时一直可见。
 * 需要在任何通知到达之前调用。
 */
export async function configureForegroundNotificationHandler(): Promise<void> {
  const notifications = await loadNotifications();
  if (!notifications) return;
  notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: false,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

let setupPromise: Promise<boolean> | null = null;

/** 幂等地准备权限 / 渠道 / 按钮分组 / 后台任务；任何一步失败都降级为「没有常驻通知」而不是崩溃 */
export function ensureNotificationSetup(): Promise<boolean> {
  if (!setupPromise) {
    setupPromise = setupInternal().catch(() => {
      setupPromise = null;
      return false;
    });
  }
  return setupPromise;
}

async function setupInternal(): Promise<boolean> {
  const notifications = await loadNotifications();
  if (!notifications) return false;
  const granted = await ensurePermissions(notifications);
  if (!granted) return false;
  await ensureChannel(notifications);
  await ensureCategories(notifications);
  await ensureBackgroundTaskRegistration(notifications);
  return true;
}

async function ensurePermissions(notifications: NotificationsModule): Promise<boolean> {
  const current = await notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: false },
  });
  return requested.granted;
}

async function ensureChannel(notifications: NotificationsModule): Promise<void> {
  if (Platform.OS !== 'android') return;
  await notifications.setNotificationChannelAsync(TIMER_CHANNEL_ID, {
    name: '学习计时',
    description: '开始学习后常驻在通知栏，显示当前科目与已学习时长',
    // LOW：静默展示、不弹横幅、不震动。常驻计时通知应该是「安静但一直在」。
    importance: notifications.AndroidImportance.LOW,
    sound: null,
    vibrationPattern: null,
    enableVibrate: false,
    enableLights: false,
    showBadge: false,
    lockscreenVisibility: notifications.AndroidNotificationVisibility.PUBLIC,
    bypassDnd: false,
  });
}

async function ensureCategories(notifications: NotificationsModule): Promise<void> {
  // opensAppToForeground: false 表示这个按钮由后台任务处理，
  // App 被划掉时也能暂停/继续，用户不用回到 App。
  await notifications.setNotificationCategoryAsync(TIMER_CATEGORY_RUNNING, [
    {
      identifier: TIMER_ACTION_PAUSE,
      buttonTitle: '暂停',
      options: { opensAppToForeground: false },
    },
    {
      identifier: TIMER_ACTION_FINISH,
      buttonTitle: '结束学习',
      // 结束是重要的收尾动作：拉起 App，让用户看到结算结果
      options: { isDestructive: true, opensAppToForeground: true },
    },
  ]);

  await notifications.setNotificationCategoryAsync(TIMER_CATEGORY_PAUSED, [
    {
      identifier: TIMER_ACTION_RESUME,
      buttonTitle: '继续',
      options: { opensAppToForeground: false },
    },
    {
      identifier: TIMER_ACTION_FINISH,
      buttonTitle: '结束学习',
      options: { isDestructive: true, opensAppToForeground: true },
    },
  ]);
}

async function ensureBackgroundTaskRegistration(
  notifications: NotificationsModule
): Promise<void> {
  // 只有 Android 会把通知按钮点击交给 headless 任务
  if (Platform.OS !== 'android') return;
  const already = await TaskManager.isTaskRegisteredAsync(TIMER_BACKGROUND_TASK).catch(
    () => false
  );
  if (already) return;
  await notifications.registerTaskAsync(TIMER_BACKGROUND_TASK);
}

export interface TimerNotificationPayload {
  timer: ActiveTimer;
  subjectName: string;
  /** 调用方传入的「现在」，保证与 UI 用同一个时间基准 */
  now: number;
}

/** 纯函数：只负责拼文案，不碰任何原生模块 */
export function buildTimerNotificationContent({
  timer,
  subjectName,
  now,
}: TimerNotificationPayload): NotificationContentInput {
  const elapsed = elapsedMs(timer, now);
  const running = timer.phase === 'running';
  return {
    title: `${subjectName} · ${running ? '学习中' : '已暂停'}`,
    body: `${running ? '已学习' : '已累计'} ${formatCompact(elapsed)} · ${formatTimeOfDay(
      timer.startedAt
    )} 开始`,
    data: {
      kind: 'study-timer',
      timerId: timer.id,
      subjectId: timer.subjectId,
      startedAt: timer.startedAt,
    },
    // Android 的 isOngoing：不可滑动删除，真正的「常驻」
    sticky: true,
    // 点击通知本身不把它消掉
    autoDismiss: false,
    sound: false,
    categoryIdentifier: running ? TIMER_CATEGORY_RUNNING : TIMER_CATEGORY_PAUSED,
  };
}

/**
 * 展示/更新常驻通知。
 * 相同 identifier 再次推送即为原地更新（Android 以 identifier 作为 tag），列表里不会重复。
 */
export async function presentTimerNotification(
  timer: ActiveTimer,
  subjectName: string,
  now: number = Date.now()
): Promise<void> {
  const ready = await ensureNotificationSetup();
  if (!ready) return;
  const notifications = await loadNotifications();
  if (!notifications) return;
  await notifications.scheduleNotificationAsync({
    identifier: TIMER_NOTIFICATION_ID,
    content: buildTimerNotificationContent({ timer, subjectName, now }),
    // trigger: null → 立即展示
    trigger: null,
  });
}

export async function dismissTimerNotification(): Promise<void> {
  const notifications = await loadNotifications();
  if (!notifications) return;
  await notifications
    .dismissNotificationAsync(TIMER_NOTIFICATION_ID)
    .catch(() => undefined);
  await notifications
    .cancelScheduledNotificationAsync(TIMER_NOTIFICATION_ID)
    .catch(() => undefined);
}

/** 当前是否有权限发通知（设置页展示用） */
export async function getNotificationPermissionLabel(): Promise<string> {
  const notifications = await loadNotifications();
  if (!notifications) return notificationUnavailableShortLabel();
  try {
    const status = await notifications.getPermissionsAsync();
    if (Platform.OS === 'ios') {
      const iosStatus = status.ios?.status;
      if (iosStatus === notifications.IosAuthorizationStatus.AUTHORIZED) return '已授权';
      if (iosStatus === notifications.IosAuthorizationStatus.PROVISIONAL) return '临时授权';
      if (iosStatus === notifications.IosAuthorizationStatus.DENIED) return '已拒绝';
      return '未询问';
    }
    return status.granted ? '已授权' : status.canAskAgain ? '未询问' : '已拒绝';
  } catch {
    return '不可用';
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  const notifications = await loadNotifications();
  if (!notifications) return false;
  try {
    const requested = await notifications.requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: false, allowSound: false },
    });
    return requested.granted;
  } catch {
    return false;
  }
}

/** 订阅通知点击（App 活着时）。App 被划掉时由 backgroundTasks 的 headless 任务接管 */
export async function subscribeToNotificationResponses(
  handler: (actionIdentifier: string) => void
): Promise<{ remove: () => void } | null> {
  const notifications = await loadNotifications();
  if (!notifications) return null;
  return notifications.addNotificationResponseReceivedListener((response) => {
    handler(response.actionIdentifier);
  });
}

/** 通知按钮标题，设置页文案用 */
export const TIMER_ACTIONS_UI = {
  pause: '暂停',
  resume: '继续',
  finish: '结束学习',
} as const;

export function describeNotificationRefreshInterval(): number {
  return NOTIFICATION_REFRESH_INTERVAL_MS;
}
