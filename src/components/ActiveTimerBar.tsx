import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon } from '@/components/ui/Icon';
import { useElapsedMs } from '@/hooks/useElapsedMs';
import { useSubject } from '@/store/useLibraryStore';
import { useTimerStore } from '@/store/useTimerStore';
import { colors, font, radius, space, withAlpha } from '@/theme/theme';
import { formatClock } from '@/utils/format';

export interface ActiveTimerBarProps {
  /** 距离屏幕底部的偏移（需要避开 Tab 栏） */
  bottom: number;
}

const CLOCK_FONT_SIZE = 15;
/** `00:00:00` 的最短宽度（8 个字符） */
const CLOCK_MIN_CHARS = 8;
/**
 * 等宽字体的字符宽度：
 * Android 的 monospace / iOS 的 Menlo 单字前进宽度都是 0.60em 左右，
 * 这里按 0.72em 预留余量，保证盒子永远比实际渲染宽，不会被裁掉最后一位。
 */
const CLOCK_CHAR_WIDTH = Math.ceil(CLOCK_FONT_SIZE * 0.72);

/**
 * 浮动在 Tab 栏上方的「进行中」条。
 * 任何页面都能一眼看到正在计时的科目与实时时长，点一下回到计时页。
 */
export function ActiveTimerBar({ bottom }: ActiveTimerBarProps) {
  const router = useRouter();
  const timer = useTimerStore((state) => state.timer);
  const pause = useTimerStore((state) => state.pause);
  const resume = useTimerStore((state) => state.resume);
  const subject = useSubject(timer?.subjectId ?? null);
  const elapsed = useElapsedMs(timer);

  const clockText = timer ? formatClock(elapsed) : '';
  const clockWidth = useMemo(
    () => Math.max(CLOCK_MIN_CHARS, clockText.length) * CLOCK_CHAR_WIDTH,
    [clockText.length]
  );

  if (!timer) return null;
  const running = timer.phase === 'running';

  return (
    <View style={[styles.wrapper, { bottom }]} pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${subject?.name ?? '学习'} 计时中，点击回到计时页`}
        onPress={() => router.push(`/timer/${timer.subjectId}`)}
        style={({ pressed }) => [styles.bar, pressed && styles.barPressed]}
      >
        <View style={[styles.pulse, { backgroundColor: running ? colors.play : colors.gold }]} />

        <View style={styles.textBlock}>
          <Text style={styles.name} numberOfLines={1}>
            {subject?.name ?? '学习'}
          </Text>
          <Text style={styles.sub}>{running ? '计时中' : '已暂停'}</Text>
        </View>

        {/*
          给秒表一个「按字符数算出来」的固定宽度，并禁止被压缩。
          这样即使测量值和渲染值有出入，也只会多出一点留白，不会把最后一位数字裁掉。
        */}
        <Text
          allowFontScaling={false}
          numberOfLines={1}
          style={[styles.clock, { width: clockWidth }]}
        >
          {clockText}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={running ? '暂停' : '继续'}
          onPress={(event) => {
            event.stopPropagation();
            void (running ? pause() : resume());
          }}
          style={styles.control}
          hitSlop={8}
        >
          <Icon name={running ? 'pause' : 'play'} size={14} color={colors.textBright} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: space(3),
    right: space(3),
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(2) + 2,
    paddingVertical: space(2) + 2,
    paddingHorizontal: space(3),
    borderRadius: radius.pill,
    backgroundColor: withAlpha(colors.surface, 0.97),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.steelLight,
    shadowColor: colors.black,
    shadowOpacity: 0.5,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  barPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  pulse: {
    width: 8,
    height: 8,
    borderRadius: radius.pill,
  },
  textBlock: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
  name: {
    color: colors.textBright,
    fontSize: 13.5,
    fontWeight: font.semibold,
  },
  sub: {
    color: colors.textDim,
    fontSize: 10.5,
  },
  clock: {
    color: colors.text,
    fontSize: CLOCK_FONT_SIZE,
    // 刻意不设 fontVariant：等宽字体的数字本来就是等宽的，
    // 而带 font feature 时 Android 的测量宽度可能小于渲染宽度，会裁掉最后一位。
    fontFamily: font.mono,
    textAlign: 'right',
    flexShrink: 0,
  },
  control: {
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.steel,
  },
});
