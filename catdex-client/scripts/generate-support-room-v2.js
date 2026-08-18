#!/usr/bin/env node
/**
 * 고객지원실 V2 카탈로그·에셋 맵 생성기.
 *
 * 입력: 대한냥냥공사 패키지의 assets/v2 (catalog-v2.json + 가구별 metadata.json)
 * 출력:
 *   - src/features/support-room-v2/domain/catalog.generated.ts
 *   - src/features/support-room-v2/support-room-v2.assets.generated.ts
 *
 * 이미지 변환(png→webp)은 별도로 assets/support-room-v2에 두고, 이 스크립트는
 * 그 파일들이 존재하는지 검증만 한다.
 *
 * 사용: node scripts/generate-support-room-v2.js [패키지 assets/v2 경로]
 */
const fs = require('fs');
const path = require('path');

const SRC =
  process.argv[2] ??
  path.join(
    process.env.HOME,
    'Documents/냥도감/대한냥냥공사_고객지원실_MVP_패키지/assets/v2',
  );
const CLIENT = path.join(__dirname, '..');
const ASSET_DIR = path.join(CLIENT, 'assets/support-room-v2');
const OUT_DOMAIN = path.join(CLIENT, 'src/features/support-room-v2/domain/catalog.generated.ts');
const OUT_ASSETS = path.join(CLIENT, 'src/features/support-room-v2/support-room-v2.assets.generated.ts');

const catalog = JSON.parse(fs.readFileSync(path.join(SRC, 'manifests/catalog-v2.json'), 'utf8'));

function mustExist(rel) {
  const p = path.join(ASSET_DIR, rel);
  if (!fs.existsSync(p)) throw new Error(`누락된 에셋: assets/support-room-v2/${rel}`);
  return rel;
}

const specs = catalog.furniture.map((entry) => {
  const meta = JSON.parse(
    fs.readFileSync(path.join(SRC, `furniture/${entry.id}/metadata.json`), 'utf8'),
  );
  mustExist(`furniture/${entry.id}.webp`);
  mustExist(`furniture/thumbs/${entry.id}.webp`);
  return {
    id: entry.id,
    name: entry.name,
    group: entry.group,
    surface: entry.surface,
    footprint: { width: meta.footprint.width, depth: meta.footprint.depth },
    collisionMask: meta.collisionMask ?? [],
    approachAnchors: meta.approachAnchors ?? [],
    canFlipX: Boolean(meta.canFlipX),
    capacity: meta.capacity ?? 0,
    behaviors: entry.behaviors ?? [],
    layerMode: meta.layerMode,
    baselineY: meta.baselineY,
  };
});

const furnitureCatalog = catalog.furniture.map((f) => ({
  id: f.id,
  name: f.name,
  group: f.group,
  surface: f.surface,
  footprint: f.footprint,
  behaviors: f.behaviors ?? [],
  price: f.price,
  acquisition: f.acquisition,
  artStatus: f.artStatus,
  assetPath: f.assetPath,
}));

const surfaceCatalog = catalog.surfaces.map((s) => {
  mustExist(`surfaces/${s.id}.webp`);
  return { id: s.id, type: s.type, price: s.price, acquisition: s.acquisition, artStatus: s.artStatus, assetPath: s.assetPath };
});

mustExist('environment/support-room-shell-wide.webp');

const header = `/**
 * 이 파일은 scripts/generate-support-room-v2.js가 생성한다. 손으로 고치지 말 것.
 * 원본: 대한냥냥공사 패키지 assets/v2 (catalog-v2.json schemaVersion ${catalog.schemaVersion})
 */`;

const domainSource = `${header}
import type { CatalogFurnitureEntry, CatalogSurfaceEntry, FurnitureSpec } from './furniture';

export const FURNITURE_SPECS: readonly FurnitureSpec[] = ${JSON.stringify(specs, null, 2)};

export const FURNITURE_CATALOG: readonly CatalogFurnitureEntry[] = ${JSON.stringify(furnitureCatalog, null, 2)};

export const SURFACE_CATALOG: readonly CatalogSurfaceEntry[] = ${JSON.stringify(surfaceCatalog, null, 2)};
`;

const req = (rel) => `require('../../../assets/support-room-v2/${rel}')`;
const furnitureLines = catalog.furniture
  .map((f) => `  ${f.id}: ${req(`furniture/${f.id}.webp`)},`)
  .join('\n');
const thumbLines = catalog.furniture
  .map((f) => `  ${f.id}: ${req(`furniture/thumbs/${f.id}.webp`)},`)
  .join('\n');
const surfaceLines = catalog.surfaces
  .map((s) => `  ${s.id}: ${req(`surfaces/${s.id}.webp`)},`)
  .join('\n');

const assetsSource = `${header}
import type { FurnitureId, SurfaceId } from './domain/furniture';

type ImageSource = ReturnType<typeof require>;

export const V2_ROOM_SHELL: ImageSource = ${req('environment/support-room-shell-wide.webp')};

export const V2_FURNITURE_IMAGES: Record<FurnitureId, ImageSource> = {
${furnitureLines}
};

export const V2_FURNITURE_THUMBS: Record<FurnitureId, ImageSource> = {
${thumbLines}
};

export const V2_SURFACE_IMAGES: Record<SurfaceId, ImageSource> = {
${surfaceLines}
};
`;

fs.writeFileSync(OUT_DOMAIN, domainSource);
fs.writeFileSync(OUT_ASSETS, assetsSource);
console.log(`generated: ${path.relative(CLIENT, OUT_DOMAIN)} (${specs.length} specs)`);
console.log(`generated: ${path.relative(CLIENT, OUT_ASSETS)}`);
