import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../src/context/AuthProvider';
import { impactHaptic, selectionHaptic } from '../src/design/haptics';
import { MobileFeedAttachmentCard } from '../src/features/community-feed/MobileFeedAttachmentCard';
import type { MobileFeedAttachment } from '../src/features/community-feed/communityFeedTypes';
import {
  buildMobileFeedAttachmentLinkPreview,
  createSocialPost,
  resolveMobileFeedAttachment,
  uploadSocialMediaAsset,
} from '../src/features/culture/mobileServices';
import { contentInitials } from '../src/lib/mobileContent';

const CANVAS = '#08080C';
const SURFACE = '#12121A';
const BORDER = '#1F1F2E';
const ORANGE = '#FF5A00';
const MUTED = '#8E8E9F';

type ComposerMedia = {
  uri: string;
  kind: 'image' | 'video' | 'audio';
  fileName?: string | null;
  mimeType?: string | null;
  durationSeconds?: number | null;
};

function labelForType(type?: string | null) {
  if (type === 'announcement') return 'Announcement';
  if (type === 'thread') return 'Community thread';
  if (type === 'question') return 'Question';
  if (type === 'beat_feedback') return 'Beat feedback';
  if (type === 'track_feedback') return 'Track feedback';
  if (type === 'collab_request') return 'Collab request';
  if (type === 'poll') return 'Poll';
  if (type === 'resource') return 'Resource';
  if (type === 'discussion') return 'Discussion';
  return 'Post';
}

const SUPPORTED_POST_TYPES = new Set([
  'post',
  'discussion',
  'question',
  'beat_feedback',
  'track_feedback',
  'collab_request',
  'announcement',
  'challenge',
  'poll',
  'resource',
  'thread',
]);

export default function CreatePostRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const params = useLocalSearchParams<{
    type?: string;
    communityId?: string;
    destinationType?: string;
    destinationId?: string;
    boardId?: string;
    eventId?: string;
    releaseId?: string;
    beatId?: string;
    galleryId?: string;
    mixId?: string;
    challengeId?: string;
    quotePostId?: string;
    attachmentType?: string;
  }>();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [media, setMedia] = useState<ComposerMedia[]>([]);
  const [attachment, setAttachment] = useState<MobileFeedAttachment | null>(null);
  const [attachmentLoading, setAttachmentLoading] = useState(false);
  const requestedType = typeof params.type === 'string' && SUPPORTED_POST_TYPES.has(params.type) ? params.type : 'post';
  const postType = requestedType;
  const isPoll = postType === 'poll';
  const label = useMemo(() => labelForType(postType), [postType]);
  const destinations = useMemo(() => {
    const rows: Array<{ destination_type: any; destination_id: string }> = [];
    if (params.communityId) rows.push({ destination_type: 'creator_community', destination_id: String(params.communityId) });
    if (params.boardId) rows.push({ destination_type: 'board', destination_id: String(params.boardId) });
    if (params.eventId) rows.push({ destination_type: 'event', destination_id: String(params.eventId) });
    if (params.releaseId) rows.push({ destination_type: 'release', destination_id: String(params.releaseId) });
    if (params.beatId) rows.push({ destination_type: 'beat', destination_id: String(params.beatId) });
    if (params.mixId) rows.push({ destination_type: 'mix', destination_id: String(params.mixId) });
    if (params.challengeId) rows.push({ destination_type: 'challenge', destination_id: String(params.challengeId) });
    if (params.destinationType && params.destinationId) rows.push({ destination_type: String(params.destinationType), destination_id: String(params.destinationId) });
    return rows;
  }, [params.beatId, params.boardId, params.challengeId, params.communityId, params.destinationId, params.destinationType, params.eventId, params.mixId, params.releaseId]);
  const destinationLabel = destinations.length
    ? destinations.map((destination) => destination.destination_type.replace(/_/g, ' ')).join(' + ')
    : 'Community feed + profile';
  const validPollOptions = useMemo(() => pollOptions.map((option) => option.trim()).filter(Boolean), [pollOptions]);
  const pollPayload = useMemo(() => {
    if (!isPoll || !pollQuestion.trim() || validPollOptions.length < 2) return null;
    return {
      question: pollQuestion.trim(),
      options: validPollOptions.map((option, index) => ({ id: `opt-${index}`, text: option, votes: 0 })),
      total_votes: 0,
      multiple_choice: false,
    };
  }, [isPoll, pollQuestion, validPollOptions]);
  const hasAttachmentRequest = Boolean(params.attachmentType);
  const attachmentUnavailable = hasAttachmentRequest && !attachmentLoading && !attachment;
  const submitContent = isPoll ? pollQuestion.trim() : content.trim();
  const canPublish = isPoll
    ? pollQuestion.trim().length > 0 && validPollOptions.length >= 2
    : content.trim().length > 0 || media.length > 0 || Boolean(attachment);
  const publish = () => {
    if (mutation.isPending || !canPublish) return;
    mutation.mutate();
  };

  useEffect(() => {
    let active = true;
    if (!params.attachmentType) {
      setAttachment(null);
      setAttachmentLoading(false);
      return () => {
        active = false;
      };
    }

    setAttachmentLoading(true);
    void resolveMobileFeedAttachment({
      attachmentType: params.attachmentType,
      releaseId: params.releaseId,
      beatId: params.beatId,
      galleryId: params.galleryId,
      mixId: params.mixId,
      eventId: params.eventId,
    }).then((next) => {
      if (!active) return;
      setAttachment(next);
      setAttachmentLoading(false);
    }).catch(() => {
      if (!active) return;
      setAttachment(null);
      setAttachmentLoading(false);
    });

    return () => {
      active = false;
    };
  }, [params.attachmentType, params.beatId, params.eventId, params.galleryId, params.mixId, params.releaseId]);

  const pickImages = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add images.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: 4,
      quality: 0.9,
    });
    if (result.canceled) return;
    setMedia(result.assets.slice(0, 4).map((asset) => ({
      uri: asset.uri,
      kind: 'image',
      fileName: asset.fileName,
      mimeType: asset.mimeType || 'image/jpeg',
    })));
  };

  const pickVideo = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to add video.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.9,
      videoMaxDuration: 180,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const asset = result.assets[0];
    setMedia([{
      uri: asset.uri,
      kind: 'video',
      fileName: asset.fileName,
      mimeType: asset.mimeType || 'video/mp4',
      durationSeconds: asset.duration ? Math.round(asset.duration / 1000) : null,
    }]);
  };

  const pickAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*', 'audio/mpeg', 'audio/wav', 'audio/mp4'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets[0]?.uri) return;
    const asset = result.assets[0];
    setMedia([{
      uri: asset.uri,
      kind: 'audio',
      fileName: asset.name,
      mimeType: asset.mimeType || 'audio/mpeg',
      durationSeconds: null,
    }]);
  };

  const mutation = useMutation({
    mutationFn: async () => {
      const uploaded: Array<{ kind: ComposerMedia['kind']; url: string; durationSeconds?: number | null }> = [];
      for (const item of media) {
        const upload = await uploadSocialMediaAsset({
          uri: item.uri,
          fileName: item.fileName,
          mimeType: item.mimeType,
          folder: 'post',
        });
        if (!upload.success || !upload.url) throw new Error(upload.error || 'Media upload failed.');
        uploaded.push({ kind: item.kind, url: upload.url, durationSeconds: item.durationSeconds });
      }
      const images = uploaded.filter((item) => item.kind === 'image').map((item) => item.url);
      const video = uploaded.find((item) => item.kind === 'video');
      const audio = uploaded.find((item) => item.kind === 'audio');
      return createSocialPost({
        title: title.trim() || null,
        content: submitContent,
        postType,
        communityId: params.communityId || null,
        destinations,
        quotePostId: params.quotePostId || null,
        poll: pollPayload,
        images,
        video: video?.url || null,
        audio: audio?.url || null,
        audioDuration: audio?.durationSeconds || 0,
        linkPreview: attachment ? buildMobileFeedAttachmentLinkPreview(attachment) : null,
      });
    },
    onSuccess: (result) => {
      if (!result.success) throw new Error(result.error);
      impactHaptic();
      void queryClient.invalidateQueries({ queryKey: ['community-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'home-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'mobile-social-feed'] });
      void queryClient.invalidateQueries({ queryKey: ['culture', 'backstage'] });
      setMedia([]);
      if (result.id) router.replace(`/post/${result.id}` as any);
      else router.replace('/community' as any);
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
            <Text style={styles.title}>{label}</Text>
            <Text style={styles.kicker} numberOfLines={1}>{destinationLabel}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Publish ${label}`}
            disabled={mutation.isPending || !canPublish}
            style={[styles.publishMini, (mutation.isPending || !canPublish) && styles.publishButtonDisabled]}
            onPress={publish}
          >
            <Text style={styles.publishMiniText}>{mutation.isPending ? 'Posting' : 'Post'}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <View style={styles.authorRow}>
            <View style={styles.authorAvatar}>
              <Text style={styles.authorInitial}>{contentInitials(user?.email || 'P')}</Text>
            </View>
            <View style={styles.authorCopy}>
              <Text style={styles.authorName} numberOfLines={1}>{user?.email || 'PLUGGD member'}</Text>
              <View style={styles.destinationPill}>
                <MaterialIcons name="public" size={14} color={ORANGE} />
                <Text style={styles.destinationPillText} numberOfLines={1}>{destinationLabel}</Text>
              </View>
            </View>
          </View>

          {isPoll ? (
            <View style={styles.pollBuilder}>
              <Text style={styles.label}>Poll question</Text>
              <TextInput
                value={pollQuestion}
                onChangeText={setPollQuestion}
                placeholder="Ask the community to vote..."
                placeholderTextColor="#62627A"
                style={styles.titleInput}
                maxLength={180}
              />
              <View style={styles.pollOptions}>
                {pollOptions.map((option, index) => (
                  <View key={`poll-option-${index}`} style={styles.pollOptionRow}>
                    <Text style={styles.pollOptionIndex}>{index + 1}</Text>
                    <TextInput
                      value={option}
                      onChangeText={(value) => {
                        const next = [...pollOptions];
                        next[index] = value;
                        setPollOptions(next);
                      }}
                      placeholder={`Option ${index + 1}`}
                      placeholderTextColor="#62627A"
                      style={styles.pollOptionInput}
                      maxLength={80}
                    />
                    {pollOptions.length > 2 ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Remove option ${index + 1}`}
                        style={styles.pollRemoveButton}
                        onPress={() => setPollOptions(pollOptions.filter((_, optionIndex) => optionIndex !== index))}
                      >
                        <MaterialIcons name="close" size={18} color={MUTED} />
                      </Pressable>
                    ) : null}
                  </View>
                ))}
              </View>
              {pollOptions.length < 4 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Add poll option"
                  style={styles.addOptionButton}
                  onPress={() => setPollOptions([...pollOptions, ''])}
                >
                  <MaterialIcons name="add" size={18} color={ORANGE} />
                  <Text style={styles.addOptionText}>Add option</Text>
                </Pressable>
              ) : null}
              <Text style={styles.counter}>{pollQuestion.length}/180 · {validPollOptions.length}/4 options</Text>
            </View>
          ) : (
            <>
              {attachment ? <MobileFeedAttachmentCard attachment={attachment} /> : null}
              {attachmentUnavailable ? (
                <View style={styles.attachmentUnavailable}>
                  <MaterialIcons name="link-off" size={18} color={ORANGE} />
                  <Text style={styles.attachmentUnavailableText}>Shared content could not be loaded. You can still post with a caption.</Text>
                </View>
              ) : null}
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
                maxLength={500}
              />
              <TextInput
                value={title}
                onChangeText={setTitle}
                placeholder={postType === 'announcement' ? 'Add announcement title' : 'Add an optional title'}
                placeholderTextColor="#62627A"
                style={styles.titleInput}
                maxLength={120}
              />
              <Text style={styles.counter}>{content.length}/500</Text>
            </>
          )}
          {media.length ? (
            <View style={styles.mediaPreviewRail}>
              {media.map((item, index) => (
                <View key={`${item.uri}-${index}`} style={styles.mediaChip}>
                  <MaterialIcons name={item.kind === 'image' ? 'image' : item.kind === 'video' ? 'videocam' : 'graphic-eq'} size={18} color={ORANGE} />
                  <Text style={styles.mediaChipText} numberOfLines={1}>{item.fileName || item.kind}</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel="Remove media" onPress={() => setMedia(media.filter((_, mediaIndex) => mediaIndex !== index))}>
                    <MaterialIcons name="close" size={18} color={MUTED} />
                  </Pressable>
                </View>
              ))}
            </View>
          ) : null}
          <View style={styles.toolRow}>
            <Pressable accessibilityRole="button" accessibilityLabel="Add images" style={styles.toolButton} onPress={pickImages} disabled={isPoll}>
              <MaterialIcons name="image" size={22} color={isPoll ? MUTED : ORANGE} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Add video" style={styles.toolButton} onPress={pickVideo} disabled={isPoll}>
              <MaterialIcons name="videocam" size={22} color={isPoll ? MUTED : ORANGE} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Add audio" style={styles.toolButton} onPress={pickAudio} disabled={isPoll}>
              <MaterialIcons name="graphic-eq" size={22} color={isPoll ? MUTED : ORANGE} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Create poll" style={styles.toolButton} onPress={() => router.setParams({ type: 'poll' } as any)}>
              <MaterialIcons name="poll" size={22} color={ORANGE} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Mention help" style={styles.toolButton} onPress={() => Alert.alert('Mentions and hashtags', 'Type @handles and #hashtags in your post to connect it to people and topics.')}>
              <MaterialIcons name="alternate-email" size={22} color={ORANGE} />
            </Pressable>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Publish ${label}`}
          disabled={mutation.isPending || !canPublish}
          style={[styles.publishButton, (mutation.isPending || !canPublish) && styles.publishButtonDisabled]}
          onPress={publish}
        >
          {mutation.isPending ? <ActivityIndicator color={CANVAS} /> : <Text style={styles.publishText}>Publish {label}</Text>}
        </Pressable>

        <View style={styles.note}>
          <MaterialIcons name="info-outline" size={18} color={ORANGE} />
          <Text style={styles.noteText}>
            Posting to {destinationLabel}. Hashtags, mentions, replies and shared cards stay connected to your post.
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
  headerCopy: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: 10 },
  kicker: { color: ORANGE, fontSize: 11, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#FFFFFF', fontFamily: 'Satoshi-Black', fontSize: 20, lineHeight: 25 },
  publishMini: { minWidth: 64, height: 38, borderRadius: 19, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  publishMiniText: { color: CANVAS, fontFamily: 'Satoshi-Bold', fontSize: 13 },
  card: { marginHorizontal: 16, borderRadius: 24, borderWidth: 1, borderColor: BORDER, backgroundColor: SURFACE, padding: 16, gap: 12 },
  authorRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingBottom: 4 },
  authorAvatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1F1F2E', borderWidth: 1, borderColor: '#2C2C3E', alignItems: 'center', justifyContent: 'center' },
  authorInitial: { color: '#FFFFFF', fontFamily: 'Satoshi-Black', fontSize: 14 },
  authorCopy: { flex: 1, minWidth: 0, gap: 5 },
  authorName: { color: '#FFFFFF', fontFamily: 'Satoshi-Bold', fontSize: 15 },
  destinationPill: { alignSelf: 'flex-start', maxWidth: '100%', minHeight: 28, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,90,0,0.32)', backgroundColor: 'rgba(255,90,0,0.1)', paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 5 },
  destinationPillText: { color: '#E4E4E9', fontFamily: 'Satoshi-Bold', fontSize: 12 },
  label: { color: MUTED, fontSize: 12, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.8 },
  titleInput: { minHeight: 48, borderRadius: 16, backgroundColor: '#151520', borderWidth: 1, borderColor: '#262637', color: '#FFFFFF', paddingHorizontal: 13, fontFamily: 'Satoshi-Bold', fontSize: 15 },
  bodyInput: { minHeight: 240, borderRadius: 18, backgroundColor: '#101018', borderWidth: 1, borderColor: '#262637', color: '#FFFFFF', padding: 14, fontSize: 19, lineHeight: 27, fontWeight: '500' },
  counter: { color: '#62627A', fontSize: 11, fontWeight: '800', textAlign: 'right' },
  pollBuilder: { gap: 12 },
  pollOptions: { gap: 10 },
  pollOptionRow: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: '#262637', backgroundColor: '#1F1F2E', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  pollOptionIndex: { width: 20, color: ORANGE, fontSize: 12, fontWeight: '900', textAlign: 'center' },
  pollOptionInput: { flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '700', paddingVertical: 12 },
  pollRemoveButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#151520', alignItems: 'center', justifyContent: 'center' },
  addOptionButton: { height: 42, borderRadius: 21, borderWidth: 1, borderColor: 'rgba(255,90,0,0.36)', backgroundColor: 'rgba(255,90,0,0.08)', alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 },
  addOptionText: { color: ORANGE, fontSize: 13, fontWeight: '900' },
  mediaPreviewRail: { gap: 8 },
  attachmentUnavailable: { minHeight: 46, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,90,0,0.3)', backgroundColor: 'rgba(255,90,0,0.08)', paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  attachmentUnavailableText: { flex: 1, color: '#E4E4E9', fontSize: 12, lineHeight: 17, fontWeight: '700' },
  mediaChip: { minHeight: 42, borderRadius: 14, borderWidth: 1, borderColor: '#262637', backgroundColor: '#1F1F2E', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  mediaChipText: { flex: 1, color: '#FFFFFF', fontFamily: 'Satoshi-Bold', fontSize: 12 },
  toolRow: { minHeight: 48, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#262637', paddingTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  toolButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  publishButton: { height: 54, borderRadius: 27, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', marginHorizontal: 16, marginTop: 18 },
  publishButtonDisabled: { opacity: 0.45 },
  publishText: { color: CANVAS, fontSize: 14, fontWeight: '900' },
  note: { margin: 16, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,90,0,0.32)', backgroundColor: 'rgba(255,90,0,0.08)', padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  noteText: { flex: 1, color: '#E4E4E9', fontSize: 12, lineHeight: 18, fontWeight: '700' },
});
