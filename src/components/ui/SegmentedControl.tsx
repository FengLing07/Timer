import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, font, radius, space } from '@/theme/theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View style={styles.track}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && styles.segmentSelected,
              pressed && !selected && styles.segmentPressed,
            ]}
          >
            <Text style={[styles.label, selected && styles.labelSelected]} numberOfLines={1}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: 2,
    gap: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: space(2),
    paddingHorizontal: space(2),
    borderRadius: radius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: colors.steel,
  },
  segmentPressed: {
    backgroundColor: colors.surfaceAlt,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12.5,
    fontWeight: font.medium,
  },
  labelSelected: {
    color: colors.textBright,
    fontWeight: font.semibold,
  },
});
