import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RecentlyStudiedHero } from '@/components/RecentlyStudiedHero';
import { SubjectCard } from '@/components/SubjectCard';
import { Icon } from '@/components/ui/Icon';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { formatHours } from '@/utils/format';
import { useLibraryStore } from '@/store/useLibraryStore';
import { colors, font, radius, space } from '@/theme/theme';

export default function LibraryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const subjects = useLibraryStore((state) => state.subjects);
  const statsBySubject = useLibraryStore((state) => state.statsBySubject);
  const totals = useLibraryStore((state) => state.totals);
  const status = useLibraryStore((state) => state.status);
  const load = useLibraryStore((state) => state.load);

  const horizontalPadding = space(4);
  const contentWidth = width - horizontalPadding * 2;

  /** 「最近学习」取最后一次学习时间最晚的科目；都没学过就取排序第一个 */
  const recentSubject = useMemo(() => {
    if (subjects.length === 0) return null;
    return [...subjects].sort((a, b) => {
      const aTime = statsBySubject[a.id]?.lastStudiedAt ?? 0;
      const bTime = statsBySubject[b.id]?.lastStudiedAt ?? 0;
      if (aTime === bTime) return a.sortOrder - b.sortOrder;
      return bTime - aTime;
    })[0]!;
  }, [subjects, statsBySubject]);

  const totalHours = formatHours(totals.totalMs);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + space(3),
            paddingHorizontal: horizontalPadding,
            // 给浮动的进行中计时条留位置
            paddingBottom: space(24),
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={status === 'loading'}
            onRefresh={() => void load()}
            tintColor={colors.accent}
            colors={[colors.accent]}
            progressBackgroundColor={colors.surface}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.title}>考研学习库</Text>
            <Text style={styles.subtitle}>
              共 {subjects.length} 个科目 · 累计 {totalHours} 小时
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="打开数据统计"
            onPress={() => router.push('/stats')}
            style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonPressed]}
          >
            <Icon name="stats" size={18} color={colors.accent} />
          </Pressable>
        </View>

        <View style={styles.summaryRow}>
          <SummaryTile label="今日" ms={totals.todayMs} accent={colors.play} />
          <SummaryTile label="本周" ms={totals.weekMs} accent={colors.accent} />
          <SummaryTile label="近 2 周" ms={totals.last14DaysMs} accent={colors.steelLight} />
        </View>

        {recentSubject ? (
          <View style={styles.heroBlock}>
            <RecentlyStudiedHero
              subject={recentSubject}
              stats={statsBySubject[recentSubject.id] ?? null}
              width={contentWidth}
              onPress={() => router.push(`/subject/${recentSubject.id}`)}
              onStartTimer={() => router.push(`/timer/${recentSubject.id}`)}
            />
          </View>
        ) : null}

        <View style={styles.section}>
          <SectionHeader
            title="全部科目"
            caption={`${totals.sessionCount} 次学习记录`}
          />
          <View style={styles.list}>
            {subjects.map((subject) => (
              <SubjectCard
                key={subject.id}
                subject={subject}
                stats={statsBySubject[subject.id] ?? null}
                onPress={() => router.push(`/subject/${subject.id}`)}
              />
            ))}
          </View>
        </View>

        {totals.sessionCount === 0 ? (
          <View style={styles.tipCard}>
            <Icon name="clock" size={16} color={colors.accent} />
            <Text style={styles.tipText}>
              还没有学习记录。进入任意科目点「开始学习」，App 会记录开始与结束的时间戳，
              时长由两者的差值算出，即使中途退出或重启也不会算错。
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

interface SummaryTileProps {
  label: string;
  ms: number;
  accent: string;
}

function SummaryTile({ label, ms, accent }: SummaryTileProps) {
  return (
    <View style={styles.tile}>
      <View style={[styles.tileAccent, { backgroundColor: accent }]} />
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{formatHours(ms)}</Text>
      <Text style={styles.tileUnit}>小时</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    gap: space(4),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space(3),
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.textBright,
    fontSize: 23,
    fontWeight: font.bold,
    letterSpacing: 0.4,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  headerButton: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  headerButtonPressed: {
    backgroundColor: colors.steel,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: space(3),
  },
  tile: {
    flex: 1,
    paddingVertical: space(3),
    paddingHorizontal: space(3),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  tileAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
  },
  tileLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  tileValue: {
    color: colors.textBright,
    fontSize: 20,
    fontWeight: font.bold,
    fontVariant: ['tabular-nums'],
    marginTop: space(1),
  },
  tileUnit: {
    color: colors.textDim,
    fontSize: 10,
  },
  heroBlock: {
    marginTop: space(1),
  },
  section: {
    gap: space(1),
  },
  list: {
    gap: space(3),
  },
  tipCard: {
    flexDirection: 'row',
    gap: space(3),
    padding: space(4),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  tipText: {
    flex: 1,
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 18,
  },
});
