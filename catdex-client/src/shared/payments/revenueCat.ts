import { Platform } from 'react-native';
import type { CustomerInfo, PurchasesPackage } from 'react-native-purchases';
import type { NyangkkureomiPackage } from '@/shared/types/payments';

const entitlementId = 'nyangkkureomi';
let configuredUserId: string | null = null;

function getRevenueCatApiKey() {
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY ?? '';
  }

  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY ?? '';
  }

  return '';
}

function periodLabel(subscriptionPeriod: string | null, packageId: string) {
  if (subscriptionPeriod === 'P1Y' || packageId.includes('annual')) {
    return '연간';
  }

  if (subscriptionPeriod === 'P1M' || packageId.includes('monthly')) {
    return '월간';
  }

  return '구독';
}

export function hasRevenueCatNyangkkureomi(customerInfo: CustomerInfo | null) {
  return Boolean(customerInfo?.entitlements.active[entitlementId]?.isActive);
}

export function mapRevenueCatPackage(nextPackage: PurchasesPackage): NyangkkureomiPackage {
  return {
    id: nextPackage.identifier,
    title: nextPackage.product.title || '냥꾸러미',
    description: nextPackage.product.description || '고양이 서랍을 더 넓게 꾸밀 수 있어요.',
    price: nextPackage.product.priceString,
    periodLabel: periodLabel(nextPackage.product.subscriptionPeriod, nextPackage.identifier),
    nativePackage: nextPackage,
  };
}

export async function configureRevenueCat(userId: string) {
  const apiKey = getRevenueCatApiKey();

  if (!apiKey) {
    return false;
  }

  const { default: Purchases, LOG_LEVEL } = await import('react-native-purchases');

  await Purchases.setLogLevel(__DEV__ ? LOG_LEVEL.DEBUG : LOG_LEVEL.WARN);

  if (!configuredUserId) {
    Purchases.configure({
      apiKey,
      appUserID: userId,
    });
  } else if (configuredUserId !== userId) {
    await Purchases.logIn(userId);
  }

  configuredUserId = userId;
  return true;
}

export async function fetchNyangkkureomiOffering() {
  const { default: Purchases } = await import('react-native-purchases');
  const offerings = await Purchases.getOfferings();
  const offering = offerings.current ?? offerings.all.nyangkkureomi;

  return {
    packages: offering?.availablePackages.map(mapRevenueCatPackage) ?? [],
    customerInfo: await Purchases.getCustomerInfo(),
  };
}

export async function purchaseNyangkkureomiPackage(nextPackage: NyangkkureomiPackage) {
  const { default: Purchases } = await import('react-native-purchases');
  const result = await Purchases.purchasePackage(nextPackage.nativePackage);
  return result.customerInfo;
}

export async function restoreNyangkkureomiPurchases() {
  const { default: Purchases } = await import('react-native-purchases');
  return Purchases.restorePurchases();
}
