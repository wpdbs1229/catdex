export const MAX_SAVED_NEIGHBORHOODS = 5;

export interface SavedNeighborhood {
  id: string;
  name: string;
  city: string;
  district: string;
  lat: number;
  lng: number;
  radius: number;
  cats: string[];
  verifiedAt: string;
}
