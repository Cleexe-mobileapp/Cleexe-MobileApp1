import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

function LoopingRemoteVideo({ uri, style }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
    p.play();
  });
  return (
    <VideoView
      player={player}
      style={style}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

export default function CircleVideoPreview({ size = 48, videoUrl, name, isPremium }) {
  const [playing, setPlaying] = useState(false);

  if (!videoUrl) return null;

  const handlePlay = () => {
    if (!isPremium && !videoUrl.startsWith('dummy')) {
      setPlaying(true);
      return;
    }
    setPlaying(true);
  };

  return (
    <>
      <Pressable
        style={[styles.thumb, { width: size, height: size, borderRadius: size / 2 }]}
        onPress={handlePlay}
      >
        <View style={[styles.thumbInner, { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 }]}>
          <Text style={[styles.playIcon, { fontSize: size * 0.35 }]}>▶</Text>
        </View>
        <View style={[styles.videoBadge, { bottom: -2, right: -2 }]}>
          <Text style={styles.videoBadgeText}>🎬</Text>
        </View>
      </Pressable>

      <Modal visible={playing} animationType="fade" transparent>
        <Pressable style={styles.playerOverlay} onPress={() => setPlaying(false)}>
          <View style={styles.playerContainer}>
            <View style={styles.playerCircle}>
              {videoUrl && !videoUrl.startsWith('dummy') ? (
                <LoopingRemoteVideo uri={videoUrl} style={styles.playerVideo} />
              ) : (
                <View style={styles.playerPlaceholder}>
                  <Text style={{ fontSize: 48 }}>🎬</Text>
                  <Text style={styles.playerName}>{name}</Text>
                  <Text style={styles.playerHint}>Video intro</Text>
                </View>
              )}
            </View>
            <Text style={styles.playerClose}>Tap anywhere to close</Text>
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const PLAYER_SIZE = 280;

const styles = StyleSheet.create({
  thumb: {
    borderWidth: 2.5,
    borderColor: '#6B4EFF',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A2E',
    position: 'relative',
  },
  thumbInner: {
    backgroundColor: 'rgba(107,78,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: { color: '#FFFFFF', marginLeft: 2 },
  videoBadge: {
    position: 'absolute',
    backgroundColor: '#FFFFFF',
    borderRadius: 999,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  videoBadgeText: { fontSize: 10 },

  playerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerContainer: { alignItems: 'center' },
  playerCircle: {
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    borderRadius: PLAYER_SIZE / 2,
    borderWidth: 3,
    borderColor: '#6B4EFF',
    overflow: 'hidden',
    backgroundColor: '#1A1A2E',
  },
  playerVideo: { width: PLAYER_SIZE, height: PLAYER_SIZE },
  playerPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerName: { color: '#FFFFFF', fontSize: 18, fontWeight: '700', marginTop: 12 },
  playerHint: { color: '#9CA3AF', fontSize: 13, marginTop: 4 },
  playerClose: { color: '#9CA3AF', fontSize: 13, marginTop: 20, fontWeight: '500' },
});
