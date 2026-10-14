#!/usr/bin/env python3
"""
MySkin - Generador de 10 Skins Oficiales de Lanzamiento
Genera manifest.json y spritesheet.png (384x384, 6 filas x 6 columnas, 64x64 px por frame)
utilizando exclusivamente la biblioteca estandar de Python (zlib y struct).
"""

import os
import json
import zlib
import struct

WIDTH = 384   # 6 columnas * 64 px
HEIGHT = 384  # 6 filas * 64 px (IDLE, WALK, ALERT, VICTORY, FOCUS, SLEEP)

def create_png(width, height, rgba_bytes):
    """Codifica un buffer RGBA en un archivo PNG valido sin dependencias externas."""
    def chunk(tag, data):
        return struct.pack("!I", len(data)) + tag + data + struct.pack("!I", zlib.crc32(tag + data) & 0xffffffff)

    # Encabezado PNG
    header = b"\x89PNG\r\n\x1a\n"
    # IHDR: Width, Height, Bit depth (8), Color type (6 = RGBA), Compression (0), Filter (0), Interlace (0)
    ihdr = struct.pack("!IIBBBBB", width, height, 8, 6, 0, 0, 0)
    
    # Raw scanlines con filter byte 0 (None)
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
        # Letras 'z' y 'Z' flotando
        offset_y = (frame_idx * 3) % 12
        self.fill_rect(cx + 8, cy - 14 - offset_y, 4, 1, 255, 255, 255, 200)
        self.fill_rect(cx + 10, cy - 13 - offset_y, 2, 1, 255, 255, 255, 200)
        self.fill_rect(cx + 8, cy - 12 - offset_y, 4, 1, 255, 255, 255, 200)

        offset_y2 = ((frame_idx + 2) * 3) % 12
        self.fill_rect(cx + 14, cy - 20 - offset_y2, 5, 1, 147, 197, 253, 230)
        self.fill_rect(cx + 16, cy - 19 - offset_y2, 2, 2, 147, 197, 253, 230)
        self.fill_rect(cx + 14, cy - 17 - offset_y2, 5, 1, 147, 197, 253, 230)


# ==============================================================================
# RENDERIZADORES DE SPRITES POR PERSONAJE
# ==============================================================================

def render_spartan(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0
    leg = (2 if frame % 4 < 2 else -2) if row == 1 else 0

    if row == 4: # FOCUS
        # Sentado leyendo pergamino
        c.fill_rect(cx - 8, cy + 6, 16, 12, 120, 53, 15) # Taburete
        c.fill_rect(cx - 10, cy - 6, 20, 14, 194, 65, 12) # Capa
        c.fill_rect(cx - 7, cy - 16, 14, 12, 217, 119, 6) # Casco
        c.fill_rect(cx - 6, cy - 20, 12, 4, 245, 158, 11) # Cresta
        c.fill_rect(cx - 4, cy - 12, 8, 3, 15, 23, 42) # Visor
        # Pergamino abierto
        c.fill_rect(cx - 8, cy - 2, 16, 10, 254, 240, 138)
        c.fill_rect(cx - 6, cy, 12, 2, 161, 98, 7)
        c.fill_rect(cx - 6, cy + 4, 10, 2, 161, 98, 7)
        return

    if row == 5: # SLEEP
        # Apoyado en escudo durmiendo
        c.fill_rect(cx - 12, cy - 2, 10, 20, 234, 179, 8) # Escudo
        c.fill_rect(cx - 2, cy - 4, 14, 18, 194, 65, 12) # Capa
        c.fill_rect(cx, cy - 14, 12, 12, 217, 119, 6) # Casco inclinado
        c.fill_rect(cx + 1, cy - 18, 10, 4, 245, 158, 11) # Cresta
        c.fill_rect(cx + 2, cy - 10, 6, 2, 15, 23, 42) # Ojos cerrados
        c.draw_zz_particles(cx, cy, frame)
        return

    # Capa
    cape_w = 22 + (2 if row == 3 else 0)
    c.fill_rect(cx - 11, cy - 8 + bob, cape_w, 20, 194, 65, 12)
    # Piernas
    c.fill_rect(cx - 6, cy + 8 + leg, 4, 10, 120, 53, 15)
    c.fill_rect(cx + 2, cy + 8 - leg, 4, 10, 120, 53, 15)
    # Torso
    c.fill_rect(cx - 7, cy - 4 + bob, 14, 12, 217, 140, 95)
    c.fill_rect(cx - 6, cy + 4 + bob, 12, 4, 120, 53, 15)
    # Casco y Cresta
    c.fill_rect(cx - 8, cy - 17 + bob, 16, 13, 217, 119, 6)
    c.fill_rect(cx - 7, cy - 22 + bob, 14, 5, 245, 158, 11)
    # Hendidura ojos T
    c.fill_rect(cx - 5, cy - 12 + bob, 10, 3, 15, 23, 42)
    c.fill_rect(cx - 1, cy - 9 + bob, 3, 5, 15, 23, 42)
    # Escudo
    c.draw_ellipse(cx - 10, cy + 2 + bob, 7, 10, 234, 179, 8)
    # Lanza
    spear_y = cy - 24 + bob if row == 2 else (cy - 18 + bob)
    if row == 3: # Victoria: lanza arriba
        spear_y -= 8
    c.fill_rect(cx + 10, spear_y, 2, 34, 203, 213, 225)
    c.fill_rect(cx + 9, spear_y - 4, 4, 5, 245, 158, 11)


def render_spiderman(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    if row == 4: # FOCUS
        # Colgado boca abajo leyendo libro
        c.fill_rect(cx, fy, 2, 14, 241, 245, 249) # Hilo de telarana
        c.fill_rect(cx - 7, fy + 14, 14, 14, 239, 68, 68) # Cabeza invertida
        c.fill_rect(cx - 5, fy + 20, 4, 3, 255, 255, 255) # Ojo blanco
        c.fill_rect(cx + 1, fy + 20, 4, 3, 255, 255, 255) # Ojo blanco
        c.fill_rect(cx - 6, fy + 28, 12, 12, 37, 99, 235) # Torso
        # Libro flotante
        c.fill_rect(cx - 8, fy + 42, 16, 8, 245, 158, 11)
        return

    if row == 5: # SLEEP
        # Hamaca de telarana
        c.fill_rect(cx - 16, cy + 4, 32, 2, 241, 245, 249)
        c.fill_rect(cx - 12, cy - 4, 24, 12, 239, 68, 68)
        c.fill_rect(cx - 8, cy - 2, 16, 8, 37, 99, 235)
        c.draw_zz_particles(cx, cy, frame)
        return

    # Cuerpo Spider-Man agil
    c.fill_rect(cx - 6, cy - 4 + bob, 12, 11, 239, 68, 68) # Pecho rojo
    c.fill_rect(cx - 4, cy + 2 + bob, 8, 5, 37, 99, 235) # Laterales azul
    # Piernas
    leg = (3 if frame % 2 == 0 else -3) if row == 1 else 0
    c.fill_rect(cx - 7, cy + 7 + leg, 5, 11, 37, 99, 235)
    c.fill_rect(cx + 2, cy + 7 - leg, 5, 11, 37, 99, 235)
    c.fill_rect(cx - 7, cy + 14 + leg, 5, 4, 239, 68, 68) # Botas rojas
    c.fill_rect(cx + 2, cy + 14 - leg, 5, 4, 239, 68, 68)
    # Cabeza
    c.fill_rect(cx - 7, cy - 16 + bob, 14, 12, 239, 68, 68)
    # Ojos blancos triangulares clasicos
    c.fill_rect(cx - 5, cy - 13 + bob, 4, 4, 255, 255, 255)
    c.fill_rect(cx + 1, cy - 13 + bob, 4, 4, 255, 255, 255)
    c.fill_rect(cx - 6, cy - 14 + bob, 1, 6, 15, 23, 42)
    c.fill_rect(cx + 5, cy - 14 + bob, 1, 6, 15, 23, 42)
    # Brazos / Telarana
    if row == 2: # Alerta: dispara telarana
        c.fill_rect(cx + 7, cy - 6 + bob, 12, 2, 241, 245, 249)
        c.fill_rect(cx + 18, cy - 10 + bob, 6, 10, 241, 245, 249)
    elif row == 3: # Victoria: salto mortal
        c.fill_rect(cx - 10, cy - 12 + bob, 4, 8, 239, 68, 68)
        c.fill_rect(cx + 6, cy - 12 + bob, 4, 8, 239, 68, 68)


def render_dev_avatar(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    if row == 4: # FOCUS: programando en laptop
        c.fill_rect(cx - 8, cy - 6, 16, 14, 30, 41, 59) # Hoodie
        c.fill_rect(cx - 7, cy - 18, 14, 12, 224, 172, 105) # Cabeza
        c.fill_rect(cx - 8, cy - 20, 16, 5, 69, 26, 3) # Cabello castano
        c.fill_rect(cx - 9, cy - 16, 3, 7, 6, 182, 212) # Audifonos cian
        c.fill_rect(cx + 6, cy - 16, 3, 7, 6, 182, 212)
        # Laptop plateada
        c.fill_rect(cx - 10, cy + 2, 20, 10, 203, 213, 225)
        c.fill_rect(cx - 8, cy + 4, 16, 6, 15, 23, 42)
        c.fill_rect(cx - 6, cy + 6, 6, 2, 52, 211, 153) # Codigo verde
        return

    if row == 5: # SLEEP
        c.fill_rect(cx - 10, cy - 2, 20, 16, 30, 41, 59) # Acostado sobre mesa
        c.fill_rect(cx - 6, cy - 10, 12, 10, 224, 172, 105)
        c.fill_rect(cx - 6, cy - 12, 12, 4, 69, 26, 3)
        c.draw_zz_particles(cx, cy, frame)
        return

    # Sudadera Navy
    c.fill_rect(cx - 8, cy - 6 + bob, 16, 14, 30, 41, 59)
    # Piernas jeans oscuros
    leg = (2 if frame % 2 == 0 else -2) if row == 1 else 0
    c.fill_rect(cx - 6, cy + 8 + leg, 5, 10, 63, 63, 70)
    c.fill_rect(cx + 1, cy + 8 - leg, 5, 10, 63, 63, 70)
    # Zapatillas blancas
    c.fill_rect(cx - 7, cy + 16 + leg, 6, 3, 248, 250, 252)
    c.fill_rect(cx + 1, cy + 16 - leg, 6, 3, 248, 250, 252)
    # Cabeza y cabello
    c.fill_rect(cx - 7, cy - 18 + bob, 14, 12, 224, 172, 105)
    c.fill_rect(cx - 8, cy - 21 + bob, 16, 5, 69, 26, 3)
    # Audifonos Cian
    c.fill_rect(cx - 9, cy - 16 + bob, 3, 8, 6, 182, 212)
    c.fill_rect(cx + 6, cy - 16 + bob, 3, 8, 6, 182, 212)
    c.fill_rect(cx - 8, cy - 22 + bob, 16, 2, 6, 182, 212)
    # Ojos
    c.fill_rect(cx - 4, cy - 14 + bob, 2, 2, 15, 23, 42)
    c.fill_rect(cx + 2, cy - 14 + bob, 2, 2, 15, 23, 42)
    # Alerta o Victoria
    if row == 2: # Alerta: taza de cafe derramandose
        c.fill_rect(cx + 8, cy - 2 + bob, 6, 8, 245, 158, 11)
        c.fill_rect(cx + 10, cy - 8 + bob, 3, 4, 180, 83, 9) # Humo caliente
    elif row == 3: # Victoria: brazos alzados
        c.fill_rect(cx - 11, cy - 14 + bob, 3, 9, 30, 41, 59)
        c.fill_rect(cx + 8, cy - 14 + bob, 3, 9, 30, 41, 59)


def render_ghost_dev(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 36
    bob = int(-2.5 * ((frame % 4) - 1.5))
    if row != 5:
        c.draw_shadow(cx, cy + 4)

    color_sheet = (241, 245, 249)
    eye_color = (56, 189, 248)
    if row == 2: # Alerta: rojo titilante
        color_sheet = (248, 113, 113) if frame % 2 == 0 else (239, 68, 68)
        eye_color = (255, 255, 255)

    if row == 5: # SLEEP: bola fantasmal descansando
        c.draw_ellipse(cx, cy + 6, 12, 10, *color_sheet)
        c.fill_rect(cx - 4, cy + 4, 3, 2, 15, 23, 42)
        c.fill_rect(cx + 2, cy + 4, 3, 2, 15, 23, 42)
        c.draw_zz_particles(cx, cy, frame)
        return

    # Cuerpo de sabana flotante
    c.draw_ellipse(cx, cy - 8 + bob, 13, 14, *color_sheet)
    c.fill_rect(cx - 13, cy - 8 + bob, 26, 18, *color_sheet)
    # Puntas onduladas de fantasma
    wave = frame % 3
    for w in range(4):
        c.fill_rect(cx - 12 + w * 6 + wave, cy + 10 + bob, 4, 5, *color_sheet)
    # Ojos espectrales
    c.fill_rect(cx - 6, cy - 10 + bob, 4, 5, *eye_color)
    c.fill_rect(cx + 2, cy - 10 + bob, 4, 5, *eye_color)
    # Mini laptop flotante
    laptop_y = cy + 2 + bob
    c.fill_rect(cx - 8, laptop_y, 16, 7, 71, 85, 105)
    c.fill_rect(cx - 6, laptop_y - 6, 12, 6, 15, 23, 42)
    # Pantalla de matrix con codigo verde
    c.fill_rect(cx - 5, laptop_y - 5, 10, 4, 34, 197, 94)


def render_football_10(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    if row == 4: # FOCUS: sentado en balon estudiando tactica
        c.fill_rect(cx - 8, cy - 4, 16, 12, 56, 189, 248) # Camiseta
        c.draw_ellipse(cx, cy + 12, 8, 8, 255, 255, 255) # Balon
        c.fill_rect(cx - 2, cy + 10, 4, 4, 15, 23, 42)
        # Pizarra de tactica
        c.fill_rect(cx - 9, cy, 18, 10, 22, 101, 52)
        c.fill_rect(cx - 7, cy + 2, 14, 6, 255, 255, 255)
        return

    if row == 5: # SLEEP: durmiendo sobre el balon
        c.draw_ellipse(cx + 8, cy + 6, 8, 8, 255, 255, 255) # Balon
        c.fill_rect(cx - 10, cy + 2, 18, 12, 56, 189, 248)
        c.fill_rect(cx - 4, cy - 4, 10, 8, 224, 172, 105)
        c.draw_zz_particles(cx, cy, frame)
        return

    # Camiseta Albiceleste a rayas
    c.fill_rect(cx - 7, cy - 6 + bob, 14, 13, 255, 255, 255)
    c.fill_rect(cx - 5, cy - 6 + bob, 3, 13, 56, 189, 248) # Raya celeste
    c.fill_rect(cx + 2, cy - 6 + bob, 3, 13, 56, 189, 248)
    # Numero 10 dorado en espalda/pecho
    c.fill_rect(cx - 2, cy - 2 + bob, 4, 4, 245, 158, 11)
    # Shorts negros
    c.fill_rect(cx - 6, cy + 7 + bob, 12, 6, 15, 23, 42)
    # Piernas
    leg = (2 if frame % 2 == 0 else -2) if row == 1 else 0
    c.fill_rect(cx - 5, cy + 13 + leg, 4, 6, 224, 172, 105)
    c.fill_rect(cx + 1, cy + 13 - leg, 4, 6, 224, 172, 105)
    # Botines
    c.fill_rect(cx - 6, cy + 18 + leg, 5, 3, 234, 179, 8)
    c.fill_rect(cx + 1, cy + 18 - leg, 5, 3, 234, 179, 8)
    # Cabeza, pelo y barba
    c.fill_rect(cx - 6, cy - 17 + bob, 12, 11, 224, 172, 105)
    c.fill_rect(cx - 7, cy - 20 + bob, 14, 5, 69, 26, 3) # Pelo
    c.fill_rect(cx - 5, cy - 10 + bob, 10, 4, 69, 26, 3) # Barba
    # Balon de futbol
    ball_x = cx + 8
    ball_y = cy + 12
    if row == 2: # Alerta: dominadas rapidas
        ball_y = cy + (4 if frame % 2 == 0 else -6)
        ball_x = cx + 4
    c.draw_ellipse(ball_x, ball_y, 5, 5, 255, 255, 255)
    c.fill_rect(ball_x - 1, ball_y - 1, 3, 3, 15, 23, 42)

    if row == 3: # Victoria: senalando al cielo con ambos indices
        c.fill_rect(cx - 9, cy - 18 + bob, 3, 12, 224, 172, 105)
        c.fill_rect(cx + 6, cy - 18 + bob, 3, 12, 224, 172, 105)
        c.fill_rect(cx - 8, cy - 22 + bob, 2, 4, 224, 172, 105)
        c.fill_rect(cx + 6, cy - 22 + bob, 2, 4, 224, 172, 105)


def render_capybara(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    if row == 3: # VICTORY: jacuzzi de madera estilo onsen
        c.fill_rect(cx - 14, cy + 2, 28, 16, 120, 53, 15) # Tina de madera
        c.fill_rect(cx - 12, cy + 4, 24, 4, 56, 189, 248) # Agua termal
        # Cabeza de capibara asomada
        c.fill_rect(cx - 8, cy - 6, 16, 10, 133, 77, 14)
        c.fill_rect(cx - 3, cy - 12, 6, 6, 249, 115, 22) # Naranja en cabeza
        c.fill_rect(cx - 1, cy - 14, 2, 2, 22, 101, 52) # Hoja
        return

    if row == 5: # SLEEP: plano en el suelo
        c.fill_rect(cx - 14, cy + 8, 28, 10, 133, 77, 14)
        c.fill_rect(cx + 10, cy + 6, 10, 8, 202, 138, 4)
        c.fill_rect(cx - 12, cy + 12, 6, 6, 249, 115, 22) # Naranja a un lado
        c.draw_zz_particles(cx, cy, frame)
        return

    # Cuerpo rechoncho cuadrado
    c.fill_rect(cx - 14, cy - 4 + bob, 28, 18, 133, 77, 14)
    # Patas cortas
    leg = (2 if frame % 2 == 0 else -2) if row == 1 else 0
    c.fill_rect(cx - 12, cy + 14 + leg, 5, 6, 113, 63, 18)
    c.fill_rect(cx + 7, cy + 14 - leg, 5, 6, 113, 63, 18)
    # Cabeza y hocico tan caracteristico
    c.fill_rect(cx + 6, cy - 10 + bob, 14, 14, 133, 77, 14)
    c.fill_rect(cx + 12, cy - 6 + bob, 10, 10, 202, 138, 4) # Hocico
    c.fill_rect(cx + 18, cy - 4 + bob, 3, 3, 28, 25, 23) # Nariz
    c.fill_rect(cx + 10, cy - 8 + bob, 2, 2, 28, 25, 23) # Ojo tranquilo
    # Oreja pequena
    c.fill_rect(cx + 5, cy - 12 + bob, 3, 3, 113, 63, 18)

    # Naranja en la cabeza
    orange_y = cy - 17 + bob
    if row == 2: # Alerta: la naranja se cae
        orange_y = cy + (4 if frame % 2 == 0 else -2)
    c.draw_ellipse(cx + 12, orange_y, 4, 4, 249, 115, 22)
    c.fill_rect(cx + 12, orange_y - 5, 2, 2, 22, 101, 52) # Hojita verde


def render_cyber_ninja(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    if row == 4: # FOCUS: meditacion en loto con runas flotantes
        c.fill_rect(cx - 8, cy - 4, 16, 12, 15, 23, 42) # Traje
        c.fill_rect(cx - 10, cy + 8, 20, 6, 30, 41, 59) # Piernas cruzadas
        c.fill_rect(cx - 6, cy - 16, 12, 12, 15, 23, 42)
        c.fill_rect(cx - 4, cy - 12, 8, 3, 6, 182, 212) # Visor cian
        # Orbes neon de energia
        c.draw_ellipse(cx - 12, cy - 6, 2, 2, 192, 132, 252)
        c.draw_ellipse(cx + 12, cy - 6, 2, 2, 192, 132, 252)
        return

    if row == 5: # SLEEP
        c.fill_rect(cx - 8, cy - 2, 16, 16, 15, 23, 42)
        c.fill_rect(cx - 6, cy - 12, 12, 10, 15, 23, 42)
        c.fill_rect(cx - 4, cy - 8, 8, 1, 30, 41, 59) # Visor apagado
        c.draw_zz_particles(cx, cy, frame)
        return

    # Traje negro sigilo con lineas neon
    c.fill_rect(cx - 6, cy - 6 + bob, 12, 13, 15, 23, 42)
    c.fill_rect(cx - 2, cy - 4 + bob, 4, 11, 6, 182, 212) # Linea cian central
    # Bufanda cyber flotante violeta
    c.fill_rect(cx - 12, cy - 7 + bob, 6, 4, 192, 132, 252)
    # Piernas
    leg = (3 if frame % 2 == 0 else -3) if row == 1 else 0
    c.fill_rect(cx - 6, cy + 7 + leg, 4, 11, 30, 41, 59)
    c.fill_rect(cx + 2, cy + 7 - leg, 4, 11, 30, 41, 59)
    # Mascara y visor
    c.fill_rect(cx - 6, cy - 17 + bob, 12, 11, 15, 23, 42)
    c.fill_rect(cx - 5, cy - 13 + bob, 10, 3, 6, 182, 212) # Visor cian brillante

    # Katana de luz
    katana_y = cy - 20 + bob
    if row == 2: # Alerta: desenfunda katana brillante
        c.fill_rect(cx + 8, katana_y, 3, 26, 6, 182, 212)
        c.fill_rect(cx + 9, katana_y, 1, 26, 255, 255, 255) # Nucleo blanco
    elif row == 3: # Victoria: pose ninja con humo
        c.fill_rect(cx - 12, cy + 4, 6, 6, 147, 197, 253, 120) # Humo
        c.fill_rect(cx + 8, cy + 4, 6, 6, 147, 197, 253, 120)


def render_fantasy_wizard(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    c.draw_shadow(cx, cy)
    bob = -1 if (frame % 2 == 1) else 0

    if row == 4: # FOCUS: grimorio flotante
        c.fill_rect(cx - 8, cy - 6, 16, 18, 124, 58, 237) # Tunica
        c.fill_rect(cx - 8, cy - 24, 16, 10, 76, 29, 149) # Sombrero
        # Grimorio abierto flotante
        c.fill_rect(cx - 9, cy - 2, 18, 10, 185, 28, 28)
        c.fill_rect(cx - 7, cy, 14, 6, 254, 240, 138)
        c.draw_ellipse(cx, cy - 4, 2, 2, 34, 211, 238) # Chispa magica
        return

    if row == 5: # SLEEP
        c.fill_rect(cx - 10, cy - 2, 20, 18, 124, 58, 237)
        c.fill_rect(cx - 6, cy - 14, 12, 12, 76, 29, 149) # Sombrero caido
        c.draw_zz_particles(cx, cy, frame)
        return

    # Tunica Violeta
    c.fill_rect(cx - 8, cy - 6 + bob, 16, 20, 124, 58, 237)
    c.fill_rect(cx - 10, cy + 8 + bob, 20, 6, 91, 33, 182) # Borde inferior
    # Cabeza y barba blanca
    c.fill_rect(cx - 6, cy - 16 + bob, 12, 10, 254, 243, 199)
    c.fill_rect(cx - 5, cy - 10 + bob, 10, 10, 241, 245, 249) # Barba
    # Sombrero de punta clasico con hebilla de oro
    c.fill_rect(cx - 10, cy - 18 + bob, 20, 3, 76, 29, 149)
    c.fill_rect(cx - 6, cy - 25 + bob, 12, 7, 76, 29, 149)
    c.fill_rect(cx - 3, cy - 30 + bob, 6, 5, 76, 29, 149)
    c.fill_rect(cx - 2, cy - 20 + bob, 4, 3, 245, 158, 11) # Hebilla dorada
    # Baculo magico con cristal
    staff_y = cy - 24 + bob
    c.fill_rect(cx + 8, staff_y + 4, 3, 34, 146, 64, 14)
    # Cristal brillante
    c.draw_ellipse(cx + 9, staff_y + 2, 4, 4, 34, 211, 238)
    if row == 3: # Victoria: fuegos artificiales magicos
        c.draw_ellipse(cx + 9, staff_y - 6, 3, 3, 245, 158, 11)
        c.draw_ellipse(cx + 16, staff_y - 2, 2, 2, 236, 72, 153)


def render_game_slime(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    squish = 2 if (frame % 2 == 1) else 0
    if row != 5:
        c.draw_shadow(cx, cy)

    color_body = (34, 197, 94)
    color_high = (134, 239, 172)
    if row == 2: # Alerta: slime rojo furioso
        color_body = (239, 68, 68)
        color_high = (252, 165, 165)

    if row == 3: # VICTORY: dividido en 3 mini-slimes felices
        for sx, sy in [(-12, 4), (0, -2), (12, 4)]:
            c.draw_ellipse(cx + sx, cy + sy, 6, 5, 34, 197, 94)
            c.fill_rect(cx + sx - 2, cy + sy - 2, 1, 2, 6, 78, 59)
            c.fill_rect(cx + sx + 1, cy + sy - 2, 1, 2, 6, 78, 59)
        return

    if row == 4: # FOCUS: slime cubico con gafas
        c.fill_rect(cx - 11, cy - 6, 22, 18, *color_body)
        c.fill_rect(cx - 7, cy - 2, 5, 4, 15, 23, 42) # Gafas
        c.fill_rect(cx + 2, cy - 2, 5, 4, 15, 23, 42)
        c.fill_rect(cx - 2, cy, 4, 1, 15, 23, 42)
        return

    if row == 5: # SLEEP: charco de gelatina plana
        c.draw_ellipse(cx, cy + 10, 16, 5, *color_body)
        c.fill_rect(cx - 4, cy + 8, 3, 1, 6, 78, 59)
        c.fill_rect(cx + 2, cy + 8, 3, 1, 6, 78, 59)
        c.draw_zz_particles(cx, cy, frame)
        return

    # Cuerpo de slime gelatinoso con rebote
    rx = 14 + squish
    ry = 12 - squish
    c.draw_ellipse(cx, cy + 4 - squish, rx, ry, *color_body)
    # Brillo superior
    c.draw_ellipse(cx - 4, cy - 2 - squish, 3, 3, *color_high)
    # Ojos tiernos
    c.fill_rect(cx - 5, cy + 2 - squish, 3, 4, 6, 78, 59)
    c.fill_rect(cx + 3, cy + 2 - squish, 3, 4, 6, 78, 59)
    c.fill_rect(cx - 4, cy + 3 - squish, 1, 1, 255, 255, 255)
    c.fill_rect(cx + 4, cy + 3 - squish, 1, 1, 255, 255, 255)


def render_astro_lost(c, fx, fy, frame, row):
    cx = fx + 32
    cy = fy + 38
    bob = int(-2.0 * ((frame % 4) - 1.5))
    c.draw_shadow(cx, cy + 2)

    if row == 4: # FOCUS: examinando tableta espacial
        c.fill_rect(cx - 8, cy - 6, 16, 16, 248, 250, 252) # Traje
        c.fill_rect(cx - 7, cy - 18, 14, 12, 248, 250, 252) # Casco
        c.fill_rect(cx - 5, cy - 15, 10, 6, 245, 158, 11) # Visor oro
        # Tableta
        c.fill_rect(cx - 8, cy + 2, 16, 8, 30, 41, 59)
        c.fill_rect(cx - 6, cy + 3, 12, 6, 56, 189, 248) # Pantalla azul
        return

    if row == 5: # SLEEP: flotando en gravedad cero
        c.fill_rect(cx - 9, cy - 4, 18, 14, 248, 250, 252)
        c.fill_rect(cx - 7, cy - 14, 14, 10, 248, 250, 252)
        c.fill_rect(cx - 5, cy - 12, 10, 4, 245, 158, 11)
        c.draw_zz_particles(cx, cy, frame)
        return

    # Mochila de oxigeno trasera
    c.fill_rect(cx - 12, cy - 10 + bob, 6, 18, 100, 116, 139)
    # Traje espacial blanco
    c.fill_rect(cx - 7, cy - 6 + bob, 14, 14, 248, 250, 252)
    # Insignias rojo / azul
    c.fill_rect(cx - 4, cy - 2 + bob, 3, 2, 239, 68, 68)
    c.fill_rect(cx + 1, cy - 2 + bob, 3, 2, 59, 130, 246)
    # Piernas acolchadas
    leg = (2 if frame % 2 == 0 else -2) if row == 1 else 0
    c.fill_rect(cx - 6, cy + 8 + leg, 5, 10, 248, 250, 252)
    c.fill_rect(cx + 1, cy + 8 - leg, 5, 10, 248, 250, 252)
    c.fill_rect(cx - 7, cy + 15 + leg, 6, 4, 148, 163, 184) # Botas grises
    c.fill_rect(cx + 1, cy + 15 - leg, 6, 4, 148, 163, 184)
    # Casco esferico blanco
    c.draw_ellipse(cx, cy - 14 + bob, 8, 8, 248, 250, 252)
    # Visor reflectante dorado
    c.draw_ellipse(cx + 1, cy - 13 + bob, 6, 5, 245, 158, 11)
    c.fill_rect(cx + 1, cy - 15 + bob, 3, 2, 254, 240, 138) # Brillo visor

    # Alerta o Victoria
    if row == 2: # Alerta: propulsores encendidos con luces rojas
        c.fill_rect(cx - 10, cy + 8 + bob, 4, 6, 56, 189, 248) # Fuego jetpack
        c.fill_rect(cx - 1, cy - 24 + bob, 3, 3, 239, 68, 68) # Luz roja antena
    elif row == 3: # Victoria: planta bandera del proyecto
        c.fill_rect(cx + 9, cy - 18 + bob, 2, 32, 203, 213, 225)
        c.fill_rect(cx + 11, cy - 18 + bob, 12, 8, 239, 68, 68)


# ==============================================================================
# DEFINICION DEL CATALOGO DE 10 SKINS
# ==============================================================================

SKINS_CATALOG = [
    {
        "id": "spartan",
        "name": "Leónidas (El Espartano de 300)",
        "render": render_spartan,
        "personalityPrompt": "Notificaciones épicas, marciales y directas. Enfocado en la disciplina de estudio y victoria en código.",
        "dialogues": {
            "alert": "¡A las armas! Tienes 1 hora para tu entrega o el semestre caerá.",
            "victory": "¡Ahú, Ahú! Pull Request mezclado con honor espartano.",
            "focus": "¡Posiciones de falange! 25 minutos de estudio inquebrantable.",
            "break": "Descanso merecido, guerrero. Bebe agua y afila tu lanza.",
            "sleep": "Recuperando fuerzas para la proxima batalla academica..."
        }
    },
    {
        "id": "spiderman",
        "name": "Spider-Hero (El Trepamuros)",
        "render": render_spiderman,
        "personalityPrompt": "Relajado, juvenil e irónico. Monitorea commits y tareas con sentido arácnido.",
        "dialogues": {
            "alert": "Oye, mi sentido arácnido dice que ese deadline está cerca. ¿Nos movemos o qué?",
            "victory": "¡Boom! Ese PR quedó atrapado en mi telaraña sin un solo bug.",
            "focus": "Modo concentración arácnido. Nada de redes sociales por 25 minutos.",
            "break": "Tiempo fuera, amigo. Suelta el teclado antes de que se te peguen los dedos.",
            "sleep": "Si me necesitas... estaré colgando de mi telaraña descansando..."
        }
    },
    {
        "id": "dev-avatar",
        "name": "Mi Avatar Pixelado (Tú Mismo)",
        "render": render_dev_avatar,
        "personalityPrompt": "Identificable, estresado por entregas pero apasionado por el código y la música.",
        "dialogues": {
            "alert": "¡No puede ser! ¿Esa entrega es para hoy? Dame otro café ya mismo.",
            "victory": "¡Uff, menos mal que pusimos ese commit! Una victoria más para el portafolio.",
            "focus": "Audífonos puestos, terminal abierta. Modo foco total.",
            "break": "Pausa para estirar la espalda y rellenar la taza de café.",
            "sleep": "Me quedé dormido sobre el teclado... zZ..."
        }
    },
    {
        "id": "ghost-dev",
        "name": "El Dev Fantasma (Especial de Código)",
        "render": render_ghost_dev,
        "personalityPrompt": "Nerd, espectral y divertido. Conoce todos los bugs del más allá.",
        "dialogues": {
            "alert": "He visto muchos bugs en el más allá, pero esta entrega de verdad te va a perseguir.",
            "victory": "¡Magia espectral! El pipeline pasó en verde en la primera ejecución.",
            "focus": "Invocando código limpio desde las profundidades del kernel.",
            "break": "Flotando un rato fuera del plano material para despejar la memoria RAM.",
            "sleep": "Desvaneciéndome en la niebla espectral hasta el próximo commit..."
        }
    },
    {
        "id": "football-10",
        "name": "El Futbolista 10 (La Pulga)",
        "render": render_football_10,
        "personalityPrompt": "Tranquilo, humilde, motivador y letal en el último minuto.",
        "dialogues": {
            "alert": "Falta poco para que termine el partido. Metámosle este commit y nos llevamos los tres puntos.",
            "victory": "¡Qué golazo metimos! Dedicado al cielo por este sprint completado.",
            "focus": "Cabeza fría y a jugar simple. 25 minutos de concentración táctica.",
            "break": "Minuto de hidratación. Caminá un poco que el partido sigue.",
            "sleep": "Descansando los gemelos para la final del semestre..."
        }
    },
    {
        "id": "capybara",
        "name": "Capibara Chill (El Favorito de Internet)",
        "render": render_capybara,
        "personalityPrompt": "Ultra-relajado, zen, con la sabiduría infinita de internet.",
        "dialogues": {
            "alert": "Amigo, no te estreses, pero hay que entregar eso. Todo va a salir bien, solo dale push.",
            "victory": "Muy bien hecho. Ahora me voy a dar un baño calientito en el jacuzzi.",
            "focus": "La calma lo resuelve todo. Respira profundo y programa despacio.",
            "break": "Momento de contemplar la nada y comer una fruta fresca.",
            "sleep": "Dormir es sagrado. Aquí me quedo tranquilo como capibara al sol..."
        }
    },
    {
        "id": "cyber-ninja",
        "name": "Cyber Ninja (Acción y Sigilo)",
        "render": render_cyber_ninja,
        "personalityPrompt": "Rápido, enfocado y sigiloso. Ejecuta tareas sin dejar huellas de errores.",
        "dialogues": {
            "alert": "El objetivo de tu semestre está a la vista. Ejecuta el ataque sin dejar rastro de bugs.",
            "victory": "Misión cumplida en las sombras. El repositorio está a salvo.",
            "focus": "Silencio absoluto. Katana envainada y código certero.",
            "break": "Retirada táctica temporal. Respira y vigila el entorno.",
            "sleep": "Modo camuflaje óptico activado. Vigilando en modo reposo..."
        }
    },
    {
        "id": "fantasy-wizard",
        "name": "Mago de Fantasía (El Hechicero)",
        "render": render_fantasy_wizard,
        "personalityPrompt": "Sabio, misterioso y un tanto dramático con runas y pergaminos.",
        "dialogues": {
            "alert": "Las runas del semestre auguran peligro... ¡Haz esa entrega antes de que el tiempo se desvanezca!",
            "victory": "¡Por los fuegos de Arcania! El hechizo de compilación ha triunfado.",
            "focus": "Canalizando maná de concentración sobre el pergamino digital.",
            "break": "El maná requiere reposo. Cierra los grimorios unos minutos.",
            "sleep": "Soñando con constelaciones y bibliotecas antiguas..."
        }
    },
    {
        "id": "game-slime",
        "name": "Slime de Videojuego (La Mascota Rebotadora)",
        "render": render_game_slime,
        "personalityPrompt": "Tierno, burbujeante, animado y elástico ante cualquier dificultad.",
        "dialogues": {
            "alert": "*Plop, plop* ¡Vamos! ¡Tú puedes con esa tarea! ¡Mucho ánimo!",
            "victory": "*¡Boing!* ¡Subimos de nivel! ¡Tres slimes felices rebotando por ti!",
            "focus": "*Squish* Me vuelvo un cubito concentrado para acompañarte a estudiar.",
            "break": "*Plop* ¡Hora de estirarse como chicle y tomar agüita!",
            "sleep": "*Squelch* Me derrito en un charquito suavecito a descansar..."
        }
    },
    {
        "id": "astro-lost",
        "name": "Astronauta Perdido (Explorador Espacial)",
        "render": render_astro_lost,
        "personalityPrompt": "Tecnológico, curioso y en comunicación constante con la base orbital.",
        "dialogues": {
            "alert": "Houston, tenemos un problema si no entregas eso pronto... ¡Iniciemos la secuencia de push!",
            "victory": "¡Alunizaje exitoso! Bandera plantada en la rama principal del repositorio.",
            "focus": "Protocolo de navegación orbital activo. Cero interferencias por 25 minutos.",
            "break": "Saliendo a caminata espacial de descompresión.",
            "sleep": "Soporte vital en standby. Flotando en gravedad cero..."
        }
    }
]


def main():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "public", "skins"))
    os.makedirs(base_dir, exist_ok=True)

    print(f"[MySkin] Generando catalogo de {len(SKINS_CATALOG)} skins en: {base_dir}")

    for skin in SKINS_CATALOG:
        skin_id = skin["id"]
        skin_dir = os.path.join(base_dir, skin_id)
        os.makedirs(skin_dir, exist_ok=True)

        # 1. Crear manifest.json con los 6 estados oficiales
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
                "IDLE": {
                    "row": 0,
                    "frames": 4,
                    "fps": 6,
                    "loop": True
                },
                "WALK": {
                    "row": 1,
                    "frames": 6,
                    "fps": 10,
                    "loop": True
                },
                "ALERT_SEMESTRE": {
                    "row": 2,
                    "frames": 4,
                    "fps": 8,
                    "loop": True
                },
                "VICTORY_GITHUB": {
                    "row": 3,
                    "frames": 6,
                    "fps": 12,
                    "loop": False,
                    "nextState": "IDLE"
                },
                "FOCUS": {
                    "row": 4,
                    "frames": 4,
                    "fps": 6,
                    "loop": True
                },
                "SLEEP": {
                    "row": 5,
                    "frames": 4,
                    "fps": 4,
                    "loop": True
                }
            }
        }

        manifest_path = os.path.join(skin_dir, "manifest.json")
        with open(manifest_path, "w", encoding="utf-8") as f:
            json.dump(manifest, f, indent=2, ensure_ascii=False)

        # 2. Generar spritesheet.png
        canvas = Canvas(WIDTH, HEIGHT)
        render_func = skin["render"]

        # Filas: 0=IDLE, 1=WALK, 2=ALERT, 3=VICTORY, 4=FOCUS, 5=SLEEP
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

        print(f" -> Skin '{skin_id}' generado: {skin['name']} ({len(png_data)} bytes)")

    print("[MySkin] Todos los 10 skins fueron generados satisfactoriamente.")

if __name__ == "__main__":
    main()
