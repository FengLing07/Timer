import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SubjectCover } from '@/components/SubjectCover';
import { Icon } from '@/components/ui/Icon';
import type { Subject } from '@/models/subject';
import type { SubjectStats } from '@/models/stats';
import { colors, font, radius, space } from '@/theme/theme';
import { formatHours, formatLastTwoWeeks, formatLearned } from '@/utils/format';

const COVER_WIDTH = 118;
const COVER_HEIGHT = 74;

export interface SubjectCardProps {
  subject: Subject;
  stats: SubjectStats | null;
  onPress: () => void;
}

export function SubjectCard({ subject, stats, onPress }: SubjectCardProps) {
  const totalMs = stats?.totalMs ?? 0;
  const last14 = stats?.last14DaysMs ?? 0;
  const goalProgress =
    subject.weeklyGoalMinutes > 0
      ? Math.min(1, (stats?.weekMs ?? 0) / (subject.weeklyGoalMinutes * 60_000))
      : 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${subject.name}，${formatLearned(totalMs)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <SubjectCover
        subject={subject}
        width={COVER_WIDTH}
        height={COVER_HEIGHT}
        borderRadius={radius.xs}
      />

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {subject.name}
        </Text>
        <Text style={styles.subtitle} numberOfLines={1}>
          {subject.subtitle}
        </Text>

        <View style={styles.playtimeBlock}>
          <Text style={styles.playtime}>{formatLearned(totalMs)}</Text>
          <Text style={styles.playtimeSecondary}>{formatLastTwoWeeks(last14)}</Text>
        </View>

        <View style={styles.goalTrack}>
          <View
            style={[
              styles.goalFill,
              {
                width: `${Math.max(goalProgress * 100, goalProgress > 0 ? 3 : 0)}%`,
                backgroundColor: subject.accent,
              },
            ]}
          />
        </View>
        <Text style={styles.goalLabel}>
          本周 {formatHours(stats?.weekMs ?? 0)} / {formatHours(subject.weeklyGoalMinutes * 60_000)} 小时
        </Text>
      </View>

      <Icon name="chevronRight" size={18} color={colors.textDim} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    paddingVertical: space(3),
    paddingHorizontal: space(3),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.steel,
    borderColor: colors.steelLight,
  },
  info: {
    flex: 1,
    gap: space(1),
  },
  name: {
    color: colors.textBright,
    fontSize: 16,
    fontWeight: font.semibold,
  },
  subtitle: {
    color: colors.textDim,
    fontSize: 11.5,
  },
  playtimeBlock: {
    marginTop: space(1),
    gap: 1,
  },
  playtime: {
    color: colors.text,
    fontSize: 13,
    fontWeight: font.medium,
  },
  playtimeSecondary: {
    color: colors.textMuted,
    fontSize: 12,
  },
  goalTrack: {
    marginTop: space(2),
    height: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  goalFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  goalLabel: {
    color: colors.textDim,
    fontSize: 10.5,
    marginTop: space(1),
  },
});
