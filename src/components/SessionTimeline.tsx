import { StyleSheet, Text, View } from 'react-native';

import type { StudySession } from '@/models/session';
import { colors, font, radius, space } from '@/theme/theme';
import { formatMonthDay, formatTimeOfDay, toDayKey } from '@/utils/date';
import { formatHours } from '@/utils/format';

export interface SessionTimelineProps {
  sessions: StudySession[];
  /** 由调用方通过 useNow() 提供，组件本身保持纯函数 */
  now: number;
}

/** 学习记录时间线：`9月26日 学习了 2.5 小时` */
export function SessionTimeline({ sessions, now }: SessionTimelineProps) {
  if (sessions.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>还没有学习记录，点上面的「开始学习」记第一笔。</Text>
      </View>
    );
  }

  const todayKey = toDayKey(now);

  return (
    <View>
      {sessions.map((session, index) => {
        const isLast = index === sessions.length - 1;
        const dayLabel = session.dayKey === todayKey ? '今天' : formatMonthDay(session.startedAt);
        return (
          <View key={session.id} style={styles.row}>
            <View style={styles.rail}>
              <View style={styles.dot} />
              {!isLast ? <View style={styles.line} /> : null}
            </View>

            <View style={styles.content}>
              <Text style={styles.primary}>
                {dayLabel} 学习了{' '}
                <Text style={styles.highlight}>{formatHours(session.durationMs)} 小时</Text>
              </Text>
              <Text style={styles.secondary}>
                {formatTimeOfDay(session.startedAt)} – {formatTimeOfDay(session.endedAt)}
                {session.pausedMs > 60_000
                  ? ` · 其中暂停 ${formatHours(session.pausedMs)} 小时`
                  : ''}
              </Text>
            </View>

            <Text style={styles.duration}>{formatHours(session.durationMs)} h</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space(3),
  },
  rail: {
    width: 12,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
    marginTop: 5,
  },
  line: {
    flex: 1,
    width: 1.5,
    backgroundColor: colors.divider,
    marginTop: 2,
  },
  content: {
    flex: 1,
    paddingBottom: space(4),
    gap: 2,
  },
  primary: {
    color: colors.text,
    fontSize: 14,
  },
  highlight: {
    color: colors.textBright,
    fontWeight: font.semibold,
  },
  secondary: {
    color: colors.textDim,
    fontSize: 11.5,
  },
  duration: {
    flexShrink: 0,
    color: colors.textMuted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    marginTop: 3,
  },
  empty: {
    paddingVertical: space(5),
    alignItems: 'center',
  },
  emptyText: {
    color: colors.textDim,
    fontSize: 12.5,
    textAlign: 'center',
  },
});
