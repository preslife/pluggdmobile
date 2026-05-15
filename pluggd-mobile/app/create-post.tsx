import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactHaptic, selectionHaptic } from '../src/design/haptics';
import { createSocialPost } from '../src/features/culture/mobileServices';

const CANVAS = '#08080C';
const SURFACE = '#12121A';
const BORDER = '#1F1F2E';
const ORANGE = '#FF5A00';
const MUTED = '#8E8E9F';

function labelForType(type?: string | null) {
  if (type === 'announcement') return 'Announcement';
  if (type === 'thread') return 'Backstage thread';
  return 'Post';
}

export default function CreatePostRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ type?: string; communityId?: string }>();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const postType = params.type === 'announcement' || params.type === 'thread' ? params.type : 'post';
  const label = useMemo(() => labelForType(postType), [postType]);

  const mutation = useMutation({
    mutationFn: () =>
      createSocialPost({
        title: title.trim() || null,
        content,
        postType,
        communityId: params.communityId || null,
      }),
    onSuccess: (result) => {
      if (!result.success) throw new Error(result.error);
      impactHaptic();
      void queryClient.invalidateQueries({ queryKey: ['culture', 'home-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'backstage'] });
      if (result.id) router.replace(`/post/${result.id}` as any);
      else router.replace('/backstage' as any);
    },
    onError: (error) => Alert.alert('Post failed', error instanceof Error ? error.message : String(error)),
  });

  return (
    <View style={styles.screen}>
      <LinearGradient colors={[CANVAS, '#090910', CANVAS]} style={StyleSheet.absoluteFill} />
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: Math.max(insets.top + 18, 58), paddingBottom: insets.bottom + 42 }}
      >
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.iconButton}
            onPress={() => {
              selectionHaptic();
              router.back();
            }}
          >
            <MaterialIcons name="chevron-left" size={28} color="#FFFFFF" />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.kicker}>CREATE</Text>
            <Text style={styles.title}>{label}</Text>
          </View>
          <View style={styles.iconButtonPlaceholder} />
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder={postType === 'announcement' ? 'Announcement title' : 'Optional title'}
            placeholderTextColor="#62627A"
            style={styles.titleInput}
            maxLength={120}
          />

          <Text style={styles.label}>Message</Text>
          <TextInput
            value={content}
            onChangeText={setContent}
            placeholder={
              postType === 'thread'
                ? 'Start the conversation...'
                : postType === 'announcement'
                  ? 'Tell fans what is happening...'
                  : 'Share a music update...'
            }
            placeholderTextColor="#62627A"
            style={styles.bodyInput}
            multiline
            textAlignVertical="top"
            maxLength={2200}
          />
          <Text style={styles.counter}>{content.length}/2200</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Publish ${label}`}
          disabled={mutation.isPending || content.trim().length === 0}
          style={[styles.publishButton, (mutation.isPending || content.trim().length === 0) && styles.publishButtonDisabled]}
          onPress={() => mutation.mutate()}
        >
          {mutation.isPending ? <ActivityIndicator color={CANVAS} /> : <Text style={styles.publishText}>Publish {label}</Text>}
        </Pressable>

        <View style={styles.note}>
          <MaterialIcons name="info-outline" size={18} color={ORANGE} />
          <Text style={styles.noteText}>
            Media upload and advanced scheduling stay disabled until the mobile backend contract is confirmed. This composer writes a real social post.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CANVAS },
  header: { marginHorizontal: 16, marginBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: SURFACE, borderWidth: 1, borderColor: BORDER, alignItems: 'center', justifyContent: 'center' },
  iconButtonPlaceholder: { width: 42, height: 42 },
  headerCopy: { alignItems: 'center', gap: 2 },
  kicker: { color: ORANGE, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#FFFFFF', fontSize: 24, lineHeight: 30, fontWeight: '900' },
  card: { marginHorizontal: 16, borderRadius: 22, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, padding: 16, gap: 10 },
  label: { color: MUTED, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  titleInput: { minHeight: 48, borderRadius: 14, backgroundColor: '#1F1F2E', borderWidth: 1, borderColor: '#262637', color: '#FFFFFF', paddingHorizontal: 13, fontSize: 16, fontWeight: '800' },
  bodyInput: { minHeight: 220, borderRadius: 16, backgroundColor: '#1F1F2E', borderWidth: 1, borderColor: '#262637', color: '#FFFFFF', padding: 13, fontSize: 16, lineHeight: 23, fontWeight: '600' },
  counter: { color: '#62627A', fontSize: 11, fontWeight: '800', textAlign: 'right' },
  publishButton: { height: 54, borderRadius: 27, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 18 },
  publishButtonDisabled: { opacity: 0.45 },
  publishText: { color: CANVAS, fontSize: 14, fontWeight: '900' },
  note: { margin: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,90,0,0.32)', backgroundColor: 'rgba(255,90,0,0.08)', padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  noteText: { flex: 1, color: '#E4E4E9', fontSize: 12, lineHeight: 18, fontWeight: '700' },
});
