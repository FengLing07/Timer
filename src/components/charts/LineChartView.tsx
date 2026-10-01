import { StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';

import {
  Y_AXIS_WIDTH,
  niceMaxValue,
  thinLabels,
  toHourValues,
} from '@/components/charts/chartUtils';
import type { SeriesPoint } from '@/services/statsService';
import { colors, space } from '@/theme/theme';

export interface LineChartViewProps {
  points: SeriesPoint[];
  containerWidth: number;
  accent: string;
  height?: number;
  emptyHint?: string;
}

/** 科目详情页的时长曲线（近 2 周 / 近 1 月 / 全部） */
export function LineChartView({
  points,
  containerWidth,
  accent,
  height = 200,
  emptyHint = '这段时间还没有学习记录',
}: LineChartViewProps) {
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
  const chartWidth = Math.max(120, containerWidth - Y_AXIS_WIDTH);

  const lineData = points.map((point, index) => ({
    value: values[index] ?? 0,
    label: labels[index] ?? '',
  }));

  const dense = points.length > 30;

  return (
    <View>
      <View style={styles.axisHint}>
        <Text style={styles.axisHintText}>单位：小时</Text>
      </View>
      <LineChart
        data={lineData}
        width={chartWidth}
        height={height}
        maxValue={maxValue}
        noOfSections={4}
        color={accent}
        thickness={2.5}
        curved
        areaChart
        startFillColor={accent}
        endFillColor={accent}
        startOpacity={0.34}
        endOpacity={0.02}
        hideDataPoints={dense}
        dataPointsColor={accent}
        dataPointsRadius={3}
        initialSpacing={14}
        endSpacing={14}
        yAxisLabelWidth={Y_AXIS_WIDTH}
        yAxisTextStyle={styles.axisText}
        xAxisLabelTextStyle={styles.axisText}
        yAxisColor={colors.transparent}
        xAxisColor={colors.divider}
        yAxisThickness={0}
        xAxisThickness={1}
        rulesColor={colors.divider}
        rulesThickness={1}
        isAnimated
        animationDuration={480}
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
  },
});
