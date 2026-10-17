#!/usr/bin/env python3
"""
MySkin - Generador de Skins del Pack Iconos Pop, Deportes, Superheroes y Mascotas
Genera manifest.json y spritesheet.png (384x384, 6 filas x 6 columnas, 64x64 px por frame)
para 14 personajes iconicos:
1. batman-detective (Batman)
2. superman-man-of-steel (Superman)
3. darth-vader (Darth Vader)
4. master-yoda (Maestro Yoda)
5. gandalf-grey (Gandalf el Gris)
6. spongebob-square (Bob Esponja)
7. rick-sanchez (Rick Sanchez)
8. lionel-messi (Lionel Messi)
9. cristiano-cr7 (Cristiano Ronaldo)
10. michael-jordan-23 (Michael Jordan)
11. cat-mystic (Gato Negro)
12. shiba-inu (Shiba Inu)
13. panda-zen (Panda Zen)
14. arctic-penguin (Pinguino Antartico)
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
# 1. BATMAN
# ==============================================================================
def render_batman(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    dark = (15, 23, 42)
    grey = (71, 85, 105)
    yellow = (234, 179, 8)
    skin_c = (254, 215, 170)
    white = (248, 250, 252)

    if row == 4: # FOCUS: Analizando datos en la Batcomputadora portatil
        c.draw_ellipse(cx, cy + 6, 12, 10, *grey)
        c.fill_rect(cx - 7, cy + 1, 14, 8, *dark) # Capa
        c.draw_ellipse(cx, cy - 7, 8, 7, *dark)
        c.fill_rect(cx - 3, cy - 5, 6, 4, *skin_c) # Barbilla
        # Pantalla holografica azul
        pulsar = (frame * 2) % 6
        c.fill_rect(cx + 6, cy - 4, 10, 8, 14, 165, 233, 180)
        c.fill_rect(cx + 7, cy - 2, 8, 1, *white)
        return

    if row == 5: # SLEEP: En reposo vigilante
        c.draw_ellipse(cx, cy + 8, 13, 8, *dark)
        c.draw_ellipse(cx - 5, cy + 2, 8, 6, *dark)
        c.fill_rect(cx - 6, cy + 4, 5, 3, *skin_c)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Capa ondulante negra
    c.fill_rect(cx - 11, y_body + 2, 4, 15, *dark)
    c.fill_rect(cx + 7, y_body + 2, 4, 15, *dark)

    # Piernas grises con botas negras
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 11, 4, 5, *grey)
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 4, 5, *grey)
    c.fill_rect(cx - 7 + leg_offset, y_body + 15, 5, 4, *dark)
    c.fill_rect(cx + 2 - leg_offset, y_body + 15, 5, 4, *dark)

    # Torso gris con murcielago negro y cinturon amarillo
    c.fill_rect(cx - 8, y_body, 16, 12, *grey)
    # Emblema murcielago
    c.fill_rect(cx - 5, y_body + 2, 10, 4, *dark)
    c.fill_rect(cx - 2, y_body + 1, 4, 2, *dark)
    # Cinturon de utilidades amarillo
    c.fill_rect(cx - 7, y_body + 9, 14, 3, *yellow)
    c.fill_rect(cx - 2, y_body + 9, 4, 3, 202, 138, 4)

    # Brazos con guanteletes negros y aletas
    if row == 3: # VICTORY: Gancho disparado hacia arriba
        c.fill_rect(cx + 7, y_body - 10, 4, 16, *dark)
        c.fill_rect(cx + 6, y_body - 14, 6, 4, *grey) # Gancho
        c.fill_rect(cx - 10, y_body + 1, 4, 8, *dark)
    else:
        c.fill_rect(cx - 10, y_body + 1, 4, 9, *dark)
        c.fill_rect(cx + 6, y_body + 1, 4, 9, *dark)
        # Cuchillas en guanteletes
        c.fill_rect(cx - 12, y_body + 5, 2, 4, *dark)
        c.fill_rect(cx + 10, y_body + 5, 2, 4, *dark)

    # Cabeza con mascara y orejas puntiagudas
    c.draw_ellipse(cx, y_body - 7, 7, 7, *dark)
    # Orejas de murcielago
    c.fill_rect(cx - 7, y_body - 17, 3, 7, *dark)
    c.fill_rect(cx + 4, y_body - 17, 3, 7, *dark)
    # Boca descubierta
    c.fill_rect(cx - 3, y_body - 4, 6, 4, *skin_c)
    # Ojos blancos de la mascara
    c.fill_rect(cx - 5, y_body - 8, 3, 2, *white)
    c.fill_rect(cx + 2, y_body - 8, 3, 2, *white)


# ==============================================================================
# 2. SUPERMAN
# ==============================================================================
def render_superman(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    blue = (30, 64, 175)
    red = (220, 38, 38)
    yellow = (250, 204, 21)
    skin_c = (254, 215, 170)
    black = (15, 23, 42)

    if row == 4: # FOCUS: Levitando sereno con brazos cruzados
        c.draw_ellipse(cx, cy + 4, 11, 9, *blue)
        c.fill_rect(cx - 6, cy + 3, 12, 5, *blue) # Brazos cruzados
        c.draw_ellipse(cx, cy - 6, 7, 7, *skin_c)
        c.fill_rect(cx - 6, cy - 12, 12, 5, *black) # Pelo
        c.fill_rect(cx - 1, cy - 7, 2, 3, *black) # Rizo
        c.fill_rect(cx - 9, cy + 4, 3, 12, *red) # Capa
        c.fill_rect(cx + 6, cy + 4, 3, 12, *red)
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 8, 12, 8, *blue)
        c.draw_ellipse(cx - 5, cy + 2, 7, 6, *skin_c)
        c.fill_rect(cx - 9, cy - 2, 10, 5, *black)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Capa roja flameante
    c.fill_rect(cx - 10, y_body + 1, 4, 16, *red)
    c.fill_rect(cx + 6, y_body + 1, 4, 16, *red)

    # Piernas azules con botas rojas
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 11, 4, 5, *blue)
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 4, 5, *blue)
    c.fill_rect(cx - 7 + leg_offset, y_body + 15, 5, 4, *red)
    c.fill_rect(cx + 2 - leg_offset, y_body + 15, 5, 4, *red)

    # Torso azul con escudo 'S' y cinturon amarillo
    c.fill_rect(cx - 8, y_body, 16, 12, *blue)
    # Escudo S
    c.fill_rect(cx - 5, y_body + 2, 10, 5, *yellow)
    c.fill_rect(cx - 3, y_body + 3, 6, 3, *red)
    # Cinturón amarillo y calzón rojo clásico
    c.fill_rect(cx - 7, y_body + 8, 14, 2, *yellow)
    c.fill_rect(cx - 6, y_body + 10, 12, 2, *red)

    # Brazos
    if row == 3: # VICTORY: Pose de vuelo con puño arriba
        c.fill_rect(cx + 6, y_body - 10, 4, 16, *blue)
        c.fill_rect(cx + 5, y_body - 13, 6, 4, *skin_c) # Puño en alto
        c.fill_rect(cx - 10, y_body + 1, 4, 8, *blue)
    else:
        c.fill_rect(cx - 9, y_body + 1, 3, 8, *blue)
        c.fill_rect(cx + 6, y_body + 1, 3, 8, *blue)
        c.fill_rect(cx - 9, y_body + 7, 4, 4, *skin_c)
        c.fill_rect(cx + 6, y_body + 7, 4, 4, *skin_c)

    # Cabeza
    c.draw_ellipse(cx, y_body - 6, 7, 7, *skin_c)
    c.fill_rect(cx - 3, y_body - 7, 2, 3, *blue) # Ojos azules
    c.fill_rect(cx + 2, y_body - 7, 2, 3, *blue)

    # Cabello negro peinado con el iconico rizo frontal
    c.fill_rect(cx - 7, y_body - 13, 14, 6, *black)
    c.fill_rect(cx - 1, y_body - 8, 2, 4, *black) # Rizo en 'S'


# ==============================================================================
# 3. DARTH VADER
# ==============================================================================
def render_darth_vader(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    black = (15, 23, 42)
    armor_dark = (30, 41, 59)
    saber_red = (239, 68, 68)
    chest_red = (220, 38, 38)
    chest_green = (34, 197, 94)
    steel = (148, 163, 184)

    if row == 4: # FOCUS: Meditacion imperial
        c.draw_ellipse(cx, cy + 6, 12, 10, *black)
        c.fill_rect(cx - 6, cy + 3, 12, 6, *armor_dark)
        c.draw_ellipse(cx, cy - 7, 8, 7, *black)
        # Ojos de la mascara
        c.fill_rect(cx - 5, cy - 8, 3, 2, 71, 85, 105)
        c.fill_rect(cx + 2, cy - 8, 3, 2, 71, 85, 105)
        # Respirador triangular
        c.fill_rect(cx - 2, cy - 5, 4, 3, *steel)
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 8, 13, 8, *black)
        c.draw_ellipse(cx - 5, cy + 2, 8, 7, *black)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Capa imperial negra ondulante
    c.fill_rect(cx - 12, y_body + 1, 5, 17, *black)
    c.fill_rect(cx + 7, y_body + 1, 5, 17, *black)

    # Piernas y botas negras
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 11, 4, 5, *armor_dark)
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 4, 5, *armor_dark)
    c.fill_rect(cx - 7 + leg_offset, y_body + 15, 5, 4, *black)
    c.fill_rect(cx + 2 - leg_offset, y_body + 15, 5, 4, *black)

    # Torso con caja de soporte vital
    c.fill_rect(cx - 8, y_body, 16, 12, *black)
    c.fill_rect(cx - 4, y_body + 3, 8, 6, *armor_dark)
    c.fill_rect(cx - 3, y_body + 4, 2, 2, *chest_red) # Boton rojo
    c.fill_rect(cx + 1, y_body + 4, 2, 2, *chest_green) # Boton verde
    c.fill_rect(cx - 7, y_body + 9, 14, 2, *steel) # Cinturon

    # Brazos y sable de luz rojo
    if row == 3: # VICTORY: Enciende sable rojo
        c.fill_rect(cx + 7, y_body - 14, 3, 19, *saber_red) # Hoja de luz
        c.fill_rect(cx + 7, y_body + 4, 3, 4, *steel) # Empuñadura
        c.fill_rect(cx - 10, y_body + 1, 4, 8, *black)
    else:
        c.fill_rect(cx - 10, y_body + 1, 4, 8, *black)
        c.fill_rect(cx + 6, y_body + 1, 4, 8, *black)
        c.fill_rect(cx + 8, y_body + 5, 2, 5, *steel) # Empuñadura apagada

    # Casco imperial con forma caracteristica
    c.draw_ellipse(cx, y_body - 7, 8, 8, *black)
    # Reborde inferior del casco
    c.fill_rect(cx - 9, y_body - 6, 18, 3, *black)
    # Visor y respirador
    c.fill_rect(cx - 5, y_body - 8, 3, 2, 71, 85, 105)
    c.fill_rect(cx + 2, y_body - 8, 3, 2, 71, 85, 105)
    c.fill_rect(cx - 2, y_body - 5, 4, 3, *steel)


# ==============================================================================
# 4. MASTER YODA
# ==============================================================================
def render_yoda(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 42
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    green_skin = (101, 163, 13)
    robe_tan = (217, 190, 150)
    robe_brown = (146, 64, 14)
    stick = (120, 53, 15)
    saber_green = (34, 197, 94)
    white = (248, 250, 252)

    if row == 4: # FOCUS: Levitando en meditacion con la Fuerza
        c.draw_ellipse(cx, cy + 2, 10, 8, *robe_tan)
        c.draw_ellipse(cx, cy - 6, 7, 6, *green_skin)
        # Orejas horizontales largas
        c.fill_rect(cx - 16, cy - 7, 10, 3, *green_skin)
        c.fill_rect(cx + 6, cy - 7, 10, 3, *green_skin)
        # Ojos cerrados
        c.fill_rect(cx - 4, cy - 6, 8, 1, 30, 41, 59)
        # Particulas de la Fuerza
        pulsar = (frame * 2) % 6
        c.draw_ellipse(cx, cy - 2, 12 + pulsar, 12 + pulsar, 134, 239, 172, 80)
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 5, 11, 7, *robe_tan)
        c.draw_ellipse(cx - 4, cy + 1, 7, 6, *green_skin)
        c.fill_rect(cx - 13, cy, 9, 3, *green_skin)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (3 if row == 2 else (5 if row == 3 else 0))

    # Tunica jedi beige pequeña
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 4 + leg_offset, y_body + 8, 3, 4, *green_skin) # Pies
    c.fill_rect(cx + 1 - leg_offset, y_body + 8, 3, 4, *green_skin)

    c.draw_ellipse(cx, y_body + 3, 9, 8, *robe_tan)
    c.fill_rect(cx - 3, y_body, 6, 8, *robe_brown) # Capa interior

    # Baston de madera en mano derecha
    c.fill_rect(cx - 8, y_body - 1, 2, 13, *stick)

    # Brazo izquierdo / sable
    if row == 3: # VICTORY: Enciende sable de luz verde
        c.fill_rect(cx + 8, y_body - 12, 3, 16, *saber_green)
        c.fill_rect(cx + 8, y_body + 3, 3, 3, 148, 163, 184)
    else:
        c.fill_rect(cx + 6, y_body + 2, 3, 5, *robe_tan)
        c.fill_rect(cx + 6, y_body + 6, 3, 2, *green_skin)

    # Cabeza verde pequeña
    c.draw_ellipse(cx, y_body - 5, 7, 6, *green_skin)
    # Cabello blanco tenue lateral
    c.fill_rect(cx - 7, y_body - 6, 2, 3, *white)
    c.fill_rect(cx + 5, y_body - 6, 2, 3, *white)

    # Grandes orejas puntiagudas laterales
    c.fill_rect(cx - 16, y_body - 6, 10, 3, *green_skin)
    c.fill_rect(cx - 15, y_body - 7, 7, 2, *green_skin)
    c.fill_rect(cx + 6, y_body - 6, 10, 3, *green_skin)
    c.fill_rect(cx + 8, y_body - 7, 7, 2, *green_skin)

    # Ojos sabios
    c.fill_rect(cx - 4, y_body - 6, 2, 2, 15, 23, 42)
    c.fill_rect(cx + 2, y_body - 6, 2, 2, 15, 23, 42)


# ==============================================================================
# 5. GANDALF EL GRIS
# ==============================================================================
def render_gandalf(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    grey_robe = (100, 116, 139)
    dark_grey = (51, 65, 85)
    beard_white = (241, 245, 249)
    skin_c = (254, 215, 170)
    wood = (120, 53, 15)
    magic_white = (255, 255, 255)

    if row == 4: # FOCUS: Leyendo pergamino antiguo
        c.draw_ellipse(cx, cy + 6, 12, 10, *grey_robe)
        c.fill_rect(cx - 5, cy + 2, 10, 8, *beard_white)
        c.draw_ellipse(cx, cy - 7, 7, 6, *skin_c)
        # Pergamino beige en manos
        c.fill_rect(cx + 4, cy - 2, 8, 7, 254, 240, 138)
        c.fill_rect(cx + 5, cy, 6, 1, 146, 64, 14)
        c.fill_rect(cx + 5, cy + 2, 5, 1, 146, 64, 14)
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 8, 13, 8, *grey_robe)
        c.fill_rect(cx - 8, cy + 3, 10, 6, *beard_white)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Túnica gris amplia
    c.fill_rect(cx - 8, y_body, 16, 18, *grey_robe)
    c.fill_rect(cx - 10, y_body + 10, 20, 8, *dark_grey)

    # Baston de mago largo en mano izquierda
    c.fill_rect(cx - 11, y_body - 12, 2, 28, *wood)
    # Destello magico en la punta del baston
    if row == 3: # VICTORY: Levanta baston destellando luz blanca
        c.draw_ellipse(cx - 10, y_body - 14, 6, 6, *magic_white, 220)
        c.draw_ellipse(cx - 10, y_body - 14, 9, 9, 224, 242, 254, 120)
    else:
        c.fill_rect(cx - 12, y_body - 13, 4, 3, *magic_white)

    # Cabeza y rostro
    c.draw_ellipse(cx, y_body - 6, 7, 6, *skin_c)
    # Gran barba blanca ondulante
    c.fill_rect(cx - 5, y_body - 3, 10, 11, *beard_white)
    c.fill_rect(cx - 3, y_body + 7, 6, 5, *beard_white)

    # Sombrero conico gris puntiagudo
    c.fill_rect(cx - 12, y_body - 11, 24, 3, *dark_grey) # Ala ancha
    c.fill_rect(cx - 6, y_body - 17, 12, 6, *dark_grey)
    c.fill_rect(cx - 3, y_body - 22, 6, 5, *dark_grey)
    c.fill_rect(cx - 1, y_body - 26, 3, 4, *dark_grey) # Punta


# ==============================================================================
# 6. BOB ESPONJA
# ==============================================================================
def render_spongebob(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    sponge_yellow = (250, 204, 21)
    pore_olive = (202, 138, 4)
    white = (248, 250, 252)
    brown = (146, 64, 14)
    red = (220, 38, 38)
    blue_eye = (14, 165, 233)
    black = (15, 23, 42)

    if row == 4: # FOCUS: Leyendo un libro con gafas redondas
        c.fill_rect(cx - 10, cy - 8, 20, 16, *sponge_yellow)
        # Gafas redondas negras
        c.draw_ellipse(cx - 4, cy - 3, 4, 4, *black)
        c.draw_ellipse(cx - 4, cy - 3, 3, 3, *white)
        c.draw_ellipse(cx + 4, cy - 3, 4, 4, *black)
        c.draw_ellipse(cx + 4, cy - 3, 3, 3, *white)
        c.fill_rect(cx - 1, cy - 3, 2, 1, *black) # Puente
        # Libro abierto
        c.fill_rect(cx - 8, cy + 6, 16, 6, 59, 130, 246)
        c.fill_rect(cx - 7, cy + 7, 6, 4, *white)
        c.fill_rect(cx + 1, cy + 7, 6, 4, *white)
        return

    if row == 5: # SLEEP
        c.fill_rect(cx - 10, cy - 2, 20, 14, *sponge_yellow)
        c.fill_rect(cx - 6, cy + 2, 4, 1, *black)
        c.fill_rect(cx + 2, cy + 2, 4, 1, *black)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Piernas delgadas con calcetines blancos y zapatos negros
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 5 + leg_offset, y_body + 13, 2, 4, *sponge_yellow)
    c.fill_rect(cx + 3 - leg_offset, y_body + 13, 2, 4, *sponge_yellow)
    c.fill_rect(cx - 5 + leg_offset, y_body + 15, 2, 2, *white) # Calcetines
    c.fill_rect(cx + 3 - leg_offset, y_body + 15, 2, 2, *white)
    c.fill_rect(cx - 6 + leg_offset, y_body + 17, 4, 2, *black) # Zapatos
    c.fill_rect(cx + 2 - leg_offset, y_body + 17, 4, 2, *black)

    # Pantalones cuadrados marrones y camisa blanca con corbata roja
    c.fill_rect(cx - 9, y_body + 10, 18, 4, *brown)
    c.fill_rect(cx - 9, y_body + 7, 18, 3, *white) # Camisa blanca
    c.fill_rect(cx - 1, y_body + 8, 2, 4, *red) # Corbata roja

    # Cuerpo cubico amarillo esponjoso
    c.fill_rect(cx - 11, y_body - 10, 22, 17, *sponge_yellow)
    # Poros de esponja
    c.fill_rect(cx - 9, y_body - 8, 2, 2, *pore_olive)
    c.fill_rect(cx + 6, y_body - 6, 3, 2, *pore_olive)
    c.fill_rect(cx - 7, y_body + 3, 2, 2, *pore_olive)
    c.fill_rect(cx + 7, y_body + 2, 2, 2, *pore_olive)

    # Bracitos amarillos
    if row == 3: # VICTORY: Soplando burbujas festivas
        c.fill_rect(cx - 13, y_body - 2, 3, 7, *sponge_yellow)
        c.fill_rect(cx + 10, y_body - 6, 3, 8, *sponge_yellow)
        # Burbujas flotando
        c.draw_ellipse(cx + 12, y_body - 12, 4, 4, 147, 197, 253, 180)
        c.draw_ellipse(cx + 6, y_body - 16, 3, 3, 147, 197, 253, 180)
    else:
        c.fill_rect(cx - 13, y_body + 1, 3, 7, *sponge_yellow)
        c.fill_rect(cx + 10, y_body + 1, 3, 7, *sponge_yellow)

    # Grandes ojos azules saltones
    c.draw_ellipse(cx - 4, y_body - 4, 5, 5, *white)
    c.draw_ellipse(cx + 4, y_body - 4, 5, 5, *white)
    c.draw_ellipse(cx - 3, y_body - 4, 2, 2, *blue_eye)
    c.draw_ellipse(cx + 3, y_body - 4, 2, 2, *blue_eye)

    # Nariz y gran sonrisa con 2 dientes separados
    c.fill_rect(cx - 1, y_body - 3, 2, 3, *sponge_yellow)
    c.fill_rect(cx - 5, y_body + 2, 10, 2, *black) # Sonrisa
    c.fill_rect(cx - 3, y_body + 2, 2, 2, *white) # Diente 1
    c.fill_rect(cx + 1, y_body + 2, 2, 2, *white) # Diente 2


# ==============================================================================
# 7. RICK SANCHEZ
# ==============================================================================
def render_rick(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    hair_blue = (186, 230, 253)
    skin_c = (241, 245, 249)
    lab_coat = (255, 255, 255)
    teal_shirt = (20, 184, 166)
    brown_pants = (120, 53, 15)
    portal_green = (34, 197, 94)
    black = (15, 23, 42)

    if row == 4: # FOCUS: Manipulando tubos de ensayo
        c.draw_ellipse(cx, cy + 6, 10, 9, *lab_coat)
        c.fill_rect(cx - 3, cy + 2, 6, 8, *teal_shirt)
        c.draw_ellipse(cx, cy - 7, 7, 7, *skin_c)
        c.fill_rect(cx - 4, cy - 9, 8, 1, 14, 165, 233) # Uniceja
        # Tubo de ensayo verde brillante
        c.fill_rect(cx + 6, cy - 4, 2, 8, 226, 232, 240)
        c.fill_rect(cx + 6, cy - 1, 2, 5, *portal_green)
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 8, 12, 7, *lab_coat)
        c.draw_ellipse(cx - 5, cy + 2, 7, 6, *skin_c)
        c.fill_rect(cx - 10, cy - 3, 9, 5, *hair_blue)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Piernas largas con pantalones marrones
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 5 + leg_offset, y_body + 11, 3, 7, *brown_pants)
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 3, 7, *brown_pants)
    c.fill_rect(cx - 6 + leg_offset, y_body + 17, 4, 2, *black) # Zapatos
    c.fill_rect(cx + 2 - leg_offset, y_body + 17, 4, 2, *black)

    # Bata blanca de laboratorio abierta y camiseta verde azulada
    c.fill_rect(cx - 8, y_body, 16, 12, *lab_coat)
    c.fill_rect(cx - 3, y_body, 6, 11, *teal_shirt)

    # Brazos con pistola de portales
    if row == 3: # VICTORY: Abre portal verde y saluda
        c.fill_rect(cx + 6, y_body - 8, 4, 14, *lab_coat)
        c.fill_rect(cx + 6, y_body - 12, 6, 4, 148, 163, 184) # Pistola portales
        c.fill_rect(cx + 9, y_body - 13, 2, 2, *portal_green) # Luz verde
        # Portal verde circular en el fondo
        c.draw_ellipse(cx - 10, y_body - 2, 9, 13, *portal_green, 150)
    else:
        c.fill_rect(cx - 9, y_body + 1, 3, 8, *lab_coat)
        c.fill_rect(cx + 6, y_body + 1, 3, 8, *lab_coat)
        c.fill_rect(cx - 9, y_body + 7, 3, 3, *skin_c)
        c.fill_rect(cx + 6, y_body + 7, 3, 3, *skin_c)

    # Cabeza alargada
    c.draw_ellipse(cx, y_body - 6, 7, 7, *skin_c)
    # Uniceja celeste
    c.fill_rect(cx - 5, y_body - 10, 10, 1, 14, 165, 233)
    # Ojos y pupilas
    c.draw_ellipse(cx - 3, y_body - 7, 3, 3, *skin_c)
    c.fill_rect(cx - 3, y_body - 7, 1, 1, *black)
    c.draw_ellipse(cx + 3, y_body - 7, 3, 3, *skin_c)
    c.fill_rect(cx + 3, y_body - 7, 1, 1, *black)

    # Cabello en picos puntiagudos celestes caracteristico
    c.fill_rect(cx - 12, y_body - 12, 5, 8, *hair_blue)
    c.fill_rect(cx - 9, y_body - 18, 6, 9, *hair_blue)
    c.fill_rect(cx - 3, y_body - 21, 6, 11, *hair_blue)
    c.fill_rect(cx + 3, y_body - 19, 6, 10, *hair_blue)
    c.fill_rect(cx + 8, y_body - 13, 5, 8, *hair_blue)


# ==============================================================================
# 8. LIONEL MESSI
# ==============================================================================
def render_messi(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    sky_blue = (56, 189, 248)
    white = (255, 255, 255)
    black = (15, 23, 42)
    skin_c = (254, 215, 170)
    beard_brown = (120, 53, 15)
    gold = (250, 204, 21)

    if row == 4: # FOCUS: Dominando el balon con la zurda
        c.draw_ellipse(cx, cy + 6, 10, 9, *sky_blue)
        c.draw_ellipse(cx, cy - 6, 7, 7, *skin_c)
        c.fill_rect(cx - 4, cy - 4, 8, 3, *beard_brown)
        # Balon en el pie
        c.draw_ellipse(cx + 8, cy + 12, 5, 5, *white)
        c.fill_rect(cx + 7, cy + 11, 2, 2, *black)
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 8, 12, 7, *sky_blue)
        c.draw_ellipse(cx - 5, cy + 2, 7, 6, *skin_c)
        c.fill_rect(cx - 8, cy + 3, 6, 3, *beard_brown)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Piernas con pantalones negros y botines dorados
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 11, 4, 5, *black)
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 4, 5, *black)
    c.fill_rect(cx - 6 + leg_offset, y_body + 15, 4, 3, *white) # Medias
    c.fill_rect(cx + 2 - leg_offset, y_body + 15, 4, 3, *white)
    c.fill_rect(cx - 7 + leg_offset, y_body + 17, 5, 2, *gold) # Botines
    c.fill_rect(cx + 2 - leg_offset, y_body + 17, 5, 2, *gold)

    # Camiseta albiceleste a bastones con cinta de capitan
    c.fill_rect(cx - 7, y_body, 14, 11, *sky_blue)
    c.fill_rect(cx - 4, y_body, 2, 11, *white) # Baston blanco 1
    c.fill_rect(cx + 2, y_body, 2, 11, *white) # Baston blanco 2
    # Cinta de capitán amarilla en brazo izquierdo
    c.fill_rect(cx - 10, y_body + 3, 3, 3, *gold)

    # Brazos
    if row == 3: # VICTORY: Dedos indices apuntando al cielo (celebracion iconica)
        c.fill_rect(cx - 9, y_body - 9, 3, 14, *skin_c)
        c.fill_rect(cx + 6, y_body - 9, 3, 14, *skin_c)
        c.fill_rect(cx - 9, y_body - 12, 1, 3, *skin_c) # Dedos al cielo
        c.fill_rect(cx + 8, y_body - 12, 1, 3, *skin_c)
    else:
        c.fill_rect(cx - 9, y_body + 1, 3, 8, *skin_c)
        c.fill_rect(cx + 6, y_body + 1, 3, 8, *skin_c)

    # Cabeza y rostro
    c.draw_ellipse(cx, y_body - 6, 7, 7, *skin_c)
    # Cabello castaño y barba cuidada
    c.fill_rect(cx - 7, y_body - 12, 14, 5, *beard_brown)
    c.fill_rect(cx - 4, y_body - 4, 8, 4, *beard_brown)
    # Ojos
    c.fill_rect(cx - 3, y_body - 7, 2, 2, 15, 23, 42)
    c.fill_rect(cx + 2, y_body - 7, 2, 2, 15, 23, 42)


# ==============================================================================
# 9. CRISTIANO RONALDO
# ==============================================================================
def render_cristiano(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    red = (220, 38, 38)
    green = (22, 163, 74)
    white = (255, 255, 255)
    black = (15, 23, 42)
    skin_c = (245, 195, 148)

    if row == 4: # FOCUS: Postura firme de tiro libre con piernas abiertas
        c.fill_rect(cx - 8, cy + 9, 4, 9, *red)
        c.fill_rect(cx + 4, cy + 9, 4, 9, *red)
        c.draw_ellipse(cx, cy + 3, 10, 8, *red)
        c.draw_ellipse(cx, cy - 6, 7, 7, *skin_c)
        c.fill_rect(cx - 6, cy - 12, 12, 5, *black)
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 8, 12, 7, *red)
        c.draw_ellipse(cx - 5, cy + 2, 7, 6, *skin_c)
        c.fill_rect(cx - 8, cy - 2, 10, 5, *black)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Piernas atleticas
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 11, 4, 5, *white)
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 4, 5, *white)
    c.fill_rect(cx - 6 + leg_offset, y_body + 15, 4, 3, *green) # Medias
    c.fill_rect(cx + 2 - leg_offset, y_body + 15, 4, 3, *green)
    c.fill_rect(cx - 7 + leg_offset, y_body + 17, 5, 2, *black) # Botines
    c.fill_rect(cx + 2 - leg_offset, y_body + 17, 5, 2, *black)

    # Camiseta roja de alto rendimiento
    c.fill_rect(cx - 7, y_body, 14, 11, *red)
    c.fill_rect(cx - 1, y_body + 2, 2, 7, *green) # Franja central

    # Brazos
    if row == 3: # VICTORY: Pose "Siu" con brazos abiertos y giro
        c.fill_rect(cx - 12, y_body + 1, 6, 4, *skin_c)
        c.fill_rect(cx + 6, y_body + 1, 6, 4, *skin_c)
        c.fill_rect(cx - 14, y_body + 4, 4, 8, *skin_c)
        c.fill_rect(cx + 10, y_body + 4, 4, 8, *skin_c)
    else:
        c.fill_rect(cx - 9, y_body + 1, 3, 8, *skin_c)
        c.fill_rect(cx + 6, y_body + 1, 3, 8, *skin_c)

    # Cabeza y corte de cabello degradado moderno
    c.draw_ellipse(cx, y_body - 6, 7, 7, *skin_c)
    c.fill_rect(cx - 6, y_body - 12, 12, 5, *black)
    c.fill_rect(cx - 3, y_body - 14, 6, 3, *black) # Cresta engominada
    # Ojos y cejas
    c.fill_rect(cx - 4, y_body - 7, 2, 2, *black)
    c.fill_rect(cx + 2, y_body - 7, 2, 2, *black)


# ==============================================================================
# 10. MICHAEL JORDAN
# ==============================================================================
def render_jordan(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    red = (220, 38, 38)
    black = (15, 23, 42)
    white = (255, 255, 255)
    skin_dark = (120, 53, 15)
    ball_orange = (234, 88, 12)

    if row == 4: # FOCUS: Botando el balon con lengua afuera
        c.draw_ellipse(cx, cy + 6, 10, 9, *red)
        c.draw_ellipse(cx, cy - 6, 7, 7, *skin_dark)
        c.fill_rect(cx + 1, cy - 4, 2, 2, 239, 68, 68) # Lengua afuera
        # Balon de baloncesto rebotando
        bota_y = (frame % 2) * 4
        c.draw_ellipse(cx - 9, cy + 8 + bota_y, 5, 5, *ball_orange)
        c.fill_rect(cx - 10, cy + 8 + bota_y, 4, 1, *black)
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 8, 12, 7, *red)
        c.draw_ellipse(cx - 5, cy + 2, 7, 6, *skin_dark)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (4 if row == 2 else (6 if row == 3 else 0))

    # Piernas largas con calentador en rodilla izquierda y zapatillas Air Jordan
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 11, 4, 5, *red) # Pantalon rojo
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 4, 5, *red)
    c.fill_rect(cx - 6 + leg_offset, y_body + 15, 4, 3, *skin_dark)
    c.fill_rect(cx + 2 - leg_offset, y_body + 14, 4, 2, *black) # Calentador rodilla
    c.fill_rect(cx + 2 - leg_offset, y_body + 16, 4, 2, *skin_dark)
    c.fill_rect(cx - 7 + leg_offset, y_body + 17, 5, 3, *white) # Zapatillas
    c.fill_rect(cx - 5 + leg_offset, y_body + 17, 2, 2, *red)
    c.fill_rect(cx + 2 - leg_offset, y_body + 17, 5, 3, *white)
    c.fill_rect(cx + 4 - leg_offset, y_body + 17, 2, 2, *red)

    # Camiseta roja numero 23
    c.fill_rect(cx - 7, y_body, 14, 11, *red)
    c.fill_rect(cx - 3, y_body + 3, 6, 4, *black) # Numero 23
    c.fill_rect(cx - 2, y_body + 4, 4, 2, *white)

    # Brazos atleticos
    if row == 3: # VICTORY: Salto flotante Air Jordan encestando
        c.fill_rect(cx + 7, y_body - 12, 4, 16, *skin_dark)
        # Balon en la mano en el punto mas alto
        c.draw_ellipse(cx + 9, y_body - 14, 6, 6, *ball_orange)
        c.fill_rect(cx + 7, y_body - 14, 4, 1, *black)
        c.fill_rect(cx - 10, y_body - 2, 4, 8, *skin_dark)
    else:
        c.fill_rect(cx - 9, y_body + 1, 3, 8, *skin_dark)
        c.fill_rect(cx + 6, y_body + 1, 3, 8, *skin_dark)
        # Balon sostenido en mano derecha
        c.draw_ellipse(cx - 12, y_body + 8, 5, 5, *ball_orange)

    # Cabeza rapada
    c.draw_ellipse(cx, y_body - 6, 7, 7, *skin_dark)
    c.fill_rect(cx - 4, y_body - 7, 2, 2, *black)
    c.fill_rect(cx + 2, y_body - 7, 2, 2, *black)


# ==============================================================================
# 11. GATO NEGRO
# ==============================================================================
def render_black_cat(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 42
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    black = (15, 23, 42)
    dark_fur = (30, 41, 59)
    amber_eyes = (245, 158, 11)
    bell_gold = (250, 204, 21)
    collar_purple = (147, 51, 234)

    if row == 4: # FOCUS: Amasando una mantita
        c.draw_ellipse(cx, cy + 4, 12, 8, *black)
        c.draw_ellipse(cx, cy - 4, 8, 7, *black)
        # Patitas amasando alternadas
        paw_l = (frame % 2) * 2
        paw_r = ((frame + 1) % 2) * 2
        c.fill_rect(cx - 7, cy + 9 - paw_l, 4, 3, *dark_fur)
        c.fill_rect(cx + 3, cy + 9 - paw_r, 4, 3, *dark_fur)
        # Mantita debajo
        c.fill_rect(cx - 12, cy + 12, 24, 4, 168, 85, 247)
        return

    if row == 5: # SLEEP: Hecho una rosquita
        c.draw_ellipse(cx, cy + 5, 13, 8, *black)
        c.draw_ellipse(cx - 5, cy + 3, 7, 6, *black)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (3 if row == 2 else (5 if row == 3 else 0))

    # Cola suave ondulante
    c.fill_rect(cx - 14, y_body + 1, 3, 8, *black)
    c.fill_rect(cx - 16, y_body - 4, 3, 6, *black)
    c.fill_rect(cx - 14, y_body - 7, 4, 3, *black)

    # Patitas
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 8, 3, 5, *black)
    c.fill_rect(cx + 2 - leg_offset, y_body + 8, 3, 5, *black)

    # Cuerpo felino negro
    c.draw_ellipse(cx, y_body + 3, 10, 8, *black)
    # Collar morado con cascabel dorado
    c.fill_rect(cx - 5, y_body - 1, 10, 2, *collar_purple)
    c.draw_ellipse(cx, y_body, 2, 2, *bell_gold)

    # Cabeza con orejas puntiagudas
    c.draw_ellipse(cx, y_body - 6, 8, 7, *black)
    # Orejas
    c.fill_rect(cx - 8, y_body - 14, 4, 5, *black)
    c.fill_rect(cx - 7, y_body - 13, 2, 3, 244, 114, 182) # Interior rosa
    c.fill_rect(cx + 4, y_body - 14, 4, 5, *black)
    c.fill_rect(cx + 5, y_body - 13, 2, 3, 244, 114, 182)

    # Ojos ambar brillantes
    if row == 3: # VICTORY: Guiño jugueton y salto
        c.fill_rect(cx - 5, y_body - 7, 3, 4, *amber_eyes)
        c.fill_rect(cx + 2, y_body - 6, 3, 1, *amber_eyes)
    else:
        c.fill_rect(cx - 5, y_body - 7, 3, 4, *amber_eyes)
        c.fill_rect(cx - 4, y_body - 7, 1, 4, *black) # Pupila vertical
        c.fill_rect(cx + 2, y_body - 7, 3, 4, *amber_eyes)
        c.fill_rect(cx + 3, y_body - 7, 1, 4, *black)

    # Naricita rosa y bigotes blancos
    c.fill_rect(cx - 1, y_body - 3, 2, 1, 244, 114, 182)
    c.fill_rect(cx - 9, y_body - 3, 4, 1, 248, 250, 252, 160)
    c.fill_rect(cx + 5, y_body - 3, 4, 1, 248, 250, 252, 160)


# ==============================================================================
# 12. SHIBA INU
# ==============================================================================
def render_shiba(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 40
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    gold_fur = (217, 119, 6)
    white_fur = (255, 255, 255)
    bandana_red = (220, 38, 38)
    black = (15, 23, 42)

    if row == 4: # FOCUS: Postura de perro guardian sereno
        c.draw_ellipse(cx, cy + 5, 12, 9, *gold_fur)
        c.draw_ellipse(cx, cy - 5, 8, 7, *gold_fur)
        c.fill_rect(cx - 4, cy - 4, 8, 4, *white_fur) # Hocico
        c.fill_rect(cx - 1, cy - 4, 2, 2, *black) # Nariz
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 6, 13, 8, *gold_fur)
        c.draw_ellipse(cx - 5, cy + 2, 8, 6, *gold_fur)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (3 if row == 2 else (5 if row == 3 else 0))

    # Cola enroscada hacia arriba
    c.fill_rect(cx - 15, y_body + 1, 4, 4, *gold_fur)
    c.fill_rect(cx - 17, y_body - 4, 4, 6, *white_fur)

    # Patitas
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 9, 3, 5, *white_fur)
    c.fill_rect(cx + 2 - leg_offset, y_body + 9, 3, 5, *white_fur)

    # Cuerpo dorado con pecho blanco
    c.draw_ellipse(cx, y_body + 3, 11, 8, *gold_fur)
    c.draw_ellipse(cx + 2, y_body + 3, 6, 6, *white_fur)

    # Bandana roja japonesa
    c.fill_rect(cx - 5, y_body - 1, 10, 2, *bandana_red)
    c.fill_rect(cx - 7, y_body, 3, 3, *bandana_red)

    # Cabeza
    c.draw_ellipse(cx, y_body - 6, 8, 7, *gold_fur)
    # Cachetes y hocico blanco
    c.fill_rect(cx - 5, y_body - 5, 10, 5, *white_fur)
    c.fill_rect(cx - 1, y_body - 5, 2, 2, *black) # Nariz
    # Ojos almendrados y cejitas blancas
    c.fill_rect(cx - 4, y_body - 7, 2, 2, *black)
    c.fill_rect(cx + 2, y_body - 7, 2, 2, *black)
    c.fill_rect(cx - 4, y_body - 10, 2, 1, *white_fur) # Puntos sobre cejas
    c.fill_rect(cx + 2, y_body - 10, 2, 1, *white_fur)

    # Orejas triangulares erguidas
    c.fill_rect(cx - 7, y_body - 13, 3, 4, *gold_fur)
    c.fill_rect(cx + 4, y_body - 13, 3, 4, *gold_fur)


# ==============================================================================
# 13. PANDA ZEN
# ==============================================================================
def render_panda(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 40
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    white = (255, 255, 255)
    black = (15, 23, 42)
    bamboo = (34, 197, 94)

    if row == 4: # FOCUS: Comiendo bambu en meditacion
        c.draw_ellipse(cx, cy + 5, 13, 10, *white)
        c.fill_rect(cx - 12, cy + 3, 24, 5, *black)
        c.draw_ellipse(cx, cy - 6, 9, 8, *white)
        # Parches de ojos
        c.fill_rect(cx - 6, cy - 7, 4, 3, *black)
        c.fill_rect(cx + 2, cy - 7, 4, 3, *black)
        # Rama de bambu verde en manos
        c.fill_rect(cx - 2, cy - 2, 2, 12, *bamboo)
        c.fill_rect(cx, cy - 1, 3, 2, *bamboo)
        return

    if row == 5: # SLEEP
        c.draw_ellipse(cx, cy + 6, 14, 9, *white)
        c.draw_ellipse(cx - 5, cy + 2, 9, 7, *white)
        c.fill_rect(cx - 9, cy + 1, 4, 3, *black)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (3 if row == 2 else (5 if row == 3 else 0))

    # Patas negras
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 7 + leg_offset, y_body + 10, 5, 5, *black)
    c.fill_rect(cx + 2 - leg_offset, y_body + 10, 5, 5, *black)

    # Cuerpo blanco con franja negra en hombros
    c.draw_ellipse(cx, y_body + 4, 12, 10, *white)
    c.fill_rect(cx - 10, y_body + 1, 20, 6, *black) # Franja negra

    # Bracitos negros
    if row == 3: # VICTORY: Brazos levantados de alegria
        c.fill_rect(cx - 12, y_body - 4, 4, 8, *black)
        c.fill_rect(cx + 8, y_body - 4, 4, 8, *black)
    else:
        c.fill_rect(cx - 11, y_body + 2, 4, 7, *black)
        c.fill_rect(cx + 7, y_body + 2, 4, 7, *black)

    # Cabeza redonda blanca
    c.draw_ellipse(cx, y_body - 6, 9, 8, *white)

    # Orejas redondas negras
    c.draw_ellipse(cx - 8, y_body - 13, 4, 4, *black)
    c.draw_ellipse(cx + 8, y_body - 13, 4, 4, *black)

    # Parches negros en los ojos y nariz
    c.fill_rect(cx - 6, y_body - 8, 4, 4, *black)
    c.fill_rect(cx - 5, y_body - 7, 2, 2, *white) # Ojo
    c.fill_rect(cx + 2, y_body - 8, 4, 4, *black)
    c.fill_rect(cx + 3, y_body - 7, 2, 2, *white)
    c.fill_rect(cx - 1, y_body - 4, 2, 2, *black) # Naricita


# ==============================================================================
# 14. PINGUINO ANTARTICO
# ==============================================================================
def render_penguin(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 40
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    black = (15, 23, 42)
    white = (255, 255, 255)
    orange = (249, 115, 22)
    scarf_blue = (14, 165, 233)

    if row == 4: # FOCUS: Ajustando notas con bufanda
        c.draw_ellipse(cx, cy + 5, 11, 9, *black)
        c.draw_ellipse(cx, cy + 5, 6, 7, *white)
        c.draw_ellipse(cx, cy - 6, 8, 7, *black)
        c.fill_rect(cx - 1, cy - 4, 4, 2, *orange) # Pico
        # Bufanda azul
        c.fill_rect(cx - 7, cy - 1, 14, 3, *scarf_blue)
        c.fill_rect(cx + 2, cy + 1, 3, 7, *scarf_blue)
        return

    if row == 5: # SLEEP: Deslizamiento suave durmiendo
        c.draw_ellipse(cx, cy + 7, 13, 7, *black)
        c.draw_ellipse(cx - 4, cy + 4, 7, 5, *black)
        c.draw_zz_particles(cx, cy, frame)
        return

    y_body = cy + bob - (3 if row == 2 else (5 if row == 3 else 0))

    # Patitas palmeadas naranjas
    leg_offset = (frame % 4 - 2) if row == 1 else 0
    c.fill_rect(cx - 6 + leg_offset, y_body + 11, 4, 3, *orange)
    c.fill_rect(cx + 2 - leg_offset, y_body + 11, 4, 3, *orange)

    # Cuerpo negro con panza blanca
    c.draw_ellipse(cx, y_body + 3, 10, 9, *black)
    c.draw_ellipse(cx, y_body + 4, 6, 7, *white)

    # Aletas laterales
    if row == 3: # VICTORY: Aleteo alegre y salto
        c.fill_rect(cx - 12, y_body - 2, 4, 8, *black)
        c.fill_rect(cx + 8, y_body - 2, 4, 8, *black)
    else:
        c.fill_rect(cx - 11, y_body + 2, 3, 7, *black)
        c.fill_rect(cx + 8, y_body + 2, 3, 7, *black)

    # Bufanda azul al cuello
    c.fill_rect(cx - 6, y_body - 1, 12, 3, *scarf_blue)
    c.fill_rect(cx + 3, y_body + 1, 3, 6, *scarf_blue)

    # Cabeza negra
    c.draw_ellipse(cx, y_body - 6, 8, 7, *black)
    # Ojos blancos y pico naranja
    c.fill_rect(cx - 4, y_body - 8, 2, 3, *white)
    c.fill_rect(cx - 4, y_body - 7, 1, 2, *black)
    c.fill_rect(cx + 2, y_body - 8, 2, 3, *white)
    c.fill_rect(cx + 3, y_body - 7, 1, 2, *black)
    # Pico naranja triangular
    c.fill_rect(cx - 1, y_body - 5, 4, 3, *orange)


# ==============================================================================
# CONFIGURACION DEL PACK POP, DEPORTES, HEROES Y MASCOTAS
# ==============================================================================
POP_LEGENDS_SKINS = [
    {
        "id": "batman-detective",
        "name": "Batman",
        "category": "heroes",
        "personalityPrompt": "Estratega implacable, meticuloso, guardián incansable de tus proyectos.",
        "dialogues": {
            "alert": "La Batiseñal está en el cielo: una entrega requiere tu intervención inmediata.",
            "victory": "Caso cerrado. Gotham y tu repositorio descansan tranquilos.",
            "focus": "Analizando patrones en la Batcomputadora. Ningún error escapa.",
            "break": "Una ronda de vigilancia silenciosa antes de reanudar.",
            "sleep": "Vigilancia en modo automático desde las sombras de la Baticueva."
        },
        "render": render_batman
    },
    {
        "id": "superman-man-of-steel",
        "name": "Superman",
        "category": "heroes",
        "personalityPrompt": "Optimista, noble, con la fuerza y disciplina para superar cualquier obstáculo.",
        "dialogues": {
            "alert": "Puedo oír la alarma desde Metrópolis: hay una tarea que necesita tu atención.",
            "victory": "¡Arriba, arriba y adelante! Objetivo superado con honor.",
            "focus": "Visión de rayos X aplicada a la detección de soluciones.",
            "break": "Tomando energía de la luz solar para volver con más vigor.",
            "sleep": "Descanso sereno en la Fortaleza de la Soledad."
        },
        "render": render_superman
    },
    {
        "id": "darth-vader",
        "name": "Darth Vader",
        "category": "cine",
        "personalityPrompt": "Imponente, solemne, con un dominio absoluto de la concentración.",
        "dialogues": {
            "alert": "Siento una perturbación en el calendario. Atiende esa entrega.",
            "victory": "El poder del lado oscuro de la productividad es indiscutible.",
            "focus": "Tu falta de distracción es reconfortante.",
            "break": "Una pausa breve en la cámara de meditación.",
            "sleep": "Respiración pausada... la flota imperial permanece alerta."
        },
        "render": render_darth_vader
    },
    {
        "id": "master-yoda",
        "name": "Maestro Yoda",
        "category": "cine",
        "personalityPrompt": "Sabio, paciente, guiando con calma cada paso de tu formación.",
        "dialogues": {
            "alert": "Hacer o no hacer, no existe el intentar. Esa entrega realizar debes.",
            "victory": "Gran logro conseguido has. Que la Fuerza te acompañe siempre.",
            "focus": "Despejada tu mente mantener debes. Fluye la Fuerza en ti.",
            "break": "Un té de raíces y una pausa breve tomar debemos.",
            "sleep": "Zzz... en Dagobah el descanso encontraré."
        },
        "render": render_yoda
    },
    {
        "id": "gandalf-grey",
        "name": "Gandalf el Gris",
        "category": "cine",
        "personalityPrompt": "Sabio consejero, iluminando el camino en los momentos de mayor desafío.",
        "dialogues": {
            "alert": "Un mago nunca llega tarde, ni pronto: llega exactamente cuando se propone cumplir.",
            "victory": "¡Victoria! El paso ha quedado despejado de obstáculos.",
            "focus": "El fuego secreto de la concentración ilumina este escritorio.",
            "break": "Una pipa de hierba para pipa y un momento de reflexión.",
            "sleep": "Descanso breve antes de cruzar las siguientes montañas."
        },
        "render": render_gandalf
    },
    {
        "id": "spongebob-square",
        "name": "Bob Esponja",
        "category": "cartoons",
        "personalityPrompt": "Ultra optimista, apasionado por su labor, alegre y siempre listo.",
        "dialogues": {
            "alert": "¡Estoy listo! ¡Estoy listo! ¡Una entrega emocionante nos llama!",
            "victory": "¡Bailando con burbujas de celebración por esa gran entrega!",
            "focus": "Concentración como haciendo una Cangreburger perfecta.",
            "break": "Hora de una pausa en el Crustáceo Cascarudo.",
            "sleep": "Zzz... contando medusas en los Campos de Medusas."
        },
        "render": render_spongebob
    },
    {
        "id": "rick-sanchez",
        "name": "Rick Sanchez",
        "category": "cartoons",
        "personalityPrompt": "Genio caótico, sarcástico, extremadamente resolutivo ante problemas complejos.",
        "dialogues": {
            "alert": "Morty, digo colega, tenemos una entrega colapsando el continuo espacio-tiempo.",
            "victory": "¡Wubba Lubba Dub-Dub! Código resuelto en esta y otras dimensiones.",
            "focus": "No me hables, estoy sintetizando una solución cuántica.",
            "break": "Cinco minutos para recalibrar la pistola de portales.",
            "sleep": "Zzz... desmayado con la bata puesta en el garaje."
        },
        "render": render_rick
    },
    {
        "id": "lionel-messi",
        "name": "Lionel Messi",
        "category": "deportes",
        "personalityPrompt": "Genialidad tranquila, magia en los momentos clave, humilde y enfocado.",
        "dialogues": {
            "alert": "Vamos que queda poco tiempo. Una buena jugada y lo resolvemos.",
            "victory": "Mirando al cielo: ¡qué golazo de entrega hemos clavado!",
            "focus": "Paso a paso, pelota al pie y mirada fija en el objetivo.",
            "break": "Unos mates con calma antes del segundo tiempo.",
            "sleep": "Descansando bien para salir a ganar mañana."
        },
        "render": render_messi
    },
    {
        "id": "cristiano-cr7",
        "name": "Cristiano Ronaldo",
        "category": "deportes",
        "personalityPrompt": "Disciplina férrea, ambición máxima, mentalidad ganadora y excelencia.",
        "dialogues": {
            "alert": "¡A trabajar! El talento sin disciplina no alcanza para la cima.",
            "victory": "¡Siuuu! Tarea resuelta como un tiro libre al ángulo.",
            "focus": "Dedicación 100%. Cada minuto de estudio cuenta para el récord.",
            "break": "Hidratación y estiramiento. Profesionalismo absoluto.",
            "sleep": "Recuperación muscular para seguir siendo el número uno."
        },
        "render": render_cristiano
    },
    {
        "id": "michael-jordan-23",
        "name": "Michael Jordan",
        "category": "deportes",
        "personalityPrompt": "Competidor nato, resiliencia legendaria, líder que convierte la presión en victoria.",
        "dialogues": {
            "alert": "Cuarto cuarto, últimos segundos: momento de tomar el tiro decisivo.",
            "victory": "¡Canasta sobre la bocina! Campeones del semestre.",
            "focus": "Lengua afuera, bote bajo y ojos puestos en el aro.",
            "break": "Tiempo fuera pedido por el entrenador para repasar la estrategia.",
            "sleep": "Visualizando el próximo campeonato mientras descanso."
        },
        "render": render_jordan
    },
    {
        "id": "cat-mystic",
        "name": "Gato Negro",
        "category": "mascotas",
        "personalityPrompt": "Místico, observador silencioso, reconfortante y de pasos sigilosos.",
        "dialogues": {
            "alert": "Miau suave: una notificación importante ha aparecido en el radar.",
            "victory": "Ronroneo profundo y salto ágil de felicitación.",
            "focus": "Amasando tu atención con patitas suaves para que nada te perturbe.",
            "break": "Momento de estirar el lomo y mirar por la ventana.",
            "sleep": "Hecho una bolita cálida junto al teclado... zzz..."
        },
        "render": render_black_cat
    },
    {
        "id": "shiba-inu",
        "name": "Shiba Inu",
        "category": "mascotas",
        "personalityPrompt": "Leal, independiente, con una sonrisa canina que ilumina cualquier día pesado.",
        "dialogues": {
            "alert": "¡Guau! Orejitas atentas: tienes una clase o tarea próxima.",
            "victory": "Giro en círculo alegre con cola enroscada. ¡Muy bien hecho!",
            "focus": "Postura erguida de guardián leal a tu lado.",
            "break": "Una caricia en el lomo y un paseo breve para despejar.",
            "sleep": "Hocico apoyado en las patas delanteras descansando en paz."
        },
        "render": render_shiba
    },
    {
        "id": "panda-zen",
        "name": "Panda Zen",
        "category": "mascotas",
        "personalityPrompt": "Tranquilo, apacible, maestro en disipar el estrés y la ansiedad.",
        "dialogues": {
            "alert": "Respira hondo: esa entrega se resolverá con serenidad paso a paso.",
            "victory": "¡Bambú de la victoria! Gran avance conseguido sin agobios.",
            "focus": "Mente despejada como un bosque de montaña.",
            "break": "Un refrigerio nutritivo y un respiro reconfortante.",
            "sleep": "Zzz... rodando suavemente en la hierba en calma total."
        },
        "render": render_panda
    },
    {
        "id": "arctic-penguin",
        "name": "Pingüino Antártico",
        "category": "mascotas",
        "personalityPrompt": "Simpático, ordenado, deslizable y siempre dispuesto a animarte.",
        "dialogues": {
            "alert": "¡Aleteo de alerta! El reloj avanza en tu entrega programada.",
            "victory": "¡Deslizamiento triunfal sobre el hielo con aletas al viento!",
            "focus": "Acomodando la bufanda y mirando tus notas con atención.",
            "break": "Un chapuzón refrescante para aclarar las ideas.",
            "sleep": "Acurrucado en el grupo polar en cálido descanso."
        },
        "render": render_penguin
    }
]


def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    skins_dir = os.path.join(base_dir, "public", "skins")

    print(f"[MySkin] Generando {len(POP_LEGENDS_SKINS)} skins del Pack Iconos Pop, Deportes, Heroes y Mascotas...")

    for skin in POP_LEGENDS_SKINS:
        skin_id = skin["id"]
        category = skin["category"]
        skin_dir = os.path.join(skins_dir, skin_id)
        os.makedirs(skin_dir, exist_ok=True)

        manifest = {
            "id": skin_id,
            "name": skin["name"],
            "category": category,
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

        print(f" -> Generada skin: '{skin_id}' ({skin['name']}) [{category}]")

    print("[MySkin] Las 14 skins del pack fueron creadas satisfactoriamente.")

if __name__ == "__main__":
    main()
