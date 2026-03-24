/** Avoid spamming the same Supabase/schema warning on every focus. */
const seen = new Set<string>();

export function consoleWarnOnce(key: string, ...args: unknown[]) {
  if (!__DEV__) return;
  if (seen.has(key)) return;
  seen.add(key);
  console.warn(...(args as [string, ...unknown[]]));
}
