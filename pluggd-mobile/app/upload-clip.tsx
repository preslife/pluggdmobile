import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../src/design/typography';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ScreenShell } from '../components/ContentUI';
import { useAuth } from '../src/context/AuthProvider';
import { createMobileClipRecord } from '../src/features/culture/mobileServices';
import { PLUGGD_ORANGE } from '../src/lib/mobileContent';
import { uploadFileToSupabaseStorage } from '../src/lib/storageUpload';

type SelectedClip = {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  duration?: number | null;
  appOwned?: boolean;
};

const CLIP_DRAFT_DIRECTORY = 'pluggd-upload-drafts/clips/';

function clipPath(userId: string, clip: SelectedClip) {
  const ext = clip.fileName?.split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'mp4';
  return `${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
}

function safeClipFileName(name?: string | null) {
  const normalized = (name || 'clip.mp4')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-96);
  return normalized || 'clip.mp4';
}

async function persistSelectedClip(asset: ImagePicker.ImagePickerAsset): Promise<SelectedClip> {
  if (!FileSystem.documentDirectory) throw new Error('Persistent media storage is unavailable.');
  const directory = `${FileSystem.documentDirectory}${CLIP_DRAFT_DIRECTORY}`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const destination = `${directory}${Date.now()}-${safeClipFileName(asset.fileName)}`;
  await FileSystem.copyAsync({ from: asset.uri, to: destination });
  return {
    uri: destination,
    fileName: asset.fileName,
    mimeType: asset.mimeType,
    duration: asset.duration ? Math.round(asset.duration / 1000) : null,
    appOwned: true,
  };
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
    try {
      const persisted = await persistSelectedClip(asset);
      const previous = clip;
      setClip(persisted);
      if (previous?.appOwned) {
        void FileSystem.deleteAsync(previous.uri, { idempotent: true }).catch(() => undefined);
      }
    } catch (error) {
      Alert.alert('Clip not saved', error instanceof Error ? error.message : 'Choose the clip again.');
    }
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
      const path = clipPath(user.id, clip);
      await uploadFileToSupabaseStorage({
        bucket: 'mobile-clips',
        path,
        uri: clip.uri,
        contentType: clip.mimeType || 'video/mp4',
        upsert: false,
      });

      const record = await createMobileClipRecord({
        storagePath: path,
        caption: caption.trim() || null,
        durationSeconds: clip.duration ?? null,
      });
      if (!record.success) throw new Error(record.error || 'Clip metadata could not be created.');

      if (clip.appOwned) {
        await FileSystem.deleteAsync(clip.uri, { idempotent: true }).catch(() => undefined);
      }

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
      <ScreenShell title="Creator Clips" subtitle="A release moment, built for discovery.">
        <StatusBar style="light" />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.accessHero}>
          <View style={styles.signalMark}>
            <MaterialIcons name="slow-motion-video" size={31} color="#0A0806" />
          </View>
          <Text style={styles.accessKicker}>CREATOR ACCESS</Text>
          <Text style={styles.accessTitle}>Turn a release moment into a signal.</Text>
          <Text style={styles.accessBody}>Publish a real clip into PLUGGD discovery without losing the route back to your music.</Text>
        </View>
        <View style={styles.requirementLedger}>
          <Requirement index="01" title="Creator identity" body="Clips stay connected to a verified creator profile." />
          <Requirement index="02" title="Real video" body="Upload up to two minutes from your device library." />
          <Requirement index="03" title="Human review" body="Every clip is checked before it reaches public discovery." last />
        </View>
        <Pressable accessibilityRole="button" style={styles.primaryButton} onPress={() => router.push('/auth/login' as any)}>
          <Text style={styles.primaryButtonText}>Sign in to continue</Text>
        </Pressable>
        <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => router.push('/auth/signup' as any)}>
          <Text style={styles.secondaryButtonText}>Create a creator account</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" />
        </Pressable>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Upload Clip" subtitle="Shape a short creator moment for Discover, Live, or Community.">
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      <WorkflowLabel index="01" title="Media" detail="MP4 · MOV · up to 2 minutes" />
      <Pressable accessibilityRole="button" accessibilityLabel="Choose a video clip" style={styles.pickCard} onPress={pickClip}>
        <View style={[styles.mediaMark, clip && styles.mediaMarkSelected]}>
          <MaterialIcons name={clip ? 'movie' : 'add-photo-alternate'} size={30} color={clip ? '#0A0806' : PLUGGD_ORANGE} />
        </View>
        <View style={styles.pickCopy}>
          <Text style={styles.pickTitle}>{clip?.fileName || 'Choose video clip'}</Text>
          <Text style={styles.pickBody}>
            {clip ? `${clip.mimeType || 'video'}${clip.duration ? ` · ${clip.duration}s` : ''}` : 'Select a real video file from your library.'}
          </Text>
        </View>
      </Pressable>

      <WorkflowLabel index="02" title="Context" detail={`${caption.length}/240`} />
      <TextInput
        value={caption}
        onChangeText={setCaption}
        placeholder="Add context for fans..."
        placeholderTextColor="#737373"
        multiline
        maxLength={240}
        style={styles.caption}
      />

      <View style={styles.reviewLedger}>
        <MaterialIcons name="verified-user" size={19} color={PLUGGD_ORANGE} />
        <View style={styles.pickCopy}>
          <Text style={styles.reviewTitle}>Review before reach</Text>
          <Text style={styles.reviewBody}>Your upload is private until moderation is complete. No live status is implied.</Text>
        </View>
      </View>

      <Pressable accessibilityRole="button" accessibilityLabel={uploading ? 'Uploading clip' : 'Upload clip'} style={[styles.primaryButton, uploading && styles.disabledButton]} onPress={uploadClip} disabled={uploading}>
        {uploading ? <ActivityIndicator color="#0a0806" /> : <Text style={styles.primaryButtonText}>Upload Clip</Text>}
      </Pressable>

    </ScreenShell>
  );
}

function Requirement({ index, title, body, last = false }: { index: string; title: string; body: string; last?: boolean }) {
  return (
    <View style={[styles.requirementRow, last && styles.requirementRowLast]}>
      <Text style={styles.requirementIndex}>{index}</Text>
      <View style={styles.pickCopy}>
        <Text style={styles.requirementTitle}>{title}</Text>
        <Text style={styles.requirementBody}>{body}</Text>
      </View>
    </View>
  );
}

function WorkflowLabel({ index, title, detail }: { index: string; title: string; detail: string }) {
  return (
    <View style={styles.workflowLabel}>
      <Text style={styles.workflowIndex}>{index}</Text>
      <Text style={styles.workflowTitle}>{title}</Text>
      <Text style={styles.workflowDetail}>{detail}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  accessHero: { paddingTop: 8, paddingBottom: 26 },
  signalMark: { width: 58, height: 58, borderRadius: 5, backgroundColor: PLUGGD_ORANGE, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  accessKicker: { color: PLUGGD_ORANGE, fontSize: 11, letterSpacing: 1.8, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  accessTitle: { color: '#FFFFFF', fontSize: 35, lineHeight: 39, letterSpacing: -1.3, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', marginTop: 8, maxWidth: 340 },
  accessBody: { color: '#A8A29E', fontSize: 14, lineHeight: 21, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 12, maxWidth: 335 },
  requirementLedger: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#302A26' },
  requirementRow: { minHeight: 78, flexDirection: 'row', gap: 15, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#302A26', paddingVertical: 13 },
  requirementRowLast: { borderBottomWidth: 0 },
  requirementIndex: { width: 28, color: PLUGGD_ORANGE, fontSize: 11, letterSpacing: 1, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  requirementTitle: { color: '#FFFFFF', fontSize: 15, fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  requirementBody: { color: '#928A84', fontSize: 12.5, lineHeight: 18, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 3 },
  secondaryButton: { minHeight: 52, borderRadius: 5, borderWidth: 1, borderColor: '#3A332E', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 10 },
  secondaryButtonText: { color: '#FFFFFF', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  workflowLabel: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  workflowIndex: { color: PLUGGD_ORANGE, fontSize: 11, letterSpacing: 1.2, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  workflowTitle: { color: '#FFFFFF', fontSize: 17, fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  workflowDetail: { marginLeft: 'auto', color: '#79716C', fontSize: 10.5, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  pickCard: { minHeight: 104, borderRadius: 5, borderWidth: 1, borderColor: '#302A26', backgroundColor: '#14110F', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 18 },
  mediaMark: { width: 60, height: 60, borderRadius: 4, borderWidth: 1, borderStyle: 'dashed', borderColor: '#5A4030', alignItems: 'center', justifyContent: 'center' },
  mediaMarkSelected: { backgroundColor: PLUGGD_ORANGE, borderStyle: 'solid', borderColor: PLUGGD_ORANGE },
  pickCopy: { flex: 1, minWidth: 0 },
  pickTitle: { color: '#FFFFFF', fontSize: 16, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  pickBody: { color: '#B3B3B3', fontSize: 12.5, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 5, lineHeight: 18 },
  caption: { minHeight: 116, borderRadius: 5, borderWidth: 1, borderColor: '#302A26', backgroundColor: '#14110F', color: '#FFFFFF', padding: 14, fontSize: 14, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', textAlignVertical: 'top' },
  reviewLedger: { minHeight: 78, flexDirection: 'row', gap: 12, alignItems: 'flex-start', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#302A26', paddingVertical: 14, marginTop: 18 },
  reviewTitle: { color: '#FFFFFF', fontSize: 13, fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  reviewBody: { color: '#8F8883', fontSize: 11.5, lineHeight: 17, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 3 },
  primaryButton: { minHeight: 52, borderRadius: 5, backgroundColor: PLUGGD_ORANGE, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 18 },
  primaryButtonText: { color: '#0a0806', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  disabledButton: { opacity: 0.65 },
});
