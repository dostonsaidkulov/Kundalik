"""Ilova ikonkalari va ochilish ekranini yaratadi: python3 scripts/make-icons.py"""
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
INK = (20, 25, 33)
COLORS = [(111, 143, 242), (61, 187, 140), (238, 164, 85), (173, 139, 242)]
SS = 4  # supersampling


def grid(draw, cx, cy, size, gap, radius):
    cell = (size - gap) / 2
    for i, col in enumerate(COLORS):
        x = cx - size / 2 + (i % 2) * (cell + gap)
        y = cy - size / 2 + (i // 2) * (cell + gap)
        draw.rounded_rectangle([x, y, x + cell, y + cell], radius=radius, fill=col)


def icon(px, shape='square', bg=INK, transparent=False, grid_frac=0.56):
    S = px * SS
    im = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if not transparent:
        if shape == 'circle':
            d.ellipse([0, 0, S - 1, S - 1], fill=bg)
        elif shape == 'full':
            d.rectangle([0, 0, S, S], fill=bg)
        else:
            d.rounded_rectangle([0, 0, S - 1, S - 1], radius=S * 0.23, fill=bg)
    g = S * grid_frac
    grid(d, S / 2, S / 2, g, g * 0.12, g * 0.11)
    return im.resize((px, px), Image.LANCZOS)


def splash(w, h, bg):
    S = SS
    im = Image.new('RGB', (w * S, h * S), bg)
    d = ImageDraw.Draw(im)
    box = min(w, h) * 0.26 * S
    cx, cy = w * S / 2, h * S / 2
    d.rounded_rectangle([cx - box / 2, cy - box / 2, cx + box / 2, cy + box / 2], radius=box * 0.23, fill=INK)
    g = box * 0.56
    grid(d, cx, cy, g, g * 0.12, g * 0.11)
    return im.resize((w, h), Image.LANCZOS)


pub = ROOT / 'public'
pub.mkdir(exist_ok=True)
icon(192).save(pub / 'icon-192.png')
icon(512).save(pub / 'icon-512.png')
icon(512, shape='full', grid_frac=0.42).save(pub / 'icon-maskable.png')

res = ROOT / 'android-res' / 'res'
dens = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}
for name, k in dens.items():
    folder = res / f'mipmap-{name}'
    folder.mkdir(parents=True, exist_ok=True)
    icon(round(48 * k)).save(folder / 'ic_launcher.png')
    icon(round(48 * k), shape='circle', grid_frac=0.5).save(folder / 'ic_launcher_round.png')
    icon(round(108 * k), transparent=True, grid_frac=0.40).save(folder / 'ic_launcher_foreground.png')

(res / 'values').mkdir(parents=True, exist_ok=True)
(res / 'values' / 'ic_launcher_background.xml').write_text(
    '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#141921</color>\n</resources>\n'
)

# Bildirishnoma uchun oq rangli kichik ikonka (Android uni o'zi bo'yaydi)
(res / 'drawable').mkdir(parents=True, exist_ok=True)
(res / 'drawable' / 'ic_stat_icon.xml').write_text('''<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
    <path android:fillColor="#FFFFFFFF" android:pathData="M4,5.5a1.5,1.5 0,0 1,1.5,-1.5h4a1.5,1.5 0,0 1,1.5,1.5v4a1.5,1.5 0,0 1,-1.5,1.5h-4a1.5,1.5 0,0 1,-1.5,-1.5z"/>
    <path android:fillColor="#FFFFFFFF" android:pathData="M13,5.5a1.5,1.5 0,0 1,1.5,-1.5h4a1.5,1.5 0,0 1,1.5,1.5v4a1.5,1.5 0,0 1,-1.5,1.5h-4a1.5,1.5 0,0 1,-1.5,-1.5z"/>
    <path android:fillColor="#FFFFFFFF" android:pathData="M4,14.5a1.5,1.5 0,0 1,1.5,-1.5h4a1.5,1.5 0,0 1,1.5,1.5v4a1.5,1.5 0,0 1,-1.5,1.5h-4a1.5,1.5 0,0 1,-1.5,-1.5z"/>
    <path android:fillColor="#FFFFFFFF" android:pathData="M13,14.5a1.5,1.5 0,0 1,1.5,-1.5h4a1.5,1.5 0,0 1,1.5,1.5v4a1.5,1.5 0,0 1,-1.5,1.5h-4a1.5,1.5 0,0 1,-1.5,-1.5z"/>
</vector>
''')

splash(1080, 1920, (241, 243, 246)).save(res / 'drawable' / 'splash.png')
(res / 'drawable-night').mkdir(parents=True, exist_ok=True)
splash(1080, 1920, (16, 19, 24)).save(res / 'drawable-night' / 'splash.png')
print('ok')
