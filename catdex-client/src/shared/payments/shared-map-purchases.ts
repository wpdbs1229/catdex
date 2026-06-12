import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL, PURCHASES_ERROR_CODE } from 'react-native-purchases';

const sharedMapEntitlementId = 'shared_map';
const sharedMapProductId = 'shared_map_lifetime';

let configuredApiKey: string | null = null;
let configuredAppUserId: string | null = null;

function getRevenueCatApiKey() {
  if (Platform.OS === 'ios') {
    return process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY?.trim() ?? '';
  }

  if (Platform.OS === 'android') {
    return process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY?.trim() ?? '';
  }

  return '';
}

function hasSharedMapEntitlement(customerInfo: Awaited<ReturnType<typeof Purchases.getCustomerInfo>>) {
  return customerInfo.entitlements.active[sharedMapEntitlementId] !== undefined;
}

async function configurePurchases(appUserId: string) {
  const apiKey = getRevenueCatApiKey();

  if (!apiKey) {
    throw new Error('RevenueCat API key가 필요합니다. .env에 EXPO_PUBLIC_REVENUECAT_IOS_API_KEY 또는 EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY를 설정해 주세요.');
  }

  if (!configuredApiKey) {
    await Purchases.setLogLevel(LOG_LEVEL.INFO);
    Purchases.configure({
      apiKey,
      appUserID: appUserId,
    });
    configuredApiKey = apiKey;
    configuredAppUserId = appUserId;
    return;
  }

  if (configuredApiKey !== apiKey) {
    throw new Error('플랫폼 결제 설정이 변경되었습니다. 앱을 다시 시작한 뒤 결제를 시도해 주세요.');
  }

  if (configuredAppUserId !== appUserId) {
    await Purchases.logIn(appUserId);
    configuredAppUserId = appUserId;
  }
}

async function getSharedMapPackage() {
  const offerings = await Purchases.getOfferings();
  const packages = offerings.current?.availablePackages ?? [];
  const sharedMapPackage =
    packages.find((candidate) => candidate.product.identifier === sharedMapProductId) ??
    packages.find((candidate) => candidate.identifier === 'lifetime') ??
    packages[0];

  if (!sharedMapPackage) {
    throw new Error('RevenueCat Offering에 공유지도 상품이 없습니다. shared_map entitlement와 shared_map_lifetime 상품을 Offering에 연결해 주세요.');
  }

  return sharedMapPackage;
}

export function isRevenueCatPurchaseCancelled(error: unknown) {
  const candidate = error as { code?: string; userCancelled?: boolean };
  return candidate.userCancelled === true || candidate.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;
}

export async function purchaseSharedMapLifetime(appUserId: string) {
  await configurePurchases(appUserId);

  const sharedMapPackage = await getSharedMapPackage();
  const { customerInfo } = await Purchases.purchasePackage(sharedMapPackage);

  return {
    hasLifetimeAccess: hasSharedMapEntitlement(customerInfo),
  };
}

export async function restoreSharedMapLifetime(appUserId: string) {
  await configurePurchases(appUserId);

  const customerInfo = await Purchases.restorePurchases();

  return {
    hasLifetimeAccess: hasSharedMapEntitlement(customerInfo),
  };
}
