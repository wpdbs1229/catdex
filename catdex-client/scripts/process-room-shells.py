"""방 셸 원본을 RGBA WebP로 정규화한다.

이미 투명한 원본은 기존 alpha와 RGB를 그대로 보존한다. 불투명 마젠타 원본일 때만
크로마 키를 적용한다. 이전 구현처럼 기존 alpha를 255로 덮어 투명 배경을 되살리지
않으며, 좌표 계약을 위해 1254×1254 캔버스도 자르지 않는다.
"""
from pathlib import Path
import sys

import numpy as np
from PIL import Image, ImageFilter

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'support-room-v3' / 'shells'
OUT.mkdir(parents=True, exist_ok=True)


def normalize(path: str) -> Image.Image:
    image = Image.open(path).convert('RGBA')
    pixels = np.asarray(image).copy()
    existing_alpha = pixels[..., 3]

    # alpha가 이미 있으면 아티스트가 만든 투명 경계를 정본으로 사용한다.
    if existing_alpha.min() < 255:
        return image

    red = pixels[..., 0].astype(np.int16)
    green = pixels[..., 1].astype(np.int16)
    blue = pixels[..., 2].astype(np.int16)
    magenta = (
        (red > 150)
        & (blue > 150)
        & (green < red - 60)
        & (green < blue - 60)
    )
    alpha = np.where(magenta, 0, 255).astype(np.uint8)
    alpha = np.asarray(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.6)))
    pixels[..., 3] = alpha
    pixels[alpha == 0, :3] = 0
    return Image.fromarray(pixels, 'RGBA')


if __name__ == '__main__':
    for argument in sys.argv[1:]:
        name, source = argument.split('=', 1)
        result = normalize(source)
        if result.size != (1254, 1254):
            raise SystemExit(f'{name}: 1254×1254 원본이 필요하지만 {result.size}입니다')
        destination = OUT / f'{name}.webp'
        result.save(destination, 'WEBP', lossless=True, method=6)
        print(f'{name}: {result.size[0]}×{result.size[1]} {destination.stat().st_size // 1024}KB')
