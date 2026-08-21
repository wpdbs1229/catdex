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
    # 칸은 정사각형이면서 실제 0.5m여야 한다.
    #
    # 칸 수를 단계마다 비슷하게 두면 방이 넓어질수록 한 칸이 커진다. 실제로
    # stage4에서 한 칸이 1.46m가 되어 "2×2 책상"이 3m짜리가 됐다.
    # 셸마다 그려진 문 폭을 1m로 보고(문 그림은 단계가 달라도 같다) 칸이
    # 0.5m가 되도록 칸 수를 다시 잡았다. 다섯 단계 모두 0.48~0.51m다.
    #
    # 칸 수는 바닥 픽셀을 격자 좌표로 되돌려 몇 칸까지 뻗는지 재서 맞췄다.
    # 원래 보정값은 방보다 얕아서 stage4가 3행, stage3이 2행 모자랐다.
    'stage0': dict(cols=9, rows=9, bbox=(48, 77, 1206, 1177), origin=(619, 497),
                   axis_x=(64.5556, 34.5556), axis_y=(-63.1111, 34.5556), annex=False),
    'stage1': dict(cols=13, rows=11, bbox=(29, 142, 1236, 1169), origin=(564, 466),
                   axis_x=(51.4615, 26.9231), axis_y=(-48.4545, 28.8182), annex=False),
    # stage2도 세로 칸이 짧아 정사각형이 아니었다(비율 0.778).
    # 같은 바닥을 8행으로 나누면 0.97이 된다.
    'stage2': dict(cols=18, rows=13, bbox=(23, 144, 1237, 1130), origin=(491, 407),
                   axis_x=(41.1667, 21.6667), axis_y=(-38.8333, 23.1667), annex=False),
    # 세로 칸이 훨씬 짧았다(비율 0.588). 7행으로 나누면 1.008이다.
    'stage3': dict(cols=27, rows=14, bbox=(0, 173, 1239, 1254), origin=(409, 398),
                   axis_x=(30.6667, 15.0739), axis_y=(-30.0768, 19.3846), annex=False),
    # 비율 0.506. 6행으로 나누면 1.012다.
    'stage4': dict(cols=40, rows=20, bbox=(15, 238, 1235, 1056), origin=(363, 429),
                   axis_x=(21.2196, 8.878), axis_y=(-19.222, 12.1113), annex=True),
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
