export interface Region {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  catIds: string[];
  cats: string[];
}
