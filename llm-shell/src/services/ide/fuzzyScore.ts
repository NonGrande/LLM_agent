/** Subsequence + prefix bonus for palette / quick open filtering. */
export function fuzzyScore(query: string, label: string): number {
  const q = query.trim().toLowerCase();
  const l = label.toLowerCase();
  if (!q) return 1;
  if (l === q) return 1000;
  if (l.startsWith(q)) return 900 - l.length * 0.01;
  const idx = l.indexOf(q);
  if (idx >= 0) return 800 - idx;

  let qi = 0;
  let score = 0;
  let lastMatch = -1;
  for (let i = 0; i < l.length && qi < q.length; i++) {
    if (l[i] === q[qi]) {
      score += lastMatch === i - 1 ? 12 : 6;
      if (i === 0 || /[/\\._-]/.test(l[i - 1] ?? "")) score += 8;
      lastMatch = i;
      qi += 1;
    }
  }
  return qi === q.length ? score : 0;
}

export function rankByQuery<T>(items: T[], query: string, labelOf: (item: T) => string): T[] {
  if (!query.trim()) return items;
  return [...items]
    .map((item) => ({ item, score: fuzzyScore(query, labelOf(item)) }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.item);
}
