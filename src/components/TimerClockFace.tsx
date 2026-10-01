import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import type { ActiveTimer } from '@/services/timerEngine';
import { colors, font, radius, space, withAlpha } from '@/theme/theme';
import { formatFullDay, formatTimeOfDay } from '@/utils/date';
import { formatClock, formatCompact } from '@/utils/format';

export interface TimerClockFaceProps {
  timer: ActiveTimer;
  elapsedMs: number;
  accent: string;
}

/**
 * 计时面板。
 *
 * 屏幕上的数字是 `elapsedMs(timer, now)` 的渲染结果，不是任何累加器；
 * 下面同时展示原始开始时刻，方便核对时间戳。
 */
export function TimerClockFace({ timer, elapsedMs, accent }: TimerClockFaceProps) {
  const running = timer.phase === 'running';

  return (
    <View style={styles.container}>
      <View style={[styles.statusChip, running ? styles.statusRunning : styles.statusPaused]}>
        <View style={[styles.statusDot, { backgroundColor: running ? colors.play : colors.gold }]} />
        <Text style={styles.statusText}>{running ? '计时中' : '已暂停'}</Text>
      </View>

      <Text
        allowFontScaling={false}
        numberOfLines={1}
        style={[styles.clock, { textShadowColor: accent }]}
        accessibilityLabel={`已学习 ${formatCompact(elapsedMs)}`}
      >
        {formatClock(elapsedMs)}
      </Text>

      <Text style={styles.compactHint}>已学习 {formatCompact(elapsedMs)}</Text>

      <View style={styles.metaRow}>
        <Icon name="clock" size={13} color={colors.textDim} />
        <Text style={styles.metaText}>
          {formatFullDay(timer.startedAt)} {formatTimeOfDay(timer.startedAt)} 开始
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: space(2),
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    paddingHorizontal: space(3),
    paddingVertical: space(1) + 1,
    borderRadius: radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusRunning: {
    backgroundColor: withAlpha(colors.play, 0.12),
    borderColor: withAlpha(colors.play, 0.45),
  },
  statusPaused: {
    backgroundColor: withAlpha(colors.gold, 0.12),
    borderColor: withAlpha(colors.gold, 0.45),
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: radius.pill,
  },
  statusText: {
    color: colors.text,
    fontSize: 11.5,
    fontWeight: font.medium,
  },
  clock: {
    color: colors.textBright,
    fontSize: 54,
    fontWeight: font.bold,
    fontFamily: font.mono,
    letterSpacing: 1,
    // 不设 fontVariant：等宽字体数字本就等宽，
    // 而带 font feature 时 Android 的测量宽度可能小于渲染宽度，会裁掉最后一位数字。
    textAlign: 'center',
    // 左右留出余量，抵消 letterSpacing 与字体阴影可能带来的溢出
    paddingHorizontal: space(4),
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 18,
  },
  compactHint: {
    color: colors.textMuted,
    fontSize: 13,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    marginTop: space(1),
  },
  metaText: {
    color: colors.textDim,
    fontSize: 11.5,
  },
});
