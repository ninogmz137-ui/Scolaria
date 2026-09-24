/**
 * Couleurs : conversion #RRGGBB → rgba() avec opacité.
 *
 * Pour un dégradé vers la transparence, TOUJOURS garder la même couleur RGB et ne faire varier que
 * l'opacité (rgba(c, 1) → rgba(c, 0)). Ne jamais finir sur 'transparent' (= rgba(0,0,0,0)) : sur
 * Android, l'interpolation passe alors par du gris sombre.
 */
export function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6);
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r},${g},${b},${Math.round(a * 1000) / 1000})`;
}
