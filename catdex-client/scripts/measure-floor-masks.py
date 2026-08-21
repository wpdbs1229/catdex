"""단계별로 "어느 칸이 실제 바닥인가"를 셸에서 재서 마스크로 굽는다.

격자는 사각형이지만 방은 그렇지 않다. 별관이 붙은 L자도 있고, 사각인 방도
가장자리 칸이 나무 테두리에 걸쳐 반쯤 허공이다. 칸 하나하나를 셸 픽셀로
확인해서 표로 남긴다.

칸 중심 주변 5x5가 바닥색이면 바닥으로 본다. 색만 보면 뒷줄 그늘에서
바닥을 놓치므로, 격자 안쪽으로 한정하고 넉넉한 임계값을 쓴다.

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


def mask_for(stage, g):
    a = np.asarray(Image.open(f'{SHELLS}/{stage}.webp').convert('RGBA')).astype(float)
    r, gg, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    floor = (
        (al > 32) & (r > 195) & (gg > 105) & (gg < 205) & (b < 160)
        & ((r - b) > 75) & ((r - gg) > 25)
    )
    H, W = floor.shape
    rows = []
    for y in range(g['rows']):
        line = ''
        for x in range(g['cols']):
            px = g['ox'] + (x + 0.5) * g['axx'] + (y + 0.5) * g['ayx']
            py = g['oy'] + (x + 0.5) * g['axy'] + (y + 0.5) * g['ayy']
            ix, iy = int(round(px)), int(round(py))
            ok = (
                0 <= iy < H and 0 <= ix < W
                and floor[max(0, iy - 2):iy + 3, max(0, ix - 2):ix + 3].mean() > 0.6
            )
            line += '.' if ok else 'X'
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
