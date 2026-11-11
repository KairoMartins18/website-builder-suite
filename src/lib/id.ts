/** IDs curtos e válidos como nome de classe CSS (sempre começam com letra). */
export function uid(prefix = 'x'): string {
  const rand = crypto.getRandomValues(new Uint32Array(2));
  return prefix + rand[0].toString(36) + rand[1].toString(36).slice(0, 4);
}
