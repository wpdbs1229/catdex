const KOREAN_NEIGHBORHOOD_PATTERN = /[가-힣0-9]+(?:동\d가|동|읍|면|리|가)/g;

function stripDecorations(value: string) {
  return value.replace(/근처/g, ' ').replace(/[()]/g, ' ').trim();
}

export function normalizeNeighborhoodNameForMatch(value: string) {
  const parts = stripDecorations(value)
    .split(/[\s,·/|>-]+/)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts.slice().reverse()) {
    const matches = part.match(KOREAN_NEIGHBORHOOD_PATTERN);

    if (matches && matches.length > 0) {
      return matches[matches.length - 1].replace(/\d+가$/, '');
    }
  }

  const compact = stripDecorations(value).replace(/\s+/g, '');
  const matches = compact.match(KOREAN_NEIGHBORHOOD_PATTERN);

  if (!matches || matches.length === 0) {
    return compact;
  }

  return matches[matches.length - 1].replace(/\d+가$/, '');
}

export function isMatchingNeighborhoodName(left: string, right: string) {
  const normalizedLeft = normalizeNeighborhoodNameForMatch(left);
  const normalizedRight = normalizeNeighborhoodNameForMatch(right);

  if (!normalizedLeft || !normalizedRight) {
    return false;
  }

  return normalizedLeft === normalizedRight;
}

export function uniqueNeighborhoodRegionNames(neighborhoodName: string, regionNames: string[]) {
  return Array.from(
    new Set(
      [neighborhoodName, normalizeNeighborhoodNameForMatch(neighborhoodName), ...regionNames, ...regionNames.map(normalizeNeighborhoodNameForMatch)]
        .map((name) => name.trim())
        .filter(Boolean),
    ),
  );
}
