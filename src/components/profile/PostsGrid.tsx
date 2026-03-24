import { Image } from 'expo-image';
import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

export type PublicJournalPost = {
  id: string;
  content: string;
  media_url: string[] | null;
  date: string;
  created_at: string;
};

function formatPostDate(isoDate: string): string {
  try {
    const d = new Date(isoDate.includes('T') ? isoDate : `${isoDate}T12:00:00`);
    if (Number.isNaN(d.getTime())) return isoDate;
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${mm}.${dd}.${yyyy}`;
  } catch {
    return isoDate;
  }
}

function previewText(content: string, max = 52): string {
  const t = content.replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max).trim()}…`;
}

type Props = {
  posts: PublicJournalPost[];
  loading?: boolean;
  onOpenPost?: (post: PublicJournalPost) => void;
};

export default function PostsGrid({ posts, loading, onOpenPost }: Props) {
  const pairs = useMemo(() => {
    const rows: PublicJournalPost[][] = [];
    for (let i = 0; i < posts.length; i += 2) {
      rows.push(posts.slice(i, i + 2));
    }
    return rows;
  }, [posts]);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#6B4EFF" />
      </View>
    );
  }

  if (!posts.length) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyTitle}>No public posts yet</Text>
        <Text style={styles.emptySub}>
          When you share journal entries publicly, they&apos;ll show up here in your Flow.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.grid}>
      {pairs.map((row) => (
        <View key={row.map((p) => p.id).join('-')} style={styles.row}>
          {row.map((post) => {
            const thumb = post.media_url?.[0];
            return (
              <Pressable
                key={post.id}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => onOpenPost?.(post)}
              >
                <View style={styles.thumbWrap}>
                  {thumb ? (
                    <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />
                  ) : (
                    <View style={styles.thumbPlaceholder}>
                      <Text style={styles.thumbPlaceholderText}>✦</Text>
                    </View>
                  )}
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.preview} numberOfLines={3}>
                    {previewText(post.content)}
                  </Text>
                  <Text style={styles.date}>{formatPostDate(post.date)}</Text>
                </View>
              </Pressable>
            );
          })}
          {row.length === 1 ? <View style={[styles.card, styles.cardSpacer]} /> : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  loader: { paddingVertical: 32, alignItems: 'center' },
  empty: {
    paddingVertical: 24,
    paddingHorizontal: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: '#374151', marginBottom: 6 },
  emptySub: { fontSize: 13, color: '#6B7280', lineHeight: 19 },
  grid: { gap: 12 },
  row: { flexDirection: 'row', gap: 12 },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8E8ED',
    overflow: 'hidden',
    minHeight: 120,
  },
  cardSpacer: { borderWidth: 0, backgroundColor: 'transparent' },
  cardPressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  thumbWrap: {
    width: '100%',
    height: 88,
    backgroundColor: '#F3F4F6',
  },
  thumb: { width: '100%', height: '100%' },
  thumbPlaceholder: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  thumbPlaceholderText: { fontSize: 22, color: '#C4B5FD' },
  cardBody: { padding: 10 },
  preview: { fontSize: 13, fontWeight: '500', color: '#1F2937', lineHeight: 18 },
  date: { fontSize: 11, color: '#9CA3AF', marginTop: 8, fontWeight: '500' },
});
