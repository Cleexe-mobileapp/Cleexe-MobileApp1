import { supabase } from '@/src/services/supabase';

export type CreatePaymentIntentResponse = {
  clientSecret: string;
  amountCents: number;
};

/**
 * Authenticated call to Edge Function `create-payment-intent`.
 * `amountCents` is clamped server-side (default $4.99 test charge).
 */
export async function createPaymentIntentClientSecret(
  amountCents?: number
): Promise<CreatePaymentIntentResponse> {
  const { data, error } = await supabase.functions.invoke<CreatePaymentIntentResponse & { error?: string }>(
    'create-payment-intent',
    {
      body: amountCents != null ? { amountCents } : {},
    }
  );

  if (error) {
    const fromBody =
      data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
        ? data.error
        : null;
    throw new Error(fromBody || error.message || 'Could not start payment');
  }
  if (!data?.clientSecret) {
    throw new Error(data?.error || 'Missing payment client secret');
  }
  return data;
}
