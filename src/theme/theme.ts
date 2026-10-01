import { Platform } from 'react-native';

/**
 * 护眼主题（暖调墨绿）
 *
 * 设计取舍：
 * 1. 底色不用纯黑、也不用冷蓝黑，改用暖调深墨绿（人眼对绿光最敏感，
 *    暗色里带一点绿会明显降低「压眼」和「太商务」的感觉）；
 * 2. 降低整体饱和度：原来的 Steam 蓝 #66C0F4 / 荧光绿 #A4D007 全部换成
 *    柔和的薄荷绿与草绿，长时间盯着不刺激；
 * 3. 正文用暖白偏绿 #D6DFCE 而不是纯白，减少眩光；对比度仍然有 12:1，
 *    远高于 WCAG AA 的 4.5:1，读起来一点都不费劲。
 */
export const colors = {
  /** 主底色：暖调深墨绿 */
  bg: '#1A211B',
  /** 内容区 / 游戏库底色：比主底稍亮，带绿 */
  bgLibrary: '#212A20',
  /** 卡片面 */
  surface: '#1E2620',
  surfaceAlt: '#28332A',
  /** 悬浮 / 选中态：低饱和苔绿 */
  steel: '#33402F',
  steelLight: '#47563F',
  border: '#2B3629',
  divider: '#242C22',
  /** 主强调色：柔和薄荷绿 */
  accent: '#8ED6A4',
  accentDeep: '#5FAE79',
  /** 正向 / 「开始学习」：温润草绿 */
  play: '#A8C97F',
  playDeep: '#4E6B36',
  /** 成就金：暖金，不刺眼 */
  gold: '#D4B36A',
  /** 提示 / 危险：柔和陶土红 */
  danger: '#D9736A',
  /** 正文：暖白偏绿，避免纯白眩光 */
  text: '#D6DFCE',
  textBright: '#EFF4E9',
  textMuted: '#9AA694',
  textDim: '#828E79',
  /** 彩色按钮上的深色文字 */
  onPlay: '#1B2410',
  onAccent: '#0E1A12',
  onGold: '#2A2210',
  black: '#000000',
  transparent: 'transparent',
} as const;

/**
 * 把 #RRGGBB 转成 rgba()。
 *
 * 半透明描边 / 底色 / 渐变遮罩一律走这个函数，不要再手写 rgba，
 * 否则每次调整主题都要满地找颜色。
 */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '');
  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

/** 4pt 栅格 */
export const space = (n: number) => n * 4;

export const radius = {
  xs: 3,
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  pill: 999,
} as const;

export const font = {
  /** 时长数字使用等宽字体，避免每秒跳动时宽度抖动 */
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  bold: '700',
  semibold: '600',
  medium: '500',
  regular: '400',
} as const;

export const elevation = {
  card: {
    shadowColor: colors.black,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  hero: {
    shadowColor: colors.black,
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 12,
  },
} as const;

/** 交给 React Navigation 的主题，避免出现白底闪烁 */
export const navigationTheme = {
  dark: true,
  colors: {
    primary: colors.accent,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
    notification: colors.accent,
  },
  fonts: {
    regular: { fontFamily: 'System', fontWeight: '400' as const },
    medium: { fontFamily: 'System', fontWeight: '500' as const },
    bold: { fontFamily: 'System', fontWeight: '700' as const },
    heavy: { fontFamily: 'System', fontWeight: '900' as const },
  },
};

export const theme = { colors, radius, font, elevation, space } as const;
