# 셸 배경에서 바닥·윗벽 영역을 색 기반으로 마스크로 뽑아,
# 표면 타일(벽지·바닥재)에 원본 음영을 입힌 오버레이 레이어를 만든다.
# 출력: 표면별 3859×2166 알파 webp (해당 영역만 불투명).
import numpy as np
from PIL import Image, ImageFilter
import os, sys

PKG = os.path.expanduser('~/Documents/냥도감/대한냥냥공사_고객지원실_MVP_패키지/assets/v2')
OUT = os.path.expanduser('~/orca/catdex/catdex-client/assets/support-room-v2/surface-overlays')
os.makedirs(OUT, exist_ok=True)

shell = np.asarray(Image.open(f'{PKG}/environment/support-room-shell-wide-3859x2166.png').convert('RGB')).astype(np.float32)
H, W = shell.shape[:2]
print('shell', W, H)

r, g, b = shell[..., 0], shell[..., 1], shell[..., 2]
lum = 0.299 * r + 0.587 * g + 0.114 * b
yy = np.arange(H)[:, None] * np.ones((1, W))

# ── 바닥 마스크: 오렌지 우드 톤 (y > 1000 부근부터) ──────────────────────
# 우드: R 높음, R>G>B, 채도 뚜렷
floor_color = (r > 150) & (r > g + 25) & (g > b + 20) & (b < 190)
floor_mask = floor_color & (yy > 1000)
# 좌측 출입문 유리 너머(발코니 바닥)는 실내 바닥이 아니다
xx0 = np.arange(W)[None, :] * np.ones((H, 1))
floor_mask &= ~((xx0 < 345) & (yy < 1125))

# ── 윗벽 마스크: 크림 톤 (몰딩 아래 ~ 아랫벽 경계 위) ───────────────────
# 크림: 밝고 채도 낮음, R≥G≥B 근소 차이. 창문(하늘·수풀)·문(우드)·램프는 색이 달라 제외됨
maxc = np.maximum(np.maximum(r, g), b)
minc = np.minimum(np.minimum(r, g), b)
sat = (maxc - minc) / np.maximum(maxc, 1)
# 벽지 영역은 기하로 정의한다: 몰딩 아래~아랫벽 경계 밴드에서 창·문·조명을 사각형으로 제외.
# 색 검출은 몰딩 그림자·조명 그라데이션 때문에 경계가 얼룩진다. 음영은 어차피
# shade 곱으로 재현되므로 매끈한 기하 경계가 훨씬 자연스럽다.
xx = np.arange(W)[None, :] * np.ones((H, 1))
wall_mask = (yy > 299) & (yy < 960)
for x0, y0, x1, y1 in [
    (0, 0, 385, 2166),        # 좌측 출입문·아치 기둥
    (575, 390, 965, 950),     # 좌측 아치창
    (2275, 540, 2560, 970),   # 중앙 내부문
    (3340, 310, 3859, 2166),  # 우측 아치창·코너
    (420, 520, 545, 680),     # 좌측 벽램프
    (3150, 540, 3285, 700),   # 우측 벽램프
    (1755, 220, 1900, 545),   # 중앙 펜던트 조명(줄 포함)
]:
    wall_mask &= ~((xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1))

def clean(mask, blur=3, thresh=0.5, grow=0):
    im = Image.fromarray((mask * 255).astype(np.uint8))
    if grow:
        im = im.filter(ImageFilter.MaxFilter(grow * 2 + 1))
        im = im.filter(ImageFilter.MinFilter(grow * 2 + 1))
    im = im.filter(ImageFilter.GaussianBlur(blur))
    return np.asarray(im).astype(np.float32) / 255.0

# 구멍 메움(닫힘) 후 살짝 페더링해서 경계를 부드럽게
floor_alpha = clean(floor_mask, blur=2, grow=6)
wall_alpha = clean(wall_mask, blur=2, grow=5)
print('floor px', int((floor_alpha > .5).sum()), 'wall px', int((wall_alpha > .5).sum()))

def build(surface_id, kind, alpha):
    tile = np.asarray(Image.open(f'{PKG}/surfaces/{kind}/{surface_id}.png').convert('RGB')).astype(np.float32)
    th, tw = tile.shape[:2]
    # 바닥 타일은 원근감을 위해 뒤(위)는 잘게, 앞(아래)은 크게 — 세로로 2배 확대해 하단 기준 반복
    reps_y, reps_x = H // th + 2, W // tw + 2
    tiled = np.tile(tile, (reps_y, reps_x, 1))[:H, :W]
    # 원본 음영 이식: 영역 평균 밝기 대비 셸 밝기 비율을 곱한다 (창가 하이라이트·구석 그림자 유지)
    area = alpha > 0.5
    mean_lum = lum[area].mean() if area.any() else 180.0
    shade = np.clip(lum / mean_lum, 0.45, 1.35)[..., None]
    shaded = np.clip(tiled * shade, 0, 255)
    out = np.dstack([shaded, alpha[..., None] * 255]).astype(np.uint8)
    img = Image.fromarray(out, 'RGBA')
    path = f'{OUT}/{surface_id}.webp'
    img.save(path, 'WEBP', quality=82)
    print(surface_id, os.path.getsize(path) // 1024, 'KB')

for sid in ['flooring_honey_oak', 'flooring_cream_terrazzo', 'flooring_warm_gray_carpet']:
    build(sid, 'flooring', floor_alpha)
for sid in ['wallpaper_cream_plaster', 'wallpaper_sage_linen', 'wallpaper_apricot_pinstripe']:
    build(sid, 'wallpaper', wall_alpha)

# 마스크 미리보기(검수용)
Image.fromarray((np.dstack([floor_alpha, wall_alpha, np.zeros_like(lum)]) * 255).astype(np.uint8)).resize((1200, 674)).save(
    os.path.dirname(os.path.abspath(sys.argv[0])) + '/mask-preview.png')
print('done')
