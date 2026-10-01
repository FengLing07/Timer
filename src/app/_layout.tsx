import { Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import {
  useAppLifecycle,
  useKeepAwakeWhileActive,
  useTimerNotificationHeartbeat,
} from '@/hooks/useAppLifecycle';
import { useTimerNotificationResponse } from '@/hooks/useTimerNotificationResponse';
import { configureForegroundNotificationHandler } from '@/services/notifications';
import { useLibraryStore, useSubject } from '@/store/useLibraryStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTimerStore } from '@/store/useTimerStore';
import { colors, font, navigationTheme, space } from '@/theme/theme';

export default function RootLayout() {
  const [bootstrapped, setBootstrapped] = useState(false);
  const timer = useTimerStore((state) => state.timer);
  const subject = useSubject(timer?.subjectId ?? null);
  const keepScreenOn = useSettingsStore((state) => state.keepScreenOn);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // 前台通知行为要在任何通知到达之前设定好
      await configureForegroundNotificationHandler();
      // 先把计时状态恢复出来（可能是被杀之前正在跑的会话），再加载统计数据
      await useTimerStore.getState().hydrate();
      await useLibraryStore.getState().load();
      if (!cancelled) setBootstrapped(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useAppLifecycle();
  useTimerNotificationResponse();
  useTimerNotificationHeartbeat(timer, subject?.name ?? null);
  useKeepAwakeWhileActive(timer?.phase === 'running', keepScreenOn);

  if (!bootstrapped) {
    return (
      <View style={styles.boot}>
        <Text style={styles.bootTitle}>考研学习库</Text>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.bootHint}>正在读取本地学习记录…</Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <ThemeProvider value={navigationTheme}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="subject/[subjectId]" />
          <Stack.Screen
            name="timer/[subjectId]"
            options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
          />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(4),
    backgroundColor: colors.bg,
    padding: space(6),
  },
  bootTitle: {
    color: colors.textBright,
    fontSize: 20,
    fontWeight: font.bold,
    letterSpacing: 1,
  },
  bootHint: {
    color: colors.textDim,
    fontSize: 12,
  },
});
