import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LineChartView } from '@/components/charts/LineChartView';
import { GoalProgressBar } from '@/components/GoalProgressBar';
import { MilestoneBadges } from '@/components/MilestoneBadges';
import { SessionTimeline } from '@/components/SessionTimeline';
import { SubjectCover } from '@/components/SubjectCover';
import { ActionButton } from '@/components/ui/ActionButton';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useSubjectSessions } from '@/hooks/useSubjectSessions';
import { useNow } from '@/hooks/useElapsedMs';
import { buildRangeSeries, seriesPeak, seriesTotal, type DetailRange } from '@/services/statsService';
import { useSubject, useSubjectStats } from '@/store/useLibraryStore';
import { useTimerStore } from '@/store/useTimerStore';
import { colors, font, radius, space, withAlpha } from '@/theme/theme';
import { formatFullDay, formatMonthDay } from '@/utils/date';
import { formatHours, formatLearned } from '@/utils/format';

const RANGE_OPTIONS: { value: DetailRange; label: string }[] = [
  { value: 'last14', label: '近 2 周' },
  { value: 'last30', label: '近 1 月' },
  { value: 'all', label: '全部时间' },
];

const RANGE_DAYS: Record<DetailRange, number | null> = {
  last14: 14,
  last30: 30,
  all: null,
};

export default function SubjectDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams<{ subjectId?: string }>();
  const subjectId = params.subjectId ?? null;

  const [range, setRange] = useState<DetailRange>('last14');
  const now = useNow(60_000);

  const subject = useSubject(subjectId);
  const stats = useSubjectStats(subjectId);
  const timer = useTimerStore((state) => state.timer);
  const { sessions } = useSubjectSessions(subjectId, 30);

  const horizontalPadding = space(4);
  const cardInnerWidth = width - horizontalPadding * 2 - space(4) * 2;

  const points = useMemo(() => {
    if (!stats) return [];
    return buildRangeSeries(stats.daily, range, now);
  }, [stats, range, now]);

  const rangeTotal = seriesTotal(points);
  const rangePeak = seriesPeak(points);
  const rangeDays = RANGE_DAYS[range] ?? points.length;
  const rangeAverage = rangeTotal / Math.max(1, rangeDays);

  const isTimerForThisSubject = timer?.subjectId === subjectId;

  if (!subject) {
    return (
      <View style={[styles.screen, styles.center]}>
        <Text style={styles.missingText}>没有找到这个科目</Text>
        <ActionButton label="返回科目库" icon="arrowLeft" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: space(28) }]}
        showsVerticalScrollIndicator={false}
      >
        <View>
          <SubjectCover
            subject={subject}
            width={width}
            height={Math.round(width * 0.58)}
            borderRadius={0}
            variant="hero"
            monogramSize={Math.round(width * 0.2)}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="返回"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              { top: insets.top + space(2) },
              pressed && styles.backButtonPressed,
            ]}
            hitSlop={8}
          >
            <Icon name="arrowLeft" size={18} color={colors.textBright} />
          </Pressable>

          <View style={styles.heroText}>
            <Text style={styles.heroSubtitle}>{subject.subtitle}</Text>
            <Text style={styles.heroTitle}>{subject.name}</Text>
            <Text style={styles.heroPlaytime}>{formatLearned(stats?.totalMs ?? 0)}</Text>
            <Text style={styles.heroSecondary}>
              近 2 周 {formatHours(stats?.last14DaysMs ?? 0)} 小时 · 共{' '}
              {stats?.sessionCount ?? 0} 次记录
              {stats?.lastStudiedAt
                ? ` · 最近 ${formatMonthDay(stats.lastStudiedAt)}`
                : ''}
            </Text>
          </View>
        </View>

        <View style={[styles.body, { paddingHorizontal: horizontalPadding }]}>
          <View style={styles.actionRow}>
            <ActionButton
              label={isTimerForThisSubject ? '回到计时页' : '开始学习'}
              icon="play"
              tone="play"
              onPress={() => router.push(`/timer/${subject.id}`)}
              style={styles.actionPrimary}
            />
          </View>

          <Card style={styles.chartCard}>
            <SegmentedControl options={RANGE_OPTIONS} value={range} onChange={setRange} />

            <View style={styles.chartSummary}>
              <Text style={styles.chartSummaryValue}>{formatHours(rangeTotal)} 小时</Text>
              <Text style={styles.chartSummaryHint}>
                日均 {formatHours(rangeAverage)} · 单日最高 {formatHours(rangePeak)} ·{' '}
                {range === 'all' ? '按月/日自动聚合' : `${RANGE_DAYS[range]} 天`}
              </Text>
            </View>

            <LineChartView
              points={points}
              containerWidth={cardInnerWidth}
              accent={subject.accent}
            />
          </Card>

          <Card style={styles.card}>
            <SectionHeader title="目标进度" caption="每周目标" />
            <View style={styles.goalSpacing}>
              <GoalProgressBar
                title="本周"
                currentMs={stats?.weekMs ?? 0}
                goalMinutes={subject.weeklyGoalMinutes}
                accent={subject.accent}
                caption={`本周剩余 ${
                  Math.max(0, subject.weeklyGoalMinutes * 60_000 - (stats?.weekMs ?? 0)) > 0
                    ? formatHours(
                        Math.max(0, subject.weeklyGoalMinutes * 60_000 - (stats?.weekMs ?? 0))
                      )
                    : '0'
                } 小时达成`}
              />
            </View>
            <View style={styles.goalSpacing}>
              <GoalProgressBar
                title="本月"
                currentMs={stats?.monthMs ?? 0}
                goalMinutes={subject.weeklyGoalMinutes * 4}
                accent={subject.accent}
                caption="按 4 周折算"
              />
            </View>
          </Card>

          <Card style={styles.card}>
            <SectionHeader title="里程碑" caption="累计时长解锁" />
            <MilestoneBadges totalMs={stats?.totalMs ?? 0} />
          </Card>

          <Card style={styles.card}>
            <SectionHeader title="学习记录" caption={`最近 ${sessions.length} 条`} />
            <SessionTimeline sessions={sessions} now={now} />
          </Card>

          <Text style={styles.footnote}>
            记录按「开始学习 → 结束学习」的时间戳差值入库；暂停时长已从总时长中扣除。
            {sessions[0] ? ` 最近一次：${formatFullDay(sessions[0].startedAt)}` : ''}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(4),
  },
  missingText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  content: {
    gap: space(5),
  },
  backButton: {
    position: 'absolute',
    left: space(4),
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(colors.bg, 0.72),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha(colors.text, 0.25),
  },
  backButtonPressed: {
    backgroundColor: colors.steel,
  },
  heroText: {
    position: 'absolute',
    left: space(4),
    right: space(4),
    bottom: space(4),
    gap: 2,
  },
  heroSubtitle: {
    color: colors.textMuted,
    fontSize: 11.5,
    letterSpacing: 0.6,
  },
  heroTitle: {
    color: colors.textBright,
    fontSize: 27,
    fontWeight: font.bold,
    letterSpacing: 0.5,
  },
  heroPlaytime: {
    color: colors.text,
    fontSize: 14,
    fontWeight: font.medium,
    marginTop: space(1),
  },
  heroSecondary: {
    color: colors.textMuted,
    fontSize: 11.5,
  },
  body: {
    gap: space(4),
  },
  actionRow: {
    flexDirection: 'row',
    gap: space(3),
  },
  actionPrimary: {
    flex: 1,
  },
  chartCard: {
    gap: space(4),
  },
  chartSummary: {
    gap: 2,
  },
  chartSummaryValue: {
    color: colors.textBright,
    fontSize: 24,
    fontWeight: font.bold,
    fontVariant: ['tabular-nums'],
  },
  chartSummaryHint: {
    color: colors.textMuted,
    fontSize: 11.5,
  },
  card: {
    gap: space(1),
  },
  goalSpacing: {
    marginTop: space(4),
  },
  footnote: {
    color: colors.textDim,
    fontSize: 11,
    lineHeight: 17,
  },
});
