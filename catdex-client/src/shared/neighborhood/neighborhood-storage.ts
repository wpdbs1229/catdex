import AsyncStorage from '@react-native-async-storage/async-storage';
import { MAX_SAVED_NEIGHBORHOODS, type SavedNeighborhood } from '@/shared/types/neighborhood';

const STORAGE_KEY = 'catdex.neighborhoods.v1';

interface StoredNeighborhoodState {
  activeNeighborhoodId: string;
  savedNeighborhoods: SavedNeighborhood[];
}

function sanitizeNeighborhoods(value: SavedNeighborhood[]) {
  const seen = new Set<string>();
  const neighborhoods: SavedNeighborhood[] = [];

  for (const neighborhood of value) {
    if (!neighborhood.id || seen.has(neighborhood.id)) {
      continue;
    }

    seen.add(neighborhood.id);
    neighborhoods.push({
      ...neighborhood,
      cats: [],
    });

    if (neighborhoods.length >= MAX_SAVED_NEIGHBORHOODS) {
      break;
    }
  }

  return neighborhoods;
}

export async function loadNeighborhoodState(): Promise<StoredNeighborhoodState> {
  const rawValue = await AsyncStorage.getItem(STORAGE_KEY);

  if (!rawValue) {
    return {
      activeNeighborhoodId: '',
      savedNeighborhoods: [],
    };
  }

  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredNeighborhoodState>;
    const savedNeighborhoods = sanitizeNeighborhoods(parsed.savedNeighborhoods ?? []);
    const activeNeighborhoodId = savedNeighborhoods.some((neighborhood) => neighborhood.id === parsed.activeNeighborhoodId)
      ? (parsed.activeNeighborhoodId as string)
      : (savedNeighborhoods[0]?.id ?? '');

    return {
      activeNeighborhoodId,
      savedNeighborhoods,
    };
  } catch {
    return {
      activeNeighborhoodId: '',
      savedNeighborhoods: [],
    };
  }
}

export async function saveNeighborhoodState(state: StoredNeighborhoodState) {
  await AsyncStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      activeNeighborhoodId: state.activeNeighborhoodId,
      savedNeighborhoods: sanitizeNeighborhoods(state.savedNeighborhoods),
    }),
  );
}
