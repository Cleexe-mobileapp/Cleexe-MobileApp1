/** Public profile deep link (marketing domain). */
export function profileShareUrl(username: string | null | undefined): string {
  const u = String(username || 'cleexe').replace(/^@+/, '').trim() || 'cleexe';
  return `https://cleexe.com/${u}`;
}
