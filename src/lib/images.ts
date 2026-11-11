/** Abre o seletor de arquivos e devolve as imagens otimizadas como data URLs. */
export function pickImages(multiple = true): Promise<string[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = multiple;
    input.onchange = async () => {
      const files = [...(input.files ?? [])];
      resolve(await Promise.all(files.map(fileToOptimizedDataUrl)));
    };
    input.click();
  });
}

const MAX_SIDE = 1920;

export async function fileToOptimizedDataUrl(file: File): Promise<string> {
  const raw = await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(file);
  });
  // SVG e GIF (animação) ficam como estão.
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return raw;
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = raw;
  });
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.naturalWidth * scale);
  canvas.height = Math.round(img.naturalHeight * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const out = canvas.toDataURL('image/webp', 0.85);
  return out.length < raw.length ? out : raw;
}

/** Imagem de exemplo (SVG local, funciona offline). */
export function placeholderImage(label = '', hue = 215): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},55%,78%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},50%,58%)"/></linearGradient></defs>
<rect width="800" height="600" fill="url(#g)"/>
<g fill="none" stroke="rgba(255,255,255,.75)" stroke-width="10" stroke-linejoin="round"><rect x="310" y="215" width="180" height="140" rx="14"/><path d="M325 340l55-60 40 40 25-25 30 45"/></g>
<circle cx="450" cy="250" r="14" fill="rgba(255,255,255,.75)"/>
${label ? `<text x="400" y="420" font-family="sans-serif" font-size="30" fill="rgba(255,255,255,.9)" text-anchor="middle">${label}</text>` : ''}
</svg>`;
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
