import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const feedUrl = "http://127.0.0.1:4173/fixtures/product.ics";
function calendar(events: Array<{ id: string; title: string; minutes: number; url?: string }>) {
  return ["BEGIN:VCALENDAR", "VERSION:2.0", ...events.flatMap((event) => [
    "BEGIN:VEVENT", `UID:${event.id}`, `SUMMARY:${event.title}`,
    `DTSTART:${new Date(Date.now() + event.minutes * 60000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`,
    ...(event.url ? [`URL:${event.url}`] : []), "END:VEVENT",
  ]), "END:VCALENDAR"].join("\r\n");
}
async function start(page: Page, context: BrowserContext) {
  await context.route("https://api.github.com/**", (route) => route.fulfill({ json: [] }));
  await page.goto("/");
  await expect(page.locator("#pet-canvas")).toHaveAttribute("data-state", "IDLE");
  const panel = await context.newPage();
  await panel.goto("/controller.html");
  await expect(panel.locator("#select-skin")).toBeEnabled();
  return panel;
}
async function sync(panel: Page) {
  await panel.fill("#input-calendar-url", feedUrl);
  await panel.click("#btn-sync-calendar");
  await expect(panel.locator("#sync-feedback")).toContainText("Sincronizado ahora");
}
async function merge(page: Page) {
  await page.evaluate(async () => {
    // @ts-expect-error Vite serves this module in the browser.
    const { githubMonitor } = await import("/src/githubMonitor.ts");
    githubMonitor.triggerSimulatedMerge("Prueba de prioridad", 51);
  });
}

test("deadlines show real details, open safely and preserve completion across resync", async ({ page, context }) => {
  const feed = calendar([{ id: "delivery", title: "[Álgebra] Taller de matrices", minutes: 15, url: "https://campus.example.test/tarea/1" }]);
  await context.route("**/fixtures/product.ics", (route) => route.fulfill({ body: feed, contentType: "text/calendar" }));
  await context.route("https://campus.example.test/**", (route) => route.fulfill({ body: "Entrega de prueba" }));
  const panel = await start(page, context); await sync(panel);
  const task = panel.locator("#deadline-list li");
  await expect(task).toContainText("Álgebra");
  await expect(task.getByRole("heading")).toHaveText("Taller de matrices");
  await expect(task.locator(".deadline-time")).toHaveText("Vence en 15 min");
  await expect(task.locator("time")).toHaveAttribute("datetime", /T.*Z$/);
  await expect(page.locator("#pet-canvas")).toHaveAttribute("aria-label", /ENTREGA: 15M.*Álgebra: Taller de matrices/);
  const link = task.getByRole("link", { name: "Abrir Taller de matrices" });
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  const popupPromise = context.waitForEvent("page"); await link.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://campus.example.test/tarea/1"); await popup.close();
  await task.getByRole("button", { name: "Completar Taller de matrices" }).click();
  await expect(task).toHaveClass(/completed/);
  await expect(panel.locator("#deadline-count")).toHaveText("0 pendientes · 1 completadas");
  await expect(page.locator("#pet-canvas")).toHaveAttribute("data-state", "IDLE");
  await expect(panel.locator("#deadlines-heading")).toBeFocused();
  await panel.click("#btn-sync-calendar");
  await expect(task.getByRole("button")).toBeDisabled();
  await panel.reload();
  await expect(panel.locator("#deadline-list li")).toHaveClass(/completed/);
});

test("two urgent tasks retain priority over Pomodoro completion and GitHub", async ({ page, context }) => {
  const feed = calendar([
    { id: "later", title: "[Redes] Informe", minutes: 90 },
    { id: "first", title: "[Sistemas] Laboratorio", minutes: 45 },
  ]);
  await context.route("**/fixtures/product.ics", (route) => route.fulfill({ body: feed, contentType: "text/calendar" }));
  await page.clock.install();
  const panel = await start(page, context); await sync(panel);
  await panel.click("#btn-pomo-toggle"); await merge(page);
  await expect(panel.locator("#notification-list li")).toHaveCount(3);
  await expect(panel.locator("#notification-list .current")).toContainText("Sistemas: Laboratorio");
  await page.clock.fastForward(25 * 60 * 1000);
  await expect(panel.locator("#notification-list li")).toHaveCount(4);
  // An urgent task can keep the completion notice queued beyond the break.
  await page.clock.fastForward(5 * 60 * 1000);
  await expect(panel.locator("#pomo-status")).toHaveText("Concentración activa");
  await expect(page.locator("#pet-canvas")).toHaveAttribute("data-state", "ALERT_SEMESTRE");
  await panel.getByRole("button", { name: "Descartar Sistemas: Laboratorio" }).click();
  await expect(panel.locator("#notification-list .current")).toContainText("Redes: Informe");
  await expect(page.locator("#pet-canvas")).toHaveAttribute("data-state", "ALERT_SEMESTRE");
  await panel.getByRole("button", { name: "Descartar Redes: Informe" }).click();
  await expect(panel.locator("#notification-list .current")).toContainText("SESIÓN COMPLETADA");
  await expect(panel.locator("#notification-list .current")).toContainText("Completaste tu sesión de concentración.");
  await panel.locator("#notification-list .current button").click();
  await expect(panel.locator("#notification-list .current")).toContainText("GITHUB: PR #51 MERGED");
  await expect(page.locator("#pet-canvas")).toHaveAttribute("data-state", "VICTORY_GITHUB");
});

test("Concentrarme starts the timer, celebrations restore focus and pause restores idle", async ({ page, context }) => {
  const panel = await start(page, context);
  await expect(panel.locator('[data-action="FOCUS"]')).toHaveCount(0);
  await panel.getByRole("button", { name: "Concentrarme", exact: true }).click();
  await expect(page.locator("#pet-canvas")).toHaveAttribute("data-state", "FOCUS");
  await merge(page);
  await expect(page.locator("#pet-canvas")).toHaveAttribute("data-state", "VICTORY_GITHUB");
  await expect(page.locator("#pet-canvas")).toHaveAttribute("data-state", "FOCUS", { timeout: 6500 });
  await panel.getByRole("button", { name: "Pausar", exact: true }).click();
  await expect(page.locator("#pet-canvas")).toHaveAttribute("data-state", "IDLE");
  await panel.getByRole("button", { name: "Continuar", exact: true }).click();
  await expect(page.locator("#pet-canvas")).toHaveAttribute("data-state", "FOCUS");
  await panel.getByRole("button", { name: "Reiniciar", exact: true }).click();
  await expect(page.locator("#pet-canvas")).toHaveAttribute("data-state", "IDLE");
});

test("local URL validation survives heartbeats and new owner snapshots until editing", async ({ page, context }) => {
  const panel = await start(page, context);
  await panel.click("#btn-sync-calendar");
  await expect(panel.locator("#sync-feedback")).toHaveText("Ingresa una URL de calendario.");
  // Covers the original two-second heartbeat regression.
  await panel.waitForTimeout(2500);
  await panel.click("#btn-sound-toggle");
  await expect(panel.locator("#btn-sound-toggle")).toHaveText("AUDIO: OFF");
  await expect(panel.locator("#sync-feedback")).toHaveText("Ingresa una URL de calendario.");
  await expect(panel.locator("#input-calendar-url")).toHaveAttribute("aria-invalid", "true");
  await panel.fill("#input-calendar-url", "javascript:alert(1)");
  await panel.click("#btn-sync-calendar");
  await expect(panel.locator("#sync-feedback")).toHaveText("Usa una URL HTTP, HTTPS o webcal válida.");
  await panel.fill("#input-calendar-url", "https://example.test/calendar.ics");
  await expect(panel.locator("#input-calendar-url")).toHaveAttribute("aria-invalid", "false");
  await expect(panel.locator("#sync-feedback")).not.toContainText("válida");
});

test("failed skin loading keeps the current character and shows a persistent error", async ({ page, context }) => {
  await context.route("**/skins/spiderman/manifest.json", (route) => route.fulfill({ status: 404, body: "Missing" }));
  const panel = await start(page, context);
  await panel.selectOption("#select-skin", "spiderman");
  await expect(panel.locator("#skin-error")).toBeVisible();
  await expect(panel.locator("#select-skin")).toHaveValue("spartan");
  await panel.waitForTimeout(2500);
  await expect(panel.locator("#skin-error")).toBeVisible();
  await expect(panel.locator("#char-name")).toContainText("Leónidas");
  await panel.selectOption("#select-skin", "capybara");
  await expect(panel.locator("#char-name")).toContainText("Capibara");
  await expect(panel.locator("#skin-error")).toBeHidden();
});

test("populated controller passes accessibility checks and fits narrow windows", async ({ page, context }, testInfo) => {
  const feed = calendar([{ id: "accessible", title: "[Diseño] Evaluación de interfaces", minutes: 15, url: "https://campus.example.test/tarea/2" }]);
  await context.route("**/fixtures/product.ics", (route) => route.fulfill({ body: feed, contentType: "text/calendar" }));
  const panel = await start(page, context); await sync(panel);
  await panel.fill("#input-calendar-url", ""); await panel.click("#btn-sync-calendar");
  for (const advanced of [false, true]) {
    if (advanced) await panel.locator(".advanced-controls summary").click();
    const result = await new AxeBuilder({ page: panel }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(result.violations).toEqual([]);
  }
  for (const width of [280, 390, 560]) {
    await panel.setViewportSize({ width, height: 900 });
    expect(await panel.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (const id of ["btn-sound-toggle", "btn-pin-toggle", "btn-pomo-toggle", "btn-pomo-reset", "btn-sync-calendar"]) {
      const bounds = await panel.locator(`#${id}`).boundingBox();
      expect(bounds!.height).toBeGreaterThanOrEqual(40);
      expect(bounds!.width).toBeGreaterThanOrEqual(40);
    }
    if (width === 390 || width === 560) await panel.screenshot({ path: testInfo.outputPath(`controller-${width}.png`), fullPage: true });
  }
  await panel.locator("#btn-sound-toggle").focus();
  await panel.keyboard.press("Tab");
  await expect(panel.locator("#btn-pin-toggle")).toBeFocused();
  expect(await panel.locator("#btn-pin-toggle").evaluate((button) => getComputedStyle(button).outlineStyle)).toBe("solid");
});
