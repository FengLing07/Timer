import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

/**
 * expo-notifications 的加载闸门。
 *
 * 背景（这是 Expo Go 上一个会直接崩 App 的坑）：
 * `expo-notifications` 的入口会 re-export `DevicePushTokenAutoRegistration.fx`，
 * 而这个模块在**模块作用域**里调用了 `addPushTokenListener()`：
 *
 *   if (ServerRegistrationModule.getRegistrationInfoAsync) {
 *     addPushTokenListener(...)   // → warnOfExpoGoPushUsage()
 *   }
 *
 * `warnOfExpoGoPushUsage()` 在「Expo Go + Android」时是直接 `throw`，不是 warn：
 *
 *   if (isRunningInExpoGo() && !didWarn) {
 *     if (Platform.OS === 'android') throw new Error(...)
 *   }
 *
 * 所以在那台设备上，只要 `import 'expo-notifications'` 就会抛
 * "[runtime not ready]"，跟「你有没有用推送」完全无关，本地通知也一起用不了。
 *
 * 结论：只能把 import 本身推迟到运行时，并且先判断环境。
 * 这个文件是所有通知能力的唯一入口 —— 别的地方一律不要直接 import 这个包
 * （类型可以，用 `import type` 会被编译期擦除，没有副作用）。
 */

export type NotificationsApi = typeof import('expo-notifications');

let modulePromise: Promise<NotificationsApi | null> | null = null;

/** 当前环境能不能安全地加载 expo-notifications */
export function isNotificationRuntimeAvailable(): boolean {
  // iOS 的 Expo Go 只是打印一条警告，这里以 Android 为准
  if (Platform.OS === 'android' && isRunningInExpoGo()) return false;
  return true;
}

/** 给 UI 用的人类可读原因；可用时返回 null */
export function notificationUnavailableHint(): string | null {
  if (Platform.OS === 'android' && isRunningInExpoGo()) {
    return 'Expo Go 的 Android 客户端已移除 expo-notifications（SDK 53 起），常驻计时通知需要在开发构建中才能使用：npx expo run:android';
  }
  return null;
}

export function notificationUnavailableShortLabel(): string {
  return Platform.OS === 'android' && isRunningInExpoGo() ? '不可用（Expo Go）' : '不可用';
}

/**
 * 懒加载 expo-notifications。
 * 环境不支持、或者加载过程中出了任何意外，一律返回 null，调用方按「没有通知」处理。
 */
export function loadNotifications(): Promise<NotificationsApi | null> {
  if (!isNotificationRuntimeAvailable()) return Promise.resolve(null);
  if (!modulePromise) {
    modulePromise = Promise.resolve()
      .then(() => import('expo-notifications'))
      .catch(() => {
        // 允许下次重试，而不是永久记住失败
        modulePromise = null;
        return null;
      });
  }
  return modulePromise;
}
