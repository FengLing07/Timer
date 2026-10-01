import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { SubjectCover } from '@/components/SubjectCover';
import { Icon } from '@/components/ui/Icon';
import type { Subject } from '@/models/subject';
import type { SubjectStats } from '@/models/stats';
import { colors, font, radius, space, withAlpha } from '@/theme/theme';
import { formatHours, formatLastTwoWeeks } from '@/utils/format';

export interface RecentlyStudiedHeroProps {
  subject: Subject;
  stats: SubjectStats | null;
  width: number;
  onPress: () => void;
  onStartTimer: () => void;
}

/** Steam 游戏库顶部那张大图「最近游玩」卡片 */
export function RecentlyStudiedHero({
  subject,
  stats,
  width,
  onPress,
  onStartTimer,
}: RecentlyStudiedHeroProps) {
  const height = Math.round(width * 0.5);

  return (
    <View style={[styles.wrapper, { width, height }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${subject.name} 科目详情`}
        onPress={onPress}
        style={StyleSheet.absoluteFill}
      >
        <SubjectCover
          subject={subject}
          width={width}
          height={height}
          variant="hero"
          borderRadius={radius.md}
          monogramSize={Math.round(height * 0.42)}
        />
      </Pressable>

      <LinearGradient
        colors={[withAlpha(colors.bg, 0.55), withAlpha(colors.bg, 0.05), withAlpha(colors.bg, 0.9)]}
        locations={[0, 0.45, 1]}
        style={[StyleSheet.absoluteFill, styles.scrim]}
        pointerEvents="none"
      />

      <View style={styles.topRow} pointerEvents="none">
        <View style={styles.badge}>
          <Icon name="flame" size={12} color={colors.gold} strokeWidth={2} />
          <Text style={styles.badgeText}>最近学习</Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.titleBlock} pointerEvents="none">
          <Text style={styles.name} numberOfLines={1}>
            {subject.name}
          </Text>
          <Text style={styles.playtime}>已学习 {formatHours(stats?.totalMs ?? 0)} 小时</Text>
          <Text style={styles.secondary}>{formatLastTwoWeeks(stats?.last14DaysMs ?? 0)}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`开始学习${subject.name}`}
          onPress={onStartTimer}
          style={({ pressed }) => [styles.playButton, pressed && styles.playButtonPressed]}
        >
          <Icon name="play" size={16} color={colors.onPlay} />
          <Text style={styles.playButtonText}>开始学习</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  scrim: {
    borderRadius: radius.md,
  },
  topRow: {
    position: 'absolute',
    top: space(3),
    left: space(3),
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
    paddingHorizontal: space(2),
    paddingVertical: space(1) - 2,
    borderRadius: radius.pill,
    backgroundColor: withAlpha(colors.bg, 0.72),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha(colors.gold, 0.5),
  },
  badgeText: {
    color: colors.gold,
    fontSize: 10.5,
    fontWeight: font.semibold,
  },
  bottomRow: {
    position: 'absolute',
    left: space(4),
    right: space(4),
    bottom: space(4),
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: space(3),
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.textBright,
    fontSize: 22,
    fontWeight: font.bold,
    letterSpacing: 0.4,
  },
  playtime: {
    color: colors.text,
    fontSize: 13.5,
    fontWeight: font.medium,
  },
  secondary: {
    color: colors.textMuted,
    fontSize: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    backgroundColor: colors.play,
    paddingVertical: space(2) + 2,
    paddingHorizontal: space(3),
    borderRadius: radius.sm,
  },
  playButtonPressed: {
    opacity: 0.82,
    transform: [{ scale: 0.98 }],
  },
  playButtonText: {
    color: colors.onPlay,
    fontSize: 13,
    fontWeight: font.bold,
  },
});
