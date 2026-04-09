import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../theme/ThemeContext';

export default function GlassCard({ children, style, noPad, intensity, tint }) {
  const t = useTheme();
  const blurIntensity = intensity ?? t.glassBlurIntensity;
  const blurTint = tint ?? t.glassBlurTint;

  return (
    <View
      style={[
        styles.outer,
        {
          borderRadius: t.cardRadius,
          shadowColor: t.cardShadowColor,
          shadowOffset: t.cardShadowOffset,
          shadowOpacity: t.cardShadowOpacity,
          shadowRadius: t.cardShadowRadius,
          elevation: t.cardElevation,
        },
        style,
      ]}
    >
      {Platform.OS === 'android' && (
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: t.cardRadius,
              backgroundColor: t.tier === 'calm'
                ? 'rgba(255,255,255,0.90)'
                : t.cardBg,
            },
          ]}
        />
      )}
      <BlurView
        intensity={blurIntensity}
        tint={blurTint}
        style={[
          styles.blur,
          {
            borderRadius: t.cardRadius,
            borderColor: t.cardBorder,
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
    overflow: 'hidden',
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
