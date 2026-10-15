import { test, expect, type BrowserContext, type Page } from "@playwright/test";

async function prepare(context: BrowserContext) {
  await context.route("https://api.github.com/**", (route) => route.fulfill({ json: [] }));
}
async function sprite(page: Page) {
  await page.goto("/");
  await expect.poll(() => page.locator("#pet-canvas").evaluate((canvas: HTMLCanvasElement) =>
    canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data.some((value, i) => i % 4 === 3 && value > 0)
  )).toBe(true);
}
async function controller(context: BrowserContext) {
  const page = await context.newPage();
  await page.goto("/controller.html");
  await expect(page.locator("#select-skin")).toBeEnabled();
  return page;
}

test("web startup and controller commands work without Tauri errors", async ({ page, context }) => {
  await prepare(context);
  const errors: string[] = [];
  context.on("page", (tab) => tab.on("pageerror", (error) => errors.push(error.message)));
  page.on("pageerror", (error) => errors.push(error.message));
  await sprite(page);
  const panel = await controller(context);
  await panel.selectOption("#select-skin", "spiderman");
  await expect(panel.locator("#char-name")).toContainText("Spider-Hero");
  await expect.poll(() => page.evaluate(() => localStorage.getItem("myskin_active_skin"))).toBe("spiderman");
  await panel.click("#btn-sound-toggle");
  await expect(panel.locator("#btn-sound-toggle")).toHaveText("AUDIO: OFF");
  await panel.click("#btn-pin-toggle");
  await expect(panel.locator("#btn-pin-toggle")).toHaveText("MODO: LIBRE");
  await panel.click('#btn-pomo-toggle');
  await expect(panel.locator("#status-fsm-text")).toHaveText("Estado: FOCUS");
  await panel.locator(".advanced-controls summary").click();
  await panel.click("#btn-event-semester");
  await expect(panel.locator("#status-fsm-text")).toHaveText("Estado: ALERT_SEMESTRE");
  await panel.locator("#notification-list button").first().click();
  await panel.click("#btn-event-github");
  await expect(panel.locator("#status-fsm-text")).toHaveText("Estado: VICTORY_GITHUB");
  expect(errors).toEqual([]);
});

test("Pomodoro has one owner and restores state when the panel reopens", async ({ page, context }) => {
  await prepare(context); await sprite(page);
  let panel = await controller(context);
  await panel.click("#btn-pomo-toggle");
  await expect(panel.locator("#pomo-status")).toHaveText("Concentración activa");
  await expect(panel.locator("#pomo-clock")).not.toHaveText("25:00");
  await panel.click("#btn-pomo-toggle");
  await expect(panel.locator("#pomo-status")).toHaveText("En pausa");
  const paused = await panel.locator("#pomo-clock").textContent();
  await panel.close(); panel = await controller(context);
  await expect(panel.locator("#pomo-clock")).toHaveText(paused!);
  await expect(panel.locator("#btn-pomo-toggle")).toHaveText("Continuar");
  await panel.click("#btn-pomo-toggle");
  await expect(panel.locator("#pomo-status")).toHaveText("Concentración activa");
  await panel.click("#btn-pomo-reset");
  await expect(panel.locator("#pomo-clock")).toHaveText("25:00");
  await expect(panel.locator("#pomo-status")).toHaveText("En reposo");
});

test("native-style tray events publish state back to the controller", async ({ page, context }) => {
  await prepare(context); await sprite(page); const panel = await controller(context);
  await page.evaluate(async () => {
    // @ts-expect-error Vite resolves the source URL in the browser.
    const { emit } = await import("/src/platform.ts");
    await emit("tray-action", "skin_capybara");
    await emit("tray-action", "start_pomodoro");
    await emit("tray-action", "toggle_audio");
  });
  await expect(panel.locator("#char-name")).toContainText("Capibara");
  await expect(panel.locator("#btn-pomo-toggle")).toHaveText("Pausar");
  await expect(panel.locator("#btn-sound-toggle")).toHaveText("AUDIO: OFF");
});

test("calendar requests run in the owner and empty feeds clear its data", async ({ page, context }) => {
  await prepare(context);
  const due = new Date(Date.now() + 3600000).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  let feed = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:e2e\r\nSUMMARY:[Prueba] Entrega\r\nDTSTART:${due}\r\nEND:VEVENT\r\nEND:VCALENDAR`;
  await context.route("**/fixtures/calendar.ics", (route) => route.fulfill({ body: feed, contentType: "text/calendar" }));
  await sprite(page); const panel = await controller(context);
  await panel.fill("#input-calendar-url", "http://127.0.0.1:4173/fixtures/calendar.ics");
  await panel.click("#btn-sync-calendar");
  await expect(panel.locator("#sync-feedback")).toContainText("1 entregas");
  await expect(panel.locator("#status-fsm-text")).toHaveText("Estado: ALERT_SEMESTRE");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("myskin_academic_deadlines")!)[0].title)).toBe("Entrega");
  feed = "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR";
  await panel.click("#btn-sync-calendar");
  await expect(panel.locator("#sync-feedback")).toContainText("0 entregas");
  await expect(panel.locator("#status-fsm-text")).toHaveText("Estado: IDLE");
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("myskin_academic_deadlines")!))).toEqual([]);
});

test("controller can connect when the sprite starts later", async ({ context }) => {
  await prepare(context); const panel = await context.newPage(); await panel.goto("/controller.html");
  await expect(panel.locator("#btn-pomo-toggle")).toBeDisabled();
  const main = await context.newPage(); await sprite(main);
  await expect(panel.locator("#btn-pomo-toggle")).toBeEnabled();
});
