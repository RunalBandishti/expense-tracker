const TINTS = [
  { card: 'bg-orange-100', stripe: 'bg-orange-400' },
  { card: 'bg-emerald-100', stripe: 'bg-emerald-500' },
  { card: 'bg-violet-100', stripe: 'bg-violet-500' },
  { card: 'bg-rose-100', stripe: 'bg-rose-400' },
  { card: 'bg-sky-100', stripe: 'bg-sky-500' },
  { card: 'bg-amber-100', stripe: 'bg-amber-400' },
] as const;

export function tripTint(id: string) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return TINTS[Math.abs(hash) % TINTS.length];
}
