/** Normalize line endings and trailing whitespace for fuzzy match. */
export function normalizeText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

export function normalizeTrimLines(text: string): string {
  return normalizeText(text)
    .split("\n")
    .map((l) => l.trimEnd())
    .join("\n");
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(dp[i - 1]![j]! + 1, dp[i]![j - 1]! + 1, dp[i - 1]![j - 1]! + cost);
    }
  }
  return dp[m]![n]!;
}

export function similarity(a: string, b: string): number {
  if (!a && !b) return 1;
  const max = Math.max(a.length, b.length);
  if (max === 0) return 1;
  return 1 - levenshtein(a, b) / max;
}

export interface FuzzyReplaceResult {
  ok: boolean;
  content?: string;
  matchesFound: number;
  message: string;
  fuzzy?: boolean;
}

/** Exact then normalized replace; optional fuzzy line-block match. */
export function fuzzyReplace(
  content: string,
  oldString: string,
  newString: string,
  replaceAll = false,
): FuzzyReplaceResult {
  if (!oldString) {
    return { ok: false, matchesFound: 0, message: "old_string is empty" };
  }

  const tryReplace = (hay: string, needle: string): { count: number; result?: string } => {
    const count = hay.split(needle).length - 1;
    if (count === 0) return { count: 0 };
    if (!replaceAll && count > 1) return { count };
    const result = replaceAll ? hay.split(needle).join(newString) : hay.replace(needle, newString);
    return { count, result };
  };

  let r = tryReplace(content, oldString);
  if (r.result !== undefined) {
    return { ok: true, content: r.result, matchesFound: r.count, message: "ok" };
  }

  const normContent = normalizeTrimLines(content);
  const normOld = normalizeTrimLines(oldString);
  const normNew = normalizeTrimLines(newString);
  r = tryReplace(normContent, normOld);
  if (r.result !== undefined) {
    return {
      ok: true,
      content: r.result,
      matchesFound: r.count,
      message: "ok (normalized whitespace)",
      fuzzy: true,
    };
  }

  if (normOld.includes("\n") && r.count === 0) {
    const lines = normContent.split("\n");
    const oldLines = normOld.split("\n");
    const window = oldLines.length;
    let bestIdx = -1;
    let bestScore = 0;
    for (let i = 0; i <= lines.length - window; i++) {
      const block = lines.slice(i, i + window).join("\n");
      const score = similarity(block, normOld);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx >= 0 && bestScore >= 0.85) {
      const before = lines.slice(0, bestIdx);
      const after = lines.slice(bestIdx + window);
      const merged = [...before, ...normNew.split("\n"), ...after].join("\n");
      return {
        ok: true,
        content: merged,
        matchesFound: 1,
        message: `ok (fuzzy block match ${(bestScore * 100).toFixed(0)}%)`,
        fuzzy: true,
      };
    }
  }

  if (r.count > 1) {
    return {
      ok: false,
      matchesFound: r.count,
      message: "old_string is not unique; set replace_all or add context",
    };
  }

  return { ok: false, matchesFound: 0, message: "old_string not found" };
}
