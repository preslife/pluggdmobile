import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Redirect, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../context/AuthProvider';
import { pluggdFonts } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { SplitAgreementScreen } from './SplitEngineScreens';
import { joinSplitWithConnectCard, loadSplitApprovalAgreement, loadSplitJoinPreview } from './splitJoinService';

function useStyles() {
  const theme = usePluggdTheme();
  return { theme, styles: useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    content: { padding: 22, gap: 18, maxWidth: 620, width: '100%', alignSelf: 'center' },
    back: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
    eyebrow: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, letterSpacing: 1.4, fontSize: 11 },
    title: { color: theme.colors.text, fontFamily: pluggdFonts.displayExtraBold, fontSize: 34, lineHeight: 40 },
    heading: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 23, lineHeight: 29 },
    body: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiRegular, fontSize: 16, lineHeight: 24 },
    card: { padding: 20, borderRadius: 24, backgroundColor: theme.colors.surface, borderColor: theme.colors.border, borderWidth: StyleSheet.hairlineWidth, gap: 14 },
    primary: { minHeight: 54, padding: 15, borderRadius: 15, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
    primaryText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 16 },
    secondary: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
    secondaryText: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBold, fontSize: 15 },
    error: { color: theme.colors.danger, fontFamily: pluggdFonts.satoshiMedium, fontSize: 15, lineHeight: 23 },
  }), [theme]) };
}

export function SplitJoinScreen() {
  const params = useLocalSearchParams<{ token?: string; source?: string }>();
  const { user, loading } = useAuth();
  const token = typeof params.token === 'string' ? params.token : '';
  const source = typeof params.source === 'string' ? params.source : 'link';
  return <SplitInvitation key={`${token}:${user?.id ?? 'guest'}`} token={token} source={source} userId={user?.id} authLoading={loading} />;
}

function SplitInvitation({ token, source, userId, authLoading }: { token: string; source: string; userId?: string; authLoading: boolean }) {
  const { theme, styles } = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const query = useQuery({ queryKey: ['split-join', token, userId ?? 'guest'], queryFn: () => loadSplitJoinPreview(token), retry: false });
  const join = useMutation({ mutationFn: () => joinSplitWithConnectCard(token, source) });
  const preview = query.data;
  return <View style={styles.screen}>
    <Stack.Screen options={{ headerShown: false }} />
    <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 110 }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.back}><MaterialIcons name="arrow-back" size={23} color={theme.colors.text} /></Pressable>
      <Text style={styles.eyebrow}>PLUGGD TAP SPLIT SHEET</Text>
      <Text accessibilityRole="header" style={styles.title}>Join split sheet</Text>
      {query.isPending ? <ActivityIndicator accessibilityLabel="Loading invitation" color={theme.colors.accentText} /> : query.isError ? <View style={styles.card}>
        <Text accessibilityRole="alert" style={styles.error}>{query.error.message}</Text>
        <Pressable accessibilityRole="button" onPress={() => void query.refetch()} style={styles.primary}><Text style={styles.primaryText}>Try again</Text></Pressable>
      </View> : preview?.status !== 'active' ? <View style={styles.card}><Text style={styles.heading}>This invitation is unavailable</Text><Text style={styles.body}>Ask the host to reopen the session or send a fresh link.</Text></View> : join.data ? <View style={styles.card}>
        <MaterialIcons name="check-circle" size={40} color={theme.colors.success} />
        <Text accessibilityRole="header" style={styles.heading}>{join.data.status === 'already_joined' ? 'You are already in' : 'Your details are added'}</Text>
        <Text style={styles.body}>{join.data.displayName} is listed as {join.data.role}. The host can now set percentages for your approval.</Text>
        <Pressable accessibilityRole="button" onPress={() => router.push(`/split/${join.data.agreementId}` as any)} style={styles.primary}><Text style={styles.primaryText}>Open split sheet</Text></Pressable>
      </View> : <>
        <View style={styles.card}>
          <Text accessibilityRole="header" style={styles.heading}>{preview.title || 'Studio split sheet'}</Text>
          <Text style={styles.body}>Hosted by {preview.hostName || 'PLUGGD creator'} · {preview.participantCount ?? 0} participants</Text>
          {preview.location ? <Text style={styles.body}>{preview.location}</Text> : null}
          {preview.notes ? <Text style={styles.body}>{preview.notes}</Text> : null}
        </View>
        <View style={styles.card}>
          <Text style={styles.heading}>Share your Connect Card details</Text>
          <Text style={styles.body}>Add your credit name, contact email, split role and professional publishing, management, label and company details to this sheet. Your private vault is never shared.</Text>
          <Text style={styles.body}>The host sets percentages later. Adding your details does not approve a split.</Text>
          {authLoading ? <ActivityIndicator color={theme.colors.accentText} /> : !userId ? <>
            <Text style={styles.body}>Sign in, then reopen this invitation to add your details.</Text>
            <Pressable accessibilityRole="button" onPress={() => router.push('/auth/login')} style={styles.primary}><Text style={styles.primaryText}>Sign in to join</Text></Pressable>
          </> : <>
            {join.isError ? <Text accessibilityRole="alert" style={styles.error}>{join.error.message}</Text> : null}
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: join.isPending, busy: join.isPending }} disabled={join.isPending} onPress={() => join.mutate()} style={[styles.primary, join.isPending && { opacity: 0.6 }]}>
              {join.isPending ? <ActivityIndicator color={theme.colors.onAccent} /> : <Text style={styles.primaryText}>Add my details</Text>}
            </Pressable>
            <Pressable accessibilityRole="button" disabled={join.isPending} onPress={() => router.push('/studio/connect-card/edit')} style={styles.secondary}><Text style={styles.secondaryText}>Review my Connect Card</Text></Pressable>
          </>}
        </View>
      </>}
    </ScrollView>
  </View>;
}

export function SplitApprovalLinkScreen() {
  const params = useLocalSearchParams<{ approvalId?: string }>();
  const { user, loading } = useAuth();
  return <ApprovalLink key={`${params.approvalId}:${user?.id ?? 'guest'}`} approvalId={String(params.approvalId ?? '')} userId={user?.id} authLoading={loading} />;
}

function ApprovalLink({ approvalId, userId, authLoading }: { approvalId: string; userId?: string; authLoading: boolean }) {
  const { theme, styles } = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const query = useQuery({ queryKey: ['split-approval-link', approvalId, userId], queryFn: () => loadSplitApprovalAgreement(approvalId, userId!), enabled: Boolean(userId && approvalId), retry: false });
  if (query.data) return <Redirect href={`/split/${query.data}` as any} />;
  return <View style={[styles.screen, { paddingTop: insets.top + 24 }]}><Stack.Screen options={{ headerShown: false }} /><View style={styles.content}>
    <Text accessibilityRole="header" style={styles.title}>Split approval</Text>
    {authLoading || (userId && query.isPending) ? <ActivityIndicator color={theme.colors.accentText} /> : !userId ? <>
      <Text style={styles.body}>Sign in, then reopen this notification to review your percentages.</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push('/auth/login')} style={styles.primary}><Text style={styles.primaryText}>Sign in</Text></Pressable>
    </> : <><Text accessibilityRole="alert" style={styles.error}>{query.error?.message || 'This split approval is unavailable.'}</Text><Pressable accessibilityRole="button" onPress={() => void query.refetch()} style={styles.primary}><Text style={styles.primaryText}>Try again</Text></Pressable></>}
    <Pressable accessibilityRole="button" onPress={() => router.replace('/notifications')} style={styles.secondary}><Text style={styles.secondaryText}>Back to notifications</Text></Pressable>
  </View></View>;
}

export function ParticipantSplitScreen() {
  const { user, loading } = useAuth();
  const { theme, styles } = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  if (user) return <SplitAgreementScreen key={user.id} />;
  return <View style={[styles.screen, { paddingTop: insets.top + 24 }]}><View style={styles.content}>
    <Stack.Screen options={{ headerShown: false }} />
    <Text accessibilityRole="header" style={styles.title}>Split sheet</Text>
    {loading ? <ActivityIndicator color={theme.colors.accentText} /> : <>
      <Text style={styles.body}>Sign in, then reopen this split sheet.</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push('/auth/login')} style={styles.primary}><Text style={styles.primaryText}>Sign in</Text></Pressable>
    </>}
  </View></View>;
}
