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
  { id: "cat-mystic", name: "Gato Negro", detail: "Pasos sigilosos y calma reconfortante.", color: "#8b5cf6", category: "mascotas" },
  { id: "shiba-inu", name: "Shiba Inu", detail: "Guardián leal y sonrisa amistosa.", color: "#f59e0b", category: "mascotas" },
  { id: "panda-zen", name: "Panda Zen", detail: "Paz mental y cero estrés.", color: "#10b981", category: "mascotas" },
  { id: "arctic-penguin", name: "Pingüino Antártico", detail: "Deslízate sobre cada entrega.", color: "#0ea5e9", category: "mascotas" },

  // Superhéroes
  { id: "spiderman", name: "Spider-Hero", detail: "Tu sentido del foco.", color: "#ee9d9b", category: "heroes" },
  { id: "captain-america", name: "Capitán América", detail: "Disciplina inquebrantable.", color: "#3b82f6", category: "heroes" },
  { id: "iron-man", name: "Iron Man", detail: "Ingenio tecnológico al máximo.", color: "#e23e57", category: "heroes" },
  { id: "thor-odinson", name: "Thor Odinson", detail: "El poder del trueno.", color: "#3a9691", category: "heroes" },
  { id: "batman-detective", name: "Batman", detail: "Estrategia y disciplina en las sombras.", color: "#475569", category: "heroes" },
  { id: "superman-man-of-steel", name: "Superman", detail: "Nobleza y poder para cada desafío.", color: "#2563eb", category: "heroes" },

  // Cine y Fantasía
  { id: "harry-potter", name: "Harry Potter", detail: "Enfocado en la Snitch Dorada.", color: "#be3144", category: "cine" },
  { id: "lord-voldemort", name: "Lord Voldemort", detail: "Determinación solemne.", color: "#687980", category: "cine" },
  { id: "fantasy-wizard", name: "Mago", detail: "Haz espacio a la magia.", color: "#ccb6e9", category: "cine" },
  { id: "spartan", name: "Leónidas", detail: "Disciplina para tu día.", color: "#f0ac95", category: "cine" },
  { id: "astro-lost", name: "Astronauta", detail: "Explora lo que sigue.", color: "#dfcc95", category: "cine" },
  { id: "darth-vader", name: "Darth Vader", detail: "Dominio imperial de la productividad.", color: "#334155", category: "cine" },
  { id: "master-yoda", name: "Maestro Yoda", detail: "Hacer o no hacer, no hay intentar.", color: "#84cc16", category: "cine" },
  { id: "gandalf-grey", name: "Gandalf el Gris", detail: "Sabiduría y luz en cada entrega.", color: "#94a3b8", category: "cine" },

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
  { id: "super-mario", name: "Super Mario", detail: "Here we go! Al siguiente nivel.", color: "#ef4444", category: "gaming" },
  { id: "link-hero", name: "Link (Héroe del Tiempo)", detail: "Espada Maestra y concentración.", color: "#22c55e", category: "gaming" },
  { id: "pikachu-electric", name: "Pikachu", detail: "Energía eléctrica para tu jornada.", color: "#facc15", category: "gaming" },
  { id: "sonic-hedgehog", name: "Sonic the Hedgehog", detail: "Resolución a la velocidad del sonido.", color: "#3b82f6", category: "gaming" },
  { id: "kirby-dream", name: "Kirby", detail: "Inhala distracciones, exhala foco.", color: "#f472b6", category: "gaming" },
  { id: "mega-man-blue", name: "Mega Man", detail: "Precisión de Buster y disciplina robótica.", color: "#06b6d4", category: "gaming" },
  { id: "master-chief-117", name: "Master Chief", detail: "Misión prioritaria, foco inquebrantable.", color: "#4d7c0f", category: "gaming" },
  { id: "kratos-war", name: "Kratos", detail: "Hacha en mano, cero excusas.", color: "#b91c1c", category: "gaming" },
  { id: "sans-undertale", name: "Sans el Esqueleto", detail: "Sonrisa relajada y foco inesperado.", color: "#60a5fa", category: "gaming" },
  { id: "steve-craft", name: "Steve", detail: "Bloque a bloque, construyendo logros.", color: "#0ea5e9", category: "gaming" },

  // Cartoons
  { id: "bugs-bunny", name: "Bugs Bunny", detail: "¿Qué hay de nuevo, viejo?", color: "#a3b1c6", category: "cartoons" },
  { id: "spongebob-square", name: "Bob Esponja", detail: "¡Estoy listo! Pasión y foco alegre.", color: "#facc15", category: "cartoons" },
  { id: "rick-sanchez", name: "Rick Sanchez", detail: "Soluciones científicas interdimensionales.", color: "#38bdf8", category: "cartoons" },

  // Deportes
  { id: "football-10", name: "Futbolista 10", detail: "Una tarea, un gol.", color: "#a9cce8", category: "deportes" },
  { id: "neymar-jr", name: "Neymar Jr.", detail: "Magia y foco en cada jugada.", color: "#fed136", category: "deportes" },
  { id: "lionel-messi", name: "Lionel Messi", detail: "Magia y precisión hacia el cielo.", color: "#38bdf8", category: "deportes" },
  { id: "cristiano-cr7", name: "Cristiano Ronaldo", detail: "Disciplina y mentalidad Siuuu.", color: "#ef4444", category: "deportes" },
  { id: "michael-jordan-23", name: "Michael Jordan", detail: "Vuelo legendario hacia la meta.", color: "#dc2626", category: "deportes" },
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
