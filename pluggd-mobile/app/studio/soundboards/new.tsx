import { MaterialIcons } from '@expo/vector-icons';
import * as Crypto from 'expo-crypto';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreatorAccessGate } from '../../../components/CreatorAccessGate';
import type { PluggdTheme } from '../../../src/design/tokens';
import { pluggdFonts } from '../../../src/design/typography';
import { usePluggdTheme } from '../../../src/design/usePluggdTheme';
import { supabase } from '../../../src/lib/supabase';
import { uploadFileToSupabaseStorage } from '../../../src/lib/storageUpload';

type Visibility = 'private' | 'link' | 'public';

type BoardTemplate = {
  id: string;
  title: string;
  detail: string;
  background: string;
  accent: string;
  paper: string;
};

const TEMPLATES: BoardTemplate[] = [
  { id: 'blank', title: 'Blank canvas', detail: 'A clean dark workspace.', background: '#101014', accent: '#8B5CF6', paper: '#F4D96B' },
  { id: 'rollout', title: 'Rollout', detail: 'Purple energy for a campaign world.', background: '#130D1E', accent: '#A855F7', paper: '#F7D96A' },
  { id: 'identity', title: 'Artist identity', detail: 'Deep plum for visual direction.', background: '#160D18', accent: '#E879F9', paper: '#F1C75B' },
  { id: 'session', title: 'Session', detail: 'Midnight blue for ideas and demos.', background: '#0B1420', accent: '#38BDF8', paper: '#F6D365' },
];

const VISIBILITY_OPTIONS: Array<{ id: Visibility; label: string; detail: string }> = [
  { id: 'private', label: 'Private', detail: 'Only you can open it.' },
  { id: 'link', label: 'Link only', detail: 'Anyone with its link can open it after publication.' },
  { id: 'public', label: 'Public', detail: 'Eligible for public Soundboard discovery after publication.' },
];

export default function NewSoundboardScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [visibility, setVisibility] = useState<Visibility>('private');
  const [allowComments, setAllowComments] = useState(true);
  const [cover, setCover] = useState<{ uri: string; fileName?: string | null; mimeType?: string | null } | null>(null);
  const [firstAudio, setFirstAudio] = useState<{ uri: string; name: string; size?: number | null; mimeType?: string | null } | null>(null);
  const [firstAudioTitle, setFirstAudioTitle] = useState('');
  const [creating, setCreating] = useState(false);

  const pickCover = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access to choose Soundboard artwork. You can also create the board without artwork.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const asset = result.assets[0];
    setCover({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType || 'image/jpeg' });
  };

  const pickFirstAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setFirstAudio({ uri: asset.uri, name: asset.name, size: asset.size, mimeType: asset.mimeType });
    if (!firstAudioTitle.trim()) setFirstAudioTitle(asset.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
  };

  const createBoard = async () => {
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      Alert.alert('Name your Soundboard', 'Add a clear title before creating the canvas.');
      return;
    }
    if (creating) return;

    setCreating(true);
    let boardId: string | null = null;
    let coverPath: string | null = null;
    let audioPath: string | null = null;
    let audioFileId: string | null = null;
    let audioFileSize: number | null = null;
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error('Sign in again before creating a Soundboard.');

      let coverUrl: string | null = null;
      if (cover) {
        const rawExtension = cover.fileName?.split('.').pop()?.toLowerCase();
        const extension = rawExtension && /^[a-z0-9]{2,5}$/.test(rawExtension) ? rawExtension : 'jpg';
        coverPath = `${auth.user.id}/soundboards/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
        await uploadFileToSupabaseStorage({
          bucket: 'release-artwork',
          path: coverPath,
          uri: cover.uri,
          contentType: cover.mimeType || 'image/jpeg',
        });
        coverUrl = supabase.storage.from('release-artwork').getPublicUrl(coverPath).data.publicUrl;
      }

      if (firstAudio && !firstAudioTitle.trim()) throw new Error('Add a title for the first Soundboard audio.');
      if (firstAudio) {
        const info = firstAudio.size && firstAudio.size > 0 ? { size: firstAudio.size } : await FileSystem.getInfoAsync(firstAudio.uri);
        if (!('size' in info) || !info.size || info.size <= 0) throw new Error('PLUGGD could not read the selected audio. Choose it again.');
        const rawExtension = firstAudio.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '');
        const extension = rawExtension || 'mp3';
        const uploadSessionId = Crypto.randomUUID();
        audioPath = `${auth.user.id}/soundboards/${Date.now()}-${uploadSessionId}.${extension}`;
        await uploadFileToSupabaseStorage({ bucket: 'audio-files', path: audioPath, uri: firstAudio.uri, contentType: firstAudio.mimeType || 'audio/mpeg' });
        const audioUrl = supabase.storage.from('audio-files').getPublicUrl(audioPath).data.publicUrl;
        audioFileSize = Math.round(info.size);
        const audioResult = await (supabase as any).from('audio_files').insert({ user_id: auth.user.id, file_name: firstAudio.name, file_size: audioFileSize, file_type: firstAudio.mimeType || 'audio/mpeg', storage_path: audioPath, stream_url: audioUrl, processing_status: 'pending', upload_session_id: uploadSessionId }).select('id').single();
        if (audioResult.error || !audioResult.data?.id) throw audioResult.error || new Error('The first audio attachment was not created.');
        audioFileId = String(audioResult.data.id);
      }

      const db = supabase as any;
      const { data, error } = await db.rpc('create_soundboard', {
        p_title: cleanTitle,
        p_description: description.trim() || null,
        p_cover_image_url: coverUrl,
        p_visibility: visibility,
        p_is_published: false,
        p_allow_comments: allowComments,
        p_allow_downloads: false,
        p_first_audio_file_id: audioFileId,
        p_first_audio_title: firstAudio ? firstAudioTitle.trim() : null,
      });
      if (error || !data) throw error || new Error('The Soundboard was not created.');
      boardId = String(data);

      const template = TEMPLATES.find((candidate) => candidate.id === templateId) || TEMPLATES[0];
      const { error: metadataError } = await db
        .from('soundboards')
        .update({
          metadata: {
            native_template: template.id,
            canvas_theme: {
              background: template.background,
              accent: template.accent,
              paper: template.paper,
            },
          },
        })
        .eq('id', boardId)
        .eq('creator_id', auth.user.id);
      if (metadataError) throw metadataError;

      if (firstAudio && audioFileId && audioPath) {
        const processing = await supabase.functions.invoke('process-audio-upload', { body: { audioFileId, filePath: audioPath, fileSize: audioFileSize, fileName: firstAudio.name, fileType: firstAudio.mimeType || 'audio/mpeg' } });
        if (processing.error) throw new Error(`Audio processing could not start: ${processing.error.message}`);
      }

      router.replace(`/studio/soundboards/${encodeURIComponent(boardId)}` as any);
    } catch (error: any) {
      const { data: auth } = await supabase.auth.getUser();
      if (boardId && auth.user?.id) {
        await (supabase as any).from('soundboards').delete().eq('id', boardId).eq('creator_id', auth.user.id);
      }
      if (coverPath) await supabase.storage.from('release-artwork').remove([coverPath]);
      if (audioFileId) await (supabase as any).from('audio_files').delete().eq('id', audioFileId);
      if (audioPath) await supabase.storage.from('audio-files').remove([audioPath]);
      Alert.alert('Soundboard not created', error?.message || 'Nothing was published. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <CreatorAccessGate>
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close Soundboard creator" style={styles.headerButton} onPress={() => router.back()}>
            <MaterialIcons name="close" size={23} color={theme.colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.eyebrow}>CREATOR STUDIO</Text>
            <Text accessibilityRole="header" style={styles.headerTitle}>New Soundboard</Text>
          </View>
          <View style={styles.headerButtonPlaceholder} />
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.intro}>
            <Text style={styles.introTitle}>Start with the canvas.</Text>
            <Text style={styles.introBody}>Choose its visual atmosphere, then arrange your real audio, notes, images and video in the owner workspace.</Text>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>TITLE</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Summer rollout"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.titleInput}
              maxLength={120}
              autoCapitalize="sentences"
            />
            <Text style={styles.label}>DESCRIPTION</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What is this world for?"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.descriptionInput}
              maxLength={1000}
              multiline
            />
          </View>

          <View>
            <Text style={styles.sectionLabel}>CANVAS STYLE</Text>
            <Text style={styles.sectionTitle}>Choose a starting atmosphere</Text>
            <View style={styles.templateGrid}>
              {TEMPLATES.map((template) => {
                const selected = template.id === templateId;
                return (
                  <Pressable
                    key={template.id}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    accessibilityLabel={`${template.title}. ${template.detail}`}
                    onPress={() => setTemplateId(template.id)}
                    style={[styles.templateCard, selected && styles.templateCardSelected]}
                  >
                    <View style={[styles.templatePreview, { backgroundColor: template.background }]}>
                      <View style={[styles.previewAudio, { borderColor: template.accent }]}><MaterialIcons name="graphic-eq" size={18} color={template.accent} /></View>
                      <View style={[styles.previewNote, { backgroundColor: template.paper }]} />
                      <View style={[styles.previewImage, { backgroundColor: template.accent }]} />
                    </View>
                    <View style={styles.templateCopy}>
                      <Text style={styles.templateTitle}>{template.title}</Text>
                      <Text style={styles.templateDetail}>{template.detail}</Text>
                    </View>
                    {selected ? <View style={[styles.selectedTick, { backgroundColor: template.accent }]}><MaterialIcons name="check" size={14} color="#FFFFFF" /></View> : null}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View>
            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionHeadingCopy}>
                <Text style={styles.sectionLabel}>ARTWORK</Text>
                <Text style={styles.sectionTitle}>Board cover</Text>
              </View>
              {cover ? <Pressable accessibilityRole="button" accessibilityLabel="Remove Soundboard artwork" style={styles.removeButton} onPress={() => setCover(null)}><Text style={styles.removeText}>Remove</Text></Pressable> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={cover ? 'Change Soundboard artwork' : 'Choose Soundboard artwork'} style={styles.coverPicker} onPress={() => void pickCover()}>
              {cover ? <Image source={{ uri: cover.uri }} style={styles.coverImage} resizeMode="cover" /> : <><MaterialIcons name="add-photo-alternate" size={29} color={theme.colors.accentText} /><Text style={styles.coverTitle}>Choose artwork</Text><Text style={styles.coverDetail}>Optional · square artwork works best</Text></>}
            </Pressable>
          </View>

          <View>
            <View style={styles.sectionHeadingRow}>
              <View style={styles.sectionHeadingCopy}><Text style={styles.sectionLabel}>FIRST SOUND</Text><Text style={styles.sectionTitle}>Start the board with audio</Text></View>
              {firstAudio ? <Pressable accessibilityRole="button" accessibilityLabel="Remove first audio" style={styles.removeButton} onPress={() => { setFirstAudio(null); setFirstAudioTitle(''); }}><Text style={styles.removeText}>Remove</Text></Pressable> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={firstAudio ? 'Change first Soundboard audio' : 'Choose first Soundboard audio'} style={styles.audioPicker} onPress={() => void pickFirstAudio()}>
              <View style={styles.audioIcon}><MaterialIcons name="audio-file" size={24} color={theme.colors.accentText} /></View>
              <View style={styles.audioCopy}><Text style={styles.coverTitle}>{firstAudio?.name || 'Choose first audio'}</Text><Text style={styles.coverDetail}>{firstAudio ? 'Attached when the private board is created' : 'Optional · WAV, AIFF, FLAC or MP3'}</Text></View>
              <MaterialIcons name={firstAudio ? 'swap-horiz' : 'add'} size={21} color={theme.colors.textMuted} />
            </Pressable>
            {firstAudio ? <TextInput accessibilityLabel="First Soundboard audio title" value={firstAudioTitle} onChangeText={setFirstAudioTitle} placeholder="Title this sound" placeholderTextColor={theme.colors.textMuted} style={[styles.titleInput, styles.audioTitleInput]} /> : null}
          </View>

          <View>
            <Text style={styles.sectionLabel}>ACCESS</Text>
            <Text style={styles.sectionTitle}>Who can open it later?</Text>
            <View style={styles.visibilityList}>
              {VISIBILITY_OPTIONS.map((option) => (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: visibility === option.id }}
                  accessibilityLabel={`${option.label}. ${option.detail}`}
                  onPress={() => setVisibility(option.id)}
                  style={[styles.visibilityOption, visibility === option.id && styles.visibilityOptionActive]}
                >
                  <View style={[styles.radio, visibility === option.id && styles.radioActive]}>{visibility === option.id ? <View style={styles.radioDot} /> : null}</View>
                  <View style={styles.visibilityCopy}><Text style={styles.visibilityTitle}>{option.label}</Text><Text style={styles.visibilityDetail}>{option.detail}</Text></View>
                </Pressable>
              ))}
            </View>
            <View style={styles.switchRow}>
              <View style={styles.switchCopy}><Text style={styles.switchTitle}>Allow comments</Text><Text style={styles.switchDetail}>You can change this from board settings.</Text></View>
              <Switch style={styles.switch} value={allowComments} onValueChange={setAllowComments} trackColor={{ false: theme.colors.surfacePressed, true: theme.colors.accentFill }} thumbColor={allowComments ? theme.colors.onAccent : theme.colors.textMuted} />
            </View>
            <View style={styles.draftNotice}>
              <MaterialIcons name="lock-outline" size={19} color={theme.colors.accentText} />
              <Text style={styles.draftNoticeText}>New Soundboards always start unpublished. Add your content, then publish explicitly from board settings.</Text>
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Create private Soundboard draft"
            accessibilityState={{ disabled: creating || !title.trim() }}
            disabled={creating || !title.trim()}
            onPress={() => void createBoard()}
            style={[styles.createButton, (creating || !title.trim()) && styles.disabled]}
          >
            {creating ? <ActivityIndicator color={theme.colors.accentText} /> : <><Text style={styles.createButtonText}>Create Soundboard</Text><MaterialIcons name="arrow-forward" size={21} color={theme.colors.accentText} /></>}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </CreatorAccessGate>
  );
}

function createStyles(theme: PluggdTheme) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { minHeight: 68, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  headerButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.controlBorder },
  headerButtonPlaceholder: { width: 44, height: 44 },
  headerCopy: { flex: 1, alignItems: 'center' },
  eyebrow: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.4 },
  headerTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 20, marginTop: 1 },
  content: { padding: 18, paddingBottom: 52, gap: 30 },
  intro: { paddingVertical: 8 },
  introTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayExtraBold, fontSize: 34, lineHeight: 39, letterSpacing: -0.8 },
  introBody: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 21, marginTop: 9, maxWidth: 430 },
  fieldGroup: { gap: 9 },
  label: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.25, marginTop: 4 },
  titleInput: { minHeight: 58, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text, paddingHorizontal: 15, fontFamily: pluggdFonts.displayBold, fontSize: 20 },
  descriptionInput: { minHeight: 112, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text, padding: 15, fontFamily: pluggdFonts.satoshiMedium, fontSize: 15, lineHeight: 22, textAlignVertical: 'top' },
  sectionLabel: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.35 },
  sectionTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 22, marginTop: 3 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, marginBottom: 12 },
  sectionHeadingCopy: { flex: 1 },
  removeButton: { minWidth: 64, minHeight: 44, alignItems: 'flex-end', justifyContent: 'center' },
  removeText: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  templateGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 13 },
  templateCard: { width: '48.5%', minHeight: 184, borderRadius: 17, borderWidth: 1.5, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, overflow: 'hidden' },
  templateCardSelected: { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft },
  templatePreview: { height: 105, margin: 7, borderRadius: 12, position: 'relative', overflow: 'hidden' },
  previewAudio: { position: 'absolute', left: 10, right: 36, top: 11, height: 37, borderRadius: 8, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  previewNote: { position: 'absolute', width: 45, height: 47, left: 17, bottom: 10, borderRadius: 3, transform: [{ rotate: '-4deg' }] },
  previewImage: { position: 'absolute', width: 52, height: 54, right: 12, bottom: 7, borderRadius: 5, opacity: 0.7, transform: [{ rotate: '3deg' }] },
  templateCopy: { paddingHorizontal: 11, paddingTop: 2, paddingBottom: 12 },
  templateTitle: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  templateDetail: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 10.5, lineHeight: 14, marginTop: 3 },
  selectedTick: { position: 'absolute', top: 12, right: 12, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  coverPicker: { minHeight: 190, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  coverImage: { width: '100%', height: 260 },
  coverTitle: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 14, marginTop: 8 },
  coverDetail: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11, marginTop: 3 },
  audioPicker: { minHeight: 78, borderRadius: 17, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  audioIcon: { width: 48, height: 48, borderRadius: 15, backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  audioCopy: { flex: 1, minWidth: 0 },
  audioTitleInput: { marginTop: 9, fontSize: 15 },
  visibilityList: { marginTop: 12, borderRadius: 17, borderWidth: 1, borderColor: theme.colors.controlBorder, overflow: 'hidden' },
  visibilityOption: { minHeight: 72, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  visibilityOptionActive: { backgroundColor: theme.colors.accentSoft },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: theme.colors.controlBorder, alignItems: 'center', justifyContent: 'center' },
  radioActive: { borderColor: theme.colors.accentFill },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.accentFill },
  visibilityCopy: { flex: 1 },
  visibilityTitle: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 14 },
  visibilityDetail: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11, lineHeight: 15, marginTop: 2 },
  switchRow: { minHeight: 72, marginTop: 10, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', gap: 12 },
  switchCopy: { flex: 1 },
  switchTitle: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 14 },
  switchDetail: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11, marginTop: 2 },
  switch: { minWidth: 51, minHeight: 44 },
  draftNotice: { marginTop: 10, padding: 13, borderRadius: 14, backgroundColor: theme.colors.accentSoft, borderWidth: 1, borderColor: theme.colors.borderAccent, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  draftNoticeText: { flex: 1, color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5, lineHeight: 17 },
  createButton: { minHeight: 58, borderRadius: 17, paddingHorizontal: 20, borderWidth: 1.5, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.surfaceRaised, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  createButtonText: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 14, letterSpacing: 0.2 },
  disabled: { opacity: 0.45 },
  });
}
