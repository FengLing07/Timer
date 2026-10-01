import { StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import {
  Y_AXIS_WIDTH,
  computeBarGeometry,
  niceMaxValue,
  thinLabels,
  toHourValues,
} from '@/components/charts/chartUtils';
import type { SeriesPoint } from '@/services/statsService';
import { colors, font, space } from '@/theme/theme';

export interface BarChartViewProps {
  points: SeriesPoint[];
  /** 容器可用宽度（已扣掉页面左右内边距） */
  containerWidth: number;
  accent?: string;
  height?: number;
  emptyHint?: string;
}

/** 每日 / 每周 / 每月学习时长柱状图（react-native-gifted-charts） */
export function BarChartView({
  points,
  containerWidth,
  accent = colors.accent,
  height = 190,
  emptyHint = '这段时间还没有学习记录',
}: BarChartViewProps) {
  const allZero = points.every((point) => point.ms <= 0);
  if (points.length === 0 || allZero) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text style={styles.emptyText}>{emptyHint}</Text>
      </View>
    );
  }

  const values = toHourValues(points);
  const maxValue = niceMaxValue(values);
  const labels = thinLabels(points.map((point) => point.label));
  const geometry = computeBarGeometry(containerWidth, points.length);

  const barData = points.map((point, index) => ({
    value: values[index] ?? 0,
    label: labels[index] ?? '',
    frontColor: accent,
  }));

  return (
    <View>
      <View style={styles.axisHint}>
        <Text style={styles.axisHintText}>单位：小时</Text>
      </View>
      <BarChart
        data={barData}
        width={geometry.chartWidth}
        height={height}
        maxValue={maxValue}
        noOfSections={4}
        barWidth={geometry.barWidth}
        spacing={geometry.spacing}
        initialSpacing={geometry.initialSpacing}
        endSpacing={geometry.endSpacing}
        yAxisLabelWidth={Y_AXIS_WIDTH}
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        yAxisColor={colors.transparent}
        xAxisColor={colors.divider}
        yAxisThickness={0}
        xAxisThickness={1}
        rulesColor={colors.divider}
        rulesThickness={1}
        roundedTop
        barBorderRadius={3}
        isAnimated
        animationDuration={420}
        disableScroll
      />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: colors.textDim,
    fontSize: 12.5,
  },
  axisHint: {
    alignItems: 'flex-end',
    marginBottom: space(1),
  },
  axisHintText: {
    color: colors.textDim,
    fontSize: 10,
  },
  axisText: {
    color: colors.textMuted,
    fontSize: 9.5,
    fontWeight: font.regular,
  },
});
