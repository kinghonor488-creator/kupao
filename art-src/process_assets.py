"""把 art-src/gen/*.png 处理成游戏用的贴图：
去白底（如果不是透明背景）→ 裁掉空白边 → 缩小 → 存为 assets/sprites/*.webp，
并生成 js/sprite_manifest.js（记录每张图的宽高）。
"""
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

HERE = Path(__file__).resolve().parent
SRC = HERE / 'gen'
DST = HERE.parent / 'assets' / 'sprites'
MANIFEST = HERE.parent / 'js' / 'sprite_manifest.js'
PETS = {'bee', 'fairy', 'owl', 'firedrake', 'starbaby', 'ghost', 'luckycat', 'robot', 'penguin', 'gembunny', 'butterfly', 'frog'}


def remove_white_bg(im):
    a = np.array(im.convert('RGBA'))
    corners = a[[0, 0, -1, -1], [0, -1, 0, -1], 3]
    if corners.min() < 250:
        return im.convert('RGBA')  # 已经是透明背景
    rgb = a[..., :3].astype(int)
    whiteish = (rgb.min(axis=2) > 232) & (rgb.max(axis=2) - rgb.min(axis=2) < 18)
    lab, _ = ndimage.label(whiteish)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(border))
    bg = ndimage.binary_dilation(bg, iterations=1)
    alpha = np.where(bg, 0, 255).astype(np.uint8)
    alpha = np.array(Image.fromarray(alpha).filter(__import__('PIL.ImageFilter', fromlist=['x']).GaussianBlur(0.8)))
    a[..., 3] = np.minimum(a[..., 3], alpha)
    return Image.fromarray(a, 'RGBA')


def target_size(name, w, h):
    if name.endswith('_run') or name.endswith('_ride'):
        s = 360 / h            # 角色：高 360
    elif name in PETS:
        s = 200 / max(w, h)    # 宠物：长边 200
    else:
        s = 480 / w            # 坐骑：宽 480
    return max(1, round(w * s)), max(1, round(h * s))


def main():
    DST.mkdir(parents=True, exist_ok=True)
    meta = {}
    for p in sorted(SRC.glob('*.png')):
        name = p.stem
        im = remove_white_bg(Image.open(p))
        a = np.array(im)[..., 3]
        ys, xs = np.where(a > 12)
        if len(xs) == 0:
            print('empty:', name)
            continue
        pad = 4
        box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + pad + 1), min(im.height, ys.max() + pad + 1))
        im = im.crop(box)
        im = im.resize(target_size(name, *im.size), Image.LANCZOS)
        out = DST / f'{name}.webp'
        im.save(out, 'WEBP', quality=86, method=6)
        meta[name] = [im.width, im.height]
        print(f'{name}: {im.width}x{im.height} {out.stat().st_size // 1024}KB')
    body = ',\n'.join(f'  {k}: [{w}, {h}]' for k, (w, h) in meta.items())
    MANIFEST.write_text('// 由 art-src/process_assets.py 自动生成：贴图宽高\nKP.SPRITES = {\n' + body + '\n};\n', encoding='utf-8')
    print(len(meta), 'sprites ->', MANIFEST)


if __name__ == '__main__':
    main()
