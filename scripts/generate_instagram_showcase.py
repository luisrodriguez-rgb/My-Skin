#!/usr/bin/env python3
"""
MySkin - Generador del Poster de Instagram / Showcase V2 (1080x1080 px)
Diseño compacto, sin espacios vacíos, con tipografía 100% legible y sólida,
y los personajes agrupados en un escuadrón vibrante (estilo crossover / team lineup).
"""

import os
import sys
import zlib
import struct
import math

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(os.path.join(base_dir, "scripts"))

from generate_anime_skins import render_goku, render_naruto, render_luffy, render_tanjiro, render_gojo
from generate_gaming_skins import render_mario, render_link, render_pikachu, render_sonic, render_kirby, render_master_chief, render_sans, render_steve, render_kratos
from generate_pop_and_legends_skins import render_batman, render_superman, render_messi, render_cristiano, render_jordan, render_darth_vader, render_gandalf
from generate_new_skins import render_harry_potter, render_captain_america, render_iron_man, render_labrador

WIDTH = 1080
HEIGHT = 1080

def create_png(width, height, rgba_bytes):
    def chunk(tag, data):
        return struct.pack("!I", len(data)) + tag + data + struct.pack("!I", zlib.crc32(tag + data) & 0xffffffff)

    header = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack("!IIBBBBB", width, height, 8, 6, 0, 0, 0)
    
    raw = bytearray()
    row_bytes = width * 4
    for y in range(height):
        raw.append(0)
        start = y * row_bytes
        raw.extend(rgba_bytes[start:start + row_bytes])

    idat = zlib.compress(bytes(raw), 9)
    return header + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


class Canvas:
    def __init__(self, w, h):
        self.w = w
        self.h = h
        self.buf = bytearray(w * h * 4)

    def set_pixel(self, x, y, r, g, b, a=255):
        if 0 <= x < self.w and 0 <= y < self.h:
            idx = (y * self.w + x) * 4
            if a == 255:
                self.buf[idx] = r
                self.buf[idx+1] = g
                self.buf[idx+2] = b
                self.buf[idx+3] = 255
            else:
                bg_a = self.buf[idx+3] / 255.0
                fg_a = a / 255.0
                out_a = fg_a + bg_a * (1.0 - fg_a)
                if out_a > 0:
                    out_r = int((r * fg_a + self.buf[idx] * bg_a * (1.0 - fg_a)) / out_a)
                    out_g = int((g * fg_a + self.buf[idx+1] * bg_a * (1.0 - fg_a)) / out_a)
                    out_b = int((b * fg_a + self.buf[idx+2] * bg_a * (1.0 - fg_a)) / out_a)
                    self.buf[idx] = min(255, max(0, out_r))
                    self.buf[idx+1] = min(255, max(0, out_g))
                    self.buf[idx+2] = min(255, max(0, out_b))
                    self.buf[idx+3] = int(out_a * 255)

    def fill_rect(self, x1, y1, w, h, r, g, b, a=255):
        for py in range(int(y1), int(y1 + h)):
            for px in range(int(x1), int(x1 + w)):
                self.set_pixel(px, py, r, g, b, a)

    def draw_ellipse(self, cx, cy, rx, ry, r, g, b, a=255):
        for py in range(int(cy - ry), int(cy + ry + 1)):
            for px in range(int(cx - rx), int(cx + rx + 1)):
                if rx > 0 and ry > 0:
                    if ((px - cx) ** 2) / (rx ** 2) + ((py - cy) ** 2) / (ry ** 2) <= 1.0:
                        self.set_pixel(px, py, r, g, b, a)

    def draw_rounded_rect(self, x, y, w, h, radius, r, g, b, a=255):
        self.fill_rect(x + radius, y, w - 2 * radius, h, r, g, b, a)
        self.fill_rect(x, y + radius, radius, h - 2 * radius, r, g, b, a)
        self.fill_rect(x + w - radius, y + radius, radius, h - 2 * radius, r, g, b, a)
        self.draw_ellipse(x + radius, y + radius, radius, radius, r, g, b, a)
        self.draw_ellipse(x + w - radius, y + radius, radius, radius, r, g, b, a)
        self.draw_ellipse(x + radius, y + h - radius, radius, radius, r, g, b, a)
        self.draw_ellipse(x + w - radius, y + h - radius, radius, radius, r, g, b, a)

    def draw_shadow(self, cx, cy):
        self.draw_ellipse(cx, cy + 20, 14, 4, 0, 0, 0, 90)


# Capibara con brote
def render_capybara(c, fx, fy, frame=0, row=0):
    cx = fx + 32
    cy = fy + 40
    c.draw_shadow(cx, cy)
    c_brown = (180, 130, 80)
    c_dark = (120, 80, 45)
    c_sprout = (192, 231, 152)

    c.draw_ellipse(cx, cy + 3, 14, 10, *c_brown)
    c.fill_rect(cx - 8, cy + 10, 4, 4, *c_dark)
    c.fill_rect(cx + 4, cy + 10, 4, 4, *c_dark)

    c.draw_ellipse(cx + 6, cy - 4, 10, 8, *c_brown)
    c.fill_rect(cx + 12, cy - 6, 4, 7, *c_dark)
    c.fill_rect(cx + 14, cy - 6, 2, 2, 30, 20, 10)
    c.fill_rect(cx + 7, cy - 6, 2, 2, 30, 20, 10)
    c.fill_rect(cx + 1, cy - 11, 3, 3, *c_dark)

    c.fill_rect(cx + 5, cy - 13, 2, 4, 100, 180, 60)
    c.draw_ellipse(cx + 4, cy - 15, 3, 2, *c_sprout)
    c.draw_ellipse(cx + 7, cy - 14, 3, 2, *c_sprout)


# Spider-Man
def render_spiderman(c, fx, fy, frame=0, row=0):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    red = (220, 38, 38)
    blue = (37, 99, 235)
    white = (248, 250, 252)
    black = (15, 23, 42)

    c.fill_rect(cx - 6, cy + 11, 4, 5, *blue)
    c.fill_rect(cx + 2, cy + 11, 4, 5, *blue)
    c.fill_rect(cx - 7, cy + 15, 5, 4, *red)
    c.fill_rect(cx + 2, cy + 15, 5, 4, *red)

    c.fill_rect(cx - 7, cy, 14, 12, *red)
    c.fill_rect(cx - 8, cy + 2, 2, 8, *blue)
    c.fill_rect(cx + 6, cy + 2, 2, 8, *blue)
    c.fill_rect(cx - 1, cy + 3, 2, 4, *black)

    c.fill_rect(cx - 10, cy + 1, 3, 8, *red)
    c.fill_rect(cx + 7, cy + 1, 3, 8, *red)

    c.draw_ellipse(cx, cy - 6, 7, 7, *red)
    c.fill_rect(cx - 4, cy - 8, 3, 3, *white)
    c.fill_rect(cx - 5, cy - 9, 5, 1, *black)
    c.fill_rect(cx + 1, cy - 8, 3, 3, *white)
    c.fill_rect(cx, cy - 9, 5, 1, *black)


# Tipografía sólida de alta legibilidad (matriz 5x7 limpia y condensada)
CLEAN_FONT = {
    'A': ["11111", "10001", "10001", "11111", "10001", "10001", "10001"],
    'B': ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
    'C': ["11111", "10000", "10000", "10000", "10000", "10000", "11111"],
    'D': ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
    'E': ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
    'F': ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
    'G': ["11111", "10000", "10000", "10111", "10001", "10001", "11111"],
    'H': ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
    'I': ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
    'J': ["00001", "00001", "00001", "00001", "10001", "10001", "01110"],
    'K': ["10001", "10010", "10100", "11100", "10100", "10010", "10001"],
    'L': ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
    'M': ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
    'N': ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
    'O': ["11111", "10001", "10001", "10001", "10001", "10001", "11111"],
    'P': ["11111", "10001", "10001", "11111", "10000", "10000", "10000"],
    'Q': ["11111", "10001", "10001", "10001", "10101", "10011", "11111"],
    'R': ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
    'S': ["11111", "10000", "10000", "11111", "00001", "00001", "11111"],
    'T': ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
    'U': ["10001", "10001", "10001", "10001", "10001", "10001", "11111"],
    'V': ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
    'W': ["10001", "10001", "10001", "10101", "10101", "11011", "10001"],
    'X': ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
    'Y': ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
    'Z': ["11111", "00010", "00100", "01000", "10000", "10000", "11111"],
    '0': ["11111", "10011", "10101", "10001", "10101", "11001", "11111"],
    '1': ["00100", "01100", "00100", "00100", "00100", "00100", "11111"],
    '2': ["11111", "00001", "00001", "11111", "10000", "10000", "11111"],
    '3': ["11111", "00001", "00001", "11111", "00001", "00001", "11111"],
    '4': ["10001", "10001", "10001", "11111", "00001", "00001", "00001"],
    '5': ["11111", "10000", "10000", "11111", "00001", "00001", "11111"],
    '6': ["11111", "10000", "10000", "11111", "10001", "10001", "11111"],
    '7': ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
    '8': ["11111", "10001", "10001", "11111", "10001", "10001", "11111"],
    '9': ["11111", "10001", "10001", "11111", "00001", "00001", "11111"],
    ':': ["00000", "00100", "00100", "00000", "00100", "00100", "00000"],
    '.': ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
    ',': ["00000", "00000", "00000", "00000", "00100", "00100", "01000"],
    '·': ["00000", "00000", "00000", "01100", "00000", "00000", "00000"],
    ' ': ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
    '-': ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
    '/': ["00001", "00010", "00100", "01000", "10000", "00000", "00000"],
    '%': ["11001", "11010", "00100", "01000", "01011", "10011", "00000"]
}

def get_text_width(text, scale=2, spacing=1):
    return len(text) * (5 + spacing) * scale - spacing * scale

def draw_clean_text(canvas, text, x, y, scale=2, color=(255, 255, 255), spacing=1, shadow=True):
    clean_str = text.upper().replace('Á', 'A').replace('É', 'E').replace('Í', 'I').replace('Ó', 'O').replace('Ú', 'U').replace('Ñ', 'N')
    
    # Sombra oscura para máxima legibilidad
    if shadow:
        curr_x = x + 1 * scale
        for ch in clean_str:
            glyph = CLEAN_FONT.get(ch, CLEAN_FONT[' '])
            for r_idx, row in enumerate(glyph):
                for c_idx, bit in enumerate(row):
                    if bit == '1':
                        canvas.fill_rect(curr_x + c_idx * scale, y + (r_idx + 1) * scale, scale, scale, 10, 15, 20, 200)
            curr_x += (5 + spacing) * scale

    # Letras frontales
    curr_x = x
    for ch in clean_str:
        glyph = CLEAN_FONT.get(ch, CLEAN_FONT[' '])
        for r_idx, row in enumerate(glyph):
            for c_idx, bit in enumerate(row):
                if bit == '1':
                    canvas.fill_rect(curr_x + c_idx * scale, y + r_idx * scale, scale, scale, *color)
        curr_x += (5 + spacing) * scale


def draw_centered_text(canvas, text, cy_pos, scale=2, color=(255, 255, 255), spacing=1, shadow=True):
    clean_str = text.upper().replace('Á', 'A').replace('É', 'E').replace('Í', 'I').replace('Ó', 'O').replace('Ú', 'U').replace('Ñ', 'N')
    t_width = get_text_width(clean_str, scale, spacing)
    start_x = (WIDTH - t_width) // 2
    draw_clean_text(canvas, clean_str, start_x, cy_pos, scale=scale, color=color, spacing=spacing, shadow=shadow)


def render_character_scaled(main_canvas, render_func, center_x, baseline_y, scale=3.5, row=0, frame=0):
    char_c = Canvas(64, 64)
    render_func(char_c, 0, 0, frame=frame, row=row)
    scaled_w = int(64 * scale)
    scaled_h = int(64 * scale)
    start_x = center_x - scaled_w // 2
    start_y = baseline_y - int(56 * scale)

    for cy in range(64):
        for cx in range(64):
            idx = (cy * 64 + cx) * 4
            a = char_c.buf[idx + 3]
            if a > 0:
                r = char_c.buf[idx]
                g = char_c.buf[idx + 1]
                b = char_c.buf[idx + 2]
                px = start_x + int(cx * scale)
                py = start_y + int(cy * scale)
                pw = max(1, int(math.ceil(scale)))
                ph = max(1, int(math.ceil(scale)))
                main_canvas.fill_rect(px, py, pw, ph, r, g, b, a)


def main():
    print("[MySkin] Componiendo poster optimizado (lineup compacto, sin huecos)...")
    canvas = Canvas(WIDTH, HEIGHT)

    # 1. Fondo degradado profesional (#0B1115 a #16222B)
    for y in range(HEIGHT):
        factor = y / HEIGHT
        r = int(11 + factor * 11)
        g = int(17 + factor * 16)
        b = int(21 + factor * 22)
        canvas.fill_rect(0, y, WIDTH, 1, r, g, b)

    # Resplandor radial de escenario detrás de los personajes (Y=620)
    center_glow = (192, 231, 152) # #C0E798
    for r_rad in range(450, 0, -25):
        alpha = int((1.0 - r_rad / 450.0) * 35)
        canvas.draw_ellipse(540, 620, int(r_rad * 1.3), r_rad, *center_glow, alpha)

    # Resplandor secundario azul en la parte superior
    for r_rad in range(300, 0, -30):
        alpha = int((1.0 - r_rad / 300.0) * 20)
        canvas.draw_ellipse(540, 140, int(r_rad * 1.4), r_rad, 56, 189, 248, alpha)

    # 2. Logotipo y Encabezado Superior (Compacto y nítido)
    logo_cx = 540
    logo_cy = 70
    canvas.draw_ellipse(logo_cx, logo_cy, 30, 30, 24, 34, 42)
    canvas.draw_ellipse(logo_cx, logo_cy, 28, 28, 17, 26, 32)
    # Brote verde
    canvas.fill_rect(logo_cx - 2, logo_cy - 10, 4, 15, 151, 198, 109)
    canvas.draw_ellipse(logo_cx - 5, logo_cy - 12, 7, 5, 192, 231, 152)
    canvas.draw_ellipse(logo_cx + 5, logo_cy - 14, 6, 4, 192, 231, 152)

    # Título "MYSKIN" destacado
    draw_centered_text(canvas, "MYSKIN", 115, scale=7, color=(192, 231, 152), spacing=3)

    # Subtítulo sin fallos tipográficos
    draw_centered_text(canvas, "TU DIA, EN COMPANIA", 185, scale=3, color=(239, 245, 241), spacing=2)
    draw_centered_text(canvas, "53 COMPANEROS DE ESCRITORIO EN PIXEL ART", 220, scale=2, color=(160, 180, 170), spacing=1)

    # 3. Chips de Categorías (Organizados y legibles)
    categories = [
        ("GAMING", (59, 130, 246)),
        ("ANIME", (249, 115, 22)),
        ("HEROES", (239, 68, 68)),
        ("CINE", (168, 85, 247)),
        ("DEPORTES", (234, 179, 8)),
        ("MASCOTAS", (16, 185, 129))
    ]
    total_w = len(categories) * 145 - 15
    start_bx = (WIDTH - total_w) // 2
    for idx, (cat_name, col) in enumerate(categories):
        cx_box = start_bx + idx * 145
        canvas.draw_rounded_rect(cx_box, 255, 130, 28, 5, 24, 34, 42, 220)
        canvas.draw_rounded_rect(cx_box + 1, 256, 128, 26, 4, *col, 40)
        canvas.draw_ellipse(cx_box + 14, 269, 4, 4, *col)
        draw_clean_text(canvas, cat_name, cx_box + 26, 262, scale=2, color=(239, 245, 241), spacing=1, shadow=False)

    # 4. Tarjetas flotantes sutiles (Laterales, sin invadir el centro)
    # Tarjeta Izquierda: Pomodoro
    canvas.draw_rounded_rect(40, 295, 230, 60, 6, 24, 34, 42, 220)
    canvas.draw_rounded_rect(41, 296, 228, 58, 5, 192, 231, 152, 50)
    draw_clean_text(canvas, "POMODORO: 25:00", 55, 305, scale=2, color=(192, 231, 152))
    draw_clean_text(canvas, "EN CONCENTRACION", 55, 330, scale=1, color=(220, 230, 225))

    # Tarjeta Derecha: Alertas Académicas
    canvas.draw_rounded_rect(810, 295, 230, 60, 6, 24, 34, 42, 220)
    canvas.draw_rounded_rect(811, 296, 228, 58, 5, 239, 68, 68, 50)
    draw_clean_text(canvas, "AVISO DE ENTREGA", 825, 305, scale=2, color=(250, 204, 21))
    draw_clean_text(canvas, "CALENDARIO ACTIVO", 825, 330, scale=1, color=(239, 68, 68))

    # 5. Escenario: Plataforma con iluminación y reflejos
    floor_y = 860
    # Línea luminosa de neon
    canvas.fill_rect(40, floor_y, 1000, 3, 192, 231, 152, 220)
    canvas.fill_rect(30, floor_y + 3, 1020, 1, 96, 165, 250, 120)

    # 6. SQUAD DE PERSONAJES (Agrupados en 3 filas escalonadas y compactas)
    
    # FILA 1: FONDO / ELEVADA (Y = 520, Escala 3.0, 9 personajes cercanos)
    row_1 = [
        (render_gandalf, 100),
        (render_harry_potter, 210),
        (render_master_chief, 320),
        (render_tanjiro, 430),
        (render_gojo, 540),
        (render_steve, 650),
        (render_darth_vader, 760),
        (render_kratos, 870),
        (render_jordan, 980),
    ]
    for func, x in row_1:
        render_character_scaled(canvas, func, x, 520, scale=3.0, row=0, frame=0)

    # FILA 2: INTERMEDIA (Y = 690, Escala 3.6, 8 personajes principales)
    row_2 = [
        (render_sonic, 120, 0),
        (render_batman, 240, 0),
        (render_link, 360, 0),
        (render_naruto, 480, 0),
        (render_luffy, 600, 0),
        (render_spiderman, 720, 0),
        (render_cristiano, 840, 3), # Siu pose
        (render_sans, 960, 0),
    ]
    for func, x, r_state in row_2:
        render_character_scaled(canvas, func, x, 690, scale=3.6, row=r_state, frame=0)

    # FILA 3: FRENTE / HEROES DESTACADOS (Y = 860, Escala 4.3, 7 personajes estelares)
    row_3 = [
        (render_labrador, 140, 0),
        (render_mario, 270, 3),        # Victoria puño arriba
        (render_goku, 410, 3),         # Goku Super Saiyajin con Ki dorado
        (render_capybara, 540, 0),     # Capibara Chill en el centro con brote
        (render_pikachu, 670, 0),      # Pikachu eléctrico
        (render_messi, 800, 3),        # Messi señalando al cielo
        (render_kirby, 930, 0),        # Kirby alegre
    ]
    for func, x, r_state in row_3:
        render_character_scaled(canvas, func, x, 860, scale=4.3, row=r_state, frame=0)

    # 7. Barra Inferior con Información Técnica y Enlace
    foot_y = 920
    canvas.draw_rounded_rect(100, foot_y, 880, 110, 10, 20, 28, 36, 230)
    canvas.draw_rounded_rect(101, foot_y + 1, 878, 108, 9, 60, 74, 80, 90)

    draw_centered_text(canvas, "TAURI V2 · RUST · TYPESCRIPT · 100% OFFLINE", foot_y + 24, scale=2, color=(192, 231, 152), spacing=1)
    draw_centered_text(canvas, "GITHUB.COM/LUISRODRIGUEZ-RGB/MY-SKIN", foot_y + 58, scale=3, color=(239, 245, 241), spacing=2)

    # Guardar archivo PNG en docs/images/
    out_dir = os.path.join(base_dir, "docs", "images")
    os.makedirs(out_dir, exist_ok=True)
    out_path = os.path.join(out_dir, "myskin-instagram-showcase.png")

    png_bytes = create_png(WIDTH, HEIGHT, canvas.buf)
    with open(out_path, "wb") as f:
        f.write(png_bytes)

    print(f"[MySkin] Nuevo poster generado en: {out_path} ({len(png_bytes)} bytes)")

if __name__ == "__main__":
    main()
