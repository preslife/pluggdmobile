import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, Pressable, RefreshControl, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthProvider';
import { pluggdFonts } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { closeHostedSplitSession, hostSplitSession, loadHostedSplitSessions, parseSplitInvitation, splitInvitationUrl, type HostedSplitSession } from './splitJoinService';

const sessionsKey = (userId?: string) => ['studio', 'split-sessions', userId ?? 'guest'];

function useSessionStyles() {
  const theme = usePluggdTheme();
  const styles = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 22, gap: 18, maxWidth: 620, width: '100%', alignSelf: 'center' },
    back: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
    title: { color: theme.colors.text, fontFamily: pluggdFonts.displayExtraBold, fontSize: 32, lineHeight: 39 },
    heading: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 21, lineHeight: 28 },
    body: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiRegular, fontSize: 15, lineHeight: 23 },
    label: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 15 },
    card: { padding: 18, gap: 14, borderRadius: 22, backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
    input: { minHeight: 52, padding: 14, borderRadius: 14, color: theme.colors.text, fontFamily: pluggdFonts.satoshiRegular, fontSize: 16, backgroundColor: theme.colors.surfaceRaised, borderWidth: 1, borderColor: theme.colors.controlBorder },
    button: { minHeight: 52, borderRadius: 15, padding: 14, backgroundColor: theme.colors.accentFill, justifyContent: 'center', alignItems: 'center' },
    buttonText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 15, textAlign: 'center' },
    secondary: { minHeight: 48, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.controlBorder, justifyContent: 'center', alignItems: 'center' },
    secondaryText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 15, textAlign: 'center' },
    error: { color: theme.colors.danger, fontFamily: pluggdFonts.satoshiMedium, fontSize: 15, lineHeight: 23 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    chip: { minHeight: 48, padding: 13, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.controlBorder },
    qr: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 18, alignSelf: 'center' },
    camera: { width: '100%', height: 310, borderRadius: 20, overflow: 'hidden', backgroundColor: '#111111' },
  }), [theme]);
  return { theme, styles };
}

function SessionShell({ title, children, onRefresh, refreshing = false }: { title: string; children: React.ReactNode; onRefresh?: () => void; refreshing?: boolean }) {
  const { styles, theme } = useSessionStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  return <View style={styles.screen}><Stack.Screen options={{ headerShown: false }} />
    <ScrollView keyboardShouldPersistTaps="handled" refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accentText} /> : undefined} contentContainerStyle={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 120 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back to split sheets" style={styles.back} onPress={() => router.canGoBack() ? router.back() : router.replace('/studio/splits' as any)}><MaterialIcons name="arrow-back" size={23} color={theme.colors.text} /></Pressable>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>{children}
    </ScrollView>
    <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: theme.colors.background }} />
  </View>;
}

function Action({ label, onPress, secondary = false, busy = false, disabled = false }: { label: string; onPress: () => void; secondary?: boolean; busy?: boolean; disabled?: boolean }) {
  const { styles, theme } = useSessionStyles();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy, busy }} disabled={disabled || busy} style={[secondary ? styles.secondary : styles.button, (disabled || busy) && { opacity: 0.5 }]} onPress={onPress}>
    {busy ? <ActivityIndicator accessibilityLabel={label} color={secondary ? theme.colors.text : theme.colors.onAccent} /> : <Text style={secondary ? styles.secondaryText : styles.buttonText}>{label}</Text>}
  </Pressable>;
}

function SignedInNotice() {
  const { styles, theme } = useSessionStyles();
  const { loading } = useAuth();
  const router = useRouter();
  return loading ? <ActivityIndicator color={theme.colors.accentText} /> : <View style={styles.card}><Text style={styles.body}>Sign in to host and manage your invitations.</Text><Action label="Sign in" onPress={() => router.push('/auth/login')} /></View>;
}

export function SplitHostScreen() {
  const { user } = useAuth();
  return <SplitHostForm key={user?.id ?? 'guest'} userId={user?.id} />;
}

function SplitHostForm({ userId }: { userId?: string }) {
  const { styles, theme } = useSessionStyles();
  const router = useRouter();
  const client = useQueryClient();
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [expiresMinutes, setExpiresMinutes] = useState(1440);
  const creating = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const [needsReview, setNeedsReview] = useState(false);
  const query = useQuery({ queryKey: sessionsKey(userId), queryFn: loadHostedSplitSessions, enabled: Boolean(userId), retry: false });
  useFocusEffect(useCallback(() => { if (userId) void query.refetch(); }, [userId, query.refetch]));
  const create = useMutation({
    retry: false,
    mutationFn: () => hostSplitSession({ title, location, notes, expiresMinutes }),
    onSuccess: (session) => {
      if (!mounted.current) return;
      client.setQueryData<HostedSplitSession[]>(sessionsKey(userId), (rows) => [session, ...(rows ?? [])]);
      void client.invalidateQueries({ queryKey: ['studio', 'split-engine', 'list'] });
      router.replace(`/studio/splits/invite/${session.sessionId}` as any);
    },
    onError: () => { if (!mounted.current) return; setNeedsReview(true); void query.refetch(); },
    onSettled: () => { creating.current = false; },
  });
  if (!userId) return <SessionShell title="Host a split sheet"><SignedInNotice /></SessionShell>;
  return <SessionShell title="Host a split sheet" onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
    <Text style={styles.body}>Start with a song or session name. Invite collaborators with a QR code or link, then set percentages and send the sheet for approval.</Text>
    <View style={styles.card}>
      <Text style={styles.label}>Session title</Text><TextInput accessibilityLabel="Session title" style={styles.input} value={title} onChangeText={setTitle} maxLength={200} placeholder="Name your song or session" placeholderTextColor={theme.colors.textMuted} />
      <Text style={styles.label}>Location (optional)</Text><TextInput accessibilityLabel="Location (optional)" style={styles.input} value={location} onChangeText={setLocation} maxLength={160} placeholder="Studio or city" placeholderTextColor={theme.colors.textMuted} />
      <Text style={styles.label}>Notes for collaborators (optional)</Text><TextInput accessibilityLabel="Notes for collaborators (optional)" style={[styles.input, { minHeight: 110, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} maxLength={1000} multiline placeholder="What are you working on together?" placeholderTextColor={theme.colors.textMuted} />
      <Text style={styles.label}>Invitation stays open for</Text><View style={styles.chips}>{[[60, '1 hour'], [1440, '24 hours'], [10080, '7 days']].map(([minutes, label]) => <Pressable accessibilityRole="radio" accessibilityState={{ checked: expiresMinutes === minutes }} key={minutes} style={[styles.chip, expiresMinutes === minutes && { borderColor: theme.colors.accentText, backgroundColor: theme.colors.accentSoft }]} onPress={() => setExpiresMinutes(Number(minutes))}><Text style={styles.label}>{label}</Text></Pressable>)}</View>
      <Text style={styles.body}>Creating a sheet adds your Connect Card credit name, contact email, role and professional publishing, management and company details to it. Collaborators confirm before sharing theirs. Required split details must be complete. Joining never approves percentages.</Text>
      {create.isError ? <Text accessibilityRole="alert" style={styles.error}>{create.error.message}</Text> : null}
      <Action label="Create invitation" disabled={!title.trim() || needsReview} busy={create.isPending} onPress={() => { if (creating.current) return; creating.current = true; create.mutate(); }} />
      {needsReview ? <><Text style={styles.body}>Review your recent invitations first. If the new sheet is listed, open it to continue.</Text><Action secondary label="I have checked; start a new invitation" onPress={() => { setNeedsReview(false); create.reset(); }} /></> : null}
    </View>
    <Text accessibilityRole="header" style={styles.heading}>Recent invitations</Text>
    {query.isPending ? <ActivityIndicator accessibilityLabel="Loading invitations" color={theme.colors.accentText} /> : query.isError ? <><Text accessibilityRole="alert" style={styles.error}>{query.error.message}</Text><Action secondary label="Try again" onPress={() => void query.refetch()} /></> : query.data?.length ? query.data.map((session) => <Pressable key={session.sessionId} accessibilityRole="button" style={styles.card} onPress={() => router.push(`/studio/splits/invite/${session.sessionId}` as any)}><Text style={styles.heading}>{session.title}</Text><Text style={styles.body}>{session.joinSessionStatus === 'active' && Date.parse(session.expiresAt) > Date.now() && session.agreementStatus === 'draft' ? 'Open invitation' : 'Invitation ended'} · {session.participantCount} participants</Text><Text style={styles.label}>Open invitation and split sheet →</Text></Pressable>) : <Text style={styles.body}>Your hosted invitations will appear here, including sessions started on the website.</Text>}
  </SessionShell>;
}

export function SplitHostInvitationScreen() {
  const { user } = useAuth();
  const { sessionId } = useLocalSearchParams<{ sessionId?: string }>();
  return <HostInvitation key={`${user?.id ?? 'guest'}:${sessionId}`} sessionId={typeof sessionId === 'string' ? sessionId : ''} userId={user?.id} />;
}

function HostInvitation({ userId, sessionId }: { userId?: string; sessionId: string }) {
  const { styles, theme } = useSessionStyles();
  const router = useRouter();
  const client = useQueryClient();
  const [shareError, setShareError] = useState('');
  const [now, setNow] = useState(Date.now());
  const query = useQuery({ queryKey: sessionsKey(userId), queryFn: loadHostedSplitSessions, enabled: Boolean(userId), retry: false, refetchInterval: 15000 });
  useFocusEffect(useCallback(() => {
    if (userId) void query.refetch();
    setNow(Date.now());
  }, [userId, query.refetch]));
  const close = useMutation({ mutationFn: () => closeHostedSplitSession(sessionId), onSuccess: async () => { await client.invalidateQueries({ queryKey: sessionsKey(userId) }); }, retry: false });
  const session = query.data?.find((row) => row.sessionId === sessionId);
  useEffect(() => {
    if (!session?.expiresAt) return;
    const remaining = Date.parse(session.expiresAt) - Date.now();
    if (!Number.isFinite(remaining) || remaining <= 0) return;
    const timer = setTimeout(() => setNow(Date.now()), remaining + 50);
    return () => clearTimeout(timer);
  }, [session?.expiresAt]);
  const active = session?.joinSessionStatus === 'active' && Date.parse(session.expiresAt) > now && session.agreementStatus === 'draft' && !close.isSuccess;
  if (!userId) return <SessionShell title="Split invitation"><SignedInNotice /></SessionShell>;
  return <SessionShell title="Split invitation" onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
    {query.isPending ? <ActivityIndicator accessibilityLabel="Loading invitation" color={theme.colors.accentText} /> : query.isError ? <><Text accessibilityRole="alert" style={styles.error}>{query.error.message}</Text><Action label="Try again" onPress={() => void query.refetch()} /></> : !session ? <><Text accessibilityRole="alert" style={styles.body}>This invitation is unavailable for your account. Open your hosted sessions to continue.</Text><Action label="My hosted sessions" onPress={() => router.replace('/studio/splits/host' as any)} /></> : <>
      <Text accessibilityRole="header" style={styles.heading}>{session.title}</Text>
      <Text style={styles.body}>{session.participantCount} participants · {active ? 'Open until' : 'Invitation ended'} {new Date(session.expiresAt).toLocaleString()}</Text>
      {active ? <View style={styles.card}>
        <Text style={styles.body}>Ask collaborators to scan this code in PLUGGD or open your invitation link. They review and confirm their own details.</Text>
        <View accessible accessibilityLabel="Invitation QR code. Use Share invitation link for an accessible alternative." style={styles.qr}><QRCode value={splitInvitationUrl(session.joinToken, 'qr')} size={200} color="#101010" backgroundColor="#FFFFFF" /></View>
        <Action label="Share invitation link" onPress={() => { setShareError(''); void Share.share({ message: `${session.title}\n${splitInvitationUrl(session.joinToken, 'link')}`, url: splitInvitationUrl(session.joinToken, 'link') }).catch(() => setShareError('The invitation could not be shared. Please try again.')); }} />
        {shareError ? <Text accessibilityRole="alert" style={styles.error}>{shareError}</Text> : null}
        <Action secondary label="Close invitation" busy={close.isPending} onPress={() => Alert.alert('Close this invitation?', 'People with the link or QR code will no longer be able to join. Your sheet and existing participants stay saved.', [{ text: 'Keep open', style: 'cancel' }, { text: 'Close invitation', style: 'destructive', onPress: () => close.mutate() }])} />
        {close.isError ? <Text accessibilityRole="alert" style={styles.error}>{close.error.message}</Text> : null}
      </View> : <Text style={styles.body}>This QR code and link are no longer open for joining. Continue with the saved sheet or start another session.</Text>}
      <View style={styles.card}><Text style={styles.heading}>Ready to agree the shares?</Text><Text style={styles.body}>Open the sheet to review collaborators, set each percentage to total 100%, and send it for approval. Every required participant reviews their share before the sheet can be locked.</Text><Action label="Open split sheet" onPress={() => router.push(`/studio/splits/${session.agreementId}` as any)} /></View>
      <Action secondary label="My hosted sessions" onPress={() => router.push('/studio/splits/host' as any)} />
    </>}
  </SessionShell>;
}

export function SplitScannerScreen() {
  const { styles, theme } = useSessionStyles();
  const router = useRouter();
  const [permission, requestPermission, getPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(false);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [error, setError] = useState('');
  const [link, setLink] = useState('');
  const scanned = useRef(false);
  useFocusEffect(useCallback(() => {
    setFocused(true); setForeground(AppState.currentState === 'active'); scanned.current = false;
    const refreshPermission = () => { void getPermission().catch(() => setError('Camera access could not be checked. You can paste the invitation link below.')); };
    refreshPermission();
    const subscription = AppState.addEventListener('change', (state) => { setForeground(state === 'active'); if (state === 'active') refreshPermission(); });
    return () => { setFocused(false); subscription.remove(); };
  }, [getPermission]));
  const open = (value: string, source: 'qr' | 'link' = 'qr') => {
    if (scanned.current) return;
    scanned.current = true;
    const token = parseSplitInvitation(value);
    if (!token) { setError('Use a PLUGGD split invitation QR code or link from pluggd.fm or pluggd.live.'); return; }
    setError('');
    router.replace({ pathname: '/split/join/[token]', params: { token, source } } as any);
  };
  return <SessionShell title="Scan a split invitation">
    <Text style={styles.body}>Scan the host’s QR code to review the sheet. Your details are only added after you confirm. Scanning never signs or approves a split.</Text>
    {permission?.granted ? focused && foreground && !error ? <View style={styles.camera}><CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onMountError={() => setError('The camera could not start. Try again or paste the invitation link below.')} onBarcodeScanned={({ data }) => open(data)} /><View pointerEvents="none" style={{ position: 'absolute', inset: 28, borderWidth: 2, borderColor: '#FFFFFF', borderRadius: 16 }} /></View> : null : <View style={styles.card}>
      <MaterialIcons name="qr-code-scanner" size={40} color={theme.colors.accentText} /><Text style={styles.heading}>Scan with your camera</Text><Text style={styles.body}>Allow camera access to scan an invitation, or paste the host’s link below.</Text>
      <Action label={permission?.canAskAgain === false ? 'Open camera settings' : 'Allow camera access'} onPress={() => { void (permission?.canAskAgain === false ? Linking.openSettings() : requestPermission()).catch(() => setError('Camera settings could not be opened. You can paste the invitation link below.')); }} />
    </View>}
    {error ? <><Text accessibilityRole="alert" style={styles.error}>{error}</Text><Action secondary label="Scan again" onPress={() => { scanned.current = false; setError(''); }} /></> : null}
    <View style={styles.card}><Text style={styles.label}>Or paste an invitation link</Text><TextInput accessibilityLabel="PLUGGD split invitation link" style={styles.input} value={link} onChangeText={(value) => { setLink(value); scanned.current = false; }} autoCapitalize="none" autoCorrect={false} keyboardType="url" placeholder="https://pluggd.fm/split/join/…" placeholderTextColor={theme.colors.textMuted} /><Action secondary label="Review invitation" disabled={!link.trim()} onPress={() => { scanned.current = false; open(link, 'link'); }} /></View>
  </SessionShell>;
}
