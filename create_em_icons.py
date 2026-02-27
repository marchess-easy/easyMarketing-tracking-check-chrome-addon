from PIL import Image, ImageDraw
import math

# Laden des easyMarketing Atom-Logos
logo_src = Image.open('em-logo.webp').convert('RGBA')

# Farben passend zum Popup-Header
BG       = (24, 24, 27)    # #18181b  (Header-Dunkel)
WHITE    = (255, 255, 255)
BG_RGBA  = (24, 24, 27, 255)

sizes = [16, 48, 128]

def make_icon(size):
    img = Image.new('RGBA', (size, size), BG_RGBA)
    draw = ImageDraw.Draw(img)

    # Weißes abgerundetes Rechteck – proportional wie im Popup (padding ~18 %)
    pad    = max(2, round(size * 0.15))
    radius = max(2, round(size * 0.14))
    x0, y0 = pad, pad
    x1, y1 = size - pad, size - pad

    draw.rounded_rectangle([x0, y0, x1, y1], radius=radius, fill=WHITE)

    # Logo in den weißen Bereich skalieren (innerer Abstand ~10 % des weißen Feldes)
    inner_size  = x1 - x0
    logo_pad    = max(1, round(inner_size * 0.10))
    logo_px     = inner_size - logo_pad * 2

    logo_scaled = logo_src.resize((logo_px, logo_px), Image.LANCZOS)

    logo_x = x0 + logo_pad
    logo_y = y0 + logo_pad
    img.paste(logo_scaled, (logo_x, logo_y), logo_scaled)

    # Als RGB-PNG speichern
    out = Image.new('RGBA', (size, size), BG_RGBA)
    out.paste(img, mask=img.split()[3])
    out.convert('RGB').save(f'icon{size}.png', 'PNG')
    print(f'icon{size}.png erstellt')

for s in sizes:
    make_icon(s)

print('Alle Icons erstellt.')
