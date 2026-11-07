#!/usr/bin/env python3
"""
MySkin × Portafil — Exportador de Compañeros y Generador de Piezas SVG
Empaqueta las 53 skins (manifest.json + spritesheet.png en Base64) en un bundle
listo para integrar en Portafil (`shared/companions.js` y `/api/companion/<user>.svg`)
y genera ejemplos SVG animados autónomos listos para usar en cualquier README.md.
"""

import base64
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SKINS_DIR = ROOT / "public" / "skins"
CATALOG_TS = ROOT / "src" / "skinCatalog.ts"
OUT_DIR = ROOT / "dist" / "portafil"
EXAMPLES_DIR = ROOT / "public" / "portafil" / "examples"

ORIGINAL_SKIN_IDS = {
    "capybara",
    "labrador-retriever",
    "little-girl",
    "cat-mystic",
    "shiba-inu",
    "panda-zen",
    "arctic-penguin",
    "fantasy-wizard",
    "spartan",
    "astro-lost",
    "cyber-ninja",
    "dev-avatar",
    "ghost-dev",
    "game-slime",
    "football-10",
}

PORTAFIL_THEMES = {
    "ink": {
        "name": "Tinta",
        "bg": "#111214",
        "surface": "#181a1f",
        "border": "#2a2e37",
        "text": "#f3f4f6",
        "muted": "#9ca3af",
        "accent": "#c0e798",
        "accentSoft": "#233123",
        "track": "#232730",
    },
    "paper": {
        "name": "Papel",
        "bg": "#faf8f5",
        "surface": "#f0ede6",
        "border": "#d6d1c7",
        "text": "#18181b",
        "muted": "#57534e",
        "accent": "#2f6f3e",
        "accentSoft": "#ddebd8",
        "track": "#e4dfd6",
    },
    "dark": {
        "name": "Fósforo",
        "bg": "#0a0e0c",
        "surface": "#111915",
        "border": "#1f3528",
        "text": "#d9fbe5",
        "muted": "#76a889",
        "accent": "#39d353",
        "accentSoft": "#132a19",
        "track": "#16261c",
    },
    "cyberpunk": {
        "name": "Cyberpunk",
        "bg": "#120924",
        "surface": "#1b0f36",
        "border": "#4c1d95",
        "text": "#fdf4ff",
        "muted": "#c4b5fd",
        "accent": "#00f5d4",
        "accentSoft": "#3b0764",
        "track": "#2a1454",
    },
}


def parse_skin_catalog_ts():
    """Extrae el orden, nombre corto, detalle, color y categoría desde src/skinCatalog.ts."""
    content = CATALOG_TS.read_text(encoding="utf-8")
    pattern = re.compile(
        r'\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)",\s*detail:\s*"([^"]+)",\s*color:\s*"([^"]+)",\s*category:\s*"([^"]+)"\s*\}'
    )
    entries = []
    for match in pattern.finditer(content):
        skin_id, name, detail, color, category = match.groups()
        entries.append(
            {
                "id": skin_id,
                "name": name,
                "detail": detail,
                "color": color,
                "category": category,
                "isOriginal": skin_id in ORIGINAL_SKIN_IDS,
            }
        )
    return entries


def escape_xml(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace('"', "&quot;")
        .replace("'", "&apos;")
    )


def render_example_svg(skin: dict, variant: str, theme_key: str, state: str, repo_label: str) -> str:
    theme = PORTAFIL_THEMES[theme_key]
    state_cfg = skin["states"].get(state, {"row": 0, "frames": 4, "fps": 6})
    row = state_cfg.get("row", 0)
    frames = max(1, state_cfg.get("frames", 4))
    fps = max(1, state_cfg.get("fps", 6))
    duration = round(frames / fps, 2)
    data_url = skin["spritesheetDataUrl"]

    display_size = 96 if variant == "card" else 64
    sheet_w = display_size * 6
    sheet_h = display_size * 6
    row_offset_y = -(row * display_size)
    end_offset_x = -(frames * display_size)

    dialogues = skin.get("dialogues") or {}
    dialogue = (
        dialogues.get("focus")
        if state == "FOCUS"
        else dialogues.get("victory")
        if state == "VICTORY_GITHUB"
        else dialogues.get("sleep")
        if state == "SLEEP"
        else skin["detail"]
    ) or skin["detail"]

    if variant == "divider":
        w, h = 720, 88
        label = escape_xml(f"{skin['name']} patrullando {repo_label}")
        return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="100%" role="img" aria-label="{escape_xml(skin['name'])} patrullando el repositorio">
  <title>{escape_xml(skin['name'])} — Separador animado de repositorio</title>
  <style>
    .bg {{ fill: {theme['bg']}; stroke: {theme['border']}; stroke-width: 1.5; }}
    .track {{ stroke: {theme['track']}; stroke-width: 2; stroke-dasharray: 6 6; }}
    .accent-dot {{ fill: {theme['accent']}; }}
    .label {{ fill: {theme['muted']}; font: 600 11px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }}
    .tag {{ fill: {theme['accent']}; font: 700 10px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }}
    .patrol-carrier {{ animation: patrol-move 14s linear infinite; }}
    .sprite-strip {{ image-rendering: pixelated; animation: sprite-steps {duration}s steps({frames}) infinite; }}
    @keyframes sprite-steps {{ from {{ transform: translateX(0px); }} to {{ transform: translateX({end_offset_x}px); }} }}
    @keyframes patrol-move {{
      0% {{ transform: translateX(28px) scaleX(1); }}
      48% {{ transform: translateX(616px) scaleX(1); }}
      50% {{ transform: translateX(616px) scaleX(-1); }}
      98% {{ transform: translateX(28px) scaleX(-1); }}
      100% {{ transform: translateX(28px) scaleX(1); }}
    }}
  </style>
  <defs><clipPath id="pet-clip-div"><rect x="-32" y="0" width="{display_size}" height="{display_size}" /></clipPath></defs>
  <rect class="bg" x="1" y="1" width="{w - 2}" height="{h - 2}" rx="12" />
  <line class="track" x1="24" y1="68" x2="{w - 24}" y2="68" />
  <circle class="accent-dot" cx="24" cy="68" r="3.5" />
  <circle class="accent-dot" cx="{w - 24}" cy="68" r="3.5" />
  <text class="tag" x="24" y="24">[EN PATRULLA]</text>
  <text class="label" x="{w - 24}" y="24" text-anchor="end">{label}</text>
  <g transform="translate(0, 8)">
    <g class="patrol-carrier">
      <g clip-path="url(#pet-clip-div)">
        <g transform="translate(-32, {row_offset_y})">
          <image class="sprite-strip" href="{data_url}" width="{sheet_w}" height="{sheet_h}" />
        </g>
      </g>
    </g>
  </g>
</svg>"""

    if variant == "badge":
        w, h = 320, 84
        short_msg = dialogue[:34] + ("…" if len(dialogue) > 34 else "")
        return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" style="max-width:100%;height:auto;" role="img" aria-label="{escape_xml(skin['name'])}: {escape_xml(short_msg)}">
  <title>{escape_xml(skin['name'])} — Mascota de repositorio</title>
  <style>
    .bg {{ fill: {theme['bg']}; stroke: {theme['border']}; stroke-width: 1.5; }}
    .stage {{ fill: {theme['surface']}; stroke: {theme['border']}; stroke-width: 1; }}
    .name {{ fill: {theme['text']}; font: 700 13px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }}
    .badge {{ fill: {theme['accent']}; font: 700 10px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }}
    .msg {{ fill: {theme['muted']}; font: 500 11px system-ui, -apple-system, sans-serif; }}
    .sprite-strip {{ image-rendering: pixelated; animation: sprite-steps {duration}s steps({frames}) infinite; }}
    @keyframes sprite-steps {{ from {{ transform: translateX(0px); }} to {{ transform: translateX({end_offset_x}px); }} }}
  </style>
  <defs><clipPath id="pet-clip-badge"><rect x="0" y="0" width="64" height="64" rx="10" /></clipPath></defs>
  <rect class="bg" x="1" y="1" width="{w - 2}" height="{h - 2}" rx="14" />
  <rect class="stage" x="10" y="10" width="64" height="64" rx="10" />
  <g transform="translate(10, 10)" clip-path="url(#pet-clip-badge)">
    <g transform="translate(0, {row_offset_y})">
      <image class="sprite-strip" href="{data_url}" width="{sheet_w}" height="{sheet_h}" />
    </g>
  </g>
  <text class="name" x="86" y="27">{escape_xml(skin['name'])}</text>
  <text class="badge" x="{w - 14}" y="26" text-anchor="end">● MODO FOCO</text>
  <text class="msg" x="86" y="47">{escape_xml(short_msg)}</text>
  <text class="msg" x="86" y="63">{escape_xml(repo_label)}</text>
</svg>"""

    w, h = 540, 152
    short_quote = dialogue[:48] + ("…" if len(dialogue) > 48 else "")
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="100%" role="img" aria-label="{escape_xml(skin['name'])} en modo foco">
  <title>{escape_xml(skin['name'])} · Compañero de GitHub ({escape_xml(theme['name'])})</title>
  <style>
    .card-bg {{ fill: {theme['bg']}; stroke: {theme['border']}; stroke-width: 1.5; }}
    .stage-bg {{ fill: {theme['surface']}; stroke: {theme['border']}; stroke-width: 1; }}
    .bubble-bg {{ fill: {theme['surface']}; stroke: {theme['border']}; stroke-width: 1; }}
    .chip-bg {{ fill: {theme['accentSoft']}; stroke: {theme['accent']}; stroke-width: 1; }}
    .title {{ fill: {theme['text']}; font: 700 16px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }}
    .subtitle {{ fill: {theme['muted']}; font: 500 11.5px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }}
    .chip-text {{ fill: {theme['accent']}; font: 700 10.5px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }}
    .quote {{ fill: {theme['text']}; font: 500 12.5px system-ui, -apple-system, sans-serif; }}
    .footer {{ fill: {theme['muted']}; font: 500 11px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }}
    .accent {{ fill: {theme['accent']}; font: 700 11px 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace; }}
    .floor {{ fill: {theme['track']}; }}
    .sprite-strip {{ image-rendering: pixelated; animation: sprite-steps {duration}s steps({frames}) infinite; }}
    @keyframes sprite-steps {{ from {{ transform: translateX(0px); }} to {{ transform: translateX({end_offset_x}px); }} }}
  </style>
  <defs><clipPath id="pet-clip-card"><rect x="0" y="0" width="96" height="96" rx="12" /></clipPath></defs>
  <rect class="card-bg" x="1" y="1" width="{w - 2}" height="{h - 2}" rx="16" />
  <rect class="stage-bg" x="16" y="16" width="112" height="120" rx="14" />
  <ellipse class="floor" cx="72" cy="116" rx="34" ry="7" />
  <g transform="translate(24, 20)" clip-path="url(#pet-clip-card)">
    <g transform="translate(0, {row_offset_y})">
      <image class="sprite-strip" href="{data_url}" width="{sheet_w}" height="{sheet_h}" />
    </g>
  </g>
  <text class="title" x="144" y="36">{escape_xml(skin['name'])}</text>
  <text class="subtitle" x="144" y="54">{escape_xml(repo_label)}</text>
  <rect class="chip-bg" x="{w - 154}" y="18" width="136" height="24" rx="12" />
  <text class="chip-text" x="{w - 86}" y="34" text-anchor="middle">● MODO FOCO</text>
  <rect class="bubble-bg" x="144" y="66" width="{w - 162}" height="50" rx="10" />
  <text class="quote" x="156" y="95">“{escape_xml(short_quote)}”</text>
  <text class="footer" x="144" y="136">MySkin × Portafil</text>
  <text class="accent" x="{w - 18}" y="136" text-anchor="end">Tema {escape_xml(theme['name'])}</text>
</svg>"""


def main():
    catalog_entries = parse_skin_catalog_ts()
    bundle_skins = {}

    for entry in catalog_entries:
        skin_id = entry["id"]
        skin_dir = SKINS_DIR / skin_id
        manifest_path = skin_dir / "manifest.json"
        sprite_path = skin_dir / "spritesheet.png"
        if not manifest_path.exists() or not sprite_path.exists():
            continue

        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        b64_png = base64.b64encode(sprite_path.read_bytes()).decode("ascii")
        bundle_skins[skin_id] = {
            **entry,
            "fullName": manifest.get("name", entry["name"]),
            "frameWidth": manifest.get("frameWidth", 64),
            "frameHeight": manifest.get("frameHeight", 64),
            "personalityPrompt": manifest.get("personalityPrompt", ""),
            "dialogues": manifest.get("dialogues", {}),
            "states": manifest.get("states", {}),
            "spritesheetDataUrl": f"data:image/png;base64,{b64_png}",
        }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    EXAMPLES_DIR.mkdir(parents=True, exist_ok=True)

    bundle_path = OUT_DIR / "portafil-companions-bundle.json"
    bundle_payload = {
        "version": "1.0.0",
        "project": "MySkin × Portafil",
        "totalSkins": len(bundle_skins),
        "originalSkinsCount": sum(1 for s in bundle_skins.values() if s["isOriginal"]),
        "skins": bundle_skins,
    }
    bundle_path.write_text(json.dumps(bundle_payload, ensure_ascii=False, indent=2), encoding="utf-8")

    # Generar SVGs de ejemplo listos para README y documentación
    if "capybara" in bundle_skins:
        (EXAMPLES_DIR / "capybara-card-ink.svg").write_text(
            render_example_svg(bundle_skins["capybara"], "card", "ink", "FOCUS", "luisrodriguez-rgb/My-Skin"),
            encoding="utf-8",
        )
        (EXAMPLES_DIR / "capybara-card-paper.svg").write_text(
            render_example_svg(bundle_skins["capybara"], "card", "paper", "FOCUS", "luisrodriguez-rgb/My-Skin"),
            encoding="utf-8",
        )
        (EXAMPLES_DIR / "capybara-divider-ink.svg").write_text(
            render_example_svg(bundle_skins["capybara"], "divider", "ink", "WALK", "luisrodriguez-rgb/My-Skin"),
            encoding="utf-8",
        )
    if "ghost-dev" in bundle_skins:
        (EXAMPLES_DIR / "ghost-dev-badge-dark.svg").write_text(
            render_example_svg(bundle_skins["ghost-dev"], "badge", "dark", "FOCUS", "luisrodriguez-rgb/portafil"),
            encoding="utf-8",
        )

    print(f"Exportadas {len(bundle_skins)} skins en {bundle_path}")
    print(f"Ejemplos SVG generados en {EXAMPLES_DIR}")


if __name__ == "__main__":
    main()

