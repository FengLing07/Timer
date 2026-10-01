import Svg, { Circle, Path } from 'react-native-svg';
import type { ColorValue } from 'react-native';

import { colors } from '@/theme/theme';

export type IconName =
  | 'library'
  | 'stats'
  | 'settings'
  | 'play'
  | 'pause'
  | 'stop'
  | 'restart'
  | 'book'
  | 'target'
  | 'trophy'
  | 'flame'
  | 'bell'
  | 'check'
  | 'chevronRight'
  | 'chevronLeft'
  | 'arrowLeft'
  | 'trash'
  | 'plus'
  | 'minus'
  | 'clock';

interface PathDef {
  d: string;
  filled?: boolean;
}

interface IconDef {
  paths: PathDef[];
  filledPaths?: string[];
  circles?: { cx: number; cy: number; r: number }[];
}

/**
 * 全部用 SVG path 手写，避免引入图标字体依赖，
 * 也保证 Android / iOS 上形状完全一致。
 */
const ICONS: Record<IconName, IconDef> = {
  library: {
    paths: [
      { d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20' },
      { d: 'M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' },
    ],
  },
  stats: {
    paths: [{ d: 'M6 20v-5' }, { d: 'M12 20V8' }, { d: 'M18 20V4' }],
  },
  settings: {
    paths: [
      { d: 'M4 21v-6' },
      { d: 'M4 11V3' },
      { d: 'M12 21v-9' },
      { d: 'M12 8V3' },
      { d: 'M20 21v-4' },
      { d: 'M20 13V3' },
      { d: 'M1.5 15h5' },
      { d: 'M9.5 8h5' },
      { d: 'M17.5 17h5' },
    ],
  },
  play: { paths: [], filledPaths: ['M7 4.5 19.5 12 7 19.5z'] },
  pause: {
    paths: [],
    filledPaths: ['M7 4.5h3.6v15H7z', 'M13.4 4.5H17v15h-3.6z'],
  },
  stop: { paths: [], filledPaths: ['M6 6h12v12H6z'] },
  restart: {
    paths: [
      { d: 'M21.5 4.5v6h-6' },
      { d: 'M20.2 15a8.5 8.5 0 1 1-2-8.85L21.5 9' },
    ],
  },
  book: {
    paths: [
      { d: 'M4 4.5A1.5 1.5 0 0 1 5.5 3H11v18H5.5A1.5 1.5 0 0 1 4 19.5z' },
      { d: 'M20 4.5A1.5 1.5 0 0 0 18.5 3H13v18h5.5a1.5 1.5 0 0 0 1.5-1.5z' },
    ],
  },
  target: {
    paths: [
      { d: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z' },
      { d: 'M12 7.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9z' },
      { d: 'M12 12h.01' },
    ],
  },
  trophy: {
    paths: [
      { d: 'M8 21h8' },
      { d: 'M12 17v4' },
      { d: 'M7 3h10v5a5 5 0 0 1-10 0z' },
      { d: 'M7 5H4v1.5A3.5 3.5 0 0 0 7.5 10' },
      { d: 'M17 5h3v1.5A3.5 3.5 0 0 1 16.5 10' },
    ],
  },
  flame: {
    paths: [
      { d: 'M12 2.5c1.2 2.6 4.5 5.5 4.5 9a4.5 4.5 0 0 1-9 0c0-3.5 3.3-6.4 4.5-9z' },
      { d: 'M9.8 14.6a2.6 2.6 0 0 0 4.4 0' },
    ],
  },
  bell: {
    paths: [
      { d: 'M18 8.5a6 6 0 1 0-12 0c0 6-2.5 8-2.5 8h17S18 14.5 18 8.5' },
      { d: 'M13.7 20.5a2 2 0 0 1-3.4 0' },
    ],
  },
  check: { paths: [{ d: 'M20 6.5 9.2 17.3 4 12.1' }] },
  chevronRight: { paths: [{ d: 'M9 18l6-6-6-6' }] },
  chevronLeft: { paths: [{ d: 'M15 18l-6-6 6-6' }] },
  arrowLeft: { paths: [{ d: 'M19 12H5' }, { d: 'M12 19l-7-7 7-7' }] },
  trash: {
    paths: [
      { d: 'M3.5 6.5h17' },
      { d: 'M9 6.5V4.5h6v2' },
      { d: 'M18.5 6.5 17.6 20H6.4L5.5 6.5' },
      { d: 'M10 11v6' },
      { d: 'M14 11v6' },
    ],
  },
  plus: { paths: [{ d: 'M12 5.5v13' }, { d: 'M5.5 12h13' }] },
  minus: { paths: [{ d: 'M5.5 12h13' }] },
  clock: { paths: [{ d: 'M12 7.5V12l3 1.8' }], circles: [{ cx: 12, cy: 12, r: 8.5 }] },
};

export interface IconProps {
  name: IconName;
  size?: number;
  color?: ColorValue;
  strokeWidth?: number;
}

export function Icon({
  name,
  size = 20,
  color = colors.text,
  strokeWidth = 1.9,
}: IconProps) {
  const def = ICONS[name];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {def.circles?.map((circle, index) => (
        <Circle
          key={`c${index}`}
          cx={circle.cx}
          cy={circle.cy}
          r={circle.r}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      ))}
      {def.paths.map((path, index) => (
        <Path
          key={`p${index}`}
          d={path.d}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ))}
      {def.filledPaths?.map((d, index) => (
        <Path key={`f${index}`} d={d} fill={color} stroke={color} strokeWidth={0.6} />
      ))}
    </Svg>
  );
}
