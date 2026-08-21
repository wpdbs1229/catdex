"""단계별로 "어느 칸이 실제 바닥인가"를 셸에서 재서 마스크로 굽는다.

격자는 사각형이지만 방은 그렇지 않다. 별관이 붙은 L자도 있고, 사각인 방도
가장자리 칸이 나무 테두리에 걸쳐 반쯤 허공이다. 칸 하나하나를 셸 픽셀로
확인해서 표로 남긴다.

칸 안쪽을 4x4로 찍어 과반이 바닥색이면 바닥으로 본다. 바닥색은 상수가 아니라
격자 한가운데(어느 방에서든 바닥인 지점)에서 재온다. 단계마다 바닥이 달라
- 0단계는 밝은 나무, 4단계는 진한 주황 - 임계값을 하나로 박으면 한쪽
가장자리가 통째로 허공이 되고, 방 안에 놓은 가구가 "방 밖으로 나갔다"고
거절당했다. 벽의 크림색 판은 색조가 비슷해도 채도가 낮고, 나무 테두리는
색조가 같아도 어두워서 기준색 대비 비율로 갈린다.

5단계 L자의 빈 노치, 본실과 별실을 가르는 벽은 이걸로 같이 빠진다.

사용: python3 scripts/measure-floor-masks.py
출력: src/features/support-room-v3/render/floor-masks.generated.ts
"""
import os
import re

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SHELLS = f'{ROOT}/assets/support-room-v3/shells'
GEN = f'{ROOT}/src/features/support-room-v3/render'


def geometry():
    src = open(f'{GEN}/shells.generated.ts').read()
    out = {}
    for block in re.finditer(r'(stage\d): \{(.*?)\n  \},', src, re.S):
        stage, body = block.group(1), block.group(2)
        num = lambda p: float(re.search(p, body).group(1))
        out[stage] = dict(
            cols=int(num(r'cols: (\d+)')), rows=int(num(r'rows: (\d+)')),
            ox=num(r'origin: \{ x: (-?[\d.]+)'),
            oy=num(r'origin: \{ x: -?[\d.]+, y: (-?[\d.]+)'),
            axx=num(r'axisX: \{ x: (-?[\d.]+)'),
            axy=num(r'axisX: \{ x: -?[\d.]+, y: (-?[\d.]+)'),
            ayx=num(r'axisY: \{ x: (-?[\d.]+)'),
            ayy=num(r'axisY: \{ x: -?[\d.]+, y: (-?[\d.]+)'),
        )
    return out


def _hsv(rgb):
    r, g, b = np.moveaxis(rgb, -1, 0) / 255.0
    mx, mn = np.maximum(np.maximum(r, g), b), np.minimum(np.minimum(r, g), b)
    d = np.maximum(mx - mn, 1e-6)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4))
    return h / 6.0, np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0), mx


def mask_for(stage, g):
    rgba = np.asarray(Image.open(f'{SHELLS}/{stage}.webp').convert('RGBA'))
    hue, sat, val = _hsv(rgba[..., :3].astype(float))
    alpha = rgba[..., 3]
    H, W = alpha.shape

    cx = int(g['ox'] + g['cols'] / 2 * g['axx'] + g['rows'] / 2 * g['ayx'])
    cy = int(g['oy'] + g['cols'] / 2 * g['axy'] + g['rows'] / 2 * g['ayy'])
    patch = np.s_[cy - 6:cy + 7, cx - 6:cx + 7]
    h0, s0, v0 = np.median(hue[patch]), np.median(sat[patch]), np.median(val[patch])
    is_floor = (
        (alpha > 32) & (np.abs(hue - h0) < 0.045)
        & (sat > s0 * 0.62) & (sat < s0 * 1.55) & (val > v0 * 0.72)
    )

    probes = [(i + 0.5) / 4 for i in range(4)]
    rows = []
    for y in range(g['rows']):
        line = ''
        for x in range(g['cols']):
            hits = 0
            for fu in probes:
                for fv in probes:
                    px = int(round(g['ox'] + (x + fu) * g['axx'] + (y + fv) * g['ayx']))
                    py = int(round(g['oy'] + (x + fu) * g['axy'] + (y + fv) * g['ayy']))
                    if 0 <= py < H and 0 <= px < W and is_floor[py, px]:
                        hits += 1
            line += '.' if hits >= 8 else 'X'
        rows.append(line)
    return rows


def main():
    geo = geometry()
    lines = ["""import type { RoomStage } from './shells.generated';

/**
 * 칸마다 실제 바닥인지 표시한 표. '.'는 바닥, 'X'는 허공이다.
 *
 * 격자는 사각형인데 방은 아니다(별관이 붙은 L자, 나무 테두리에 걸친
 * 가장자리 칸). scripts/measure-floor-masks.py가 셸 픽셀에서 잰다.
 * 손으로 고치지 말 것.
 */
export const FLOOR_MASKS: Record<RoomStage, readonly string[]> = {"""]
    for stage in sorted(geo):
        rows = mask_for(stage, geo[stage])
        usable = sum(line.count('.') for line in rows)
        print(f"{stage}: {geo[stage]['cols']}x{geo[stage]['rows']} 중 바닥 {usable}칸")
        lines.append(f'  {stage}: [')
        for line in rows:
            lines.append(f"    '{line}',")
        lines.append('  ],')
    lines.append('};')
    lines.append('')
    lines.append("""export function isFloorCell(stage: RoomStage, x: number, y: number): boolean {
  const rows = FLOOR_MASKS[stage];
  const row = rows[Math.floor(y)];
  return row !== undefined && row[Math.floor(x)] === '.';
}""")
    open(f'{GEN}/floor-masks.generated.ts', 'w').write('\n'.join(lines) + '\n')
    print('generated:', f'{GEN}/floor-masks.generated.ts')


if __name__ == '__main__':
    main()
