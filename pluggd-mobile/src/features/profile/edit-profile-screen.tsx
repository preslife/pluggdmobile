import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../components/PluggdImage';
import { useAuth } from '../../context/AuthProvider';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { contentInitials } from '../../lib/mobileContent';
import { supabase } from '../../lib/supabase';

async function loadEditableProfile(userId?: string | null) {
  if (!userId) return null;
  const { data } = await (supabase as any)
    .from('profiles')
    .select('user_id,username,full_name,display_name,bio,avatar_url,cover_image_url,profile_type')
    .eq('user_id', userId)
    .maybeSingle();
  return data as any | null;
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

  useEffect(() => {
    if (!profile.data) return;
    setName(profile.data.display_name || profile.data.full_name || '');
    setUsername(profile.data.username || '');
    setBio(profile.data.bio || '');
  }, [profile.data]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Sign in to update your profile.');
      const { error } = await (supabase as any)
        .from('profiles')
        .update({
          display_name: name.trim() || null,
          full_name: name.trim() || null,
          username: username.trim() || null,
          bio: bio.trim() || null,
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
        <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Edit profile</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Save profile" style={styles.saveButton} onPress={() => mutation.mutate()} disabled={mutation.isPending}>
          <Text style={[styles.saveText, { color: theme.colors.accent }]}>{mutation.isPending ? 'Saving' : 'Save'}</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.avatarArea}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceAlt }]}>
            {profile.data?.avatar_url ? <PluggdImage uri={profile.data.avatar_url} style={StyleSheet.absoluteFill} resizeMode="cover" /> : <Text style={[styles.avatarInitial, { color: theme.colors.text }]}>{contentInitials(displayName)}</Text>}
          </View>
          <Text style={[styles.photoAction, { color: theme.colors.accent }]}>Change photo</Text>
          <Text style={[styles.photoNote, { color: theme.colors.textMuted }]}>Photo updates will appear here soon.</Text>
        </View>

        <View style={[styles.group, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <EditRow label="Name" value={name} onChangeText={setName} placeholder="Display name" />
          <EditRow label="Username" value={username} onChangeText={setUsername} placeholder="username" autoCapitalize="none" />
          <EditRow label="Bio" value={bio} onChangeText={setBio} placeholder="Tell people what you are into" multiline />
        </View>

        <SectionLabel label="Profile information" />
        <View style={[styles.group, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <StaticRow label="Category" value={profile.data?.profile_type || 'Music culture'} />
          <StaticRow label="Banners" value="Featured music, profiles and events" />
          <StaticRow label="Display order" value="Posts first" />
          <StaticRow label="Action buttons" value="Profile actions" />
        </View>
      </ScrollView>
    </View>
  );
}

function EditRow(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  const theme = usePluggdTheme();
  return (
    <View style={[styles.editRow, { borderBottomColor: theme.colors.divider }]}>
      <Text style={[styles.editLabel, { color: theme.colors.textSecondary }]}>{props.label}</Text>
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
  );
}

function StaticRow({ label, value }: { label: string; value: string }) {
  const theme = usePluggdTheme();
  return (
    <View style={[styles.editRow, { borderBottomColor: theme.colors.divider }]}>
      <Text style={[styles.editLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.staticValue, { color: theme.colors.textMuted }]}>{value}</Text>
      <MaterialIcons name="chevron-right" size={22} color={theme.colors.textMuted} />
    </View>
  );
}

function SectionLabel({ label }: { label: string }) {
  const theme = usePluggdTheme();
  return <Text style={[styles.sectionLabel, { color: theme.colors.textMuted }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 72, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: 'Satoshi-Black', fontSize: 19 },
  saveButton: { minWidth: 44, height: 44, alignItems: 'flex-end', justifyContent: 'center' },
  saveText: { fontFamily: 'Satoshi-Bold', fontSize: 15 },
  content: { paddingTop: 20 },
  avatarArea: { alignItems: 'center', paddingBottom: 26 },
  avatar: { width: 116, height: 116, borderRadius: 58, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { fontFamily: 'Satoshi-Black', fontSize: 34 },
  photoAction: { marginTop: 16, fontFamily: 'Satoshi-Bold', fontSize: 18 },
  photoNote: { marginTop: 6, width: 260, textAlign: 'center', fontSize: 12, lineHeight: 17 },
  group: { marginHorizontal: 16, borderRadius: 18, borderWidth: 1, overflow: 'hidden' },
  editRow: { minHeight: 64, borderBottomWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  editLabel: { width: 92, fontSize: 16 },
  input: { flex: 1, minHeight: 52, fontSize: 16, fontFamily: 'Satoshi-Medium' },
  inputMultiline: { minHeight: 106, paddingTop: 16, textAlignVertical: 'top' },
  staticValue: { flex: 1, textAlign: 'right', fontSize: 15, fontFamily: 'Satoshi-Medium' },
  sectionLabel: { marginTop: 26, marginBottom: 9, marginHorizontal: 30, fontFamily: 'Satoshi-Bold', fontSize: 14 },
});
