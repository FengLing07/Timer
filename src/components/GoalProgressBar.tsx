import { StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, space } from '@/theme/theme';
import { formatHours, formatHoursValue } from '@/utils/format';

export interface GoalProgressBarProps {
  title: string;
  /** 当前进度（毫秒） */
  currentMs: number;
  /** 目标（分钟） */
  goalMinutes: number;
  accent: string;
  caption?: string;
  height?: number;
}

/** 仿 Steam 成就进度条：左侧标题、右侧「当前 / 目标」，下面是细进度条 */
export function GoalProgressBar({
  title,
  currentMs,
  goalMinutes,
  accent,
  caption,
  height = 7,
}: GoalProgressBarProps) {
  const goalMs = Math.max(0, goalMinutes) * 60_000;
  const ratio = goalMs > 0 ? Math.min(1, currentMs / goalMs) : 0;
  const done = ratio >= 1;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.value, done && { color: colors.play }]}>
          {formatHours(currentMs)} / {formatHoursValue(goalMs, goalMs < 3_600_000 ? 2 : 0)} 小时
        </Text>
      </View>

      <View style={[styles.track, { height }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.max(ratio * 100, ratio > 0 ? 2 : 0)}%`,
              backgroundColor: done ? colors.play : accent,
            },
          ]}
        />
      </View>

      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: space(2),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space(2),
  },
  title: {
    flexShrink: 1,
    color: colors.text,
    fontSize: 13.5,
    fontWeight: font.medium,
  },
  value: {
    flexShrink: 0,
    color: colors.textMuted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  track: {
    backgroundColor: colors.bg,
    borderRadius: radius.pill,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.divider,
  },
  fill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  caption: {
    color: colors.textDim,
    fontSize: 11,
  },
});
