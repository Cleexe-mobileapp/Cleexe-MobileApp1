import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import { router } from 'expo-router';

const LOGO = require('../../assets/images/fulllogo_transparent_nobu.png');
const BG_URI =
  'https://images.unsplash.com/photo-1693633164148-914c1472ddaa?auto=format&fit=crop&w=1400&q=80';
const AVATARS = [
  'https://images.unsplash.com/photo-1638953052562-21e347a142bf?w=100',
  'https://images.unsplash.com/photo-1554765345-6ad6a5417cde?w=100',
  'https://images.unsplash.com/photo-1570158268183-d296b2892211?w=100',
  'https://images.unsplash.com/photo-1648621288703-88e2273ea454?w=100',
  'https://images.unsplash.com/photo-1631885628966-a14af9faaa9b?w=100',
];

function FloatingParticle({
  size,
  top,
  left,
  delay = 0,
  duration = 6000,
}: {
  size: number;
  top: DimensionValue;
  left: DimensionValue;
  delay?: number;
  duration?: number;
}) {
  const y = useSharedValue(0);
  const opacity = useSharedValue(0.2);

  useEffect(() => {
    y.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-20, { duration, easing: Easing.inOut(Easing.ease) }),
          withTiming(8, { duration, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(withTiming(0.38, { duration: duration * 0.55 }), withTiming(0.16, { duration: duration * 0.45 })),
        -1,
        true
      )
    );
  }, [delay, duration, opacity, y]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.particle, { width: size, height: size, top, left }]}>
      <Animated.View style={[{ width: size, height: size, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.5)' }, style]} />
    </View>
  );
}

function AvatarBubble({
  uri,
  index,
}: {
  uri: string;
  index: number;
}) {
  const tilt = useSharedValue(0);
  const avatarStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 900 },
      { rotateY: `${tilt.value}deg` },
      { scale: interpolate(tilt.value, [-6, 0, 6], [0.98, 1, 1.02]) },
    ],
  }));

  return (
    <Pressable
      onPressIn={() => {
        tilt.value = withTiming(index % 2 === 0 ? 6 : -6, { duration: 120 });
      }}
      onPressOut={() => {
        tilt.value = withSpring(0, { damping: 10, stiffness: 120 });
      }}
    >
      <Animated.View style={[styles.avatarRing, index > 0 && styles.avatarOverlap, avatarStyle]}>
        <Image source={{ uri }} style={styles.avatar} />
      </Animated.View>
    </Pressable>
  );
}

function SparklePlaceholder() {
  const rotate = useSharedValue(0);
  const burst = useSharedValue(0);

  useEffect(() => {
    rotate.value = withRepeat(withTiming(360, { duration: 3200, easing: Easing.linear }), -1, false);
    burst.value = withDelay(
      600,
      withSequence(
        withTiming(1, { duration: 460, easing: Easing.out(Easing.exp) }),
        withTiming(0, { duration: 520, easing: Easing.inOut(Easing.quad) })
      )
    );
  }, [burst, rotate]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { perspective: 1000 },
      { rotateZ: `${rotate.value}deg` },
      { rotateY: `${rotate.value / 8}deg` },
      { scale: interpolate(burst.value, [0, 1], [1, 1.2]) },
    ],
  }));

  const burstStyle = useAnimatedStyle(() => ({
    opacity: interpolate(burst.value, [0, 1], [0, 0.45]),
    transform: [{ scale: interpolate(burst.value, [0, 1], [0.75, 1.9]) }],
  }));

  return (
    <View style={styles.sparkleShell}>
      <Animated.View style={[styles.sparkleBurst, burstStyle]} />
      <Animated.Text style={[styles.sparkleIcon, iconStyle]}>✦</Animated.Text>
    </View>
  );
}

export default function WelcomeScreen() {
  const [count, setCount] = useState(11000);
  const navigateGuard = useRef(false);

  const screenOpacity = useSharedValue(1);
  const screenY = useSharedValue(0);
  const bgOpacity = useSharedValue(0);
  const bgScale = useSharedValue(1);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(14);
  const bodyOpacity = useSharedValue(0);
  const sparkleOpacity = useSharedValue(0);
  const orbScale = useSharedValue(1);
  const orbOpacity = useSharedValue(0.25);
  const logoScale = useSharedValue(0.7);
  const logoFloatY = useSharedValue(8);
  const ctaPulse = useSharedValue(0);
  const ctaGlow = useSharedValue(0.18);
  const ctaBurst = useSharedValue(0);

  const countLabel = useMemo(() => `Join ${count.toLocaleString()}+ people growing today`, [count]);

  const goToAuth = () => {
    if (navigateGuard.current) return;
    navigateGuard.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    screenOpacity.value = withTiming(0, { duration: 420 });
    screenY.value = withTiming(-8, { duration: 420 });
    setTimeout(() => {
      router.replace('/(auth)/sign-up');
    }, 430);
  };

  useEffect(() => {
    bgOpacity.value = withTiming(1, { duration: 700 });
    bgScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 7800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 7800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 560 }));
    titleY.value = withDelay(300, withSpring(0, { damping: 15, stiffness: 120 }));
    bodyOpacity.value = withDelay(700, withTiming(1, { duration: 620 }));
    sparkleOpacity.value = withDelay(780, withTiming(1, { duration: 500 }));
    logoScale.value = withSequence(
      withSpring(1.08, { damping: 11, stiffness: 170 }),
      withSpring(1, { damping: 12, stiffness: 180 })
    );
    logoFloatY.value = withRepeat(
      withSequence(
        withTiming(-9, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        withTiming(7, { duration: 2400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    orbScale.value = withRepeat(
      withSequence(
        withTiming(1.08, { duration: 2400, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.97, { duration: 2400, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    orbOpacity.value = withRepeat(
      withSequence(withTiming(0.35, { duration: 2200 }), withTiming(0.16, { duration: 2200 })),
      -1,
      true
    );

    ctaPulse.value = withRepeat(
      withSequence(withTiming(1, { duration: 1200 }), withTiming(0, { duration: 1200 })),
      -1,
      true
    );
    ctaGlow.value = withRepeat(
      withSequence(withTiming(0.42, { duration: 1300 }), withTiming(0.2, { duration: 1300 })),
      -1,
      true
    );

    const counterInterval = setInterval(() => {
      setCount((prev) => {
        if (prev >= 12000) return 12000;
        return Math.min(prev + 167, 12000);
      });
    }, 80);

    return () => {
      clearInterval(counterInterval);
    };
  }, [
    bgOpacity,
    bgScale,
    bodyOpacity,
    ctaGlow,
    ctaPulse,
    logoFloatY,
    logoScale,
    orbOpacity,
    orbScale,
    sparkleOpacity,
    titleOpacity,
    titleY,
  ]);

  const screenStyle = useAnimatedStyle(() => ({
    opacity: screenOpacity.value,
    transform: [{ translateY: screenY.value }],
  }));
  const backgroundStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
    transform: [{ scale: bgScale.value }],
  }));
  const orbStyle = useAnimatedStyle(() => ({
    opacity: orbOpacity.value,
    transform: [{ scale: orbScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({ opacity: bodyOpacity.value }));
  const sparkleStyle = useAnimatedStyle(() => ({ opacity: sparkleOpacity.value }));
  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }, { translateY: logoFloatY.value }],
  }));
  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ctaPulse.value, [0, 1], [1, 1.03]) }],
    shadowOpacity: ctaGlow.value,
  }));
  const ctaGlowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(ctaPulse.value, [0, 1], [0.08, 0.34]),
    transform: [{ scale: interpolate(ctaPulse.value, [0, 1], [0.92, 1.08]) }],
  }));
  const ctaBurstStyle = useAnimatedStyle(() => ({
    opacity: ctaBurst.value,
    transform: [{ scale: interpolate(ctaBurst.value, [0, 1], [0.82, 1.55]) }],
  }));

  const goToSignUp = () => {
    if (navigateGuard.current) return;
    Haptics.selectionAsync();
    ctaBurst.value = withSequence(withTiming(1, { duration: 160 }), withTiming(0, { duration: 280 }));
    goToAuth();
  };

  return (
    <Animated.View style={[styles.container, screenStyle]}>
      <Animated.View style={[StyleSheet.absoluteFill, backgroundStyle]}>
        <Image source={{ uri: BG_URI }} style={StyleSheet.absoluteFill} contentFit="cover" />
      </Animated.View>
      <LinearGradient
        colors={['rgba(23,27,68,0.55)', 'rgba(84,64,190,0.45)', 'rgba(178,203,255,0.2)']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.radialOverlayTop} />
      <View style={styles.radialOverlayBottom} />
      <FloatingParticle size={8} top="16%" left="11%" duration={5800} />
      <FloatingParticle size={6} top="24%" left="78%" delay={600} duration={5300} />
      <FloatingParticle size={10} top="58%" left="18%" delay={900} duration={6400} />
      <FloatingParticle size={7} top="72%" left="72%" delay={1400} duration={6100} />

      <Animated.View style={[styles.orb, styles.orbTop, orbStyle]} />
      <Animated.View style={[styles.orb, styles.orbBottom, orbStyle]} />

      <BlurView intensity={18} tint="dark" style={styles.glassCard}>
        <Animated.View style={[styles.logoWrap, sparkleStyle, logoStyle]}>
          <Image source={LOGO} style={styles.logo} contentFit="contain" />
          <View style={styles.logoShine} />
          <SparklePlaceholder />
        </Animated.View>

        <Animated.View style={titleStyle}>
          <Text style={styles.kicker}>WELCOME TO CLEEXE</Text>
          <Text style={styles.title}>Unleash Your Potential</Text>
        </Animated.View>

        <Animated.View style={bodyStyle}>
          <Text style={styles.subtitle}>Join a community focused on growth, positivity, and meaningful progress.</Text>
          <View style={styles.socialRow}>
            {AVATARS.map((uri, index) => (
              <AvatarBubble key={uri} uri={uri} index={index} />
            ))}
          </View>
          <Text style={styles.socialText}>{countLabel}</Text>
        </Animated.View>

        <Animated.View style={[styles.ctaWrap, ctaStyle]}>
          <Pressable
            onPress={goToSignUp}
            style={({ pressed }) => [styles.ctaButton, pressed && styles.ctaPressed]}
          >
            <LinearGradient
              pointerEvents="none"
              colors={['#5A46F6', '#7A64FF', '#4E5BFF']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={StyleSheet.absoluteFill}
            />
            <Animated.View pointerEvents="none" style={[styles.ctaGlow, ctaGlowStyle]} />
            <Animated.View pointerEvents="none" style={[styles.ctaBurst, ctaBurstStyle]}>
              <Svg width={80} height={26} viewBox="0 0 80 26">
                <Circle cx="40" cy="13" r="8" fill="rgba(255,255,255,0.3)" />
              </Svg>
            </Animated.View>
            <Text style={styles.ctaText}>Start Your Journey</Text>
          </Pressable>
        </Animated.View>
        <View style={styles.bottomTextSection}>
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(9,11,28,0)', 'rgba(9,11,28,0.62)', 'rgba(9,11,28,0.84)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.bottomTextGradient}
          />
          <Pressable onPress={() => router.push('/(auth)/sign-in')} style={[styles.signInWrap, styles.bottomTextLayer]}>
            <Text style={styles.signInText}>
              Already have an account? <Text style={styles.signInLink}>Sign In</Text>
            </Text>
          </Pressable>
          <Text style={[styles.legalText, styles.bottomTextLayer]}>
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </Text>
        </View>
      </BlurView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0C0B19',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  radialOverlayTop: {
    position: 'absolute',
    top: 66,
    left: 38,
    width: 210,
    height: 210,
    borderRadius: 999,
    backgroundColor: 'rgba(129,153,255,0.18)',
  },
  radialOverlayBottom: {
    position: 'absolute',
    bottom: 86,
    right: 30,
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: 'rgba(141,108,255,0.15)',
  },
  particle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  orb: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
  },
  orbTop: {
    top: 70,
    right: -30,
  },
  orbBottom: {
    bottom: 90,
    left: -50,
  },
  glassCard: {
    width: '100%',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    paddingVertical: 34,
    paddingHorizontal: 22,
    overflow: 'hidden',
    alignItems: 'center',
  },
  logoWrap: {
    marginBottom: 14,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  logo: {
    width: 88,
    height: 88,
    marginBottom: 6,
  },
  logoShine: {
    position: 'absolute',
    top: 8,
    left: 24,
    width: 34,
    height: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.35)',
    transform: [{ rotate: '-24deg' }],
  },
  sparkleShell: {
    position: 'absolute',
    right: -6,
    top: -6,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleBurst: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FFD166',
  },
  sparkleIcon: {
    color: '#FFD166',
    fontSize: 18,
    fontWeight: '800',
    textShadowColor: 'rgba(255,209,102,0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
  title: {
    fontSize: 45,
    lineHeight: 52,
    color: '#FFFFFF',
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.5,
    fontFamily: Platform.select({
      ios: 'Times New Roman',
      android: 'serif',
      default: 'serif',
    }),
    textShadowColor: 'rgba(16,18,45,0.6)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 12,
  },
  kicker: {
    color: 'rgba(215,211,255,0.95)',
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.8,
    marginBottom: 12,
  },
  subtitle: {
    marginTop: 10,
    color: 'rgba(234,238,255,0.86)',
    textAlign: 'center',
    fontSize: 15,
    lineHeight: 24,
    paddingHorizontal: 6,
    marginBottom: 14,
    fontWeight: '400',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.86)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 6,
    overflow: 'hidden',
  },
  avatarOverlap: {
    marginLeft: -8,
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  socialText: {
    color: 'rgba(240,242,255,0.93)',
    fontSize: 13.5,
    textAlign: 'center',
    fontWeight: '500',
  },
  ctaWrap: {
    marginTop: 26,
    width: '100%',
    shadowColor: '#6B4EFF',
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 16,
    elevation: 12,
  },
  ctaButton: {
    height: 54,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPressed: {
    transform: [{ scale: 0.97 }],
  },
  ctaGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#A997FF',
    borderRadius: 999,
  },
  ctaBurst: {
    position: 'absolute',
    alignSelf: 'center',
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  bottomTextSection: {
    width: '100%',
    marginTop: 16,
    paddingTop: 14,
    paddingBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
  },
  bottomTextGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  bottomTextLayer: {
    zIndex: 1,
  },
  signInWrap: {
    marginTop: 0,
    marginBottom: 8,
  },
  signInText: {
    color: 'rgba(248,250,255,0.96)',
    fontSize: 13,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  signInLink: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  legalText: {
    color: 'rgba(241,245,255,0.9)',
    fontSize: 11.5,
    marginTop: 0,
    textAlign: 'center',
    lineHeight: 17,
    fontWeight: '500',
    paddingHorizontal: 8,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
