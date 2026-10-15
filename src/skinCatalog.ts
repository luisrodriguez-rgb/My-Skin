import type { PetStateName } from "./appState";

export const skinCatalog = [
  { id: "capybara", name: "Capibara", detail: "Un paso a la vez.", color: "#d8b381" },
  { id: "spartan", name: "Leónidas", detail: "Disciplina para tu día.", color: "#f0ac95" },
  { id: "spiderman", name: "Spider-Hero", detail: "Tu sentido del foco.", color: "#ee9d9b" },
  { id: "dev-avatar", name: "Tu avatar", detail: "Tu siguiente gran idea.", color: "#9bd3d2" },
  { id: "ghost-dev", name: "Dev fantasma", detail: "Código con compañía.", color: "#bbcee8" },
  { id: "football-10", name: "Futbolista 10", detail: "Una tarea, un gol.", color: "#a9cce8" },
  { id: "cyber-ninja", name: "Cyber Ninja", detail: "Entra en tu zona.", color: "#beaee8" },
  { id: "fantasy-wizard", name: "Mago", detail: "Haz espacio a la magia.", color: "#ccb6e9" },
  { id: "game-slime", name: "Slime", detail: "Pequeños pasos suman.", color: "#b7dc94" },
  { id: "astro-lost", name: "Astronauta", detail: "Explora lo que sigue.", color: "#dfcc95" },
] as const;

interface PreviewAsset {
  image: HTMLImageElement;
  manifest: { frameWidth: number; frameHeight: number; states: Record<PetStateName, { row: number }> };
}
const previews = new Map<string, Promise<PreviewAsset>>();
export function loadPreview(skin: string): Promise<PreviewAsset> {
  const cached = previews.get(skin);
  if (cached) return cached;
  const request = (async () => {
    const response = await fetch(`/skins/${skin}/manifest.json`);
    if (!response.ok) throw new Error("No se pudo cargar la vista previa.");
    const manifest = await response.json() as PreviewAsset["manifest"];
    const image = new Image();
    const ready = new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = reject; });
    image.src = `/skins/${skin}/spritesheet.png`;
    await ready;
    return { image, manifest };
  })();
  previews.set(skin, request);
  void request.catch(() => previews.delete(skin));
  return request;
}
export function drawPreview(canvas: HTMLCanvasElement, asset: PreviewAsset, state: PetStateName = "IDLE") {
  const { frameWidth, frameHeight, states } = asset.manifest;
  const context = canvas.getContext("2d")!;
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.imageSmoothingEnabled = false;
  context.drawImage(asset.image, 0, (states[state] ?? states.IDLE).row * frameHeight,
    frameWidth, frameHeight, 0, 0, canvas.width, canvas.height);
}
