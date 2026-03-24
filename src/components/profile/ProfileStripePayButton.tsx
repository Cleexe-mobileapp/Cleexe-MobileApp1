import { useStripe } from '@stripe/stripe-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text } from 'react-native';

import { createPaymentIntentClientSecret } from '@/src/services/stripePayment';

const PURPLE = '#6B4EFF';

/**
 * Must render only under `StripeRootProvider` (native + publishable key set).
 */
export function ProfileStripePayButton() {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const { clientSecret } = await createPaymentIntentClientSecret();

      const { error: initError } = await initPaymentSheet({
        merchantDisplayName: 'Cleexe',
        paymentIntentClientSecret: clientSecret,
      });

      if (initError) {
        Alert.alert('Could not open payment', initError.message);
        return;
      }

      const { error: presentError } = await presentPaymentSheet();

      if (presentError) {
        if (presentError.code !== 'Canceled') {
          Alert.alert('Payment', presentError.message);
        }
        return;
      }

      Alert.alert('Payment successful', 'Thank you — your card payment went through.');
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      Alert.alert('Payment failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
      onPress={handlePay}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={PURPLE} />
      ) : (
        <Text style={styles.text}>Pay with Stripe (card)</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    borderWidth: 1,
    borderColor: '#C4B5FD',
    backgroundColor: '#F5F3FF',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPressed: { opacity: 0.88 },
  text: { color: PURPLE, fontWeight: '700', fontSize: 14 },
});
