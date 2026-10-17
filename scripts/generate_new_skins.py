#!/usr/bin/env python3
"""
MySkin - Generador de Nuevas Skins Solicitadas
Genera manifest.json y spritesheet.png (384x384, 6 filas x 6 columnas, 64x64 px por frame)
para:
1. labrador-retriever (Mascotas)
2. little-girl (Lily Estudiante)
3. neymar-jr (Deportes)
4. harry-potter (Cine / Magia con Escoba)
5. lord-voldemort (Cine / Magia Oscura)
6. captain-america (Superhéroes / Escudo)
7. iron-man (Superhéroes / Reactor Arc)
8. thor-odinson (Superhéroes / Mjölnir)
9. bugs-bunny (Cartoons / Zanahoria)
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
# 1. LABRADOR RETRIEVER
# ==============================================================================
def render_labrador(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    gold = (234, 179, 8)       # Dorado cálido
    gold_dark = (202, 138, 4)  # Sombra dorada
    gold_light = (254, 240, 138)
    collar = (220, 38, 38)     # Collar rojo
    nose = (30, 41, 59)
    pink = (244, 114, 182)

    if row == 4: # FOCUS: Acostado atento con cabeza sobre patas
        c.fill_rect(cx - 14, cy + 6, 28, 12, *gold)
        c.fill_rect(cx - 12, cy + 14, 24, 4, *gold_dark)
        c.fill_rect(cx - 16, cy - 2, 18, 12, *gold)
        c.fill_rect(cx - 18, cy + 2, 6, 8, *gold_dark) # Oreja caída
        c.fill_rect(cx - 4, cy + 2, 4, 3, *nose)        # Nariz
        c.fill_rect(cx - 8, cy - 1, 2, 2, 0, 0, 0)      # Ojo concentrado
        # Pequeño hueso al frente
        c.fill_rect(cx + 6, cy + 12, 10, 4, 241, 245, 249)
        return

    if row == 5: # SLEEP: Hecho una bolita durmiendo
        c.draw_ellipse(cx, cy + 8, 16, 11, *gold)
        c.draw_ellipse(cx - 6, cy + 4, 10, 8, *gold_dark)
        c.fill_rect(cx - 12, cy + 4, 5, 7, *gold_dark) # Oreja caída
        c.fill_rect(cx - 3, cy + 5, 3, 2, *nose)
        c.draw_zz_particles(cx, cy, frame)
        return

    # Cuerpo
    c.fill_rect(cx - 12, cy - 2 + bob, 24, 14, *gold)
    c.fill_rect(cx - 10, cy + 8 + bob, 20, 4, *gold_dark)

    # Patas
    leg = (3 if frame % 2 == 0 else -3) if row == 1 else 0
    c.fill_rect(cx - 10, cy + 10 + leg, 5, 9, *gold)
    c.fill_rect(cx - 4, cy + 10 - leg, 5, 9, *gold)
    c.fill_rect(cx + 2, cy + 10 + leg, 5, 9, *gold)
    c.fill_rect(cx + 6, cy + 10 - leg, 5, 9, *gold)

    # Collar rojo y placa dorada
    c.fill_rect(cx + 4, cy - 3 + bob, 4, 8, *collar)
    c.fill_rect(cx + 5, cy + 2 + bob, 2, 3, 250, 204, 21)

    # Cabeza alegre
    c.fill_rect(cx + 4, cy - 13 + bob, 14, 12, *gold)
    c.fill_rect(cx + 6, cy - 15 + bob, 10, 4, *gold_dark)
    c.fill_rect(cx + 3, cy - 11 + bob, 4, 9, *gold_dark) # Oreja caída
    c.fill_rect(cx + 14, cy - 8 + bob, 5, 4, *gold_light) # Hocico
    c.fill_rect(cx + 17, cy - 9 + bob, 3, 3, *nose)       # Trufa negra
    c.fill_rect(cx + 10, cy - 10 + bob, 2, 2, 0, 0, 0)    # Ojo brillante

    # Cola moviéndose alegre
    tail_w = 4 if (frame % 2 == 0) else -4
    c.fill_rect(cx - 16, cy - 8 + bob + tail_w, 5, 10, *gold)

    if row == 2: # ALERT: Orejas erguidas y signo de interrogación
        c.fill_rect(cx + 5, cy - 18 + bob, 4, 6, *gold_dark) # Oreja levantada
        c.fill_rect(cx + 14, cy - 5 + bob, 3, 4, *pink)      # Lengüita
    elif row == 3: # VICTORY: Salto con pelota de tenis verde
        c.fill_rect(cx + 14, cy - 5 + bob, 4, 3, *pink)
        # Pelota de tenis verde fluorescente
        c.draw_ellipse(cx + 16, cy - 14 + bob, 4, 4, 163, 230, 53)
        c.fill_rect(cx + 15, cy - 14 + bob, 2, 4, 255, 255, 255)


# ==============================================================================
# 2. LITTLE GIRL (Lily Estudiante)
# ==============================================================================
def render_little_girl(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    skin_color = (254, 215, 170)
    hair_color = (120, 53, 15)   # Castaño
    dress_pink = (244, 114, 182) # Vestido rosa
    ribbon = (239, 68, 68)       # Lazo rojo
    shoes = (225, 29, 72)

    if row == 4: # FOCUS: Escribiendo en pupitre / cuaderno
        c.fill_rect(cx - 8, cy + 4, 16, 12, 180, 83, 9) # Escritorio
        c.fill_rect(cx - 7, cy - 4, 14, 10, *dress_pink)
        c.fill_rect(cx - 6, cy - 14, 12, 10, *skin_color)
        c.fill_rect(cx - 7, cy - 17, 14, 5, *hair_color)
        c.fill_rect(cx - 8, cy - 14, 3, 8, *hair_color)
        c.fill_rect(cx + 5, cy - 14, 3, 8, *hair_color)
        # Cuaderno y lápiz
        c.fill_rect(cx - 6, cy + 2, 12, 6, 255, 255, 255)
        c.fill_rect(cx + 2, cy - 1, 2, 5, 245, 158, 11) # Lápiz
        return

    if row == 5: # SLEEP: Abrazando osito de peluche
        c.fill_rect(cx - 10, cy + 2, 20, 14, *dress_pink)
        c.fill_rect(cx - 6, cy - 8, 12, 10, *skin_color)
        c.fill_rect(cx - 7, cy - 11, 14, 5, *hair_color)
        # Osito de peluche marrón
        c.fill_rect(cx + 2, cy - 2, 8, 10, 146, 64, 14)
        c.draw_zz_particles(cx, cy, frame)
        return

    # Vestido
    c.fill_rect(cx - 7, cy - 2 + bob, 14, 12, *dress_pink)
    c.fill_rect(cx - 9, cy + 6 + bob, 18, 4, *dress_pink) # Falda con vuelo

    # Piernas
    leg = (2 if frame % 2 == 0 else -2) if row == 1 else 0
    c.fill_rect(cx - 5, cy + 10 + leg, 3, 8, *skin_color)
    c.fill_rect(cx + 2, cy + 10 - leg, 3, 8, *skin_color)
    c.fill_rect(cx - 6, cy + 17 + leg, 4, 2, *shoes)
    c.fill_rect(cx + 2, cy + 17 - leg, 4, 2, *shoes)

    # Cabeza y cabello con coletas
    c.fill_rect(cx - 6, cy - 14 + bob, 12, 12, *skin_color)
    c.fill_rect(cx - 7, cy - 17 + bob, 14, 5, *hair_color) # Flequillo
    # Coletas a los lados con lazos
    c.fill_rect(cx - 10, cy - 15 + bob, 4, 8, *hair_color)
    c.fill_rect(cx + 6, cy - 15 + bob, 4, 8, *hair_color)
    c.fill_rect(cx - 9, cy - 15 + bob, 2, 2, *ribbon)
    c.fill_rect(cx + 7, cy - 15 + bob, 2, 2, *ribbon)

    # Ojos tiernos
    c.fill_rect(cx - 4, cy - 10 + bob, 2, 3, 30, 41, 59)
    c.fill_rect(cx + 2, cy - 10 + bob, 2, 3, 30, 41, 59)
    # Mejillas sonrosadas
    c.fill_rect(cx - 5, cy - 6 + bob, 2, 1, 244, 114, 182)
    c.fill_rect(cx + 3, cy - 6 + bob, 2, 1, 244, 114, 182)

    # Mochila a la espalda
    c.fill_rect(cx - 10, cy - 1 + bob, 3, 9, 59, 130, 246)

    if row == 2: # ALERT: Sorpresa con manos a las mejillas
        c.fill_rect(cx - 7, cy - 8 + bob, 2, 3, *skin_color)
        c.fill_rect(cx + 5, cy - 8 + bob, 2, 3, *skin_color)
    elif row == 3: # VICTORY: Brazos arriba saltando feliz
        c.fill_rect(cx - 9, cy - 10 + bob, 2, 8, *skin_color)
        c.fill_rect(cx + 7, cy - 10 + bob, 2, 8, *skin_color)


# ==============================================================================
# 3. NEYMAR JR.
# ==============================================================================
def render_neymar(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    skin = (217, 119, 6)         # Piel bronceada
    jersey_yellow = (250, 204, 21) # Camiseta Brasil amarilla
    collar_green = (22, 163, 74)   # Cuello verde
    shorts_blue = (29, 78, 216)    # Pantalón azul
    boots = (239, 68, 68)          # Botines flúor
    hair = (30, 41, 59)
    headband = (255, 255, 255)     # Cinta blanca

    ball_x = cx + 11
    ball_y = cy + 11 + bob

    if row == 4: # FOCUS: Balón pisado con el pie en reposo
        c.fill_rect(cx - 6, cy - 4, 12, 12, *jersey_yellow)
        c.fill_rect(cx - 5, cy + 8, 10, 6, *shorts_blue)
        c.fill_rect(cx - 5, cy - 16, 10, 11, *skin)
        c.fill_rect(cx - 5, cy - 17, 10, 2, *headband)
        c.fill_rect(cx - 5, cy - 20, 10, 4, *hair)
        # Balón bajo la suela
        c.draw_ellipse(cx + 7, cy + 12, 5, 5, 255, 255, 255)
        c.fill_rect(cx + 6, cy + 11, 2, 2, 0, 0, 0)
        return

    if row == 5: # SLEEP: Sentado sobre el balón descansando
        c.fill_rect(cx - 6, cy + 1, 12, 10, *jersey_yellow)
        c.fill_rect(cx - 5, cy - 8, 10, 9, *skin)
        c.fill_rect(cx - 5, cy - 10, 10, 2, *headband)
        c.fill_rect(cx - 5, cy - 13, 10, 4, *hair)
        c.draw_ellipse(cx, cy + 12, 7, 7, 255, 255, 255)
        c.fill_rect(cx - 2, cy + 11, 4, 3, 0, 0, 0)
        c.draw_zz_particles(cx, cy, frame)
        return

    # Camiseta #10
    c.fill_rect(cx - 6, cy - 4 + bob, 12, 12, *jersey_yellow)
    c.fill_rect(cx - 3, cy - 4 + bob, 6, 2, *collar_green)
    # Dorsal verde
    c.fill_rect(cx - 1, cy + bob, 2, 5, *collar_green)

    # Pantalón azul
    c.fill_rect(cx - 6, cy + 7 + bob, 12, 5, *shorts_blue)

    # Piernas y botines
    leg = (3 if frame % 2 == 0 else -3) if row == 1 else 0
    c.fill_rect(cx - 5, cy + 11 + leg, 4, 6, *skin)
    c.fill_rect(cx + 1, cy + 11 - leg, 4, 6, *skin)
    c.fill_rect(cx - 6, cy + 16 + leg, 5, 3, *boots)
    c.fill_rect(cx + 1, cy + 16 - leg, 5, 3, *boots)

    # Cabeza con cinta blanca y peinado moderno
    c.fill_rect(cx - 5, cy - 16 + bob, 10, 12, *skin)
    c.fill_rect(cx - 5, cy - 15 + bob, 10, 2, *headband)
    c.fill_rect(cx - 4, cy - 20 + bob, 8, 5, *hair) # Tupé moderno
    # Ojos y barba estilizada
    c.fill_rect(cx - 3, cy - 11 + bob, 2, 2, 0, 0, 0)
    c.fill_rect(cx + 2, cy - 11 + bob, 2, 2, 0, 0, 0)
    c.fill_rect(cx - 2, cy - 6 + bob, 4, 1, 80, 40, 10)

    # Balón de fútbol clásico a un lado
    ball_bounce = -2 if (frame % 2 == 0) else 0
    c.draw_ellipse(ball_x, ball_y + ball_bounce, 5, 5, 255, 255, 255)
    c.fill_rect(ball_x - 1, ball_y + ball_bounce - 1, 2, 2, 0, 0, 0)

    if row == 2: # ALERT: Domina de rodilla
        c.fill_rect(cx + 4, cy + 4 + bob, 5, 4, *skin)
    elif row == 3: # VICTORY: Baile samba y gesto corona
        c.fill_rect(cx - 9, cy - 12 + bob, 3, 7, *skin)
        c.fill_rect(cx + 6, cy - 12 + bob, 3, 7, *skin)
        c.fill_rect(cx - 3, cy - 23 + bob, 6, 2, 250, 204, 21) # Corona simbólica


# ==============================================================================
# 4. HARRY POTTER CON ESCOBA
# ==============================================================================
def render_harry_potter(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 36
    bob = int(-2.0 * ((frame % 4) - 1.5))
    c.draw_shadow(cx, cy + 6)

    skin = (254, 215, 170)
    hair = (15, 23, 42)          # Cabello negro rebelde
    robe = (30, 41, 59)          # Túnica negra
    scarf_red = (185, 28, 28)    # Rojo Gryffindor
    scarf_gold = (234, 179, 8)   # Dorado
    wood = (120, 53, 15)         # Escoba de madera
    twigs = (217, 119, 6)        # Cerdas de la escoba
    snitch = (250, 204, 21)

    if row == 5: # SLEEP
        c.fill_rect(cx - 10, cy + 2, 20, 14, *robe)
        c.fill_rect(cx - 6, cy - 8, 12, 10, *skin)
        c.fill_rect(cx - 7, cy - 12, 14, 5, *hair)
        # Varita a un lado
        c.fill_rect(cx + 6, cy + 4, 8, 2, *wood)
        c.draw_zz_particles(cx, cy, frame)
        return

    # Escoba voladora (Saeta de Fuego) cruzando por debajo
    c.fill_rect(cx - 16, cy + 8 + bob, 32, 3, *wood)
    c.fill_rect(cx - 22, cy + 6 + bob, 8, 7, *twigs) # Cepillo trasero

    # Túnica ondeando en vuelo
    c.fill_rect(cx - 7, cy - 3 + bob, 14, 12, *robe)
    c.fill_rect(cx - 9, cy + 2 + bob, 4, 8, *robe) # Capa ondeando
    # Bufanda de Gryffindor
    c.fill_rect(cx - 6, cy - 5 + bob, 12, 3, *scarf_red)
    c.fill_rect(cx - 2, cy - 5 + bob, 4, 3, *scarf_gold)

    # Piernas montadas en la escoba
    c.fill_rect(cx - 4, cy + 8 + bob, 4, 5, *robe)
    c.fill_rect(cx + 2, cy + 8 + bob, 4, 5, *robe)

    # Cabeza, cabello y gafas redondas
    c.fill_rect(cx - 6, cy - 16 + bob, 12, 11, *skin)
    c.fill_rect(cx - 7, cy - 19 + bob, 14, 6, *hair)
    # Cicatriz de rayo roja
    c.fill_rect(cx - 1, cy - 14 + bob, 2, 3, 220, 38, 38)
    # Gafas redondas negras clásicas
    c.fill_rect(cx - 5, cy - 12 + bob, 4, 4, 15, 23, 42)
    c.fill_rect(cx - 4, cy - 11 + bob, 2, 2, *skin)
    c.fill_rect(cx + 1, cy - 12 + bob, 4, 4, 15, 23, 42)
    c.fill_rect(cx + 2, cy - 11 + bob, 2, 2, *skin)
    c.fill_rect(cx - 1, cy - 11 + bob, 2, 1, 15, 23, 42) # Puente gafas

    # Brazo sosteniendo la escoba o varita
    c.fill_rect(cx + 5, cy + 1 + bob, 6, 3, *skin)
    c.fill_rect(cx + 9, cy - 3 + bob, 2, 8, *wood) # Varita mágica

    if row == 2: # ALERT: Hechizo Lumos destellando en la punta
        c.fill_rect(cx + 8, cy - 6 + bob, 4, 4, 255, 255, 255)
        c.fill_rect(cx + 7, cy - 7 + bob, 6, 6, 147, 197, 253, 160)
    elif row == 3: # VICTORY: Atrapó la Snitch Dorada!
        c.draw_ellipse(cx + 14, cy - 8 + bob, 4, 4, *snitch)
        c.fill_rect(cx + 11, cy - 9 + bob, 2, 2, 255, 255, 255) # Alita
        c.fill_rect(cx + 19, cy - 9 + bob, 2, 2, 255, 255, 255) # Alita
    elif row == 4: # FOCUS: Libro de pociones flotando frente a él
        c.fill_rect(cx + 8, cy - 2 + bob, 12, 9, 136, 19, 55)
        c.fill_rect(cx + 10, cy + bob, 8, 5, 254, 240, 138)


# ==============================================================================
# 5. LORD VOLDEMORT
# ==============================================================================
def render_voldemort(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    bob = int(-1.5 * ((frame % 4) - 1.5))
    c.draw_shadow(cx, cy)

    pale = (226, 232, 240)       # Piel pálida ceniza
    eyes_red = (220, 38, 38)     # Ojos rojos siniestros
    robe = (15, 23, 42)          # Túnica oscura
    robe_dark = (5, 10, 20)
    wand = (245, 245, 240)       # Varita de Saúco hueso
    magic_green = (34, 197, 94)  # Verde Avada Kedavra

    if row == 5: # SLEEP: Levitación estática con niebla oscura
        c.fill_rect(cx - 8, cy - 4, 16, 16, *robe)
        c.fill_rect(cx - 6, cy - 14, 12, 10, *pale)
        c.draw_ellipse(cx, cy + 12, 16, 4, 16, 185, 129, 90) # Niebla verde
        c.draw_zz_particles(cx, cy, frame)
        return

    # Túnica ondeante y fantasmagórica
    c.fill_rect(cx - 8, cy - 4 + bob, 16, 15, *robe)
    c.fill_rect(cx - 10, cy + 4 + bob, 20, 10, *robe_dark)
    c.fill_rect(cx - 12, cy + 12 + bob, 24, 4, *robe)

    # Cabeza calva pálida con forma de reptil
    c.fill_rect(cx - 6, cy - 18 + bob, 12, 14, *pale)
    c.fill_rect(cx - 5, cy - 20 + bob, 10, 3, *pale) # Coronilla calva
    # Ojos rojos alargados
    c.fill_rect(cx - 4, cy - 13 + bob, 3, 2, *eyes_red)
    c.fill_rect(cx + 1, cy - 13 + bob, 3, 2, *eyes_red)
    # Hendiduras nasales de serpiente
    c.fill_rect(cx - 2, cy - 9 + bob, 1, 2, 71, 85, 105)
    c.fill_rect(cx + 1, cy - 9 + bob, 1, 2, 71, 85, 105)

    # Brazo esquelético extendido con Varita de Saúco
    c.fill_rect(cx + 6, cy - 4 + bob, 7, 3, *pale)
    c.fill_rect(cx + 12, cy - 12 + bob, 2, 10, *wand)

    if row == 2: # ALERT: Destello verde amenazante
        c.fill_rect(cx + 11, cy - 15 + bob, 4, 4, *magic_green)
        c.draw_ellipse(cx + 13, cy - 13 + bob, 8, 8, *magic_green, 120)
    elif row == 3: # VICTORY: Rayo verde serpentino ascendente
        for i in range(12):
            c.set_pixel(cx + 13 + (i % 3), cy - 14 - i + bob, *magic_green)
        c.fill_rect(cx + 10, cy - 26 + bob, 7, 4, *magic_green)
    elif row == 4: # FOCUS: Esfera de magia oscura concentrada
        c.draw_ellipse(cx + 14, cy - 3 + bob, 6, 6, *magic_green)
        c.draw_ellipse(cx + 14, cy - 3 + bob, 3, 3, 255, 255, 255)


# ==============================================================================
# 6. CAPITÁN AMÉRICA (Con Escudo de Vibranium)
# ==============================================================================
def render_captain_america(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    blue = (37, 99, 235)         # Azul heroico
    red = (220, 38, 38)          # Rojo
    white = (255, 255, 255)
    brown = (120, 53, 15)        # Cuero arneses
    skin = (254, 215, 170)

    if row == 4: # FOCUS: Guardia firme tras el escudo de vibranium
        # Escudo grande al frente
        c.draw_ellipse(cx, cy, 14, 14, *red)
        c.draw_ellipse(cx, cy, 11, 11, *white)
        c.draw_ellipse(cx, cy, 8, 8, *red)
        c.draw_ellipse(cx, cy, 5, 5, *blue)
        c.fill_rect(cx - 2, cy - 2, 4, 4, *white) # Estrella
        # Casco asomándose
        c.fill_rect(cx - 5, cy - 14, 10, 8, *blue)
        c.fill_rect(cx - 2, cy - 13, 4, 2, *white) # 'A'
        return

    if row == 5: # SLEEP: Descansando con el escudo apoyado
        c.fill_rect(cx - 7, cy - 4, 14, 14, *blue)
        c.fill_rect(cx - 5, cy - 14, 10, 10, *blue)
        c.draw_ellipse(cx + 8, cy + 4, 8, 8, *red)
        c.draw_ellipse(cx + 8, cy + 4, 5, 5, *blue)
        c.draw_zz_particles(cx, cy, frame)
        return

    # Torso con rayas rojas y blancas, y pecho azul con estrella
    c.fill_rect(cx - 7, cy - 4 + bob, 14, 6, *blue)
    c.fill_rect(cx - 1, cy - 3 + bob, 3, 3, *white) # Estrella en el pecho
    # Rayas abdominales
    c.fill_rect(cx - 6, cy + 2 + bob, 12, 5, *white)
    c.fill_rect(cx - 4, cy + 2 + bob, 2, 5, *red)
    c.fill_rect(cx, cy + 2 + bob, 2, 5, *red)
    c.fill_rect(cx + 3, cy + 2 + bob, 2, 5, *red)
    # Cinturón de cuero
    c.fill_rect(cx - 7, cy + 7 + bob, 14, 2, *brown)

    # Piernas
    leg = (2 if frame % 2 == 0 else -2) if row == 1 else 0
    c.fill_rect(cx - 6, cy + 9 + leg, 5, 7, *blue)
    c.fill_rect(cx + 1, cy + 9 - leg, 5, 7, *blue)
    c.fill_rect(cx - 6, cy + 15 + leg, 5, 4, *red) # Botas rojas
    c.fill_rect(cx + 1, cy + 15 - leg, 5, 4, *red)

    # Cabeza con casco azul y 'A'
    c.fill_rect(cx - 6, cy - 16 + bob, 12, 12, *blue)
    c.fill_rect(cx - 4, cy - 10 + bob, 8, 6, *skin) # Rostro visible
    c.fill_rect(cx - 3, cy - 10 + bob, 2, 2, 0, 0, 0)
    c.fill_rect(cx + 1, cy - 10 + bob, 2, 2, 0, 0, 0)
    c.fill_rect(cx - 2, cy - 15 + bob, 4, 3, *white) # Letra 'A'

    # Escudo en el brazo izquierdo
    shield_x = cx - 11
    shield_y = cy + 2 + bob
    if row == 3: # VICTORY: Lanza el escudo en el aire
        shield_x = cx + 12
        shield_y = cy - 12 + bob
    c.draw_ellipse(shield_x, shield_y, 8, 8, *red)
    c.draw_ellipse(shield_x, shield_y, 6, 6, *white)
    c.draw_ellipse(shield_x, shield_y, 4, 4, *red)
    c.draw_ellipse(shield_x, shield_y, 2, 2, *blue)


# ==============================================================================
# 7. IRON MAN (Reactor Arc brillante)
# ==============================================================================
def render_iron_man(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    gold = (234, 179, 8)         # Dorado Mark
    crimson = (185, 28, 28)      # Rojo carmesí armadura
    cyan = (56, 189, 248)        # Reactor Arc encendido
    white = (255, 255, 255)

    if row == 4: # FOCUS: Proyectando pantallas holográficas 3D
        c.fill_rect(cx - 7, cy - 4, 14, 13, *crimson)
        c.fill_rect(cx - 5, cy - 16, 10, 12, *crimson)
        c.fill_rect(cx - 3, cy - 14, 6, 8, *gold)
        # Reactor
        c.fill_rect(cx - 2, cy - 1, 4, 4, *cyan)
        # Paneles holográficos cian translúcidos
        c.fill_rect(cx - 14, cy - 6, 8, 12, *cyan)
        c.fill_rect(cx + 6, cy - 6, 8, 12, *cyan)
        return

    if row == 5: # SLEEP: Modo recarga con reactor parpadeante
        c.fill_rect(cx - 7, cy - 4, 14, 13, *crimson)
        c.fill_rect(cx - 5, cy - 16, 10, 12, *crimson)
        c.fill_rect(cx - 3, cy - 14, 6, 8, *gold)
        dim = 140 if (frame % 2 == 0) else 255
        c.fill_rect(cx - 2, cy - 1, 4, 4, 56, 189, dim)
        c.draw_zz_particles(cx, cy, frame)
        return

    # Torso rojo y dorado
    c.fill_rect(cx - 7, cy - 4 + bob, 14, 12, *crimson)
    c.fill_rect(cx - 5, cy + 2 + bob, 10, 4, *gold)
    # Reactor Arc central
    c.fill_rect(cx - 2, cy - 2 + bob, 4, 4, *cyan)
    c.fill_rect(cx - 1, cy - 1 + bob, 2, 2, *white)

    # Piernas
    leg = (2 if frame % 2 == 0 else -2) if row == 1 else 0
    c.fill_rect(cx - 6, cy + 8 + leg, 5, 6, *gold)
    c.fill_rect(cx + 1, cy + 8 - leg, 5, 6, *gold)
    c.fill_rect(cx - 6, cy + 14 + leg, 5, 4, *crimson)
    c.fill_rect(cx + 1, cy + 14 - leg, 5, 4, *crimson)

    # Casco rojo con placa dorada
    c.fill_rect(cx - 6, cy - 16 + bob, 12, 12, *crimson)
    c.fill_rect(cx - 4, cy - 14 + bob, 8, 9, *gold) # Placa frontal dorada
    # Ojos rasgados cian brillantes
    c.fill_rect(cx - 3, cy - 11 + bob, 2, 1, *cyan)
    c.fill_rect(cx + 1, cy - 11 + bob, 2, 1, *cyan)

    # Brazos
    c.fill_rect(cx - 10, cy - 3 + bob, 3, 10, *crimson)
    c.fill_rect(cx + 7, cy - 3 + bob, 3, 10, *crimson)

    if row == 2: # ALERT: Repulsores en manos cargando
        c.fill_rect(cx - 10, cy + 7 + bob, 3, 3, *cyan)
        c.fill_rect(cx + 7, cy + 7 + bob, 3, 3, *cyan)
    elif row == 3: # VICTORY: Despegue con propulsores de fuego en botas
        c.fill_rect(cx - 6, cy + 18 + bob, 5, 5, 245, 158, 11)
        c.fill_rect(cx + 1, cy + 18 + bob, 5, 5, 245, 158, 11)
        c.fill_rect(cx - 5, cy + 21 + bob, 3, 3, 56, 189, 248)
        c.fill_rect(cx + 2, cy + 21 + bob, 3, 3, 56, 189, 248)


# ==============================================================================
# 8. THOR ODINSON (Martillo Mjölnir y Truenos)
# ==============================================================================
def render_thor(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    silver = (148, 163, 184)     # Armadura metálica
    cape_red = (220, 38, 38)     # Capa asgardiana
    blonde = (250, 204, 21)      # Cabello rubio largo
    skin = (254, 215, 170)
    lightning = (56, 189, 248)   # Rayos azules
    wood = (120, 53, 15)

    if row == 4: # FOCUS: Mjölnir apoyado en tierra con chispas
        c.fill_rect(cx - 7, cy - 4, 14, 12, *silver)
        c.fill_rect(cx - 5, cy - 16, 10, 11, *skin)
        c.fill_rect(cx - 7, cy - 18, 14, 5, *silver) # Casco alado
        # Mjölnir en el suelo
        c.fill_rect(cx + 7, cy + 6, 8, 10, 71, 85, 105)
        c.fill_rect(cx + 10, cy + 1, 2, 6, *wood)
        # Chispas azules
        c.fill_rect(cx + 6, cy + 4, 2, 2, *lightning)
        c.fill_rect(cx + 14, cy + 8, 2, 2, *lightning)
        return

    if row == 5: # SLEEP: Descansando contra una roca con Mjölnir
        c.fill_rect(cx - 8, cy - 2, 16, 14, *cape_red)
        c.fill_rect(cx - 6, cy - 10, 12, 10, *skin)
        c.fill_rect(cx + 6, cy + 6, 8, 8, 71, 85, 105)
        c.draw_zz_particles(cx, cy, frame)
        return

    # Capa roja trasera
    c.fill_rect(cx - 10, cy - 3 + bob, 20, 16, *cape_red)

    # Armadura asgardiana con círculos plateados
    c.fill_rect(cx - 7, cy - 4 + bob, 14, 12, 30, 41, 59)
    c.fill_rect(cx - 5, cy - 2 + bob, 3, 3, *silver)
    c.fill_rect(cx + 2, cy - 2 + bob, 3, 3, *silver)
    c.fill_rect(cx - 5, cy + 4 + bob, 3, 3, *silver)
    c.fill_rect(cx + 2, cy + 4 + bob, 3, 3, *silver)

    # Piernas
    leg = (2 if frame % 2 == 0 else -2) if row == 1 else 0
    c.fill_rect(cx - 6, cy + 8 + leg, 5, 7, 30, 41, 59)
    c.fill_rect(cx + 1, cy + 8 - leg, 5, 7, 30, 41, 59)
    c.fill_rect(cx - 6, cy + 15 + leg, 5, 3, *silver)
    c.fill_rect(cx + 1, cy + 15 - leg, 5, 3, *silver)

    # Cabeza, barba rubia y casco alado
    c.fill_rect(cx - 5, cy - 15 + bob, 10, 11, *skin)
    c.fill_rect(cx - 6, cy - 19 + bob, 12, 5, *silver) # Casco
    # Alas laterales del casco
    c.fill_rect(cx - 9, cy - 20 + bob, 3, 6, 241, 245, 249)
    c.fill_rect(cx + 6, cy - 20 + bob, 3, 6, 241, 245, 249)
    # Melena rubia y barba
    c.fill_rect(cx - 7, cy - 14 + bob, 2, 9, *blonde)
    c.fill_rect(cx + 5, cy - 14 + bob, 2, 9, *blonde)
    c.fill_rect(cx - 3, cy - 7 + bob, 6, 3, *blonde)

    # Mjölnir en mano
    hammer_x = cx + 8
    hammer_y = cy - 2 + bob
    if row == 3: # VICTORY: Levanta el martillo al cielo invocando trueno!
        hammer_x = cx + 5
        hammer_y = cy - 22 + bob
        # Rayo celestial cayendo
        for y in range(fy, int(hammer_y)):
            c.set_pixel(hammer_x + 3 + (y % 2), y, *lightning)

    c.fill_rect(hammer_x, hammer_y, 8, 6, 148, 163, 184) # Cabeza del martillo
    c.fill_rect(hammer_x + 3, hammer_y + 6, 2, 6, *wood) # Mango


# ==============================================================================
# 9. BUGS BUNNY (Con Zanahoria)
# ==============================================================================
def render_bugs_bunny(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    grey = (148, 163, 184)       # Gris conejo clásico
    white = (255, 255, 255)
    pink = (244, 114, 182)       # Interior de orejas y nariz
    carrot_orange = (249, 115, 22)
    leaf_green = (34, 197, 94)

    if row == 4: # FOCUS: Masticando zanahoria concentrado
        c.fill_rect(cx - 6, cy - 4, 12, 14, *grey)
        c.fill_rect(cx - 4, cy - 2, 8, 10, *white)
        c.fill_rect(cx - 5, cy - 16, 10, 11, *grey)
        c.fill_rect(cx - 3, cy - 12, 6, 6, *white)
        # Orejas largas
        c.fill_rect(cx - 5, cy - 28, 3, 12, *grey)
        c.fill_rect(cx + 2, cy - 28, 3, 12, *grey)
        # Zanahoria en boca
        c.fill_rect(cx + 3, cy - 9, 8, 3, *carrot_orange)
        c.fill_rect(cx + 10, cy - 10, 3, 4, *leaf_green)
        return

    if row == 5: # SLEEP: En su madriguera durmiendo
        c.fill_rect(cx - 8, cy + 2, 16, 12, *grey)
        c.fill_rect(cx - 5, cy - 6, 10, 9, *grey)
        # Orejas caídas hacia atrás
        c.fill_rect(cx - 14, cy - 4, 8, 3, *grey)
        c.fill_rect(cx - 14, cy - 1, 8, 3, *grey)
        c.draw_zz_particles(cx, cy, frame)
        return

    # Cuerpo estilizado
    c.fill_rect(cx - 5, cy - 4 + bob, 10, 13, *grey)
    c.fill_rect(cx - 3, cy - 2 + bob, 6, 9, *white) # Pecho blanco

    # Patas largas de conejo
    leg = (3 if frame % 2 == 0 else -3) if row == 1 else 0
    c.fill_rect(cx - 5, cy + 9 + leg, 3, 8, *grey)
    c.fill_rect(cx + 2, cy + 9 - leg, 3, 8, *grey)
    c.fill_rect(cx - 7, cy + 17 + leg, 6, 2, *white) # Pies grandes
    c.fill_rect(cx + 1, cy + 17 - leg, 6, 2, *white)

    # Cabeza y hocico blanco con dientes saltones
    c.fill_rect(cx - 5, cy - 16 + bob, 10, 12, *grey)
    c.fill_rect(cx - 4, cy - 10 + bob, 8, 6, *white) # Hocico
    c.fill_rect(cx - 1, cy - 10 + bob, 2, 2, *pink)  # Nariz rosa
    c.fill_rect(cx - 2, cy - 6 + bob, 4, 2, *white)  # Dientes de conejo
    # Ojos ovalados expresivos
    c.fill_rect(cx - 4, cy - 14 + bob, 2, 3, 0, 0, 0)
    c.fill_rect(cx + 2, cy - 14 + bob, 2, 3, 0, 0, 0)

    # Orejas largas erguidas con centro rosa
    ear_bend = -1 if (frame % 2 == 0) else 1
    c.fill_rect(cx - 5 + ear_bend, cy - 28 + bob, 3, 12, *grey)
    c.fill_rect(cx - 4 + ear_bend, cy - 26 + bob, 1, 9, *pink)
    c.fill_rect(cx + 2 - ear_bend, cy - 28 + bob, 3, 12, *grey)
    c.fill_rect(cx + 3 - ear_bend, cy - 26 + bob, 1, 9, *pink)

    # Cola blanca pomposa detrás
    c.fill_rect(cx - 8, cy + 5 + bob, 3, 4, *white)

    # Guante blanco y zanahoria
    c.fill_rect(cx + 5, cy - 2 + bob, 4, 4, *white) # Guante
    c.fill_rect(cx + 7, cy - 7 + bob, 4, 8, *carrot_orange)
    c.fill_rect(cx + 8, cy - 10 + bob, 2, 3, *leaf_green)

    if row == 2: # ALERT: Una oreja doblada con cara de "¿Qué pasa?"
        c.fill_rect(cx - 8, cy - 22 + bob, 4, 3, *grey)
    elif row == 3: # VICTORY: Reverencia teatral girando la zanahoria
        c.fill_rect(cx + 8, cy - 14 + bob, 8, 3, *carrot_orange)
        c.fill_rect(cx + 15, cy - 14 + bob, 3, 2, *leaf_green)


# ==============================================================================
# DEFINICIONES DE METADATOS Y MANIFIESTOS
# ==============================================================================

NEW_SKINS = [
    {
        "id": "labrador-retriever",
        "name": "Labrador Retriever",
        "personalityPrompt": "Leal, cariñoso, juguetón y siempre feliz de verte trabajar.",
        "dialogues": {
            "alert": "¡Guau! Parece que tienes una entrega pendiente. ¡Vamos juntos, tú puedes!",
            "victory": "¡Sí! ¡Pelota de tenis para celebrar! Excelente trabajo, amigo humano.",
            "focus": "Me quedo aquí echadito a tus pies sin hacer ruido mientras te concentras.",
            "break": "¡Hora de estirar las patas! Un paseo corto nos vendría genial a los dos.",
            "sleep": "Zzz... roncando suavemente en la alfombra al lado de tu escritorio."
        },
        "render": render_labrador
    },
    {
        "id": "little-girl",
        "name": "Lily Estudiante",
        "personalityPrompt": "Curiosa, tierna, aplicada y motivadora para tus horas de estudio.",
        "dialogues": {
            "alert": "¡Oye! No olvides revisar el campus virtual, hay una tarea por entregar.",
            "victory": "¡Lo logramos! ¡Puse una estrellita dorada en nuestro cuaderno de metas!",
            "focus": "Silencio de biblioteca: lápiz afilado y mente brillante.",
            "break": "Vamos por un jugo o un snack dulce antes de continuar.",
            "sleep": "Abrazo a mi osito y a dormir temprano para tener energía mañana."
        },
        "render": render_little_girl
    },
    {
        "id": "neymar-jr",
        "name": "Neymar Jr.",
        "personalityPrompt": "Mágico, alegre, regateador de problemas y enfocado en el objetivo.",
        "dialogues": {
            "alert": "¡Presión alta en la salida! Hay que resolver esta entrega antes del pitazo.",
            "victory": "¡Golazo al ángulo! Baile de celebración para festejar este merge limpio.",
            "focus": "Pelota dominada. Cabeza levantada y lectura de juego perfecta.",
            "break": "Momento de hidratarse en la banca y planear la jugada del segundo tiempo.",
            "sleep": "Descanso de campeón. Mañana volvemos a la cancha con todo el talento."
        },
        "render": render_neymar
    },
    {
        "id": "harry-potter",
        "name": "Harry Potter",
        "personalityPrompt": "Valiente, leal, buscador de Quidditch enfocado en atrapar la Snitch.",
        "dialogues": {
            "alert": "¡Atento al pergamino! Una entrega vuela hacia ti a la velocidad de una Snitch.",
            "victory": "¡Cincuenta puntos para Gryffindor! Merge perfecto sin un solo maleficio.",
            "focus": "Varita firme y mente despejada. Hora de conjurar avances extraordinarios.",
            "break": "Una cerveza de manteca en las Tres Escobas para reponer energías.",
            "sleep": "El mapa merodeador vigilará el escritorio mientras descansamos."
        },
        "render": render_harry_potter
    },
    {
        "id": "lord-voldemort",
        "name": "Lord Voldemort",
        "personalityPrompt": "Poderoso, calculador, solemne y exigente con la perfección.",
        "dialogues": {
            "alert": "El tiempo no perdona a los débiles. Completa esa tarea de inmediato.",
            "victory": "La grandeza no se concede; se toma. Tu código ha prevalecido sin rival.",
            "focus": "Silencio absoluto. Conjurando líneas de poder implacable.",
            "break": "Una breve tregua. No te confíes, la excelencia exige vigilancia constante.",
            "sleep": "Incluso la magia más oscura requiere que las sombras se recarguen."
        },
        "render": render_voldemort
    },
    {
        "id": "captain-america",
        "name": "Capitán América",
        "personalityPrompt": "Líder inspirador, disciplinado, protector y con resistencia infinita.",
        "dialogues": {
            "alert": "¡Equipo, atención! Plazo detectado. Mantengamos la formación y avancemos.",
            "victory": "Podría hacer esto todo el día. Gran avance completado con honor.",
            "focus": "Escudo al frente y concentración total. Ningún bug pasará esta línea.",
            "break": "Cinco minutos de reagrupamiento táctico. Respiremos hondo.",
            "sleep": "Misión cumplida por hoy. A descansar, soldado; te lo has ganado."
        },
        "render": render_captain_america
    },
    {
        "id": "iron-man",
        "name": "Iron Man",
        "personalityPrompt": "Genio, visionario, sarcástico e impulsado por tecnología de punta.",
        "dialogues": {
            "alert": "JARVIS detectó una entrega en el radar. Hora de ponerse la armadura.",
            "victory": "Soy Iron Man. Y este código funciona con un 3000% de eficiencia.",
            "focus": "Reactor Arc al 100%. Calibrando algoritmos y quemando problemas.",
            "break": "Tregua para una hamburguesa con queso mientras se enfrían los propulsores.",
            "sleep": "Activando protocolo de recarga nocturna. No toques nada sin mí."
        },
        "render": render_iron_man
    },
    {
        "id": "thor-odinson",
        "name": "Thor Odinson",
        "personalityPrompt": "Dios del Trueno, épico, generoso y con la fuerza de las tormentas.",
        "dialogues": {
            "alert": "¡Por Odín! Una batalla académica se aproxima en el horizonte.",
            "victory": "¡Otro triunfo digno del Valhalla! ¡Traed hidromiel para celebrar!",
            "focus": "Mjölnir reposa sereno mientras forjamos soluciones con la mente.",
            "break": "Un festín asgardiano breve antes de que vuelva a rugir la tormenta.",
            "sleep": "Que los vientos de Asgard cuiden tu descanso hasta el amanecer."
        },
        "render": render_thor
    },
    {
        "id": "bugs-bunny",
        "name": "Bugs Bunny",
        "personalityPrompt": "Astuto, divertido, relajado y con una respuesta para todo.",
        "dialogues": {
            "alert": "¿Qué hay de nuevo, viejo? Parece que se acerca la hora de entregar eso.",
            "victory": "¡Eso es to, eso es to, eso es todo amigos! ¡Victoria limpia de campeonato!",
            "focus": "Mascando mi zanahoria mientras tú resuelves los problemas difíciles.",
            "break": "Momento de un descanso en Albuquerque antes de seguir el camino.",
            "sleep": "A mi madriguera a dormir como un lirón. ¡Hasta luego, viejo!"
        },
        "render": render_bugs_bunny
    }
]


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    skins_dir = os.path.join(base_dir, "public", "skins")

    print(f"[MySkin] Generando {len(NEW_SKINS)} nuevas skins solicitadas en {skins_dir}...")

    for skin in NEW_SKINS:
        skin_id = skin["id"]
        skin_dir = os.path.join(skins_dir, skin_id)
        os.makedirs(skin_dir, exist_ok=True)

        manifest = {
            "id": skin_id,
            "name": skin["name"],
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

    print("[MySkin] Las 9 nuevas skins fueron creadas satisfactoriamente.")

if __name__ == "__main__":
    main()
