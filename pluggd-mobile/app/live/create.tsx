import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '../../src/lib/supabase';

const PLUGGD_ORANGE = '#FF5200';

type LiveMode = 'creator_live' | 'collab_live' | 'class_live' | 'audio_room';
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
    description: 'Solo broadcast for drops, updates, performances, and fan Q&A.',
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
    description: 'Low-friction audio-first rooms for panels, listening parties, and AMAs.',
    icon: 'graphic-eq',
    defaultStage: true,
    maxStage: 6,
  },
];

function defaultDateInput() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function defaultTimeInput() {
  const date = new Date();
  date.setHours(date.getHours() + 1, 0, 0, 0);
  return date.toTimeString().slice(0, 5);
}

function combineDateTime(dateInput: string, timeInput: string) {
  const value = new Date(`${dateInput}T${timeInput}:00`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function PluggdWordmark() {
  return (
    <View style={styles.logoTextRow}>
      <Text style={styles.logoText}>PL</Text>
      <Text style={[styles.logoText, styles.logoAccent]}>U</Text>
      <Text style={styles.logoText}>GGD</Text>
    </View>
  );
}

export default function CreateLiveRoomScreen() {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<LiveMode>('creator_live');
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>('now');
  const [title, setTitle] = useState('Live Session');
  const [description, setDescription] = useState('');
  const [dateInput, setDateInput] = useState(defaultDateInput());
  const [timeInput, setTimeInput] = useState(defaultTimeInput());
  const [isPublic, setIsPublic] = useState(true);
  const [allowStageRequests, setAllowStageRequests] = useState(false);
  const [maxStageParticipants, setMaxStageParticipants] = useState(1);
  const [saving, setSaving] = useState(false);

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

    const scheduledFor = scheduleMode === 'later' ? combineDateTime(dateInput, timeInput) : null;

    if (scheduleMode === 'later' && !scheduledFor) {
      Alert.alert('Invalid schedule', 'Use date format YYYY-MM-DD and time format HH:mm.');
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
      },
      recording_enabled: selectedMode !== 'audio_room',
      captions_enabled: false,
      restream_enabled: false,
      restream_targets: [],
    };
  };

  const createDirectly = async (payload: RoomPayload, userId: string) => {
    const extendedInsert = {
      ...payload,
      host_id: userId,
      agora_live_started_at: payload.status === 'live' ? new Date().toISOString() : null,
    };

    const { data, error } = await (supabase as any)
      .from('session_rooms')
      .insert(extendedInsert)
      .select('id')
      .single();

    if (!error) return data?.id as string;

    if (!/column|schema|live_mode|mode_config|allow_stage_requests|max_stage_participants|participant_count|recording_enabled|captions_enabled|restream/i.test(error.message ?? '')) {
      throw error;
    }

    const { data: fallbackData, error: fallbackError } = await (supabase as any)
      .from('session_rooms')
      .insert({
        title: payload.title,
        description: payload.description,
        host_id: userId,
        status: payload.status,
        is_public: payload.is_public,
        scheduled_for: payload.scheduled_for,
        agora_live_started_at: payload.status === 'live' ? new Date().toISOString() : null,
      })
      .select('id')
      .single();

    if (fallbackError) throw fallbackError;
    return fallbackData?.id as string;
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

      let roomId = data?.room?.id;

      if (error || !roomId) {
        roomId = await createDirectly(payload, user.id);
      }

      if (payload.status === 'live') {
        router.replace({ pathname: '/live/session', params: { roomId, role: 'host' } } as any);
      } else {
        Alert.alert('Room scheduled', 'Your room is ready in the Live lobby.', [
          { text: 'View lobby', onPress: () => router.replace('/live') },
        ]);
      }
    } catch (error: any) {
      console.error('Failed to create live room:', error);
      Alert.alert('Could not create room', error?.message ?? 'Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const incrementStage = (amount: number) => {
    setMaxStageParticipants((current) => Math.min(16, Math.max(1, current + amount)));
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.topBar}>
          <Pressable style={styles.iconButton} onPress={() => router.back()}>
            <MaterialIcons name="chevron-left" size={27} color="#FFFFFF" />
          </Pressable>

          <View style={styles.headerCenter}>
            <PluggdWordmark />
            <Text style={styles.pageTitle}>Create room</Text>
          </View>

          <View style={styles.iconButtonPlaceholder} />
        </View>

        <Text style={styles.sectionTitle}>Room type</Text>
        <View style={styles.modeGrid}>
          {LIVE_MODES.map((item) => {
            const selected = selectedMode === item.key;
            return (
              <Pressable
                key={item.key}
                style={[styles.modeCard, selected && styles.modeCardSelected]}
                onPress={() => handleModePress(item.key)}
              >
                <View style={styles.modeHeader}>
                  <View style={styles.modeIconBox}>
                    <MaterialIcons
                      name={item.icon}
                      size={23}
                      color={selected ? PLUGGD_ORANGE : '#D8D8D8'}
                    />
                  </View>
                  <View style={[styles.selectCircle, selected && styles.selectCircleActive]}>
                    {selected ? <MaterialIcons name="check" size={15} color="#080808" /> : null}
                  </View>
                </View>
                <Text style={styles.modeTitle}>{item.title}</Text>
                <Text style={styles.modeDescription}>{item.description}</Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Room details</Text>
          <FieldLabel label="Title" />
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Room title"
            placeholderTextColor="#777777"
            style={styles.input}
          />

          <FieldLabel label="Description" />
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="What is happening in this room?"
            placeholderTextColor="#777777"
            style={[styles.input, styles.textArea]}
            multiline
          />

          <View style={styles.segmentedControl}>
            <SegmentButton label="Go live now" active={scheduleMode === 'now'} onPress={() => setScheduleMode('now')} />
            <SegmentButton label="Schedule" active={scheduleMode === 'later'} onPress={() => setScheduleMode('later')} />
          </View>

          {scheduleMode === 'later' ? (
            <View style={styles.scheduleGrid}>
              <View style={styles.scheduleField}>
                <FieldLabel label="Date" />
                <TextInput
                  value={dateInput}
                  onChangeText={setDateInput}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#777777"
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>
              <View style={styles.scheduleField}>
                <FieldLabel label="Time" />
                <TextInput
                  value={timeInput}
                  onChangeText={setTimeInput}
                  placeholder="HH:mm"
                  placeholderTextColor="#777777"
                  style={styles.input}
                  autoCapitalize="none"
                />
              </View>
            </View>
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
              <Pressable style={styles.stepperButton} onPress={() => incrementStage(-1)}>
                <MaterialIcons name="remove" size={18} color="#FFFFFF" />
              </Pressable>
              <Text style={styles.stepperValue}>{maxStageParticipants}</Text>
              <Pressable style={styles.stepperButton} onPress={() => incrementStage(1)}>
                <MaterialIcons name="add" size={18} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <MaterialIcons name="info-outline" size={22} color={PLUGGD_ORANGE} />
          <Text style={styles.infoText}>
            {selectedMode === 'audio_room'
              ? 'Audio rooms disable camera publishing and focus the live session on voice, chat, gifts, and stage requests.'
              : 'Video rooms use the same Agora live stack as the session screen, with chat, gifts, reactions, and host controls.'}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cta} onPress={createRoom} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <MaterialIcons
                name={scheduleMode === 'now' ? 'settings-input-antenna' : 'event'}
                size={21}
                color="#FFFFFF"
              />
              <Text style={styles.ctaText}>{scheduleMode === 'now' ? 'Start room' : 'Schedule room'}</Text>
            </>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function FieldLabel({ label }: { label: string }) {
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
  return (
    <Pressable style={[styles.segmentButton, active && styles.segmentButtonActive]} onPress={onPress}>
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
  return (
    <View style={styles.toggleRow}>
      <View style={styles.rowIconBox}>
        <MaterialIcons name={icon} size={22} color={PLUGGD_ORANGE} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: '#2C2C2C', true: PLUGGD_ORANGE }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 120,
  },
  topBar: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  headerCenter: {
    alignItems: 'center',
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  logoAccent: {
    color: PLUGGD_ORANGE,
  },
  pageTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 2,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
    marginBottom: 10,
  },
  modeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  modeCard: {
    width: '48.8%',
    minHeight: 150,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    padding: 12,
  },
  modeCardSelected: {
    borderColor: PLUGGD_ORANGE,
    backgroundColor: '#1A120E',
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
    borderRadius: 8,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: '#666666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectCircleActive: {
    backgroundColor: PLUGGD_ORANGE,
    borderColor: PLUGGD_ORANGE,
  },
  modeTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  modeDescription: {
    color: '#AFAFAF',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 7,
  },
  card: {
    backgroundColor: '#151515',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    padding: 14,
    marginBottom: 12,
  },
  cardTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    marginBottom: 10,
  },
  fieldLabel: {
    color: '#BEBEBE',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 10,
    marginBottom: 6,
  },
  input: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#303030',
    backgroundColor: '#101010',
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    paddingHorizontal: 12,
  },
  textArea: {
    minHeight: 88,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#303030',
    backgroundColor: '#101010',
    padding: 4,
    marginTop: 14,
  },
  segmentButton: {
    flex: 1,
    height: 40,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentButtonActive: {
    backgroundColor: '#23140E',
    borderWidth: 1,
    borderColor: PLUGGD_ORANGE,
  },
  segmentButtonText: {
    color: '#AFAFAF',
    fontSize: 13,
    fontWeight: '900',
  },
  segmentButtonTextActive: {
    color: PLUGGD_ORANGE,
  },
  scheduleGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  scheduleField: {
    flex: 1,
  },
  toggleRow: {
    minHeight: 70,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
    paddingVertical: 10,
  },
  rowIconBox: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#222222',
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
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  rowSubtitle: {
    color: '#A5A5A5',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
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
    height: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#343434',
    backgroundColor: '#101010',
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepperButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
    minWidth: 28,
    textAlign: 'center',
  },
  infoCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#111111',
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoText: {
    flex: 1,
    color: '#B8B8B8',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 22,
    backgroundColor: 'rgba(8,8,8,0.97)',
    borderTopWidth: 1,
    borderTopColor: '#171717',
  },
  cta: {
    height: 56,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
});
