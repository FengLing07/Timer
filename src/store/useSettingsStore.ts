import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export interface AppSettings {
  /** 是否展示计时常驻通知 */
  persistentTimerNotification: boolean;
  /** 启动计时后是否保持屏幕常亮 */
  keepScreenOn: boolean;
  /** 操作反馈震动 */
  haptics: boolean;
  /**
   * 单个运行分段的最大长度（小时）。
   * App 被杀后重新打开时，如果发现"上一段"超过这个长度，按上限结算，
   * 防止用户忘了点结束导致一天凭空多出十几个小时。
   */
  maxSegmentHours: number;
  /** 短于这个秒数的记录会被丢弃，避免误触产生垃圾数据 */
  minSessionSeconds: number;
  /** 统计页默认的时间粒度 */
  defaultGranularity: 'day' | 'week' | 'month';
  /** 首次启动引导是否已读 */
  onboardingDone: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  persistentTimerNotification: true,
  keepScreenOn: true,
  haptics: true,
  maxSegmentHours: 8,
  minSessionSeconds: 60,
  defaultGranularity: 'day',
  onboardingDone: false,
};

interface SettingsState extends AppSettings {
  hydrated: boolean;
  update: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  reset: () => void;
  /** persist 恢复完成后由 onRehydrateStorage 置位 */
  _setHydrated: (value: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      hydrated: false,
      update: (key, value) => set({ [key]: value } as Partial<SettingsState>),
      reset: () => set({ ...DEFAULT_SETTINGS }),
      _setHydrated: (value) => set({ hydrated: value }),
    }),
    {
      name: 'kaoyan.settings.v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ hydrated: _hydrated, ...rest }) => rest,
      onRehydrateStorage: () => (state) => {
        state?._setHydrated(true);
      },
    }
  )
);

/** 供非 React 环境（后台通知任务）读取 */
export async function readSettingsSnapshot(): Promise<AppSettings> {
  try {
    const raw = await AsyncStorage.getItem('kaoyan.settings.v1');
    if (!raw) return DEFAULT_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'state' in parsed) {
      return { ...DEFAULT_SETTINGS, ...(parsed as { state: Partial<AppSettings> }).state };
    }
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}
