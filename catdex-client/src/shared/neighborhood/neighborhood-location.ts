import * as Location from 'expo-location';
import type { SavedNeighborhood } from '@/shared/types/neighborhood';

export interface NeighborhoodDetectionResult {
  neighborhood: SavedNeighborhood;
  notice?: string;
}

/**
 * 역지오코딩 결과에서 법정동 이름을 그대로 뽑는다.
 * "태평로1가"의 가 번호까지 남기는 것이 법정동 이름이다. 구역을 견주는 쪽
 * (neighborhood-match)은 따로 가 번호를 떼고 비교하므로, 태평로1가에 사는
 * 사람도 태평로2가 구역의 고양이를 계속 본다.
 */
function normalizeKoreanNeighborhoodName(value: string) {
  const compact = value.replace(/\s+/g, '');
  const match = compact.match(/[가-힣0-9]+(?:동\d+가|동|읍|면|리|가)$/);

  if (!match) {
    return null;
  }

  return match[0];
}

function pickAddressPart(...parts: Array<string | null | undefined>) {
  return parts.find((part) => typeof part === 'string' && part.trim().length > 0)?.trim() ?? '';
}

function resolveNeighborhoodName(address: Location.LocationGeocodedAddress) {
  const candidates = [
    address.district,
    address.name,
    address.street,
    address.subregion,
    address.formattedAddress,
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const normalized = normalizeKoreanNeighborhoodName(candidate);

    if (normalized) {
      return normalized;
    }
  }

  return null;
}

function createNeighborhoodId(city: string, district: string, name: string) {
  // 법정동을 그대로 쓰면 district가 시·도로 밀려 city와 겹치는 경우가 있다.
  // 같은 조각이 두 번 들어가면 "서울특별시-서울특별시-태평로1가"가 되므로 접는다.
  return Array.from(new Set([city, district, name].filter(Boolean)))
    .join('-')
    .replace(/\s+/g, '-')
    .toLowerCase();
}

export async function detectCurrentNeighborhood(): Promise<NeighborhoodDetectionResult> {
  const permission = await Location.requestForegroundPermissionsAsync();

  if (permission.status !== 'granted') {
    throw new Error('위치 권한을 허용하면 현재 위치 기준으로 동네를 추가할 수 있어요.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  const { latitude, longitude } = position.coords;
  const verifiedAt = new Date().toISOString();
  const addresses = await Location.reverseGeocodeAsync({
    latitude,
    longitude,
  }).catch(() => []);
  const address = addresses[0];
  const neighborhoodName = address ? resolveNeighborhoodName(address) : null;

  if (address && neighborhoodName) {
    const city = pickAddressPart(address.city, address.region, '현재 위치');
    const district = pickAddressPart(
      address.subregion && address.subregion !== neighborhoodName ? address.subregion : null,
      address.district && address.district !== neighborhoodName ? address.district : null,
      city,
    );

    return {
      neighborhood: {
        id: createNeighborhoodId(city, district, neighborhoodName),
        name: neighborhoodName,
        city,
        district,
        lat: latitude,
        lng: longitude,
        radius: 650,
        cats: [],
        verifiedAt,
      },
    };
  }

  throw new Error('현재 위치에서 행정동 이름을 확인하지 못했어요.');
}
