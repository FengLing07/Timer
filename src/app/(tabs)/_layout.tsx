import { Tabs } from 'expo-router/js-tabs';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActiveTimerBar } from '@/components/ActiveTimerBar';
import { Icon } from '@/components/ui/Icon';
import { colors, font, space } from '@/theme/theme';

/** Tab 栏本体高度（不含安全区），ActiveTimerBar 靠它来定位 */
const TAB_BAR_HEIGHT = 56;

export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = TAB_BAR_HEIGHT + insets.bottom;

  return (
    <View style={styles.container}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textDim,
          tabBarStyle: {
            height: tabBarHeight,
            paddingBottom: insets.bottom,
            paddingTop: space(2),
            backgroundColor: colors.bgLibrary,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.divider,
          },
          tabBarLabelStyle: {
            fontSize: 11,
            fontWeight: font.medium,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: '科目库',
            tabBarIcon: ({ color }) => <Icon name="library" size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="stats"
          options={{
            title: '数据统计',
            tabBarIcon: ({ color }) => <Icon name="stats" size={20} color={color} />,
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: '设置',
            tabBarIcon: ({ color }) => <Icon name="settings" size={20} color={color} />,
          }}
        />
      </Tabs>

      <ActiveTimerBar bottom={tabBarHeight + space(2)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
