import type { SeriesPoint } from '@/services/statsService';
import { formatHoursValue } from '@/utils/format';

export const Y_AXIS_WIDTH = 38;

/** 把毫秒序列换算成「小时」，并给出一个好看的 Y 轴上限 */
export function toHourValues(points: SeriesPoint[]): number[] {
  return points.map((point) => formatHoursValue(point.ms, 2));
}

export function niceMaxValue(values: number[]): number {
  const peak = values.reduce((max, value) => Math.max(max, value), 0);
  if (peak <= 0) return 1;
  if (peak <= 1) return 1;
  if (peak <= 2) return 2;
  if (peak <= 5) return 5;
  if (peak <= 10) return 10;
  const step = peak <= 30 ? 5 : peak <= 80 ? 10 : 20;
  return Math.ceil(peak / step) * step;
}

/**
 * 柱子太密时标签会互相压住，隔一个显示一个。
 * 首尾两根一定保留，读图时能立刻定位时间范围。
 */
export function thinLabels(labels: string[]): string[] {
  if (labels.length <= 8) return labels;
  const stride = labels.length > 20 ? 4 : 2;
  return labels.map((label, index) =>
    index === 0 || index === labels.length - 1 || index % stride === 0 ? label : ''
  );
}

export interface BarGeometry {
  barWidth: number;
  spacing: number;
  initialSpacing: number;
  endSpacing: number;
  chartWidth: number;
}

/** 在画柱子之前，先把可用宽度平均分给每根柱子 */
export function computeBarGeometry(containerWidth: number, count: number): BarGeometry {
  const chartWidth = Math.max(120, containerWidth - Y_AXIS_WIDTH);
  const initialSpacing = count > 14 ? 6 : 10;
  const endSpacing = initialSpacing;
  const spacing = count > 20 ? 3 : count > 10 ? 6 : count > 5 ? 10 : 16;
  const usable = chartWidth - initialSpacing - endSpacing - spacing * Math.max(0, count - 1);
  const barWidth = Math.max(4, Math.min(28, Math.floor(usable / Math.max(1, count))));
  return { barWidth, spacing, initialSpacing, endSpacing, chartWidth };
}
