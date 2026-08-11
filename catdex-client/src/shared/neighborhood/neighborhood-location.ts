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

/**
 * 좌표를 약 500m 격자의 중심으로 스냅한다.
 *
 * 동네 좌표는 서버에 남아 구역 중심이 되므로, 처음 기록한 사람의 실제 위치가
 * 그대로 박히면 안 된다. 정방향 지오코딩이 실패했을 때만 쓰는 보루다.
 */
const NEIGHBORHOOD_GRID = 0.005;

function snapToNeighborhoodGrid(value: number) {
  return Number((Math.round(value / NEIGHBORHOOD_GRID) * NEIGHBORHOOD_GRID).toFixed(4));
}

/**
 * 동네 이름을 정방향 지오코딩해서 그 동네의 중심 좌표를 얻는다.
 *
 * 사용자가 어디에 서 있든 같은 동네면 같은 좌표가 나온다. 그래야 구역 중심이
 * 사람이 아니라 동네를 가리킨다. 실패하면 null을 돌려 호출 쪽이 격자 스냅으로
 * 넘어가게 한다.
 */
async function geocodeNeighborhoodCenter(query: string) {
  try {
    const [match] = await Location.geocodeAsync(query);

    if (!match) {
      return null;
    }

    return { lat: match.latitude, lng: match.longitude };
  } catch {
    return null;
  }
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

    // 동네 중심을 먼저 구하고, 못 구하면 내 위치를 격자로 뭉갠 값을 쓴다.
    // 어느 쪽이든 서버에 가는 건 "동네를 가리키는 점"이지 "내가 선 자리"가 아니다.
    const center =
      (await geocodeNeighborhoodCenter([city, district, neighborhoodName].filter(Boolean).join(' '))) ??
      { lat: snapToNeighborhoodGrid(latitude), lng: snapToNeighborhoodGrid(longitude) };

    return {
      neighborhood: {
        id: createNeighborhoodId(city, district, neighborhoodName),
        name: neighborhoodName,
        city,
        district,
        lat: center.lat,
        lng: center.lng,
        radius: 650,
        cats: [],
        verifiedAt,
      },
    };
  }

  throw new Error('현재 위치에서 행정동 이름을 확인하지 못했어요.');
}
