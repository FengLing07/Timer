/**
 * 自定义入口（package.json 里 main 指向这里）。
 *
 * 这里唯一的职责是「在 expo-router 接管之前完成副作用注册」：
 * `expo-task-manager` 要求 `defineTask` 在 JS bundle 的最顶层执行，
 * 否则 App 被杀之后 Android 唤起 headless 任务时会找不到任务定义。
 */
import '@/services/backgroundTasks';

import { LogBox } from 'react-native';

// 后台任务里的日志没有地方看，避免刷屏
LogBox.ignoreLogs(['Require cycle', 'Setting a timer']);

// 必须放在最后：注册 app 入口
import 'expo-router/entry';
