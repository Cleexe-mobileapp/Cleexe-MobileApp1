import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeContext';

const AnimatedView = Animated.createAnimatedComponent(View);

export default function ChromeButton({
  label,
  onPress,
  style,
  textStyle,
  disabled,
  variant,
  leftIcon,
}) {
  const t = useTheme();
  const shine = useSharedValue(-1);

  useEffect(() => {
    shine.value = withDelay(
      800,
      withRepeat(
        withTiming(2, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        -1,
        false,
      ),
    );
  }, [shine]);

  const shineStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(shine.value, [-1, 2], [-120, 320]) },
      { rotate: '25deg' },
    ],
    opacity: interpolate(shine.value, [-1, 0.3, 0.7, 2], [0, 0.6, 0.6, 0]),
  }));

  const isOutline = variant === 'outline';
  const bg = isOutline ? 'transparent' : t.chromeBg;
  const border = isOutline ? t.primary : 'transparent';
  const textColor = isOutline ? t.primary : t.textOnPrimary;
  const shadow = isOutline ? 'transparent' : t.chromeShadow;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: bg,
          borderColor: border,
          borderWidth: isOutline ? 1.5 : 0,
          shadowColor: shadow,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      <View style={styles.contentRow}>
        {leftIcon ? <View style={styles.leftIconWrap}>{leftIcon}</View> : null}
        <Text style={[styles.label, { color: textColor }, textStyle]}>{label}</Text>
      </View>

      {!isOutline && (
        <AnimatedView
          style={[styles.shineStripe, { backgroundColor: t.chromeShine }, shineStyle]}
          pointerEvents="none"
        />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderRadius: 999,
    paddingVertical: 15,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 4,
    position: 'relative',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  leftIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  shineStripe: {
    position: 'absolute',
    top: -10,
    width: 50,
    height: 80,
    borderRadius: 20,
  },
});
