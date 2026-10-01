# timer · 考研学习时长统计

> 应用显示名（`app.json` 的 `name`）是 **timer**，EAS 项目 slug 也是 **timer**。

一个 React Native + Expo（Managed Workflow）的跨平台 App，把「考研各科目的学习时长」用 **Steam 游戏库 / 小黑盒** 的方式展示出来：科目库、科目详情、时长曲线、成就进度条、里程碑徽章，以及一套完全基于时间戳差值的计时系统。

全部数据存在本机，无服务器、可离线使用。

---

## 1. 如何运行

```bash
npm install
npm start          # 之后按 a / i，或用 Expo Go 扫码
```

其他脚本：

```bash
npm run check      # 类型检查 + ESLint + 核心逻辑验证（53 项断言）
npm run verify     # 只跑核心逻辑验证（纯 Node，不需要模拟器）
npm run doctor     # expo-doctor 依赖与配置体检
npm run bundle:android   # 用 Metro 打一次包，验证所有模块都能解析
```

> 依赖版本已按 Expo SDK 57 对齐（React Native 0.86 / React 19.2），`npx expo install --fix` 可随时校正。

### 关于原生能力的边界

| 能力 | Expo Go（Android） | 开发构建（dev build） |
| --- | --- | --- |
| 科目库 / 详情 / 统计 / 图表 | 可用 | 可用 |
| SQLite 持久化、AsyncStorage 设置 | 可用 | 可用 |
| 计时 / 暂停 / 结束 / 被杀后恢复 | 可用 | 可用 |
| 常驻计时通知（本地通知） | 不可用（自动降级，不会崩） | 可用 |
| App 被划掉后由通知按钮暂停/继续（headless 任务） | 不可用 | 可用 |
| 真正的 Android 前台服务（Foreground Service） | 不支持 | 需额外接入 |

### 为什么 Expo Go 的 Android 连本地通知都用不了

这不是「推送被砍」那么简单，而是 `expo-notifications` **一被求值就抛异常**：

```
DevicePushTokenAutoRegistration.fx.js   ← 模块作用域，不是函数里
  if (ServerRegistrationModule.getRegistrationInfoAsync) {
    addPushTokenListener(...)           → warnOfExpoGoPushUsage()
  }

warnOfExpoGoPushUsage()
  if (isRunningInExpoGo() && !didWarn) {
    if (Platform.OS === 'android') throw new Error(...)   ← 直接抛，不是 warn
  }
```

所以只要 `import 'expo-notifications'`，Expo Go 的 Android 上就会得到
`[runtime not ready]` 红屏，跟「你有没有用推送 API」无关，本地通知也一起被带走。

因此所有通知能力都被收口到 `src/services/notificationRuntime.ts`：

1. 先用 `isRunningInExpoGo()` + `Platform.OS` 判断；
2. 只有在安全的环境里才用**动态 `import()`** 加载（Metro 会把它编译成
   `expo/internal/async-require-module` 的运行时异步 require，不会在启动时求值）；
3. 再包一层 `.catch()`，即使判断失手也只是「没有通知」，不会崩。

**其他文件一律不允许直接 `import 'expo-notifications'`**，只能用 `import type`
（编译期擦除）。`npm run verify` 之外，这条约束在打包产物里也验证过：
`expo-notifications` 是模块 761，`notificationRuntime.ts` 的依赖数组里有它，
但模块体内急切执行的 `require(_dependencyMap[N])` 只有 N=0/1/3，N=2 仅出现在
`.then()` 回调里的异步 require 中。

真机长期使用建议用开发构建：`npx expo run:android` / `npx expo run:ios`，或 `eas build --profile development`。

---

## 2. 目录结构

```
.
├── index.ts                      # 自定义入口：先注册后台任务，再交给 expo-router
├── app.json                      # Expo 配置（深色、scheme、通知/数据库插件、权限）
├── scripts/
│   ├── verify-core.ts            # 纯 Node 的核心逻辑断言（计时/聚合/里程碑）
│   ├── ts-alias-loader.mjs       # 让 Node 认识 @/ 别名（仅本地验证用）
│   └── register-loader.mjs
└── src/
    ├── app/                      # expo-router 路由：目录即路由
    │   ├── _layout.tsx           # 根布局：启动恢复、主题、通知心跳、Stack 声明
    │   ├── (tabs)/
    │   │   ├── _layout.tsx       # 底部 Tab + 浮动的「进行中」计时条
    │   │   ├── index.tsx         # ① 科目库（仿 Steam 游戏库）
    │   │   ├── stats.tsx         # ③ 数据统计（日/周/月柱状图 + 目标进度 + 里程碑）
    │   │   └── settings.tsx      # 设置（通知、记录规则、每周目标、数据清空）
    │   ├── subject/[subjectId].tsx   # ② 科目详情（时长曲线 + 时间线）
    │   └── timer/[subjectId].tsx     # ④ 计时页（模态）
    ├── components/
    │   ├── SubjectCover.tsx      # 程序化「游戏封面」：渐变 + 光晕 + 高光 + 字母
    │   ├── SubjectCard.tsx       # 科目库列表行
    │   ├── RecentlyStudiedHero.tsx   # 顶部大图「最近学习」
    │   ├── GoalProgressBar.tsx   # 仿 Steam 成就进度条
    │   ├── MilestoneBadges.tsx   # 10/50/100/500 小时徽章
    │   ├── SessionTimeline.tsx   # 学习记录时间线
    │   ├── TimerClockFace.tsx    # 计时面板（大字号等宽秒表）
    │   ├── ActiveTimerBar.tsx    # 全局浮动的进行中计时条
    │   ├── charts/               # gifted-charts 适配层（柱状图 / 折线图）
    │   └── ui/                   # Icon（手写 SVG）、Card、按钮、分段控件
    ├── data/subjects.ts          # 6 个科目的初始数据与配色
    ├── db/
    │   ├── schema.ts             # 建表 DDL、版本迁移、科目种子 upsert
    │   ├── client.ts             # SQLite 单例连接（前台与后台任务共用）
    │   ├── subjectRepository.ts
    │   └── sessionRepository.ts  # 记录读写 + 按天/按科聚合 SQL
    ├── hooks/
    │   ├── useElapsedMs.ts       # 显示用秒表 + useNow
    │   ├── useAppLifecycle.ts    # 回前台对账、通知心跳、屏幕常亮
    │   ├── useTimerNotificationResponse.ts
    │   └── useSubjectSessions.ts
    ├── models/                   # Subject / StudySession / 统计类型
    ├── services/
    │   ├── timerEngine.ts        # ★ 计时内核：纯函数、时间戳差值
    │   ├── timerRuntime.ts       # ★ 开始/暂停/继续/结束 的唯一实现
    │   ├── timerStorage.ts       # 进行中会话的 AsyncStorage 持久化
    │   ├── notifications.ts      # 常驻通知、渠道、按钮分类
    │   ├── backgroundTasks.ts    # expo-task-manager 任务定义
    │   ├── notificationConstants.ts
    │   ├── statsService.ts       # 统计聚合与图表数据构造
    │   └── milestones.ts
    ├── store/                    # Zustand：timer / library / settings
    ├── theme/theme.ts            # 护眼主题（暖调墨绿）+ withAlpha 工具
    └── utils/                    # 日期与时长格式化
```

分层原则：UI 不碰数据库，数据库不碰 UI。组件只从 store 取状态并调 store 的动作；store 只调用 `services/`；`services/` 负责把 `timerEngine`（纯函数）和 `db/`（SQLite）串起来。

---

## 3. 数据模型

### 3.1 科目 Subject（内置内容）

```ts
interface Subject {
  id: string;
  name: string;             // 数据结构
  subtitle: string;         // 408 统考 · 专业课
  category: 'professional' | 'public';
  weeklyGoalMinutes: number;// 每周目标 → 成就进度条
  palette: [string, string, string]; // 封面渐变（底/暗角/高光）
  monogram: string;         // 封面大字 "DS"
  accent: string;           // 该科目的强调色
  coverImage?: string | null;// 填了就用真实封面图，否则用程序化封面
  sortOrder: number;
  archived: boolean;
}
```

6 个科目（数据结构 / 操作系统 / 计算机网络 / 高等数学 / 英语 / 政治）在 `src/data/subjects.ts` 中定义。每次启动会用 `INSERT ... ON CONFLICT DO UPDATE` 做幂等 upsert：名称与配色以代码为准，但用户改过的每周目标会被保留。

### 3.2 学习记录 StudySession（SQLite）

```ts
interface StudySession {
  id: string;
  subjectId: string;
  startedAt: number;   // 第一次点「开始学习」的时间戳
  endedAt: number;     // 点「结束学习」的时间戳
  durationMs: number;  // 有效学习时长（已扣除暂停）
  pausedMs: number;    // 暂停总时长 = (endedAt - startedAt) - durationMs
  dayKey: string;      // 本地时区的 YYYY-MM-DD
  source: 'timer' | 'manual' | 'recovered';
  note: string | null;
  createdAt: number;
}
```

```sql
CREATE TABLE study_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  started_at INTEGER NOT NULL,
  ended_at INTEGER NOT NULL,
  duration_ms INTEGER NOT NULL,
  paused_ms INTEGER NOT NULL DEFAULT 0,
  day_key TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'timer',
  note TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_subject_started ON study_sessions (subject_id, started_at DESC);
CREATE INDEX idx_sessions_day ON study_sessions (day_key);
CREATE INDEX idx_sessions_started ON study_sessions (started_at DESC);
```

为什么冗余一个 `day_key`：SQLite 的 `date(started_at/1000,'unixepoch','localtime')` 依赖设备时区设置，跨时区或夏令时容易把记录算到错误的日期。写入时用 JS 按本地时区算好 `YYYY-MM-DD` 存下来，日/周/月/近 14 天全部在这一个字段上折叠，永远准。

存储分工：

| 数据 | 位置 | 原因 |
| --- | --- | --- |
| 已完成的学习记录 | expo-sqlite | 结构化、能 GROUP BY 聚合 |
| 进行中的会话 | AsyncStorage | 属于「当前状态」，状态切换时读写频繁，恢复路径最短 |
| 设置项 | AsyncStorage | 简单键值，zustand `persist` 直接托管 |

---

## 4. 计时模块：时间戳差值法

这是整个 App 的核心，实现在 `src/services/timerEngine.ts`（纯函数）与 `src/services/timerRuntime.ts`（副作用编排）。

### 4.1 状态只存时间戳，不存计数器

```ts
interface ActiveTimer {
  id: string;
  subjectId: string;
  startedAt: number;               // 第一次开始的时间戳
  segmentStartedAt: number | null; // 当前分段的起点；暂停时为 null
  accumulatedMs: number;           // 已结算（暂停时）的分段之和
  phase: 'running' | 'paused';
  updatedAt: number;
  heartbeatAt: number;
}
```

关键点：结构里没有任何「已经跑了多少秒」的递增字段。

```ts
export function elapsedMs(timer: ActiveTimer, now: number): number {
  const currentSegment =
    timer.phase === 'running' && timer.segmentStartedAt !== null
      ? Math.max(0, now - timer.segmentStartedAt)
      : 0;
  return Math.max(0, timer.accumulatedMs + currentSegment);
}
```

每一次渲染出来的数字都是「现在 − 分段起点」现算的。屏幕上的秒表只是 `setInterval` 触发重渲染（`useElapsedMs`），不参与计时：掉帧、卡顿、切后台都不会让时长漂移。

### 4.2 状态机

| 动作 | 做了什么 |
| --- | --- |
| 开始 | `startedAt = segmentStartedAt = now`，`accumulatedMs = 0` |
| 暂停 | `accumulatedMs += now − segmentStartedAt`，`segmentStartedAt = null` |
| 继续 | `segmentStartedAt = now`（累计值不动） |
| 结束 | 先按暂停结算，再产出记录草稿 |

结束时的有效时长 = `accumulatedMs`；暂停总时长 = `(endedAt − startedAt) − durationMs`，不需要额外维护暂停计数器。

### 4.3 App 被杀之后

每次状态变更都把 `ActiveTimer` 写进 AsyncStorage。重新打开时 `recoverTimer()` 判断：

```
now − segmentStartedAt <= maxSegmentMs  →  原样继续
否则                                    →  按上限裁剪
```

所以 9:00 开始 → 9:40 App 被杀 → 10:00 重新打开，会正确显示 1 小时，完全不需要后台常驻进程。

裁剪阈值默认 8 小时（设置页可改 2/4/8/12）。这是刻意加的护栏：用户晚上忘了点结束，第二天打开时不至于凭空多出十几个小时。

另外，`elapsedMs` 里的 `Math.max(0, ...)` 是给系统校时/用户手动改时间导致时钟回拨兜底的，避免出现负数时长。

### 4.4 唯一入口

`timerRuntime.ts` 里的 `startStudySession / pauseStudySession / resumeStudySession / finishStudySession` 是所有改计时状态的入口：UI 按钮、通知按钮、后台任务都走这里，并且串在同一条 Promise 队列上，避免 UI 和通知栏同时操作产生竞态。

结束的顺序是刻意的：先写库 → 再清进行中状态 → 最后移除通知。任何一步失败都不会丢记录；写库失败时会保留计时状态，UI 提示「再点一次结束」，而不是静默丢数据。

另外，同一时间只允许一段进行中的计时。如果用户在「数据结构」计时中又点了「英语」的开始，旧会话会自动结算入库并把结果返回给 UI 提示，而不是被悄悄覆盖。

---

## 5. 常驻通知与后台

实现在 `notifications.ts` + `backgroundTasks.ts` + `notificationConstants.ts`。

- 通知渠道：Android 上建 `study-timer` 渠道，`importance: LOW`、无声、不震动、不亮灯 —— 常驻但不打扰。
- 常驻：通知内容带 `sticky: true`（Android 的 `isOngoing`，不可滑动删除）与 `autoDismiss: false`。
- 原地更新：通知 id 固定为 `kaoyan-study-timer`。Android 会把它当作 tag，用同一个 id 再次推送即为更新，列表里不会堆出一排。
- 按钮：两个通知分类 `studyTimerRunning` / `studyTimerPaused`，分别带「暂停 / 结束学习」和「继续 / 结束学习」。
- App 被杀时：`暂停 / 继续` 按钮设了 `opensAppToForeground: false`，由 `Notifications.registerTaskAsync` + `TaskManager.defineTask` 定义的 headless 任务接管（Android）。该任务在全新的 JS 上下文里跑，所以它调用的 `handleTimerNotificationAction` 只依赖 AsyncStorage + SQLite，不依赖任何 React / Zustand 状态。
- 「结束学习」按钮设了 `opensAppToForeground: true`：这是重要的收尾动作，让用户回到 App 看到结算结果。
- `defineTask` 的位置：必须在 bundle 顶层执行，所以 `index.ts`（自定义入口）在 `import 'expo-router/entry'` 之前先 `import '@/services/backgroundTasks'`。

关于「前台服务」的诚实说明：Managed Workflow 下 `expo-notifications` 提供的是常驻（ongoing）通知，不是真正的 Android Foreground Service —— 它不会为了保活而拉起 Service，因为本方案根本不需要保活（时长来自时间戳）。如果确实要一个带 `startForeground()` 的 Service（例如要在通知里做原生计时器/倒计时），需要：

1. 切到开发构建；
2. 接入 `@notifee/react-native` 并开启 `android.foregroundService`，或写一个小的本地 Expo Module；
3. 在 `app.json` 里补 `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_DATA_SYNC` 权限，并处理 Android 14 的前台服务类型声明。

通知文案（`已学习 1 小时 12 分 · 14:32 开始`）在前台每 60 秒刷新一次，但即使这个刷新一次都没跑成，通知上仍然写着开始时刻，信息不会失真 —— 因为时长本身永远是时间戳的函数。

---

## 6. 数据统计与展示

### 6.1 时长展示（仿 Steam）

- 科目库列表行：封面（118×74）+ 科目名 + 副标题 + `已学习 127.3 小时` + `近 2 周：8.4 小时` + 本周目标细进度条。
- 顶部「最近学习」大图卡：按 `lastStudiedAt` 取最近学科，覆盖「最近学习」徽标、大号累计时长和「开始学习」按钮。
- 全部数字走 `formatHours()`，与 Steam 的「127.3 小时」写法一致；不足 0.1 小时显示 `< 0.1`。

### 6.2 科目详情

- 顶部 16:9 大图 + 总时长浮层。
- `近 2 周 / 近 1 月 / 全部时间` 分段控件 + 时长曲线（`react-native-gifted-charts` 的 `LineChart`，带面积渐变）。「全部时间」跨度超过 60 天时自动按月聚合，避免横轴挤成一团。
- 每个区间的合计 / 日均 / 单日最高。
- 本周与本月目标进度条（成就样式）。
- 10/50/100/500 小时里程碑徽章。
- 学习记录时间线：`9月26日 学习了 2.5 小时` + `14:00 – 16:30`（有暂停时还会标注暂停时长）。

### 6.3 数据统计页

- 今日 / 本周 / 本月 / 累计四联指标。
- `每日 / 每周 / 每月` 柱状图（`BarChart`），分别展示最近 14 天、8 个自然周（周一起算）、12 个自然月。
- 各科每周目标进度条（Steam 成就样式）。
- 里程碑徽章 + 「距离下一个里程碑还差 X 小时」。

柱状图会按容器宽度和柱子数量动态计算 `barWidth / spacing`，柱子太密时标签隔位显示（首尾必留），窗口期无数据时给出空状态而不是画一根零高柱。

### 6.4 图表数据从哪来

`aggregateDailyTotals()` 一条 SQL 拿到「科目 × 日期」的聚合，`statsService` 在它上面折叠出所有窗口：

```
按天 → 近 14 天 / 近 30 天 / 本周 / 本月 / 每日序列
按周 → 8 个自然周
按月 → 12 个自然月 / 「全部时间」（跨度大时）
```

好处是时区问题只需要在写入时处理一次，其余全是纯函数，并且可以用 `npm run verify` 在没有模拟器的情况下断言。

---

## 7. 视觉

**布局与交互仍对标 Steam 游戏库，但配色改成了护眼向的暖调墨绿**（原来的冷蓝黑太「商务」，长时间看容易累）。全部色值集中在 `src/theme/theme.ts`，换主题只改这一个文件。

### 7.1 护眼配色的三条取舍

1. **底色不黑**：`#1A211B` 暖调深墨绿，替代原来的冷蓝黑 `#171A21`。人眼对绿光最敏感，暗色里带一点绿，压迫感明显降低。
2. **整体降饱和**：原来的 Steam 蓝 `#66C0F4`、荧光绿 `#A4D007` 换成柔和薄荷绿 `#8ED6A4`、温润草绿 `#A8C97F`；6 个科目的封面配色也一起降饱和（荧光青/亮紫/亮粉 → 灰青/藕紫/豆沙粉）。
3. **正文不用纯白**：`#D6DFCE` 暖白偏绿，减少眩光；对比度仍有 **12:1**，远高于 WCAG AA 要求的 4.5:1。

| 用途 | 色值 | 对比度（对主底色） |
| --- | --- | --- |
| 主底色 | `#1A211B` | — |
| 内容区 / 游戏库 | `#212A20` | — |
| 卡片面 | `#1E2620` | — |
| 悬浮 / 选中（苔绿） | `#33402F` | — |
| 主强调（薄荷绿） | `#8ED6A4` | 9.7:1 |
| 开始学习（草绿） | `#A8C97F` | 8.8:1 |
| 成就金 | `#D4B36A` | 8.2:1 |
| 危险 / 提示 | `#D9736A` | 5.2:1 |
| 正文 | `#D6DFCE` | 12.0:1 |
| 次级 / 弱化文字 | `#9AA694` / `#828E79` | 6.5:1 / 4.8:1 |

### 7.2 半透明颜色统一走 `withAlpha()`

描边、底色、渐变遮罩一律用 `withAlpha(colors.x, 0.12)` 生成，不再手写 `rgba(...)`。理由是：原来 `rgba(23,26,33,0.72)` 这类值散落在 8 个文件里，改一次主题要满地找颜色，改漏一处就会出现「半透明层还是旧色」的脏边。

封面图不需要任何图片资源：`SubjectCover` 用「渐变 + 右上角光晕 + 两道斜向高光 + 大写字母」合成，每个科目一套配色。想换成真实封面，给 `Subject.coverImage` 填上地址即可，组件会自动优先渲染图片。

界面内图标全部是手写 SVG path（`components/ui/Icon.tsx`），不引入图标字体，Android / iOS 形状完全一致。

### 7.3 App 图标也是代码生成的

图标不是设计稿导出的位图，而是由 `scripts/generate-icons.cjs` 画出来再栅格化：

```bash
npm run icons            # 生成 6 个 PNG（默认沙漏方案）
npm run icons -- clock   # 换成表针时钟方案
npm run icons:preview    # 输出 _icon-preview.png，肉眼验收各图层
```

> 这两个脚本依赖 `sharp`，但它不在项目依赖里（只有改图标时才需要）。直接 `npm i -D sharp` 即可；本仓库的图标是在 Codex 内置运行时里生成的。

主体是一个**沙漏**：48px 下轮廓比「圆环 + 指针」更结实，而且「时间在流走」和计时语义直接对应。配色取自护眼主题的薄荷绿 `#8ED6A4` 配深墨绿底。

| 文件 | 用途 |
| --- | --- |
| `icon.png` | iOS 与 Android 传统图标（满幅 1024×1024） |
| `android-icon-foreground.png` | 自适应图标前景层（透明底） |
| `android-icon-background.png` | 自适应图标背景层 |
| `android-icon-monochrome.png` | 主题图标（纯白剪影，颜色由系统着色） |
| `splash-icon.png` | 启动屏（透明底，叠在深墨绿底上） |
| `favicon.png` | Web favicon（64×64） |

SVG 源文件写在 `assets/icon-source/`，方便直接查看或改。

**为什么不用 AI 生成位图**：Android 自适应图标要求主体落在画布中间 **66/108 的安全圆**内（1024 画布下半径 ≈313），否则圆形或水滴遮罩会切掉边角；monochrome 层还必须是纯色剪影。这些几何约束用代码能精确保证。沙漏的尺寸就是按这个约束反推的 —— 半宽 172 × 半高 258，外接圆半径 √(172² + 258²) ≈ 310 < 313，横梁四角稳稳落在安全区内。

---

## 8. 已做的验证

```bash
npm run check
```

- `tsc --noEmit`：通过（strict，含 `noUncheckedIndexedAccess`）
- `expo lint`（eslint-config-expo + React Compiler 规则）：0 error / 0 warning
- `npx expo-doctor`：21/21 通过
- Metro 打包（`expo export --platform android`）：成功，1967 个模块
- `npm run verify`：53/53 断言通过，覆盖
  - 时间戳差值与时长的关系（不依赖任何 tick）
  - 暂停冻结 / 继续累加 / 结束后暂停时长 = 跨度 − 有效时长
  - App 被杀后恢复（间隔照样计入）
  - 忘关计时的超长分段裁剪
  - 时钟回拨保护
  - 跨天的 `day_key` 归属、周一起算的自然周、月初
  - 7 月的记录不计入近 14 天但仍计入累计
  - 每日/每周/每月序列长度与求和（同一天多条记录会求和而不是覆盖）
  - 跨度 > 60 天自动按月聚合
  - 里程碑阈值 10 / 50 / 100 / 500

尚未验证：真机/模拟器上的实际渲染与通知交互，`scripts/` 里也没有 UI 测试。要在设备上跑：

```bash
npx expo run:android     # 或 npx expo run:ios（需要 macOS）
```

---

## 9. 已知限制 / 后续可做

- Android 前台服务：如上所述，当前用常驻通知实现，没有真正的 `startForeground()` Service。
- Android 省电策略：部分国产 ROM 会限制后台、杀掉 headless 任务，通知按钮的暂停/继续可能失效。计时本身不受影响（时间戳不会丢），只是需要回到 App 操作。
- iOS 通知按钮：iOS 不支持 `opensAppToForeground: false` 的静默处理，点「暂停」会拉起 App；这是平台限制。
- 单设备：没有账号与同步，数据仅在本机；卸载即丢失。
- 手动补录：`StudySession.source` 已经预留了 `'manual'`，但还没有补录 UI。
- 科目增删改：目前科目是内置的，`subjects` 表已经支持 `archived`，加一个编辑页即可。
