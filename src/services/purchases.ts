import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

type PurchasePackageArg = Parameters<typeof Purchases.purchasePackage>[0];
type PurchaseStoreProductArg = Parameters<typeof Purchases.purchaseStoreProduct>[0];
type CustomerInfo = Awaited<ReturnType<typeof Purchases.purchasePackage>>['customerInfo'];

/**
 * RevenueCat public SDK key (safe to ship in the client). Replace via env for production.
 * Used only when `EXPO_PUBLIC_REVENUECAT_*` is unset — typical if `.env` was never created.
 */
const DEFAULT_PUBLIC_RC_KEY = 'test_ocQwQpRjrnQkLhYfJyjnihzpbVe';

let purchasesConfigured = false;

export type RevenueCatPurchaseResult = {
  customerInfo: CustomerInfo | null;
  hasEntitlement: boolean;
  cancelled: boolean;
};

function hasCancelledPurchase(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  return 'userCancelled' in error && (error as { userCancelled?: boolean }).userCancelled === true;
}

function getRevenueCatApiKeyForPlatform(): string | null {
  const iosApiKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY;
  const androidApiKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY;

  if (Platform.OS === 'ios') {
    const key = iosApiKey?.trim();
    if (key) return key;
    if (__DEV__) {
      console.warn(
        '[RevenueCat] EXPO_PUBLIC_REVENUECAT_IOS_API_KEY is unset. Using bundled default test key. Add a root `.env` with your `appl_...` key for production.'
      );
      return DEFAULT_PUBLIC_RC_KEY;
    }
    return null;
  }
  if (Platform.OS === 'android') {
    const key = androidApiKey?.trim();
    if (key) return key;
    if (__DEV__) {
      console.warn(
        '[RevenueCat] EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY is unset. Using bundled default test key. Add a root `.env` with your `goog_...` key for production.'
      );
      return DEFAULT_PUBLIC_RC_KEY;
    }
    return null;
  }
  return null;
}

export async function initializePurchases(): Promise<void> {
  if (purchasesConfigured) return;

  const apiKey = getRevenueCatApiKeyForPlatform();
  if (!apiKey) {
    throw new Error(
      'RevenueCat API key is missing. Create a `.env` in the project root with EXPO_PUBLIC_REVENUECAT_IOS_API_KEY (appl_...) and EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY (goog_...), then restart Expo. See .env.example.'
    );
  }

  Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
  Purchases.configure({ apiKey });
  purchasesConfigured = true;
}

export function hasActiveEntitlement(customerInfo: CustomerInfo, entitlementId: string): boolean {
  return typeof customerInfo.entitlements.active[entitlementId] !== 'undefined';
}

export function hasAnyActiveEntitlement(customerInfo: CustomerInfo): boolean {
  return Object.keys(customerInfo.entitlements.active).length > 0;
}

function isEntitlementActive(customerInfo: CustomerInfo, entitlementId?: string): boolean {
  if (entitlementId && entitlementId.trim().length > 0) {
    return hasActiveEntitlement(customerInfo, entitlementId);
  }
  return hasAnyActiveEntitlement(customerInfo);
}

export async function getEntitlementStatus(entitlementId?: string): Promise<boolean> {
  await initializePurchases();
  const customerInfo = await Purchases.getCustomerInfo();
  return isEntitlementActive(customerInfo, entitlementId);
}

export async function restoreEntitlement(entitlementId?: string): Promise<boolean> {
  await initializePurchases();
  const customerInfo = await Purchases.restorePurchases();
  return isEntitlementActive(customerInfo, entitlementId);
}

export async function purchaseFromCurrentOffering(
  entitlementId?: string
): Promise<RevenueCatPurchaseResult> {
  await initializePurchases();
  const offerings = await Purchases.getOfferings();
  const current = offerings.current;
  const pkg = current?.availablePackages?.[0];
  if (!pkg) {
    throw new Error('No subscription packages are currently available.');
  }
  return purchaseWithPackage(pkg, entitlementId);
}

export async function purchaseWithPackage(
  packageToBuy: PurchasePackageArg,
  entitlementId?: string
): Promise<RevenueCatPurchaseResult> {
  await initializePurchases();
  try {
    const { customerInfo } = await Purchases.purchasePackage(packageToBuy);
    return {
      customerInfo,
      hasEntitlement: isEntitlementActive(customerInfo, entitlementId),
      cancelled: false,
    };
  } catch (error) {
    if (hasCancelledPurchase(error)) {
      return {
        customerInfo: null,
        hasEntitlement: false,
        cancelled: true,
      };
    }
    throw error;
  }
}

export async function purchaseWithStoreProduct(
  productToBuy: PurchaseStoreProductArg,
  entitlementId?: string
): Promise<RevenueCatPurchaseResult> {
  await initializePurchases();
  try {
    const { customerInfo } = await Purchases.purchaseStoreProduct(productToBuy);
    return {
      customerInfo,
      hasEntitlement: isEntitlementActive(customerInfo, entitlementId),
      cancelled: false,
    };
  } catch (error) {
    if (hasCancelledPurchase(error)) {
      return {
        customerInfo: null,
        hasEntitlement: false,
        cancelled: true,
      };
    }
    throw error;
  }
}
