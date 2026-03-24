import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

import { saveAvatarPublicUrl } from '@/src/lib/profilePersistence';
import { supabase } from '@/src/services/supabase';

/** Override in `.env`: EXPO_PUBLIC_SUPABASE_AVATAR_BUCKET=my-bucket (must exist in Supabase) */
const AVATAR_BUCKET =
  typeof process.env.EXPO_PUBLIC_SUPABASE_AVATAR_BUCKET === 'string' &&
  process.env.EXPO_PUBLIC_SUPABASE_AVATAR_BUCKET.trim() !== ''
    ? process.env.EXPO_PUBLIC_SUPABASE_AVATAR_BUCKET.trim()
    : 'avatars';

function isBucketMissingError(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes('bucket not found') || m.includes('no such bucket');
}

function alertStorageBucketSetup() {
  Alert.alert(
    'Storage bucket missing',
    `Your Supabase project doesn’t have a Storage bucket named "${AVATAR_BUCKET}" yet.\n\n` +
      'Fix (pick one):\n' +
      '• Dashboard → Storage → New bucket → ID: ' +
      AVATAR_BUCKET +
      ' → enable Public\n' +
      '• Or run supabase/manual/CREATE_AVATARS_BUCKET.sql in the SQL Editor (creates bucket + policies).\n\n' +
      'Optional: set EXPO_PUBLIC_SUPABASE_AVATAR_BUCKET if you use a different bucket name.',
    [{ text: 'OK' }]
  );
}

const pickerOptions: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 0.85,
};

function extFromUri(uri: string): string {
  const m = /\.([a-zA-Z0-9]+)(\?|$)/.exec(uri);
  const e = (m?.[1] || 'jpg').toLowerCase();
  if (e === 'jpeg') return 'jpg';
  return e === 'png' || e === 'webp' || e === 'heic' ? e : 'jpg';
}

async function readUriAsUploadBody(uri: string): Promise<{ body: Blob | ArrayBuffer; contentType: string }> {
  const res = await fetch(uri);
  const blob = await res.blob();
  const contentType = blob.type || 'image/jpeg';
  if (Platform.OS === 'web') {
    return { body: blob, contentType };
  }
  const buffer =
    typeof blob.arrayBuffer === 'function'
      ? await blob.arrayBuffer()
      : await new Promise<ArrayBuffer>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (reader.result instanceof ArrayBuffer) resolve(reader.result);
            else reject(new Error('read_failed'));
          };
          reader.onerror = () => reject(reader.error ?? new Error('read_failed'));
          reader.readAsArrayBuffer(blob);
        });
  return { body: buffer, contentType };
}

export async function pickAvatarSource(): Promise<'camera' | 'library' | null> {
  return new Promise((resolve) => {
    Alert.alert('Profile photo', 'Choose a source', [
      { text: 'Camera', onPress: () => resolve('camera') },
      { text: 'Photo library', onPress: () => resolve('library') },
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}

async function ensureMediaLibraryPermission(): Promise<boolean> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Allow photo library access to choose a profile photo.');
    return false;
  }
  return true;
}

async function launchImageLibrarySafe(): Promise<ImagePicker.ImagePickerResult | null> {
  const ok = await ensureMediaLibraryPermission();
  if (!ok) return null;
  try {
    return await ImagePicker.launchImageLibraryAsync(pickerOptions);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('launch_library:', msg);
    Alert.alert('Photos', 'Could not open your photo library. Try again.');
    return null;
  }
}

/**
 * Opens the camera, or offers the library if the camera isn't available (e.g. iOS Simulator).
 */
async function launchCameraWithSimulatorFallback(): Promise<ImagePicker.ImagePickerResult | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission needed', 'Allow camera access to take a profile photo.');
    return null;
  }

  try {
    return await ImagePicker.launchCameraAsync(pickerOptions);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('launch_camera:', msg);

    const cameraUnavailable =
      /not available|simulator|unavailable|no camera|device has no camera/i.test(msg);

    if (!cameraUnavailable) {
      Alert.alert('Camera', msg || 'Could not open the camera.');
      return null;
    }

    return new Promise((resolve) => {
      Alert.alert(
        'Camera unavailable',
        'The camera isn’t available on this device (for example, the iOS Simulator). Choose a photo from your library instead?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
          {
            text: 'Photo library',
            onPress: () => {
              void (async () => {
                const result = await launchImageLibrarySafe();
                resolve(result);
              })();
            },
          },
        ]
      );
    });
  }
}

async function pickImageResult(source: 'camera' | 'library'): Promise<ImagePicker.ImagePickerResult | null> {
  if (source === 'library') {
    return launchImageLibrarySafe();
  }
  return launchCameraWithSimulatorFallback();
}

/**
 * iOS photo library URIs (e.g. ph://) often fail with fetch(); normalize to a JPEG file:// in cache.
 */
async function prepareLocalImageForUpload(uri: string): Promise<{ uri: string; ext: string }> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 1024 } }],
      { compress: 0.88, format: ImageManipulator.SaveFormat.JPEG }
    );
    return { uri: result.uri, ext: 'jpg' };
  } catch (e) {
    console.warn('avatar_prepare_image:', e);
    return { uri, ext: extFromUri(uri) };
  }
}

export async function pickAndUploadAvatar(userId: string): Promise<string | null> {
  try {
    const source = await pickAvatarSource();
    if (!source) return null;

    const picker = await pickImageResult(source);
    if (!picker || picker.canceled || !picker.assets?.[0]?.uri) return null;

    const rawUri = picker.assets[0].uri;
    const { uri, ext } = await prepareLocalImageForUpload(rawUri);
    const path = `${userId}/avatar-${Date.now()}.${ext}`;

    const { body: uploadBody, contentType: ct } = await readUriAsUploadBody(uri);
    const contentType =
      ct && ct !== 'application/octet-stream'
        ? ct
        : `image/${ext === 'jpg' ? 'jpeg' : ext}`;

    const { error: upErr } = await supabase.storage.from(AVATAR_BUCKET).upload(path, uploadBody, {
      contentType,
      upsert: true,
    });

    if (upErr) {
      console.warn('avatar_upload:', upErr.message);
      if (isBucketMissingError(upErr.message)) {
        alertStorageBucketSetup();
      } else {
        Alert.alert('Upload failed', upErr.message || 'Could not upload image.');
      }
      return null;
    }

    const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
    const publicUrl = pub?.publicUrl;
    if (!publicUrl) {
      Alert.alert('Upload failed', 'No public URL returned.');
      return null;
    }

    const saved = await saveAvatarPublicUrl(userId, publicUrl);
    if (!saved.ok) {
      console.warn('avatar_profile_update:', saved.message);
      Alert.alert('Save failed', saved.message || 'Photo uploaded but profile could not be updated.');
      return null;
    }

    return publicUrl;
  } catch (e) {
    console.warn('avatar_upload_exception:', e);
    Alert.alert('Error', 'Something went wrong uploading your photo.');
    return null;
  }
}
