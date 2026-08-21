"""아이소 방(stage0~4)의 바닥·벽에 입힐 표면 오버레이를 굽는다.

기존 make-surface-overlays.py는 옛 가로 방(3859x2166) 전용이라 아이소 셸에
쓸 수 없었다. 여기서는 격자 기저를 그대로 써서 타일을 바닥면·벽면에 눕힌다.

아이소 투영은 어파인이라 역행렬 한 번이면 화면 픽셀 -> 격자 좌표가 나온다.
그 좌표로 타일을 샘플링하면 나뭇결이 격자 축을 따라 흐른다(축과 무관하게
가로세로로 깔면 방향이 어긋나 보인다).

음영은 셸 원본의 밝기 비율을 곱해 그대로 옮긴다. 창가 하이라이트와
구석 그림자가 유지된다.

사용: python3 scripts/make-iso-surface-overlays.py
출력: assets/support-room-v3/surfaces/<stage>/<surfaceId>.webp
"""
import json
import os
import re

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHELLS = f'{ROOT}/assets/support-room-v3/shells'
TILES = f'{ROOT}/assets/support-room-v2/surfaces'
OUT = f'{ROOT}/assets/support-room-v3/surfaces'

FLOORING = ['flooring_honey_oak', 'flooring_cream_terrazzo', 'flooring_warm_gray_carpet']
WALLPAPER = ['wallpaper_cream_plaster', 'wallpaper_sage_linen', 'wallpaper_apricot_pinstripe']

# 타일 하나가 덮는 칸 수. 크면 무늬가 커진다.
CELLS_PER_TILE = 2.0
# 벽 타일의 세로 반복 높이(격자 칸 단위 환산). 바닥과 결이 비슷해 보이게 맞춘다.
WALL_TILE_CELLS = 2.0


def read_geometry():
    """생성된 shells.generated.ts에서 단계별 기저를 읽는다."""
    src = open(f'{ROOT}/src/features/support-room-v3/render/shells.generated.ts').read()
    out = {}
    for block in re.finditer(
        r"(stage\d): \{(.*?)\n  \},", src, re.S
    ):
        stage, body = block.group(1), block.group(2)
        def num(key):
            return float(re.search(rf'{key}: (-?[\d.]+)', body).group(1))
        out[stage] = dict(
            cols=int(num('cols')), rows=int(num('rows')),
            ox=float(re.search(r'origin: \{ x: (-?[\d.]+)', body).group(1)),
            oy=float(re.search(r'origin: \{ x: -?[\d.]+, y: (-?[\d.]+)', body).group(1)),
            axx=float(re.search(r'axisX: \{ x: (-?[\d.]+)', body).group(1)),
            axy=float(re.search(r'axisX: \{ x: -?[\d.]+, y: (-?[\d.]+)', body).group(1)),
            ayx=float(re.search(r'axisY: \{ x: (-?[\d.]+)', body).group(1)),
            ayy=float(re.search(r'axisY: \{ x: -?[\d.]+, y: (-?[\d.]+)', body).group(1)),
        )
    return out


def grid_coords(g, H, W):
    """화면 픽셀마다 격자 좌표 (u, v)를 낸다."""
    yy, xx = np.mgrid[0:H, 0:W]
    sx = xx - g['ox']
    sy = yy - g['oy']
    det = g['axx'] * g['ayy'] - g['ayx'] * g['axy']
    u = (g['ayy'] * sx - g['ayx'] * sy) / det
    v = (g['axx'] * sy - g['axy'] * sx) / det
    return u, v


def sample_tile(tile, tu, tv):
    """타일을 (tu, tv) 격자 좌표로 반복 샘플링한다."""
    th, tw = tile.shape[:2]
    px = np.mod(tu / CELLS_PER_TILE * tw, tw).astype(np.int32)
    py = np.mod(tv / CELLS_PER_TILE * th, th).astype(np.int32)
    return tile[py, px]


def clean(mask, blur=1.5, grow=3):
    im = Image.fromarray((mask * 255).astype(np.uint8))
    if grow:
        im = im.filter(ImageFilter.MaxFilter(grow * 2 + 1)).filter(ImageFilter.MinFilter(grow * 2 + 1))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(blur))).astype(np.float32) / 255.0


def build_stage(stage, g, voids):
    shell_img = Image.open(f'{SHELLS}/{stage}.webp').convert('RGBA')
    shell = np.asarray(shell_img).astype(np.float32)
    H, W = shell.shape[:2]
    rgb, alpha = shell[..., :3], shell[..., 3]
    lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]

    u, v = grid_coords(g, H, W)
    inside = (u >= 0) & (u <= g['cols']) & (v >= 0) & (v <= g['rows']) & (alpha > 32)
    for rect in voids:
        inside &= ~((u >= rect['x']) & (u < rect['x'] + rect['width']) &
                    (v >= rect['y']) & (v < rect['y'] + rect['depth']))
    floor_alpha = clean(inside.astype(np.float32))

    # 벽: 크림색 상단.
    #   따뜻한 크림이라 채도가 0.32~0.39까지 올라간다(처음에 0.22로 잡아 거의
    #   다 놓쳤다). 대신 붉은기(R > B)로 하늘·수풀을 가른다.
    #   징두리(세이지)와 몰딩(진한 우드)은 밝기에서 걸러진다.
    maxc = rgb.max(axis=2); minc = rgb.min(axis=2)
    sat = (maxc - minc) / np.maximum(maxc, 1)
    cream = (
        (lum > 168) & (sat < 0.42) & (rgb[..., 0] > rgb[..., 2] + 30) & (alpha > 32) & ~inside
    )
    wall_alpha = clean(cream.astype(np.float32), blur=1.2, grow=2)

    # 벽면 좌표: 왼쪽 벽은 axisY를 따라, 오른쪽 벽은 axisX를 따라 흐른다.
    yy, xx = np.mgrid[0:H, 0:W]
    left = xx < g['ox']
    along = np.where(left,
                     (xx - g['ox']) / np.where(g['ayx'] == 0, 1e-6, g['ayx']),
                     (xx - g['ox']) / np.where(g['axx'] == 0, 1e-6, g['axx']))
    height = np.where(left,
                      along * g['ayy'] - (yy - g['oy']),
                      along * g['axy'] - (yy - g['oy']))
    height = height / max(abs(g['axy']), abs(g['ayy'])) * WALL_TILE_CELLS

    os.makedirs(f'{OUT}/{stage}', exist_ok=True)
    for surface_id in FLOORING + WALLPAPER:
        is_floor = surface_id.startswith('flooring')
        mask = floor_alpha if is_floor else wall_alpha
        tile = np.asarray(Image.open(f'{TILES}/{surface_id}.webp').convert('RGB')).astype(np.float32)
        tiled = sample_tile(tile, u if is_floor else along, v if is_floor else height)

        area = mask > 0.5
        mean = lum[area].mean() if area.any() else 180.0
        shade = np.clip(lum / max(mean, 1), 0.45, 1.35)[..., None]
        out = np.dstack([np.clip(tiled * shade, 0, 255), mask * 255]).astype(np.uint8)
        Image.fromarray(out, 'RGBA').save(f'{OUT}/{stage}/{surface_id}.webp', 'WEBP', quality=80)

    # 검수용 미리보기: 빨강=바닥, 초록=벽
    preview = np.dstack([floor_alpha, wall_alpha, np.zeros_like(lum)]) * 255
    Image.fromarray(preview.astype(np.uint8)).save(f'{OUT}/{stage}/_mask-preview.png')

    return int((floor_alpha > 0.5).sum()), int((wall_alpha > 0.5).sum())


def main():
    geo = read_geometry()
    # stage4는 별관이 붙은 L자라 격자 일부가 허공이다(layout의 voidRects와 같은 값).
    voids = {'stage4': [{'x': 12, 'y': 2, 'width': 2, 'depth': 4}]}
    for stage, g in geo.items():
        floor_px, wall_px = build_stage(stage, g, voids.get(stage, []))
        print(f'{stage}: 바닥 {floor_px:>7} px, 벽 {wall_px:>7} px')
    print('done ->', OUT)


if __name__ == '__main__':
    main()
