from PIL import Image, ImageDraw, ImageFont
import os

# Erstelle Icon-Bilder für die Extension
sizes = [16, 48, 128]

for size in sizes:
    # Erstelle ein neues Bild mit grünem Hintergrund
    img = Image.new('RGB', (size, size), color='#4CAF50')
    draw = ImageDraw.Draw(img)
    
    # Zeichne ein einfaches "Track" Symbol (Kreis mit Punkt)
    if size >= 48:
        # Äußerer Kreis
        margin = size // 6
        draw.ellipse([margin, margin, size-margin, size-margin], 
                     outline='white', width=max(2, size//20))
        
        # Innerer Punkt
        center = size // 2
        dot_size = size // 6
        draw.ellipse([center-dot_size, center-dot_size, 
                     center+dot_size, center+dot_size], 
                     fill='white')
    else:
        # Für 16x16 nur ein einfacher Punkt
        center = size // 2
        dot_size = size // 4
        draw.ellipse([center-dot_size, center-dot_size, 
                     center+dot_size, center+dot_size], 
                     fill='white')
    
    # Speichere das Bild
    img.save(f'icon{size}.png')
    print(f'Created icon{size}.png')

print('All icons created successfully!')
