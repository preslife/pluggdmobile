import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { EmptyState, ScreenShell, SectionTitle } from '../components/ContentUI';
import { useAuth } from '../src/context/AuthProvider';
import { createMobileClipRecord } from '../src/features/culture/mobileServices';
import { PLUGGD_ORANGE } from '../src/lib/mobileContent';
import { supabase } from '../src/lib/supabase';

type SelectedClip = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  duration?: number | null;
};

function clipPath(userId: string, clip: SelectedClip) {
  const ext = clip.fileName?.split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'mp4';
  return `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

export default function UploadClipScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [clip, setClip] = useState<SelectedClip | null>(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  const pickClip = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to upload a clip.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.9,
      videoMaxDuration: 120,
    });

    if (result.canceled || !result.assets?.[0]?.uri) return;
    const asset = result.assets[0];
    setClip({
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      duration: asset.duration ? Math.round(asset.duration / 1000) : null,
    });
  };

  const uploadClip = async () => {
    if (!user?.id) {
      router.push('/auth/login' as any);
      return;
    }
    if (!clip) {
      Alert.alert('Choose a clip', 'Select a video clip before uploading.');
      return;
    }

    setUploading(true);
    try {
      const response = await fetch(clip.uri);
      const blob = await response.blob();
      const path = clipPath(user.id, clip);
      const { error: uploadError } = await supabase.storage
        .from('mobile-clips')
        .upload(path, blob, {
          contentType: clip.mimeType || 'video/mp4',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const record = await createMobileClipRecord({
        storagePath: path,
        caption: caption.trim() || null,
        durationSeconds: clip.duration ?? null,
      });
      if (!record.success) throw new Error(record.error || 'Clip metadata could not be created.');

      Alert.alert('Clip uploaded', 'Your clip is saved for review and publishing.', [
        { text: 'Back to Studio', onPress: () => router.replace('/studio' as any) },
      ]);
    } catch (error) {
      Alert.alert('Upload failed', error instanceof Error ? error.message : String(error));
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <ScreenShell title="Upload Clip" subtitle="Short-form mobile clip upload.">
        <StatusBar style="light" />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loading}><ActivityIndicator color={PLUGGD_ORANGE} /></View>
      </ScreenShell>
    );
  }

  if (!user) {
    return (
      <ScreenShell title="Upload Clip" subtitle="Short-form mobile clip upload.">
        <StatusBar style="light" />
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState title="Sign in required" body="Creator accounts can upload mobile clips after signing in." />
        <Pressable style={styles.primaryButton} onPress={() => router.push('/auth/login' as any)}>
          <Text style={styles.primaryButtonText}>Sign In</Text>
        </Pressable>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Upload Clip" subtitle="Upload a short creator moment for Discover, Live, or Community review.">
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      <SectionTitle title="Clip" />
      <Pressable style={styles.pickCard} onPress={pickClip}>
        <MaterialIcons name={clip ? 'movie' : 'add-photo-alternate'} size={34} color={PLUGGD_ORANGE} />
        <View style={styles.pickCopy}>
          <Text style={styles.pickTitle}>{clip?.fileName || 'Choose video clip'}</Text>
          <Text style={styles.pickBody}>
            {clip ? `${clip.mimeType || 'video'}${clip.duration ? ` · ${clip.duration}s` : ''}` : 'Select a real video file from your library.'}
          </Text>
        </View>
      </Pressable>

      <SectionTitle title="Caption" />
      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder="Add context for fans..."
        placeholderTextColor="#737373"
        multiline
        style={styles.caption}
      />

      <Pressable style={[styles.primaryButton, uploading && styles.disabledButton]} onPress={uploadClip} disabled={uploading}>
        {uploading ? <ActivityIndicator color="#08080C" /> : <Text style={styles.primaryButtonText}>Upload Clip</Text>}
      </Pressable>

      <EmptyState
        title="Clip review"
        body="Uploaded clips are reviewed before they appear publicly."
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  pickCard: { minHeight: 96, borderRadius: 18, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 },
  pickCopy: { flex: 1, minWidth: 0 },
  pickTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  pickBody: { color: '#B3B3B3', fontSize: 12.5, fontWeight: '700', marginTop: 5, lineHeight: 18 },
  caption: { minHeight: 120, borderRadius: 16, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', color: '#FFFFFF', padding: 14, fontSize: 14, fontWeight: '700', textAlignVertical: 'top' },
  primaryButton: { minHeight: 52, borderRadius: 26, backgroundColor: PLUGGD_ORANGE, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 14 },
  primaryButtonText: { color: '#08080C', fontSize: 14, fontWeight: '900' },
  disabledButton: { opacity: 0.65 },
});
