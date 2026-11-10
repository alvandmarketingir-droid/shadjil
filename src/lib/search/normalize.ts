export function normalizeSearchQuery(raw: string): string {
  return (raw || "")
    .trim()
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200d]/g, "")
    .replace(/\s+/g, " ");
}

const TYPO_MAP: [RegExp, string][] = [
  [/پیرهن/g, "آجیل"],
  [/پیرهنن/g, "آجیل"],
  [/پیراحن/g, "آجیل"],
  [/شلوارر/g, "شلوار"],
  [/تیشرت/g, "تی‌شرت"],
  [/تيشرت/g, "تی‌شرت"],
];

export function expandTypoVariants(q: string): string[] {
  const base = normalizeSearchQuery(q);
  if (!base) return [];
  const set = new Set<string>([base]);
  let fixed = base;
  for (const [re, to] of TYPO_MAP) fixed = fixed.replace(re, to);
  set.add(fixed);
  if (base.length >= 4) set.add(base.replace(/(.)\1+/g, "$1"));
  return [...set].filter(Boolean);
}
