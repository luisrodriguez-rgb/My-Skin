#!/usr/bin/env python3
"""
MySkin - Generador de Skins del Pack Leyendas del Gaming
Genera manifest.json y spritesheet.png (384x384, 6 filas x 6 columnas, 64x64 px por frame)
para 10 personajes iconicos de videojuegos:
1. super-mario (Super Mario)
2. link-hero (Link - Heroe del Tiempo)
3. pikachu-electric (Pikachu)
4. sonic-hedgehog (Sonic the Hedgehog)
5. kirby-dream (Kirby)
6. mega-man-blue (Mega Man)
7. master-chief-117 (Master Chief)
8. kratos-war (Kratos)
9. sans-undertale (Sans el Esqueleto)
10. steve-craft (Steve de Minecraft)
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
# 1. SUPER MARIO
# ==============================================================================
def render_mario(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    red = (220, 38, 38)
    blue = (37, 99, 235)
    yellow = (250, 204, 21)
    skin_c = (254, 215, 170)
    brown = (67, 40, 24)
    white = (248, 250, 252)

    if row == 4: # FOCUS: Golpeando bloque de interrogacion
        # Bloque de interrogacion
        c.fill_rect(cx - 8, cy - 24, 16, 16, *yellow)
        c.fill_rect(cx - 7, cy - 23, 14, 14, 234, 179, 8)
        c.fill_rect(cx - 2, cy - 21, 4, 2, *brown)
        c.fill_rect(cx + 1, cy - 19, 2, 3, *brown)
        c.fill_rect(cx - 1, cy - 16, 2, 2, *brown)
        c.fill_rect(cx - 1, cy - 13, 2, 2, *brown)
        # Mario sentado mirando arriba
        c.draw_ellipse(cx, cy + 6, 10, 8, *blue)
        c.draw_ellipse(cx, cy - 4, 7, 7, *skin_c)
        c.fill_rect(cx - 8, cy - 10, 16, 5, *red)
        c.fill_rect(cx - 4, cy - 4, 8, 3, *brown) # Bigote
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 8, 12, 7, *blue)
        c.draw_ellipse(cx - 5, cy + 2, 7, 6, *skin_c)
        c.fill_rect(cx - 9, cy - 2, 15, 5, *red) # Gorra sobre ojos
        c.fill_rect(cx - 8, cy + 2, 6, 3, *brown)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Piernas
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 11, 4, 6, *blue)
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 4, 6, *blue)
    c.fill_rect(cx - 7 + leg_offset, y_body + 16, 6, 3, *brown) # Zapatos
    c.fill_rect(cx + 1 - leg_offset, y_body + 16, 6, 3, *brown)

    # Torso (Overol y camisa roja)
    c.fill_rect(cx - 7, y_body, 14, 12, *red)
    c.fill_rect(cx - 5, y_body + 2, 10, 10, *blue) # Pechera
    c.fill_rect(cx - 4, y_body + 4, 2, 2, *yellow) # Botones
    c.fill_rect(cx + 2, y_body + 4, 2, 2, *yellow)

    # Brazos
    if row == 3: # VICTORY: Salto con puño arriba
        c.fill_rect(cx - 10, y_body + 1, 3, 7, *red)
        c.fill_rect(cx + 7, y_body - 8, 4, 9, *red)
        c.fill_rect(cx + 7, y_body - 12, 5, 5, *white) # Guante blanco arriba
        c.fill_rect(cx - 10, y_body + 7, 4, 4, *white)
    else:
        c.fill_rect(cx - 9, y_body + 1, 3, 8, *red)
        c.fill_rect(cx + 6, y_body + 1, 3, 8, *red)
        c.fill_rect(cx - 10, y_body + 7, 4, 4, *white)
        c.fill_rect(cx + 6, y_body + 7, 4, 4, *white)

    # Cabeza
    c.draw_ellipse(cx, y_body - 6, 7, 7, *skin_c)
    # Bigote y nariz
    c.fill_rect(cx - 4, y_body - 6, 8, 3, *brown)
    c.draw_ellipse(cx, y_body - 8, 3, 2, *skin_c) # Nariz prominente
    c.fill_rect(cx + 1, y_body - 10, 2, 3, 15, 23, 42) # Ojo

    # Gorra roja con logo
    c.fill_rect(cx - 8, y_body - 14, 16, 6, *red)
    c.fill_rect(cx - 6, y_body - 16, 12, 3, *red)
    c.fill_rect(cx + 4, y_body - 12, 6, 2, *red) # Visera hacia la derecha
    c.draw_ellipse(cx, y_body - 13, 3, 2, *white) # Emblema 'M'
    c.fill_rect(cx - 1, y_body - 14, 2, 2, *red)


# ==============================================================================
# 2. LINK (HEROE DEL TIEMPO)
# ==============================================================================
def render_link(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    tunic_green = (22, 163, 74)
    cap_green = (21, 128, 61)
    gold_hair = (250, 204, 21)
    shield_blue = (30, 58, 138)
    triforce = (253, 224, 71)
    sword_silver = (226, 232, 240)
    sword_purple = (126, 34, 206)
    skin_c = (254, 215, 170)
    boots = (120, 53, 15)

    if row == 4: # FOCUS: Tocando la Ocarina del Tiempo
        c.draw_ellipse(cx, cy + 6, 10, 9, *tunic_green)
        c.draw_ellipse(cx, cy - 6, 7, 7, *skin_c)
        c.fill_rect(cx - 7, cy - 13, 14, 7, *gold_hair)
        # Gorro largo
        c.fill_rect(cx - 5, cy - 18, 10, 6, *cap_green)
        c.fill_rect(cx - 11, cy - 14, 7, 5, *cap_green)
        # Ocarina azul en boca
        c.fill_rect(cx - 3, cy - 6, 6, 3, 59, 130, 246)
        c.fill_rect(cx - 5, cy - 5, 3, 3, *skin_c) # Manos
        c.fill_rect(cx + 2, cy - 5, 3, 3, *skin_c)
        # Notas musicales flotando
        offset = (frame * 3) % 9
        c.fill_rect(cx + 10, cy - 14 - offset, 2, 4, 147, 197, 253)
        c.fill_rect(cx + 12, cy - 14 - offset, 3, 2, 147, 197, 253)
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 8, 12, 7, *tunic_green)
        c.draw_ellipse(cx - 5, cy + 2, 7, 6, *skin_c)
        c.fill_rect(cx - 9, cy - 4, 11, 7, *gold_hair)
        c.fill_rect(cx - 8, cy - 8, 9, 5, *cap_green)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Piernas
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 5 + leg_offset, y_body + 11, 3, 6, 241, 245, 249) # Mallas blancas
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 3, 6, 241, 245, 249)
    c.fill_rect(cx - 6 + leg_offset, y_body + 15, 5, 4, *boots) # Botas marrones
    c.fill_rect(cx + 1 - leg_offset, y_body + 15, 5, 4, *boots)

    # Túnica verde y cinturón
    c.fill_rect(cx - 7, y_body, 14, 12, *tunic_green)
    c.fill_rect(cx - 7, y_body + 8, 14, 2, *boots) # Cinturon
    c.fill_rect(cx - 1, y_body + 8, 2, 2, *triforce)

    # Escudo Hyliano en la espalda / mano izquierda
    c.fill_rect(cx - 12, y_body + 1, 5, 9, *shield_blue)
    c.fill_rect(cx - 11, y_body + 4, 3, 3, *triforce) # Trifuerza

    # Espada Maestra
    if row == 3: # VICTORY: Espada en alto
        c.fill_rect(cx + 8, y_body - 14, 3, 18, *sword_silver)
        c.fill_rect(cx + 6, y_body + 1, 7, 2, *sword_purple) # Guarda
        c.fill_rect(cx + 7, y_body + 3, 3, 3, *boots)
    else:
        c.fill_rect(cx + 7, y_body + 2, 3, 7, *tunic_green)
        c.fill_rect(cx + 7, y_body + 7, 3, 3, *skin_c)

    # Cabeza y oreja puntiaguda
    c.draw_ellipse(cx, y_body - 6, 7, 7, *skin_c)
    c.fill_rect(cx - 8, y_body - 7, 3, 2, *skin_c) # Oreja elfo
    c.fill_rect(cx + 2, y_body - 7, 2, 3, 59, 130, 246) # Ojo azul

    # Cabello rubio y patillas
    c.fill_rect(cx - 7, y_body - 12, 14, 5, *gold_hair)
    c.fill_rect(cx - 7, y_body - 7, 3, 6, *gold_hair)

    # Gorro largo puntiagudo verde
    c.fill_rect(cx - 6, y_body - 16, 12, 5, *cap_green)
    c.fill_rect(cx - 12, y_body - 13, 7, 5, *cap_green)
    c.fill_rect(cx - 16, y_body - 10, 5, 4, *cap_green)


# ==============================================================================
# 3. PIKACHU
# ==============================================================================
def render_pikachu(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 40
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    yellow = (250, 204, 21)
    dark_yellow = (234, 179, 8)
    red = (239, 68, 68)
    black = (15, 23, 42)
    brown = (146, 64, 14)
    white = (255, 255, 255)

    if row == 4: # FOCUS: Concentrando chispas electricas
        c.draw_ellipse(cx, cy + 6, 13, 11, *yellow)
        c.draw_ellipse(cx, cy - 4, 11, 10, *yellow)
        c.fill_rect(cx - 6, cy - 3, 8, 2, *black) # Ojos concentrados
        c.draw_ellipse(cx - 8, cy, 3, 3, *red) # Mejillas
        c.draw_ellipse(cx + 8, cy, 3, 3, *red)
        # Chispas electricas
        pulsar = (frame * 3) % 8
        c.fill_rect(cx - 14, cy - 6 - pulsar, 3, 2, 253, 224, 71)
        c.fill_rect(cx + 12, cy - 4 - pulsar, 3, 2, 253, 224, 71)
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 6, 14, 9, *yellow)
        c.draw_ellipse(cx - 5, cy + 3, 8, 7, *yellow)
        c.draw_ellipse(cx - 9, cy + 6, 3, 3, *red)
        c.fill_rect(cx - 7, cy + 3, 4, 1, *black)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Cola de rayo caracteristica (marrón en base, amarilla en zig-zag)
    c.fill_rect(cx - 15, y_body + 4, 5, 4, *brown)
    c.fill_rect(cx - 17, y_body - 1, 4, 6, *yellow)
    c.fill_rect(cx - 20, y_body - 6, 6, 6, *yellow)
    c.fill_rect(cx - 18, y_body - 13, 7, 8, *yellow)

    # Patitas
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 7 + leg_offset, y_body + 13, 5, 4, *yellow)
    c.fill_rect(cx + 2 - leg_offset, y_body + 13, 5, 4, *yellow)

    # Cuerpo redondeado
    c.draw_ellipse(cx, y_body + 4, 12, 11, *yellow)
    # Franjas marrones de la espalda
    c.fill_rect(cx - 7, y_body - 1, 4, 2, *brown)
    c.fill_rect(cx - 8, y_body + 4, 4, 2, *brown)

    # Bracitos
    if row == 3: # VICTORY: Brazos levantados saltando
        c.fill_rect(cx - 10, y_body - 2, 4, 6, *yellow)
        c.fill_rect(cx + 6, y_body - 2, 4, 6, *yellow)
    else:
        c.fill_rect(cx - 8, y_body + 3, 4, 6, *yellow)
        c.fill_rect(cx + 4, y_body + 3, 4, 6, *yellow)

    # Cabeza
    c.draw_ellipse(cx, y_body - 7, 10, 9, *yellow)

    # Mejillas rojas
    c.draw_ellipse(cx - 7, y_body - 5, 3, 3, *red)
    c.draw_ellipse(cx + 7, y_body - 5, 3, 3, *red)

    # Ojos con brillo
    c.fill_rect(cx - 5, y_body - 9, 3, 4, *black)
    c.fill_rect(cx - 5, y_body - 9, 1, 1, *white)
    c.fill_rect(cx + 2, y_body - 9, 3, 4, *black)
    c.fill_rect(cx + 2, y_body - 9, 1, 1, *white)
    c.fill_rect(cx - 1, y_body - 6, 2, 1, *black) # Naricita

    # Orejas largas con puntas negras
    # Oreja izquierda
    c.fill_rect(cx - 12, y_body - 20, 4, 12, *yellow)
    c.fill_rect(cx - 14, y_body - 25, 4, 6, *black)
    # Oreja derecha
    c.fill_rect(cx + 8, y_body - 20, 4, 12, *yellow)
    c.fill_rect(cx + 10, y_body - 25, 4, 6, *black)


# ==============================================================================
# 4. SONIC THE HEDGEHOG
# ==============================================================================
def render_sonic(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    blue = (37, 99, 235)
    peach = (254, 215, 170)
    red = (220, 38, 38)
    white = (248, 250, 252)
    black = (15, 23, 42)
    gold = (250, 204, 21)

    if row == 4: # FOCUS: Da toques impacientes con el pie
        c.draw_ellipse(cx, cy + 6, 11, 9, *blue)
        c.draw_ellipse(cx + 2, cy + 6, 7, 7, *peach) # Barriga
        c.draw_ellipse(cx, cy - 6, 8, 8, *blue)
        c.draw_ellipse(cx + 4, cy - 5, 5, 4, *peach) # Hocico
        c.fill_rect(cx - 1, cy - 8, 3, 4, *black) # Ojo
        # Púas hacia atrás
        c.fill_rect(cx - 15, cy - 9, 9, 6, *blue)
        c.fill_rect(cx - 17, cy - 4, 10, 6, *blue)
        c.fill_rect(cx - 14, cy + 2, 8, 5, *blue)
        # Zapatilla dando toque
        tap = (frame % 2) * 3
        c.fill_rect(cx + 2, cy + 13 - tap, 8, 4, *red)
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 8, 12, 7, *blue)
        c.draw_ellipse(cx - 5, cy + 2, 7, 6, *peach)
        c.fill_rect(cx - 14, cy - 2, 10, 5, *blue) # Puas
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Piernas y zapatillas Power Sneakers rojas con hebilla blanca
    leg_offset = (frame % 4 - 2) * 2 if row == 1 else 0
    c.fill_rect(cx - 5 + leg_offset, y_body + 11, 3, 5, *blue)
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 3, 5, *blue)
    c.fill_rect(cx - 6 + leg_offset, y_body + 14, 5, 3, *white) # Calcetines
    c.fill_rect(cx + 1 - leg_offset, y_body + 14, 5, 3, *white)
    c.fill_rect(cx - 7 + leg_offset, y_body + 16, 7, 4, *red) # Zapatillas
    c.fill_rect(cx - 4 + leg_offset, y_body + 16, 2, 4, *white) # Franja
    c.fill_rect(cx + 1 - leg_offset, y_body + 16, 7, 4, *red)
    c.fill_rect(cx + 3 - leg_offset, y_body + 16, 2, 4, *white)

    # Torso azul y barriga melocoton
    c.fill_rect(cx - 6, y_body, 12, 12, *blue)
    c.draw_ellipse(cx + 1, y_body + 6, 5, 5, *peach)

    # Brazos con guantes blancos
    if row == 3: # VICTORY: Pulgar arriba
        c.fill_rect(cx + 6, y_body - 5, 4, 8, *peach)
        c.fill_rect(cx + 6, y_body - 9, 5, 5, *white)
        c.fill_rect(cx - 9, y_body + 2, 4, 6, *peach)
        c.fill_rect(cx - 10, y_body + 7, 5, 5, *white)
    else:
        c.fill_rect(cx - 8, y_body + 1, 3, 7, *peach)
        c.fill_rect(cx + 5, y_body + 1, 3, 7, *peach)
        c.fill_rect(cx - 9, y_body + 7, 5, 4, *white)
        c.fill_rect(cx + 5, y_body + 7, 5, 4, *white)

    # Cabeza azul y hocico peach
    c.draw_ellipse(cx, y_body - 6, 8, 8, *blue)
    c.draw_ellipse(cx + 3, y_body - 5, 5, 4, *peach)
    c.fill_rect(cx + 6, y_body - 7, 2, 2, *black) # Nariz puntiaguda

    # Ojo verde / negro con borde blanco
    c.fill_rect(cx, y_body - 9, 4, 5, *white)
    c.fill_rect(cx + 2, y_body - 8, 2, 3, 16, 185, 129)

    # Púas icónicas hacia atrás
    c.fill_rect(cx - 13, y_body - 12, 7, 6, *blue)
    c.fill_rect(cx - 17, y_body - 7, 10, 6, *blue)
    c.fill_rect(cx - 15, y_body - 1, 8, 6, *blue)


# ==============================================================================
# 5. KIRBY
# ==============================================================================
def render_kirby(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 40
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    pink = (244, 114, 182)
    dark_pink = (236, 72, 153)
    red_feet = (190, 18, 60)
    blue_eye = (37, 99, 235)
    white = (255, 255, 255)
    star_gold = (250, 204, 21)

    if row == 4: # FOCUS: Flotando e inhalando aire
        c.draw_ellipse(cx, cy + 2, 16, 15, *pink) # Mas inflado
        c.draw_ellipse(cx - 6, cy + 3, 3, 2, *dark_pink) # Blush
        c.draw_ellipse(cx + 6, cy + 3, 3, 2, *dark_pink)
        c.fill_rect(cx - 2, cy + 4, 4, 3, *red_feet) # Boquita abierta
        # Zapatos flotando
        c.draw_ellipse(cx - 8, cy + 15, 6, 4, *red_feet)
        c.draw_ellipse(cx + 8, cy + 15, 6, 4, *red_feet)
        # Estrellitas flotando
        offset = (frame * 2) % 6
        c.fill_rect(cx + 14, cy - 8 - offset, 3, 3, *star_gold)
        return

    if row == 5: # SLEEP: Gorrito de dormir verde
        c.draw_ellipse(cx, cy + 6, 13, 11, *pink)
        c.draw_ellipse(cx - 7, cy + 14, 6, 4, *red_feet)
        c.draw_ellipse(cx + 7, cy + 14, 6, 4, *red_feet)
        c.fill_rect(cx - 5, cy + 5, 3, 1, 30, 41, 59) # Ojos cerrados
        c.fill_rect(cx + 2, cy + 5, 3, 1, 30, 41, 59)
        # Gorrito de dormir verde
        c.fill_rect(cx - 8, cy - 5, 16, 4, 34, 197, 94)
        c.fill_rect(cx - 13, cy - 2, 7, 4, 34, 197, 94)
        c.draw_ellipse(cx - 15, cy, 3, 3, *star_gold)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Zapatos rojos carmesi
    foot_offset = (frame % 4 - 2) if row == 1 else 0
    c.draw_ellipse(cx - 9 + foot_offset, y_body + 12, 7, 5, *red_feet)
    c.draw_ellipse(cx + 9 - foot_offset, y_body + 12, 7, 5, *red_feet)

    # Cuerpo esferico rosa
    c.draw_ellipse(cx, y_body + 2, 14, 13, *pink)

    # Bracitos rosas
    if row == 3: # VICTORY: Brazos arriba celebrando
        c.draw_ellipse(cx - 13, y_body - 4, 5, 5, *pink)
        c.draw_ellipse(cx + 13, y_body - 4, 5, 5, *pink)
    else:
        c.draw_ellipse(cx - 13, y_body + 3, 5, 5, *pink)
        c.draw_ellipse(cx + 13, y_body + 3, 5, 5, *pink)

    # Rubor en mejillas
    c.draw_ellipse(cx - 7, y_body + 4, 3, 2, *dark_pink)
    c.draw_ellipse(cx + 7, y_body + 4, 3, 2, *dark_pink)

    # Grandes ojos azules ovalados
    c.fill_rect(cx - 5, y_body - 3, 3, 6, *blue_eye)
    c.fill_rect(cx - 5, y_body - 3, 3, 2, 15, 23, 42)
    c.fill_rect(cx - 5, y_body - 2, 2, 2, *white)

    c.fill_rect(cx + 2, y_body - 3, 3, 6, *blue_eye)
    c.fill_rect(cx + 2, y_body - 3, 3, 2, 15, 23, 42)
    c.fill_rect(cx + 2, y_body - 2, 2, 2, *white)

    # Boquita
    c.fill_rect(cx - 1, y_body + 4, 2, 2, *red_feet)


# ==============================================================================
# 6. MEGA MAN
# ==============================================================================
def render_megaman(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    cyan = (6, 182, 212)
    navy = (30, 58, 138)
    skin_c = (254, 215, 170)
    white = (248, 250, 252)
    plasma = (56, 189, 248)

    if row == 4: # FOCUS: Cargando energia en Mega Buster
        c.draw_ellipse(cx, cy + 6, 10, 9, *cyan)
        c.draw_ellipse(cx, cy - 6, 8, 8, *navy)
        c.draw_ellipse(cx, cy - 5, 5, 5, *skin_c)
        # Mega buster al frente brillando
        c.fill_rect(cx - 10, cy + 2, 8, 6, *navy)
        c.fill_rect(cx - 13, cy + 3, 4, 4, *cyan)
        pulsar = (frame * 2) % 6
        c.draw_ellipse(cx - 14, cy + 5, 4 + pulsar, 4 + pulsar, *plasma, 150)
        return

    if row == 5: # SLEEP: Modo stand-by
        c.draw_ellipse(cx, cy + 8, 12, 7, *navy)
        c.draw_ellipse(cx - 5, cy + 2, 7, 6, *skin_c)
        c.fill_rect(cx - 8, cy - 3, 11, 7, *navy)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Botas grandes azul marino
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 10, 4, 4, *cyan)
    c.fill_rect(cx + 2 - leg_offset, y_body + 10, 4, 4, *cyan)
    c.fill_rect(cx - 7 + leg_offset, y_body + 14, 6, 5, *navy)
    c.fill_rect(cx + 1 - leg_offset, y_body + 14, 6, 5, *navy)

    # Torso cian con calzoncillo azul marino
    c.fill_rect(cx - 7, y_body, 14, 11, *cyan)
    c.fill_rect(cx - 6, y_body + 8, 12, 4, *navy)

    # Brazo derecho normal y brazo izquierdo con Mega Buster
    c.fill_rect(cx + 6, y_body + 1, 4, 7, *cyan)
    c.fill_rect(cx + 6, y_body + 7, 5, 4, *navy)

    # Mega Buster
    if row == 3: # VICTORY: Disparo al cielo
        c.fill_rect(cx - 10, y_body - 10, 5, 12, *navy)
        c.fill_rect(cx - 10, y_body - 14, 5, 4, *cyan)
        c.draw_ellipse(cx - 8, y_body - 18, 5, 5, *plasma, 200) # Disparo
    else:
        c.fill_rect(cx - 12, y_body + 2, 7, 6, *navy)
        c.fill_rect(cx - 14, y_body + 3, 3, 4, *cyan)

    # Casco azul marino con orbes cyan y cara
    c.draw_ellipse(cx, y_body - 7, 8, 8, *navy)
    c.fill_rect(cx - 4, y_body - 8, 9, 7, *skin_c) # Cara visible
    c.fill_rect(cx - 2, y_body - 8, 2, 3, 15, 23, 42) # Ojos
    c.fill_rect(cx + 2, y_body - 8, 2, 3, 15, 23, 42)

    # Decoracion del casco (cresta y modulos laterales)
    c.fill_rect(cx - 1, y_body - 15, 3, 7, *cyan) # Cresta frontal
    c.fill_rect(cx - 9, y_body - 8, 2, 4, *cyan) # Orejera
    c.fill_rect(cx + 7, y_body - 8, 2, 4, *cyan)


# ==============================================================================
# 7. MASTER CHIEF
# ==============================================================================
def render_master_chief(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    olive = (74, 93, 35)
    dark_olive = (50, 64, 24)
    visor = (217, 119, 6)
    visor_shine = (251, 191, 36)
    slate = (30, 41, 59)
    black = (15, 23, 42)

    if row == 4: # FOCUS: Guardia tactica revisando radar
        c.draw_ellipse(cx, cy + 6, 11, 10, *olive)
        c.fill_rect(cx - 8, cy + 1, 16, 8, *dark_olive)
        c.draw_ellipse(cx, cy - 7, 8, 7, *olive)
        c.fill_rect(cx - 5, cy - 7, 10, 4, *visor)
        # Radar holografico verde
        pulsar = (frame * 3) % 9
        c.draw_ellipse(cx + 12, cy - 2, 6, 6, 34, 197, 94, 120)
        c.fill_rect(cx + 10, cy - 2, 4, 1, 34, 197, 94)
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 8, 12, 8, *olive)
        c.draw_ellipse(cx - 5, cy + 2, 8, 6, *olive)
        c.fill_rect(cx - 8, cy + 2, 6, 3, *visor)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Piernas blindadas
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 11, 4, 6, *olive)
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 4, 6, *olive)
    c.fill_rect(cx - 7 + leg_offset, y_body + 16, 5, 3, *black) # Botas tácticas
    c.fill_rect(cx + 2 - leg_offset, y_body + 16, 5, 3, *black)

    # Armadura Spartan Mjolnir
    c.fill_rect(cx - 8, y_body, 16, 12, *olive)
    c.fill_rect(cx - 4, y_body + 2, 8, 7, *dark_olive) # Pechera central
    c.fill_rect(cx - 7, y_body + 9, 14, 2, *black) # Cinturon tactico

    # Rifle de batalla en manos
    if row == 3: # VICTORY: Rifle en alto
        c.fill_rect(cx + 7, y_body - 10, 4, 16, *slate)
        c.fill_rect(cx + 5, y_body - 12, 8, 4, *black) # Mira tactica
        c.fill_rect(cx - 10, y_body + 1, 4, 8, *olive)
    else:
        c.fill_rect(cx - 10, y_body + 1, 4, 8, *olive)
        c.fill_rect(cx + 6, y_body + 1, 4, 8, *olive)
        c.fill_rect(cx - 8, y_body + 6, 14, 4, *slate) # Rifle cruzado

    # Casco Mjolnir y visor dorado característico
    c.draw_ellipse(cx, y_body - 7, 8, 8, *olive)
    c.fill_rect(cx - 6, y_body - 8, 12, 4, *visor)
    c.fill_rect(cx - 3, y_body - 8, 6, 2, *visor_shine) # Brillo del visor


# ==============================================================================
# 8. KRATOS (FANTASMA DE ESPARTA)
# ==============================================================================
def render_kratos(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    ash_skin = (209, 213, 219)
    red_tattoo = (185, 28, 28)
    beard = (41, 29, 24)
    leather = (120, 53, 15)
    steel = (148, 163, 184)
    cyan_runes = (34, 211, 238)

    if row == 4: # FOCUS: Afilando el hacha Leviatan
        c.draw_ellipse(cx, cy + 6, 12, 10, *ash_skin)
        c.fill_rect(cx - 7, cy + 1, 14, 8, *leather)
        c.draw_ellipse(cx, cy - 7, 8, 7, *ash_skin)
        c.fill_rect(cx - 6, cy - 4, 12, 6, *beard)
        # Hacha apoyada
        c.fill_rect(cx + 6, cy - 8, 3, 16, *leather)
        c.fill_rect(cx + 8, cy - 10, 6, 8, *steel)
        c.fill_rect(cx + 9, cy - 8, 3, 4, *cyan_runes)
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 8, 13, 8, *ash_skin)
        c.draw_ellipse(cx - 5, cy + 2, 8, 6, *ash_skin)
        c.fill_rect(cx - 8, cy + 5, 8, 5, *beard)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Botas y faldon espartano
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 11, 4, 6, *leather)
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 4, 6, *leather)
    c.fill_rect(cx - 7 + leg_offset, y_body + 16, 5, 3, 67, 40, 24)
    c.fill_rect(cx + 2 - leg_offset, y_body + 16, 5, 3, 67, 40, 24)

    # Torso de ceniza con hombrera de cuero
    c.fill_rect(cx - 8, y_body, 16, 12, *ash_skin)
    c.fill_rect(cx - 8, y_body, 6, 5, *leather) # Hombrera
    # Tatuaje rojo espartano cruzando el torso
    c.fill_rect(cx - 4, y_body + 1, 3, 8, *red_tattoo)
    c.fill_rect(cx - 8, y_body + 9, 16, 3, *leather) # Cinturon

    # Brazos con vendajes
    c.fill_rect(cx - 10, y_body + 1, 4, 8, *ash_skin)
    c.fill_rect(cx + 6, y_body + 1, 4, 8, *ash_skin)
    c.fill_rect(cx - 10, y_body + 5, 4, 4, 180, 83, 9) # Cadenas / vendajes
    c.fill_rect(cx + 6, y_body + 5, 4, 4, 180, 83, 9)

    # Hacha Leviatan en mano
    if row == 3: # VICTORY: Levanta el Hacha Leviatan con runas cian
        c.fill_rect(cx + 8, y_body - 14, 3, 20, *leather)
        c.fill_rect(cx + 10, y_body - 16, 7, 9, *steel)
        c.fill_rect(cx + 11, y_body - 14, 4, 5, *cyan_runes) # Runas brillando
    else:
        c.fill_rect(cx - 13, y_body - 2, 3, 14, *leather)
        c.fill_rect(cx - 18, y_body - 5, 6, 8, *steel)
        c.fill_rect(cx - 16, y_body - 4, 3, 4, *cyan_runes)

    # Cabeza calva y barba tupida
    c.draw_ellipse(cx, y_body - 6, 7, 7, *ash_skin)
    # Tatuaje espartano en la cabeza
    c.fill_rect(cx - 5, y_body - 12, 3, 8, *red_tattoo)
    # Barba abundante
    c.fill_rect(cx - 5, y_body - 4, 10, 6, *beard)
    c.fill_rect(cx - 4, y_body + 1, 8, 3, *beard)
    # Ojos penetrantes
    c.fill_rect(cx - 3, y_body - 7, 2, 2, 15, 23, 42)
    c.fill_rect(cx + 2, y_body - 7, 2, 2, 15, 23, 42)


# ==============================================================================
# 9. SANS EL ESQUELETO
# ==============================================================================
def render_sans(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 40
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    bone_white = (248, 250, 252)
    blue_hoodie = (37, 99, 235)
    black = (15, 23, 42)
    pink_slippers = (244, 114, 182)
    magic_cyan = (6, 182, 212)

    if row == 4: # FOCUS: Ojo magico cian encendido
        c.draw_ellipse(cx, cy + 6, 12, 9, *blue_hoodie)
        c.fill_rect(cx - 3, cy + 2, 6, 10, *bone_white) # Camiseta
        c.draw_ellipse(cx, cy - 6, 9, 8, *bone_white)
        c.fill_rect(cx - 4, cy - 3, 8, 2, *black) # Sonrisa
        # Ojo izquierdo magico ardiendo en cian
        pulsar = (frame * 2) % 6
        c.draw_ellipse(cx - 4, cy - 7, 3 + pulsar, 3 + pulsar, *magic_cyan, 180)
        c.fill_rect(cx + 2, cy - 7, 2, 3, *black)
        return

    if row == 5: # SLEEP: Clasico Sans durmiendo
        c.draw_ellipse(cx, cy + 8, 12, 8, *blue_hoodie)
        c.draw_ellipse(cx - 4, cy + 2, 8, 7, *bone_white)
        c.fill_rect(cx - 7, cy + 3, 5, 1, *black) # Ojos cerrados durmiendo
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Piernas con pantuflas rosas y pantalon corto negro con franja blanca
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 10, 4, 4, *black)
    c.fill_rect(cx + 2 - leg_offset, y_body + 10, 4, 4, *black)
    c.fill_rect(cx - 5 + leg_offset, y_body + 10, 1, 4, *bone_white) # Franja blanca
    c.fill_rect(cx + 3 - leg_offset, y_body + 10, 1, 4, *bone_white)
    c.draw_ellipse(cx - 5 + leg_offset, y_body + 14, 5, 3, *pink_slippers) # Pantuflas
    c.draw_ellipse(cx + 4 - leg_offset, y_body + 14, 5, 3, *pink_slippers)

    # Sudadera azul con capucha blanca y camiseta
    c.fill_rect(cx - 8, y_body, 16, 11, *blue_hoodie)
    c.fill_rect(cx - 3, y_body + 1, 6, 10, *bone_white) # Camiseta blanca
    # Manos en los bolsillos
    c.fill_rect(cx - 10, y_body + 3, 3, 6, *blue_hoodie)
    c.fill_rect(cx + 7, y_body + 3, 3, 6, *blue_hoodie)

    # Cabeza de craneo redondeada
    c.draw_ellipse(cx, y_body - 7, 9, 8, *bone_white)

    # Gran sonrisa con dientes
    c.fill_rect(cx - 5, y_body - 4, 10, 2, *black)
    c.fill_rect(cx - 4, y_body - 5, 1, 4, *bone_white)
    c.fill_rect(cx - 2, y_body - 5, 1, 4, *bone_white)
    c.fill_rect(cx, y_body - 5, 1, 4, *bone_white)
    c.fill_rect(cx + 2, y_body - 5, 1, 4, *bone_white)

    # Cavidad nasal
    c.fill_rect(cx - 1, y_body - 6, 2, 2, *black)

    # Ojos negros
    if row == 3: # VICTORY: Ojo cian destellando
        c.fill_rect(cx - 5, y_body - 9, 3, 3, *magic_cyan)
        c.fill_rect(cx + 2, y_body - 9, 3, 3, *black)
    else:
        c.fill_rect(cx - 5, y_body - 9, 3, 3, *black)
        c.fill_rect(cx + 2, y_body - 9, 3, 3, *black)


# ==============================================================================
# 10. STEVE (MINECRAFT)
# ==============================================================================
def render_steve(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    teal = (14, 165, 233)
    pants = (59, 130, 246)
    skin_c = (217, 163, 126)
    hair = (56, 32, 20)
    diamond = (56, 189, 248)
    stick = (146, 64, 14)

    if row == 4: # FOCUS: Picando un bloque
        # Bloque de mineral al frente
        c.fill_rect(cx - 14, cy - 4, 10, 10, 100, 116, 139) # Bloque de piedra
        c.fill_rect(cx - 12, cy - 2, 3, 3, *diamond) # Veta de diamante
        # Steve picando
        c.fill_rect(cx - 5, cy + 2, 10, 11, *teal)
        c.fill_rect(cx - 5, cy - 8, 10, 10, *skin_c)
        c.fill_rect(cx - 5, cy - 8, 10, 3, *hair)
        # Pico bajando rítmicamente
        pico_y = (frame % 2) * 3
        c.fill_rect(cx - 8, cy - 2 + pico_y, 2, 8, *stick)
        c.fill_rect(cx - 12, cy - 4 + pico_y, 8, 3, *diamond)
        return

    if row == 5: # SLEEP: Acostado estilo Minecraft
        c.fill_rect(cx - 12, cy + 8, 14, 6, *teal)
        c.fill_rect(cx + 2, cy + 8, 10, 6, *pants)
        c.fill_rect(cx - 18, cy + 8, 6, 6, *skin_c)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Piernas rectangulares azules
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 5 + leg_offset, y_body + 11, 4, 7, *pants)
    c.fill_rect(cx + 1 - leg_offset, y_body + 11, 4, 7, *pants)

    # Torso cian
    c.fill_rect(cx - 6, y_body, 12, 11, *teal)

    # Brazos
    if row == 3: # VICTORY: Sostiene un diamante en alto
        c.fill_rect(cx - 10, y_body + 1, 4, 8, *skin_c)
        c.fill_rect(cx + 6, y_body - 6, 4, 8, *skin_c)
        # Diamante reluciente
        c.fill_rect(cx + 6, y_body - 12, 6, 6, *diamond)
        c.fill_rect(cx + 7, y_body - 11, 4, 4, 186, 230, 253)
    else:
        c.fill_rect(cx - 10, y_body + 1, 4, 8, *skin_c)
        c.fill_rect(cx + 6, y_body + 1, 4, 8, *skin_c)
        # Pico de diamante en mano
        c.fill_rect(cx + 8, y_body + 3, 2, 8, *stick)
        c.fill_rect(cx + 6, y_body + 2, 6, 2, *diamond)

    # Cabeza cuadrada pixel art
    c.fill_rect(cx - 5, y_body - 9, 10, 9, *skin_c)
    # Cabello castaño oscuro
    c.fill_rect(cx - 5, y_body - 9, 10, 3, *hair)
    c.fill_rect(cx - 5, y_body - 6, 2, 3, *hair)
    # Ojos y barba clásica
    c.fill_rect(cx - 3, y_body - 5, 2, 1, 255, 255, 255)
    c.fill_rect(cx - 2, y_body - 5, 1, 1, 59, 130, 246)
    c.fill_rect(cx + 1, y_body - 5, 2, 1, 255, 255, 255)
    c.fill_rect(cx + 2, y_body - 5, 1, 1, 59, 130, 246)
    c.fill_rect(cx - 2, y_body - 2, 4, 1, *hair) # Barba


# ==============================================================================
# CONFIGURACION DEL PACK LEYENDAS DEL GAMING
# ==============================================================================
GAMING_SKINS = [
    {
        "id": "super-mario",
        "name": "Super Mario",
        "personalityPrompt": "Heroico, entusiasta, siempre saltando hacia el siguiente nivel.",
        "dialogues": {
            "alert": "¡Mamma mia! Tienes una entrega urgente que requiere un salto preciso.",
            "victory": "¡Here we go! Nivel superado y objetivos cumplidos.",
            "focus": "Golpeando bloques y recolectando monedas de concentración.",
            "break": "Una pausa para tomar un champiñón verde de energía.",
            "sleep": "Zzz... soñando con castillos y estrellas."
        },
        "render": render_mario
    },
    {
        "id": "link-hero",
        "name": "Link (Héroe del Tiempo)",
        "personalityPrompt": "Valiente, sereno, enfocado en resolver cada mazmorra y reto.",
        "dialogues": {
            "alert": "Escucha las campanas del templo: una entrega importante te espera.",
            "victory": "¡Sonido de cofre dorado! Desafío resuelto con éxito.",
            "focus": "Tocando la Canción del Tiempo para multiplicar el enfoque.",
            "break": "Reponiendo corazones junto a una fuente de hadas.",
            "sleep": "Descansando en paz con la Espada Maestra en su pedestal."
        },
        "render": render_link
    },
    {
        "id": "pikachu-electric",
        "name": "Pikachu",
        "personalityPrompt": "Energético, leal, chispeante de ideas y apoyo incondicional.",
        "dialogues": {
            "alert": "¡Pika-pika! Alerta de clase o entrega acercándose.",
            "victory": "¡Pikachu! ¡Impactrueno de celebración por esa tarea terminada!",
            "focus": "Cargando baterías y manteniendo la energía al 100%.",
            "break": "Comiendo una baya para recuperar vitalidad.",
            "sleep": "Pika... zzz... chispitas suaves de descanso."
        },
        "render": render_pikachu
    },
    {
        "id": "sonic-hedgehog",
        "name": "Sonic the Hedgehog",
        "personalityPrompt": "Ultra veloz, confiado, impaciente con la lentitud pero leal.",
        "dialogues": {
            "alert": "¡Demasiado lento! Vamos a resolver esa entrega a la velocidad del sonido.",
            "victory": "¡Pan comido! Vuelta triunfal y pulgar arriba.",
            "focus": "Concentración supersónica. Ningún bug corre más rápido que yo.",
            "break": "Un chili dog rápido antes de la siguiente zona.",
            "sleep": "Recargando los turbos para la próxima carrera."
        },
        "render": render_sonic
    },
    {
        "id": "kirby-dream",
        "name": "Kirby",
        "personalityPrompt": "Adorable, glotón de conocimiento, dulce y siempre animado.",
        "dialogues": {
            "alert": "¡Poyo! Tienes una notificación que necesita tu atención.",
            "victory": "¡Baile de Kirby con estrellitas mágicas de felicidad!",
            "focus": "Inhalando distracciones y transformándolas en foco total.",
            "break": "Un trozo de tarta de fresa para celebrar los avances.",
            "sleep": "Zzz... flotando suavemente en una nube estrella."
        },
        "render": render_kirby
    },
    {
        "id": "mega-man-blue",
        "name": "Mega Man",
        "personalityPrompt": "Robot defensor de la justicia, analítico, perseverante y preciso.",
        "dialogues": {
            "alert": "Señales de entrega detectadas en los sensores del sistema.",
            "victory": "¡Misión completada! Nueva habilidad de concentración adquirida.",
            "focus": "Cargando el Mega Buster al máximo poder analítico.",
            "break": "Enfriando circuitos y optimizando memoria de trabajo.",
            "sleep": "Entrando en modo stand-by para mantenimiento preventivo."
        },
        "render": render_megaman
    },
    {
        "id": "master-chief-117",
        "name": "Master Chief",
        "personalityPrompt": "Disciplinado, silencioso, enfocado en completar cada misión cueste lo que cueste.",
        "dialogues": {
            "alert": "Objetivo marcado en el HUD: entrega próxima a su límite.",
            "victory": "Misión cumplida. El objetivo ha sido neutralizado con éxito.",
            "focus": "Escudos al máximo, miras alineadas y foco total.",
            "break": "Breve chequeo de armadura y recarga táctica.",
            "sleep": "Descanso en guardia. Listo para reanudar el combate."
        },
        "render": render_master_chief
    },
    {
        "id": "kratos-war",
        "name": "Kratos",
        "personalityPrompt": "Imponente, feroz con los errores, implacable para cumplir objetivos.",
        "dialogues": {
            "alert": "¡Muchacho! Una tarea requiere tu atención inmediata. No flaquees.",
            "victory": "El trabajo está hecho. Que los dioses tomen nota de tu temple.",
            "focus": "Afilando el hacha y templando la mente contra la distracción.",
            "break": "Descanso breve. La debilidad no es una opción.",
            "sleep": "Cierro los ojos, pero mi guardia permanece alerta."
        },
        "render": render_kratos
    },
    {
        "id": "sans-undertale",
        "name": "Sans el Esqueleto",
        "personalityPrompt": "Relajado, bromista, aficionado a las siestas y con humor mordaz.",
        "dialogues": {
            "alert": "¿vas a dejar esa entrega para después? vas a pasar un mal rato, chico.",
            "victory": "vaya, lo lograste sin sudar un hueso. buen trabajo.",
            "focus": "tomándome las cosas en serio... por una vez.",
            "break": "hora de una siesta en el puesto de perritos calientes.",
            "sleep": "zzz... no me despiertes a menos que haya salsa tártara."
        },
        "render": render_sans
    },
    {
        "id": "steve-craft",
        "name": "Steve",
        "personalityPrompt": "Constructor paciente, recolector incansable, maestro de la ingeniería.",
        "dialogues": {
            "alert": "Cuidado con el reloj: una entrega se acerca antes de que caiga la noche.",
            "victory": "¡Mineral de diamante extraído! Tarea completada con éxito.",
            "focus": "Bloque a bloque, construyendo soluciones sólidas.",
            "break": "Comiendo una manzana dorada para restaurar corazones.",
            "sleep": "Durmiendo en la cama para pasar la noche sin sobresaltos."
        },
        "render": render_steve
    }
]


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    skins_dir = os.path.join(base_dir, "public", "skins")

    print(f"[MySkin] Generando {len(GAMING_SKINS)} skins del Pack Leyendas del Gaming en {skins_dir}...")

    for skin in GAMING_SKINS:
        skin_id = skin["id"]
        skin_dir = os.path.join(skins_dir, skin_id)
        os.makedirs(skin_dir, exist_ok=True)

        manifest = {
            "id": skin_id,
            "name": skin["name"],
            "category": "gaming",
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

    print("[MySkin] Las 10 skins del Pack Leyendas del Gaming fueron creadas satisfactoriamente.")

if __name__ == "__main__":
    main()
