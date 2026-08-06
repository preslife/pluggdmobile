/**
 * Split Engine — the working surface.
 *
 * The list lives inside the Studio shell; creating and signing happen on their
 * own focused screens. Everything here defers to the server for maths and
 * state: the local totals bar only decides whether the send button is worth
 * enabling, and every transition is a round trip.
 */

import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  TextInput as NativeTextInput,
  type TextInputProps,
  type TextProps,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../components/PluggdImage';
import { selectionHaptic } from '../../design/haptics';
import { pluggdTextStyles } from '../../design/typography';
import { useBottomChromeInset } from '../../design/useBottomChromeInset';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import {
  SPLIT_CONTENT_LABELS,
  SPLIT_CONTENT_TYPES,
  SPLIT_ROLES,
  SPLIT_STATUS_COPY,
  approveSplit,
  createSplitAgreement,
  deleteSplitParticipant,
  evenSplit,
  formatPercent,
  loadOwnedContent,
  loadSplitDetail,
  loadSplitList,
  localTotals,
  lockSplitVersion,
  personLabel,
  searchCollaborators,
  splitErrorMessage,
  submitSplitForApproval,
  upsertSplitParticipant,
  validateSplitAgreement,
  type CreatableContentType,
  type OwnedContent,
  type SplitContentType,
  type SplitDetailData,
  type SplitPerson,
  type SplitStatus,
} from './split-engine';
import { STUDIO } from './studio-tokens';

const SPLIT_LIST_KEY = ['studio', 'split-engine', 'list'] as const;
const splitDetailKey = (id: string) => ['studio', 'split-engine', 'agreement', id] as const;
const OWNED_CONTENT_KEY = ['studio', 'split-engine', 'owned-content'] as const;

/** Studio is dense; keep Dynamic Type useful without letting one label eat the screen. */
function Text({ maxFontSizeMultiplier = 1.25, ...props }: TextProps) {
  return <NativeText maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} />;
}

function TextInput({ maxFontSizeMultiplier = 1.35, ...props }: TextInputProps) {
  return <NativeTextInput maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} />;
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function contentTypeLabel(type: SplitContentType) {
  return SPLIT_CONTENT_LABELS[type] ?? 'Work';
}

function StatusPill({ status }: { status: SplitStatus }) {
  const theme = usePluggdTheme();
  const copy = SPLIT_STATUS_COPY[status] ?? SPLIT_STATUS_COPY.draft;
  const tones = {
    native: { bg: 'rgba(65,209,125,0.14)', fg: theme.colors.success, border: 'rgba(65,209,125,0.32)' },
    limited: { bg: 'rgba(255,102,0,0.13)', fg: theme.colors.accent, border: 'rgba(255,102,0,0.32)' },
    neutral: { bg: STUDIO.chip, fg: STUDIO.textMid, border: STUDIO.line },
  }[copy.tone];
  return (
    <View style={[styles.pill, { backgroundColor: tones.bg, borderColor: tones.border }]}>
      <Text style={[styles.pillText, { color: tones.fg }]} numberOfLines={1}>
        {copy.label}
      </Text>
    </View>
  );
}

function Avatar({ uri, name, size = 34 }: { uri?: string | null; name: string; size?: number }) {
  if (uri) {
    return <PluggdImage uri={uri} style={{ width: size, height: size, borderRadius: size / 2 }} accessibilityLabel={name} />;
  }
  return (
    <View style={[styles.avatarFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={styles.avatarInitials}>{initials(name)}</Text>
    </View>
  );
}

function FocusedScreen({
  title,
  children,
  onRefresh,
  refreshing = false,
}: {
  title: string;
  children: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const theme = usePluggdTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const bottomInset = useBottomChromeInset();
  return (
    <View style={[styles.root, { backgroundColor: STUDIO.bg }]}>
      <Stack.Screen options={{ title, headerShown: false }} />
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <View style={[styles.focusHeader, { paddingTop: Math.max(10, insets.top + 6) }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => {
            selectionHaptic();
            if (router.canGoBack()) router.back();
            else router.replace('/studio/splits' as any);
          }}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={20} color={STUDIO.text} />
        </Pressable>
        <Text style={styles.focusHeaderTitle} numberOfLines={1}>
          {title}
        </Text>
        <View style={styles.backButtonSpacer} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} /> : undefined
        }
        contentContainerStyle={[styles.focusContent, { paddingBottom: bottomInset }]}
      >
        {children}
      </ScrollView>
    </View>
  );
}

function InlineState({ icon, title, body }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; body: string }) {
  return (
    <View style={styles.inlineState}>
      <MaterialIcons name={icon} size={24} color={STUDIO.textSubtle} />
      <Text style={styles.inlineStateTitle}>{title}</Text>
      <Text style={styles.inlineStateBody}>{body}</Text>
    </View>
  );
}

function PrimaryButton({
  label,
  icon,
  onPress,
  disabled,
  busy,
  tone = 'brand',
}: {
  label: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  tone?: 'brand' | 'ghost' | 'danger';
}) {
  const isBrand = tone === 'brand';
  const isDanger = tone === 'danger';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled || busy) }}
      disabled={disabled || busy}
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      style={[
        styles.button,
        isBrand && styles.buttonBrand,
        !isBrand && styles.buttonGhost,
        isDanger && styles.buttonDanger,
        (disabled || busy) && styles.buttonDisabled,
      ]}
    >
      {busy ? (
        <ActivityIndicator size="small" color={isBrand ? '#170A03' : STUDIO.text} />
      ) : (
        <>
          <Text style={[styles.buttonText, isBrand ? styles.buttonTextBrand : styles.buttonTextGhost, isDanger && styles.buttonTextDanger]}>
            {label}
          </Text>
          {icon ? <MaterialIcons name={icon} size={17} color={isBrand ? '#170A03' : isDanger ? STUDIO.bad : STUDIO.text} /> : null}
        </>
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */

function AgreementRow({ agreement, subtitle, onPress }: { agreement: { id: string; title: string | null; content_type: SplitContentType; status: SplitStatus }; subtitle?: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open split sheet for ${agreement.title || 'untitled work'}`}
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      style={styles.agreementRow}
    >
      <View style={styles.agreementIcon}>
        <MaterialIcons name="account-tree" size={19} color={STUDIO.orangeSoft} />
      </View>
      <View style={styles.agreementCopy}>
        <Text style={styles.agreementTitle} numberOfLines={1}>
          {agreement.title || 'Untitled work'}
        </Text>
        <Text style={styles.agreementMeta} numberOfLines={1}>
          {subtitle ?? contentTypeLabel(agreement.content_type)}
        </Text>
      </View>
      <StatusPill status={agreement.status} />
    </Pressable>
  );
}

/**
 * The Split Engine list. Rendered inside the Studio shell by
 * `StudioSplitGatewayScreen`, so it returns fragments rather than a screen.
 */
export function SplitEngineListPanel({ connectSlug, creatorName, avatarUrl }: { connectSlug: string; creatorName: string; avatarUrl?: string | null }) {
  const router = useRouter();
  const query = useQuery({ queryKey: SPLIT_LIST_KEY, queryFn: loadSplitList, staleTime: 1000 * 20 });

  const openAgreement = useCallback((id: string) => router.push(`/studio/splits/${id}` as any), [router]);

  const totals = query.data?.overview?.totals;
  const hasAny = (query.data?.owned.length ?? 0) + (query.data?.collaborating.length ?? 0) > 0;

  return (
    <>
      <LinearGradient
        colors={['rgba(255,106,0,0.30)', 'rgba(42,20,8,0.38)', 'rgba(5,5,7,0.99)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.heroTop}>
          <View style={styles.heroIcon}>
            <MaterialIcons name="account-tree" size={27} color="#170A03" />
          </View>
          {totals ? (
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{totals.locked_agreements_count}</Text>
              <Text style={styles.heroStatLabel}>LOCKED</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.heroEyebrow}>PLUGGD SPLIT ENGINE</Text>
        <Text style={styles.heroTitle}>Clear credits before the release moves.</Text>
        <Text style={styles.heroText}>
          One shared record of who owns what — percentages, approvals and signatures, settled here.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Start a split sheet"
          onPress={() => {
            selectionHaptic();
            router.push('/studio/splits/new' as any);
          }}
          style={styles.heroButton}
        >
          <Text style={styles.heroButtonText}>Start a split sheet</Text>
          <MaterialIcons name="arrow-forward" size={18} color="#170A03" />
        </Pressable>
      </LinearGradient>

      {query.isLoading ? (
        <View style={styles.loadingBlock}>
          <ActivityIndicator color={STUDIO.orange} />
        </View>
      ) : null}

      {query.error ? (
        <View style={styles.errorBlock}>
          <MaterialIcons name="error-outline" size={20} color={STUDIO.bad} />
          <Text style={styles.errorText}>{splitErrorMessage(query.error)}</Text>
          <PrimaryButton label="Try again" tone="ghost" onPress={() => query.refetch()} />
        </View>
      ) : null}

      {query.data?.awaitingMe.length ? (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionKicker}>NEEDS YOU</Text>
            <Text style={styles.sectionTitle}>Waiting on your approval</Text>
          </View>
          <View style={styles.stack}>
            {query.data.awaitingMe.map(({ agreement }) => (
              <AgreementRow
                key={`await-${agreement.id}`}
                agreement={agreement}
                subtitle={`${contentTypeLabel(agreement.content_type)} · Sign to confirm your share`}
                onPress={() => openAgreement(agreement.id)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {query.data?.owned.length ? (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionKicker}>YOUR WORK</Text>
            <Text style={styles.sectionTitle}>Split sheets you own</Text>
          </View>
          <View style={styles.stack}>
            {query.data.owned.map((agreement) => (
              <AgreementRow key={agreement.id} agreement={agreement} onPress={() => openAgreement(agreement.id)} />
            ))}
          </View>
        </View>
      ) : null}

      {query.data?.collaborating.length ? (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionKicker}>COLLABORATIONS</Text>
            <Text style={styles.sectionTitle}>You are listed on</Text>
          </View>
          <View style={styles.stack}>
            {query.data.collaborating.map((agreement) => (
              <AgreementRow key={agreement.id} agreement={agreement} onPress={() => openAgreement(agreement.id)} />
            ))}
          </View>
        </View>
      ) : null}

      {query.data && !hasAny ? (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionKicker}>HOW IT WORKS</Text>
            <Text style={styles.sectionTitle}>Three steps. One record.</Text>
          </View>
          <View style={styles.stepStack}>
            {[
              { number: '01', icon: 'library-music' as const, title: 'Choose the work', detail: 'Start with the release, beat or pack everyone contributed to.' },
              { number: '02', icon: 'group-add' as const, title: 'Invite collaborators', detail: 'Add people already on PLUGGD so names and payouts stay consistent.' },
              { number: '03', icon: 'draw' as const, title: 'Agree and lock', detail: 'Confirm percentages, collect approvals and preserve the signed record.' },
            ].map((step) => (
              <View key={step.number} style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{step.number}</Text>
                </View>
                <View style={styles.stepCopy}>
                  <View style={styles.stepTitleRow}>
                    <MaterialIcons name={step.icon} size={19} color={STUDIO.orangeSoft} />
                    <Text style={styles.stepTitle}>{step.title}</Text>
                  </View>
                  <Text style={styles.stepText}>{step.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.identityPanel}>
        <View style={styles.identityTop}>
          <Avatar uri={avatarUrl} name={creatorName} size={46} />
          <View style={styles.identityCopy}>
            <Text style={styles.identityEyebrow}>YOUR COLLABORATOR IDENTITY</Text>
            <Text style={styles.identityName} numberOfLines={1}>
              {creatorName}
            </Text>
            <Text style={styles.identityStatus}>{connectSlug ? 'Ready to share' : 'Complete Connect Card setup first'}</Text>
          </View>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={connectSlug ? 'Preview collaborator card' : 'Set up Connect Card'}
          onPress={() => {
            selectionHaptic();
            router.push((connectSlug ? `/connect/${connectSlug}/collab` : '/studio/connect-card') as any);
          }}
          style={styles.identityButton}
        >
          <Text style={styles.identityButtonText}>{connectSlug ? 'Preview collaborator card' : 'Set up Connect Card'}</Text>
          <MaterialIcons name="arrow-forward" size={17} color={STUDIO.text} />
        </Pressable>
      </View>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Create — pick the work                                              */
/* ------------------------------------------------------------------ */

export function SplitCreateScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<CreatableContentType | 'all'>('all');
  const query = useQuery({ queryKey: OWNED_CONTENT_KEY, queryFn: loadOwnedContent, staleTime: 1000 * 30 });

  const create = useMutation({
    mutationFn: (item: OwnedContent) => createSplitAgreement(item.type, item.id),
    onSuccess: async (agreementId) => {
      await queryClient.invalidateQueries({ queryKey: SPLIT_LIST_KEY });
      await queryClient.invalidateQueries({ queryKey: OWNED_CONTENT_KEY });
      router.replace(`/studio/splits/${agreementId}` as any);
    },
    onError: (error) => Alert.alert('Could not start', splitErrorMessage(error)),
  });

  const items = useMemo(() => {
    const all = query.data ?? [];
    return filter === 'all' ? all : all.filter((item) => item.type === filter);
  }, [query.data, filter]);

  return (
    <FocusedScreen title="Choose the work" onRefresh={() => query.refetch()} refreshing={query.isRefetching}>
      <Text style={styles.pageTitle}>Choose the work</Text>
      <Text style={styles.pageLead}>Pick what the split covers. You can only start a sheet on work you own.</Text>

      <View style={styles.filterRow}>
        {[{ value: 'all' as const, label: 'All' }, ...SPLIT_CONTENT_TYPES].map((entry) => {
          const active = filter === entry.value;
          return (
            <Pressable
              key={entry.value}
              accessibilityRole="button"
              accessibilityLabel={`Show ${entry.label}`}
              accessibilityState={{ selected: active }}
              onPress={() => {
                selectionHaptic();
                setFilter(entry.value as CreatableContentType | 'all');
              }}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{entry.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {query.isLoading ? <ActivityIndicator color={STUDIO.orange} style={styles.loadingBlock} /> : null}

      {query.error ? (
        <View style={styles.errorBlock}>
          <MaterialIcons name="error-outline" size={20} color={STUDIO.bad} />
          <Text style={styles.errorText}>{splitErrorMessage(query.error)}</Text>
        </View>
      ) : null}

      {query.data && items.length === 0 ? (
        <InlineState
          icon="library-music"
          title="Nothing to split yet"
          body="Upload a release, beat or sample pack first, then come back to set the shares."
        />
      ) : null}

      <View style={styles.stack}>
        {items.map((item) => (
          <Pressable
            key={`${item.type}-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={item.agreement_id ? `Open existing split sheet for ${item.title}` : `Start a split sheet for ${item.title}`}
            disabled={create.isPending}
            onPress={() => {
              selectionHaptic();
              if (item.agreement_id) router.replace(`/studio/splits/${item.agreement_id}` as any);
              else create.mutate(item);
            }}
            style={styles.contentRow}
          >
            <View style={styles.contentArt}>
              {item.artwork ? (
                <PluggdImage uri={item.artwork} style={StyleSheet.absoluteFill} accessibilityLabel={item.title} />
              ) : (
                <MaterialIcons name="music-note" size={20} color={STUDIO.textSubtle} />
              )}
            </View>
            <View style={styles.contentCopy}>
              <Text style={styles.contentTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.contentMeta}>{contentTypeLabel(item.type)}</Text>
            </View>
            {item.agreement_id ? (
              <View style={styles.existingTag}>
                <Text style={styles.existingTagText}>Started</Text>
              </View>
            ) : (
              <MaterialIcons name="add-circle-outline" size={20} color={STUDIO.orangeSoft} />
            )}
          </Pressable>
        ))}
      </View>

      {create.isPending ? (
        <View style={styles.pendingRow}>
          <ActivityIndicator size="small" color={STUDIO.orange} />
          <Text style={styles.pendingText}>Opening the sheet…</Text>
        </View>
      ) : null}
    </FocusedScreen>
  );
}

/* ------------------------------------------------------------------ */
/* Collaborator picker                                                 */
/* ------------------------------------------------------------------ */

function CollaboratorPicker({
  visible,
  existingIds,
  onClose,
  onPick,
}: {
  visible: boolean;
  existingIds: string[];
  onClose: () => void;
  onPick: (person: SplitPerson) => void;
}) {
  const [term, setTerm] = useState('');
  const insets = useSafeAreaInsets();
  const results = useQuery({
    queryKey: ['studio', 'split-engine', 'people', term],
    queryFn: () => searchCollaborators(term),
    enabled: visible && term.trim().length >= 2,
  });

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: STUDIO.bg, paddingTop: insets.top + 8 }]}>
        <View style={styles.focusHeader}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close collaborator search"
            onPress={onClose}
            style={styles.backButton}
          >
            <MaterialIcons name="close" size={20} color={STUDIO.text} />
          </Pressable>
          <Text style={styles.focusHeaderTitle}>Add collaborator</Text>
          <View style={styles.backButtonSpacer} />
        </View>

        <View style={styles.searchWrap}>
          <MaterialIcons name="search" size={19} color={STUDIO.textSubtle} />
          <TextInput
            value={term}
            onChangeText={setTerm}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Search by name or username"
            placeholderTextColor={STUDIO.textSubtle}
            style={styles.searchInput}
            accessibilityLabel="Search collaborators"
            returnKeyType="search"
          />
        </View>

        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
          {term.trim().length < 2 ? (
            <InlineState icon="group-add" title="Find your people" body="Type at least two letters to search creators on PLUGGD." />
          ) : null}
          {results.isFetching ? <ActivityIndicator color={STUDIO.orange} style={styles.loadingBlock} /> : null}
          {results.data?.length === 0 && !results.isFetching ? (
            <InlineState icon="person-search" title="No one found" body="Try a different spelling, or their PLUGGD username." />
          ) : null}
          <View style={styles.stack}>
            {(results.data ?? []).map((person) => {
              const already = existingIds.includes(person.user_id);
              const name = personLabel(person);
              return (
                <Pressable
                  key={person.user_id}
                  accessibilityRole="button"
                  accessibilityLabel={already ? `${name} is already on this sheet` : `Add ${name}`}
                  accessibilityState={{ disabled: already }}
                  disabled={already}
                  onPress={() => {
                    selectionHaptic();
                    onPick(person);
                  }}
                  style={[styles.personRow, already && styles.personRowDisabled]}
                >
                  <Avatar uri={person.avatar_url} name={name} />
                  <View style={styles.personCopy}>
                    <Text style={styles.personName} numberOfLines={1}>
                      {name}
                    </Text>
                    {person.username ? (
                      <Text style={styles.personHandle} numberOfLines={1}>
                        @{person.username}
                      </Text>
                    ) : null}
                  </View>
                  <MaterialIcons
                    name={already ? 'check-circle' : 'add-circle-outline'}
                    size={20}
                    color={already ? STUDIO.good : STUDIO.orangeSoft}
                  />
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Detail / edit                                                       */
/* ------------------------------------------------------------------ */

type DraftRow = {
  payee_user_id: string;
  display_name: string | null;
  email: string | null;
  role: string;
  revenue_split: number;
  publishing_split: number;
  content_id_split: number;
  approval_required: boolean;
};

function ShareInput({
  label,
  value,
  onChange,
  editable,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
  editable: boolean;
}) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  // While the field is idle, follow the source of truth (e.g. Split evenly).
  const shown = focused ? text : String(Math.round(value * 1000) / 1000);
  return (
    <View style={styles.shareField}>
      <Text style={styles.shareLabel}>{label}</Text>
      <View style={[styles.shareInputWrap, focused && { borderColor: STUDIO.lineHot }]}>
        <TextInput
          value={shown}
          editable={editable}
          keyboardType="decimal-pad"
          onFocus={() => {
            setFocused(true);
            setText(String(Math.round(value * 1000) / 1000));
          }}
          onBlur={() => {
            setFocused(false);
            const parsed = Number.parseFloat(text.replace(',', '.'));
            onChange(Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0);
          }}
          onChangeText={setText}
          style={[styles.shareInput, !editable && { color: STUDIO.textMid }]}
          accessibilityLabel={`${label} percentage`}
        />
        <Text style={styles.sharePercent}>%</Text>
      </View>
    </View>
  );
}

function TotalsBar({ totals }: { totals: ReturnType<typeof localTotals> }) {
  const columns = [
    { label: 'Revenue', value: totals.revenue, ok: totals.revenueValid },
    { label: 'Publishing', value: totals.publishing, ok: totals.publishingValid },
    { label: 'Content ID', value: totals.contentId, ok: totals.contentIdValid },
  ];
  return (
    <View style={styles.totalsBar}>
      {columns.map((column) => (
        <View key={column.label} style={styles.totalsCell}>
          <Text style={styles.totalsLabel}>{column.label.toUpperCase()}</Text>
          <Text style={[styles.totalsValue, { color: column.ok ? STUDIO.good : STUDIO.bad }]}>{formatPercent(column.value)}</Text>
          <MaterialIcons
            name={column.ok ? 'check-circle' : 'error-outline'}
            size={14}
            color={column.ok ? STUDIO.good : STUDIO.bad}
          />
        </View>
      ))}
    </View>
  );
}

export function SplitAgreementScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const agreementId = String(params.id ?? '');
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [drafts, setDrafts] = useState<DraftRow[] | null>(null);
  const [saving, setSaving] = useState(false);

  const query = useQuery({
    queryKey: splitDetailKey(agreementId),
    queryFn: () => loadSplitDetail(agreementId),
    enabled: agreementId.length > 0,
    staleTime: 1000 * 15,
  });

  const detail = query.data;
  const canEdit = Boolean(detail?.canManage) && detail?.agreement.status !== 'locked';

  // Server rows are the source of truth; drafts only exist while editing.
  const rows: DraftRow[] = useMemo(() => {
    if (drafts) return drafts;
    if (!detail) return [];
    if (detail.canManage) {
      return detail.participants.map((participant) => ({
        payee_user_id: participant.payee_user_id,
        display_name: participant.display_name,
        email: participant.email,
        role: participant.role,
        revenue_split: participant.revenue_split,
        publishing_split: participant.publishing_split,
        content_id_split: participant.content_id_split,
        approval_required: participant.approval_required,
      }));
    }
    // A collaborator cannot read the other participant rows, but the version
    // snapshot carries the whole sheet — that is what they are approving.
    return detail.snapshotParticipants.map((entry) => ({
      payee_user_id: entry.payee_user_id,
      display_name: entry.display_name,
      email: entry.email,
      role: entry.role ?? 'collaborator',
      revenue_split: entry.revenue_split ?? 0,
      publishing_split: entry.publishing_split ?? 0,
      content_id_split: entry.content_id_split ?? 0,
      approval_required: entry.approval_required ?? true,
    }));
  }, [drafts, detail]);

  const totals = useMemo(() => localTotals(rows), [rows]);
  const dirty = drafts !== null;

  const refresh = useCallback(async () => {
    setDrafts(null);
    await queryClient.invalidateQueries({ queryKey: splitDetailKey(agreementId) });
    await queryClient.invalidateQueries({ queryKey: SPLIT_LIST_KEY });
  }, [agreementId, queryClient]);

  const updateRow = useCallback(
    (userId: string, patch: Partial<DraftRow>) => {
      setDrafts((current) => (current ?? rows).map((row) => (row.payee_user_id === userId ? { ...row, ...patch } : row)));
    },
    [rows],
  );

  const saveAll = useCallback(async () => {
    if (!detail || !drafts) return;
    setSaving(true);
    try {
      const removed = detail.participants.filter((participant) => !drafts.some((row) => row.payee_user_id === participant.payee_user_id));
      for (const participant of removed) {
        await deleteSplitParticipant(agreementId, participant.payee_user_id);
      }
      for (const row of drafts) {
        await upsertSplitParticipant({
          agreementId,
          payeeUserId: row.payee_user_id,
          role: row.role,
          revenue: row.revenue_split,
          publishing: row.publishing_split,
          contentId: row.content_id_split,
          displayName: row.display_name,
          email: row.email,
          approvalRequired: row.approval_required,
        });
      }
      await refresh();
    } catch (error) {
      Alert.alert('Could not save', splitErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }, [agreementId, detail, drafts, refresh]);

  const submit = useMutation({
    mutationFn: async () => {
      const validation = await validateSplitAgreement(agreementId);
      if (!validation.valid) throw new Error('split_validation_failed');
      return submitSplitForApproval(agreementId);
    },
    onSuccess: async () => {
      await refresh();
      Alert.alert('Sent', 'Everyone listed has been asked to approve their share.');
    },
    onError: (error) => Alert.alert('Not sent', splitErrorMessage(error)),
  });

  const respond = useMutation({
    mutationFn: ({ approve }: { approve: boolean }) => approveSplit(agreementId, detail?.latestVersion?.id ?? null, approve),
    onSuccess: async (result) => {
      await refresh();
      Alert.alert(result === 'declined' ? 'Declined' : 'Recorded', result === 'approved' ? 'Everyone has approved this split.' : result === 'declined' ? 'The sheet has reopened as a draft.' : 'Your response is saved.');
    },
    onError: (error) => Alert.alert('Could not respond', splitErrorMessage(error)),
  });

  const lock = useMutation({
    mutationFn: () => lockSplitVersion(agreementId, detail?.latestVersion?.id ?? null),
    onSuccess: async () => {
      await refresh();
      Alert.alert('Locked', 'This split is now the signed record for the work.');
    },
    onError: (error) => Alert.alert('Could not lock', splitErrorMessage(error)),
  });

  const title = detail?.agreement.title || 'Split sheet';

  if (query.isLoading) {
    return (
      <FocusedScreen title="Split sheet">
        <ActivityIndicator color={STUDIO.orange} style={styles.loadingBlock} />
      </FocusedScreen>
    );
  }

  if (query.error || !detail) {
    return (
      <FocusedScreen title="Split sheet" onRefresh={() => query.refetch()}>
        <View style={styles.errorBlock}>
          <MaterialIcons name="error-outline" size={20} color={STUDIO.bad} />
          <Text style={styles.errorText}>{splitErrorMessage(query.error ?? new Error('agreement_not_found'))}</Text>
          <PrimaryButton label="Try again" tone="ghost" onPress={() => query.refetch()} />
        </View>
      </FocusedScreen>
    );
  }

  const myApproval = detail.myApproval;
  const awaitingMyResponse =
    detail.agreement.status === 'pending_approval' && myApproval?.status === 'pending' && Boolean(detail.latestVersion);

  return (
    <FocusedScreen title={title} onRefresh={() => query.refetch()} refreshing={query.isRefetching}>
      <View style={styles.detailHead}>
        <Text style={styles.pageTitle}>{title}</Text>
        <View style={styles.detailMetaRow}>
          <Text style={styles.detailMeta}>{contentTypeLabel(detail.agreement.content_type)}</Text>
          <StatusPill status={detail.agreement.status} />
        </View>
      </View>

      {awaitingMyResponse ? (
        <View style={styles.callout}>
          <MaterialIcons name="how-to-reg" size={20} color={STUDIO.orange} />
          <Text style={styles.calloutText}>You are listed on this sheet. Review the shares below, then approve or decline.</Text>
        </View>
      ) : null}

      {!detail.canManage && detail.snapshotParticipants.length === 0 ? (
        <InlineState
          icon="lock-clock"
          title="Not shared yet"
          body="The owner has not sent this sheet out for approval, so the full shares are not visible to you yet."
        />
      ) : null}

      {rows.length > 0 ? <TotalsBar totals={totals} /> : null}

      <View>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionKicker}>WHO OWNS WHAT</Text>
          <Text style={styles.sectionTitle}>Collaborators</Text>
        </View>

        {rows.length === 0 ? (
          <InlineState icon="group-add" title="No one added yet" body="Add every person who should be credited, then set their share." />
        ) : null}

        <View style={styles.stack}>
          {rows.map((row) => {
            const person = detail.people[row.payee_user_id];
            const name = personLabel(person, row.display_name);
            const isOwner = row.payee_user_id === detail.agreement.owner_user_id;
            const approval = detail.approvals.find(
              (entry) => entry.participant_user_id === row.payee_user_id && entry.version_id === detail.latestVersion?.id,
            );
            return (
              <View key={row.payee_user_id} style={styles.participantCard}>
                <View style={styles.participantTop}>
                  <Avatar uri={person?.avatar_url} name={name} />
                  <View style={styles.participantCopy}>
                    <Text style={styles.participantName} numberOfLines={1}>
                      {name}
                      {row.payee_user_id === detail.userId ? ' · you' : ''}
                    </Text>
                    <Text style={styles.participantRole} numberOfLines={1}>
                      {isOwner ? 'Owner' : row.role}
                      {approval ? ` · ${approval.status}` : ''}
                    </Text>
                  </View>
                  {canEdit && !isOwner ? (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${name}`}
                      onPress={() => {
                        selectionHaptic();
                        setDrafts((current) => (current ?? rows).filter((entry) => entry.payee_user_id !== row.payee_user_id));
                      }}
                      style={styles.removeButton}
                    >
                      <MaterialIcons name="remove-circle-outline" size={19} color={STUDIO.bad} />
                    </Pressable>
                  ) : null}
                </View>

                <View style={styles.shareRow}>
                  <ShareInput
                    label="Revenue"
                    value={row.revenue_split}
                    editable={canEdit}
                    onChange={(next) => updateRow(row.payee_user_id, { revenue_split: next })}
                  />
                  <ShareInput
                    label="Publishing"
                    value={row.publishing_split}
                    editable={canEdit}
                    onChange={(next) => updateRow(row.payee_user_id, { publishing_split: next })}
                  />
                  <ShareInput
                    label="Content ID"
                    value={row.content_id_split}
                    editable={canEdit}
                    onChange={(next) => updateRow(row.payee_user_id, { content_id_split: next })}
                  />
                </View>

                {canEdit && !isOwner ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.roleRow}>
                    {SPLIT_ROLES.map((role) => {
                      const active = row.role === role;
                      return (
                        <Pressable
                          key={role}
                          accessibilityRole="button"
                          accessibilityLabel={`Set role ${role}`}
                          accessibilityState={{ selected: active }}
                          onPress={() => {
                            selectionHaptic();
                            updateRow(row.payee_user_id, { role });
                          }}
                          style={[styles.roleChip, active && styles.roleChipActive]}
                        >
                          <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>{role}</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                ) : null}
              </View>
            );
          })}
        </View>

        {canEdit ? (
          <View style={styles.editActions}>
            <PrimaryButton label="Add collaborator" icon="group-add" tone="ghost" onPress={() => setPickerOpen(true)} />
            {rows.length > 1 ? (
              <PrimaryButton
                label="Split evenly"
                icon="balance"
                tone="ghost"
                onPress={() => {
                  const shares = evenSplit(rows.length);
                  setDrafts(
                    rows.map((row, index) => ({
                      ...row,
                      revenue_split: shares[index],
                      publishing_split: shares[index],
                      content_id_split: shares[index],
                    })),
                  );
                }}
              />
            ) : null}
          </View>
        ) : null}
      </View>

      {dirty && canEdit ? (
        <View style={styles.saveBar}>
          <Text style={styles.saveHint}>
            {detail.agreement.status === 'draft'
              ? 'Unsaved changes.'
              : 'Saving reopens this sheet as a draft and clears approvals already given.'}
          </Text>
          <View style={styles.saveButtons}>
            <PrimaryButton label="Discard" tone="ghost" onPress={() => setDrafts(null)} disabled={saving} />
            <PrimaryButton label="Save shares" icon="save" onPress={saveAll} busy={saving} />
          </View>
        </View>
      ) : null}

      {canEdit && !dirty && detail.agreement.status === 'draft' ? (
        <PrimaryButton
          label="Send for approval"
          icon="send"
          onPress={() => submit.mutate()}
          busy={submit.isPending}
          disabled={!totals.valid}
        />
      ) : null}

      {canEdit && !dirty && !totals.valid && rows.length > 0 && detail.agreement.status === 'draft' ? (
        <Text style={styles.validationHint}>Every column has to total exactly 100% before you can send this out.</Text>
      ) : null}

      {awaitingMyResponse ? (
        <View style={styles.respondRow}>
          <PrimaryButton label="Decline" tone="danger" onPress={() => respond.mutate({ approve: false })} busy={respond.isPending} />
          <PrimaryButton label="Approve my share" icon="check" onPress={() => respond.mutate({ approve: true })} busy={respond.isPending} />
        </View>
      ) : null}

      {detail.canManage && detail.agreement.status === 'approved' ? (
        <PrimaryButton label="Lock this split" icon="lock" onPress={() => lock.mutate()} busy={lock.isPending} />
      ) : null}

      {detail.versions.length > 0 ? (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionKicker}>HISTORY</Text>
            <Text style={styles.sectionTitle}>Versions</Text>
          </View>
          <View style={styles.stack}>
            {detail.versions.map((version) => (
              <View key={version.id} style={styles.versionRow}>
                <View style={styles.versionNumber}>
                  <Text style={styles.versionNumberText}>v{version.version_number}</Text>
                </View>
                <View style={styles.versionCopy}>
                  <Text style={styles.versionTitle}>{SPLIT_STATUS_COPY[version.status]?.label ?? version.status}</Text>
                  <Text style={styles.versionMeta}>
                    {version.locked_at
                      ? `Locked ${new Date(version.locked_at).toLocaleDateString()}`
                      : `Created ${new Date(version.created_at).toLocaleDateString()}`}
                  </Text>
                </View>
                {version.id === detail.agreement.active_version_id ? (
                  <MaterialIcons name="verified" size={18} color={STUDIO.good} />
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {detail.documents.length > 0 ? (
        <View>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionKicker}>RECORD</Text>
            <Text style={styles.sectionTitle}>Signed documents</Text>
          </View>
          <View style={styles.stack}>
            {detail.documents.map((document) => (
              <View key={document.id} style={styles.documentRow}>
                <MaterialIcons
                  name={document.status === 'ready' ? 'description' : document.status === 'failed' ? 'error-outline' : 'hourglass-empty'}
                  size={19}
                  color={document.status === 'ready' ? STUDIO.good : document.status === 'failed' ? STUDIO.bad : STUDIO.textSubtle}
                />
                <View style={styles.documentCopy}>
                  <Text style={styles.documentTitle}>
                    {document.status === 'ready' ? 'Split sheet document' : document.status === 'failed' ? 'Could not be produced' : 'Being prepared'}
                  </Text>
                  <Text style={styles.documentMeta}>
                    {document.generated_at ? new Date(document.generated_at).toLocaleString() : document.failure_reason || 'Waiting on the signed record'}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <CollaboratorPicker
        visible={pickerOpen}
        existingIds={rows.map((row) => row.payee_user_id)}
        onClose={() => setPickerOpen(false)}
        onPick={(person) => {
          setPickerOpen(false);
          setDrafts([
            ...(drafts ?? rows),
            {
              payee_user_id: person.user_id,
              display_name: personLabel(person),
              email: null,
              role: 'collaborator',
              revenue_split: 0,
              publishing_split: 0,
              content_id_split: 0,
              approval_required: true,
            },
          ]);
        }}
      />
    </FocusedScreen>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  focusHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 10, gap: 12 },
  focusHeaderTitle: { flex: 1, textAlign: 'center', color: STUDIO.text, fontSize: 15, fontWeight: '700' },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: STUDIO.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
  },
  backButtonSpacer: { width: 38 },
  focusContent: { paddingHorizontal: 16, gap: 22 },

  pageTitle: { ...pluggdTextStyles.pageTitle, color: STUDIO.text },
  pageLead: { color: STUDIO.textMid, fontSize: 14, lineHeight: 20, marginTop: -12 },

  hero: { borderRadius: 26, padding: 20, gap: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: STUDIO.lineHot },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: STUDIO.orangeSoft },
  heroStat: { alignItems: 'flex-end' },
  heroStatValue: { color: STUDIO.text, fontSize: 22, fontWeight: '800' },
  heroStatLabel: { color: STUDIO.textSubtle, fontSize: 10, letterSpacing: 1.2 },
  heroEyebrow: { color: STUDIO.orangeSoft, fontSize: 11, letterSpacing: 1.6, fontWeight: '700' },
  heroTitle: { ...pluggdTextStyles.pageTitle, color: STUDIO.text, fontSize: 27, lineHeight: 31 },
  heroText: { color: STUDIO.textMid, fontSize: 14, lineHeight: 20 },
  heroButton: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: STUDIO.orangeSoft,
  },
  heroButtonText: { color: '#170A03', fontSize: 15, fontWeight: '800' },

  sectionHeader: { marginBottom: 12, gap: 3 },
  sectionKicker: { color: STUDIO.textSubtle, fontSize: 10, letterSpacing: 1.5, fontWeight: '700' },
  sectionTitle: { color: STUDIO.text, fontSize: 18, fontWeight: '800' },
  stack: { gap: 10 },

  agreementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: STUDIO.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
  },
  agreementIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: STUDIO.chip },
  agreementCopy: { flex: 1, gap: 2 },
  agreementTitle: { color: STUDIO.text, fontSize: 15, fontWeight: '700' },
  agreementMeta: { color: STUDIO.textSubtle, fontSize: 12 },

  pill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth },
  pillText: { fontSize: 11, fontWeight: '700' },

  avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: STUDIO.chip },
  avatarInitials: { color: STUDIO.text, fontSize: 12, fontWeight: '700' },

  stepStack: { gap: 10 },
  step: { flexDirection: 'row', gap: 12, padding: 14, borderRadius: 18, backgroundColor: STUDIO.panel, borderWidth: StyleSheet.hairlineWidth, borderColor: STUDIO.line },
  stepNumber: { width: 34, height: 34, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: STUDIO.chip },
  stepNumberText: { color: STUDIO.orangeSoft, fontSize: 12, fontWeight: '800' },
  stepCopy: { flex: 1, gap: 4 },
  stepTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepTitle: { color: STUDIO.text, fontSize: 15, fontWeight: '700' },
  stepText: { color: STUDIO.textSubtle, fontSize: 13, lineHeight: 18 },

  identityPanel: { padding: 16, borderRadius: 22, backgroundColor: STUDIO.panelDeep, borderWidth: StyleSheet.hairlineWidth, borderColor: STUDIO.line, gap: 14 },
  identityTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  identityCopy: { flex: 1, gap: 2 },
  identityEyebrow: { color: STUDIO.textSubtle, fontSize: 10, letterSpacing: 1.3, fontWeight: '700' },
  identityName: { color: STUDIO.text, fontSize: 16, fontWeight: '800' },
  identityStatus: { color: STUDIO.textSubtle, fontSize: 12 },
  identityButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 15,
    backgroundColor: STUDIO.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
  },
  identityButtonText: { color: STUDIO.text, fontSize: 14, fontWeight: '700' },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 999, backgroundColor: STUDIO.panel, borderWidth: StyleSheet.hairlineWidth, borderColor: STUDIO.line },
  filterChipActive: { backgroundColor: 'rgba(255,106,0,0.16)', borderColor: STUDIO.lineHot },
  filterChipText: { color: STUDIO.textMid, fontSize: 13, fontWeight: '600' },
  filterChipTextActive: { color: STUDIO.orangeSoft },

  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: STUDIO.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
  },
  contentArt: { width: 46, height: 46, borderRadius: 12, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: STUDIO.chip },
  contentCopy: { flex: 1, gap: 2 },
  contentTitle: { color: STUDIO.text, fontSize: 15, fontWeight: '700' },
  contentMeta: { color: STUDIO.textSubtle, fontSize: 12 },
  existingTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: STUDIO.chip },
  existingTagText: { color: STUDIO.textMid, fontSize: 11, fontWeight: '700' },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    backgroundColor: STUDIO.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
  },
  searchInput: { flex: 1, color: STUDIO.text, fontSize: 15, padding: 0 },

  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 16,
    backgroundColor: STUDIO.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
  },
  personRowDisabled: { opacity: 0.55 },
  personCopy: { flex: 1, gap: 2 },
  personName: { color: STUDIO.text, fontSize: 15, fontWeight: '700' },
  personHandle: { color: STUDIO.textSubtle, fontSize: 12 },

  detailHead: { gap: 10 },
  detailMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  detailMeta: { color: STUDIO.textSubtle, fontSize: 13 },

  callout: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: 'rgba(255,106,0,0.10)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.lineHot,
  },
  calloutText: { flex: 1, color: STUDIO.text, fontSize: 13, lineHeight: 19 },

  totalsBar: {
    flexDirection: 'row',
    borderRadius: 18,
    backgroundColor: STUDIO.panelDeep,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    paddingVertical: 14,
  },
  totalsCell: { flex: 1, alignItems: 'center', gap: 4 },
  totalsLabel: { color: STUDIO.textSubtle, fontSize: 9, letterSpacing: 1.1, fontWeight: '700' },
  totalsValue: { fontSize: 17, fontWeight: '800' },

  participantCard: {
    padding: 14,
    borderRadius: 20,
    backgroundColor: STUDIO.panel,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
    gap: 12,
  },
  participantTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  participantCopy: { flex: 1, gap: 2 },
  participantName: { color: STUDIO.text, fontSize: 15, fontWeight: '700' },
  participantRole: { color: STUDIO.textSubtle, fontSize: 12, textTransform: 'capitalize' },
  removeButton: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },

  shareRow: { flexDirection: 'row', gap: 8 },
  shareField: { flex: 1, gap: 5 },
  shareLabel: { color: STUDIO.textSubtle, fontSize: 10, letterSpacing: 0.8, fontWeight: '700' },
  shareInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: STUDIO.chip,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: STUDIO.line,
  },
  shareInput: { flex: 1, color: STUDIO.text, fontSize: 15, fontWeight: '700', padding: 0 },
  sharePercent: { color: STUDIO.textSubtle, fontSize: 12, fontWeight: '700' },

  roleRow: { gap: 8, paddingRight: 4 },
  roleChip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: STUDIO.chip, borderWidth: StyleSheet.hairlineWidth, borderColor: STUDIO.line },
  roleChipActive: { backgroundColor: 'rgba(255,106,0,0.16)', borderColor: STUDIO.lineHot },
  roleChipText: { color: STUDIO.textMid, fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  roleChipTextActive: { color: STUDIO.orangeSoft },

  editActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  saveBar: { gap: 10, padding: 14, borderRadius: 18, backgroundColor: 'rgba(255,106,0,0.09)', borderWidth: StyleSheet.hairlineWidth, borderColor: STUDIO.lineHot },
  saveHint: { color: STUDIO.text, fontSize: 13, lineHeight: 18 },
  saveButtons: { flexDirection: 'row', gap: 10 },
  validationHint: { color: STUDIO.textSubtle, fontSize: 12, lineHeight: 17, marginTop: -12 },
  respondRow: { flexDirection: 'row', gap: 10 },

  button: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16 },
  buttonBrand: { backgroundColor: STUDIO.orangeSoft },
  buttonGhost: { backgroundColor: STUDIO.panel, borderWidth: StyleSheet.hairlineWidth, borderColor: STUDIO.line },
  buttonDanger: { borderColor: 'rgba(255,92,92,0.4)' },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { fontSize: 14, fontWeight: '800' },
  buttonTextBrand: { color: '#170A03' },
  buttonTextGhost: { color: STUDIO.text },
  buttonTextDanger: { color: STUDIO.bad },

  versionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 16, backgroundColor: STUDIO.panel, borderWidth: StyleSheet.hairlineWidth, borderColor: STUDIO.line },
  versionNumber: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 9, backgroundColor: STUDIO.chip },
  versionNumberText: { color: STUDIO.orangeSoft, fontSize: 12, fontWeight: '800' },
  versionCopy: { flex: 1, gap: 2 },
  versionTitle: { color: STUDIO.text, fontSize: 14, fontWeight: '700' },
  versionMeta: { color: STUDIO.textSubtle, fontSize: 12 },

  documentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderRadius: 16, backgroundColor: STUDIO.panel, borderWidth: StyleSheet.hairlineWidth, borderColor: STUDIO.line },
  documentCopy: { flex: 1, gap: 2 },
  documentTitle: { color: STUDIO.text, fontSize: 14, fontWeight: '700' },
  documentMeta: { color: STUDIO.textSubtle, fontSize: 12 },

  inlineState: { alignItems: 'center', gap: 8, paddingVertical: 26, paddingHorizontal: 18 },
  inlineStateTitle: { color: STUDIO.text, fontSize: 15, fontWeight: '700' },
  inlineStateBody: { color: STUDIO.textSubtle, fontSize: 13, lineHeight: 19, textAlign: 'center' },

  loadingBlock: { paddingVertical: 26 },
  errorBlock: { alignItems: 'center', gap: 10, padding: 18, borderRadius: 18, backgroundColor: STUDIO.panel, borderWidth: StyleSheet.hairlineWidth, borderColor: STUDIO.line },
  errorText: { color: STUDIO.textMid, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  pendingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 14 },
  pendingText: { color: STUDIO.textMid, fontSize: 13 },
});
