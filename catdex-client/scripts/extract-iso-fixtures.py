# 셸 배경(3859×2166)에서 문·창·조명을 크롭해 투명 PNG로 뽑는다.
# 벽에 붙는 정면 그림이므로 앱에서 skewY(±26.565°)로 기울이면 아이소 벽면에 정확히 붙는다.
# 신규 아트 없이 시안의 벽 부착물을 재현하기 위한 파이프라인. (docs/17 §2)
import os
from collections import deque
from PIL import Image

PKG = os.path.expanduser('~/Documents/냥도감/대한냥냥공사_고객지원실_MVP_패키지/assets/v2')
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..',
                   'assets/support-room-v3/fixtures')
OUT = os.path.normpath(OUT)
os.makedirs(OUT, exist_ok=True)

# (crop box, 배경 제거 시작 모서리) — 문틀/창틀 바깥의 벽만 지운다
FIXTURES = {
    'door_exterior':     ((40, 300, 300, 1150), 30),
    'window_arch_left':  ((575, 390, 965, 960), 30),
    'door_interior':     ((2275, 530, 2560, 1010), 20),
    'window_arch_right': ((3400, 330, 3730, 985), 34),
    'wall_lamp':         ((415, 505, 555, 690), 26),
    'pendant_lamp':      ((1745, 215, 1910, 560), 24),
}


def strip_wall(img: Image.Image, tol: int) -> Image.Image:
    """가장자리에서 플러드필해 벽 배경만 투명하게 만든다(내부 하늘·유리는 보존).

    기준색은 가장자리 표본의 고정값이다. 이웃 픽셀 색을 기준으로 이어받으면
    벽 그라데이션을 타고 창틀·문까지 전부 먹어버린다(실측 확인).
    """
    img = img.convert('RGBA')
    w, h = img.size
    px = img.load()

    # 크롭 안에 크림 상부벽과 세이지 하부벽이 함께 들어오므로 변마다 자기 기준색으로
    # 따로 채운다. 기준색 하나로는 다른 쪽 벽이 사각 패치로 남는다(실측 확인).
    edges = {
        'top': [(x, 0) for x in range(w)],
        'bottom': [(x, h - 1) for x in range(w)],
        'left': [(0, y) for y in range(h)],
        'right': [(w - 1, y) for y in range(h)],
    }

    for pixels in edges.values():
        sample = [px[x, y][:3] for x, y in pixels[::3] if px[x, y][3] > 0]
        if not sample:
            continue
        ref = tuple(sum(c[i] for c in sample) // len(sample) for i in range(3))

        def is_wall(x, y):
            r, g, b, a = px[x, y]
            if a == 0:
                return False
            return abs(r - ref[0]) + abs(g - ref[1]) + abs(b - ref[2]) <= tol * 3

        seen = [[False] * w for _ in range(h)]
        queue = deque()
        for x, y in pixels:
            if not seen[y][x] and is_wall(x, y):
                seen[y][x] = True
                queue.append((x, y))

        while queue:
            x, y = queue.popleft()
            r, g, b, _ = px[x, y]
            px[x, y] = (r, g, b, 0)
            for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                if 0 <= nx < w and 0 <= ny < h and not seen[ny][nx] and is_wall(nx, ny):
                    seen[ny][nx] = True
                    queue.append((nx, ny))
    return img


def trim(img: Image.Image) -> Image.Image:
    bbox = img.getbbox()
    return img.crop(bbox) if bbox else img


shell = Image.open(f'{PKG}/environment/support-room-shell-wide-3859x2166.png')
for name, (box, tol) in FIXTURES.items():
    out = trim(strip_wall(shell.crop(box), tol))
    path = f'{OUT}/{name}.webp'
    out.save(path, 'WEBP', quality=92)
    print(f'{name}: {out.size[0]}×{out.size[1]}  {os.path.getsize(path) // 1024}KB')
