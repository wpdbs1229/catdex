# 가구 스프라이트의 실제 내용 영역을 재서 아이소 배치 앵커를 만든다.
#
# 512×512 원본은 가구 주위에 여백이 있고 여백 크기가 제각각이라, 이미지 사각형을
# 그대로 셀에 맞추면 가구가 그리드에서 뜨거나 겹친다(실측 확인).
# 내용 bbox와 metadata의 baselineY(접지선)를 함께 저장해 렌더러가
# "footprint 다이아 위에 접지선을 맞춰" 배치하도록 한다.
import json
import os
from PIL import Image

PKG = os.path.expanduser('~/Documents/냥도감/대한냥냥공사_고객지원실_MVP_패키지/assets/v2')
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
OUT = os.path.join(ROOT, 'src/features/support-room-v3/render/furniture-anchors.generated.ts')

catalog = json.load(open(f'{PKG}/manifests/catalog-v2.json'))
rows = []

for entry in catalog['furniture']:
    fid = entry['id']
    meta = json.load(open(f'{PKG}/furniture/{fid}/metadata.json'))
    img = Image.open(f'{PKG}/{entry["assetPath"]}').convert('RGBA')
    w, h = img.size
    bbox = img.getbbox()  # 투명 여백을 제외한 실제 그림 영역
    if bbox is None:
        bbox = (0, 0, w, h)
    x0, y0, x1, y1 = bbox

    rows.append({
        'id': fid,
        # 정규화된 내용 영역 (0~1)
        'contentX': round(x0 / w, 4),
        'contentY': round(y0 / h, 4),
        'contentW': round((x1 - x0) / w, 4),
        'contentH': round((y1 - y0) / h, 4),
        # 접지선: 이미지 높이 대비 비율. metadata 기준이 내용 영역 밖이면 내용 하단으로.
        'baselineY': round(min(meta['baselineY'], y1 / h), 4),
        'footprintW': meta['footprint']['width'],
        'footprintD': meta['footprint']['depth'],
    })

body = ',\n'.join(
    '  %s: { contentX: %s, contentY: %s, contentW: %s, contentH: %s, baselineY: %s, footprintW: %d, footprintD: %d }'
    % (r['id'], r['contentX'], r['contentY'], r['contentW'], r['contentH'],
       r['baselineY'], r['footprintW'], r['footprintD'])
    for r in rows
)

source = f"""/**
 * 이 파일은 scripts/measure-furniture-anchors.py가 생성한다. 손으로 고치지 말 것.
 * 각 가구 스프라이트의 내용 영역(투명 여백 제외)과 접지선 비율.
 */
import type {{ FurnitureId }} from '@/features/support-room-v2/domain/furniture';

export interface FurnitureAnchor {{
  /** 정규화된 내용 영역 (이미지 크기 대비 0~1) */
  contentX: number;
  contentY: number;
  contentW: number;
  contentH: number;
  /** 이미지 높이 대비 접지선 위치 */
  baselineY: number;
  footprintW: number;
  footprintD: number;
}}

export const FURNITURE_ANCHORS: Record<FurnitureId, FurnitureAnchor> = {{
{body},
}};
"""

open(OUT, 'w').write(source)
print(f'generated: {os.path.relpath(OUT, ROOT)} ({len(rows)} entries)')
for r in rows[:4]:
    print(f"  {r['id']}: content {r['contentW']}×{r['contentH']} baseline {r['baselineY']}")
