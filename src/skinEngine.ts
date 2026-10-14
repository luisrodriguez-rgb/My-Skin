/**
 * Skin Engine & Finite State Machine (FSM)
 * Maneja skins modulares, generación procedural de frames pixel-art y globos de notificación interactivos.
 */

export type CharacterState = "idle" | "walk" | "alert" | "celebrate";

export interface SpeechBubble {
  title: string;
  message: string;
  actionText?: string;
  source: "semester" | "github" | "system";
  expiresAt?: number;
}

export interface SkinDefinition {
  id: string;
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  visorColor: string;
  personality: string;
  bubbleTheme: {
    bg: string;
    border: string;
    text: string;
    accent: string;
  };
}

export const SKINS: Record<string, SkinDefinition> = {
  spartan: {
    id: "spartan",
    name: "Espartano 300",
    primaryColor: "#c2410c", // Capa roja espartana
    secondaryColor: "#78350f", // Cuero bronce
    accentColor: "#f59e0b", // Cresta y casco dorado
    visorColor: "#0f172a", // Hendidura casco oscuro
    personality: "¡Por Esparta! No te rindas ante esa entrega, guerrero.",
    bubbleTheme: {
      bg: "#1c1917",
      border: "#d97706",
      text: "#fef3c7",
      accent: "#f59e0b",
    },
  },
  cyberpunk: {
    id: "cyberpunk",
    name: "Cyber Agent",
    primaryColor: "#0284c7", // Traje táctico neon
    secondaryColor: "#0f172a", // Armadura oscura
    accentColor: "#06b6d4", // Luces cian
    visorColor: "#38bdf8", // Visor holográfico
    personality: "Enlace neural activo. Monitoreando builds y deadlines.",
    bubbleTheme: {
      bg: "#090d16",
      border: "#06b6d4",
      text: "#e0f2fe",
      accent: "#38bdf8",
    },
  },
  "retro-bot": {
    id: "retro-bot",
    name: "Retro Bot",
    primaryColor: "#059669", // Verde terminal CRT
    secondaryColor: "#064e3b", // Chasis metal
    accentColor: "#34d399", // LED antenas
    visorColor: "#a7f3d0", // Pantalla monocromática
    personality: "Bip-bup. Cola de tareas verificada: 0 advertencias.",
    bubbleTheme: {
      bg: "#062e24",
      border: "#10b981",
      text: "#ecfdf5",
      accent: "#34d399",
    },
  },
};

export class CharacterRenderer {
  private skin: SkinDefinition;
  public state: CharacterState = "idle";
  private currentFrame = 0;
  private frameTimer = 0;
  private fps = 6; // Ritmo de animación retro en pixel-art
  public bubble: SpeechBubble | null = null;
  public isHovered = false;

  constructor(initialSkinId: string = "spartan") {
    this.skin = SKINS[initialSkinId] || SKINS.spartan;
  }

  public setSkin(skinId: string) {
    if (SKINS[skinId]) {
      this.skin = SKINS[skinId];
    }
  }

  public getSkin(): SkinDefinition {
    return this.skin;
  }

  public setState(newState: CharacterState) {
    if (this.state !== newState) {
      this.state = newState;
      this.currentFrame = 0;
      this.frameTimer = 0;
    }
  }

  public setBubble(bubble: SpeechBubble | null) {
    this.bubble = bubble;
  }

  public update(deltaMs: number) {
    this.frameTimer += deltaMs;
    const frameInterval = 1000 / this.fps;

    if (this.frameTimer >= frameInterval) {
      this.frameTimer = 0;
      this.currentFrame = (this.currentFrame + 1) % 4; // 4 frames por animación
    }

    // Auto-expirar globos de diálogo si tienen tiempo límite
    if (this.bubble?.expiresAt && Date.now() > this.bubble.expiresAt) {
      this.bubble = null;
      if (this.state === "alert" || this.state === "celebrate") {
        this.setState("idle");
      }
    }
  }

  /**
   * Dibuja el personaje en pixel-art sobre el Canvas
   * Cada frame se compone de bloques de píxeles sólidos que alimentan el Alpha Hit-Test.
   */
  public draw(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.clearRect(0, 0, width, height);

    // 1. Dibujar Globo de diálogo si existe (aparece en la parte superior del canvas)
    if (this.bubble) {
      this.drawSpeechBubble(ctx, this.bubble, width);
    }

    // 2. Coordenadas base del personaje (centrado en la parte inferior)
    const baseCX = Math.floor(width / 2);
    const baseCY = Math.floor(height - 75);
    const scale = 4; // Cada píxel lógico mide 4x4 píxeles reales

    // Offset de respiración/salto según el frame
    let bobY = 0;
    let legOffset = 0;

    switch (this.state) {
      case "idle":
        // Respiración sutil: sube y baja 1 pixel lógico en frame 1 y 2
        bobY = this.currentFrame === 1 || this.currentFrame === 2 ? -scale : 0;
        break;
      case "walk":
        bobY = this.currentFrame % 2 === 0 ? 0 : -scale;
        legOffset = (this.currentFrame % 2 === 0 ? 1 : -1) * scale;
        break;
      case "alert":
        // Parpadeo / sacudida de alerta
        bobY = (Math.sin(Date.now() / 80) * 1.5) * scale;
        break;
      case "celebrate":
        // Salto de victoria
        bobY = (this.currentFrame === 1 || this.currentFrame === 2 ? -3 : 0) * scale;
        break;
    }

    // Sombra en el suelo (semitransparente pero sólida para arrastre)
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.beginPath();
    ctx.ellipse(baseCX, baseCY + 36, 32, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Dibujamos el personaje por capas Pixel-Art
    this.drawPixelCharacter(ctx, baseCX, baseCY + bobY, scale, legOffset);

    // Decoración extra según estado
    if (this.state === "alert") {
      this.drawAlertIcon(ctx, baseCX, baseCY + bobY - 48);
    } else if (this.state === "celebrate") {
      this.drawConfetti(ctx, baseCX, baseCY + bobY - 40);
    }
  }

  /**
   * Renderiza el sprite en cuadrícula de píxeles
   */
  private drawPixelCharacter(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    s: number,
    legOffset: number
  ) {
    const p = this.skin.primaryColor;
    const sc = this.skin.secondaryColor;
    const ac = this.skin.accentColor;
    const vc = this.skin.visorColor;

    // Ayudante para dibujar bloques alineados al píxel
    const block = (x: number, y: number, w: number, h: number, color: string) => {
      ctx.fillStyle = color;
      ctx.fillRect(Math.floor(cx + x * s), Math.floor(cy + y * s), w * s, h * s);
    };

    // 1. Capa / Mochila trasera
    block(-7, -4, 14, 12, p);

    // 2. Piernas / Botas
    block(-5, 8 + (legOffset > 0 ? 1 : 0), 4, 6, sc);
    block(1, 8 + (legOffset < 0 ? 1 : 0), 4, 6, sc);

    // 3. Torso / Armadura principal
    block(-6, -2, 12, 10, sc);
    block(-4, 0, 8, 7, p);

    // 4. Cinturón / Detalle
    block(-5, 6, 10, 2, ac);

    // 5. Cabeza / Casco
    block(-7, -13, 14, 11, sc);
    block(-6, -15, 12, 3, ac); // Cresta superior

    // 6. Visor / Ojos
    block(-5, -9, 10, 4, vc);
    // Destello de ojos
    const eyeBlink = this.state === "idle" && this.currentFrame === 3;
    if (!eyeBlink) {
      block(-3, -8, 2, 2, "#ffffff");
      block(1, -8, 2, 2, "#ffffff");
    }

    // 7. Manos / Brazos
    if (this.state === "celebrate") {
      // Brazos alzados en victoria
      block(-9, -10, 3, 7, ac);
      block(6, -10, 3, 7, ac);
    } else if (this.state === "alert") {
      // Manos a la cintura / en guardia
      block(-8, 0, 3, 6, ac);
      block(5, 0, 3, 6, ac);
    } else {
      // Brazos relajados
      block(-8, 1, 3, 6, ac);
      block(5, 1, 3, 6, ac);
    }
  }

  private drawAlertIcon(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(cx, cy, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 13px monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("!", cx, cy);
  }

  private drawConfetti(ctx: CanvasRenderingContext2D, cx: number, cy: number) {
    const colors = ["#facc15", "#38bdf8", "#ec4899", "#22c55e"];
    for (let i = 0; i < 6; i++) {
      const angle = (i * 60 + (this.currentFrame * 30)) * (Math.PI / 180);
      const dist = 22 + (this.currentFrame * 3);
      const x = cx + Math.cos(angle) * dist;
      const y = cy + Math.sin(angle) * dist * 0.7;
      ctx.fillStyle = colors[i % colors.length];
      ctx.fillRect(Math.floor(x), Math.floor(y), 4, 4);
    }
  }

  /**
   * Renderiza el globo de texto tipo Pixel Art con cola apuntando al personaje
   * Los píxeles de este globo son sólidos (alpha 255), por lo que se pueden cliquear
   */
  private drawSpeechBubble(
    ctx: CanvasRenderingContext2D,
    bubble: SpeechBubble,
    canvasWidth: number
  ) {
    const theme = this.skin.bubbleTheme;
    const bubbleX = 14;
    const bubbleY = 12;
    const bubbleW = canvasWidth - 28;
    const bubbleH = 88;

    // Fondo del globo (sólido)
    ctx.fillStyle = theme.bg;
    ctx.fillRect(bubbleX, bubbleY, bubbleW, bubbleH);

    // Borde doble Pixel Art
    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 3;
    ctx.strokeRect(bubbleX + 1.5, bubbleY + 1.5, bubbleW - 3, bubbleH - 3);

    // Esquinas acentuadas estilo retro
    ctx.fillStyle = theme.accent;
    ctx.fillRect(bubbleX, bubbleY, 4, 4);
    ctx.fillRect(bubbleX + bubbleW - 4, bubbleY, 4, 4);
    ctx.fillRect(bubbleX, bubbleY + bubbleH - 4, 4, 4);
    ctx.fillRect(bubbleX + bubbleW - 4, bubbleY + bubbleH - 4, 4, 4);

    // Cola del globo apuntando hacia el personaje
    const tailX = Math.floor(canvasWidth / 2);
    const tailY = bubbleY + bubbleH;
    ctx.fillStyle = theme.bg;
    ctx.beginPath();
    ctx.moveTo(tailX - 10, tailY);
    ctx.lineTo(tailX + 10, tailY);
    ctx.lineTo(tailX, tailY + 14);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tailX - 10, tailY);
    ctx.lineTo(tailX, tailY + 14);
    ctx.lineTo(tailX + 10, tailY);
    ctx.stroke();

    // Contenido del globo
    ctx.fillStyle = theme.accent;
    ctx.font = "bold 11px 'Outfit', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(bubble.title.toUpperCase(), bubbleX + 12, bubbleY + 10);

    // Mensaje de texto (con corte de línea básico)
    ctx.fillStyle = theme.text;
    ctx.font = "11px 'Outfit', sans-serif";
    this.renderWrappedText(
      ctx,
      bubble.message,
      bubbleX + 12,
      bubbleY + 28,
      bubbleW - 24,
      15
    );

    // Botón de acción / descarte en la esquina inferior derecha
    const actionLabel = bubble.actionText || "[ Clic para cerrar ]";
    ctx.fillStyle = theme.accent;
    ctx.font = "600 10px 'Outfit', sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(actionLabel, bubbleX + bubbleW - 12, bubbleY + bubbleH - 18);
  }

  private renderWrappedText(
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ) {
    const words = text.split(" ");
    let line = "";
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const metrics = ctx.measureText(testLine);
      const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + " ";
        currentY += lineHeight;
        if (currentY > y + lineHeight * 2) {
          // Límite a 3 líneas
          ctx.fillText(line.trim() + "...", x, currentY);
          return;
        }
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
  }
}
