import type { Region } from '@/shared/types/region';

export interface PhotoCoordinates {
  latitude: number;
  longitude: number;
}

export interface RegionLocationSuggestion {
  regionName: string;
  distanceMeters: number;
  isWithinRegion: boolean;
}

type ExifValue =
  | number
  | string
  | readonly number[]
  | readonly string[]
  | { numerator?: unknown; denominator?: unknown }
  | null
  | undefined;

const earthRadiusMeters = 6371000;

function toNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function parseDmsPart(value: unknown) {
  if (typeof value === 'object' && value !== null && 'numerator' in value && 'denominator' in value) {
    const numerator = toNumber(value.numerator);
    const denominator = toNumber(value.denominator);

    if (numerator !== null && denominator !== null && denominator !== 0) {
      return numerator / denominator;
    }
  }

  if (typeof value === 'string' && value.includes('/')) {
    const [numerator, denominator] = value.split('/').map(Number);

    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
      return numerator / denominator;
    }
  }

  return toNumber(value);
}

function parseDmsString(value: string) {
  const parts = value
    .split(',')
    .map((part) => parseDmsPart(part.trim()))
    .filter((part): part is number => part !== null);

  if (parts.length !== 3) {
    return null;
  }

  const [degrees, minutes, seconds] = parts;
  return degrees + minutes / 60 + seconds / 3600;
}

function parseCoordinate(value: ExifValue, ref: ExifValue) {
  let coordinate: number | null = null;

  if (Array.isArray(value)) {
    const [degrees, minutes, seconds] = value.map(parseDmsPart);

    if (degrees !== null && minutes !== null && seconds !== null) {
      coordinate = degrees + minutes / 60 + seconds / 3600;
    }
  } else if (typeof value === 'string' && value.includes(',')) {
    coordinate = parseDmsString(value);
  } else {
    coordinate = parseDmsPart(value);
  }

  if (coordinate === null) {
    return null;
  }

  const direction = typeof ref === 'string' ? ref.toUpperCase() : '';
  return direction === 'S' || direction === 'W' ? -Math.abs(coordinate) : coordinate;
}

export function extractCoordinatesFromExif(exif: Record<string, unknown> | null | undefined): PhotoCoordinates | null {
  if (!exif) {
    return null;
  }

  const latitudeValue = exif.GPSLatitude ?? exif.gpsLatitude ?? exif.latitude ?? exif.Latitude;
  const longitudeValue = exif.GPSLongitude ?? exif.gpsLongitude ?? exif.longitude ?? exif.Longitude;
  const latitudeRef = exif.GPSLatitudeRef ?? exif.gpsLatitudeRef ?? exif.latitudeRef ?? exif.LatitudeRef;
  const longitudeRef = exif.GPSLongitudeRef ?? exif.gpsLongitudeRef ?? exif.longitudeRef ?? exif.LongitudeRef;
  const latitude = parseCoordinate(latitudeValue as ExifValue, latitudeRef as ExifValue);
  const longitude = parseCoordinate(longitudeValue as ExifValue, longitudeRef as ExifValue);

  if (latitude === null || longitude === null) {
    return null;
  }

  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
    return null;
  }

  return { latitude, longitude };
}

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function getDistanceMeters(from: PhotoCoordinates, to: PhotoCoordinates) {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) * Math.sin(longitudeDelta / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

export function suggestRegionFromCoordinates(coordinates: PhotoCoordinates | null, regions: Region[]): RegionLocationSuggestion | null {
  if (!coordinates || regions.length === 0) {
    return null;
  }

  const nearest = regions
    .map((region) => ({
      region,
      distanceMeters: getDistanceMeters(coordinates, {
        latitude: region.lat,
        longitude: region.lng,
      }),
    }))
    .sort((a, b) => a.distanceMeters - b.distanceMeters)[0];

  if (!nearest) {
    return null;
  }

  return {
    regionName: nearest.region.name,
    distanceMeters: nearest.distanceMeters,
    isWithinRegion: nearest.distanceMeters <= nearest.region.radius,
  };
}
