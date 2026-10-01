import { StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { evaluateMilestones } from '@/services/milestones';
import { colors, font, radius, space, withAlpha } from '@/theme/theme';

export interface MilestoneBadgesProps {
  totalMs: number;
}

/** 累计 10 / 50 / 100 / 500 小时的里程碑徽章 */
export function MilestoneBadges({ totalMs }: MilestoneBadgesProps) {
  const statuses = evaluateMilestones(totalMs);

  return (
    <View style={styles.row}>
      {statuses.map(({ milestone, unlocked, progress }) => (
        <View key={milestone.hours} style={styles.item}>
          <View
            style={[
              styles.badge,
              unlocked ? styles.badgeUnlocked : styles.badgeLocked,
            ]}
          >
            <Icon
              name={unlocked ? 'trophy' : 'target'}
              size={22}
              color={unlocked ? colors.onGold : colors.textDim}
              strokeWidth={2}
            />
          </View>
          <Text style={[styles.hours, unlocked && styles.hoursUnlocked]}>{milestone.hours}h</Text>
          <Text style={styles.title} numberOfLines={1}>
            {milestone.title}
          </Text>
          {!unlocked ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.max(progress * 100, 2)}%` }]} />
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space(2),
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: space(1),
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  badgeUnlocked: {
    backgroundColor: colors.gold,
    borderColor: withAlpha(colors.textBright, 0.45),
    shadowColor: colors.gold,
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  badgeLocked: {
    backgroundColor: colors.bg,
    borderColor: colors.border,
  },
  hours: {
    color: colors.textDim,
    fontSize: 11.5,
    fontWeight: font.semibold,
    fontVariant: ['tabular-nums'],
  },
  hoursUnlocked: {
    color: colors.gold,
  },
  title: {
    color: colors.textMuted,
    fontSize: 10,
  },
  progressTrack: {
    width: '80%',
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: colors.bg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.steelLight,
    borderRadius: radius.pill,
  },
});
