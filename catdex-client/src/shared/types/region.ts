export interface RegionCatPreview {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface Region {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius: number;
  cats: string[];
  catPreviews?: RegionCatPreview[];
}
