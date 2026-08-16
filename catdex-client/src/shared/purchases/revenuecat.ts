import { Platform } from 'react-native';
import Purchases, {
  LOG_LEVEL,
  type CustomerInfo,
  type PurchasesOffering,
  type PurchasesPackage,
} from 'react-native-purchases';

let hasConfigured = false;

function resolveApiKey() {
  const iosKey = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY?.trim();
  const androidKey = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY?.trim();

  return Platform.select({ ios: iosKey, android: androidKey, default: undefined });
}

/**
 * 앱 시작 시 한 번 호출한다. 키가 없으면(로컬 개발 등) 조용히 건너뛴다 -
 * 상점 없이도 나머지 앱은 그대로 써야 하니 여기서 던지면 안 된다.
 */
export function configureRevenueCat() {
  if (hasConfigured) {
    return;
  }

  const apiKey = resolveApiKey();

  if (!apiKey) {
    console.warn('[revenuecat] API 키가 없어 상점 결제를 건너뜁니다.');
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.WARN);
  }

  Purchases.configure({ apiKey });
  hasConfigured = true;
}

export function isRevenueCatConfigured() {
  return hasConfigured;
}

/** 로그인 성공 직후 부른다. 구매 내역을 우리 user_id에 묶는다. */
export async function loginRevenueCatUser(userId: string) {
  if (!hasConfigured) {
    return;
  }

  await Purchases.logIn(userId);
}

/** 로그아웃 직전 부른다. 다음 로그인이 새 익명 사용자로 시작하게 한다. */
export async function logoutRevenueCatUser() {
  if (!hasConfigured) {
    return;
  }

  await Purchases.logOut();
}

/** 지금 판매 중인 상품 묶음. 상점 화면에서 가격·구매 버튼을 그릴 때 쓴다. */
export async function fetchOfferings(): Promise<PurchasesOffering | null> {
  if (!hasConfigured) {
    return null;
  }

  const offerings = await Purchases.getOfferings();

  return offerings.current;
}

/** 결제를 띄운다. 성공하면 CustomerInfo를 돌려주고, 취소하면 던진다. */
export async function purchasePackage(pkg: PurchasesPackage): Promise<CustomerInfo> {
  const { customerInfo } = await Purchases.purchasePackage(pkg);

  return customerInfo;
}

/** 기기를 바꾸거나 다시 설치했을 때 "이미 산 상품 복원"에 쓴다. */
export async function restorePurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export type { CustomerInfo, PurchasesOffering, PurchasesPackage };
