import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SubjectCover } from '@/components/SubjectCover';
import { TimerClockFace } from '@/components/TimerClockFace';
import { ActionButton } from '@/components/ui/ActionButton';
import { Card } from '@/components/ui/Card';
import { Icon } from '@/components/ui/Icon';
import { useElapsedMs } from '@/hooks/useElapsedMs';
import { useLibraryStore, useSubject } from '@/store/useLibraryStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTimerStore } from '@/store/useTimerStore';
import { colors, font, radius, space, withAlpha } from '@/theme/theme';
import { formatTimeOfDay } from '@/utils/date';
import { formatCompact, formatHours } from '@/utils/format';

export default function TimerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const params = useLocalSearchParams<{ subjectId?: string }>();
  const subjectId = params.subjectId ?? null;

  const subject = useSubject(subjectId);
  const timer = useTimerStore((state) => state.timer);
  const start = useTimerStore((state) => state.start);
  const pause = useTimerStore((state) => state.pause);
  const resume = useTimerStore((state) => state.resume);
  const finish = useTimerStore((state) => state.finish);
  const restart = useTimerStore((state) => state.restart);
  const error = useTimerStore((state) => state.error);
  const hapticsEnabled = useSettingsStore((state) => state.haptics);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isThisSubject = timer !== null && timer.subjectId === subjectId;
  const elapsed = useElapsedMs(isThisSubject ? timer : null);

  const otherSubject = useSubject(
    timer && !isThisSubject ? timer.subjectId : null
  );

  const buzz = (style: Haptics.ImpactFeedbackStyle = Haptics.ImpactFeedbackStyle.Light) => {
    if (!hapticsEnabled) return;
    void Haptics.impactAsync(style).catch(() => undefined);
  };

  const handleStart = async () => {
    if (!subjectId) return;
    setBusy(true);
    setFeedback(null);
    const outcome = await start(subjectId);
    setBusy(false);
    buzz(Haptics.ImpactFeedbackStyle.Medium);
    if (outcome?.autoFinished?.ok && !outcome.autoFinished.discarded) {
      setFeedback(
        `已自动保存上一段（${otherSubject?.name ?? '其他科目'} ${formatHours(
          outcome.autoFinished.durationMs
        )} 小时）`
      );
      await useLibraryStore.getState().load({ silent: true });
    }
  };

  const handlePauseToggle = async () => {
    if (!timer) return;
    buzz();
    if (timer.phase === 'running') {
      await pause();
    } else {
      await resume();
    }
  };

  const handleFinish = async () => {
    setBusy(true);
    const outcome = await finish();
    setBusy(false);
    buzz(Haptics.ImpactFeedbackStyle.Heavy);
    await useLibraryStore.getState().load({ silent: true });

    if (!outcome || !outcome.ok) {
      setFeedback('保存失败，学习时长仍保留在计时状态里，可以再点一次结束。');
      return;
    }
    if (outcome.discarded) {
      setFeedback(
        `本次仅 ${formatCompact(outcome.durationMs)}，低于设置的最短计入时长，未写入记录。`
      );
      return;
    }
    setFeedback(
      `已保存：${subject?.name ?? '学习'} ${formatHours(outcome.durationMs)} 小时`
    );
  };

  const handleRestart = async () => {
    if (!subjectId) return;
    setBusy(true);
    const outcome = await restart(subjectId);
    setBusy(false);
    buzz(Haptics.ImpactFeedbackStyle.Medium);
    await useLibraryStore.getState().load({ silent: true });
    setFeedback(
      outcome?.autoFinished?.ok && !outcome.autoFinished.discarded
        ? '已保存上一段并重新开始计时'
        : '已重新开始计时'
    );
  };

  const accent = subject?.accent ?? colors.accent;

  return (
    <View style={styles.screen}>
      {/* 背景用科目封面铺满上半屏，再渐变到底色 */}
      <View style={[styles.backdrop, { height: Math.round(height * 0.62) }]}>
        {subject ? (
          <SubjectCover
            subject={subject}
            width={width}
            height={Math.round(height * 0.62)}
            borderRadius={0}
            monogramSize={Math.round(width * 0.42)}
          />
        ) : (
          <View style={{ flex: 1, backgroundColor: colors.surface }} />
        )}
        <LinearGradient
          colors={[withAlpha(colors.bg, 0.55), withAlpha(colors.bg, 0.9), colors.bg]}
          locations={[0, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + space(2),
            paddingBottom: insets.bottom + space(8),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="关闭计时页"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.closeButton, pressed && styles.closeButtonPressed]}
            hitSlop={8}
          >
            <Icon name="arrowLeft" size={18} color={colors.textBright} />
          </Pressable>

          <View style={styles.topTitleBlock}>
            <Text style={styles.topTitle} numberOfLines={1}>
              {subject?.name ?? '学习'}
            </Text>
            <Text style={styles.topSubtitle}>{subject?.subtitle ?? ''}</Text>
          </View>

          <View style={styles.closeButtonPlaceholder} />
        </View>

        <View style={styles.clockArea}>
          {isThisSubject && timer ? (
            <TimerClockFace timer={timer} elapsedMs={elapsed} accent={accent} />
          ) : (
            <View style={styles.idleBlock}>
              <Text style={styles.idleTitle}>准备开始</Text>
              <Text style={styles.idleHint}>
                点击下方按钮记录开始时间戳，结束时时长由两个时间戳的差值算出。
              </Text>
            </View>
          )}
        </View>

        {feedback ? (
          <View style={styles.feedback}>
            <Icon name="check" size={14} color={colors.play} />
            <Text style={styles.feedbackText}>{feedback}</Text>
          </View>
        ) : null}

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {otherSubject && timer ? (
          <Card style={styles.noticeCard}>
            <Text style={styles.noticeTitle}>
              「{otherSubject.name}」正在计时
            </Text>
            <Text style={styles.noticeHint}>
              同一时间只保留一段计时。开始本科目时，上一段会自动结算入库。
            </Text>
          </Card>
        ) : null}

        <View style={styles.controls}>
          {isThisSubject && timer ? (
            <>
              <ActionButton
                label={timer.phase === 'running' ? '暂停' : '继续'}
                icon={timer.phase === 'running' ? 'pause' : 'play'}
                tone="ghost"
                onPress={() => void handlePauseToggle()}
                disabled={busy}
                style={styles.controlButton}
              />
              <ActionButton
                label="结束学习"
                icon="stop"
                tone="play"
                onPress={() => void handleFinish()}
                disabled={busy}
                style={styles.controlButton}
              />
            </>
          ) : (
            <ActionButton
              label={busy ? '处理中…' : '开始学习'}
              icon="play"
              tone="play"
              onPress={() => void handleStart()}
              disabled={busy || !subjectId}
              style={styles.controlButton}
            />
          )}
        </View>

        {isThisSubject && timer ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => void handleRestart()}
            disabled={busy}
            style={({ pressed }) => [styles.restartButton, pressed && styles.restartButtonPressed]}
          >
            <Icon name="restart" size={14} color={colors.textMuted} />
            <Text style={styles.restartText}>结束当前这段并重新开始</Text>
          </Pressable>
        ) : null}

        <View style={styles.hintBlock}>
          <Text style={styles.hintTitle}>计时说明</Text>
          <Text style={styles.hintText}>
            开始时刻只落一个时间戳；页面上的秒表是对 `当前时间 − 开始时间` 的渲染结果，
            不存在每秒累加的计数器，因此退出 App 或重启手机都不会让时长跑偏。
          </Text>
          <Text style={styles.hintText}>
            {timer && isThisSubject
              ? `当前会话 ${formatTimeOfDay(timer.startedAt)} 开始 · ${
                  timer.phase === 'running' ? '正在计时' : '处于暂停'
                }`
              : '当前没有进行中的计时。'}
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
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: space(4),
    gap: space(5),
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
  },
  topTitleBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  topTitle: {
    color: colors.textBright,
    fontSize: 15,
    fontWeight: font.semibold,
  },
  topSubtitle: {
    color: colors.textMuted,
    fontSize: 10.5,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: withAlpha(colors.bg, 0.66),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha(colors.text, 0.25),
  },
  closeButtonPlaceholder: {
    width: 36,
    height: 36,
  },
  closeButtonPressed: {
    backgroundColor: colors.steel,
  },
  clockArea: {
    paddingVertical: space(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleBlock: {
    alignItems: 'center',
    gap: space(3),
    paddingHorizontal: space(6),
  },
  idleTitle: {
    color: colors.textBright,
    fontSize: 26,
    fontWeight: font.bold,
  },
  idleHint: {
    color: colors.textMuted,
    fontSize: 12.5,
    textAlign: 'center',
    lineHeight: 19,
  },
  feedback: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2),
    padding: space(3),
    borderRadius: radius.sm,
    backgroundColor: withAlpha(colors.play, 0.12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha(colors.play, 0.4),
  },
  feedbackText: {
    flex: 1,
    color: colors.text,
    fontSize: 12.5,
  },
  errorBox: {
    padding: space(3),
    borderRadius: radius.sm,
    backgroundColor: withAlpha(colors.danger, 0.12),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha(colors.danger, 0.45),
  },
  errorText: {
    color: colors.text,
    fontSize: 12.5,
  },
  noticeCard: {
    gap: space(2),
  },
  noticeTitle: {
    color: colors.gold,
    fontSize: 13.5,
    fontWeight: font.semibold,
  },
  noticeHint: {
    color: colors.textMuted,
    fontSize: 11.5,
    lineHeight: 17,
  },
  controls: {
    flexDirection: 'row',
    gap: space(3),
    marginTop: 'auto',
  },
  controlButton: {
    flex: 1,
  },
  restartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(2),
    paddingVertical: space(2),
  },
  restartButtonPressed: {
    opacity: 0.7,
  },
  restartText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  hintBlock: {
    gap: space(2),
    paddingTop: space(4),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.divider,
  },
  hintTitle: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: font.semibold,
  },
  hintText: {
    color: colors.textDim,
    fontSize: 11,
    lineHeight: 17,
  },
});
