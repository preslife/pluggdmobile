import { MaterialIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../components/PluggdImage';
import { useAuth } from '../../context/AuthProvider';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import { pluggdFonts } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { uploadSocialMediaAsset } from '../culture/mobileServices';
import { contentInitials } from '../../lib/mobileContent';
import { supabase } from '../../lib/supabase';

async function loadEditableProfile(userId?: string | null) {
  if (!userId) return null;
  const { data, error } = await (supabase as any)
    .from('profiles')
    .select('user_id,username,full_name,bio,avatar_url,cover_image_url,profile_type,website_url,instagram_url,twitter_url,youtube_url,tiktok_url,soundcloud_url,spotify_url,embed_settings')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  return data as any | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function normaliseProfileUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol) || !parsed.hostname) throw new Error('invalid');
    return parsed.toString();
  } catch {
    throw new Error(`Check this link before saving: ${trimmed}`);
  }
}

export function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = usePluggdTheme();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const profile = useQuery({
    queryKey: ['profile', 'edit', user?.id],
    queryFn: () => loadEditableProfile(user?.id),
    enabled: !!user?.id,
  });
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarDraft, setAvatarDraft] = useState<{ uri: string; fileName?: string | null; mimeType?: string | null } | null>(null);
  const [coverDraft, setCoverDraft] = useState<{ uri: string; fileName?: string | null; mimeType?: string | null } | null>(null);
  const [website, setWebsite] = useState('');
  const [instagram, setInstagram] = useState('');
  const [twitter, setTwitter] = useState('');
  const [tiktok, setTiktok] = useState('');
  const [youtube, setYoutube] = useState('');
  const [soundcloud, setSoundcloud] = useState('');
  const [spotify, setSpotify] = useState('');
  const [showPlayCounts, setShowPlayCounts] = useState(true);

  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.full_name || '');
    setUsername(profile.data.username || '');
    setBio(profile.data.bio || '');
    setWebsite(profile.data.website_url || '');
    setInstagram(profile.data.instagram_url || '');
    setTwitter(profile.data.twitter_url || '');
    setTiktok(profile.data.tiktok_url || '');
    setYoutube(profile.data.youtube_url || '');
    setSoundcloud(profile.data.soundcloud_url || '');
    setSpotify(profile.data.spotify_url || '');
    const profileVisibility = asRecord(asRecord(profile.data.embed_settings).profile_visibility);
    setShowPlayCounts(profileVisibility.show_play_counts !== false);
  }, [profile.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Sign in to update your profile.');
      let avatarUrl = profile.data?.avatar_url || null;
      if (avatarDraft) {
        const upload = await uploadSocialMediaAsset({
          uri: avatarDraft.uri,
          fileName: avatarDraft.fileName,
          mimeType: avatarDraft.mimeType,
          folder: 'profile/avatar',
        });
        if (!upload.success || !upload.url) throw new Error(upload.error || 'Profile photo upload failed.');
        avatarUrl = upload.url;
      }
      let coverUrl = profile.data?.cover_image_url || null;
      if (coverDraft) {
        const upload = await uploadSocialMediaAsset({
          uri: coverDraft.uri,
          fileName: coverDraft.fileName,
          mimeType: coverDraft.mimeType,
          folder: 'profile/cover',
        });
        if (!upload.success || !upload.url) throw new Error(upload.error || 'Cover image upload failed.');
        coverUrl = upload.url;
      }
      const { data: settingsRow, error: settingsError } = await (supabase as any)
        .from('profiles')
        .select('embed_settings')
        .eq('user_id', user.id)
        .maybeSingle();
      if (settingsError) throw settingsError;
      const currentEmbedSettings = asRecord(settingsRow?.embed_settings);
      const currentProfileVisibility = asRecord(currentEmbedSettings.profile_visibility);
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          full_name: name.trim() || null,
          username: username.trim() || null,
          bio: bio.trim() || null,
          avatar_url: avatarUrl,
          cover_image_url: coverUrl,
          website_url: normaliseProfileUrl(website),
          instagram_url: normaliseProfileUrl(instagram),
          twitter_url: normaliseProfileUrl(twitter),
          tiktok_url: normaliseProfileUrl(tiktok),
          youtube_url: normaliseProfileUrl(youtube),
          soundcloud_url: normaliseProfileUrl(soundcloud),
          spotify_url: normaliseProfileUrl(spotify),
          embed_settings: {
            ...currentEmbedSettings,
            profile_visibility: {
              ...currentProfileVisibility,
              show_play_counts: showPlayCounts,
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      impactHaptic();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['profile'] }),
        queryClient.invalidateQueries({ queryKey: ['profile', 'me'] }),
      ]);
      router.back();
    },
    onError: (error) => Alert.alert('Profile update failed', error instanceof Error ? error.message : String(error)),
  });

  const displayName = name || username || user?.email || 'PLUGGD';
  const avatarUri = avatarDraft?.uri || profile.data?.avatar_url || null;
  const coverUri = coverDraft?.uri || profile.data?.cover_image_url || null;

  const chooseAvatar = async () => {
    selectionHaptic();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo library access to choose a profile photo.');
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
    setAvatarDraft({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType || 'image/jpeg' });
  };

  const chooseCover = async () => {
    selectionHaptic();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo library access to choose a cover image.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const asset = result.assets[0];
    setCoverDraft({ uri: asset.uri, fileName: asset.fileName, mimeType: asset.mimeType || 'image/jpeg' });
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 8, borderBottomColor: theme.colors.divider }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" style={styles.iconButton} onPress={() => {
          selectionHaptic();
          router.back();
        }}>
          <MaterialIcons name="chevron-left" size={32} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerEyebrow, { color: theme.colors.accent }]}>YOUR IDENTITY</Text>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Edit profile</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Save profile" accessibilityState={{ disabled: mutation.isPending }} style={[styles.saveButton, { backgroundColor: theme.colors.accentFill }]} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
          {mutation.isPending ? <ActivityIndicator size="small" color={theme.colors.onAccent} /> : <Text style={[styles.saveText, { color: theme.colors.onAccent }]}>Save</Text>}
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <View style={[styles.identityStage, { borderColor: theme.colors.border }]}>
          {coverUri ? <PluggdImage uri={coverUri} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          <LinearGradient colors={['rgba(0,0,0,0.08)', 'rgba(10,8,6,0.92)']} style={StyleSheet.absoluteFill} />
          <Pressable accessibilityRole="button" accessibilityLabel="Choose a new cover image" onPress={chooseCover} style={styles.coverButton}>
            <MaterialIcons name="image" size={17} color="#FFFFFF" />
            <Text style={styles.coverButtonText}>Change cover</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Choose a new profile photo" onPress={chooseAvatar} style={[styles.avatar, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.accent }]}>
            {avatarUri ? <PluggdImage uri={avatarUri} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={[styles.avatarInitial, { color: theme.colors.text }]}>{contentInitials(displayName)}</Text>}
            <View style={[styles.cameraBadge, { backgroundColor: theme.colors.accentFill }]}><MaterialIcons name="photo-camera" size={18} color={theme.colors.onAccent} /></View>
          </Pressable>
          <View style={styles.stageCopy}>
            <Text style={styles.stageEyebrow}>PUBLIC PROFILE</Text>
            <Text style={styles.stageTitle}>{displayName}</Text>
            <Text style={styles.stageMeta}>{username ? `@${username}` : 'Choose a memorable username'}</Text>
          </View>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionIndex, { color: theme.colors.accent }]}>01</Text>
          <View style={styles.sectionHeadingCopy}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Profile essentials</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>The identity fans and collaborators see everywhere.</Text>
          </View>
        </View>
        <View style={styles.fields}>
          <EditField label="Display name" value={name} onChangeText={setName} placeholder="Your public name" />
          <EditField label="Username" value={username} onChangeText={setUsername} placeholder="username" autoCapitalize="none" prefix="@" />
          <EditField label="Bio" value={bio} onChangeText={setBio} placeholder="What should people know about your world?" multiline />
        </View>

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionIndex, { color: theme.colors.accent }]}>02</Text>
          <View style={styles.sectionHeadingCopy}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Links people can use</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>Keep your public destinations current across PLUGGD and Connect Card.</Text>
          </View>
        </View>
        <View style={styles.fields}>
          <EditField label="Website" value={website} onChangeText={setWebsite} placeholder="your-site.com" autoCapitalize="none" />
          <EditField label="Instagram" value={instagram} onChangeText={setInstagram} placeholder="instagram.com/yourname" autoCapitalize="none" />
          <EditField label="X / Twitter" value={twitter} onChangeText={setTwitter} placeholder="x.com/yourname" autoCapitalize="none" />
          <EditField label="TikTok" value={tiktok} onChangeText={setTiktok} placeholder="tiktok.com/@yourname" autoCapitalize="none" />
          <EditField label="YouTube" value={youtube} onChangeText={setYoutube} placeholder="youtube.com/@yourchannel" autoCapitalize="none" />
          <EditField label="SoundCloud" value={soundcloud} onChangeText={setSoundcloud} placeholder="soundcloud.com/yourname" autoCapitalize="none" />
          <EditField label="Spotify" value={spotify} onChangeText={setSpotify} placeholder="open.spotify.com/artist/..." autoCapitalize="none" />
        </View>

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionIndex, { color: theme.colors.accent }]}>03</Text>
          <View style={styles.sectionHeadingCopy}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Public metrics</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>Choose whether fans see play totals on your public profile.</Text>
          </View>
        </View>
        <View style={[styles.visibilityCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.visibilityIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
            <MaterialIcons name="bar-chart" size={22} color={theme.colors.accent} />
          </View>
          <View style={styles.visibilityCopy}>
            <Text style={[styles.visibilityTitle, { color: theme.colors.text }]}>Show public play counts</Text>
            <Text style={[styles.visibilityBody, { color: theme.colors.textMuted }]}>This only changes your public profile. Your private Studio analytics remain available.</Text>
          </View>
          <Switch
            accessibilityLabel="Show public play counts"
            accessibilityHint="Controls whether play totals appear on your public profile"
            accessibilityState={{ checked: showPlayCounts }}
            value={showPlayCounts}
            onValueChange={(value) => {
              selectionHaptic();
              setShowPlayCounts(value);
            }}
            trackColor={{ false: theme.colors.surfaceAlt, true: theme.colors.accent }}
            thumbColor={showPlayCounts ? '#0A0806' : theme.colors.textMuted}
            ios_backgroundColor={theme.colors.surfaceAlt}
          />
        </View>

        <View style={styles.sectionHeading}>
          <Text style={[styles.sectionIndex, { color: theme.colors.accent }]}>04</Text>
          <View style={styles.sectionHeadingCopy}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Profile signal</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>Your current role and public destination.</Text>
          </View>
        </View>
        <View style={[styles.signalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <View style={[styles.signalIcon, { backgroundColor: theme.colors.surfaceAlt }]}><MaterialIcons name="graphic-eq" size={22} color={theme.colors.accent} /></View>
          <View style={styles.signalCopy}>
            <Text style={[styles.signalLabel, { color: theme.colors.textMuted }]}>PRIMARY PROFILE</Text>
            <Text style={[styles.signalValue, { color: theme.colors.text }]}>{profile.data?.profile_type || 'Music culture'}</Text>
          </View>
          <MaterialIcons name="verified" size={22} color={theme.colors.accent} />
        </View>

        {username ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Preview public profile" style={[styles.previewButton, { borderColor: theme.colors.border }]} onPress={() => router.push(`/creator/${username}` as any)}>
            <Text style={[styles.previewText, { color: theme.colors.text }]}>Preview public profile</Text>
            <MaterialIcons name="arrow-forward" size={20} color={theme.colors.accent} />
          </Pressable>
        ) : null}
      </ScrollView>
    </View>
  );
}

function EditField(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  prefix?: string;
}) {
  const theme = usePluggdTheme();
  return (
    <View style={styles.fieldWrap}>
      <Text style={[styles.fieldLabel, { color: theme.colors.textMuted }]}>{props.label}</Text>
      <View style={[styles.field, props.multiline && styles.fieldMultiline, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        {props.prefix ? <Text style={[styles.prefix, { color: theme.colors.accent }]}>{props.prefix}</Text> : null}
        <TextInput
          value={props.value}
          onChangeText={props.onChangeText}
          placeholder={props.placeholder}
          placeholderTextColor={theme.colors.textMuted}
          multiline={props.multiline}
          autoCapitalize={props.autoCapitalize}
          style={[styles.input, props.multiline && styles.inputMultiline, { color: theme.colors.text }]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 88, paddingHorizontal: 18, paddingBottom: 10, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, alignItems: 'center' },
  headerEyebrow: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.2 },
  headerTitle: { fontFamily: pluggdFonts.displayBold, fontSize: 18, marginTop: 1 },
  saveButton: { minWidth: 68, height: 44, borderRadius: 5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  saveText: { color: '#0A0806', fontFamily: pluggdFonts.satoshiBlack, fontSize: 13, fontWeight: '900' },
  content: { paddingTop: 18, paddingHorizontal: 16 },
  identityStage: { minHeight: 292, borderRadius: 8, borderWidth: 1, overflow: 'hidden', justifyContent: 'flex-end', padding: 18, marginBottom: 28 },
  coverButton: { position: 'absolute', top: 14, right: 14, minHeight: 44, borderRadius: 5, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: 'rgba(0,0,0,0.62)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)' },
  coverButtonText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBlack, fontSize: 11, fontWeight: '900' },
  avatar: { width: 112, height: 112, borderRadius: 56, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FF6600' },
  avatarInitial: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 34 },
  cameraBadge: { position: 'absolute', right: 4, bottom: 4, width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#0A0806' },
  stageCopy: { marginTop: 14 },
  stageEyebrow: { color: '#FF7A22', fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1.4, fontWeight: '900' },
  stageTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.displayExtraBold, fontSize: 30, lineHeight: 34, fontWeight: '800', marginTop: 4 },
  stageMeta: { color: '#C9C0BA', fontFamily: pluggdFonts.satoshiBold, fontSize: 13, marginTop: 3 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 14 },
  sectionIndex: { width: 25, fontFamily: pluggdFonts.satoshiBlack, fontSize: 11, fontWeight: '900', paddingTop: 4 },
  sectionHeadingCopy: { flex: 1 },
  sectionTitle: { fontFamily: pluggdFonts.displayBold, fontSize: 22, lineHeight: 26, fontWeight: '700' },
  sectionSubtitle: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 17, marginTop: 3 },
  fields: { gap: 14, marginBottom: 30 },
  fieldWrap: { gap: 7 },
  fieldLabel: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '900' },
  field: { minHeight: 56, borderRadius: 5, borderWidth: 1, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center' },
  fieldMultiline: { minHeight: 128, alignItems: 'flex-start' },
  prefix: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 16, fontWeight: '900', marginRight: 3 },
  input: { flex: 1, minHeight: 52, fontSize: 15, fontFamily: pluggdFonts.satoshiMedium },
  inputMultiline: { minHeight: 122, paddingTop: 15, textAlignVertical: 'top' },
  visibilityCard: { minHeight: 104, borderRadius: 6, borderWidth: 1, padding: 14, marginBottom: 30, flexDirection: 'row', alignItems: 'center', gap: 12 },
  visibilityIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  visibilityCopy: { flex: 1, minWidth: 0 },
  visibilityTitle: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 13, fontWeight: '900' },
  visibilityBody: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5, lineHeight: 16, marginTop: 4 },
  signalCard: { minHeight: 82, borderRadius: 6, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  signalIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  signalCopy: { flex: 1 },
  signalLabel: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1, fontWeight: '900' },
  signalValue: { fontFamily: pluggdFonts.displayBold, fontSize: 17, textTransform: 'capitalize', marginTop: 3 },
  previewButton: { minHeight: 54, borderRadius: 5, borderWidth: 1, marginTop: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  previewText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 13, fontWeight: '900' },
});
