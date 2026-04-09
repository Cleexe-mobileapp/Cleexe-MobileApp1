import React, { useMemo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, TYPOGRAPHY } from '../../theme/tokens';
import ChromeButton from './ChromeButton';

/**
 * Reusable locked-feature overlay.
 *
 * Renders `children` (the real screen) as a blurred background, then
 * overlays a dark tint + centered lock prompt. Works identically on
 * iOS and Android.
 *
 * @param {object}   props
 * @param {React.ReactNode} props.children        Background screen content
 * @param {'coming-soon'|'premium'} props.variant  Visual variant
 * @param {string}   props.title                   Headline (supports \n)
 * @param {string}   [props.subtitle]              Smaller text below headline
 * @param {string}   [props.description]           Body copy
 * @param {string}   [props.icon]                  Ionicons name (default lock-closed)
 * @param {string}   [props.buttonLabel]           Primary CTA label
 * @param {function} [props.onButtonPress]         Primary CTA handler
 * @param {string}   [props.secondaryLabel]        Optional secondary CTA
 * @param {function} [props.onSecondaryPress]      Secondary CTA handler
 */
export default function LockedFeatureScreen({
  children,
  variant = 'coming-soon',
  title = 'Coming Soon',
  subtitle,
  description,
  icon = 'lock-closed',
  buttonLabel,
  onButtonPress,
  secondaryLabel,
  onSecondaryPress,
}) {
  const theme = useTheme();
  const isLight = theme.tier === 'calm';

  const isPremiumVariant = variant === 'premium';
  const resolvedButtonLabel =
    buttonLabel ?? (isPremiumVariant ? 'Upgrade to Premium' : 'Back to Home');

  const blurIntensity = Platform.select({
    ios: isLight ? 60 : 50,
    android: isLight ? 80 : 70,
  });

  const styles = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1 },
        blurOverlay: {
          ...StyleSheet.absoluteFillObject,
          zIndex: 10,
        },
        darkOverlay: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: isLight
            ? 'rgba(0, 0, 0, 0.45)'
            : 'rgba(0, 0, 0, 0.6)',
        },
        safeArea: {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: SPACING.xl,
        },
        iconRing: {
          width: 96,
          height: 96,
          borderRadius: 48,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(255, 255, 255, 0.08)',
          borderWidth: 1.5,
          borderColor: 'rgba(255, 255, 255, 0.14)',
          marginBottom: SPACING.lg,
        },
        premiumBadge: {
          position: 'absolute',
          bottom: -2,
          right: -2,
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: theme.primary,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: 'rgba(0, 0, 0, 0.3)',
        },
        title: {
          ...TYPOGRAPHY.h1,
          fontSize: 28,
          color: '#FFFFFF',
          textAlign: 'center',
          lineHeight: 36,
        },
        subtitle: {
          ...TYPOGRAPHY.bodyBold,
          color: 'rgba(255, 255, 255, 0.85)',
          textAlign: 'center',
          marginTop: SPACING.sm,
        },
        description: {
          ...TYPOGRAPHY.body,
          color: 'rgba(255, 255, 255, 0.6)',
          textAlign: 'center',
          marginTop: SPACING.md,
          maxWidth: 300,
        },
        primaryButton: {
          marginTop: SPACING.xl,
          minWidth: 220,
        },
        secondaryButton: {
          marginTop: SPACING.md,
          paddingVertical: SPACING.sm,
          paddingHorizontal: SPACING.lg,
        },
        secondaryButtonPressed: {
          opacity: 0.7,
        },
        secondaryText: {
          ...TYPOGRAPHY.caption,
          color: 'rgba(255, 255, 255, 0.65)',
        },
      }),
    [theme, isLight],
  );

  return (
    <View style={styles.root}>
      {children}

      <BlurView
        intensity={blurIntensity}
        tint={isLight ? 'light' : 'dark'}
        style={styles.blurOverlay}
      >
        <View style={styles.darkOverlay} />

        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          <View style={styles.iconRing}>
            <Ionicons
              name={icon}
              size={38}
              color="rgba(255, 255, 255, 0.85)"
            />
            {isPremiumVariant && (
              <View style={styles.premiumBadge}>
                <Ionicons
                  name="star"
                  size={14}
                  color={theme.textOnPrimary}
                />
              </View>
            )}
          </View>

          <Text style={styles.title}>{title}</Text>

          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : null}

          <ChromeButton
            label={resolvedButtonLabel}
            onPress={onButtonPress}
            style={styles.primaryButton}
          />

          {secondaryLabel ? (
            <Pressable
              onPress={onSecondaryPress}
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryButtonPressed,
              ]}
            >
              <Text style={styles.secondaryText}>{secondaryLabel}</Text>
            </Pressable>
          ) : null}
        </SafeAreaView>
      </BlurView>
    </View>
  );
}
