import type { PublicJournalPost } from '@/src/components/profile/PostsGrid';

/** Display / sort date: support Cleexe `date` or legacy / minimal schemas (timestamps only). */
function pickJournalDate(row: Record<string, unknown>): string {
  const v =
    row.date ??
    row.journal_date ??
    row.entry_date ??
    row.posted_at ??
    row.created_at;
  return v != null && String(v).length > 0 ? String(v) : '';
}

/** Coerce unknown media column shapes from different DB schemas into `media_url[] | null`. */
function coerceMediaUrls(row: Record<string, unknown>): string[] | null {
  const candidates = [
    row.media_url,
    row.media_urls,
    row.images,
    row.image_urls,
    row.attachments,
  ];
  for (const c of candidates) {
    if (c == null) continue;
    if (Array.isArray(c)) {
      const urls = c.filter((x): x is string => typeof x === 'string' && x.length > 0);
      return urls.length ? urls : null;
    }
    if (typeof c === 'string' && c.length > 0) return [c];
  }
  return null;
}

/** Map a PostgREST row (select '*') to the grid shape; works if `media_url` column is missing. */
export function normalizeJournalRow(row: Record<string, unknown>): PublicJournalPost {
  const created = row.created_at != null ? String(row.created_at) : '';
  const displayDate = pickJournalDate(row) || created;
  return {
    id: String(row.id ?? ''),
    content: String(row.content ?? ''),
    media_url: coerceMediaUrls(row),
    date: displayDate,
    created_at: created || displayDate,
  };
}
