import type { PetStateName } from "./appState";

export type SkinCategory = "all" | "mascotas" | "heroes" | "cine" | "anime" | "gaming" | "cartoons" | "deportes";

export interface SkinItem {
  id: string;
  name: string;
  detail: string;
  color: string;
  category: SkinCategory;
}

export const skinCatalog: readonly SkinItem[] = [
  // Mascotas y Vida
  { id: "capybara", name: "Capibara", detail: "Un paso a la vez.", color: "#d8b381", category: "mascotas" },
  { id: "labrador-retriever", name: "Labrador", detail: "Compañero leal y alegre.", color: "#e4b370", category: "mascotas" },
  { id: "little-girl", name: "Lily", detail: "Curiosa y aplicada.", color: "#f5a7b8", category: "mascotas" },

  // Superhéroes
  { id: "spiderman", name: "Spider-Hero", detail: "Tu sentido del foco.", color: "#ee9d9b", category: "heroes" },
  { id: "captain-america", name: "Capitán América", detail: "Disciplina inquebrantable.", color: "#3b82f6", category: "heroes" },
  { id: "iron-man", name: "Iron Man", detail: "Ingenio tecnológico al máximo.", color: "#e23e57", category: "heroes" },
  { id: "thor-odinson", name: "Thor Odinson", detail: "El poder del trueno.", color: "#3a9691", category: "heroes" },

  // Cine y Fantasía
  { id: "harry-potter", name: "Harry Potter", detail: "Enfocado en la Snitch Dorada.", color: "#be3144", category: "cine" },
  { id: "lord-voldemort", name: "Lord Voldemort", detail: "Determinación solemne.", color: "#687980", category: "cine" },
  { id: "fantasy-wizard", name: "Mago", detail: "Haz espacio a la magia.", color: "#ccb6e9", category: "cine" },
  { id: "spartan", name: "Leónidas", detail: "Disciplina para tu día.", color: "#f0ac95", category: "cine" },
  { id: "astro-lost", name: "Astronauta", detail: "Explora lo que sigue.", color: "#dfcc95", category: "cine" },

  // Anime
  { id: "cyber-ninja", name: "Cyber Ninja", detail: "Entra en tu zona.", color: "#beaee8", category: "anime" },
  { id: "son-goku", name: "Son Goku", detail: "Supera cada límite.", color: "#f97316", category: "anime" },
  { id: "vegeta-prince", name: "Príncipe Vegeta", detail: "Orgullo y disciplina Saiyajin.", color: "#1d4ed8", category: "anime" },
  { id: "naruto-uzumaki", name: "Naruto Uzumaki", detail: "Camino ninja sin rendirse.", color: "#f59e0b", category: "anime" },
  { id: "monkey-d-luffy", name: "Monkey D. Luffy", detail: "Rumbo al Rey de los Desarrolladores.", color: "#dc2626", category: "anime" },
  { id: "roronoa-zoro", name: "Roronoa Zoro", detail: "Corte certero a cada tarea.", color: "#10b981", category: "anime" },
  { id: "satoru-gojo", name: "Satoru Gojo", detail: "Vacío Infinito contra distracciones.", color: "#38bdf8", category: "anime" },
  { id: "tanjiro-kamado", name: "Tanjiro Kamado", detail: "Respiración de concentración total.", color: "#059669", category: "anime" },
  { id: "nezuko-kamado", name: "Nezuko Kamado", detail: "Compañera leal y protectora.", color: "#ec4899", category: "anime" },
  { id: "saitama-hero", name: "Saitama", detail: "Resuelve de un solo golpe.", color: "#eab308", category: "anime" },
  { id: "levi-ackerman", name: "Capitán Levi", detail: "Cero suciedad, precisión letal.", color: "#475569", category: "anime" },

  // Videojuegos
  { id: "dev-avatar", name: "Tu avatar", detail: "Tu siguiente gran idea.", color: "#9bd3d2", category: "gaming" },
  { id: "ghost-dev", name: "Dev fantasma", detail: "Código con compañía.", color: "#bbcee8", category: "gaming" },
  { id: "game-slime", name: "Slime", detail: "Pequeños pasos suman.", color: "#b7dc94", category: "gaming" },

  // Cartoons
  { id: "bugs-bunny", name: "Bugs Bunny", detail: "¿Qué hay de nuevo, viejo?", color: "#a3b1c6", category: "cartoons" },

  // Deportes
  { id: "football-10", name: "Futbolista 10", detail: "Una tarea, un gol.", color: "#a9cce8", category: "deportes" },
  { id: "neymar-jr", name: "Neymar Jr.", detail: "Magia y foco en cada jugada.", color: "#fed136", category: "deportes" },
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
