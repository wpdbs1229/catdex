/**
 * 고양이가 어디서 사는지.
 *
 * 사진에서 유도할 수 없고 사람이 알고 골라야 하는 값이라 서버에 저장한다
 * (cats.habitat). 등록한 사람이 정하고 이후에는 바뀌지 않으며, 모든 사용자가
 * 같은 값을 본다.
 *
 * 컬러·무늬와 같은 방식으로 데이터에는 영문 id를 두고 한국어는 여기서 붙인다.
 * 문구를 다듬을 때 마이그레이션이 필요해지면 안 된다.
 */
export const CAT_HABITATS = ['house', 'street', 'shelter'] as const;

export type CatHabitat = (typeof CAT_HABITATS)[number];

export const CAT_HABITAT_LABELS: Record<CatHabitat, string> = {
  house: '집냥이',
  street: '길냥이',
  shelter: '보호소냥이',
};

/** 길고양이 도감이라 길냥이가 기본이다. */
export const DEFAULT_CAT_HABITAT: CatHabitat = 'street';

/**
 * 서버에서 온 문자열을 거처로 읽는다.
 *
 * 서버에 check 제약이 있어 모르는 값이 올 일은 없지만, 나중에 값을 늘릴 때
 * 옛 앱이 그 값을 만나면 화면이 비어버린다. 그때 카드가 사라지느니 길냥이로
 * 보이는 편이 낫다.
 */
export function toCatHabitat(value: string | null | undefined): CatHabitat {
  return CAT_HABITATS.includes(value as CatHabitat) ? (value as CatHabitat) : DEFAULT_CAT_HABITAT;
}
