import { describe, it, expect } from "vitest";
import {
  PORTAFIL_THEMES,
  resolveGitHubCompanionState,
  generatePortafilCompanionSvg,
  buildPortafilMarkdownSnippets,
  type PortafilThemeKey,
} from "../../src/portafilSvg";

const DUMMY_SPRITE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

describe("portafilSvg — MySkin × Portafil SVG & Markdown engine", () => {
  it("defines all 9 official Portafil themes with dark/light pairing rules", () => {
    const keys = Object.keys(PORTAFIL_THEMES) as PortafilThemeKey[];
    expect(keys).toEqual([
      "ink",
      "paper",
      "dark",
      "light",
      "sand",
      "cyberpunk",
      "neon_cyan",
      "amber_terminal",
      "ruby",
    ]);
    expect(PORTAFIL_THEMES.ink.pairTheme).toBe("paper");
    expect(PORTAFIL_THEMES.paper.pairTheme).toBe("ink");
    expect(PORTAFIL_THEMES.dark.pairTheme).toBe("light");
    expect(PORTAFIL_THEMES.sand.pairTheme).toBe("amber_terminal");
    expect(PORTAFIL_THEMES.cyberpunk.pairTheme).toBeUndefined();
    expect(PORTAFIL_THEMES.neon_cyan.pairTheme).toBeUndefined();
    expect(PORTAFIL_THEMES.ruby.pairTheme).toBeUndefined();
  });

  it("maps GitHub activity signals to the appropriate companion FSM state", () => {
    expect(resolveGitHubCompanionState({ urgentDeadlines: 1, commitsToday: 5 })).toBe("ALERT_SEMESTRE");
    expect(resolveGitHubCompanionState({ mergedRecently: true })).toBe("VICTORY_GITHUB");
    expect(resolveGitHubCompanionState({ commitsToday: 2 })).toBe("VICTORY_GITHUB");
    expect(resolveGitHubCompanionState({ daysSinceLastCommit: 7, streakDays: 0 })).toBe("SLEEP");
    expect(resolveGitHubCompanionState({ streakDays: 5, daysSinceLastCommit: 0 })).toBe("FOCUS");
    expect(resolveGitHubCompanionState({ streakDays: 1, daysSinceLastCommit: 1 })).toBe("WALK");
    expect(resolveGitHubCompanionState({})).toBe("IDLE");
  });

  it("generates a valid animated SVG card with CSS steps() and manifest dialogues", () => {
    const svg = generatePortafilCompanionSvg({
      skinId: "capybara",
      variant: "card",
      theme: "ink",
      state: "FOCUS",
      spritesheetDataUrl: DUMMY_SPRITE,
      usernameOrRepo: "luisrodriguez-rgb/portafil",
      streakDays: 14,
      manifest: {
        frameWidth: 64,
        frameHeight: 64,
        dialogues: {
          focus: "La calma lo resuelve todo. Respira profundo y programa despacio.",
        },
        states: {
          IDLE: { row: 0, frames: 4, fps: 6 },
          WALK: { row: 1, frames: 6, fps: 10 },
          ALERT_SEMESTRE: { row: 2, frames: 4, fps: 8 },
          VICTORY_GITHUB: { row: 3, frames: 6, fps: 12 },
          FOCUS: { row: 4, frames: 4, fps: 6 },
          SLEEP: { row: 5, frames: 4, fps: 4 },
        },
      },
    });

    expect(svg).toContain("<svg");
    expect(svg).toContain("Capibara");
    expect(svg).toContain("luisrodriguez-rgb/portafil");
    expect(svg).toContain("14d racha");
    expect(svg).toContain("La calma lo resuelve todo.");
    expect(svg).toContain("steps(4)");
    expect(svg).toContain("translate(0, -384)"); // row 4 * 96px displaySize
  });

  it("generates divider and badge variants and escapes unsafe XML characters", () => {
    const dividerSvg = generatePortafilCompanionSvg({
      skinId: "ghost-dev",
      variant: "divider",
      theme: "cyberpunk",
      state: "WALK",
      spritesheetDataUrl: DUMMY_SPRITE,
      customMessage: "Cuidado con <script>&\"'",
    });
    expect(dividerSvg).toContain("patrol-move");
    expect(dividerSvg).toContain("&lt;script&gt;&amp;&quot;&apos;");
    expect(dividerSvg).not.toContain("<script>");

    const badgeSvg = generatePortafilCompanionSvg({
      skinId: "spiderman",
      variant: "badge",
      theme: "ruby",
      state: "VICTORY_GITHUB",
      spritesheetDataUrl: DUMMY_SPRITE,
    });
    expect(badgeSvg).toContain("Spider-Hero");
    expect(badgeSvg).toContain("COMMIT MERGED");
  });

  it("builds <picture> Markdown for paired themes and single <img> for constant color themes", () => {
    const paired = buildPortafilMarkdownSnippets({
      skinId: "capybara",
      variant: "card",
      theme: "ink",
      state: "FOCUS",
      usernameOrRepo: "luisrodriguez-rgb/My-Skin",
    });
    expect(paired.filename).toBe("myskin-capybara-card-ink.svg");
    expect(paired.portafilMarkdown).toContain("<picture>");
    expect(paired.portafilMarkdown).toContain("theme=ink");
    expect(paired.portafilMarkdown).toContain("theme=paper");
    expect(paired.portafilMarkdown).toContain("/api/companion/luisrodriguez-rgb.svg");

    const single = buildPortafilMarkdownSnippets({
      skinId: "cyber-ninja",
      variant: "divider",
      theme: "cyberpunk",
      state: "WALK",
      usernameOrRepo: "luisrodriguez-rgb",
    });
    expect(single.portafilMarkdown).not.toContain("<picture>");
    expect(single.portafilMarkdown).toContain("theme=cyberpunk");
  });
});

