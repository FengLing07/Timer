import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';

import type { Subject } from '@/models/subject';
import { colors, font, radius, withAlpha } from '@/theme/theme';

export interface SubjectCoverProps {
  subject: Subject;
  width: number;
  height: number;
  borderRadius?: number;
  /** hero 会加上底部压暗层，方便压文字 */
  variant?: 'thumb' | 'card' | 'hero';
  monogramSize?: number;
}

/**
 * Steam 游戏封面风格的科目封面。
 *
 * 默认完全离线：用「渐变 + 光晕 + 斜向高光 + 大写字母」拼出一张封面，
 * 不依赖任何图片资源。如果科目配置了 `coverImage`，就直接渲染真实图片。
 */
export function SubjectCover({
  subject,
  width,
  height,
  borderRadius = radius.sm,
  variant = 'card',
  monogramSize,
}: SubjectCoverProps) {
  const [from, to, glow] = subject.palette;
  const resolvedMonogram = monogramSize ?? Math.max(18, Math.round(Math.min(width, height) * 0.34));

  if (subject.coverImage) {
    return (
      <View style={[styles.wrapper, { width, height, borderRadius }]}>
        <Image
          source={{ uri: subject.coverImage }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={180}
        />
        {variant === 'hero' ? (
          <LinearGradient
            colors={[withAlpha(colors.black, 0.05), withAlpha(colors.bg, 0.55), withAlpha(colors.bg, 0.95)]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.wrapper, { width, height, borderRadius }]}>
      <LinearGradient
        colors={[from, to]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* 右上角的柔光，模仿封面上的角色打光 */}
      <View
        style={[
          styles.glow,
          {
            width: width * 0.95,
            height: width * 0.95,
            borderRadius: width,
            backgroundColor: glow,
            top: -width * 0.42,
            right: -width * 0.28,
          },
        ]}
      />

      {/* 斜向高光条纹 */}
      <View
        style={[
          styles.streak,
          {
            width: width * 2.2,
            height: height * 0.18,
            top: height * 0.58,
            left: -width * 0.6,
          },
        ]}
      />
      <View
        style={[
          styles.streak,
          {
            width: width * 1.6,
            height: height * 0.06,
            top: height * 0.78,
            left: -width * 0.3,
            opacity: 0.05,
          },
        ]}
      />

      <View style={styles.monogramLayer}>
        <Text
          allowFontScaling={false}
          style={[
            styles.monogram,
            {
              fontSize: resolvedMonogram,
              color: glow,
              letterSpacing: resolvedMonogram * 0.04,
            },
          ]}
        >
          {subject.monogram}
        </Text>
      </View>

      {variant === 'hero' ? (
        <LinearGradient
          colors={[withAlpha(colors.bg, 0), withAlpha(colors.bg, 0.45), withAlpha(colors.bg, 0.96)]}
          locations={[0.2, 0.6, 1]}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  glow: {
    position: 'absolute',
    opacity: 0.22,
  },
  streak: {
    position: 'absolute',
    backgroundColor: colors.textBright,
    opacity: 0.07,
    transform: [{ rotate: '-18deg' }],
  },
  monogramLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monogram: {
    fontWeight: font.bold,
    opacity: 0.92,
  },
});
