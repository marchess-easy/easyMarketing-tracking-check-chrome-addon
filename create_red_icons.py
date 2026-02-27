from PIL import Image, ImageDraw, ImageFont
import os

# easyMarketing Farben - Rot wie auf der Website
PRIMARY_RED = '#e63946'
DARK_RED = '#d62828'

sizes = [16, 48, 128]

for size in sizes:
    # Erstelle ein neues Bild mit rotem Hintergrund
    img = Image.new('RGB', (size, size), color=PRIMARY_RED)
    draw = ImageDraw.Draw(img)
    
    # Für größere Icons: Zeichne "eM" Logo
    if size >= 48:
        # Hintergrund mit leichtem Gradient
        for i in range(size):
            # Gradient von hell nach dunkel
            ratio = i / size
            r = int(230 + (214 - 230) * ratio)
            g = int(57 + (40 - 57) * ratio)
            b = int(70 + (40 - 70) * ratio)
            color = f'#{r:02x}{g:02x}{b:02x}'
            draw.line([(0, i), (size, i)], fill=color)
        
        # Zeichne weißes "eM" in der Mitte
        if size == 128:
            font_size = 64
        else:
            font_size = 24
        
        try:
            # Versuche System-Font zu laden
            font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
        except:
            font = ImageFont.load_default()
        
        text = "eM"
        # Zentriere den Text
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (size - text_width) // 2
        y = (size - text_height) // 2 - bbox[1]
        
        # Zeichne Text mit leichtem Schatten für Tiefe
        shadow_offset = max(1, size // 32)
        draw.text((x + shadow_offset, y + shadow_offset), text, fill=DARK_RED, font=font)
        draw.text((x, y), text, fill='white', font=font)
        
    else:
        # Für 16x16: Einfaches "e" oder rundes Icon
        center = size // 2
        dot_size = size // 3
        # Zeichne weißen Kreis
        draw.ellipse([center-dot_size, center-dot_size, 
                     center+dot_size, center+dot_size], 
                     fill='white')
    
    # Speichere das Bild
    img.save(f'icon{size}.png')
    print(f'Created icon{size}.png with easyMarketing red branding')

print('All easyMarketing red icons created successfully!')
