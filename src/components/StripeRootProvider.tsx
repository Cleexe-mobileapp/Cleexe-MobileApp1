import { StripeProvider } from '@stripe/stripe-react-native';
import { type ReactElement } from 'react';
import { Platform } from 'react-native';

const PUBLISHABLE = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim() ?? '';

/**
 * Stripe React Native only runs on iOS/Android. Web skips the provider.
 * Without a publishable key, children render unchanged (no Payment Sheet).
 */
export function StripeRootProvider({ children }: { children: ReactElement }) {
  if (Platform.OS === 'web' || !PUBLISHABLE) {
    return children;
  }

  const merchantId = process.env.EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER?.trim();

  return (
    <StripeProvider
      publishableKey={PUBLISHABLE}
      urlScheme="cleexeapp"
      {...(merchantId ? { merchantIdentifier: merchantId } : {})}
    >
      {children}
    </StripeProvider>
  );
}

export function isStripeNativeConfigured(): boolean {
  return Platform.OS !== 'web' && PUBLISHABLE.length > 0;
}
