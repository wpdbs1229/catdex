"""검수된 방 셸 캘리브레이션으로 shells.generated.ts를 만든다.

생성형 셸은 단계마다 가로·세로 축 한 칸의 실제 픽셀 길이가 달라 색상 극값만으로
tileW를 역산하면 비정사각 격자의 원점이 틀어진다. 아래 값은 각 원본에 격자를 직접
오버레이해 확인한 뒤 고정한 정본이다. 스크립트는 이미지 크기·alpha bbox가 바뀌면
즉시 실패해 조용히 좌표가 어긋나는 일을 막는다.
"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SHELLS = ROOT / 'assets' / 'support-room-v3' / 'shells'
OUT = ROOT / 'src' / 'features' / 'support-room-v3' / 'render' / 'shells.generated.ts'

CALIBRATION = {
    # stage0은 8×6일 때 세로 칸이 가로보다 31% 길어 칸이 정사각형이 아니었다.
    # 가구 아트는 정사각형 칸을 전제로 그려지므로 8×8로 나눠 비율을 0.98로 맞춘다.
    # (바닥 그림은 그대로다. 같은 마름모를 몇 칸으로 쪼개느냐만 바뀐다.)
    'stage0': dict(cols=8, rows=8, bbox=(48, 77, 1206, 1177), origin=(619, 497),
                   axis_x=(72.625, 38.875), axis_y=(-71.0, 38.875), annex=False),
    'stage1': dict(cols=10, rows=8, bbox=(29, 142, 1236, 1169), origin=(564, 466),
                   axis_x=(66.9, 35), axis_y=(-66.625, 39.625), annex=False),
    # stage2도 세로 칸이 짧아 정사각형이 아니었다(비율 0.778).
    # 같은 바닥을 8행으로 나누면 0.97이 된다.
    'stage2': dict(cols=12, rows=8, bbox=(23, 144, 1237, 1130), origin=(491, 407),
                   axis_x=(61.75, 32.5), axis_y=(-58.25, 34.75), annex=False),
    # 세로 칸이 훨씬 짧았다(비율 0.588). 7행으로 나누면 1.008이다.
    'stage3': dict(cols=14, rows=7, bbox=(0, 173, 1239, 1254), origin=(409, 398),
                   axis_x=(59.143, 29.071), axis_y=(-55.857, 36.0), annex=False),
    # 비율 0.506. 6행으로 나누면 1.012다.
    'stage4': dict(cols=14, rows=6, bbox=(15, 238, 1235, 1056), origin=(363, 429),
                   axis_x=(62.143, 26), axis_y=(-57.666, 36.334), annex=True),
}


def number(value: float) -> str:
    return f'{value:g}'


rows = []
for stage, calibration in CALIBRATION.items():
    path = SHELLS / f'{stage}.webp'
    image = Image.open(path).convert('RGBA')
    if image.size != (1254, 1254):
        raise SystemExit(f'{stage}: 1254×1254 원본이 필요하지만 {image.size}입니다')
    actual_bbox = image.getbbox()
    if actual_bbox != calibration['bbox']:
        raise SystemExit(f'{stage}: alpha bbox 변경 {actual_bbox} != {calibration["bbox"]}')

    left, top, right, bottom = calibration['bbox']
    ox, oy = calibration['origin']
    xx, xy = calibration['axis_x']
    yx, yy = calibration['axis_y']
    rows.append(f"""  {stage}: {{
    cols: {calibration['cols']},
    rows: {calibration['rows']},
    imageW: 1254,
    imageH: 1254,
    artBounds: {{ x: {left}, y: {top}, width: {right-left}, height: {bottom-top} }},
    origin: {{ x: {number(ox)}, y: {number(oy)} }},
    axisX: {{ x: {number(xx)}, y: {number(xy)} }},
    axisY: {{ x: {number(yx)}, y: {number(yy)} }},
    hasAnnex: {str(calibration['annex']).lower()},
  }}""")

stages = ' | '.join(f"'{stage}'" for stage in CALIBRATION)
body = ',\n'.join(rows)
OUT.write_text(f"""/**
 * 이 파일은 scripts/measure-room-shells.py가 생성한다. 손으로 고치지 말 것.
 * 각 단계의 바닥 뒤쪽 꼭짓점과 두 축의 한 칸 벡터를 실측한 결과다.
 */

export type RoomStage = {stages};

export interface ShellPoint {{ x: number; y: number }}
export interface ShellBounds {{ x: number; y: number; width: number; height: number }}
export interface ShellGeometry {{
  cols: number;
  rows: number;
  imageW: number;
  imageH: number;
  artBounds: ShellBounds;
  origin: ShellPoint;
  axisX: ShellPoint;
  axisY: ShellPoint;
  hasAnnex: boolean;
}}

export const SHELL_GEOMETRY: Record<RoomStage, ShellGeometry> = {{
{body},
}};
""", encoding='utf-8')
print(f'generated: {OUT.relative_to(ROOT)}')
