import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { pluggdFonts } from '../../src/design/typography';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CameraView, useCameraPermissions, useMicrophonePermissions, type CameraType } from 'expo-camera';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '../../components/BrandLogo';
import { CreatorAccessGate } from '../../components/CreatorAccessGate';
import { useAuth } from '../../src/context/AuthProvider';
import { loadEligibleLiveEvents } from '../../src/features/culture/mobileServices';
import { supabase } from '../../src/lib/supabase';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

type LiveMode = 'creator_live' | 'collab_live' | 'class_live' | 'audio_room';
type LiveDiscoveryCategory = 'community_room' | 'listening_party' | 'studio_cook_up' | 'event_linked';
type ScheduleMode = 'now' | 'later';

type RoomPayload = {
  title: string;
  description: string | null;
  status: 'idle' | 'live';
  is_public: boolean;
  scheduled_for: string | null;
  live_mode: LiveMode;
  allow_stage_requests: boolean;
  max_stage_participants: number;
  participant_count: number;
  mode_config: {
    mobile_created: boolean;
    room_mode_label: string;
    discovery_category: LiveDiscoveryCategory;
    linked_event_id?: string;
  };
  recording_enabled: boolean;
  captions_enabled: boolean;
  restream_enabled: boolean;
  restream_targets: Array<Record<string, unknown>>;
};

const LIVE_MODES: Array<{
  key: LiveMode;
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  defaultStage: boolean;
  maxStage: number;
}> = [
  {
    key: 'creator_live',
    title: 'Creator Live',
    description: 'Solo broadcast for release updates, performances, and fan Q&A.',
    icon: 'videocam',
    defaultStage: false,
    maxStage: 1,
  },
  {
    key: 'collab_live',
    title: 'Collab Live',
    description: 'Bring approved guests on stage for co-hosts, cyphers, and reviews.',
    icon: 'groups',
    defaultStage: true,
    maxStage: 4,
  },
  {
    key: 'class_live',
    title: 'Class / Workshop',
    description: 'Teach a session with structured stage requests and questions.',
    icon: 'school',
    defaultStage: true,
    maxStage: 8,
  },
  {
    key: 'audio_room',
    title: 'Audio Room',
    description: 'Voice-led rooms for panels, listening parties, and audience Q&A.',
    icon: 'graphic-eq',
    defaultStage: true,
    maxStage: 6,
  },
];

const DISCOVERY_CATEGORIES: Array<{
  key: LiveDiscoveryCategory;
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}> = [
  { key: 'community_room', title: 'Community Room', description: 'Conversation, Q&A, panels and community-led sessions.', icon: 'forum' },
  { key: 'listening_party', title: 'Listening Party', description: 'Premieres, album playbacks and music-first sessions.', icon: 'headphones' },
  { key: 'studio_cook_up', title: 'Studio / Cook-up', description: 'Making music, workshops, feedback and behind-the-scenes work.', icon: 'graphic-eq' },
  { key: 'event_linked', title: 'Event-linked', description: 'A live companion to one of your real upcoming PLUGGD events.', icon: 'event' },
];

function defaultScheduledAt() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(19, 0, 0, 0);
  return date;
}

function formatScheduleDate(value: Date) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }).format(value);
}

function formatScheduleTime(value: Date) {
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' }).format(value);
}

function PluggdWordmark() {
  return <BrandLogo variant="auto" width={112} height={34} />;
}

export default function CreateLiveRoomScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const styles = useLiveCreateStyles();
  const { user } = useAuth();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [microphonePermission, requestMicrophonePermission] = useMicrophonePermissions();
  const [step, setStep] = useState<'setup' | 'green-room'>('setup');
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [cameraFacing, setCameraFacing] = useState<CameraType>('front');
  const [audioRoute, setAudioRoute] = useState<'speaker' | 'receiver'>('speaker');
  const [permissionBusy, setPermissionBusy] = useState(false);
  const [selectedMode, setSelectedMode] = useState<LiveMode>('creator_live');
  const [discoveryCategory, setDiscoveryCategory] = useState<LiveDiscoveryCategory>('community_room');
  const [linkedEventId, setLinkedEventId] = useState<string | null>(null);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('now');
  const [title, setTitle] = useState('Live Session');
  const [description, setDescription] = useState('');
  const [scheduledAt, setScheduledAt] = useState(defaultScheduledAt);
  const [schedulePicker, setSchedulePicker] = useState<'date' | 'time' | null>(null);
  const [isPublic, setIsPublic] = useState(true);
  const [allowStageRequests, setAllowStageRequests] = useState(false);
  const [maxStageParticipants, setMaxStageParticipants] = useState(1);
  const [saving, setSaving] = useState(false);
  const eligibleEvents = useQuery({
    queryKey: ['live', 'eligible-events', user?.id],
    queryFn: () => loadEligibleLiveEvents(user!.id),
    enabled: Boolean(user?.id),
  });

  const mode = useMemo(
    () => LIVE_MODES.find((item) => item.key === selectedMode) ?? LIVE_MODES[0],
    [selectedMode],
  );

  const handleModePress = (nextMode: LiveMode) => {
    const next = LIVE_MODES.find((item) => item.key === nextMode) ?? LIVE_MODES[0];
    setSelectedMode(next.key);
    setAllowStageRequests(next.defaultStage);
    setMaxStageParticipants(next.maxStage);
    if (title === 'Live Session') {
      setTitle(next.title);
    }
  };

  const buildPayload = (): RoomPayload | null => {
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      Alert.alert('Title required', 'Add a room title before creating the room.');
      return null;
    }

    const scheduledFor = scheduleMode === 'later' ? scheduledAt.toISOString() : null;

    if (scheduleMode === 'later' && scheduledAt.getTime() <= Date.now()) {
      Alert.alert('Choose a future time', 'Select when you want this live room to begin.');
      return null;
    }

    if (discoveryCategory === 'event_linked' && !linkedEventId) {
      Alert.alert('Choose an event', 'Select one of your upcoming PLUGGD events.');
      return null;
    }

    const safeMaxStage = Math.min(16, Math.max(1, Math.round(Number(maxStageParticipants || 1))));

    return {
      title: trimmedTitle,
      description: description.trim() || null,
      status: scheduleMode === 'now' ? 'live' : 'idle',
      is_public: isPublic,
      scheduled_for: scheduledFor,
      live_mode: selectedMode,
      allow_stage_requests: allowStageRequests,
      max_stage_participants: safeMaxStage,
      participant_count: 0,
      mode_config: {
        mobile_created: true,
        room_mode_label: mode.title,
        discovery_category: discoveryCategory,
        ...(discoveryCategory === 'event_linked' && linkedEventId ? { linked_event_id: linkedEventId } : {}),
      },
      recording_enabled: selectedMode !== 'audio_room',
      captions_enabled: false,
      restream_enabled: false,
      restream_targets: [],
    };
  };

  const createRoom = async () => {
    const payload = buildPayload();
    if (!payload) return;

    setSaving(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/auth/login');
        return;
      }

      const { data, error } = await supabase.functions.invoke<{
        room?: { id: string };
      }>('manage-live-sessions', {
        body: {
          action: 'create',
          payload,
        },
      });

      if (error) throw error;

      const roomId = data?.room?.id;
      if (!roomId) throw new Error('The room could not be confirmed. Please try again.');

      if (payload.status === 'live') {
        router.replace({
          pathname: '/live/session',
          params: {
            roomId,
            role: 'host',
            initialCamera: cameraEnabled && selectedMode !== 'audio_room' ? 'on' : 'off',
            initialMic: microphoneEnabled ? 'on' : 'off',
            initialFacing: cameraFacing,
            audioRoute,
          },
        } as any);
      } else {
        Alert.alert('Room scheduled', 'Your room is ready in the Live lobby.', [
          { text: 'View lobby', onPress: () => router.replace('/live') },
        ]);
      }
    } catch (error: any) {
      console.error('Failed to create live room:', error);
      Alert.alert('Could not create room', 'Check your connection and try again.');
    } finally {
      setSaving(false);
    }
  };

  const incrementStage = (amount: number) => {
    setMaxStageParticipants((current) => Math.min(16, Math.max(1, current + amount)));
  };

  const openGreenRoom = async () => {
    const payload = buildPayload();
    if (!payload) return;
    if (payload.status !== 'live') {
      await createRoom();
      return;
    }

    setPermissionBusy(true);
    try {
      if (selectedMode !== 'audio_room' && cameraPermission?.status !== 'granted') {
        await requestCameraPermission();
      }
      if (microphonePermission?.status !== 'granted') {
        await requestMicrophonePermission();
      }
      setStep('green-room');
    } finally {
      setPermissionBusy(false);
    }
  };

  const cameraGranted = cameraPermission?.status === 'granted';
  const microphoneGranted = microphonePermission?.status === 'granted';
  const mediaReady = microphoneGranted && (selectedMode === 'audio_room' || cameraGranted);
  const canRequestMediaAccess = Boolean(
    microphonePermission?.canAskAgain !== false
      && (selectedMode === 'audio_room' || cameraPermission?.canAskAgain !== false),
  );

  const requestMediaAccess = async () => {
    setPermissionBusy(true);
    try {
      if (selectedMode !== 'audio_room' && cameraPermission?.status !== 'granted') {
        await requestCameraPermission();
      }
      if (microphonePermission?.status !== 'granted') {
        await requestMicrophonePermission();
      }
    } finally {
      setPermissionBusy(false);
    }
  };

  const updateScheduledAt = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setSchedulePicker(null);
    if (event.type === 'dismissed' || !selected || !schedulePicker) return;
    setScheduledAt((current) => {
      const next = new Date(current);
      if (schedulePicker === 'date') {
        next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
      } else {
        next.setHours(selected.getHours(), selected.getMinutes(), 0, 0);
      }
      return next;
    });
  };

  if (step === 'green-room') {
    return (
      <CreatorAccessGate>
        <SafeAreaView style={styles.screen}>
          <StatusBar style="light" />
          <Stack.Screen options={{ headerShown: false }} />
          <View style={styles.greenHeader}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to live setup" style={styles.iconButton} onPress={() => setStep('setup')}>
              <MaterialIcons name="chevron-left" size={27} color={theme.colors.text} />
            </Pressable>
            <View style={styles.headerCenter}><PluggdWordmark /><Text style={styles.pageTitle}>GREEN ROOM</Text></View>
            <View style={styles.stepMarker}><Text style={styles.stepMarkerText}>02</Text></View>
          </View>

          <ScrollView contentContainerStyle={styles.greenContent} showsVerticalScrollIndicator={false}>
            <View style={styles.greenIntro}>
              <Text style={styles.heroKicker}>PRIVATE PREVIEW</Text>
              <Text style={styles.greenTitle}>Look and sound right before you go live.</Text>
              <Text style={styles.heroBody}>Nothing is broadcasting yet. Your selected camera, microphone and listening route are applied when you enter the room.</Text>
            </View>

            <View style={styles.previewFrame}>
              {selectedMode !== 'audio_room' && cameraEnabled && cameraGranted ? (
                <CameraView style={StyleSheet.absoluteFill} facing={cameraFacing} />
              ) : (
                <View style={styles.previewFallback}>
                  <MaterialIcons name={selectedMode === 'audio_room' ? 'graphic-eq' : 'videocam-off'} size={54} color="#FFFFFF" />
                  <Text style={styles.previewFallbackTitle}>{selectedMode === 'audio_room' ? 'Audio Room' : cameraGranted ? 'Camera off' : 'Camera access needed'}</Text>
                </View>
              )}
              <View style={styles.previewScrim} />
              <View style={styles.previewTopRow}>
                <View style={styles.previewPrivatePill}><View style={styles.previewPrivateDot} /><Text style={styles.previewPrivateText}>PRIVATE</Text></View>
                <Text style={styles.previewMode}>{mode.title.toUpperCase()}</Text>
              </View>
              <View style={styles.previewIdentity}>
                <Text style={styles.previewTitle} numberOfLines={2}>{title.trim() || mode.title}</Text>
                <Text style={styles.previewStatus}>{microphoneEnabled && microphoneGranted ? 'Microphone ready' : 'Microphone off'}</Text>
              </View>
            </View>

            {!mediaReady ? (
              <View style={styles.permissionCard}>
                <MaterialIcons name="privacy-tip" size={22} color={theme.colors.accentText} />
                <View style={styles.permissionCopy}>
                  <Text style={styles.permissionTitle}>Allow {selectedMode === 'audio_room' ? 'microphone' : 'camera and microphone'}</Text>
                  <Text style={styles.permissionBody}>This access is needed when you start your live.</Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={canRequestMediaAccess ? 'Request broadcast access' : 'Open device Settings'}
                  disabled={permissionBusy}
                  style={styles.permissionButton}
                  onPress={() => canRequestMediaAccess ? void requestMediaAccess() : void Linking.openSettings()}
                >
                  {permissionBusy ? <ActivityIndicator color={theme.colors.onAccent} size="small" /> : <Text style={styles.permissionButtonText}>{canRequestMediaAccess ? 'Allow' : 'Settings'}</Text>}
                </Pressable>
              </View>
            ) : null}

            <View style={styles.greenSection}>
              <Text style={styles.sectionKicker}>INPUTS</Text>
              <Text style={styles.sectionTitle}>Camera and microphone</Text>
              <View style={styles.greenControlGrid}>
                {selectedMode !== 'audio_room' ? (
                  <Pressable accessibilityRole="button" accessibilityState={{ selected: cameraEnabled }} onPress={() => setCameraEnabled((current) => !current)} style={[styles.greenControl, cameraEnabled && styles.greenControlActive]}>
                    <MaterialIcons name={cameraEnabled ? 'videocam' : 'videocam-off'} size={22} color={cameraEnabled ? theme.colors.onAccent : theme.colors.text} />
                    <Text style={[styles.greenControlText, cameraEnabled && styles.greenControlTextActive]}>{cameraEnabled ? 'Camera on' : 'Camera off'}</Text>
                  </Pressable>
                ) : null}
                <Pressable accessibilityRole="button" accessibilityState={{ selected: microphoneEnabled }} onPress={() => setMicrophoneEnabled((current) => !current)} style={[styles.greenControl, microphoneEnabled && styles.greenControlActive]}>
                  <MaterialIcons name={microphoneEnabled ? 'mic' : 'mic-off'} size={22} color={microphoneEnabled ? theme.colors.onAccent : theme.colors.text} />
                  <Text style={[styles.greenControlText, microphoneEnabled && styles.greenControlTextActive]}>{microphoneEnabled ? 'Mic on' : 'Mic off'}</Text>
                </Pressable>
                {selectedMode !== 'audio_room' ? (
                  <Pressable accessibilityRole="button" accessibilityLabel="Flip camera" disabled={!cameraEnabled || !cameraGranted} onPress={() => setCameraFacing((current) => current === 'front' ? 'back' : 'front')} style={[styles.greenControl, (!cameraEnabled || !cameraGranted) && styles.greenControlDisabled]}>
                    <MaterialIcons name="flip-camera-ios" size={22} color={theme.colors.text} />
                    <Text style={styles.greenControlText}>{cameraFacing === 'front' ? 'Front camera' : 'Back camera'}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>

            <View style={styles.greenSection}>
              <Text style={styles.sectionKicker}>SOUND</Text>
              <Text style={styles.sectionTitle}>Listen through</Text>
              <View style={styles.routeRow}>
                {(['speaker', 'receiver'] as const).map((route) => (
                  <Pressable key={route} accessibilityRole="radio" accessibilityState={{ selected: audioRoute === route }} onPress={() => setAudioRoute(route)} style={[styles.routeChoice, audioRoute === route && styles.routeChoiceActive]}>
                    <MaterialIcons name={route === 'speaker' ? 'volume-up' : 'phone-in-talk'} size={20} color={audioRoute === route ? theme.colors.onAccent : theme.colors.text} />
                    <Text style={[styles.routeChoiceText, audioRoute === route && styles.greenControlTextActive]}>{route === 'speaker' ? 'Speaker' : 'Receiver'}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable accessibilityRole="button" accessibilityLabel="Go live now" accessibilityState={{ disabled: saving || !mediaReady }} disabled={saving || !mediaReady} style={[styles.cta, (saving || !mediaReady) && styles.ctaDisabled]} onPress={createRoom}>
              {saving ? <ActivityIndicator color={theme.colors.onAccent} /> : <><MaterialIcons name="sensors" size={22} color={theme.colors.onAccent} /><Text style={styles.ctaText}>Go Live</Text></>}
            </Pressable>
          </View>
        </SafeAreaView>
      </CreatorAccessGate>
    );
  }

  return (
    <CreatorAccessGate>
      <SafeAreaView style={styles.screen}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            hitSlop={6}
            style={styles.iconButton}
            onPress={() => router.back()}
          >
            <MaterialIcons name="chevron-left" size={27} color={theme.colors.text} />
          </Pressable>

          <View style={styles.headerCenter}>
            <PluggdWordmark />
            <Text style={styles.pageTitle}>LIVE STUDIO</Text>
          </View>

          <View style={styles.stepMarker}>
            <Text style={styles.stepMarkerText}>01</Text>
          </View>
        </View>

        <View style={styles.heroBlock}>
          <Text style={styles.heroKicker}>BROADCAST SETUP</Text>
          <Text style={styles.heroTitle}>Set the room in motion.</Text>
          <Text style={styles.heroBody}>Choose the energy, shape the stage and bring your people into the moment.</Text>
          <View style={styles.signalStrip}>
            <View style={styles.signalDot} />
            <Text style={styles.signalText}>LIVE VIDEO · CHAT · GIFTS · STAGE REQUESTS</Text>
          </View>
        </View>

        <Text style={styles.sectionKicker}>CHOOSE A FORMAT</Text>
        <Text style={styles.sectionTitle}>Room type</Text>
        <View style={styles.modeGrid}>
          {LIVE_MODES.map((item) => {
            const selected = selectedMode === item.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="button"
                accessibilityLabel={`${item.title}. ${item.description}`}
                accessibilityState={{ selected }}
                style={[styles.modeCard, selected && styles.modeCardSelected]}
                onPress={() => handleModePress(item.key)}
              >
                <View style={styles.modeHeader}>
                  <View style={styles.modeIconBox}>
                    <MaterialIcons
                      name={item.icon}
                      size={23}
                      color={selected ? theme.colors.accentText : theme.colors.textSecondary}
                    />
                  </View>
                  <View style={[styles.selectCircle, selected && styles.selectCircleActive]}>
                    {selected ? <MaterialIcons name="check" size={15} color={theme.colors.onAccent} /> : null}
                  </View>
                </View>
                <Text style={styles.modeTitle}>{item.title}</Text>
                <Text style={styles.modeDescription}>{item.description}</Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Battle Mode. Submit tracks, enter tournament brackets and vote in live matchups."
          onPress={() => router.push('/live/battles' as any)}
          style={({ pressed }) => [styles.battleModeCard, pressed && styles.battleModeCardPressed]}
        >
          <View style={styles.battleModeIcon}><MaterialIcons name="emoji-events" size={25} color={theme.colors.accentText} /></View>
          <View style={styles.battleModeCopy}>
            <View style={styles.battleModeTitleRow}><Text style={styles.battleModeTitle}>Battle Mode</Text><Text style={styles.battleModeBadge}>TOURNAMENT</Text></View>
            <Text style={styles.battleModeDescription}>Submit tracks, enter the bracket and vote through live matchups.</Text>
          </View>
          <MaterialIcons name="arrow-forward" size={22} color={theme.colors.accentText} />
        </Pressable>

        <Text style={styles.sectionKicker}>CHOOSE WHERE IT APPEARS</Text>
        <Text style={styles.sectionTitle}>Discovery category</Text>
        <View style={styles.discoveryCategoryList}>
          {DISCOVERY_CATEGORIES.map((item) => {
            const selected = discoveryCategory === item.key;
            return (
              <Pressable
                key={item.key}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${item.title}. ${item.description}`}
                accessibilityState={{ selected }}
                onPress={() => {
                  setDiscoveryCategory(item.key);
                  if (item.key !== 'event_linked') setLinkedEventId(null);
                }}
                style={[styles.discoveryCategory, selected && styles.discoveryCategorySelected]}
              >
                <View style={[styles.discoveryCategoryIcon, selected && styles.discoveryCategoryIconSelected]}><MaterialIcons name={item.icon} size={21} color={selected ? theme.colors.onAccent : theme.colors.accentText} /></View>
                <View style={styles.discoveryCategoryCopy}><Text style={styles.discoveryCategoryTitle}>{item.title}</Text><Text style={styles.discoveryCategoryDescription}>{item.description}</Text></View>
                <MaterialIcons name={selected ? 'radio-button-checked' : 'radio-button-unchecked'} size={21} color={selected ? theme.colors.accentText : theme.colors.textMuted} />
              </Pressable>
            );
          })}
        </View>

        {discoveryCategory === 'event_linked' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Choose the linked event</Text>
            <Text style={styles.eventHelp}>Choose from your upcoming PLUGGD events.</Text>
            {eligibleEvents.isLoading ? <ActivityIndicator color={theme.colors.accentText} style={styles.eventLoader} /> : null}
            {eligibleEvents.isError ? <Text style={styles.eventEmpty}>Your events could not be loaded. Try again before creating this room.</Text> : null}
            {!eligibleEvents.isLoading && !eligibleEvents.isError && !eligibleEvents.data?.length ? (
              <View style={styles.eventEmptyBlock}><Text style={styles.eventEmpty}>No eligible upcoming events are available.</Text><Pressable accessibilityRole="button" accessibilityLabel="Open Creator Events" onPress={() => router.push('/creator/events' as any)} style={styles.eventManageButton}><Text style={styles.eventManageText}>Open Creator Events</Text></Pressable></View>
            ) : null}
            {eligibleEvents.data?.map((event) => {
              const selected = linkedEventId === event.id;
              return (
                <Pressable key={event.id} accessible accessibilityRole="button" accessibilityLabel={`Link ${event.title || 'event'}`} accessibilityState={{ selected }} onPress={() => setLinkedEventId(event.id)} style={[styles.eventChoice, selected && styles.eventChoiceSelected]}>
                  <View style={styles.eventChoiceCopy}><Text style={styles.eventChoiceTitle}>{event.title || 'Untitled event'}</Text><Text style={styles.eventChoiceMeta}>{event.starts_at ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(event.starts_at)) : 'Date TBA'}</Text></View>
                  <MaterialIcons name={selected ? 'check-circle' : 'radio-button-unchecked'} size={22} color={selected ? theme.colors.accentText : theme.colors.textMuted} />
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Room details</Text>
          <FieldLabel label="Title" />
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Room title"
            placeholderTextColor={theme.colors.textSubtle}
            style={styles.input}
          />

          <FieldLabel label="Description" />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What is happening in this room?"
            placeholderTextColor={theme.colors.textSubtle}
            style={[styles.input, styles.textArea]}
            multiline
          />

          <View style={styles.segmentedControl}>
            <SegmentButton label="Go live now" active={scheduleMode === 'now'} onPress={() => setScheduleMode('now')} />
            <SegmentButton label="Schedule" active={scheduleMode === 'later'} onPress={() => setScheduleMode('later')} />
          </View>

          {scheduleMode === 'later' ? (
            <>
              <View style={styles.scheduleGrid}>
                <View style={styles.scheduleField}>
                  <FieldLabel label="Date" />
                  <Pressable accessibilityRole="button" accessibilityLabel={`Choose date. ${formatScheduleDate(scheduledAt)}`} onPress={() => setSchedulePicker('date')} style={styles.schedulePickerButton}>
                    <MaterialIcons name="calendar-today" size={18} color={theme.colors.accentText} />
                    <Text style={styles.schedulePickerText} numberOfLines={2}>{formatScheduleDate(scheduledAt)}</Text>
                  </Pressable>
                </View>
                <View style={styles.scheduleField}>
                  <FieldLabel label="Time" />
                  <Pressable accessibilityRole="button" accessibilityLabel={`Choose time. ${formatScheduleTime(scheduledAt)}`} onPress={() => setSchedulePicker('time')} style={styles.schedulePickerButton}>
                    <MaterialIcons name="schedule" size={18} color={theme.colors.accentText} />
                    <Text style={styles.schedulePickerText}>{formatScheduleTime(scheduledAt)}</Text>
                  </Pressable>
                </View>
              </View>
              {schedulePicker ? (
                <View style={styles.schedulePickerPanel}>
                  <DateTimePicker
                    value={scheduledAt}
                    mode={schedulePicker}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={schedulePicker === 'date' ? new Date() : undefined}
                    minuteInterval={5}
                    onChange={updateScheduledAt}
                    themeVariant={theme.scheme}
                  />
                  {Platform.OS === 'ios' ? <Pressable accessibilityRole="button" accessibilityLabel="Done choosing schedule" onPress={() => setSchedulePicker(null)} style={styles.schedulePickerDone}><Text style={styles.schedulePickerDoneText}>Done</Text></Pressable> : null}
                </View>
              ) : null}
            </>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Access and stage</Text>

          <ToggleRow
            icon="public"
            title="Public room"
            subtitle="Anyone can discover and join as audience."
            value={isPublic}
            onValueChange={setIsPublic}
          />

          <ToggleRow
            icon="person-add-alt-1"
            title="Stage requests"
            subtitle="Audience can ask to join the stage for approved modes."
            value={allowStageRequests}
            onValueChange={setAllowStageRequests}
          />

          <View style={styles.stepperRow}>
            <View style={styles.stepperText}>
              <Text style={styles.rowTitle}>Max stage participants</Text>
              <Text style={styles.rowSubtitle}>
                {selectedMode === 'creator_live' ? 'Usually 1 for solo lives.' : 'Includes host and approved guests.'}
              </Text>
            </View>
            <View style={styles.stepper}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Remove one stage participant"
                style={styles.stepperButton}
                onPress={() => incrementStage(-1)}
              >
                <MaterialIcons name="remove" size={18} color={theme.colors.text} />
              </Pressable>
              <Text style={styles.stepperValue}>{maxStageParticipants}</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Add one stage participant"
                style={styles.stepperButton}
                onPress={() => incrementStage(1)}
              >
                <MaterialIcons name="add" size={18} color={theme.colors.text} />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={22} color={theme.colors.accentText} />
          <Text style={styles.infoText}>
            {selectedMode === 'audio_room'
              ? 'Audio rooms put voices first, with live chat, gifts and stage requests.'
              : 'Video rooms bring camera, chat, gifts, reactions and host controls together in one live space.'}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={scheduleMode === 'now' ? 'Continue to Green Room' : 'Schedule room'}
          accessibilityState={{ disabled: saving || permissionBusy || (discoveryCategory === 'event_linked' && !linkedEventId) }}
          style={[styles.cta, (saving || permissionBusy || (discoveryCategory === 'event_linked' && !linkedEventId)) && styles.ctaDisabled]}
          onPress={openGreenRoom}
          disabled={saving || permissionBusy || (discoveryCategory === 'event_linked' && !linkedEventId)}
        >
          {saving || permissionBusy ? (
            <ActivityIndicator color={theme.colors.onAccent} />
          ) : (
            <>
              <MaterialIcons
                name={scheduleMode === 'now' ? 'video-settings' : 'event'}
                size={21}
                color={theme.colors.onAccent}
              />
              <Text style={styles.ctaText}>{scheduleMode === 'now' ? 'Continue to Green Room' : 'Schedule room'}</Text>
            </>
          )}
        </Pressable>
      </View>
      </SafeAreaView>
    </CreatorAccessGate>
  );
}

function FieldLabel({ label }: { label: string }) {
  const styles = useLiveCreateStyles();
  return <Text style={styles.fieldLabel}>{label}</Text>;
}

function SegmentButton({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  const styles = useLiveCreateStyles();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: active }}
      style={[styles.segmentButton, active && styles.segmentButtonActive]}
      onPress={onPress}
    >
      <Text style={[styles.segmentButtonText, active && styles.segmentButtonTextActive]}>{label}</Text>
    </Pressable>
  );
}

function ToggleRow({
  icon,
  title,
  subtitle,
  value,
  onValueChange,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  const theme = usePluggdTheme();
  const styles = useLiveCreateStyles();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.rowIconBox}>
        <MaterialIcons name={icon} size={22} color={theme.colors.accentText} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.surfacePressed, true: theme.colors.accentFill }}
        thumbColor={theme.colors.surfaceRaised}
      />
    </View>
  );
}

function useLiveCreateStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  topBar: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 5,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    alignItems: 'center',
  },
  stepMarker: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepMarkerText: {
    color: theme.colors.textMuted,
    fontSize: 11,
    fontFamily: pluggdFonts.satoshiBlack,
    letterSpacing: 1.4,
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: theme.colors.text,
    fontSize: 20,
    lineHeight: 24,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    letterSpacing: 1,
  },
  logoAccent: {
    color: theme.colors.accentText,
  },
  pageTitle: {
    color: theme.colors.accentText,
    fontSize: 8.5,
    fontFamily: pluggdFonts.satoshiBlack,
    letterSpacing: 1.75,
    marginTop: 1,
  },
  greenHeader: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  greenContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 124,
  },
  greenIntro: { paddingBottom: 18 },
  greenTitle: {
    color: theme.colors.text,
    fontSize: 29,
    lineHeight: 33,
    fontFamily: pluggdFonts.displayBold,
    letterSpacing: -0.9,
    marginTop: 7,
    maxWidth: 340,
  },
  previewFrame: {
    width: '100%',
    aspectRatio: 9 / 12,
    maxHeight: 430,
    minHeight: 320,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#120B08',
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    marginBottom: 14,
  },
  previewFallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#21110B',
  },
  previewFallbackTitle: { color: '#FFFFFF', fontSize: 17, fontFamily: pluggdFonts.displayBold },
  previewScrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.18)' },
  previewTopRow: {
    position: 'absolute',
    top: 14,
    left: 14,
    right: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewPrivatePill: {
    minHeight: 30,
    borderRadius: 15,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(7,5,4,0.76)',
  },
  previewPrivateDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.colors.accentFill },
  previewPrivateText: { color: '#FFFFFF', fontSize: 9, fontFamily: pluggdFonts.satoshiBlack, letterSpacing: 1.2 },
  previewMode: { color: '#FFFFFF', fontSize: 9, fontFamily: pluggdFonts.satoshiBlack, letterSpacing: 1.1, textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 4 },
  previewIdentity: { position: 'absolute', left: 16, right: 16, bottom: 16 },
  previewTitle: { color: '#FFFFFF', fontSize: 26, lineHeight: 30, fontFamily: pluggdFonts.displayBold, textShadowColor: 'rgba(0,0,0,0.72)', textShadowRadius: 5 },
  previewStatus: { color: 'rgba(255,255,255,0.82)', fontSize: 11, fontFamily: pluggdFonts.satoshiBold, marginTop: 5 },
  permissionCard: {
    minHeight: 78,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  permissionCopy: { flex: 1, minWidth: 0 },
  permissionTitle: { color: theme.colors.text, fontSize: 13, fontFamily: pluggdFonts.satoshiBold },
  permissionBody: { color: theme.colors.textMuted, fontSize: 10.5, lineHeight: 15, fontFamily: pluggdFonts.satoshiMedium, marginTop: 3 },
  permissionButton: { minWidth: 66, minHeight: 40, borderRadius: 5, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  permissionButtonText: { color: theme.colors.onAccent, fontSize: 11, fontFamily: pluggdFonts.satoshiBlack },
  greenSection: { paddingVertical: 17, borderTopWidth: 1, borderTopColor: theme.colors.border },
  greenControlGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 },
  greenControl: {
    width: '48.5%',
    minHeight: 54,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 10,
  },
  greenControlActive: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.accentFill },
  greenControlDisabled: { opacity: 0.42 },
  greenControlText: { color: theme.colors.text, fontSize: 12, fontFamily: pluggdFonts.satoshiBold },
  greenControlTextActive: { color: theme.colors.onAccent },
  routeRow: { flexDirection: 'row', gap: 9 },
  routeChoice: {
    flex: 1,
    minHeight: 52,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  routeChoiceActive: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.accentFill },
  routeChoiceText: { color: theme.colors.text, fontSize: 12, fontFamily: pluggdFonts.satoshiBold },
  heroBlock: {
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 21,
  },
  heroKicker: {
    color: theme.colors.accentText,
    fontSize: 9,
    fontFamily: pluggdFonts.satoshiBlack,
    letterSpacing: 1.7,
  },
  heroTitle: {
    color: theme.colors.text,
    fontSize: 32,
    lineHeight: 37,
    fontFamily: pluggdFonts.displayBold,
    letterSpacing: -1.1,
    marginTop: 6,
    maxWidth: 320,
  },
  heroBody: {
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: pluggdFonts.satoshiMedium,
    marginTop: 9,
    maxWidth: 330,
  },
  signalStrip: {
    minHeight: 34,
    marginTop: 15,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    borderRadius: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  signalDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: theme.colors.live,
  },
  signalText: {
    color: theme.colors.textSecondary,
    fontSize: 8,
    fontFamily: pluggdFonts.satoshiBold,
    letterSpacing: 0.85,
  },
  sectionKicker: {
    color: theme.colors.accentText,
    fontSize: 8.5,
    fontFamily: pluggdFonts.satoshiBlack,
    letterSpacing: 1.55,
    marginBottom: 4,
  },
  sectionTitle: {
    color: theme.colors.text,
    fontSize: 21,
    lineHeight: 26,
    fontFamily: pluggdFonts.displayBold,
    letterSpacing: -0.5,
    marginBottom: 12,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  battleModeCard: {
    minHeight: 88,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.accentText,
    backgroundColor: theme.colors.accentSoft,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  battleModeCardPressed: { opacity: 0.76, transform: [{ scale: 0.992 }] },
  battleModeIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceStrong, borderWidth: 1, borderColor: theme.colors.borderStrong },
  battleModeCopy: { flex: 1, minWidth: 0 },
  battleModeTitleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  battleModeTitle: { color: theme.colors.text, fontSize: 16, fontFamily: pluggdFonts.displayBold },
  battleModeBadge: { color: theme.colors.accentText, fontSize: 8, fontFamily: pluggdFonts.satoshiBlack, letterSpacing: 1.05 },
  battleModeDescription: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 15, fontFamily: pluggdFonts.satoshiMedium, marginTop: 4 },
  modeCard: {
    width: '48.8%',
    minHeight: 158,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 13,
  },
  modeCardSelected: {
    borderColor: theme.colors.accentText,
    backgroundColor: theme.colors.accentSoft,
  },
  modeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  modeIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: theme.colors.controlBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCircleActive: {
    backgroundColor: theme.colors.accentFill,
    borderColor: theme.colors.accentFill,
  },
  modeTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: pluggdFonts.displayBold,
  },
  modeDescription: {
    color: theme.colors.textMuted,
    fontSize: 11,
    lineHeight: 15.5,
    fontFamily: pluggdFonts.satoshiMedium,
    marginTop: 7,
  },
  discoveryCategoryList: { gap: 8, marginBottom: 12 },
  discoveryCategory: { minHeight: 78, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12 },
  discoveryCategorySelected: { borderColor: theme.colors.accentText, backgroundColor: theme.colors.accentSoft },
  discoveryCategoryIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  discoveryCategoryIconSelected: { backgroundColor: theme.colors.accentFill },
  discoveryCategoryCopy: { flex: 1, minWidth: 0, gap: 3 },
  discoveryCategoryTitle: { color: theme.colors.text, fontSize: 14.5, fontFamily: pluggdFonts.displayBold },
  discoveryCategoryDescription: { color: theme.colors.textMuted, fontSize: 11, lineHeight: 15, fontFamily: pluggdFonts.satoshiMedium },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: {
    color: theme.colors.text,
    fontSize: 19,
    fontFamily: pluggdFonts.displayBold,
    marginBottom: 10,
  },
  eventHelp: { color: theme.colors.textMuted, fontSize: 12, lineHeight: 17, fontFamily: pluggdFonts.satoshiMedium, marginBottom: 10 },
  eventLoader: { marginVertical: 18 },
  eventEmptyBlock: { gap: 10, paddingVertical: 8 },
  eventEmpty: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 17, fontFamily: pluggdFonts.satoshiMedium },
  eventManageButton: { alignSelf: 'flex-start', minHeight: 44, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.controlBorder, justifyContent: 'center', paddingHorizontal: 13 },
  eventManageText: { color: theme.colors.accentText, fontSize: 12, fontFamily: pluggdFonts.satoshiBold },
  eventChoice: { minHeight: 62, borderTopWidth: 1, borderTopColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  eventChoiceSelected: { backgroundColor: theme.colors.accentSoft },
  eventChoiceCopy: { flex: 1, minWidth: 0, gap: 3 },
  eventChoiceTitle: { color: theme.colors.text, fontSize: 13.5, fontFamily: pluggdFonts.satoshiBold },
  eventChoiceMeta: { color: theme.colors.textMuted, fontSize: 10.5, fontFamily: pluggdFonts.satoshiMedium },
  fieldLabel: {
    color: theme.colors.textSecondary,
    fontSize: 12,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surfaceStrong,
    color: theme.colors.text,
    fontSize: 15,
    fontFamily: pluggdFonts.satoshiMedium,
    paddingHorizontal: 12,
  },
  textArea: {
    minHeight: 88,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surfaceStrong,
    padding: 4,
    marginTop: 14,
  },
  segmentButton: {
    flex: 1,
    height: 44,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: theme.colors.accentSoft,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
  },
  segmentButtonText: {
    color: theme.colors.textMuted,
    fontSize: 13,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  segmentButtonTextActive: {
    color: theme.colors.accentText,
  },
  scheduleGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  scheduleField: {
    flex: 1,
  },
  schedulePickerButton: {
    minHeight: 52,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surfaceStrong,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  schedulePickerText: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 13,
    lineHeight: 17,
    fontFamily: pluggdFonts.satoshiBold,
  },
  schedulePickerPanel: {
    marginTop: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surfaceStrong,
    overflow: 'hidden',
  },
  schedulePickerDone: {
    minHeight: 44,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  schedulePickerDoneText: { color: theme.colors.accentText, fontSize: 13, fontFamily: pluggdFonts.satoshiBold },
  toggleRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingVertical: 10,
  },
  rowIconBox: {
    width: 42,
    height: 42,
    borderRadius: 5,
    backgroundColor: theme.colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  rowTitle: {
    color: theme.colors.text,
    fontSize: 16,
    fontFamily: pluggdFonts.displayBold,
  },
  rowSubtitle: {
    color: theme.colors.textMuted,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: pluggdFonts.satoshiMedium,
    marginTop: 4,
  },
  stepperRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
  },
  stepperText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 10,
  },
  stepper: {
    height: 44,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surfaceStrong,
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    color: theme.colors.text,
    fontSize: 17,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    minWidth: 28,
    textAlign: 'center',
  },
  infoCard: {
    borderRadius: 5,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoText: {
    flex: 1,
    color: theme.colors.textMuted,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: pluggdFonts.satoshiMedium,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 22,
    backgroundColor: theme.colors.headerGlass,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  cta: {
    height: 56,
    borderRadius: 5,
    backgroundColor: theme.colors.accentFill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  ctaDisabled: { opacity: 0.48 },
  ctaText: {
    color: theme.colors.onAccent,
    fontSize: 18,
    fontFamily: pluggdFonts.satoshiBlack,
  },
}), [theme]);
}
