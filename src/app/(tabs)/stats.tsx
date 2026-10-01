import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BarChartView } from '@/components/charts/BarChartView';
import { GoalProgressBar } from '@/components/GoalProgressBar';
import { MilestoneBadges } from '@/components/MilestoneBadges';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useNow } from '@/hooks/useElapsedMs';
import {
  buildDailySeries,
  buildMonthlySeries,
  buildWeeklySeries,
  seriesPeak,
  seriesTotal,
} from '@/services/statsService';
import { milestoneHeadline, nextMilestone } from '@/services/milestones';
import { useLibraryStore } from '@/store/useLibraryStore';
import { colors, font, radius, space } from '@/theme/theme';
import { formatHours } from '@/utils/format';

type Granularity = 'day' | 'week' | 'month';

const GRANULARITY_OPTIONS: { value: Granularity; label: string }[] = [
  { value: 'day', label: '每日' },
  { value: 'week', label: '每周' },
  { value: 'month', label: '每月' },
];

const WINDOWS: Record<Granularity, number> = { day: 14, week: 8, month: 12 };

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [granularity, setGranularity] = useState<Granularity>('day');
  const now = useNow(60_000);

  const dailyAll = useLibraryStore((state) => state.dailyAll);
  const totals = useLibraryStore((state) => state.totals);
  const subjects = useLibraryStore((state) => state.subjects);
  const statsBySubject = useLibraryStore((state) => state.statsBySubject);

  const horizontalPadding = space(4);
  const cardInnerWidth = width - horizontalPadding * 2 - space(4) * 2;

  const points = useMemo(() => {
    if (granularity === 'week') return buildWeeklySeries(dailyAll, WINDOWS.week, now);
    if (granularity === 'month') return buildMonthlySeries(dailyAll, WINDOWS.month, now);
    return buildDailySeries(dailyAll, WINDOWS.day, now);
  }, [dailyAll, granularity, now]);

  const rangeTotal = seriesTotal(points);
  const rangePeak = seriesPeak(points);
  const rangeDays = granularity === 'day' ? WINDOWS.day : granularity === 'week' ? WINDOWS.week * 7 : WINDOWS.month * 30;
  const rangeAverage = rangeTotal / Math.max(1, rangeDays);

  const upcoming = nextMilestone(totals.totalMs);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + space(3),
          paddingHorizontal: horizontalPadding,
          paddingBottom: space(24),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>数据统计</Text>
        <Text style={styles.subtitle}>累计 {formatHours(totals.totalMs)} 小时</Text>
      </View>

      <View style={styles.tileRow}>
        <StatTile label="今日" ms={totals.todayMs} accent={colors.play} />
        <StatTile label="本周" ms={totals.weekMs} accent={colors.accent} />
        <StatTile label="本月" ms={totals.monthMs} accent={colors.steelLight} />
        <StatTile label="累计" ms={totals.totalMs} accent={colors.gold} />
      </View>

      <Card style={styles.chartCard}>
        <SegmentedControl
          options={GRANULARITY_OPTIONS}
          value={granularity}
          onChange={setGranularity}
        />

        <View style={styles.chartSummary}>
          <Text style={styles.chartSummaryValue}>{formatHours(rangeTotal)} 小时</Text>
          <Text style={styles.chartSummaryHint}>
            日均 {formatHours(rangeAverage)} · 单日最高 {formatHours(rangePeak)}
          </Text>
        </View>

        <BarChartView points={points} containerWidth={cardInnerWidth} accent={colors.accent} />
      </Card>

      <View style={styles.section}>
        <SectionHeader title="各科目标进度" caption="每周目标" />
        <Card style={styles.goalCard}>
          {subjects.map((subject, index) => (
            <View
              key={subject.id}
              style={index > 0 ? styles.goalItemSpaced : undefined}
            >
              <GoalProgressBar
                title={subject.name}
                currentMs={statsBySubject[subject.id]?.weekMs ?? 0}
                goalMinutes={subject.weeklyGoalMinutes}
                accent={subject.accent}
                caption={`累计 ${formatHours(statsBySubject[subject.id]?.totalMs ?? 0)} 小时`}
              />
            </View>
          ))}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="里程碑" caption={milestoneHeadline(totals.totalMs)} />
        <Card style={styles.milestoneCard}>
          <MilestoneBadges totalMs={totals.totalMs} />
          {upcoming ? (
            <View style={styles.milestoneFooter}>
              <Text style={styles.milestoneFooterText}>
                下一个：{upcoming.title} · {upcoming.description}
              </Text>
            </View>
          ) : null}
        </Card>
      </View>

      <Text style={styles.footnote}>
        所有数据都来自本机 SQLite，累计时长 = 每次「结束学习」时记录的时间戳差值之和。
      </Text>
    </ScrollView>
  );
}

interface StatTileProps {
  label: string;
  ms: number;
  accent: string;
}

function StatTile({ label, ms, accent }: StatTileProps) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.tileValue, { color: accent }]}>{formatHours(ms)}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    gap: space(5),
  },
  header: {
    gap: 2,
  },
  title: {
    color: colors.textBright,
    fontSize: 23,
    fontWeight: font.bold,
  },
  subtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  tileRow: {
    flexDirection: 'row',
    gap: space(3),
  },
  tile: {
    flex: 1,
    paddingVertical: space(3),
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: 'center',
    gap: 2,
  },
  tileValue: {
    fontSize: 17,
    fontWeight: font.bold,
    fontVariant: ['tabular-nums'],
  },
  tileLabel: {
    color: colors.textMuted,
    fontSize: 11,
  },
  chartCard: {
    gap: space(4),
  },
  chartSummary: {
    gap: 2,
  },
  chartSummaryValue: {
    color: colors.textBright,
    fontSize: 22,
    fontWeight: font.bold,
    fontVariant: ['tabular-nums'],
  },
  chartSummaryHint: {
    color: colors.textMuted,
    fontSize: 11.5,
  },
  section: {
    gap: space(1),
  },
  goalCard: {
    gap: space(1),
  },
  goalItemSpaced: {
    marginTop: space(4),
    paddingTop: space(4),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  milestoneCard: {
    gap: space(4),
  },
  milestoneFooter: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
    paddingTop: space(3),
  },
  milestoneFooterText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  footnote: {
    color: colors.textDim,
    fontSize: 11,
    lineHeight: 17,
  },
});
