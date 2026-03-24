import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { VideoView, useVideoPlayer } from 'expo-video';

import { supabase } from '../services/supabase';

const { width: SCREEN_W } = Dimensions.get('window');
const CIRCLE_SIZE = SCREEN_W * 0.7;
const MAX_DURATION = 30;
const MIN_DURATION = 5;

let CameraView = null;

try {
  const cam = require('expo-camera');
  CameraView = cam.CameraView;
} catch (_e) { /* expo-camera not installed */ }

function RecordedVideoPreview({ uri, style }) {
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

export default function VideoIntroRecorder({ visible, onClose, onVideoSaved, isPremium }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [facing, setFacing] = useState('front');

  const cameraRef = useRef(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (visible && CameraView) {
      (async () => {
        try {
          const { Camera } = require('expo-camera');
          const { status } = await Camera.requestCameraPermissionsAsync();
          const { status: micStatus } = await Camera.requestMicrophonePermissionsAsync();
          setHasPermission(status === 'granted' && micStatus === 'granted');
        } catch (_e) {
          setHasPermission(false);
        }
      })();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      setRecordedUri(null);
      setElapsed(0);
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [visible]);

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    if (cameraRef.current) {
      try { cameraRef.current.stopRecording(); } catch { /* ignore */ }
    }
  }, []);

  const startRecording = useCallback(async () => {
    if (!cameraRef.current) return;
    setIsRecording(true);
    setElapsed(0);

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        if (prev >= MAX_DURATION - 1) {
          stopRecording();
          return MAX_DURATION;
        }
        return prev + 1;
      });
    }, 1000);

    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: MAX_DURATION });
      if (video?.uri) setRecordedUri(video.uri);
    } catch (err) {
      console.warn('Record error:', err);
    }
  }, [stopRecording]);

  const handleReRecord = () => {
    setRecordedUri(null);
    setElapsed(0);
  };

  const handleUploadAndSave = async () => {
    if (!recordedUri) return;
    setUploading(true);

    try {
      if (!supabase) throw new Error('Supabase not configured');

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData?.user?.id;
      if (!userId) throw new Error('Not authenticated');

      const fileName = `${userId}/intro_${Date.now()}.mp4`;
      const response = await fetch(recordedUri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('video-intros')
        .upload(fileName, blob, { contentType: 'video/mp4', upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('video-intros')
        .getPublicUrl(fileName);

      const videoUrl = urlData?.publicUrl || null;

      await supabase.auth.updateUser({
        data: { video_intro_url: videoUrl, video_intro_at: new Date().toISOString() },
      });

      try {
        await supabase.from('profiles').update({
          video_intro_url: videoUrl,
          video_intro_at: new Date().toISOString(),
        }).eq('id', userId);
      } catch (_e) { /* profiles table may not exist */ }

      onVideoSaved?.(videoUrl);
      Alert.alert('Video Saved! 🎬', 'Your intro video is now visible to matches.');
      onClose();
    } catch (err) {
      console.warn('Upload error:', err);
      Alert.alert('Upload Failed', 'Could not upload video. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSkip = () => {
    if (isPremium) {
      Alert.alert(
        'Skip Video?',
        'Profiles with video intros get 4x more matches. Are you sure?',
        [
          { text: 'Add Video', style: 'cancel' },
          { text: 'Skip', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  if (!CameraView) {
    return (
      <Modal visible={visible} animationType="slide" transparent>
        <View style={styles.overlay}>
          <View style={styles.fallbackSheet}>
            <View style={styles.handle} />
            <Text style={styles.fallbackEmoji}>🎬</Text>
            <Text style={styles.fallbackTitle}>Video Intro</Text>
            <Text style={styles.fallbackDesc}>
              Record a 15-30 second intro video so your matches can see the real you.
              {'\n\n'}Camera module will be available in the next build.
            </Text>

            <View style={styles.fallbackPreview}>
              <View style={styles.fallbackCircle}>
                <Text style={{ fontSize: 40 }}>📹</Text>
              </View>
              <Text style={styles.fallbackHint}>Circle video preview</Text>
            </View>

            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={() => {
                Alert.alert(
                  'Coming Soon',
                  'Install expo-camera and expo-video for full video recording.\n\nnpx expo install expo-camera expo-video'
                );
                onClose();
              }}
            >
              <Text style={styles.primaryBtnText}>Record Intro (15-30s)</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]}
              onPress={handleSkip}
            >
              <Text style={styles.skipBtnText}>Skip for now</Text>
            </Pressable>

            {isPremium && (
              <View style={styles.premiumNudge}>
                <Text style={styles.premiumNudgeText}>
                  ✦ PRO: Video intros get 4x more matches and priority placement
                </Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide">
      <View style={styles.cameraContainer}>
        {/* Camera or Preview */}
        {!recordedUri ? (
          <>
            {hasPermission === false && (
              <View style={styles.permDenied}>
                <Text style={styles.permDeniedText}>Camera permission is required to record your intro.</Text>
                <Pressable style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]} onPress={onClose}>
                  <Text style={styles.primaryBtnText}>Go Back</Text>
                </Pressable>
              </View>
            )}
            {hasPermission && (
              <View style={styles.cameraWrapper}>
                <CameraView
                  ref={cameraRef}
                  style={StyleSheet.absoluteFill}
                  facing={facing}
                  mode="video"
                />
                {/* Circle Mask Overlay */}
                <View style={styles.maskOverlay}>
                  <View style={styles.circleCutout} />
                </View>
              </View>
            )}
          </>
        ) : (
          <View style={styles.previewWrapper}>
            <RecordedVideoPreview uri={recordedUri} style={styles.previewVideo} />
            <View style={styles.maskOverlay}>
              <View style={styles.circleCutout} />
            </View>
          </View>
        )}

        {/* Controls */}
        <View style={styles.controls}>
          {!recordedUri ? (
            <>
              {/* Timer */}
              <Text style={styles.timer}>
                {isRecording ? `${elapsed}s / ${MAX_DURATION}s` : `Tap to record (${MIN_DURATION}-${MAX_DURATION}s)`}
              </Text>

              <View style={styles.controlRow}>
                <Pressable style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]} onPress={onClose}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </Pressable>

                <Pressable
                  style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
                  onPress={isRecording ? stopRecording : startRecording}
                >
                  <View style={[styles.recordInner, isRecording && styles.recordInnerActive]} />
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.flipBtn, pressed && styles.pressed]}
                  onPress={() => setFacing((f) => f === 'front' ? 'back' : 'front')}
                >
                  <Text style={styles.flipBtnText}>🔄</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.timer}>Preview your intro</Text>
              <View style={styles.controlRow}>
                <Pressable
                  style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
                  onPress={handleReRecord}
                >
                  <Text style={styles.secondaryBtnText}>🔄 Re-record</Text>
                </Pressable>

                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, uploading && styles.primaryBtnDisabled, pressed && styles.pressed]}
                  onPress={handleUploadAndSave}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.primaryBtnText}>✅ Save Intro</Text>
                  )}
                </Pressable>
              </View>

              <Pressable style={({ pressed }) => [styles.skipBtn, pressed && styles.pressed]} onPress={handleSkip}>
                <Text style={styles.skipBtnText}>Skip for now</Text>
              </Pressable>
            </>
          )}
        </View>

        {isPremium && !recordedUri && (
          <View style={styles.premiumNudge}>
            <Text style={styles.premiumNudgeText}>
              ✦ PRO: Video intros get priority placement in matching
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pressed: { opacity: 0.75, transform: [{ scale: 0.97 }] },

  /* Fallback (no expo-camera) */
  fallbackSheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, alignItems: 'center' },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', marginBottom: 20 },
  fallbackEmoji: { fontSize: 40, marginBottom: 8 },
  fallbackTitle: { fontSize: 22, fontWeight: '800', color: '#111827', marginBottom: 8 },
  fallbackDesc: { fontSize: 14, color: '#6B7280', textAlign: 'center', lineHeight: 21, marginBottom: 24 },
  fallbackPreview: { alignItems: 'center', marginBottom: 24 },
  fallbackCircle: {
    width: CIRCLE_SIZE * 0.5,
    height: CIRCLE_SIZE * 0.5,
    borderRadius: CIRCLE_SIZE * 0.25,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#6B4EFF',
    marginBottom: 8,
  },
  fallbackHint: { fontSize: 12, color: '#9CA3AF', fontWeight: '500' },

  /* Camera */
  cameraContainer: { flex: 1, backgroundColor: '#000000' },
  cameraWrapper: { flex: 1, position: 'relative' },
  previewWrapper: { flex: 1, position: 'relative' },
  previewVideo: { ...StyleSheet.absoluteFillObject },
  previewFallback: { flex: 1, backgroundColor: '#1A1A2E', alignItems: 'center', justifyContent: 'center' },
  previewFallbackText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginTop: 12 },

  /* Circle mask */
  maskOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCutout: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    backgroundColor: 'transparent',
  },

  permDenied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  permDeniedText: { color: '#FFFFFF', fontSize: 16, textAlign: 'center', marginBottom: 24, lineHeight: 24 },

  /* Controls */
  controls: { paddingHorizontal: 24, paddingBottom: Platform.OS === 'ios' ? 50 : 30, paddingTop: 16, backgroundColor: 'rgba(0,0,0,0.6)' },
  timer: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center', marginBottom: 16 },
  controlRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28 },

  recordBtn: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' },
  recordBtnActive: { borderColor: '#EF4444' },
  recordInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#EF4444' },
  recordInnerActive: { width: 28, height: 28, borderRadius: 6, backgroundColor: '#EF4444' },

  closeBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  closeBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  flipBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  flipBtnText: { fontSize: 20 },

  primaryBtn: { backgroundColor: '#6B4EFF', borderRadius: 999, paddingHorizontal: 28, paddingVertical: 14, alignItems: 'center' },
  primaryBtnDisabled: { backgroundColor: '#9CA3AF' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  secondaryBtn: { backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 999, paddingHorizontal: 20, paddingVertical: 14, alignItems: 'center' },
  secondaryBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },

  skipBtn: { alignSelf: 'center', paddingVertical: 12, marginTop: 8 },
  skipBtnText: { color: '#9CA3AF', fontSize: 14, fontWeight: '600' },

  premiumNudge: { position: 'absolute', bottom: Platform.OS === 'ios' ? 120 : 100, left: 20, right: 20, backgroundColor: 'rgba(107,78,255,0.9)', borderRadius: 12, padding: 10 },
  premiumNudgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
