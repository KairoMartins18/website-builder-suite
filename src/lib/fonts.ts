export interface FontDef {
  name: string;
  category: 'sans-serif' | 'serif' | 'display' | 'handwriting';
  /** Pesos solicitados ao Google Fonts (precisam existir na família). */
  weights: number[];
}

export const FONTS: FontDef[] = [
  { name: 'Inter', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800] },
  { name: 'Roboto', category: 'sans-serif', weights: [300, 400, 500, 700, 900] },
  { name: 'Open Sans', category: 'sans-serif', weights: [300, 400, 600, 700, 800] },
  { name: 'Montserrat', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800] },
  { name: 'Poppins', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800] },
  { name: 'Lato', category: 'sans-serif', weights: [300, 400, 700, 900] },
  { name: 'Raleway', category: 'sans-serif', weights: [300, 400, 500, 600, 700, 800] },
  { name: 'Nunito', category: 'sans-serif', weights: [300, 400, 600, 700, 800] },
  { name: 'Work Sans', category: 'sans-serif', weights: [300, 400, 500, 600, 700] },
  { name: 'DM Sans', category: 'sans-serif', weights: [300, 400, 500, 700] },
  { name: 'Space Grotesk', category: 'sans-serif', weights: [300, 400, 500, 600, 700] },
  { name: 'Oswald', category: 'sans-serif', weights: [300, 400, 500, 600, 700] },
  { name: 'Playfair Display', category: 'serif', weights: [400, 500, 600, 700, 800] },
  { name: 'Merriweather', category: 'serif', weights: [300, 400, 700, 900] },
  { name: 'Lora', category: 'serif', weights: [400, 500, 600, 700] },
  { name: 'Cormorant Garamond', category: 'serif', weights: [300, 400, 500, 600, 700] },
  { name: 'Libre Baskerville', category: 'serif', weights: [400, 700] },
  { name: 'Bebas Neue', category: 'display', weights: [400] },
  { name: 'Abril Fatface', category: 'display', weights: [400] },
  { name: 'Pacifico', category: 'handwriting', weights: [400] },
  { name: 'Dancing Script', category: 'handwriting', weights: [400, 500, 600, 700] },
];

const byName = new Map(FONTS.map((f) => [f.name, f]));

export function fontStack(name: string): string {
  const def = byName.get(name);
  const fallback = def?.category === 'serif' ? 'Georgia, serif' : 'system-ui, sans-serif';
  return `'${name}', ${fallback}`;
}

export function googleFontsUrl(names: Iterable<string>): string | null {
  const families: string[] = [];
  for (const name of new Set(names)) {
    const def = byName.get(name);
    if (!def) continue;
    const fam = def.name.replace(/ /g, '+');
    families.push(def.weights.length > 1 ? `family=${fam}:wght@${def.weights.join(';')}` : `family=${fam}`);
  }
  if (!families.length) return null;
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}
