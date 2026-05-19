import { useCallback, useEffect, useState } from 'react';
import {
  configureRevenueCat,
  fetchNyangkkureomiOffering,
  hasRevenueCatNyangkkureomi,
  purchaseNyangkkureomiPackage,
  restoreNyangkkureomiPurchases,
} from '@/shared/payments/revenueCat';
import type { NyangkkureomiPackage, NyangkkureomiPaymentState } from '@/shared/types/payments';

const unavailableMessage = 'RevenueCat 공개 SDK 키가 설정되지 않았어요.';
const emptyOfferingMessage = 'RevenueCat 냥꾸러미 Offering에 구매 가능한 구독 상품이 없어요.';

function isUserCancelledPurchase(error: unknown) {
  return typeof error === 'object' && error !== null && 'userCancelled' in error && Boolean(error.userCancelled);
}

export function useNyangkkureomiPayments(userId: string | null) {
  const [state, setState] = useState<NyangkkureomiPaymentState>({
    isAvailable: false,
    isLoading: false,
    isPurchasing: false,
    hasNyangkkureomi: false,
    errorMessage: null,
    packages: [],
  });

  const refresh = useCallback(async () => {
    if (!userId) {
      return;
    }

    setState((current) => ({ ...current, isLoading: true, errorMessage: null }));

    try {
      const isConfigured = await configureRevenueCat(userId);

      if (!isConfigured) {
        setState((current) => ({
          ...current,
          isAvailable: false,
          isLoading: false,
          errorMessage: unavailableMessage,
        }));
        return;
      }

      const { packages, customerInfo } = await fetchNyangkkureomiOffering();

      setState((current) => ({
        ...current,
        isAvailable: true,
        isLoading: false,
        hasNyangkkureomi: hasRevenueCatNyangkkureomi(customerInfo),
        errorMessage: packages.length > 0 ? null : emptyOfferingMessage,
        packages,
      }));
    } catch (error) {
      setState((current) => ({
        ...current,
        isAvailable: false,
        isLoading: false,
        errorMessage: error instanceof Error ? error.message : '냥꾸러미 결제 정보를 불러오지 못했어요.',
      }));
    }
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const purchase = useCallback(
    async (nextPackage: NyangkkureomiPackage) => {
      setState((current) => ({ ...current, isPurchasing: true, errorMessage: null }));

      try {
        const customerInfo = await purchaseNyangkkureomiPackage(nextPackage);
        setState((current) => ({
          ...current,
          isPurchasing: false,
          hasNyangkkureomi: hasRevenueCatNyangkkureomi(customerInfo),
        }));
        await refresh();
      } catch (error) {
        if (isUserCancelledPurchase(error)) {
          setState((current) => ({ ...current, isPurchasing: false }));
          return;
        }

        setState((current) => ({
          ...current,
          isPurchasing: false,
          errorMessage: error instanceof Error ? error.message : '냥꾸러미 결제를 완료하지 못했어요.',
        }));
      }
    },
    [refresh],
  );

  const restore = useCallback(async () => {
    setState((current) => ({ ...current, isPurchasing: true, errorMessage: null }));

    try {
      const customerInfo = await restoreNyangkkureomiPurchases();
      setState((current) => ({
        ...current,
        isPurchasing: false,
        hasNyangkkureomi: hasRevenueCatNyangkkureomi(customerInfo),
      }));
      await refresh();
    } catch (error) {
      setState((current) => ({
        ...current,
        isPurchasing: false,
        errorMessage: error instanceof Error ? error.message : '구매 복원에 실패했어요.',
      }));
    }
  }, [refresh]);

  return {
    ...state,
    refresh,
    purchase,
    restore,
  };
}
