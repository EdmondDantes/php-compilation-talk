"""Bake the conference QR into the painted enamel sign (qrcode, Pillow).

The speaker explicitly authorized this precise raster correction. The
generated original is retained; no HTML overlay is needed for the result.
"""
from pathlib import Path
import random

from PIL import Image, ImageDraw, ImageFilter
import qrcode

ASSETS = Path(__file__).resolve().parents[1] / 'assets' / 'pyhnik'
source = Image.open(ASSETS / 'php-ecosystem-migration-painted.png').convert('RGBA')
assert source.size == (1672, 941), 'Sign coordinates belong to this illustration.'

qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_H,
                   box_size=16, border=4)
qr.add_data('https://pyhnik.phpyh.ru')
qr.make(fit=True)
matrix = qr.make_image().convert('L').resize((768, 768), Image.Resampling.NEAREST)

# Match the ivory enamel and its subtle illumination. Keep the quiet zone
# clear; texture is deliberately much weaker than the code contrast.
surface = Image.new('RGBA', matrix.size)
pixels = surface.load()
modules = matrix.load()
rng = random.Random(26)
for y in range(768):
    for x in range(768):
        shade = 3 * x / 767 - 2 * y / 767 + rng.uniform(-0.7, 0.7)
        base = (226, 229, 213) if modules[x, y] else (13, 24, 18)
        pixels[x, y] = tuple(round(c + shade) for c in base) + (255,)

# Feather only the outer enamel seam, outside the QR's four-module margin.
alpha = Image.new('L', surface.size, 0)
ImageDraw.Draw(alpha).rectangle((5, 5, 762, 762), fill=255)
surface.putalpha(alpha.filter(ImageFilter.GaussianBlur(3)))

# Three measured corners on the painted sign: (1067,488), (1258,490),
# (1066,678). Invert this slight affine tilt for Pillow's output->input map.
a, b, d, e = 191 / 768, -1 / 768, 2 / 768, 190 / 768
det = a * e - b * d
ia, ib, id_, ie = e / det, -b / det, -d / det, a / det
coefficients = (ia, ib, -ia * 1067 - ib * 488,
                id_, ie, -id_ * 1067 - ie * 488)
ink = surface.transform(source.size, Image.Transform.AFFINE, coefficients,
                        resample=Image.Resampling.BICUBIC)
result = Image.alpha_composite(source, ink).convert('RGB')
result.save(ASSETS / 'php-ecosystem-migration-qr.png')
