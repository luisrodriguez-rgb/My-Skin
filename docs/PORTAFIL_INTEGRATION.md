# Integración MySkin × Portafil (Perfiles de GitHub, Mascotas de Repositorio y Markdown)

Esta guía documenta cómo funcionan las piezas SVG animadas generadas por **MySkin** y cómo integrar el catálogo de **53 skins** directamente en **Portafil** (`luisrodriguez-rgb/portafil`).

---

## 1. Uso directo desde MySkin (sin servidor)

En el controlador de **MySkin** (`Compañeros` → **«Llevar a GitHub, Markdown y Portafil»**) o ejecutando:

```bash
pnpm run export:portafil
```

se generan tanto el bundle completo (`dist/portafil/portafil-companions-bundle.json`, ~302 KB con las 53 skins y sus spritesheets en Base64) como ejemplos SVG autónomos (~5.5 KB cada uno) en `public/portafil/examples/`:

- `public/portafil/examples/capybara-card-ink.svg` — Tarjeta estilo Portafil en tema **Tinta** (`ink`).
- `public/portafil/examples/capybara-card-paper.svg` — Tarjeta estilo Portafil en tema **Papel** (`paper`).
- `public/portafil/examples/capybara-divider-ink.svg` — Separador animado donde el personaje patrulla el README de lado a lado.
- `public/portafil/examples/ghost-dev-badge-dark.svg` — Insignia/mascota compacta para cabeceras de repositorios o PRs.

### Ejemplo en cualquier `README.md` con cambio automático claro/oscuro (`<picture>`)

```html
<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="public/portafil/examples/capybara-card-ink.svg">
    <img alt="Capibara acompañando el repositorio" src="public/portafil/examples/capybara-card-paper.svg" width="100%">
  </picture>
</p>
```

---

## 2. Contrato de URL para Portafil (`/api/companion/<usuario>.svg`)

Para añadir la pieza **«Tu compañero»** al ecosistema de Portafil:

| Parámetro | Valores | Descripción |
| :--- | :--- | :--- |
| `skin` | `capybara`, `ghost-dev`, `cyber-ninja`, `spiderman`, etc. (53 disponibles) | Personaje elegido del catálogo de MySkin. Por defecto: `capybara`. |
| `variant` | `card` (defecto), `divider`, `badge` | Tarjeta completa de perfil (`540×152`), separador en patrulla (`720×88`) o insignia compacta (`320×84`). |
| `theme` | `ink`, `paper`, `dark`, `light`, `sand`, `cyberpunk`, `neon_cyan`, `amber_terminal`, `ruby` | Los 9 temas del sistema visual de Portafil. |
| `state` | `auto` (defecto), `FOCUS`, `VICTORY_GITHUB`, `WALK`, `IDLE`, `ALERT_SEMESTRE`, `SLEEP` | Estado de la máquina de estados (FSM). En `auto`, se calcula según las contribuciones reales del usuario en GitHub. |
| `say` | Texto libre (máx. 110 caracteres) | Sobrescribe el diálogo original del `manifest.json` del personaje. |
| `lang` | `es` (defecto), `en` | Idioma de las etiquetas de estado. |

### Regla reactiva automática (`resolveGitHubCompanionState`)

Cuando `state` no se fuerza manualmente, el compañero reacciona a la actividad real del perfil en GitHub igual que la serpiente de Portafil:

1. **`VICTORY_GITHUB`**: Si el usuario hizo commit o merge hoy (`commitsToday > 0`).
2. **`SLEEP`**: Si lleva 7 o más días sin contribuir (`daysSinceLastCommit >= 7`), mostrando la animación de sueño con partículas `zZ`.
3. **`FOCUS`**: Si mantiene una racha activa de 3 o más días (`streakDays >= 3`).
4. **`WALK`**: Si contribuyó recientemente (`streakDays >= 1`).
5. **`IDLE`**: Estado base de guardia.

---

## 3. Cómo conectarlo en el repositorio de Portafil

1. Ejecuta `pnpm run export:portafil` en MySkin.
2. Copia `dist/portafil/portafil-companions-bundle.json` a `shared/companions-bundle.json` en Portafil.
3. Importa la lógica de [`src/portafilSvg.ts`](../src/portafilSvg.ts) (`generatePortafilCompanionSvg` y `resolveGitHubCompanionState`) dentro de `api/companion/[user].js` en Portafil pasando las métricas del calendario de GitHub (`streakDays`, `commitsToday`, `daysSinceLastCommit`) y devuelve el SVG con cabecera `Content-Type: image/svg+xml; charset=utf-8` y `Cache-Control: public, s-maxage=1800, stale-while-revalidate=86400`.

