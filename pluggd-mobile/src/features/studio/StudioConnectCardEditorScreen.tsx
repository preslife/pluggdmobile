import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../components/PluggdImage';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import type { PluggdTheme } from '../../design/tokens';
import { pluggdFonts } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { buildEmbeddedStudioRoute } from './studio-data';
import {
  createEmptyConnectService,
  loadConnectCardEditorWorkspace,
  removeConnectCardService,
  saveConnectCardProfile,
  saveConnectCardService,
  type ConnectCardProfileDraft,
  type ConnectCardServiceDraft,
} from './connectCardEditorService';

const QUERY_KEY = ['studio', 'connect-card', 'edit'] as const;

type EditorTab = 'identity' | 'services';

export function StudioConnectCardEditorScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = usePluggdTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<EditorTab>('identity');
  const [profile, setProfile] = useState<ConnectCardProfileDraft | null>(null);
  const [services, setServices] = useState<ConnectCardServiceDraft[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [busyService, setBusyService] = useState<string | null>(null);
  const query = useQuery({ queryKey: QUERY_KEY, queryFn: loadConnectCardEditorWorkspace });

  useEffect(() => {
    if (!query.data) return;
    setProfile(query.data.profile);
    setServices(query.data.services);
  }, [query.data]);

  const setProfileField = <K extends keyof ConnectCardProfileDraft>(key: K, value: ConnectCardProfileDraft[K]) => {
    setProfile((current) => current ? { ...current, [key]: value } : current);
  };

  const saveProfile = async () => {
    if (!profile || savingProfile) return;
    setSavingProfile(true);
    try {
      const saved = await saveConnectCardProfile(profile);
      setProfile(saved);
      impactHaptic();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: ['studio'] }),
      ]);
      Alert.alert('Connect Card saved', 'Your Connect Card details are up to date.');
    } catch (error) {
      Alert.alert('Could not save Connect Card', error instanceof Error ? error.message : String(error));
    } finally {
      setSavingProfile(false);
    }
  };

  const updateService = <K extends keyof ConnectCardServiceDraft>(index: number, key: K, value: ConnectCardServiceDraft[K]) => {
    setServices((current) => current.map((service, serviceIndex) => serviceIndex === index ? { ...service, [key]: value } : service));
  };

  const persistService = async (index: number) => {
    const service = services[index];
    if (!service) return;
    const busyKey = service.id || `new-${index}`;
    setBusyService(busyKey);
    try {
      const saved = await saveConnectCardService({ ...service, sortOrder: index });
      setServices((current) => current.map((item, serviceIndex) => serviceIndex === index ? saved : item));
      impactHaptic();
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
      Alert.alert('Service saved', `${saved.serviceName} is ready on your Connect Card.`);
    } catch (error) {
      Alert.alert('Could not save service', error instanceof Error ? error.message : String(error));
    } finally {
      setBusyService(null);
    }
  };

  const removeService = (index: number) => {
    const service = services[index];
    if (!service) return;
    if (!service.id) {
      setServices((current) => current.filter((_, serviceIndex) => serviceIndex !== index));
      return;
    }
    Alert.alert('Remove service?', 'This removes the service from your Connect Card.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            setBusyService(service.id);
            try {
              await removeConnectCardService(service.id as string);
              setServices((current) => current.filter((item) => item.id !== service.id));
              impactHaptic();
              await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
            } catch (error) {
              Alert.alert('Could not remove service', error instanceof Error ? error.message : String(error));
            } finally {
              setBusyService(null);
            }
          })();
        },
      },
    ]);
  };

  const openAdvanced = () => router.push(buildEmbeddedStudioRoute('/studio/connect-card', 'Connect Card', '/studio/connect-card') as any);
  const openPublic = () => {
    if (!profile?.slug || !query.data?.profileExists) {
      Alert.alert('Save your Card first', 'Choose your Card address and save before opening the public version.');
      return;
    }
    router.push(`/connect/${profile.slug}` as any);
  };

  return (
    <View style={styles.screen}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to Connect Card" style={styles.iconButton} onPress={() => { selectionHaptic(); router.back(); }}>
          <MaterialIcons name="chevron-left" size={32} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerKicker}>CONNECT CARD STUDIO</Text>
          <Text style={styles.headerTitle}>Edit Connect Card</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open public Connect Card" style={styles.iconButton} onPress={openPublic}>
          <MaterialIcons name="visibility" size={23} color={theme.colors.text} />
        </Pressable>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}>
          <LinearGradient colors={[theme.colors.accentSoft, theme.colors.surfaceAlt, theme.colors.artworkBase]} style={styles.hero}>
            {query.data?.publicProfile?.coverImageUrl ? <PluggdImage uri={query.data.publicProfile.coverImageUrl} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="" /> : null}
            <LinearGradient colors={[theme.colors.overlay, theme.colors.mediaScrim]} style={StyleSheet.absoluteFill} />
            <View style={styles.heroTop}>
              <View style={styles.avatar}>
                {query.data?.publicProfile?.avatarUrl ? <PluggdImage uri={query.data.publicProfile.avatarUrl} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="" /> : <MaterialIcons name="person" size={34} color={theme.colors.accentText} />}
              </View>
              <View style={styles.heroStatus}><MaterialIcons name={query.data?.profileExists ? 'verified' : 'edit'} size={15} color={theme.colors.accentFill} /><Text style={styles.heroStatusText}>{query.data?.profileExists ? 'CARD LIVE' : 'DRAFT'}</Text></View>
            </View>
            <Text style={styles.heroKicker}>PLUGGD CONNECT</Text>
            <Text style={styles.heroTitle}>{profile?.displayName || query.data?.publicProfile?.fullName || 'Your professional identity'}</Text>
            <Text style={styles.heroAddress}>{profile?.slug ? `pluggd.fm/connect/${profile.slug}` : 'Choose your permanent Card address'}</Text>
          </LinearGradient>

          <View style={styles.tabs} accessibilityRole="tablist">
            <Tab label="Identity & links" selected={tab === 'identity'} onPress={() => setTab('identity')} />
            <Tab label="Services & rates" selected={tab === 'services'} onPress={() => setTab('services')} />
          </View>

          {query.isLoading && !profile ? <State icon="hourglass-top" title="Loading your Card" detail="Checking your profile and services…" loading /> : null}
          {query.isError ? <State icon="error-outline" title="Card unavailable" detail={query.error instanceof Error ? query.error.message : 'Your Connect Card could not be loaded.'} action="Try again" onAction={() => void query.refetch()} /> : null}

          {profile && tab === 'identity' ? (
            <View style={styles.sectionStack}>
              <Section number="01" title="Card address" detail="Your permanent PLUGGD Connect link.">
                <Field label="Address" value={profile.slug} onChangeText={(value) => setProfileField('slug', value.toLowerCase())} placeholder="your-name" prefix="pluggd.fm/connect/" autoCapitalize="none" />
              </Section>
              <Section number="02" title="Public identity" detail="The concise identity people see when you exchange details.">
                <Field label="Display name" value={profile.displayName} onChangeText={(value) => setProfileField('displayName', value)} placeholder="Your public name" />
                <Field label="Artist / business name" value={profile.artistName} onChangeText={(value) => setProfileField('artistName', value)} placeholder="Artist, company or project" />
                <Field label="Primary role" value={profile.primaryRole} onChangeText={(value) => setProfileField('primaryRole', value)} placeholder="Artist, producer, promoter…" />
                <Field label="Other roles" value={profile.roles} onChangeText={(value) => setProfileField('roles', value)} placeholder="Songwriter, DJ, engineer" />
                <Field label="Bio" value={profile.bio} onChangeText={(value) => setProfileField('bio', value)} placeholder="What should collaborators know?" multiline />
                <View style={styles.fieldRow}><View style={styles.half}><Field label="Location" value={profile.location} onChangeText={(value) => setProfileField('location', value)} placeholder="London, UK" /></View><View style={styles.half}><Field label="Genre / scene" value={profile.genre} onChangeText={(value) => setProfileField('genre', value)} placeholder="Alternative R&B" /></View></View>
              </Section>
              <Section number="03" title="Contact & bookings" detail="Choose what can be used for public and work enquiries.">
                <Field label="Website" value={profile.websiteUrl} onChangeText={(value) => setProfileField('websiteUrl', value)} placeholder="your-site.com" autoCapitalize="none" />
                <Field label="Public email" value={profile.publicEmail} onChangeText={(value) => setProfileField('publicEmail', value)} placeholder="hello@your-site.com" keyboardType="email-address" autoCapitalize="none" />
                <Field label="Business email" value={profile.businessEmail} onChangeText={(value) => setProfileField('businessEmail', value)} placeholder="bookings@your-site.com" keyboardType="email-address" autoCapitalize="none" />
                <Field label="Business phone" value={profile.businessPhone} onChangeText={(value) => setProfileField('businessPhone', value)} placeholder="+44…" keyboardType="phone-pad" />
                <Field label="Booking link" value={profile.bookingUrl} onChangeText={(value) => setProfileField('bookingUrl', value)} placeholder="your-site.com/book" autoCapitalize="none" />
              </Section>
              <Section number="04" title="Social & portfolio links" detail="Use complete links. Portfolio lines use Label | URL.">
                <Field label="Instagram" value={profile.instagram} onChangeText={(value) => setProfileField('instagram', value)} placeholder="instagram.com/yourname" autoCapitalize="none" />
                <Field label="TikTok" value={profile.tiktok} onChangeText={(value) => setProfileField('tiktok', value)} placeholder="tiktok.com/@yourname" autoCapitalize="none" />
                <Field label="YouTube" value={profile.youtube} onChangeText={(value) => setProfileField('youtube', value)} placeholder="youtube.com/@yourchannel" autoCapitalize="none" />
                <Field label="SoundCloud" value={profile.soundcloud} onChangeText={(value) => setProfileField('soundcloud', value)} placeholder="soundcloud.com/yourname" autoCapitalize="none" />
                <Field label="Portfolio" value={profile.portfolioLinks} onChangeText={(value) => setProfileField('portfolioLinks', value)} placeholder={'Showreel | your-site.com/showreel\nPress kit | your-site.com/epk'} multiline />
              </Section>
              <Pressable accessibilityRole="button" accessibilityLabel="Save Connect Card identity" disabled={savingProfile} style={[styles.primaryButton, savingProfile && styles.disabled]} onPress={() => void saveProfile()}>
                {savingProfile ? <ActivityIndicator color={theme.colors.onAccent} /> : <><Text style={styles.primaryButtonText}>Save Card identity</Text><MaterialIcons name="arrow-forward" size={20} color={theme.colors.onAccent} /></>}
              </Pressable>
            </View>
          ) : null}

          {profile && tab === 'services' ? (
            <View style={styles.sectionStack}>
              <Section number="01" title="How you work" detail="Short context shown alongside your available services.">
                <Field label="Service notes" value={profile.serviceNotes} onChangeText={(value) => setProfileField('serviceNotes', value)} placeholder="Availability, minimum budgets or what to send first…" multiline />
                <Pressable accessibilityRole="button" accessibilityLabel="Save service notes" disabled={savingProfile} style={[styles.secondaryButton, savingProfile && styles.disabled]} onPress={() => void saveProfile()}>
                  {savingProfile ? <ActivityIndicator color={theme.colors.text} /> : <Text style={styles.secondaryButtonText}>Save work details</Text>}
                </Pressable>
              </Section>
              <View style={styles.sectionHeaderRow}><View><Text style={styles.sectionEyebrow}>02 · SERVICES</Text><Text style={styles.sectionTitle}>What people can book</Text><Text style={styles.sectionDetail}>Mark a rate unavailable whenever you need to pause bookings without deleting it.</Text></View></View>
              {services.length === 0 ? <State icon="business-center" title="No services yet" detail="Add a bookable service, rate or turnaround when you are ready." /> : null}
              {services.map((service, index) => {
                const busyKey = service.id || `new-${index}`;
                const busy = busyService === busyKey;
                return (
                  <View key={service.id || `new-${index}`} style={styles.serviceCard}>
                    <View style={styles.serviceTop}><View style={styles.serviceIndex}><Text style={styles.serviceIndexText}>{String(index + 1).padStart(2, '0')}</Text></View><View style={styles.serviceToggleCopy}><Text style={styles.serviceToggleTitle}>Available</Text><Text style={styles.serviceToggleDetail}>{service.available ? 'Shown on active work views' : 'Hidden from booking views'}</Text></View><Switch accessibilityLabel={`${service.serviceName || 'Service'} availability`} style={styles.switch} value={service.available} onValueChange={(value) => updateService(index, 'available', value)} trackColor={{ false: theme.colors.surfacePressed, true: theme.colors.accentFill }} thumbColor={service.available ? theme.colors.onAccent : theme.colors.textMuted} /></View>
                    <Field label="Service" value={service.serviceName} onChangeText={(value) => updateService(index, 'serviceName', value)} placeholder="Production, DJ set, songwriting…" />
                    <Field label="Description" value={service.description} onChangeText={(value) => updateService(index, 'description', value)} placeholder="What is included?" multiline />
                    <View style={styles.fieldRow}><View style={styles.half}><Field label="From" value={service.startingPrice} onChangeText={(value) => updateService(index, 'startingPrice', value)} placeholder="250" keyboardType="decimal-pad" /></View><View style={styles.currency}><Field label="Currency" value={service.currency} onChangeText={(value) => updateService(index, 'currency', value.toUpperCase())} placeholder="GBP" autoCapitalize="characters" /></View></View>
                    <Field label="Turnaround" value={service.turnaround} onChangeText={(value) => updateService(index, 'turnaround', value)} placeholder="Usually 7–10 days" />
                    <View style={styles.serviceActions}><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${service.serviceName || 'service'}`} style={styles.removeButton} onPress={() => removeService(index)}><MaterialIcons name="delete-outline" size={20} color={theme.colors.danger} /><Text style={styles.removeText}>Remove</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Save ${service.serviceName || 'service'}`} disabled={busy} style={[styles.serviceSave, busy && styles.disabled]} onPress={() => void persistService(index)}>{busy ? <ActivityIndicator color={theme.colors.onAccent} /> : <><Text style={styles.serviceSaveText}>Save service</Text><MaterialIcons name="check" size={18} color={theme.colors.onAccent} /></>}</Pressable></View>
                  </View>
                );
              })}
              <Pressable accessibilityRole="button" accessibilityLabel="Add another service" style={styles.addButton} onPress={() => setServices((current) => [...current, createEmptyConnectService(current.length)])}><MaterialIcons name="add" size={22} color={theme.colors.accentText} /><Text style={styles.addButtonText}>Add a service</Text></Pressable>
            </View>
          ) : null}

          <View style={styles.advancedCard}>
            <View style={styles.advancedIcon}><MaterialIcons name="shield" size={22} color={theme.colors.accentText} /></View>
            <View style={styles.advancedCopy}><Text style={styles.advancedTitle}>Advanced Card controls</Text><Text style={styles.advancedDetail}>Manage private access, legal details, view permissions, QR sharing and Wallet passes in Advanced Card controls.</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Open advanced Connect Card controls" style={styles.advancedButton} onPress={openAdvanced}><Text style={styles.advancedButtonText}>Open advanced controls</Text><MaterialIcons name="arrow-forward" size={18} color={theme.colors.text} /></Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Tab({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { styles } = useConnectCardStyles();
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} onPress={onPress} style={[styles.tab, selected && styles.tabActive]}><Text style={[styles.tabText, selected && styles.tabTextActive]}>{label}</Text></Pressable>;
}

function Section({ number, title, detail, children }: { number: string; title: string; detail: string; children: React.ReactNode }) {
  const { styles } = useConnectCardStyles();
  return <View style={styles.section}><Text style={styles.sectionEyebrow}>{number} · CARD SETUP</Text><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionDetail}>{detail}</Text><View style={styles.fieldStack}>{children}</View></View>;
}

function Field({ label, value, onChangeText, placeholder, multiline, prefix, keyboardType, autoCapitalize }: { label: string; value: string; onChangeText: (value: string) => void; placeholder: string; multiline?: boolean; prefix?: string; keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'decimal-pad'; autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters' }) {
  const { theme, styles } = useConnectCardStyles();
  return <View style={styles.fieldWrap}><Text style={styles.fieldLabel}>{label}</Text><View style={[styles.field, multiline && styles.fieldMultiline]}>{prefix ? <Text style={styles.fieldPrefix}>{prefix}</Text> : null}<TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.colors.textMuted} multiline={multiline} keyboardType={keyboardType} autoCapitalize={autoCapitalize} autoCorrect={false} style={[styles.input, multiline && styles.inputMultiline]} /></View></View>;
}

function State({ icon, title, detail, loading, action, onAction }: { icon: string; title: string; detail: string; loading?: boolean; action?: string; onAction?: () => void }) {
  const { theme, styles } = useConnectCardStyles();
  return <View style={styles.state}>{loading ? <ActivityIndicator color={theme.colors.accentText} /> : <MaterialIcons name={icon as any} size={30} color={icon === 'error-outline' ? theme.colors.danger : theme.colors.accentText} />}<Text style={styles.stateTitle}>{title}</Text><Text style={styles.stateDetail}>{detail}</Text>{action && onAction ? <Pressable accessibilityRole="button" accessibilityLabel={action} style={styles.stateButton} onPress={onAction}><Text style={styles.stateButtonText}>{action}</Text></Pressable> : null}</View>;
}

function useConnectCardStyles() {
  const theme = usePluggdTheme();
  return { theme, styles: useMemo(() => createStyles(theme), [theme]) };
}

function createStyles(theme: PluggdTheme) {
  return StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  flex: { flex: 1 },
  header: { minHeight: 86, paddingHorizontal: 14, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider, backgroundColor: theme.colors.surface },
  iconButton: { width: 48, height: 48, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, alignItems: 'center' },
  headerKicker: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.5, fontWeight: '900' },
  headerTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 19, lineHeight: 23, marginTop: 2 },
  content: { paddingHorizontal: 14, paddingTop: 14 },
  hero: { minHeight: 260, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.artworkBase, overflow: 'hidden', padding: 18, justifyContent: 'flex-end' },
  heroTop: { position: 'absolute', top: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatar: { width: 70, height: 70, borderRadius: 35, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.artworkBase, borderWidth: 2, borderColor: theme.colors.accentFill },
  heroStatus: { minHeight: 36, borderRadius: 12, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.colors.mediaScrim, borderWidth: 1, borderColor: theme.colors.borderAccent },
  heroStatusText: { color: theme.colors.mediaText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.1, fontWeight: '900' },
  heroKicker: { color: theme.colors.accentFill, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1.4, fontWeight: '900' },
  heroTitle: { color: theme.colors.mediaText, fontFamily: pluggdFonts.displayExtraBold, fontSize: 31, lineHeight: 35, fontWeight: '800', marginTop: 5 },
  heroAddress: { color: theme.colors.mediaTextMuted, fontFamily: pluggdFonts.satoshiBold, fontSize: 12, marginTop: 7 },
  tabs: { marginTop: 14, padding: 4, borderRadius: 16, flexDirection: 'row', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  tab: { flex: 1, minHeight: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  tabActive: { backgroundColor: theme.colors.accentFill },
  tabText: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiBlack, fontSize: 11, fontWeight: '900' },
  tabTextActive: { color: theme.colors.onAccent },
  sectionStack: { gap: 15, marginTop: 15 },
  section: { borderRadius: 22, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, padding: 16 },
  sectionEyebrow: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.3, fontWeight: '900' },
  sectionTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 23, lineHeight: 27, marginTop: 5 },
  sectionDetail: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 17, marginTop: 4 },
  sectionHeaderRow: { paddingTop: 8 },
  fieldStack: { gap: 13, marginTop: 17 },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  half: { flexGrow: 1, flexBasis: 150 },
  currency: { width: 104 },
  fieldWrap: { gap: 6 },
  fieldLabel: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', fontWeight: '900' },
  field: { minHeight: 54, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center' },
  fieldMultiline: { minHeight: 116, alignItems: 'flex-start' },
  fieldPrefix: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBold, fontSize: 12, marginRight: 4 },
  input: { flex: 1, minHeight: 50, color: theme.colors.text, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14 },
  inputMultiline: { minHeight: 108, paddingTop: 14, textAlignVertical: 'top' },
  primaryButton: { minHeight: 56, borderRadius: 16, paddingHorizontal: 18, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  primaryButtonText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 14, fontWeight: '900' },
  secondaryButton: { minHeight: 50, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12, fontWeight: '900' },
  disabled: { opacity: 0.55 },
  serviceCard: { borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, padding: 15, gap: 13 },
  serviceTop: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 11 },
  serviceIndex: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  serviceIndexText: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 11, fontWeight: '900' },
  serviceToggleCopy: { flex: 1 },
  serviceToggleTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 16 },
  serviceToggleDetail: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 10, marginTop: 2 },
  switch: { minWidth: 51, minHeight: 44 },
  serviceActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10, marginTop: 2 },
  removeButton: { minHeight: 48, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 6 },
  removeText: { color: theme.colors.danger, fontFamily: pluggdFonts.satoshiBlack, fontSize: 11, fontWeight: '900' },
  serviceSave: { flexGrow: 1, flexBasis: 180, minHeight: 48, borderRadius: 16, backgroundColor: theme.colors.accentFill, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  serviceSaveText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12, fontWeight: '900' },
  addButton: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  addButtonText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12, fontWeight: '900' },
  advancedCard: { marginTop: 18, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft, padding: 16 },
  advancedIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceRaised },
  advancedCopy: { marginTop: 12 },
  advancedTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 20 },
  advancedDetail: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 18, marginTop: 5 },
  advancedButton: { minHeight: 50, marginTop: 14, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14 },
  advancedButtonText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 11, fontWeight: '900' },
  state: { minHeight: 170, marginTop: 15, borderRadius: 20, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, padding: 22, alignItems: 'center', justifyContent: 'center' },
  stateTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 19, marginTop: 10 },
  stateDetail: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 5 },
  stateButton: { minHeight: 44, marginTop: 12, paddingHorizontal: 18, borderRadius: 14, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  stateButtonText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12, fontWeight: '900' },
  });
}
