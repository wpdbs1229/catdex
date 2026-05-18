import type { PurchasesPackage } from 'react-native-purchases';

export interface NyangkkureomiPackage {
  id: string;
  title: string;
  description: string;
  price: string;
  periodLabel: string;
  nativePackage: PurchasesPackage;
}

export interface NyangkkureomiPaymentState {
  isAvailable: boolean;
  isLoading: boolean;
  isPurchasing: boolean;
  hasNyangkkureomi: boolean;
  errorMessage: string | null;
  packages: NyangkkureomiPackage[];
}
