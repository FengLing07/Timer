import { Pressable, StyleSheet, Text, type ViewStyle } from 'react-native';

import { Icon, type IconName } from '@/components/ui/Icon';
import { colors, font, radius, space } from '@/theme/theme';

export type ActionButtonTone = 'play' | 'accent' | 'ghost' | 'danger';

export interface ActionButtonProps {
  label: string;
  icon?: IconName;
  onPress: () => void;
  tone?: ActionButtonTone;
  disabled?: boolean;
  compact?: boolean;
  style?: ViewStyle | ViewStyle[];
}

const TONES: Record<ActionButtonTone, { bg: string; text: string; border: string }> = {
  play: { bg: colors.play, text: colors.onPlay, border: colors.play },
  accent: { bg: colors.accentDeep, text: colors.onAccent, border: colors.accentDeep },
  ghost: { bg: colors.surfaceAlt, text: colors.text, border: colors.border },
  danger: { bg: 'transparent', text: colors.danger, border: colors.danger },
};

export function ActionButton({
  label,
  icon,
  onPress,
  tone = 'accent',
  disabled = false,
  compact = false,
  style,
}: ActionButtonProps) {
  const palette = TONES[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        { backgroundColor: palette.bg, borderColor: palette.border },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {icon ? <Icon name={icon} size={compact ? 15 : 18} color={palette.text} /> : null}
      <Text style={[styles.label, compact && styles.labelCompact, { color: palette.text }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space(2),
    paddingVertical: space(3),
    paddingHorizontal: space(4),
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonCompact: {
    paddingVertical: space(2),
    paddingHorizontal: space(3),
  },
  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontSize: 14.5,
    fontWeight: font.semibold,
  },
  labelCompact: {
    fontSize: 13,
  },
});
