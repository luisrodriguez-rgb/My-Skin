#!/usr/bin/env python3
"""
MySkin - Generador de Skins del Pack Anime Élite
Genera manifest.json y spritesheet.png (384x384, 6 filas x 6 columnas, 64x64 px por frame)
para los 10 personajes de Anime:
1. son-goku (Goku)
2. vegeta-prince (Vegeta)
3. naruto-uzumaki (Naruto)
4. monkey-d-luffy (Luffy)
5. roronoa-zoro (Zoro)
6. satoru-gojo (Gojo)
7. tanjiro-kamado (Tanjiro)
8. nezuko-kamado (Nezuko)
9. saitama-hero (Saitama)
10. levi-ackerman (Capitán Levi)
"""

import os
import json
import zlib
import struct

WIDTH = 384   # 6 columnas * 64 px
HEIGHT = 384  # 6 filas * 64 px (IDLE, WALK, ALERT, VICTORY, FOCUS, SLEEP)

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
            self.buf[idx] = r
            self.buf[idx+1] = g
            self.buf[idx+2] = b
            self.buf[idx+3] = a

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

    def draw_shadow(self, cx, cy):
        self.draw_ellipse(cx, cy + 20, 14, 4, 0, 0, 0, 80)

    def draw_zz_particles(self, cx, cy, frame_idx):
        offset_y = (frame_idx * 3) % 12
        self.fill_rect(cx + 8, cy - 14 - offset_y, 4, 1, 255, 255, 255, 200)
        self.fill_rect(cx + 10, cy - 13 - offset_y, 2, 1, 255, 255, 255, 200)
        self.fill_rect(cx + 8, cy - 12 - offset_y, 4, 1, 255, 255, 255, 200)

        offset_y2 = ((frame_idx + 2) * 3) % 12
        self.fill_rect(cx + 14, cy - 20 - offset_y2, 5, 1, 147, 197, 253, 230)
        self.fill_rect(cx + 16, cy - 19 - offset_y2, 2, 2, 147, 197, 253, 230)
        self.fill_rect(cx + 14, cy - 17 - offset_y2, 5, 1, 147, 197, 253, 230)


# ==============================================================================
# 1. SON GOKU
# ==============================================================================
def render_goku(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    orange = (234, 88, 12)       # Gi naranja
    blue = (30, 58, 138)         # Camiseta y muñequeras azul marino
    skin_c = (254, 215, 170)     # Piel clara
    hair_black = (15, 23, 42)    # Cabello base
    hair_gold = (250, 204, 21)   # Super Saiyajin
    ki_aura = (253, 224, 71)

    is_ssj = (row == 3) # En VICTORY se transforma en Super Saiyajin

    if row == 4: # FOCUS: Meditando con Ki tenue
        c.draw_ellipse(cx, cy + 6, 12, 11, *orange)
        c.fill_rect(cx - 3, cy + 2, 6, 8, *blue)
        c.draw_ellipse(cx, cy - 7, 7, 7, *skin_c)
        c.fill_rect(cx - 5, cy - 8, 10, 2, 30, 41, 59) # Ojos cerrados
        # Pelo en picos
        c.draw_ellipse(cx, cy - 13, 8, 5, *hair_black)
        c.fill_rect(cx - 10, cy - 16, 5, 8, *hair_black)
        c.fill_rect(cx + 5, cy - 15, 6, 7, *hair_black)
        # Partículas Ki
        pulsar = frame * 2
        c.draw_ellipse(cx, cy, 18 + pulsar, 22 + pulsar, 254, 240, 138, 40)
        c.fill_rect(cx - 14, cy + 4 - pulsar, 2, 4, 250, 204, 21, 180)
        c.fill_rect(cx + 13, cy + 8 - pulsar, 2, 4, 250, 204, 21, 180)
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 8, 13, 8, *orange)
        c.draw_ellipse(cx - 6, cy + 2, 7, 6, *skin_c)
        c.draw_ellipse(cx - 8, cy - 1, 7, 5, *hair_black)
        c.fill_rect(cx - 8, cy + 2, 4, 2, 30, 41, 59)
        c.draw_zz_particles(cx, cy, frame)
        return

    # Cuerpo erguido (IDLE, WALK, ALERT, VICTORY)
    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Aura Super Saiyajin en VICTORY
    if is_ssj:
        c.draw_ellipse(cx, y_body + 2, 19 + (frame % 2) * 2, 25 + (frame % 3), *ki_aura, 90)

    # Piernas
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 11, 4, 7, *orange)
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 4, 7, *orange)
    c.fill_rect(cx - 6 + leg_offset, y_body + 16, 4, 3, *blue) # Botas
    c.fill_rect(cx + 2 - leg_offset, y_body + 16, 4, 3, *blue)

    # Torso (Gi)
    c.fill_rect(cx - 7, y_body, 14, 12, *orange)
    c.fill_rect(cx - 3, y_body, 6, 6, *blue) # Cuello camiseta
    c.fill_rect(cx - 7, y_body + 9, 14, 2, *blue) # Cinta obi

    # Brazos
    arm_hair = hair_gold if is_ssj else hair_black
    if row == 3: # VICTORY: Brazos arriba y puño
        c.fill_rect(cx - 10, y_body - 4, 4, 8, *skin_c)
        c.fill_rect(cx + 7, y_body - 4, 4, 8, *skin_c)
        c.fill_rect(cx - 10, y_body + 1, 4, 3, *blue) # Muñequeras
        c.fill_rect(cx + 7, y_body + 1, 4, 3, *blue)
    else:
        c.fill_rect(cx - 9, y_body + 1, 3, 8, *skin_c)
        c.fill_rect(cx + 7, y_body + 1, 3, 8, *skin_c)
        c.fill_rect(cx - 9, y_body + 6, 3, 3, *blue)
        c.fill_rect(cx + 7, y_body + 6, 3, 3, *blue)

    # Cabeza
    c.draw_ellipse(cx, y_body - 6, 7, 7, *skin_c)
    # Ojos
    eye_col = (14, 165, 233) if is_ssj else (15, 23, 42)
    c.fill_rect(cx - 4, y_body - 7, 2, 3, *eye_col)
    c.fill_rect(cx + 2, y_body - 7, 2, 3, *eye_col)

    # Cabello Saiyajin puntiagudo
    h_col = hair_gold if is_ssj else hair_black
    c.draw_ellipse(cx, y_body - 13, 8, 6, *h_col)
    c.fill_rect(cx - 11, y_body - 17, 6, 9, *h_col)
    c.fill_rect(cx - 6, y_body - 20, 6, 11, *h_col)
    c.fill_rect(cx + 1, y_body - 19, 6, 10, *h_col)
    c.fill_rect(cx + 6, y_body - 16, 6, 8, *h_col)


# ==============================================================================
# 2. VEGETA
# ==============================================================================
def render_vegeta(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    blue_suit = (29, 78, 216)    # Traje azul oscuro
    armor_white = (241, 245, 249) # Pechera Saiyajin
    armor_gold = (234, 179, 8)   # Correas doradas
    skin_c = (254, 215, 170)
    hair_black = (15, 23, 42)
    gloves_white = (248, 250, 252)

    if row == 4: # FOCUS: Brazos cruzados concentrado
        c.draw_ellipse(cx, cy + 6, 11, 10, *blue_suit)
        c.fill_rect(cx - 6, cy + 1, 12, 8, *armor_white)
        c.fill_rect(cx - 7, cy + 5, 14, 5, *gloves_white) # Brazos cruzados
        c.draw_ellipse(cx, cy - 7, 7, 7, *skin_c)
        c.fill_rect(cx - 5, cy - 8, 10, 2, 30, 41, 59)
        # Cabello alto hacia arriba
        c.fill_rect(cx - 7, cy - 23, 14, 16, *hair_black)
        c.fill_rect(cx - 4, cy - 26, 8, 6, *hair_black)
        # Aura azul
        c.draw_ellipse(cx, cy + 3, 16, 20, 59, 130, 246, 50)
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 8, 13, 8, *blue_suit)
        c.draw_ellipse(cx - 6, cy + 2, 7, 6, *skin_c)
        c.fill_rect(cx - 10, cy - 7, 12, 10, *hair_black)
        c.fill_rect(cx - 8, cy + 2, 4, 2, 30, 41, 59)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (5 if row == 3 else 0))

    # Piernas
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 11, 4, 7, *blue_suit)
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 4, 7, *blue_suit)
    c.fill_rect(cx - 6 + leg_offset, y_body + 15, 4, 4, *gloves_white) # Botas
    c.fill_rect(cx + 2 - leg_offset, y_body + 15, 4, 4, *gloves_white)

    # Torso (Armadura saiyajin con hombreras doradas)
    c.fill_rect(cx - 7, y_body, 14, 12, *armor_white)
    c.fill_rect(cx - 8, y_body - 1, 4, 3, *armor_gold)
    c.fill_rect(cx + 4, y_body - 1, 4, 3, *armor_gold)
    c.fill_rect(cx - 7, y_body + 8, 14, 3, *blue_suit)

    # Brazos / Guantes
    if row == 3: # VICTORY: Mano extendida con bola de energía Big Bang
        c.fill_rect(cx - 9, y_body + 2, 3, 7, *blue_suit)
        c.fill_rect(cx + 7, y_body - 4, 6, 4, *gloves_white)
        # Big Bang Attack esfera
        pulse = (frame % 3)
        c.draw_ellipse(cx + 16, y_body - 2, 5 + pulse, 5 + pulse, 96, 165, 250, 220)
        c.draw_ellipse(cx + 16, y_body - 2, 2, 2, 255, 255, 255, 255)
    else:
        c.fill_rect(cx - 9, y_body + 1, 3, 8, *blue_suit)
        c.fill_rect(cx + 7, y_body + 1, 3, 8, *blue_suit)
        c.fill_rect(cx - 9, y_body + 6, 3, 4, *gloves_white)
        c.fill_rect(cx + 7, y_body + 6, 3, 4, *gloves_white)

    # Cabeza
    c.draw_ellipse(cx, y_body - 6, 7, 7, *skin_c)
    # Expresión seria
    c.fill_rect(cx - 4, y_body - 7, 2, 2, 15, 23, 42)
    c.fill_rect(cx + 2, y_body - 7, 2, 2, 15, 23, 42)
    c.fill_rect(cx - 4, y_body - 9, 3, 1, 15, 23, 42) # Cejas fruncidas
    c.fill_rect(cx + 1, y_body - 9, 3, 1, 15, 23, 42)

    # Cabello en pico alto hacia el cielo
    c.fill_rect(cx - 7, y_body - 22, 14, 15, *hair_black)
    c.fill_rect(cx - 4, y_body - 25, 8, 5, *hair_black)
    c.fill_rect(cx - 1, y_body - 28, 3, 4, *hair_black)


# ==============================================================================
# 3. NARUTO UZUMAKI
# ==============================================================================
def render_naruto(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    orange = (249, 115, 22)      # Traje naranja
    black = (30, 41, 59)         # Cuello/hombros negro
    hair_yellow = (250, 204, 21) # Cabello rubio en picos
    blue_band = (30, 58, 138)    # Bandana
    metal = (203, 213, 225)      # Placa de Konoha
    skin_c = (254, 215, 170)
    rasengan = (125, 211, 252)

    if row == 4: # FOCUS: Leyendo pergamino de misiones
        c.draw_ellipse(cx, cy + 6, 11, 10, *orange)
        c.fill_rect(cx - 6, cy + 1, 12, 8, *black)
        c.draw_ellipse(cx, cy - 6, 7, 7, *skin_c)
        c.fill_rect(cx - 7, cy - 10, 14, 3, *blue_band)
        c.fill_rect(cx - 3, cy - 10, 6, 2, *metal)
        # Cabello
        c.fill_rect(cx - 8, cy - 15, 16, 5, *hair_yellow)
        # Pergamino
        c.fill_rect(cx - 8, cy + 5, 16, 8, 254, 243, 199)
        c.fill_rect(cx - 9, cy + 4, 2, 10, 180, 83, 9)
        c.fill_rect(cx + 7, cy + 4, 2, 10, 180, 83, 9)
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 8, 13, 8, *orange)
        c.draw_ellipse(cx - 6, cy + 2, 7, 6, *skin_c)
        c.fill_rect(cx - 10, cy - 6, 10, 6, *hair_yellow)
        c.fill_rect(cx - 8, cy + 2, 4, 2, 30, 41, 59)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (5 if row == 3 else 0))

    # Piernas
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 11, 4, 7, *orange)
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 4, 7, *orange)
    c.fill_rect(cx - 6 + leg_offset, y_body + 16, 4, 3, *blue_band) # Sandalias

    # Torso
    c.fill_rect(cx - 7, y_body, 14, 12, *orange)
    c.fill_rect(cx - 7, y_body, 14, 4, *black) # Hombros negros
    c.draw_ellipse(cx, y_body + 6, 3, 3, 239, 68, 68) # Espiral Uzumaki

    # Brazos
    if row == 3: # VICTORY: Sosteniendo Rasengan giratorio
        c.fill_rect(cx - 9, y_body + 1, 3, 8, *orange)
        c.fill_rect(cx + 7, y_body - 4, 6, 4, *skin_c)
        # Esfera Rasengan
        pulse = (frame % 3)
        c.draw_ellipse(cx + 16, y_body - 2, 6 + pulse, 6 + pulse, *rasengan, 220)
        c.draw_ellipse(cx + 16, y_body - 2, 2, 2, 255, 255, 255, 255)
    else:
        c.fill_rect(cx - 9, y_body + 1, 3, 8, *orange)
        c.fill_rect(cx + 7, y_body + 1, 3, 8, *orange)

    # Cabeza
    c.draw_ellipse(cx, y_body - 6, 7, 7, *skin_c)
    # Bandana
    c.fill_rect(cx - 7, y_body - 10, 14, 3, *blue_band)
    c.fill_rect(cx - 3, y_body - 10, 6, 2, *metal)
    # Ojos celestes
    c.fill_rect(cx - 4, y_body - 7, 2, 2, 56, 189, 248)
    c.fill_rect(cx + 2, y_body - 7, 2, 2, 56, 189, 248)
    # Bigotes de zorro en mejillas
    c.fill_rect(cx - 6, y_body - 5, 2, 1, 148, 163, 184)
    c.fill_rect(cx + 4, y_body - 5, 2, 1, 148, 163, 184)

    # Cabello rubio en picos
    c.fill_rect(cx - 8, y_body - 15, 16, 5, *hair_yellow)
    c.fill_rect(cx - 6, y_body - 18, 4, 4, *hair_yellow)
    c.fill_rect(cx + 2, y_body - 18, 4, 4, *hair_yellow)


# ==============================================================================
# 4. MONKEY D. LUFFY
# ==============================================================================
def render_luffy(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    red_vest = (220, 38, 38)
    blue_shorts = (37, 99, 235)
    straw_hat = (245, 158, 11)   # Paja dorada
    hat_ribbon = (185, 28, 28)   # Cinta roja
    skin_c = (254, 215, 170)
    hair_black = (15, 23, 42)

    if row == 4: # FOCUS: Comiendo una pierna de carne gigante
        c.draw_ellipse(cx, cy + 6, 11, 10, *red_vest)
        c.fill_rect(cx - 4, cy + 1, 8, 8, *skin_c) # Pecho abierto
        c.draw_ellipse(cx, cy - 6, 7, 7, *skin_c)
        c.fill_rect(cx - 8, cy - 11, 16, 5, *hair_black)
        # Sombrero
        c.draw_ellipse(cx, cy - 13, 13, 3, *straw_hat)
        c.draw_ellipse(cx, cy - 16, 8, 4, *straw_hat)
        # Pierna de carne
        c.draw_ellipse(cx + 8, cy + 2, 6, 4, 180, 83, 9)
        c.fill_rect(cx + 12, cy + 1, 4, 2, 255, 255, 255) # Hueso
        return

    if row == 5: # SLEEP: Sombrero tapando la cara
        c.draw_ellipse(cx, cy + 8, 13, 8, *red_vest)
        c.draw_ellipse(cx - 4, cy + 2, 9, 5, *straw_hat) # Sombrero sobre ojos
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Piernas
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 10, 4, 6, *blue_shorts)
    c.fill_rect(cx + 2 - leg_offset, y_body + 10, 4, 6, *blue_shorts)
    c.fill_rect(cx - 6 + leg_offset, y_body + 15, 4, 4, *skin_c) # Piernas descubiertas
    c.fill_rect(cx + 2 - leg_offset, y_body + 15, 4, 4, *skin_c)

    # Torso (Chaleco rojo abierto)
    c.fill_rect(cx - 7, y_body, 14, 11, *red_vest)
    c.fill_rect(cx - 3, y_body, 6, 10, *skin_c) # Pecho descubierto con cicatriz en X
    c.fill_rect(cx - 2, y_body + 4, 4, 1, 239, 68, 68)

    # Brazos
    if row == 3: # VICTORY: Brazos de goma estirados en alto
        c.fill_rect(cx - 10, y_body - 8, 3, 14, *skin_c)
        c.fill_rect(cx + 8, y_body - 8, 3, 14, *skin_c)
    else:
        c.fill_rect(cx - 9, y_body + 1, 3, 8, *skin_c)
        c.fill_rect(cx + 7, y_body + 1, 3, 8, *skin_c)

    # Cabeza
    c.draw_ellipse(cx, y_body - 6, 7, 7, *skin_c)
    # Cicatriz bajo ojo
    c.fill_rect(cx - 4, y_body - 7, 2, 2, 15, 23, 42) # Ojo izq
    c.fill_rect(cx + 2, y_body - 7, 2, 2, 15, 23, 42) # Ojo der
    c.fill_rect(cx - 4, y_body - 4, 2, 1, 239, 68, 68) # Cicatriz
    c.fill_rect(cx - 2, y_body - 3, 5, 2, 255, 255, 255) # Sonrisa amplia

    # Cabello negro despeinado
    c.fill_rect(cx - 8, y_body - 12, 16, 5, *hair_black)

    # Sombrero de paja característico
    c.draw_ellipse(cx, y_body - 12, 14, 3, *straw_hat)
    c.draw_ellipse(cx, y_body - 15, 8, 4, *straw_hat)
    c.fill_rect(cx - 7, y_body - 14, 14, 2, *hat_ribbon)


# ==============================================================================
# 5. RORONOA ZORO
# ==============================================================================
def render_zoro(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    green_robe = (6, 95, 70)     # Abrigo verde oscuro
    red_sash = (220, 38, 38)     # Faja roja
    hair_green = (34, 197, 94)   # Cabello verde
    skin_c = (254, 215, 170)
    katana_sheath = (30, 41, 59)
    blade = (226, 232, 240)

    if row == 4: # FOCUS: Meditación con katana sobre el regazo
        c.draw_ellipse(cx, cy + 6, 12, 10, *green_robe)
        c.fill_rect(cx - 4, cy + 2, 8, 8, *skin_c)
        c.draw_ellipse(cx, cy - 6, 7, 7, *skin_c)
        c.fill_rect(cx - 7, cy - 11, 14, 6, *hair_green)
        c.fill_rect(cx - 5, cy - 7, 10, 1, 30, 41, 59) # Ojos cerrados
        # Katana en regazo
        c.fill_rect(cx - 12, cy + 6, 24, 2, *blade)
        c.fill_rect(cx - 14, cy + 5, 4, 4, 180, 83, 9)
        return

    if row == 5: # SLEEP: Roncando profundamente
        c.draw_ellipse(cx, cy + 8, 13, 8, *green_robe)
        c.draw_ellipse(cx - 6, cy + 2, 7, 6, *skin_c)
        c.fill_rect(cx - 9, cy - 6, 10, 6, *hair_green)
        c.fill_rect(cx - 8, cy + 2, 4, 2, 30, 41, 59)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (5 if row == 3 else 0))

    # Piernas
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 11, 4, 7, *green_robe)
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 4, 7, *green_robe)

    # Torso (Kimono verde con pecho entreabierto y faja roja)
    c.fill_rect(cx - 7, y_body, 14, 12, *green_robe)
    c.fill_rect(cx - 2, y_body, 4, 8, *skin_c)
    c.fill_rect(cx - 7, y_body + 8, 14, 3, *red_sash)

    # 3 katanas en la cadera derecha
    c.fill_rect(cx + 6, y_body + 6, 5, 2, *katana_sheath)
    c.fill_rect(cx + 7, y_body + 8, 5, 2, 234, 179, 8)

    # Brazos / Ataque
    if row == 3: # VICTORY: Corte triple de katanas (Santoryu)
        c.fill_rect(cx - 10, y_body - 4, 4, 8, *green_robe)
        c.fill_rect(cx + 7, y_body - 4, 4, 8, *green_robe)
        # Hojas de katana destellando
        c.fill_rect(cx - 18, y_body - 6, 14, 2, *blade)
        c.fill_rect(cx + 7, y_body - 6, 14, 2, *blade)
        # Katana en la boca
        c.fill_rect(cx - 8, y_body - 3, 16, 2, *blade)
        # Destello verde de corte
        c.draw_ellipse(cx, y_body, 20, 2, 52, 211, 153, 160)
    else:
        c.fill_rect(cx - 9, y_body + 1, 3, 8, *green_robe)
        c.fill_rect(cx + 7, y_body + 1, 3, 8, *green_robe)

    # Cabeza
    c.draw_ellipse(cx, y_body - 6, 7, 7, *skin_c)
    # Ojo derecho abierto, izquierdo con cicatriz
    c.fill_rect(cx - 4, y_body - 7, 2, 2, 15, 23, 42)
    c.fill_rect(cx + 2, y_body - 8, 1, 4, 185, 28, 28) # Cicatriz vertical

    # Cabello verde característico
    c.fill_rect(cx - 7, y_body - 14, 14, 7, *hair_green)
    c.fill_rect(cx - 5, y_body - 16, 10, 3, *hair_green)


# ==============================================================================
# 6. SATORU GOJO
# ==============================================================================
def render_gojo(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    dark_suit = (15, 23, 42)     # Uniforme azul noche / negro
    hair_white = (248, 250, 252) # Cabello blanco plateado
    blindfold = (2, 6, 23)       # Venda negra
    skin_c = (254, 215, 170)
    six_eyes = (56, 189, 248)    # Ojos azules infinitos

    if row == 4: # FOCUS: Sello manual de Expansión de Dominio
        c.draw_ellipse(cx, cy + 6, 11, 10, *dark_suit)
        c.draw_ellipse(cx, cy - 6, 7, 7, *skin_c)
        c.fill_rect(cx - 7, cy - 9, 14, 4, *blindfold)
        c.fill_rect(cx - 8, cy - 15, 16, 7, *hair_white)
        # Manos cruzadas formando el sello
        c.fill_rect(cx - 3, cy + 3, 6, 5, *skin_c)
        # Esferas de Infinito azul y rojo
        pulse = (frame % 3)
        c.draw_ellipse(cx - 10, cy + 2, 4 + pulse, 4 + pulse, 59, 130, 246, 200) # Azul
        c.draw_ellipse(cx + 10, cy + 2, 4 + pulse, 4 + pulse, 239, 68, 68, 200)  # Rojo
        return

    if row == 5: # SLEEP: Descansando reclinado
        c.draw_ellipse(cx, cy + 8, 13, 8, *dark_suit)
        c.draw_ellipse(cx - 6, cy + 2, 7, 6, *skin_c)
        c.fill_rect(cx - 10, cy - 6, 10, 6, *hair_white)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (5 if row == 3 else 0))

    # Piernas
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 11, 4, 7, *dark_suit)
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 4, 7, *dark_suit)

    # Torso (Uniforme cuello alto)
    c.fill_rect(cx - 7, y_body, 14, 12, *dark_suit)
    c.fill_rect(cx - 4, y_body - 2, 8, 3, *dark_suit) # Cuello alto

    # Brazos
    if row == 3: # VICTORY: Levanta el antifaz mostrando sus Seis Ojos
        c.fill_rect(cx - 9, y_body + 1, 3, 8, *dark_suit)
        c.fill_rect(cx + 5, y_body - 5, 4, 6, *skin_c) # Mano levantando venda
    else:
        c.fill_rect(cx - 9, y_body + 1, 3, 8, *dark_suit)
        c.fill_rect(cx + 7, y_body + 1, 3, 8, *dark_suit)

    # Cabeza
    c.draw_ellipse(cx, y_body - 6, 7, 7, *skin_c)

    if row == 3: # En VICTORY se ven sus ojos azules infinitos
        c.fill_rect(cx - 4, y_body - 7, 3, 3, *six_eyes)
        c.fill_rect(cx + 2, y_body - 7, 3, 3, *six_eyes)
        c.fill_rect(cx - 3, y_body - 6, 1, 1, 255, 255, 255) # Brillo infinito
        c.fill_rect(cx + 3, y_body - 6, 1, 1, 255, 255, 255)
        c.fill_rect(cx - 7, y_body - 12, 14, 3, *blindfold) # Venda corrida arriba
    else:
        c.fill_rect(cx - 7, y_body - 8, 14, 4, *blindfold) # Venda cubriendo ojos

    # Cabello blanco erizado
    c.fill_rect(cx - 8, y_body - 16, 16, 8, *hair_white)
    c.fill_rect(cx - 5, y_body - 19, 10, 4, *hair_white)


# ==============================================================================
# 7. TANJIRO KAMADO
# ==============================================================================
def render_tanjiro(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    green = (16, 185, 129)       # Cuadros verdes
    black = (15, 23, 42)         # Cuadros negros
    uniform = (30, 41, 59)
    skin_c = (254, 215, 170)
    hair_red = (153, 27, 27)     # Cabello burdeos
    water = (56, 189, 248)

    if row == 4: # FOCUS: Respiración de Concentración Total
        c.draw_ellipse(cx, cy + 6, 12, 10, *green)
        c.draw_ellipse(cx, cy - 6, 7, 7, *skin_c)
        c.fill_rect(cx - 7, cy - 12, 14, 6, *hair_red)
        # Aretes Hanafuda
        c.fill_rect(cx - 8, cy - 3, 2, 4, 248, 250, 252)
        # Vapor blanco de respiración
        c.draw_ellipse(cx + 6 + (frame % 3) * 2, cy - 3, 3, 2, 255, 255, 255, 180)
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 8, 13, 8, *green)
        c.draw_ellipse(cx - 6, cy + 2, 7, 6, *skin_c)
        c.fill_rect(cx - 9, cy - 6, 10, 6, *hair_red)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (5 if row == 3 else 0))

    # Piernas
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 11, 4, 7, *uniform)
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 4, 7, *uniform)

    # Torso (Haori a cuadros verde y negro)
    c.fill_rect(cx - 8, y_body, 16, 12, *green)
    # Patrón de cuadros
    c.fill_rect(cx - 8, y_body, 4, 4, *black)
    c.fill_rect(cx, y_body, 4, 4, *black)
    c.fill_rect(cx - 4, y_body + 4, 4, 4, *black)
    c.fill_rect(cx + 4, y_body + 4, 4, 4, *black)
    c.fill_rect(cx - 8, y_body + 8, 4, 4, *black)
    c.fill_rect(cx, y_body + 8, 4, 4, *black)

    # Brazos / Katana
    if row == 3: # VICTORY: Danza del Agua circular
        c.fill_rect(cx - 10, y_body - 4, 4, 8, *green)
        c.fill_rect(cx + 7, y_body - 4, 4, 8, *green)
        # Espada nichirin negra
        c.fill_rect(cx + 7, y_body - 10, 2, 14, *black)
        # Onda de agua
        c.draw_ellipse(cx, y_body, 18, 5, *water, 160)
        c.draw_ellipse(cx, y_body, 14, 2, 255, 255, 255, 200)
    else:
        c.fill_rect(cx - 9, y_body + 1, 3, 8, *green)
        c.fill_rect(cx + 7, y_body + 1, 3, 8, *green)

    # Cabeza
    c.draw_ellipse(cx, y_body - 6, 7, 7, *skin_c)
    # Marca de cazador en frente izquierda
    c.fill_rect(cx - 5, y_body - 10, 3, 3, 185, 28, 28)
    # Ojos burdeos
    c.fill_rect(cx - 4, y_body - 7, 2, 2, *hair_red)
    c.fill_rect(cx + 2, y_body - 7, 2, 2, *hair_red)
    # Arete Hanafuda
    c.fill_rect(cx - 8, y_body - 3, 2, 4, 248, 250, 252)

    # Cabello peinado hacia atrás
    c.fill_rect(cx - 7, y_body - 15, 14, 8, *hair_red)
    c.fill_rect(cx - 5, y_body - 17, 10, 3, *hair_red)


# ==============================================================================
# 8. NEZUKO KAMADO
# ==============================================================================
def render_nezuko(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    pink_kimono = (244, 114, 182) # Kimono rosa
    black_haori = (15, 23, 42)    # Haori negro exterior
    bamboo = (34, 197, 94)        # Boquilla de bambú
    hair_black = (15, 23, 42)
    hair_orange = (249, 115, 22)  # Puntas naranjas
    skin_c = (254, 215, 170)
    eyes_pink = (236, 72, 153)

    if row == 4: # FOCUS: Asomada y tranquila
        c.draw_ellipse(cx, cy + 6, 11, 10, *pink_kimono)
        c.fill_rect(cx - 8, cy + 2, 4, 10, *black_haori)
        c.fill_rect(cx + 4, cy + 2, 4, 10, *black_haori)
        c.draw_ellipse(cx, cy - 6, 7, 7, *skin_c)
        c.fill_rect(cx - 3, cy - 4, 6, 3, *bamboo) # Boquilla
        c.fill_rect(cx - 8, cy - 12, 16, 7, *hair_black)
        return

    if row == 5: # SLEEP: Enroscadita durmiendo
        c.draw_ellipse(cx, cy + 8, 13, 8, *pink_kimono)
        c.draw_ellipse(cx - 6, cy + 2, 7, 6, *skin_c)
        c.fill_rect(cx - 8, cy + 3, 4, 2, *bamboo)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (5 if row == 3 else 0))

    # Vestido / Piernas
    c.fill_rect(cx - 6, y_body + 10, 12, 8, *pink_kimono)
    c.fill_rect(cx - 5, y_body + 16, 3, 3, 248, 250, 252) # Calcetines
    c.fill_rect(cx + 2, y_body + 16, 3, 3, 248, 250, 252)

    # Torso (Kimono rosa y Haori negro exterior)
    c.fill_rect(cx - 7, y_body, 14, 12, *pink_kimono)
    c.fill_rect(cx - 8, y_body, 3, 12, *black_haori)
    c.fill_rect(cx + 5, y_body, 3, 12, *black_haori)
    c.fill_rect(cx - 6, y_body + 5, 12, 3, 220, 38, 38) # Obi rojo a cuadros

    # Brazos
    c.fill_rect(cx - 9, y_body + 1, 3, 8, *black_haori)
    c.fill_rect(cx + 7, y_body + 1, 3, 8, *black_haori)

    # Cabello largo detrás con puntas naranjas
    c.fill_rect(cx - 10, y_body - 10, 4, 18, *hair_black)
    c.fill_rect(cx + 6, y_body - 10, 4, 18, *hair_black)
    c.fill_rect(cx - 10, y_body + 6, 4, 4, *hair_orange) # Puntas naranjas
    c.fill_rect(cx + 6, y_body + 6, 4, 4, *hair_orange)

    # Cabeza
    c.draw_ellipse(cx, y_body - 6, 7, 7, *skin_c)
    # Ojos rosas grandes
    c.fill_rect(cx - 4, y_body - 7, 2, 2, *eyes_pink)
    c.fill_rect(cx + 2, y_body - 7, 2, 2, *eyes_pink)
    # Boquilla de bambú verde
    c.fill_rect(cx - 3, y_body - 4, 6, 3, *bamboo)
    c.fill_rect(cx - 5, y_body - 4, 2, 1, 220, 38, 38) # Cuerda roja
    c.fill_rect(cx + 3, y_body - 4, 2, 1, 220, 38, 38)

    # Flequillo y lazo rosa en cabello
    c.fill_rect(cx - 7, y_body - 13, 14, 7, *hair_black)
    c.fill_rect(cx + 3, y_body - 12, 3, 3, *pink_kimono) # Lazo

    if row == 3: # VICTORY: Destellos rosados de flor
        c.fill_rect(cx - 12, y_body - 8, 3, 3, 244, 114, 182)
        c.fill_rect(cx + 10, y_body - 6, 3, 3, 244, 114, 182)


# ==============================================================================
# 9. SAITAMA
# ==============================================================================
def render_saitama(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    yellow = (234, 179, 8)       # Traje amarillo
    red_gloves = (220, 38, 38)   # Guantes y botas rojas
    white_cape = (248, 250, 252) # Capa blanca
    skin_c = (254, 215, 170)
    belt = (30, 41, 59)

    if row == 4: # FOCUS: Leyendo folleto de ofertas del supermercado
        c.draw_ellipse(cx, cy + 6, 11, 10, *yellow)
        c.draw_ellipse(cx, cy - 6, 7, 7, *skin_c)
        c.fill_rect(cx - 4, cy - 7, 2, 1, 30, 41, 59)
        c.fill_rect(cx + 2, cy - 7, 2, 1, 30, 41, 59)
        # Folleto en manos rojas
        c.fill_rect(cx - 7, cy + 3, 14, 8, 254, 240, 138)
        c.fill_rect(cx - 5, cy + 5, 10, 1, 239, 68, 68)
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 8, 13, 8, *yellow)
        c.draw_ellipse(cx - 6, cy + 2, 7, 6, *skin_c)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (5 if row == 3 else 0))

    # Capa blanca ondeando atrás
    cape_offset = 2 if (frame % 2 == 1) else 0
    c.fill_rect(cx - 9, y_body + 1, 3, 16 + cape_offset, *white_cape)
    c.fill_rect(cx + 6, y_body + 1, 3, 16 + cape_offset, *white_cape)

    # Piernas
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 11, 4, 7, *yellow)
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 4, 7, *yellow)
    c.fill_rect(cx - 6 + leg_offset, y_body + 15, 4, 4, *red_gloves) # Botas
    c.fill_rect(cx + 2 - leg_offset, y_body + 15, 4, 4, *red_gloves)

    # Torso (Traje amarillo con cinturón y cremallera)
    c.fill_rect(cx - 7, y_body, 14, 12, *yellow)
    c.fill_rect(cx - 1, y_body, 2, 8, 248, 250, 252) # Cremallera
    c.fill_rect(cx - 7, y_body + 9, 14, 2, *belt)
    c.fill_rect(cx - 2, y_body + 8, 4, 3, 234, 179, 8) # Hebilla dorada

    # Brazos / Puñetazo
    if row == 3: # VICTORY: Puñetazo serio con onda expansiva
        c.fill_rect(cx - 8, y_body + 1, 3, 7, *yellow)
        # Puño rojo lanzado hacia el frente
        c.fill_rect(cx + 4, y_body - 1, 9, 6, *red_gloves)
        # Onda de choque blanca
        c.draw_ellipse(cx + 17, y_body + 2, 6, 8, 255, 255, 255, 200)
    else:
        c.fill_rect(cx - 9, y_body + 1, 3, 8, *yellow)
        c.fill_rect(cx + 7, y_body + 1, 3, 8, *yellow)
        c.fill_rect(cx - 9, y_body + 6, 3, 4, *red_gloves)
        c.fill_rect(cx + 7, y_body + 6, 3, 4, *red_gloves)

    # Cabeza calva brillante
    c.draw_ellipse(cx, y_body - 6, 7, 7, *skin_c)
    c.fill_rect(cx - 3, y_body - 11, 2, 2, 255, 255, 255, 220) # Brillo en calva
    # Ojos cómicos sencillos o serios
    c.fill_rect(cx - 4, y_body - 7, 2, 2, 15, 23, 42)
    c.fill_rect(cx + 2, y_body - 7, 2, 2, 15, 23, 42)


# ==============================================================================
# 10. LEVI ACKERMAN
# ==============================================================================
def render_levi(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    scout_green = (22, 101, 52)   # Capa verde del Cuerpo de Exploración
    white_pants = (248, 250, 252) # Pantalón blanco
    brown_jacket = (120, 53, 15)  # Chaqueta militar marrón corta
    boots = (69, 26, 3)
    skin_c = (254, 215, 170)
    hair_black = (15, 23, 42)     # Undercut negro
    blades = (203, 213, 225)      # Navajas de titanio

    if row == 4: # FOCUS: Limpiando minuciosamente su equipo
        c.draw_ellipse(cx, cy + 6, 11, 10, *scout_green)
        c.draw_ellipse(cx, cy - 6, 7, 7, *skin_c)
        c.fill_rect(cx - 7, cy - 12, 14, 6, *hair_black)
        c.fill_rect(cx - 4, cy - 7, 2, 2, 15, 23, 42)
        c.fill_rect(cx + 2, cy - 7, 2, 2, 15, 23, 42)
        # Paño blanco limpiando cuchilla
        c.fill_rect(cx - 6, cy + 3, 12, 2, *blades)
        c.fill_rect(cx - 2, cy + 2, 4, 4, 255, 255, 255)
        return

    if row == 5: # SLEEP: Sentado de brazos cruzados descansando
        c.draw_ellipse(cx, cy + 8, 12, 8, *scout_green)
        c.draw_ellipse(cx - 5, cy + 2, 6, 6, *skin_c)
        c.fill_rect(cx - 8, cy - 4, 8, 6, *hair_black)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Capa verde atrás
    c.fill_rect(cx - 8, y_body, 16, 14, *scout_green)

    # Piernas
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 11, 4, 7, *white_pants)
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 4, 7, *white_pants)
    c.fill_rect(cx - 6 + leg_offset, y_body + 14, 4, 5, *boots) # Botas altas
    c.fill_rect(cx + 2 - leg_offset, y_body + 14, 4, 5, *boots)

    # Torso (Chaqueta marrón corta y pañuelo blanco ascot)
    c.fill_rect(cx - 7, y_body, 14, 9, *brown_jacket)
    c.fill_rect(cx - 2, y_body, 4, 4, 248, 250, 252) # Pañuelo ascot
    c.fill_rect(cx - 7, y_body + 8, 14, 2, *boots)   # Arnés

    # Brazos / Cuchillas
    if row == 3: # VICTORY: Giro giratorio con cuchillas dobles
        c.fill_rect(cx - 10, y_body - 4, 4, 8, *brown_jacket)
        c.fill_rect(cx + 7, y_body - 4, 4, 8, *brown_jacket)
        # Cuchillas en ángulo opuesto característico de Levi
        c.fill_rect(cx - 16, y_body - 8, 12, 2, *blades)
        c.fill_rect(cx + 7, y_body + 4, 12, 2, *blades)
        # Efecto de giro
        c.draw_ellipse(cx, y_body, 18, 4, 255, 255, 255, 120)
    else:
        c.fill_rect(cx - 9, y_body + 1, 3, 8, *brown_jacket)
        c.fill_rect(cx + 7, y_body + 1, 3, 8, *brown_jacket)

    # Cabeza
    c.draw_ellipse(cx, y_body - 6, 7, 7, *skin_c)
    # Mirada afilada seria
    c.fill_rect(cx - 4, y_body - 7, 2, 2, 15, 23, 42)
    c.fill_rect(cx + 2, y_body - 7, 2, 2, 15, 23, 42)
    c.fill_rect(cx - 4, y_body - 8, 3, 1, 15, 23, 42)
    c.fill_rect(cx + 1, y_body - 8, 3, 1, 15, 23, 42)

    # Cabello negro peinado undercut con raya al medio
    c.fill_rect(cx - 7, y_body - 14, 14, 6, *hair_black)
    c.fill_rect(cx - 6, y_body - 10, 4, 3, *hair_black)
    c.fill_rect(cx + 2, y_body - 10, 4, 3, *hair_black)


# ==============================================================================
# CONFIGURACIÓN DEL LOTE ANIME ÉLITE
# ==============================================================================
ANIME_SKINS = [
    {
        "id": "son-goku",
        "name": "Son Goku",
        "personalityPrompt": "Alegre, perseverante, siempre buscando superar sus propios límites con disciplina.",
        "dialogues": {
            "alert": "¡Siento una energía aproximándose! Es momento de ponernos en guardia con tus pendientes.",
            "victory": "¡Lo logramos! ¡Superamos el límite con este merge!",
            "focus": "Entrenando la concentración. Acumulando Ki para resolver cada línea de código.",
            "break": "Una pausa para comer y recargar energías antes de la siguiente ronda.",
            "sleep": "A descansar un rato... mañana volvemos a entrenar al máximo."
        },
        "render": render_goku
    },
    {
        "id": "vegeta-prince",
        "name": "Príncipe Vegeta",
        "personalityPrompt": "Orgulloso, implacable, enfocado en ser el mejor desarrollador y estudiante del universo.",
        "dialogues": {
            "alert": "¡No te descuides, insecto! Esa entrega no se va a completar sola.",
            "victory": "Un resultado digno de la realeza Saiyajin. Bien hecho.",
            "focus": "Cámara de gravedad activada. Cero distracciones.",
            "break": "Un descanso táctico. No te acostumbres a bajar la guardia.",
            "sleep": "Descanso breve. Un verdadero guerrero siempre está listo."
        },
        "render": render_vegeta
    },
    {
        "id": "naruto-uzumaki",
        "name": "Naruto Uzumaki",
        "personalityPrompt": "Enérgico, leal a su palabra, nunca se rinde ante un bug o un examen difícil.",
        "dialogues": {
            "alert": "¡Deberas! Hay una misión urgente en tu pergamino de tareas.",
            "victory": "¡Ese es mi camino ninja! Merge exitoso sin dudar jamás.",
            "focus": "Entrenando el control de chakra para mantener el foco en la tarea.",
            "break": "¡Hora de un tazón de ramen para reponer fuerzas!",
            "sleep": "Cerrando los ojos... soñando con ser Hokage."
        },
        "render": render_naruto
    },
    {
        "id": "monkey-d-luffy",
        "name": "Monkey D. Luffy",
        "personalityPrompt": "Aventurero, optimista, convencido de que llegará a ser el Rey de los Desarrolladores.",
        "dialogues": {
            "alert": "¡Tierra a la vista! Prepárate, tenemos una entrega importante navegando hacia acá.",
            "victory": "¡Sugoiii! ¡Un commit legendario digno del Grand Line!",
            "focus": "Concentrándome al máximo... ¡para después celebrar con un gran banquete!",
            "break": "¡Carne! Necesito un refrigerio antes de seguir navegando.",
            "sleep": "Zzz... roncando feliz con el sombrero bien puesto."
        },
        "render": render_luffy
    },
    {
        "id": "roronoa-zoro",
        "name": "Roronoa Zoro",
        "personalityPrompt": "Disciplinado, silencioso, cortando cada problema con precisión de espadachín.",
        "dialogues": {
            "alert": "No pierdas el rumbo. Hay una entrega frente a nosotros.",
            "victory": "Corte perfecto. Nada se interpone ante el objetivo.",
            "focus": "Meditación de espadas. Mente afilada como el acero.",
            "break": "Momento de afilar las hojas y despejar la mente.",
            "sleep": "Siesta reparadora. Despiértame si hay acción."
        },
        "render": render_zoro
    },
    {
        "id": "satoru-gojo",
        "name": "Satoru Gojo",
        "personalityPrompt": "Confiado, carismático, el hechicero más fuerte que manipula el espacio y el tiempo.",
        "dialogues": {
            "alert": "Tranquilo, yo me encargo de vigilar el tiempo. Tienes una entrega pronto.",
            "victory": "Demasiado fácil. Nuestro trabajo es impecable, después de todo soy el más fuerte.",
            "focus": "Activando Vacío Infinito: toda distracción se detiene antes de alcanzarnos.",
            "break": "Vamos por unos dulces para endulzar la jornada.",
            "sleep": "Descanso total. El infinito mantendrá todo a salvo."
        },
        "render": render_gojo
    },
    {
        "id": "tanjiro-kamado",
        "name": "Tanjiro Kamado",
        "personalityPrompt": "Empático, perseverante, guiado por la respiración y el olfato certero para resolver tareas.",
        "dialogues": {
            "alert": "Puedo oler la fecha límite acercándose. Mantengamos la calma y el paso firme.",
            "victory": "¡Respiración del Agua, forma final! Trabajo completado con honor.",
            "focus": "Inhalar hondo, exhalar con calma. Respiración de concentración total.",
            "break": "Un té caliente para calmar el cuerpo y seguir adelante.",
            "sleep": "Un sueño tranquilo para recuperar todas las fuerzas."
        },
        "render": render_tanjiro
    },
    {
        "id": "nezuko-kamado",
        "name": "Nezuko Kamado",
        "personalityPrompt": "Protectora, tierna, dulce pero tenaz para cuidar el ritmo de trabajo.",
        "dialogues": {
            "alert": "¡Mmmh! Señal de que una entrega importante requiere tu atención.",
            "victory": "¡Mmh mmh! Victoria impecable, todo quedó en orden.",
            "focus": "Acompañándote en silencio y cuidando que nada interrumpa tu tranquilidad.",
            "break": "Momento de estirar las piernas y tomar aire fresco.",
            "sleep": "Mmh... descansando en mi cajita protegida."
        },
        "render": render_nezuko
    },
    {
        "id": "saitama-hero",
        "name": "Saitama",
        "personalityPrompt": "Despreocupado pero con fuerza imparable para demoler tareas pendientes de un solo golpe.",
        "dialogues": {
            "alert": "Oye, revisa el reloj... hay una entrega pendiente y hoy son las ofertas del súper.",
            "victory": "Listo. Resuelto de un solo golpe sin sudar.",
            "focus": "Leyendo el catálogo de ofertas mientras dejas el código terminado.",
            "break": "Un té y descanso, no te compliques demasiado.",
            "sleep": "Zzz... durmiendo plácidamente."
        },
        "render": render_saitama
    },
    {
        "id": "levi-ackerman",
        "name": "Capitán Levi",
        "personalityPrompt": "Meticuloso, impecable con la limpieza del código, letalmente eficiente.",
        "dialogues": {
            "alert": "Esa entrega está a la vista. No permitas que un descuido arruine la operación.",
            "victory": "El área está limpia y el código en orden. Buen trabajo.",
            "focus": "Cero suciedad, cero distracciones. Concentración absoluta.",
            "break": "Una taza de té negro sujetada como corresponde.",
            "sleep": "Descanso breve sentado en la silla. Listos para el siguiente despliegue."
        },
        "render": render_levi
    }
]


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    skins_dir = os.path.join(base_dir, "public", "skins")

    print(f"[MySkin] Generando {len(ANIME_SKINS)} skins del Pack Anime Élite en {skins_dir}...")

    for skin in ANIME_SKINS:
        skin_id = skin["id"]
        skin_dir = os.path.join(skins_dir, skin_id)
        os.makedirs(skin_dir, exist_ok=True)

        manifest = {
            "id": skin_id,
            "name": skin["name"],
            "category": "anime",
            "frameWidth": 64,
            "frameHeight": 64,
            "scale": 2,
            "anchorY": 85,
            "personalityPrompt": skin["personalityPrompt"],
            "dialogues": skin["dialogues"],
            "states": {
                "IDLE": { "row": 0, "frames": 4, "fps": 6, "loop": True },
                "WALK": { "row": 1, "frames": 6, "fps": 10, "loop": True },
                "ALERT_SEMESTRE": { "row": 2, "frames": 4, "fps": 8, "loop": True },
                "VICTORY_GITHUB": { "row": 3, "frames": 6, "fps": 12, "loop": False, "nextState": "IDLE" },
                "FOCUS": { "row": 4, "frames": 4, "fps": 6, "loop": True },
                "SLEEP": { "row": 5, "frames": 4, "fps": 4, "loop": True }
            }
        }

        manifest_path = os.path.join(skin_dir, "manifest.json")
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)

        canvas = Canvas(WIDTH, HEIGHT)
        render_func = skin["render"]

        for row in range(6):
            fy = row * 64
            max_frames = 6 if row in [1, 3] else 4
            for frame in range(max_frames):
                fx = frame * 64
                render_func(canvas, fx, fy, frame, row)

        png_data = create_png(WIDTH, HEIGHT, canvas.buf)
        spritesheet_path = os.path.join(skin_dir, "spritesheet.png")
        with open(spritesheet_path, "wb") as f:
            f.write(png_data)

        print(f" -> Generada skin: '{skin_id}' ({skin['name']})")

    print("[MySkin] Las 10 skins del Pack Anime Élite fueron creadas satisfactoriamente.")

if __name__ == "__main__":
    main()
