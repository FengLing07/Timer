import { StyleSheet, Text, View } from 'react-native';

import { colors, font, space } from '@/theme/theme';

export interface SectionHeaderProps {
  title: string;
  caption?: string;
}

export function SectionHeader({ title, caption }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      {caption ? <Text style={styles.caption}>{caption}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: space(3),
    gap: space(2),
  },
  title: {
    color: colors.textBright,
    fontSize: 16,
    fontWeight: font.bold,
    letterSpacing: 0.3,
  },
  caption: {
    color: colors.textDim,
    fontSize: 12,
  },
});
