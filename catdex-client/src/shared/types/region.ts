export interface Region {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  catIds: string[];
  cats: string[];
  /** 이 구역 안에서의 도감 번호. 고양이 id -> 구역별 번호(1부터, 결번 허용). */
  catDexNumbers: Record<string, number>;
}
