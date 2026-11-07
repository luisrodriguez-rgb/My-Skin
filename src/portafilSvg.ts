import type { PetStateName } from "./appState";
import { skinCatalog, type SkinCategory, type SkinItem } from "./skinCatalog";

export type PortafilThemeKey =
  | "ink"
  | "paper"
  | "dark"
  | "light"
  | "sand"
  | "cyberpunk"
  | "neon_cyan"
  | "amber_terminal"
  | "ruby";

export type PortafilSvgVariant = "card" | "divider" | "badge";

export interface PortafilTheme {
  key: PortafilThemeKey;
  name: string;
  character: string;
  pairTheme?: PortafilThemeKey;
  isDark: boolean;
  bg: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  track: string;
}

export const PORTAFIL_THEMES: Record<PortafilThemeKey, PortafilTheme> = {
  ink: {
    key: "ink",
    name: "Tinta",
    character: "Gris carbón, el tema por defecto",
    pairTheme: "paper",
    isDark: true,
    bg: "#111214",
    surface: "#181a1f",
    border: "#2a2e37",
    text: "#f3f4f6",
    muted: "#9ca3af",
    accent: "#c0e798",
    accentSoft: "#233123",
    track: "#232730",
  },
  paper: {
    key: "paper",
    name: "Papel",
    character: "Blanco limpio, tinta oscura",
    pairTheme: "ink",
    isDark: false,
    bg: "#faf8f5",
    surface: "#f0ede6",
    border: "#d6d1c7",
    text: "#18181b",
    muted: "#57534e",
    accent: "#2f6f3e",
    accentSoft: "#ddebd8",
    track: "#e4dfd6",
  },
  dark: {
    key: "dark",
    name: "Fósforo",
    character: "Verde terminal sobre negro",
    pairTheme: "light",
    isDark: true,
    bg: "#0a0e0c",
    surface: "#111915",
    border: "#1f3528",
    text: "#d9fbe5",
    muted: "#76a889",
    accent: "#39d353",
    accentSoft: "#132a19",
    track: "#16261c",
  },
  light: {
    key: "light",
    name: "GitHub claro",
    character: "Los verdes de siempre de GitHub",
    pairTheme: "dark",
    isDark: false,
    bg: "#ffffff",
    surface: "#f6f8fa",
    border: "#d0d7de",
    text: "#1f2328",
    muted: "#59636e",
    accent: "#1a7f37",
    accentSoft: "#dafbe1",
    track: "#eaeef2",
  },
  sand: {
    key: "sand",
    name: "Arena",
    character: "Beige cálido con terracota",
    pairTheme: "amber_terminal",
    isDark: false,
    bg: "#f5efe6",
    surface: "#ebe2d5",
    border: "#d3c4b0",
    text: "#2c221e",
    muted: "#6e5a4f",
    accent: "#c85a32",
    accentSoft: "#f2d8cc",
    track: "#dfd3c3",
  },
  cyberpunk: {
    key: "cyberpunk",
    name: "Cyberpunk",
    character: "Magenta y cian sobre violeta oscuro",
    isDark: true,
    bg: "#120924",
    surface: "#1b0f36",
    border: "#4c1d95",
    text: "#fdf4ff",
    muted: "#c4b5fd",
    accent: "#00f5d4",
    accentSoft: "#3b0764",
    track: "#2a1454",
  },
  neon_cyan: {
    key: "neon_cyan",
    name: "Cian",
    character: "Neón azul sobre azul noche",
    isDark: true,
    bg: "#07131f",
    surface: "#0c1e30",
    border: "#154360",
    text: "#e0f7fa",
    muted: "#7dd3fc",
    accent: "#00e5ff",
    accentSoft: "#0b2e47",
    track: "#102a42",
  },
  amber_terminal: {
    key: "amber_terminal",
    name: "Ámbar",
    character: "Monitor de fósforo ámbar",
    pairTheme: "sand",
    isDark: true,
    bg: "#140e05",
    surface: "#1f1608",
    border: "#4d3411",
    text: "#ffecb3",
    muted: "#d99b26",
    accent: "#ffb300",
    accentSoft: "#332209",
    track: "#2b1e0b",
  },
  ruby: {
    key: "ruby",
    name: "Rubí",
    character: "Rojo intenso sobre casi negro",
    isDark: true,
    bg: "#12080a",
    surface: "#1d0d11",
    border: "#4c1622",
    text: "#ffe4e6",
    muted: "#fda4af",
    accent: "#f43f5e",
    accentSoft: "#381019",
    track: "#2b1218",
  },
};

export interface SkinStateAnimationMeta {
  row: number;
  frames?: number;
  fps?: number;
  loop?: boolean;
}

export interface SkinDialoguesMeta {
  alert?: string;
  victory?: string;
  focus?: string;
  break?: string;
  sleep?: string;
}

export interface SkinManifestMeta {
  id?: string;
  name?: string;
  frameWidth: number;
  frameHeight: number;
  dialogues?: SkinDialoguesMeta;
  states: Record<PetStateName, SkinStateAnimationMeta>;
}

export interface GitHubActivitySignals {
  commitsToday?: number;
  mergedRecently?: boolean;
  streakDays?: number;
  daysSinceLastCommit?: number;
  urgentDeadlines?: number;
}

export interface PortafilSvgOptions {
  skinId: string;
  variant?: PortafilSvgVariant;
  theme?: PortafilThemeKey;
  state?: PetStateName;
  spritesheetDataUrl: string;
  manifest?: SkinManifestMeta;
  usernameOrRepo?: string;
  customMessage?: string;
  streakDays?: number;
}

const STATE_LABELS: Record<PetStateName, { badge: string; verb: string; defaultRow: number; defaultFrames: number; defaultFps: number }> = {
  FOCUS: { badge: "MODO FOCO", verb: "Concentrado en el código", defaultRow: 4, defaultFrames: 4, defaultFps: 6 },
  VICTORY_GITHUB: { badge: "COMMIT MERGED", verb: "Celebrando entrega en GitHub", defaultRow: 3, defaultFrames: 6, defaultFps: 10 },
  WALK: { badge: "EN PATRULLA", verb: "Caminando por el repositorio", defaultRow: 1, defaultFrames: 6, defaultFps: 10 },
  IDLE: { badge: "EN GUARDIA", verb: "Acompañando tu perfil", defaultRow: 0, defaultFrames: 4, defaultFps: 6 },
  ALERT_SEMESTRE: { badge: "ENTREGA PRÓXIMA", verb: "Alerta de prioridad activa", defaultRow: 2, defaultFrames: 4, defaultFps: 8 },
  SLEEP: { badge: "MODO SIESTA", verb: "Descansando hasta el próximo commit", defaultRow: 5, defaultFrames: 4, defaultFps: 4 },
};

const CATEGORY_LABELS: Record<SkinCategory, string> = {
  all: "Compañero",
  mascotas: "Mascota",
  heroes: "Héroe",
  cine: "Cine y Fantasía",
  anime: "Anime",
  gaming: "Gaming",
  cartoons: "Cartoon",
  deportes: "Deportes",
};

/**
 * Determina automáticamente el estado del compañero según las señales reales de GitHub
 * (siguiendo la misma filosofía que la serpiente de Portafil).
 */
export function resolveGitHubCompanionState(signals: GitHubActivitySignals): PetStateName {
  if (signals.urgentDeadlines && signals.urgentDeadlines > 0) {
    return "ALERT_SEMESTRE";
  }
  if (signals.mergedRecently || (signals.commitsToday !== undefined && signals.commitsToday > 0)) {
    return "VICTORY_GITHUB";
  }
  if (signals.daysSinceLastCommit !== undefined && signals.daysSinceLastCommit >= 7) {
    return "SLEEP";
  }
  if (signals.streakDays !== undefined && signals.streakDays >= 3) {
    return "FOCUS";
  }
  if (signals.streakDays !== undefined && signals.streakDays >= 1) {
    return "WALK";
  }
  return "IDLE";
}

export function escapeXml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export function getSkinCatalogEntry(skinId: string): SkinItem {
  return (
    skinCatalog.find((item) => item.id === skinId) ?? {
      id: skinId,
      name: skinId,
      detail: "Un paso a la vez.",
      color: "#c0e798",
      category: "mascotas",
    }
  );
}

export function resolveCompanionDialogue(
  skin: SkinItem,
  state: PetStateName,
  manifest?: SkinManifestMeta,
  customMessage?: string
): string {
  const trimmed = customMessage?.trim();
  if (trimmed) {
    return trimmed.slice(0, 110);
  }
  const dialogues = manifest?.dialogues;
  if (dialogues) {
    if (state === "FOCUS" && dialogues.focus) return dialogues.focus;
    if (state === "VICTORY_GITHUB" && dialogues.victory) return dialogues.victory;
    if (state === "ALERT_SEMESTRE" && dialogues.alert) return dialogues.alert;
    if (state === "SLEEP" && dialogues.sleep) return dialogues.sleep;
    if ((state === "IDLE" || state === "WALK") && dialogues.break) return dialogues.break;
  }
  return `${skin.detail} (${STATE_LABELS[state].verb})`;
}

function wrapTextLines(text: string, maxCharsPerLine: number, maxLines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxCharsPerLine) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word.length > maxCharsPerLine ? `${word.slice(0, maxCharsPerLine - 1)}…` : word;
      if (lines.length === maxLines - 1) {
        break;
      }
    }
  }
  if (current && lines.length < maxLines) {
    lines.push(current);
  }
  const consumedWords = lines.join(" ").split(/\s+/).filter(Boolean).length;
  if (consumedWords < words.length && lines.length > 0) {
    const lastIdx = lines.length - 1;
    const last = lines[lastIdx];
    lines[lastIdx] = last.endsWith("…")
      ? last
      : last.length >= maxCharsPerLine
      ? `${last.slice(0, maxCharsPerLine - 1)}…`
      : `${last}…`;
  }
  return lines;
}

function getAnimationParams(state: PetStateName, manifest?: SkinManifestMeta) {
  const fallback = STATE_LABELS[state] ?? STATE_LABELS.IDLE;
  const stateConfig = manifest?.states?.[state];
  const frameWidth = manifest?.frameWidth ?? 64;
  const frameHeight = manifest?.frameHeight ?? 64;
  const row = stateConfig?.row ?? fallback.defaultRow;
  const frames = Math.max(1, stateConfig?.frames ?? fallback.defaultFrames);
  const fps = Math.max(1, stateConfig?.fps ?? fallback.defaultFps);
  const durationSeconds = Number((frames / fps).toFixed(2));
  return { frameWidth, frameHeight, row, frames, fps, durationSeconds };
}

/**
 * Genera un SVG animado 100% autónomo (sin JS, con CSS @keyframes steps() y pixel-art nítido)
 * compatible con READMEs de GitHub, Markdown y el sistema de diseño de Portafil.
 */
export function generatePortafilCompanionSvg(options: PortafilSvgOptions): string {
  const skin = getSkinCatalogEntry(options.skinId);
  const variant: PortafilSvgVariant = options.variant ?? "card";
  const themeKey: PortafilThemeKey = options.theme ?? "ink";
  const theme = PORTAFIL_THEMES[themeKey] ?? PORTAFIL_THEMES.ink;
  const state: PetStateName = options.state ?? (variant === "divider" ? "WALK" : "FOCUS");
  const stateMeta = STATE_LABELS[state] ?? STATE_LABELS.FOCUS;
  const anim = getAnimationParams(state, options.manifest);
  const dialogue = resolveCompanionDialogue(skin, state, options.manifest, options.customMessage);
  const repoLabel = (options.usernameOrRepo?.trim() || "luisrodriguez-rgb/My-Skin").slice(0, 42);
  const safeSpritesheet = escapeXml(options.spritesheetDataUrl);

  // Dimensiones escaladas del sprite (de 64x64 a displaySize)
  const displaySize = variant === "card" ? 96 : variant === "badge" ? 64 : 64;
  const sheetCols = 6;
  const sheetRows = 6;
  const sheetW = displaySize * sheetCols;
  const sheetH = displaySize * sheetRows;
  const rowOffsetY = -(anim.row * displaySize);
  const endOffsetX = -(anim.frames * displaySize);

  if (variant === "divider") {
    const width = 720;
    const height = 88;
    const labelText = escapeXml(
      options.customMessage?.trim()
        ? `${skin.name} · ${options.customMessage.trim()}`
        : `${skin.name} patrullando ${repoLabel}`
    );
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="${escapeXml(skin.name)} patrullando el repositorio">
  <title>${escapeXml(skin.name)} — Separador animado de repositorio</title>
  <style>
    .bg { fill: ${theme.bg}; stroke: ${theme.border}; stroke-width: 1.5; }
    .track { stroke: ${theme.track}; stroke-width: 2; stroke-dasharray: 6 6; }
    .accent-dot { fill: ${theme.accent}; }
    .label { fill: ${theme.muted}; font: 600 11px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0.4px; }
    .tag { fill: ${theme.accent}; font: 700 10px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }
    .patrol-carrier {
      animation: patrol-move 14s linear infinite;
    }
    .sprite-strip {
      image-rendering: -moz-crisp-edges;
      image-rendering: pixelated;
      animation: sprite-steps ${anim.durationSeconds}s steps(${anim.frames}) infinite;
    }
    @keyframes sprite-steps {
      from { transform: translateX(0px); }
      to { transform: translateX(${endOffsetX}px); }
    }
    @keyframes patrol-move {
      0% { transform: translateX(28px) scaleX(1); }
      48% { transform: translateX(616px) scaleX(1); }
      50% { transform: translateX(616px) scaleX(-1); }
      98% { transform: translateX(28px) scaleX(-1); }
      100% { transform: translateX(28px) scaleX(1); }
    }
    @media (prefers-reduced-motion: reduce) {
      .patrol-carrier, .sprite-strip { animation: none !important; }
    }
  </style>
  <defs>
    <clipPath id="pet-clip-divider">
      <rect x="-32" y="0" width="${displaySize}" height="${displaySize}" />
    </clipPath>
  </defs>
  <rect class="bg" x="1" y="1" width="${width - 2}" height="${height - 2}" rx="12" />
  <line class="track" x1="24" y1="68" x2="${width - 24}" y2="68" />
  <circle class="accent-dot" cx="24" cy="68" r="3.5" />
  <circle class="accent-dot" cx="${width - 24}" cy="68" r="3.5" />
  <text class="tag" x="24" y="24">[${escapeXml(stateMeta.badge)}]</text>
  <text class="label" x="${width - 24}" y="24" text-anchor="end">${labelText}</text>
  <g transform="translate(0, 8)">
    <g class="patrol-carrier">
      <g clip-path="url(#pet-clip-divider)">
        <g transform="translate(-32, ${rowOffsetY})">
          <image class="sprite-strip" href="${safeSpritesheet}" width="${sheetW}" height="${sheetH}" />
        </g>
      </g>
    </g>
  </g>
</svg>`;
  }

  if (variant === "badge") {
    const width = 320;
    const height = 84;
    const lines = wrapTextLines(dialogue, 28, 2);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="max-width:100%;height:auto;" role="img" aria-label="${escapeXml(skin.name)}: ${escapeXml(dialogue)}">
  <title>${escapeXml(skin.name)} — Mascota de repositorio</title>
  <style>
    .bg { fill: ${theme.bg}; stroke: ${theme.border}; stroke-width: 1.5; }
    .stage { fill: ${theme.surface}; stroke: ${theme.border}; stroke-width: 1; }
    .name { fill: ${theme.text}; font: 700 13px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }
    .badge { fill: ${theme.accent}; font: 700 10px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }
    .msg { fill: ${theme.muted}; font: 500 11px system-ui, -apple-system, 'Segoe UI', sans-serif; }
    .sprite-strip {
      image-rendering: -moz-crisp-edges;
      image-rendering: pixelated;
      animation: sprite-steps ${anim.durationSeconds}s steps(${anim.frames}) infinite;
    }
    @keyframes sprite-steps {
      from { transform: translateX(0px); }
      to { transform: translateX(${endOffsetX}px); }
    }
    @media (prefers-reduced-motion: reduce) {
      .sprite-strip { animation: none !important; }
    }
  </style>
  <defs>
    <clipPath id="pet-clip-badge">
      <rect x="0" y="0" width="${displaySize}" height="${displaySize}" rx="10" />
    </clipPath>
  </defs>
  <rect class="bg" x="1" y="1" width="${width - 2}" height="${height - 2}" rx="14" />
  <rect class="stage" x="10" y="10" width="64" height="64" rx="10" />
  <g transform="translate(10, 10)" clip-path="url(#pet-clip-badge)">
    <g transform="translate(0, ${rowOffsetY})">
      <image class="sprite-strip" href="${safeSpritesheet}" width="${sheetW}" height="${sheetH}" />
    </g>
  </g>
  <text class="name" x="86" y="27">${escapeXml(skin.name)}</text>
  <text class="badge" x="${width - 14}" y="26" text-anchor="end">● ${escapeXml(stateMeta.badge)}</text>
  <text class="msg" x="86" y="47">${escapeXml(lines[0] ?? "")}</text>
  ${lines[1] ? `<text class="msg" x="86" y="63">${escapeXml(lines[1])}</text>` : `<text class="msg" x="86" y="63">${escapeXml(repoLabel)}</text>`}
</svg>`;
  }

  // Variant: "card" (Tarjeta estilo Portafil)
  const width = 540;
  const height = 152;
  const lines = wrapTextLines(dialogue, 42, 2);
  const categoryLabel = CATEGORY_LABELS[skin.category] ?? "Compañero";
  const streakBadge =
    options.streakDays && options.streakDays > 0
      ? `${options.streakDays}d racha`
      : `Tema ${theme.name}`;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" role="img" aria-label="${escapeXml(skin.name)} en modo ${escapeXml(stateMeta.badge)}: ${escapeXml(dialogue)}">
  <title>${escapeXml(skin.name)} · Compañero de GitHub (${escapeXml(theme.name)})</title>
  <style>
    .card-bg { fill: ${theme.bg}; stroke: ${theme.border}; stroke-width: 1.5; }
    .stage-bg { fill: ${theme.surface}; stroke: ${theme.border}; stroke-width: 1; }
    .bubble-bg { fill: ${theme.surface}; stroke: ${theme.border}; stroke-width: 1; }
    .chip-bg { fill: ${theme.accentSoft}; stroke: ${theme.accent}; stroke-width: 1; }
    .title { fill: ${theme.text}; font: 700 16px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }
    .subtitle { fill: ${theme.muted}; font: 500 11.5px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }
    .chip-text { fill: ${theme.accent}; font: 700 10.5px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; letter-spacing: 0.4px; }
    .quote { fill: ${theme.text}; font: 500 12.5px system-ui, -apple-system, 'Segoe UI', sans-serif; }
    .footer { fill: ${theme.muted}; font: 500 11px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }
    .accent { fill: ${theme.accent}; font: 700 11px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }
    .floor { fill: ${theme.track}; }
    .sprite-strip {
      image-rendering: -moz-crisp-edges;
      image-rendering: pixelated;
      animation: sprite-steps ${anim.durationSeconds}s steps(${anim.frames}) infinite;
    }
    @keyframes sprite-steps {
      from { transform: translateX(0px); }
      to { transform: translateX(${endOffsetX}px); }
    }
    @media (prefers-reduced-motion: reduce) {
      .sprite-strip { animation: none !important; }
    }
  </style>
  <defs>
    <clipPath id="pet-clip-card">
      <rect x="0" y="0" width="${displaySize}" height="${displaySize}" rx="12" />
    </clipPath>
  </defs>
  <rect class="card-bg" x="1" y="1" width="${width - 2}" height="${height - 2}" rx="16" />
  <rect class="stage-bg" x="16" y="16" width="112" height="120" rx="14" />
  <ellipse class="floor" cx="72" cy="116" rx="34" ry="7" />
  <g transform="translate(24, 20)" clip-path="url(#pet-clip-card)">
    <g transform="translate(0, ${rowOffsetY})">
      <image class="sprite-strip" href="${safeSpritesheet}" width="${sheetW}" height="${sheetH}" />
    </g>
  </g>
  <text class="title" x="144" y="36">${escapeXml(skin.name)}</text>
  <text class="subtitle" x="144" y="54">${escapeXml(categoryLabel)} · ${escapeXml(repoLabel)}</text>
  <rect class="chip-bg" x="${width - 154}" y="18" width="136" height="24" rx="12" />
  <text class="chip-text" x="${width - 86}" y="34" text-anchor="middle">● ${escapeXml(stateMeta.badge)}</text>
  <rect class="bubble-bg" x="144" y="66" width="${width - 162}" height="50" rx="10" />
  <text class="quote" x="156" y="87">“${escapeXml(lines[0] ?? "")}${lines[1] ? "" : "”"}</text>
  ${lines[1] ? `<text class="quote" x="156" y="105">${escapeXml(lines[1])}”</text>` : ""}
  <text class="footer" x="144" y="136">MySkin × Portafil</text>
  <text class="accent" x="${width - 18}" y="136" text-anchor="end">${escapeXml(streakBadge)}</text>
</svg>`;
}

export interface MarkdownSnippetOptions {
  skinId: string;
  variant: PortafilSvgVariant;
  theme: PortafilThemeKey;
  state: PetStateName;
  usernameOrRepo?: string;
  customMessage?: string;
  portafilBaseUrl?: string;
}

/**
 * Construye los fragmentos Markdown listos para pegar:
 * 1) Para archivo SVG local en el repositorio (./assets/myskin-<skin>.svg)
 * 2) Para endpoint vivo de Portafil (/api/companion/<usuario>.svg) con soporte <picture> claro/oscuro
 */
export function buildPortafilMarkdownSnippets(options: MarkdownSnippetOptions): {
  filename: string;
  localMarkdown: string;
  portafilMarkdown: string;
} {
  const skin = getSkinCatalogEntry(options.skinId);
  const theme = PORTAFIL_THEMES[options.theme] ?? PORTAFIL_THEMES.ink;
  const repoOrUser = options.usernameOrRepo?.trim() || "luisrodriguez-rgb/My-Skin";
  const githubUser = repoOrUser.includes("/") ? repoOrUser.split("/")[0] : repoOrUser;
  const baseUrl = (options.portafilBaseUrl || "https://perfila-lr.vercel.app").replace(/\/$/, "");
  const filename = `myskin-${skin.id}-${options.variant}-${theme.key}.svg`;
  const alt = `${skin.name} (${STATE_LABELS[options.state].badge})`;

  const localMarkdown =
    options.variant === "badge"
      ? `![${alt}](./${filename})`
      : `<p align="center">\n  <img src="./${filename}" alt="${alt}" width="100%">\n</p>`;

  const buildApiUrl = (themeKey: PortafilThemeKey) => {
    const params = new URLSearchParams({
      skin: skin.id,
      variant: options.variant,
      state: options.state,
      theme: themeKey,
      lang: "es",
    });
    if (options.customMessage?.trim()) {
      params.set("say", options.customMessage.trim());
    }
    return `${baseUrl}/api/companion/${encodeURIComponent(githubUser)}.svg?${params.toString()}`;
  };

  if (theme.pairTheme) {
    const darkTheme = theme.isDark ? theme.key : theme.pairTheme;
    const lightTheme = theme.isDark ? theme.pairTheme : theme.key;
    const widthAttr = options.variant === "badge" ? "" : ' width="100%"';
    const portafilMarkdown = `<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="${buildApiUrl(darkTheme)}">
    <img alt="${alt} en Portafil" src="${buildApiUrl(lightTheme)}"${widthAttr}>
  </picture>
</p>`;
    return { filename, localMarkdown, portafilMarkdown };
  }

  const widthAttr = options.variant === "badge" ? "" : ' width="100%"';
  const portafilMarkdown = `<p align="center">
  <img alt="${alt} en Portafil" src="${buildApiUrl(theme.key)}"${widthAttr}>
</p>`;
  return { filename, localMarkdown, portafilMarkdown };
}
