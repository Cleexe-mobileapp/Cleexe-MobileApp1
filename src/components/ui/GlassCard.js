import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../theme/ThemeContext';

export default function GlassCard({ children, style, noPad }) {
  const t = useTheme();

  return (
    <View
      style={[
        styles.outer,
        {
          shadowColor: t.cardShadowColor,
          shadowOffset: t.cardShadowOffset,
          shadowOpacity: t.cardShadowOpacity,
          shadowRadius: t.cardShadowRadius,
          elevation: t.cardElevation,
        },
        style,
      ]}
    >
      <BlurView
        intensity={t.glassBlurIntensity}
        tint={t.glassBlurTint}
        style={[
          styles.blur,
          {
            borderRadius: t.cardRadius,
            borderColor: t.glassBorder,
            backgroundColor: t.glassBg,
          },
        ]}
      >
        <View style={[styles.inner, noPad && styles.noPad]}>
          {children}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 24,
  },
  blur: {
    overflow: 'hidden',
    borderWidth: 1,
  },
  inner: {
    padding: 20,
  },
  noPad: {
    padding: 0,
  },
});
