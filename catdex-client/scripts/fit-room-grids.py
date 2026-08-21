"""바닥 픽셀에서 단계별 격자(원점·축 길이)를 맞춘다.

지금까지 origin과 축은 손으로 넣은 근사값이라 격자가 방과 조금씩 어긋났다.
아이소 투영은 어파인이므로 축 방향만 맞으면 원점과 길이는 바닥에서 잴 수 있다.

방법: 현재 축 방향으로 모든 바닥 픽셀을 격자 좌표 (u, v)로 되돌린 뒤,
그 범위의 양 끝을 찾아 원점과 한 칸 길이를 다시 낸다. 방향은 그림이 정한
것이라 건드리지 않는다.

사용: python3 scripts/fit-room-grids.py [--apply]
      --apply를 주면 measure-room-shells.py의 보정표를 직접 고친다.
"""
import os
import re
import sys

import numpy as np
from PIL import Image
from scipy import ndimage
from scipy.spatial import ConvexHull

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHELLS = f'{ROOT}/assets/support-room-v3/shells'
SCRIPT = f'{ROOT}/scripts/measure-room-shells.py'


def calibration():
    src = open(SCRIPT).read()
    out = {}
    for m in re.finditer(
        r"'(stage\d)': dict\(cols=(\d+), rows=(\d+), bbox=\(([^)]+)\), origin=\((\d+), (\d+)\),\s*"
        r"axis_x=\(([-\d.]+), ([-\d.]+)\), axis_y=\(([-\d.]+), ([-\d.]+)\)", src
    ):
        out[m.group(1)] = dict(
            cols=int(m.group(2)), rows=int(m.group(3)),
            ox=float(m.group(5)), oy=float(m.group(6)),
            axx=float(m.group(7)), axy=float(m.group(8)),
            ayx=float(m.group(9)), ayy=float(m.group(10)),
        )
    return out, src


def floor_pixels(stage):
    """바닥 주황색 덩어리만 고른다.

    색만 보면 벽의 크림색 판·나무 몰딩까지 바닥으로 잡혀 격자가 천장까지
    늘어난다. 바닥은 파랑이 거의 없어 b로 갈린다. 5단계는 벽으로 나뉜
    두 칸짜리 L자 방이라 큰 덩어리를 모두 쓴다.
    """
    a = np.asarray(Image.open(f'{SHELLS}/{stage}.webp').convert('RGBA')).astype(float)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    floor = (al > 32) & (r > 195) & (g > 100) & (g < 175) & (b < 90)

    labels, n = ndimage.label(floor)
    sizes = ndimage.sum(floor, labels, range(1, n + 1))
    keep = [i + 1 for i, sz in enumerate(sizes) if sz > sizes.max() * 0.15]
    ys, xs = np.nonzero(np.isin(labels, keep))
    return xs.astype(float), ys.astype(float)


def axis_directions(xs, ys, c):
    """바닥 외곽선의 긴 모서리에서 두 축 방향을 잰다.

    손으로 넣은 방향은 몇 도씩 틀어져 있어 먼 구석에서 수십 px 벌어졌다.
    """
    pts = np.column_stack([xs, ys])
    hull = pts[ConvexHull(pts).vertices]
    edges = np.roll(hull, -1, axis=0) - hull
    lengths = np.hypot(edges[:, 0], edges[:, 1])
    dirs = edges / lengths[:, None]
    dirs[dirs[:, 1] < 0] *= -1  # 화면 아래로 내려가는 쪽으로 통일
    angles = np.arctan2(dirs[:, 1], dirs[:, 0])

    # 평균이 아니라 방향별 최장 모서리 하나. L자 방은 껍질이 노치를 가로지르는
    # 가짜 모서리를 만드는데, 평균을 내면 그게 축을 몇 도씩 끌고 간다.
    out = []
    for ref in (np.arctan2(c['axy'], c['axx']), np.arctan2(c['ayy'], c['ayx'])):
        near = np.flatnonzero(np.abs(angles - ref) < np.deg2rad(25))
        if not near.size:
            raise SystemExit(f'축 {np.rad2deg(ref):.1f}도 근처에 외곽선이 없다')
        best = near[np.argmax(lengths[near])]
        out.append((dirs[best, 0], dirs[best, 1]))
    (dxx, dxy), (dyx, dyy) = out
    return dxx, dxy, -abs(dyx), dyy


def fit(stage, c):
    xs, ys = floor_pixels(stage)
    axx, axy, ayx, ayy = axis_directions(xs, ys, c)

    det = axx * ayy - ayx * axy
    sx, sy = xs - c['ox'], ys - c['oy']
    u = (ayy * sx - ayx * sy) / det
    v = (axx * sy - axy * sx) / det
    # 양 끝은 소수의 이상치에 흔들리므로 분위수로 잡는다.
    u0, u1 = np.quantile(u, 0.0015), np.quantile(u, 0.9985)
    v0, v1 = np.quantile(v, 0.0015), np.quantile(v, 0.9985)

    kx, ky = (u1 - u0) / c['cols'], (v1 - v0) / c['rows']
    return dict(
        ox=round(c['ox'] + u0 * axx + v0 * ayx),
        oy=round(c['oy'] + u0 * axy + v0 * ayy),
        axx=round(axx * kx, 4), axy=round(axy * kx, 4),
        ayx=round(ayx * ky, 4), ayy=round(ayy * ky, 4),
        cell_x=kx, cell_y=ky,
    )


def main():
    cal, src = calibration()
    updates = {}
    for stage in sorted(cal):
        c = cal[stage]
        f = fit(stage, c)
        updates[stage] = f
        print(f"{stage}: origin ({c['ox']},{c['oy']}) -> ({f['ox']},{f['oy']})  "
              f"칸수 {c['cols']}x{c['rows']}  한 칸 {f['cell_x']:.1f}x{f['cell_y']:.1f}px")
        print(f"   axis_x=({f['axx']}, {f['axy']}), axis_y=({f['ayx']}, {f['ayy']})")

    if '--apply' not in sys.argv:
        print('\n--apply 를 주면 measure-room-shells.py에 반영한다.')
        return

    for stage, f in updates.items():
        src = re.sub(
            rf"('{stage}': dict\(cols=\d+, rows=\d+, bbox=\([^)]+\), origin=\()\d+, \d+(\),\s*"
            rf"axis_x=\()[-\d.]+, [-\d.]+(\), axis_y=\()[-\d.]+, [-\d.]+(\))",
            rf"\g<1>{f['ox']}, {f['oy']}\g<2>{f['axx']}, {f['axy']}\g<3>{f['ayx']}, {f['ayy']}\g<4>",
            src,
        )
    open(SCRIPT, 'w').write(src)
    print('\nmeasure-room-shells.py 갱신 - 이제 다시 실행해서 generated를 새로 뽑는다.')


if __name__ == '__main__':
    main()
