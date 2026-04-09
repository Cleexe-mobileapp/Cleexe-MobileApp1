import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthSession } from '@/src/context/AuthSessionProvider';
import { supabase } from '@/src/services/supabase';

type Row = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
};

const PURPLE = '#6B4EFF';

type Mode = 'followers' | 'following';

export default function FollowListScreen({ mode }: { mode: Mode }) {
  const router = useRouter();
  const { session } = useAuthSession();
  const { userId: paramUserId } = useLocalSearchParams<{ userId?: string | string[] }>();
  const param =
    paramUserId == null ? undefined : Array.isArray(paramUserId) ? paramUserId[0] : paramUserId;

  const targetUserId = param || session?.user?.id || '';
  const title = mode === 'followers' ? 'Heard' : 'Hears';

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!targetUserId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      if (mode === 'followers') {
        const { data: follows, error } = await supabase
          .from('follows')
          .select('follower_id')
          .eq('followed_id', targetUserId);

        if (error) {
          console.warn('followers_load:', error.message);
          setRows([]);
          return;
        }
        const ids = (follows ?? []).map((f) => f.follower_id).filter(Boolean);
        if (!ids.length) {
          setRows([]);
          return;
        }
        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio')
          .in('id', ids);
        if (pErr) {
          console.warn('followers_profiles:', pErr.message);
          setRows([]);
          return;
        }
        setRows((profiles as Row[]) ?? []);
      } else {
        const { data: follows, error } = await supabase
          .from('follows')
          .select('followed_id')
          .eq('follower_id', targetUserId);

        if (error) {
          console.warn('following_load:', error.message);
          setRows([]);
          return;
        }
        const ids = (follows ?? []).map((f) => f.followed_id).filter(Boolean);
        if (!ids.length) {
          setRows([]);
          return;
        }
        const { data: profiles, error: pErr } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, bio')
          .in('id', ids);
        if (pErr) {
          console.warn('following_profiles:', pErr.message);
          setRows([]);
          return;
        }
        setRows((profiles as Row[]) ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [mode, targetUserId]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={({ pressed }) => pressed && styles.backPressed}>
          <Ionicons name="chevron-back" size={26} color="#111827" />
        </Pressable>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={PURPLE} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {mode === 'followers' ? 'No heard yet.' : 'No hears yet.'}
            </Text>
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <View style={styles.avatar}>
                {item.avatar_url ? (
                  <Image source={{ uri: item.avatar_url }} style={styles.avatarImg} contentFit="cover" />
                ) : (
                  <Ionicons name="person" size={22} color="#9CA3AF" />
                )}
              </View>
              <View style={styles.rowText}>
                <Text style={styles.username}>@{item.username}</Text>
                {item.bio ? (
                  <Text style={styles.bio} numberOfLines={2}>
                    {item.bio}
                  </Text>
                ) : null}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backPressed: { opacity: 0.5 },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#111827' },
  headerSpacer: { width: 34 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 40 },
  empty: { textAlign: 'center', color: '#9CA3AF', marginTop: 40, fontSize: 15 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  rowText: { flex: 1 },
  username: { fontSize: 16, fontWeight: '700', color: '#111827' },
  bio: { fontSize: 13, color: '#6B7280', marginTop: 2, lineHeight: 18 },
});
