import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/Icon';
import { Card } from '@/components/ui/Card';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { isTimerBackgroundTaskRegistered } from '@/services/backgroundTasks';
import {
  getNotificationPermissionLabel,
  isNotificationRuntimeAvailable,
  notificationUnavailableHint,
  requestNotificationPermission,
} from '@/services/notifications';
import { useLibraryStore } from '@/store/useLibraryStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { colors, font, radius, space, withAlpha } from '@/theme/theme';
import { formatHours } from '@/utils/format';

const MAX_SEGMENT_CHOICES = [2, 4, 8, 12];
const MIN_SESSION_CHOICES = [30, 60, 120, 300];
const GOAL_STEP_MINUTES = 30;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const settings = useSettingsStore();
  const subjects = useLibraryStore((state) => state.subjects);
  const setWeeklyGoal = useLibraryStore((state) => state.setWeeklyGoal);
  const resetAllSessions = useLibraryStore((state) => state.resetAllSessions);
  const totals = useLibraryStore((state) => state.totals);

  const [permissionLabel, setPermissionLabel] = useState('检查中…');
  const [backgroundTaskReady, setBackgroundTaskReady] = useState<boolean | null>(null);
  const [diagnosticsToken, setDiagnosticsToken] = useState(0);

  // Expo Go 的 Android 上根本上不了 expo-notifications，这里直接把原因讲清楚
  const notificationsAvailable = isNotificationRuntimeAvailable();
  const unavailableHint = notificationUnavailableHint();

  // 诊断信息是外部状态，只在 Promise 回调里写 state
  useEffect(() => {
    let cancelled = false;
    Promise.all([getNotificationPermissionLabel(), isTimerBackgroundTaskRegistered()])
      .then(([label, taskReady]) => {
        if (cancelled) return;
        setPermissionLabel(label);
        setBackgroundTaskReady(taskReady);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [diagnosticsToken]);

  const confirmReset = () => {
    Alert.alert('清空全部学习记录？', '所有科目累计时长、进度与里程碑都会归零，且无法恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '清空',
        style: 'destructive',
        onPress: () => void resetAllSessions(),
      },
    ]);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + space(3),
          paddingHorizontal: space(4),
          paddingBottom: space(24),
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>设置</Text>
        <Text style={styles.subtitle}>全部数据保存在本机，无服务器、可离线</Text>
      </View>

      <View style={styles.section}>
        <SectionHeader title="计时与通知" />
        <Card style={styles.card}>
          {unavailableHint ? (
            <View style={styles.warningBox}>
              <Icon name="bell" size={15} color={colors.gold} />
              <Text style={styles.warningText}>{unavailableHint}</Text>
            </View>
          ) : null}
          <SwitchRow
            label="常驻通知"
            hint={
              notificationsAvailable
                ? '计时期间在通知栏常驻显示科目与时长，并带「暂停 / 结束」按钮'
                : '当前环境不可用，计时功能本身不受影响'
            }
            value={settings.persistentTimerNotification}
            disabled={!notificationsAvailable}
            onChange={(value) => settings.update('persistentTimerNotification', value)}
          />
          <Divider />
          <SwitchRow
            label="计时中保持屏幕常亮"
            hint="仅在计时进行时生效"
            value={settings.keepScreenOn}
            onChange={(value) => settings.update('keepScreenOn', value)}
          />
          <Divider />
          <SwitchRow
            label="操作反馈震动"
            value={settings.haptics}
            onChange={(value) => settings.update('haptics', value)}
          />
          <Divider />
          <View style={styles.diagnosticRow}>
            <Text style={styles.diagnosticLabel}>通知权限</Text>
            <Text style={styles.diagnosticValue}>{permissionLabel}</Text>
          </View>
          <View style={styles.diagnosticRow}>
            <Text style={styles.diagnosticLabel}>后台任务（Android 通知按钮）</Text>
            <Text style={styles.diagnosticValue}>
              {backgroundTaskReady === null
                ? '检查中…'
                : backgroundTaskReady
                  ? '已注册'
                  : '未注册'}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void requestNotificationPermission().then(() =>
                setDiagnosticsToken((token) => token + 1)
              );
            }}
            style={({ pressed }) => [styles.inlineButton, pressed && styles.inlineButtonPressed]}
          >
            <Icon name="bell" size={15} color={colors.accent} />
            <Text style={styles.inlineButtonText}>请求通知权限 / 重新检测</Text>
          </Pressable>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="记录规则" caption="防止忘关计时产生假数据" />
        <Card style={styles.card}>
          <ChoiceRow
            label="单段最长计入"
            hint="App 被杀后重新打开时，超过这个长度的一段按上限结算"
            options={MAX_SEGMENT_CHOICES.map((hours) => ({ label: `${hours} 小时`, value: hours }))}
            value={settings.maxSegmentHours}
            onChange={(value) => settings.update('maxSegmentHours', value)}
          />
          <Divider />
          <ChoiceRow
            label="最短计入时长"
            hint="短于这个时长的记录会被丢弃"
            options={MIN_SESSION_CHOICES.map((seconds) => ({
              label: seconds < 60 ? `${seconds} 秒` : `${seconds / 60} 分钟`,
              value: seconds,
            }))}
            value={settings.minSessionSeconds}
            onChange={(value) => settings.update('minSessionSeconds', value)}
          />
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="每周目标" caption="决定成就进度条" />
        <Card style={styles.card}>
          {subjects.map((subject, index) => (
            <View key={subject.id}>
              {index > 0 ? <Divider /> : null}
              <View style={styles.goalRow}>
                <View style={styles.goalInfo}>
                  <Text style={styles.goalName}>{subject.name}</Text>
                  <Text style={styles.goalValue}>
                    {formatHours(subject.weeklyGoalMinutes * 60_000)} 小时 / 周
                  </Text>
                </View>
                <View style={styles.stepper}>
                  <StepperButton
                    icon="minus"
                    onPress={() =>
                      void setWeeklyGoal(
                        subject.id,
                        Math.max(GOAL_STEP_MINUTES, subject.weeklyGoalMinutes - GOAL_STEP_MINUTES)
                      )
                    }
                  />
                  <StepperButton
                    icon="plus"
                    onPress={() =>
                      void setWeeklyGoal(subject.id, subject.weeklyGoalMinutes + GOAL_STEP_MINUTES)
                    }
                  />
                </View>
              </View>
            </View>
          ))}
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="计时原理" />
        <Card style={styles.card}>
          <Text style={styles.paragraph}>
            点击「开始学习」时只记录一个 startTimestamp，点击「结束学习」时记录 endTimestamp，
            本次时长 = endTimestamp − startTimestamp。暂停会把当前分段结算进累计值，
            继续时再开一个新分段。
          </Text>
          <Text style={styles.paragraph}>
            屏幕上跳动的秒数只是对上面这个差值做渲染，不存在任何“每秒 +1”的计数器。
            所以 App 被系统杀掉、切到后台、甚至重启手机，重新打开后时长依然准确。
          </Text>
          <Text style={styles.paragraph}>
            完成的记录写入 SQLite（结构化查询与聚合），设置项写入 AsyncStorage。
          </Text>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeader title="数据" caption={`累计 ${formatHours(totals.totalMs)} 小时`} />
        <Card style={styles.card}>
          <Pressable
            accessibilityRole="button"
            onPress={confirmReset}
            style={({ pressed }) => [styles.dangerButton, pressed && styles.dangerButtonPressed]}
          >
            <Icon name="trash" size={15} color={colors.danger} />
            <Text style={styles.dangerButtonText}>清空全部学习记录</Text>
          </Pressable>
        </Card>
      </View>
    </ScrollView>
  );
}

interface SwitchRowProps {
  label: string;
  hint?: string;
  value: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}

function SwitchRow({ label, hint, value, disabled = false, onChange }: SwitchRowProps) {
  return (
    <View style={[styles.row, disabled && styles.rowDisabled]}>
      <View style={styles.rowInfo}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        trackColor={{ false: colors.steel, true: colors.playDeep }}
        thumbColor={value ? colors.play : colors.textDim}
        ios_backgroundColor={colors.steel}
      />
    </View>
  );
}

interface ChoiceRowProps<T extends number> {
  label: string;
  hint?: string;
  options: { label: string; value: T }[];
  value: T;
  onChange: (value: T) => void;
}

function ChoiceRow<T extends number>({ label, hint, options, value, onChange }: ChoiceRowProps<T>) {
  return (
    <View style={styles.choiceBlock}>
      <Text style={styles.rowLabel}>{label}</Text>
      {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      <View style={styles.choiceRow}>
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              onPress={() => onChange(option.value)}
              style={({ pressed }) => [
                styles.choice,
                selected && styles.choiceSelected,
                pressed && styles.choicePressed,
              ]}
            >
              <Text style={[styles.choiceText, selected && styles.choiceTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function StepperButton({
  icon,
  onPress,
}: {
  icon: 'plus' | 'minus';
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={icon === 'plus' ? '增加目标' : '减少目标'}
      onPress={onPress}
      style={({ pressed }) => [styles.stepperButton, pressed && styles.stepperButtonPressed]}
      hitSlop={6}
    >
      <Icon name={icon} size={14} color={colors.text} />
    </Pressable>
  );
}

function Divider() {
  return <View style={styles.divider} />;
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
  section: {
    gap: space(1),
  },
  card: {
    gap: space(3),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space(3),
  },
  rowInfo: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: font.medium,
  },
  rowHint: {
    color: colors.textDim,
    fontSize: 11,
    lineHeight: 16,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.divider,
  },
  rowDisabled: {
    opacity: 0.55,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space(2),
    padding: space(3),
    borderRadius: radius.sm,
    backgroundColor: withAlpha(colors.gold, 0.1),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: withAlpha(colors.gold, 0.4),
  },
  warningText: {
    flex: 1,
    color: colors.text,
    fontSize: 11.5,
    lineHeight: 17,
  },
  diagnosticRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: space(3),
  },
  diagnosticLabel: {
    flexShrink: 1,
    color: colors.textMuted,
    fontSize: 12,
  },
  diagnosticValue: {
    flexShrink: 0,
    color: colors.text,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
  },
  inlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(2),
    paddingVertical: space(2) + 2,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  inlineButtonPressed: {
    backgroundColor: colors.steel,
  },
  inlineButtonText: {
    color: colors.text,
    fontSize: 12.5,
    fontWeight: font.medium,
  },
  choiceBlock: {
    gap: space(2),
  },
  choiceRow: {
    flexDirection: 'row',
    gap: space(2),
  },
  choice: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space(2) + 1,
    borderRadius: radius.sm,
    backgroundColor: colors.bg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  choiceSelected: {
    backgroundColor: colors.steel,
    borderColor: colors.accent,
  },
  choicePressed: {
    opacity: 0.8,
  },
  choiceText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: font.medium,
  },
  choiceTextSelected: {
    color: colors.textBright,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space(3),
    paddingVertical: space(1),
  },
  goalInfo: {
    flex: 1,
    gap: 2,
  },
  goalName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: font.medium,
  },
  goalValue: {
    color: colors.textDim,
    fontSize: 11.5,
  },
  stepper: {
    flexDirection: 'row',
    gap: space(2),
  },
  stepperButton: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  stepperButtonPressed: {
    backgroundColor: colors.steel,
  },
  paragraph: {
    color: colors.textMuted,
    fontSize: 12,
    lineHeight: 19,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(2),
    paddingVertical: space(3),
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.danger,
  },
  dangerButtonPressed: {
    backgroundColor: withAlpha(colors.danger, 0.12),
  },
  dangerButtonText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: font.semibold,
  },
});
