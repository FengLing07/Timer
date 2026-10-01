/**
 * 通知相关常量。
 * 单独放一个文件，避免 notifications.ts ↔ backgroundTasks.ts 互相 import 形成环。
 */

/** Android 通知渠道 id，与 app.json 里 expo-notifications 插件的 defaultChannel 保持一致 */
export const TIMER_CHANNEL_ID = 'study-timer';

/** 常驻通知的固定标识。Android 会把它当作 tag，用同一个 id 再次推送即为「原地更新」 */
export const TIMER_NOTIFICATION_ID = 'kaoyan-study-timer';

/** 通知按钮分组：分类 id 里不能出现 ":" 或 "-" */
export const TIMER_CATEGORY_RUNNING = 'studyTimerRunning';
export const TIMER_CATEGORY_PAUSED = 'studyTimerPaused';

export const TIMER_ACTION_PAUSE = 'TIMER_ACTION_PAUSE';
export const TIMER_ACTION_RESUME = 'TIMER_ACTION_RESUME';
export const TIMER_ACTION_FINISH = 'TIMER_ACTION_FINISH';

/** expo-task-manager 任务名：App 被杀后由它接管通知按钮点击 */
export const TIMER_BACKGROUND_TASK = 'kaoyan-timer-notification-action';

/** 前台状态下常驻通知刷新间隔（毫秒）。只是重写文案，不参与计时 */
export const NOTIFICATION_REFRESH_INTERVAL_MS = 60_000;
