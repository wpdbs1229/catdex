"""아이소 방(stage0~4)의 바닥·벽에 입힐 표면 오버레이를 굽는다.

기존 make-surface-overlays.py는 옛 가로 방(3859x2166) 전용이라 아이소 셸에
쓸 수 없었다. 여기서는 격자 기저를 그대로 써서 타일을 바닥면·벽면에 눕힌다.

아이소 투영은 어파인이라 역행렬 한 번이면 화면 픽셀 -> 격자 좌표가 나온다.
그 좌표로 타일을 샘플링하면 나뭇결이 격자 축을 따라 흐른다(축과 무관하게
가로세로로 깔면 방향이 어긋나 보인다).

음영은 셸 원본의 밝기를 크게 흐려서 비율로 곱한다. 구석 그림자와 창가
밝기는 남고, 창틀·유리 같은 잔무늬는 넘어오지 않는다(그대로 곱했더니
창 주변 벽지가 하얗게 떴다).

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


def open_thin(mask, radius=2):
    """얇은 조각을 떨군다. 창살·문 유리가 벽으로 잡히는 걸 막는다."""
    im = Image.fromarray((mask * 255).astype(np.uint8))
    im = im.filter(ImageFilter.MinFilter(radius * 2 + 1)).filter(ImageFilter.MaxFilter(radius * 2 + 1))
    return np.asarray(im) > 127


def close_holes(mask, radius=3):
    im = Image.fromarray((mask * 255).astype(np.uint8))
    im = im.filter(ImageFilter.MaxFilter(radius * 2 + 1)).filter(ImageFilter.MinFilter(radius * 2 + 1))
    return np.asarray(im) > 127


def feather(mask, blur=1.0):
    im = Image.fromarray((mask * 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(blur))).astype(np.float32) / 255.0


def hsv(rgb):
    r, g, b = np.moveaxis(rgb, -1, 0) / 255.0
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    d = np.maximum(mx - mn, 1e-6)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4))
    return h / 6.0, np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0), mx


def build_stage(stage, g):
    shell = np.asarray(Image.open(f'{SHELLS}/{stage}.webp').convert('RGBA')).astype(np.float32)
    H, W = shell.shape[:2]
    rgb, alpha = shell[..., :3], shell[..., 3]
    lum = 0.299 * rgb[..., 0] + 0.587 * rgb[..., 1] + 0.114 * rgb[..., 2]
    hue, sat, val = hsv(rgb)
    u, v = grid_coords(g, H, W)

    # 바닥: 격자 한가운데 색을 기준으로 같은 색조인 픽셀. 칸 단위 표를 쓰면
    # 가장자리가 칸 경계로 잘려 방 밖으로 삐져나오거나 원래 바닥이 띠로
    # 남는다. 픽셀 단위로 잡으면 방 외곽선과 1px까지 맞는다.
    cx = int(g['ox'] + g['cols'] / 2 * g['axx'] + g['rows'] / 2 * g['ayx'])
    cy = int(g['oy'] + g['cols'] / 2 * g['axy'] + g['rows'] / 2 * g['ayy'])
    patch = np.s_[cy - 6:cy + 7, cx - 6:cx + 7]
    h0, s0, v0 = np.median(hue[patch]), np.median(sat[patch]), np.median(val[patch])
    # 격자 안으로 가둔다. 크림색 벽이 밝은 나무 바닥과 색조가 거의 같아,
    # 색만 보면 바닥재가 벽 위까지 깔렸다.
    in_grid = (u > -0.15) & (u < g['cols'] + 0.15) & (v > -0.15) & (v < g['rows'] + 0.15)
    floor = (
        in_grid & (alpha > 200) & (np.abs(hue - h0) < 0.05)
        & (sat > s0 * 0.58) & (sat < s0 * 1.6) & (val > v0 * 0.60)
    )
    floor = close_holes(floor, 2) & in_grid

    # 벽: 징두리 위 크림색. 실측값 - 크림은 밝기 174~217에 R-B가 104~125,
    # 징두리(세이지)는 밝기 88에 R-B가 59, 몰딩·문틀은 밝기 113 언저리다.
    # 채도만 보면 그늘진 크림(0.53~0.57)과 징두리(0.59)가 붙어버려 벽지가
    # 뜯겨 보였다. R-B를 같이 봐야 갈린다. 창밖 하늘·수풀은 R < B라 빠진다.
    maxc, minc = rgb.max(axis=2), rgb.min(axis=2)
    wsat = (maxc - minc) / np.maximum(maxc, 1)
    cream = (
        (lum > 145) & (wsat < 0.62) & (rgb[..., 0] > rgb[..., 2] + 75)
        & (alpha > 200) & ~in_grid & ~floor
    )
    cream = close_holes(open_thin(cream, 2), 3)

    floor_alpha = feather(floor.astype(np.float32))
    wall_alpha = feather(cream.astype(np.float32))

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

    # 큰 흐림으로 남긴 대역 조명만 쓴다. 잔무늬가 남으면 창틀이 벽지에 비친다.
    soft = np.asarray(Image.fromarray(lum.astype(np.uint8))
                      .filter(ImageFilter.GaussianBlur(24))).astype(np.float32)

    os.makedirs(f'{OUT}/{stage}', exist_ok=True)
    for surface_id in FLOORING + WALLPAPER:
        is_floor = surface_id.startswith('flooring')
        mask = floor_alpha if is_floor else wall_alpha
        area = mask > 0.5
        tile = np.asarray(Image.open(f'{TILES}/{surface_id}.webp').convert('RGB')).astype(np.float32)
        tiled = sample_tile(tile, u if is_floor else along, v if is_floor else height)
        shade = np.clip(soft / max(soft[area].mean() if area.any() else 180.0, 1), 0.72, 1.18)
        out = np.dstack([np.clip(tiled * shade[..., None], 0, 255), mask * 255]).astype(np.uint8)
        Image.fromarray(out, 'RGBA').save(f'{OUT}/{stage}/{surface_id}.webp', 'WEBP', quality=80)

    return int(area.sum()), int((floor_alpha > 0.5).sum()), int((wall_alpha > 0.5).sum())


def main():
    geo = read_geometry()
    for stage, g in geo.items():
        _, floor_px, wall_px = build_stage(stage, g)
        print(f'{stage}: 바닥 {floor_px:>7} px, 벽 {wall_px:>7} px')
    print('done ->', OUT)


if __name__ == '__main__':
    main()
