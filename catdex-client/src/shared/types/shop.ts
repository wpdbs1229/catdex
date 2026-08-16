export type ShopItemCategory = 'background' | 'case' | 'label';

export interface ShopItem {
  id: string;
  category: ShopItemCategory;
  name: string;
  priceKrw: number;
  description?: string;
  /** 목록·미리보기의 작은 스와치. 없으면 카드 자산으로 대신 보여준다. */
  swatchImageUrl?: string;
  /** 실제로 고객 파일에 입힐 때 쓰는 자산. */
  assetImageUrl?: string;
  /** RevenueCat 상품 식별자. 없으면 아직 실결제 전이라 자리표시자 구매로 처리한다. */
  storeProductId?: string;
}

/** 카테고리별로 지금 장착된 상품. 비어 있으면 기본(순정) 모습이다. */
export interface UserEquipment {
  background?: ShopItem;
  case?: ShopItem;
  label?: ShopItem;
}
