import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
  type ImageSourcePropType,
  type ImageStyle,
  type PressableProps,
  type StyleProp,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DiscoveryHeader } from '../discovery/DiscoveryHeader';
import { useAuth } from '../../context/AuthProvider';
import { selectionHaptic } from '../../design/haptics';
import { useBottomChromeInset } from '../../design/useBottomChromeInset';
import { edFonts } from '../../design/editorial';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import {
  calculateOpportunityReadiness,
  evaluateOpportunityMatch,
  fetchOpportunityApplicationItems,
  fetchOpportunityProfileSnapshot,
  fetchOpportunityRequirements,
  fetchOpportunityRequirementsForList,
  fetchPublishedOpportunities,
  fetchPublishedOpportunity,
  fetchUserOpportunityItems,
  fetchUserOpportunityStates,
  formatOpportunityDeadline,
  formatOpportunityFunding,
  formatOpportunityLocation,
  formatOpportunityType,
  getOpportunityArtwork,
  getOpportunityIdentityCandidates,
  OPPORTUNITIES_CREATOR_HERO,
  removeSavedOpportunity,
  requirementsForOpportunity,
  safeOpportunityExternalUrl,
  saveOpportunityFact,
  setUserOpportunityItem,
  upsertUserOpportunityStatus,
  type OpportunityMatchResult,
  type OpportunityRecord,
  type OpportunityRequirementRecord,
  type UserOpportunityRecord,
  type UserOpportunityStatus,
} from './opportunityService';

const ALL = 'all';

type QuickFilter = 'all' | 'closing' | 'online' | 'funding' | 'saved' | `category:${string}`;
type DeadlineFilter = 'all' | '7' | '30' | '60';
type SortMode = 'recommended' | 'closing' | 'newest';
type MatchFilter = 'all' | 'strong_match' | 'likely_match' | 'needs_information' | 'saved';

function EdPressable({ style, onPress, ...props }: PressableProps) {
  return (
    <Pressable
      {...props}
      accessibilityRole={props.accessibilityRole ?? 'button'}
      onPress={(event) => {
        selectionHaptic();
        onPress?.(event);
      }}
      style={style}
    />
  );
}

function errorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) return error.message;
  return 'Something went wrong. Please try again.';
}

function opportunityIdentifier(opportunity: OpportunityRecord) {
  return opportunity.slug || opportunity.id;
}

function opportunityDescription(opportunity: OpportunityRecord) {
  return opportunity.description_summary || opportunity.summary || opportunity.body || opportunity.benefit_summary || 'Open the opportunity for the published details.';
}

function closingThisWeek(opportunity: OpportunityRecord) {
  const value = opportunity.closes_at || opportunity.expires_at;
  if (!value || opportunity.rolling_deadline) return false;
  const difference = new Date(value).getTime() - Date.now();
  return difference >= 0 && difference <= 7 * 86_400_000;
}

function closingWithin(opportunity: OpportunityRecord, days: number) {
  const value = opportunity.closes_at || opportunity.expires_at;
  if (!value || opportunity.rolling_deadline) return false;
  const difference = new Date(value).getTime() - Date.now();
  return difference >= 0 && difference <= days * 86_400_000;
}

function deadlineTimestamp(opportunity: OpportunityRecord) {
  const value = opportunity.closes_at || opportunity.expires_at;
  const timestamp = value ? new Date(value).getTime() : Number.POSITIVE_INFINITY;
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp;
}

function publishedTimestamp(opportunity: OpportunityRecord) {
  const value = opportunity.published_at || opportunity.created_at;
  const timestamp = value ? new Date(value).getTime() : Number.NEGATIVE_INFINITY;
  return Number.isNaN(timestamp) ? Number.NEGATIVE_INFINITY : timestamp;
}

function compactFunding(value: number) {
  if (value >= 1_000_000) return `£${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1)}m`;
  if (value >= 1_000) return `£${Math.round(value / 1_000)}k`;
  return `£${Math.round(value).toLocaleString('en-GB')}`;
}

function matchLabel(match: OpportunityMatchResult) {
  if (match.state === 'strong_match') return 'Strong match';
  if (match.state === 'likely_match') return 'Likely match';
  if (match.state === 'needs_information') return 'Needs information';
  if (match.state === 'ineligible') return 'Not eligible';
  return 'Lower match';
}

function statusLabel(status?: UserOpportunityStatus | null) {
  if (!status) return null;
  const labels: Record<UserOpportunityStatus, string> = {
    saved: 'Saved', preparing: 'Preparing', ready: 'Ready to apply', applied: 'Applied',
    successful: 'Successful', unsuccessful: 'Not selected', dismissed: 'Dismissed',
  };
  return labels[status];
}

function queryRequirementsByOpportunity(requirements: OpportunityRequirementRecord[]) {
  const grouped = new Map<string, OpportunityRequirementRecord[]>();
  for (const requirement of requirements) {
    const current = grouped.get(requirement.opportunity_id) ?? [];
    current.push(requirement);
    grouped.set(requirement.opportunity_id, current);
  }
  return grouped;
}

function normaliseLocalArtworkSource(artwork: unknown): ImageSourcePropType | null {
  if (!artwork || typeof artwork === 'string') return null;
  const moduleSource = typeof artwork === 'object' && 'default' in artwork && artwork.default
    ? artwork.default
    : artwork;
  if (typeof moduleSource !== 'number' && typeof moduleSource !== 'object') return null;
  return Image.resolveAssetSource(moduleSource as ImageSourcePropType) ?? null;
}

function OpportunityIdentityMark({ opportunity, compact = false, large = false }: { opportunity: OpportunityRecord; compact?: boolean; large?: boolean }) {
  const theme = usePluggdTheme();
  const styles = useOpportunityStyles();
  const candidates = useMemo(() => getOpportunityIdentityCandidates(opportunity), [opportunity]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  useEffect(() => setCandidateIndex(0), [opportunity.id]);
  const logo = candidates[candidateIndex] ?? null;
  const youthMusic = (opportunity.organiser_name ?? '').toLocaleLowerCase().includes('youth music');
  return (
    <View style={[styles.identityMark, compact && styles.identityMarkSmall, large && styles.identityMarkLarge, youthMusic && styles.identityMarkDark]}>
      {logo ? (
        <Image source={{ uri: logo }} style={styles.identityLogo} resizeMode="contain" onError={() => setCandidateIndex((current) => current + 1)} />
      ) : (
        <MaterialIcons name="business" size={large ? 34 : compact ? 15 : 22} color={theme.colors.accentText} />
      )}
    </View>
  );
}

function OpportunityArtwork({ opportunity, style, fallback = 'identity' }: { opportunity: OpportunityRecord; style: StyleProp<ImageStyle>; fallback?: 'identity' | 'creator' }) {
  const styles = useOpportunityStyles();
  const artwork = getOpportunityArtwork(opportunity);
  const localArtwork = normaliseLocalArtworkSource(artwork);
  const remoteArtwork = typeof artwork === 'string' ? artwork : null;
  const [uri, setUri] = useState<string | null>(remoteArtwork);
  useEffect(() => setUri(remoteArtwork), [remoteArtwork]);
  if (localArtwork) return <Image source={localArtwork} style={style} resizeMode="cover" />;
  if (!uri) {
    if (fallback === 'creator') {
      const creatorSource = normaliseLocalArtworkSource(OPPORTUNITIES_CREATOR_HERO);
      return creatorSource ? <Image source={creatorSource} style={style} resizeMode="cover" /> : null;
    }
    return <View style={[style, styles.artworkFallback]}><OpportunityIdentityMark opportunity={opportunity} large /></View>;
  }
  return (
    <Image
      source={{ uri }}
      style={style}
      resizeMode="cover"
      onError={() => setUri(null)}
    />
  );
}

function SourceIdentity({ opportunity, compact = false }: { opportunity: OpportunityRecord; compact?: boolean }) {
  const theme = usePluggdTheme();
  const styles = useOpportunityStyles();
  return (
    <View style={styles.sourceRow}>
      <OpportunityIdentityMark opportunity={opportunity} compact={compact} />
      <Text style={[styles.sourceName, compact && styles.sourceNameSmall]} numberOfLines={1}>
        {opportunity.organiser_name || 'Opportunity organiser'}
      </Text>
      {opportunity.verification_status === 'verified' ? (
        <MaterialIcons name="verified" size={compact ? 14 : 16} color={theme.colors.accentText} />
      ) : null}
    </View>
  );
}

function MatchPill({ match }: { match: OpportunityMatchResult }) {
  const theme = usePluggdTheme();
  const styles = useOpportunityStyles();
  if (!match.reasons.length) return null;
  const favourable = match.state === 'strong_match' || match.state === 'likely_match';
  return (
    <View style={[styles.matchPill, favourable ? styles.matchPillPositive : styles.matchPillNeutral]}>
      <Text style={[styles.matchPillScore, { color: favourable ? theme.colors.success : theme.colors.accentText }]}>{match.score}%</Text>
      <Text style={styles.matchPillLabel}>MATCH</Text>
    </View>
  );
}

function StatusPill({ state }: { state?: UserOpportunityRecord }) {
  const styles = useOpportunityStyles();
  const label = statusLabel(state?.status);
  if (!label || state?.status === 'dismissed') return null;
  return <View style={styles.statusPill}><Text style={styles.statusPillText}>{label}</Text></View>;
}

function FeaturedOpportunityCard({
  opportunity,
  match,
  state,
}: {
  opportunity: OpportunityRecord;
  match?: OpportunityMatchResult;
  state?: UserOpportunityRecord;
}) {
  const theme = usePluggdTheme();
  const styles = useOpportunityStyles();
  const router = useRouter();
  return (
    <EdPressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${opportunity.title}`}
      onPress={() => router.push(`/opportunities/${opportunityIdentifier(opportunity)}` as any)}
      style={styles.featuredCard}
    >
      <View style={styles.featuredMedia}>
        <OpportunityArtwork opportunity={opportunity} style={styles.featuredImage} />
        <LinearGradient colors={['rgba(6,8,12,0.01)', 'rgba(6,8,12,0.58)']} locations={[0.3, 1]} style={StyleSheet.absoluteFillObject} />
        <View style={styles.featuredBadges}>
          {opportunity.featured ? <View style={styles.featuredBadge}><Text style={styles.featuredBadgeText}>FEATURED</Text></View> : null}
          <View style={styles.typeBadge}><Text style={styles.typeBadgeText}>{formatOpportunityType(opportunity.opportunity_type)}</Text></View>
        </View>
      </View>
      <View style={styles.featuredBody}>
        <SourceIdentity opportunity={opportunity} compact />
        <Text style={styles.featuredTitle} numberOfLines={2}>{opportunity.title}</Text>
        {formatOpportunityFunding(opportunity) ? <Text style={styles.featuredFunding}>{formatOpportunityFunding(opportunity)}</Text> : null}
        <View style={styles.featuredMetaRow}>
          <MaterialIcons name="place" size={15} color={theme.colors.textMuted} />
          <Text style={styles.featuredMeta} numberOfLines={1}>{formatOpportunityLocation(opportunity)}</Text>
          <MaterialIcons name="event" size={15} color={theme.colors.textMuted} />
          <Text style={styles.featuredMeta} numberOfLines={1}>{formatOpportunityDeadline(opportunity)}</Text>
        </View>
        <View style={styles.featuredFooter}>
          <View style={styles.featuredTags}>
            {opportunity.career_stages.slice(0, 2).map((tag) => <Text key={tag} style={styles.featuredTag}>{formatOpportunityType(tag)}</Text>)}
            <StatusPill state={state} />
          </View>
          {match ? <MatchPill match={match} /> : null}
        </View>
      </View>
    </EdPressable>
  );
}

function OpportunityRow({
  opportunity,
  match,
  state,
}: {
  opportunity: OpportunityRecord;
  match?: OpportunityMatchResult;
  state?: UserOpportunityRecord;
}) {
  const theme = usePluggdTheme();
  const styles = useOpportunityStyles();
  const router = useRouter();
  return (
    <EdPressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${opportunity.title}`}
      onPress={() => router.push(`/opportunities/${opportunityIdentifier(opportunity)}` as any)}
      style={styles.opportunityRow}
    >
      <OpportunityArtwork opportunity={opportunity} style={styles.rowImage} />
      <View style={styles.rowBody}>
        <View style={styles.rowBadgeLine}>
          <Text style={styles.rowType}>{formatOpportunityType(opportunity.opportunity_type).toUpperCase()}</Text>
          <StatusPill state={state} />
        </View>
        <Text style={styles.rowTitle} numberOfLines={2}>{opportunity.title}</Text>
        <Text style={styles.rowOrganiser} numberOfLines={1}>{opportunity.organiser_name || 'Opportunity organiser'}</Text>
        <View style={styles.rowMetaLine}>
          <MaterialIcons name="place" size={13} color={theme.colors.textMuted} />
          <Text style={styles.rowMeta} numberOfLines={1}>{formatOpportunityLocation(opportunity)}</Text>
          <Text style={styles.rowDot}>•</Text>
          <Text style={styles.rowMeta} numberOfLines={1}>{formatOpportunityDeadline(opportunity)}</Text>
        </View>
      </View>
      <View style={styles.rowValue}>
        {match?.reasons.length ? <Text style={styles.rowMatch}>{match.score}%</Text> : null}
        <Text style={styles.rowFunding} numberOfLines={2}>{formatOpportunityFunding(opportunity) || 'See details'}</Text>
        <MaterialIcons name="chevron-right" size={20} color={theme.colors.textMuted} />
      </View>
    </EdPressable>
  );
}

function LoadState({ label }: { label: string }) {
  const theme = usePluggdTheme();
  const styles = useOpportunityStyles();
  return <View style={styles.loadState}><ActivityIndicator color={theme.colors.accentFill} /><Text style={styles.loadStateText}>{label}</Text></View>;
}

function ErrorState({ message, retry }: { message: string; retry: () => void }) {
  const theme = usePluggdTheme();
  const styles = useOpportunityStyles();
  return (
    <View style={styles.emptyState}>
      <MaterialIcons name="error-outline" size={28} color={theme.colors.danger} />
      <Text style={styles.emptyTitle}>Opportunities could not load</Text>
      <Text style={styles.emptyBody}>{message}</Text>
      <EdPressable accessibilityLabel="Try loading opportunities again" onPress={retry} style={styles.secondaryButton}>
        <Text style={styles.secondaryButtonText}>Try again</Text>
      </EdPressable>
    </View>
  );
}

function InlineNotice({ message, retry }: { message: string; retry?: () => void }) {
  const theme = usePluggdTheme();
  const styles = useOpportunityStyles();
  return (
    <View style={styles.inlineNotice}>
      <MaterialIcons name="info-outline" size={18} color={theme.colors.accentText} />
      <Text style={styles.inlineNoticeText}>{message}</Text>
      {retry ? <EdPressable accessibilityLabel="Try again" onPress={retry}><Text style={styles.inlineNoticeAction}>Try again</Text></EdPressable> : null}
    </View>
  );
}

function FilterChoiceGroup({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const styles = useOpportunityStyles();
  return (
    <View style={[styles.filterGroup, disabled && styles.filterGroupDisabled]}>
      <Text style={styles.filterGroupLabel}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterGroupOptions}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <EdPressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected, disabled }}
              accessibilityLabel={`${label}: ${option.label}`}
              disabled={disabled}
              onPress={() => onChange(option.value)}
              style={[styles.filterOption, selected && styles.filterOptionActive]}
            >
              <Text style={[styles.filterOptionText, selected && styles.filterOptionTextActive]}>{option.label}</Text>
            </EdPressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function FilterPreviewRow({ opportunity, match }: { opportunity: OpportunityRecord; match?: OpportunityMatchResult }) {
  const styles = useOpportunityStyles();
  const router = useRouter();
  return (
    <EdPressable
      accessibilityLabel={`Open ${opportunity.title}`}
      onPress={() => router.push(`/opportunities/${opportunityIdentifier(opportunity)}` as any)}
      style={styles.filterPreviewRow}
    >
      <OpportunityArtwork opportunity={opportunity} style={styles.filterPreviewArtwork} />
      <View style={styles.filterPreviewBody}>
        <Text style={styles.filterPreviewType}>{formatOpportunityType(opportunity.opportunity_type).toUpperCase()}</Text>
        <Text style={styles.filterPreviewTitle} numberOfLines={2}>{opportunity.title}</Text>
        <Text style={styles.filterPreviewMeta} numberOfLines={1}>{formatOpportunityDeadline(opportunity)}</Text>
      </View>
      {match ? <Text style={styles.filterPreviewMatch}>{match.score}%</Text> : null}
    </EdPressable>
  );
}

function OpportunityFiltersModal({
  visible,
  onClose,
  onClear,
  resultCount,
  categories,
  creatorRoles,
  genres,
  careerStages,
  userSignedIn,
  category,
  setCategory,
  creatorRole,
  setCreatorRole,
  genre,
  setGenre,
  careerStage,
  setCareerStage,
  delivery,
  setDelivery,
  deadline,
  setDeadline,
  matchFilter,
  setMatchFilter,
  sortMode,
  setSortMode,
  snapshot,
  priority,
  matches,
}: {
  visible: boolean;
  onClose: () => void;
  onClear: () => void;
  resultCount: number;
  categories: string[];
  creatorRoles: string[];
  genres: string[];
  careerStages: string[];
  userSignedIn: boolean;
  category: string;
  setCategory: (value: string) => void;
  creatorRole: string;
  setCreatorRole: (value: string) => void;
  genre: string;
  setGenre: (value: string) => void;
  careerStage: string;
  setCareerStage: (value: string) => void;
  delivery: string;
  setDelivery: (value: string) => void;
  deadline: DeadlineFilter;
  setDeadline: (value: DeadlineFilter) => void;
  matchFilter: MatchFilter;
  setMatchFilter: (value: MatchFilter) => void;
  sortMode: SortMode;
  setSortMode: (value: SortMode) => void;
  snapshot: Array<{ value: string; label: string; icon: keyof typeof MaterialIcons.glyphMap }>;
  priority: OpportunityRecord[];
  matches: Map<string, OpportunityMatchResult>;
}) {
  const theme = usePluggdTheme();
  const styles = useOpportunityStyles();
  const insets = useSafeAreaInsets();
  const option = (value: string) => ({ value, label: formatOpportunityType(value) });
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.filterModal}>
        <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} translucent />
        <View style={[styles.filterModalHeader, { paddingTop: insets.top + 10 }]}>
          <EdPressable accessibilityLabel="Close opportunity filters" onPress={onClose} style={styles.filterCloseButton}><MaterialIcons name="close" size={24} color={theme.colors.text} /></EdPressable>
          <View style={styles.filterModalTitleBlock}><Text style={styles.filterModalEyebrow}>FIND THE RIGHT FIT</Text><Text style={styles.filterModalTitle}>Explore opportunities</Text><Text style={styles.filterModalSubtitle}>Filter real openings by your work, location and deadline.</Text></View>
          <EdPressable accessibilityLabel="Clear all opportunity filters" onPress={onClear} style={styles.clearFiltersButton}><Text style={styles.clearFiltersText}>Clear all</Text></EdPressable>
        </View>
        <ScrollView style={styles.filterModal} contentContainerStyle={styles.filterModalContent} showsVerticalScrollIndicator={false}>
          <FilterChoiceGroup label="Category" value={category} options={[{ value: ALL, label: 'All categories' }, ...categories.map(option)]} onChange={setCategory} />
          <FilterChoiceGroup label="Creator role" value={creatorRole} options={[{ value: ALL, label: 'Any creator role' }, ...creatorRoles.map(option)]} onChange={setCreatorRole} />
          <FilterChoiceGroup label="Genre" value={genre} options={[{ value: ALL, label: 'All genres' }, ...genres.map((value) => ({ value, label: value }))]} onChange={setGenre} />
          <FilterChoiceGroup label="Career stage" value={careerStage} options={[{ value: ALL, label: 'Any career stage' }, ...careerStages.map(option)]} onChange={setCareerStage} />
          <FilterChoiceGroup label="Location" value={delivery} options={[{ value: ALL, label: 'Anywhere' }, { value: 'online', label: 'Online' }, { value: 'in_person', label: 'In person' }, { value: 'hybrid', label: 'Hybrid' }]} onChange={setDelivery} />
          <FilterChoiceGroup label="Deadline" value={deadline} options={[{ value: ALL, label: 'Any deadline' }, { value: '7', label: 'Within 7 days' }, { value: '30', label: 'Within 30 days' }, { value: '60', label: 'Within 60 days' }]} onChange={(value) => setDeadline(value as DeadlineFilter)} />
          <FilterChoiceGroup label="Your match" value={matchFilter} options={[{ value: ALL, label: 'All matches' }, { value: 'strong_match', label: 'Strong match' }, { value: 'likely_match', label: 'Likely match' }, { value: 'needs_information', label: 'Needs information' }, { value: 'saved', label: 'Saved only' }]} onChange={(value) => setMatchFilter(value as MatchFilter)} disabled={!userSignedIn} />
          <FilterChoiceGroup label="Sort" value={sortMode} options={[{ value: 'recommended', label: 'Recommended' }, { value: 'closing', label: 'Closing soon' }, { value: 'newest', label: 'Newest' }]} onChange={(value) => setSortMode(value as SortMode)} />

          <View style={styles.filterSnapshot}>
            <View style={styles.filterSnapshotHeading}><Text style={styles.filterSnapshotTitle}>Your discovery snapshot</Text><Text style={styles.filterSnapshotLive}>LIVE DATA</Text></View>
            <View style={styles.snapshotGrid}>{snapshot.map((item) => <View key={item.label} style={styles.snapshotCard}><View style={styles.snapshotValueRow}><Text style={styles.snapshotValue}>{item.value}</Text><MaterialIcons name={item.icon} size={15} color={theme.colors.accentText} /></View><Text style={styles.snapshotLabel}>{item.label}</Text></View>)}</View>
          </View>
          {priority.length ? <View style={styles.filterPriority}><View style={styles.sectionHeading}><View><Text style={styles.pageEyebrow}>WORTH SEEING FIRST</Text><Text style={styles.sectionTitle}>Best bets right now</Text></View><Text style={styles.sectionCount}>{priority.length} LIVE</Text></View>{priority.slice(0, 3).map((opportunity) => <FilterPreviewRow key={opportunity.id} opportunity={opportunity} match={matches.get(opportunity.id)} />)}</View> : null}
        </ScrollView>
        <View style={[styles.filterModalFooter, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <EdPressable accessibilityLabel={`Show ${resultCount} opportunities`} onPress={onClose} style={styles.showResultsButton}><Text style={styles.showResultsText}>Show {resultCount} opportunit{resultCount === 1 ? 'y' : 'ies'}</Text><MaterialIcons name="arrow-forward" size={20} color={theme.colors.onAccent} /></EdPressable>
        </View>
      </View>
    </Modal>
  );
}

export function OpportunitiesScreen() {
  const theme = usePluggdTheme();
  const styles = useOpportunityStyles();
  const { user } = useAuth();
  const bottomInset = useBottomChromeInset();
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [category, setCategory] = useState(ALL);
  const [delivery, setDelivery] = useState(ALL);
  const [creatorRole, setCreatorRole] = useState(ALL);
  const [genre, setGenre] = useState(ALL);
  const [careerStage, setCareerStage] = useState(ALL);
  const [deadline, setDeadline] = useState<DeadlineFilter>(ALL);
  const [matchFilter, setMatchFilter] = useState<MatchFilter>(ALL);
  const [sortMode, setSortMode] = useState<SortMode>('recommended');
  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  useEffect(() => {
    if (!user && (matchFilter !== ALL || quickFilter === 'saved')) {
      setMatchFilter(ALL);
      setQuickFilter('all');
    }
  }, [matchFilter, quickFilter, user]);
  const inventory = useQuery({ queryKey: ['opportunities', 'published'], queryFn: () => fetchPublishedOpportunities() });
  const opportunities = inventory.data ?? [];
  const ids = useMemo(() => opportunities.map((item) => item.id), [opportunities]);
  const requirements = useQuery({
    queryKey: ['opportunities', 'requirements', ids.join(',')],
    queryFn: () => fetchOpportunityRequirementsForList(ids),
    enabled: ids.length > 0,
  });
  const profileSnapshot = useQuery({
    queryKey: ['opportunities', 'profile-match', user?.id],
    queryFn: () => fetchOpportunityProfileSnapshot(user!.id),
    enabled: Boolean(user?.id),
  });
  const userStates = useQuery({
    queryKey: ['opportunities', 'user-states', user?.id, ids.join(',')],
    queryFn: () => fetchUserOpportunityStates(user!.id, ids),
    enabled: Boolean(user?.id && ids.length),
  });
  const requirementGroups = useMemo(() => queryRequirementsByOpportunity(requirements.data ?? []), [requirements.data]);
  const matches = useMemo(() => {
    const map = new Map<string, OpportunityMatchResult>();
    if (!profileSnapshot.data || requirements.isError) return map;
    for (const opportunity of opportunities) {
      map.set(opportunity.id, evaluateOpportunityMatch(opportunity, requirementGroups.get(opportunity.id) ?? [], profileSnapshot.data));
    }
    return map;
  }, [opportunities, profileSnapshot.data, requirementGroups, requirements.isError]);
  const stateMap = useMemo(() => new Map((userStates.data ?? []).map((state) => [state.opportunity_id, state])), [userStates.data]);
  const categories = useMemo(() => Array.from(new Set(opportunities.map((item) => item.opportunity_type).filter(Boolean))).sort(), [opportunities]);
  const creatorRoles = useMemo(() => Array.from(new Set(opportunities.flatMap((item) => item.creator_roles))).filter(Boolean).sort(), [opportunities]);
  const genres = useMemo(() => Array.from(new Set(opportunities.flatMap((item) => item.genre_tags))).filter(Boolean).sort(), [opportunities]);
  const careerStages = useMemo(() => Array.from(new Set(opportunities.flatMap((item) => item.career_stages))).filter(Boolean).sort(), [opportunities]);
  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    const filtered = opportunities
      .filter((item) => category === ALL || item.opportunity_type === category)
      .filter((item) => delivery === ALL || item.delivery_mode === delivery)
      .filter((item) => creatorRole === ALL || item.creator_roles.includes(creatorRole))
      .filter((item) => genre === ALL || item.genre_tags.includes(genre))
      .filter((item) => careerStage === ALL || item.career_stages.includes(careerStage))
      .filter((item) => deadline === ALL || closingWithin(item, Number(deadline)))
      .filter((item) => matchFilter === ALL || (matchFilter === 'saved' ? stateMap.get(item.id)?.status === 'saved' : matches.get(item.id)?.state === matchFilter))
      .filter((item) => quickFilter !== 'closing' || closingThisWeek(item))
      .filter((item) => quickFilter !== 'online' || item.delivery_mode === 'online')
      .filter((item) => quickFilter !== 'funding' || item.funding_min !== null || item.funding_max !== null)
      .filter((item) => quickFilter !== 'saved' || stateMap.get(item.id)?.status === 'saved')
      .filter((item) => !quickFilter.startsWith('category:') || item.opportunity_type === quickFilter.slice('category:'.length))
      .filter((item) => !needle || `${item.title} ${item.organiser_name ?? ''} ${opportunityDescription(item)} ${item.city ?? ''} ${item.location ?? ''} ${item.creator_roles.join(' ')} ${item.genre_tags.join(' ')} ${item.career_stages.join(' ')} ${item.tags.join(' ')}`.toLocaleLowerCase().includes(needle));
    return [...filtered].sort((left, right) => {
        if (sortMode === 'closing') return deadlineTimestamp(left) - deadlineTimestamp(right);
        if (sortMode === 'newest') return publishedTimestamp(right) - publishedTimestamp(left);
        const leftMatch = matches.get(left.id);
        const rightMatch = matches.get(right.id);
        if (leftMatch && rightMatch && rightMatch.score !== leftMatch.score) return rightMatch.score - leftMatch.score;
        return Number(right.featured) - Number(left.featured);
      });
  }, [careerStage, category, creatorRole, deadline, delivery, genre, matchFilter, matches, opportunities, quickFilter, search, sortMode, stateMap]);
  const priority = useMemo(() => visible.filter((item) => item.featured || closingThisWeek(item)), [visible]);
  const featured = priority[0] ?? visible[0];
  const fundedOpportunities = opportunities.filter((item) => (item.funding_max ?? item.funding_min ?? 0) > 0);
  const fundingCanBeTotalled = fundedOpportunities.length > 0 && fundedOpportunities.every((item) => !item.currency || item.currency.toUpperCase() === 'GBP');
  const totalFunding = fundingCanBeTotalled
    ? fundedOpportunities.reduce((total, item) => total + Math.max(item.funding_max ?? item.funding_min ?? 0, 0), 0)
    : 0;
  const matchedCount = [...matches.values()].filter((match) => match.state !== 'low_match').length;
  const matchSummaryPending = Boolean(user && (profileSnapshot.isLoading || requirements.isLoading));
  const matchSummaryUnavailable = Boolean(user && (profileSnapshot.isError || requirements.isError));
  const activeFilterCount = [category, delivery, creatorRole, genre, careerStage, deadline, matchFilter].filter((value) => value !== ALL).length + (sortMode === 'recommended' ? 0 : 1);
  const quickFilters: Array<{ value: QuickFilter; label: string; disabled?: boolean }> = [
    { value: 'all', label: 'All' },
    { value: 'closing', label: 'Closing this week' },
    { value: 'online', label: 'Online' },
    { value: 'funding', label: 'Funding listed' },
    { value: 'saved', label: 'Saved', disabled: !user },
    ...categories.slice(0, 3).map((value) => ({ value: `category:${value}` as QuickFilter, label: formatOpportunityType(value) })),
  ];
  const clearFilters = () => {
    setCategory(ALL); setDelivery(ALL); setCreatorRole(ALL); setGenre(ALL); setCareerStage(ALL);
    setDeadline(ALL); setMatchFilter(ALL); setSortMode('recommended'); setQuickFilter('all'); setSearch('');
  };
  const discoverySnapshot = [
    { value: user ? (matchSummaryPending || matchSummaryUnavailable ? '—' : String(matchedCount)) : String(opportunities.length), label: user ? 'MATCHED FOR YOU' : 'OPEN NOW', icon: user ? 'auto-awesome' : 'adjust' },
    { value: String(opportunities.filter(closingThisWeek).length), label: 'CLOSING THIS WEEK', icon: 'event' },
    { value: totalFunding ? `${compactFunding(totalFunding)}+` : String(fundedOpportunities.length), label: totalFunding ? 'FUNDING LISTED' : 'FUNDED OPENINGS', icon: 'paid' },
  ] as Array<{ value: string; label: string; icon: keyof typeof MaterialIcons.glyphMap }>;
  const refreshing = inventory.isRefetching || requirements.isRefetching || profileSnapshot.isRefetching;
  const refresh = () => void Promise.all([inventory.refetch(), requirements.refetch(), profileSnapshot.refetch(), userStates.refetch()]);

  return (
    <View style={styles.screen}>
      <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} translucent />
      <DiscoveryHeader backToDiscovery />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.accentFill} />}
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Opportunities</Text>
          <Text style={styles.pageSubtitle}>{user ? 'Real openings, automatically matched to your profile and work.' : 'Funding, development programmes and industry openings for artists, DJs, producers and music teams.'}</Text>
        </View>

        <View style={styles.snapshotGrid}>
          {discoverySnapshot.map((item) => <View key={item.label} style={styles.snapshotCard}><View style={styles.snapshotValueRow}><Text style={styles.snapshotValue}>{item.value}</Text><MaterialIcons name={item.icon} size={15} color={theme.colors.accentText} /></View><Text style={styles.snapshotLabel}>{item.label}</Text></View>)}
        </View>
        {user && (requirements.isError || profileSnapshot.isError || userStates.isError) ? (
          <InlineNotice
            message="Your private matches could not refresh. You can still browse every verified opportunity."
            retry={() => void Promise.all([requirements.refetch(), profileSnapshot.refetch(), userStates.refetch()])}
          />
        ) : null}

        <View style={styles.searchRow}>
          <View style={styles.searchShell}>
            <MaterialIcons name="search" size={20} color={theme.colors.textMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search opportunities, funders or keywords"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.searchInput}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel="Search opportunities"
            />
            {search ? <EdPressable accessibilityLabel="Clear opportunity search" onPress={() => setSearch('')} style={styles.clearSearchButton}><MaterialIcons name="close" size={20} color={theme.colors.textMuted} /></EdPressable> : null}
          </View>
          <EdPressable
            accessible
            accessibilityRole="button"
            accessibilityLabel="Open opportunity filters"
            accessibilityHint="Opens category, creator, location, deadline and match filters"
            accessibilityState={{ expanded: filtersOpen }}
            hitSlop={8}
            onPress={() => setFiltersOpen(true)}
            style={styles.filterButton}
          >
            <MaterialIcons name="tune" size={20} color={theme.colors.accentText} />
            {activeFilterCount ? <View style={styles.filterCount}><Text style={styles.filterCountText}>{activeFilterCount}</Text></View> : null}
          </EdPressable>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
          {quickFilters.map((item) => (
            <EdPressable key={item.value} disabled={item.disabled} accessibilityLabel={`Filter opportunities: ${item.label}`} accessibilityState={{ selected: quickFilter === item.value, disabled: item.disabled }} onPress={() => setQuickFilter(item.value)} style={[styles.filterChip, quickFilter === item.value && styles.filterChipActive, item.disabled && styles.filterChipDisabled]}>
              <Text style={[styles.filterChipText, quickFilter === item.value && styles.filterChipTextActive]}>{item.label}</Text>
            </EdPressable>
          ))}
        </ScrollView>

        {inventory.isLoading ? <LoadState label="Loading live opportunities…" /> : null}
        {inventory.isError ? <ErrorState message={errorMessage(inventory.error)} retry={() => void inventory.refetch()} /> : null}
        {!inventory.isLoading && !inventory.isError && featured ? (
          <>
            <View style={styles.sectionHeading}><View><Text style={styles.pageEyebrow}>WORTH SEEING FIRST</Text><Text style={styles.sectionTitle}>{user ? 'Best match for you' : 'Featured & closing soon'}</Text></View><Text style={styles.sectionCount}>{visible.length} FOUND</Text></View>
            <FeaturedOpportunityCard opportunity={featured} match={matches.get(featured.id)} state={stateMap.get(featured.id)} />
            {visible.length > 1 ? <View style={styles.sectionHeading}><Text style={styles.sectionTitle}>More opportunities</Text><Text style={styles.sectionAction}>{user ? 'PERSONALISED' : 'OPEN NOW'}</Text></View> : null}
            <View style={styles.opportunityRows}>
              {visible.slice(1).map((opportunity) => <OpportunityRow key={opportunity.id} opportunity={opportunity} match={matches.get(opportunity.id)} state={stateMap.get(opportunity.id)} />)}
            </View>
          </>
        ) : null}
        {!inventory.isLoading && !inventory.isError && !visible.length ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="search-off" size={30} color={theme.colors.accentText} />
            <Text style={styles.emptyTitle}>{opportunities.length ? 'No opportunities match these filters' : 'No verified opportunities are open right now'}</Text>
            <Text style={styles.emptyBody}>{opportunities.length ? 'Try another search, category or delivery option.' : 'Pull to refresh when new verified listings are published.'}</Text>
          </View>
        ) : null}
      </ScrollView>
      <OpportunityFiltersModal
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        onClear={clearFilters}
        resultCount={visible.length}
        categories={categories}
        creatorRoles={creatorRoles}
        genres={genres}
        careerStages={careerStages}
        userSignedIn={Boolean(user)}
        category={category}
        setCategory={(value) => { setQuickFilter('all'); setCategory(value); }}
        creatorRole={creatorRole}
        setCreatorRole={setCreatorRole}
        genre={genre}
        setGenre={setGenre}
        careerStage={careerStage}
        setCareerStage={setCareerStage}
        delivery={delivery}
        setDelivery={setDelivery}
        deadline={deadline}
        setDeadline={setDeadline}
        matchFilter={matchFilter}
        setMatchFilter={setMatchFilter}
        sortMode={sortMode}
        setSortMode={setSortMode}
        snapshot={discoverySnapshot}
        priority={priority.length ? priority : visible.slice(0, 3)}
        matches={matches}
      />
    </View>
  );
}

function DetailTopBar({ title, identifier }: { title: string; identifier?: string }) {
  const theme = usePluggdTheme();
  const styles = useOpportunityStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const publicUrl = identifier ? `https://pluggd.com/opportunities/${encodeURIComponent(identifier)}` : 'https://pluggd.com/opportunities';
  return (
    <View style={[styles.detailTopBar, { paddingTop: insets.top + 6 }]}>
      <EdPressable accessibilityLabel="Back to opportunities" onPress={() => router.canGoBack() ? router.back() : router.replace('/opportunities' as any)} style={styles.iconButton}><MaterialIcons name="arrow-back" size={23} color={theme.colors.text} /></EdPressable>
      <Text style={styles.detailTopTitle} numberOfLines={1}>{title}</Text>
      <EdPressable accessibilityLabel={`Share ${title}`} onPress={() => void Share.share({ title, message: `See ${title} on PLUGGD\n${publicUrl}`, url: publicUrl })} style={styles.iconButton}><MaterialIcons name="ios-share" size={22} color={theme.colors.text} /></EdPressable>
    </View>
  );
}

function DetailMatchPanel({ match, loading, error, retry }: { match?: OpportunityMatchResult; loading: boolean; error?: boolean; retry?: () => void }) {
  const theme = usePluggdTheme();
  const styles = useOpportunityStyles();
  if (loading) return <LoadState label="Checking your match…" />;
  if (error) return <View style={styles.detailPanel}><Text style={styles.panelEyebrow}>YOUR MATCH</Text><Text style={styles.panelTitle}>Your private match could not load.</Text><Text style={styles.panelBody}>The full published opportunity is still available below.</Text>{retry ? <EdPressable accessibilityLabel="Try checking this match again" onPress={retry} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Try match again</Text></EdPressable> : null}</View>;
  if (!match || !match.reasons.length) {
    return (
      <View style={styles.detailPanel}>
        <Text style={styles.panelEyebrow}>YOUR MATCH</Text>
        <Text style={styles.panelTitle}>Published matching criteria are still being confirmed.</Text>
        <Text style={styles.panelBody}>You can still review every published detail and apply through the official organiser.</Text>
      </View>
    );
  }
  return (
    <View style={[styles.detailPanel, styles.matchPanel]}>
      <View style={styles.matchHeader}>
        <View style={styles.matchHeaderCopy}>
          <Text style={styles.panelEyebrow}>WHY YOU MATCH</Text>
          <Text style={styles.panelTitle}>{matchLabel(match)}</Text>
          <Text style={styles.matchConfidence}>{match.confidence}% confidence from available profile evidence</Text>
        </View>
        <View style={styles.matchRing}><Text style={styles.matchRingValue}>{match.score}%</Text><Text style={styles.matchRingLabel}>MATCH</Text></View>
      </View>
      <View style={styles.reasonList}>
        {match.reasons.slice(0, 6).map((reason) => (
          <View key={reason.requirementId} style={styles.reasonRow}>
            <MaterialIcons name={reason.status === 'pass' ? 'check-circle' : reason.status === 'fail' ? 'cancel' : 'help'} size={18} color={reason.status === 'pass' ? theme.colors.success : reason.status === 'fail' ? theme.colors.danger : theme.colors.accentText} />
            <View style={styles.reasonCopy}><Text style={styles.reasonTitle}>{reason.label}</Text>{reason.explanation ? <Text style={styles.reasonBody}>{reason.explanation}</Text> : null}</View>
          </View>
        ))}
      </View>
      {match.missingFacts.length ? (
        <View style={styles.missingFactsCta}>
          <View><Text style={styles.missingFactsTitle}>{match.missingFacts.length} detail{match.missingFacts.length === 1 ? '' : 's'} could improve this match</Text><Text style={styles.missingFactsBody}>Answer only what this opportunity needs below.</Text></View>
          <MaterialIcons name="arrow-downward" size={20} color={theme.colors.accentText} />
        </View>
      ) : null}
    </View>
  );
}

function MissingFactsPanel({
  userId,
  opportunity,
  match,
  requirements,
}: {
  userId: string;
  opportunity: OpportunityRecord;
  match: OpportunityMatchResult;
  requirements: OpportunityRequirementRecord[];
}) {
  const theme = usePluggdTheme();
  const styles = useOpportunityStyles();
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [remember, setRemember] = useState<Record<string, boolean>>({});
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const requirementMap = useMemo(() => new Map(requirements.map((item) => [item.criterion_key, item])), [requirements]);
  const mutation = useMutation({
    mutationFn: ({ factKey, value, rememberFact }: { factKey: string; value: unknown; rememberFact: boolean }) => saveOpportunityFact({ userId, opportunityId: opportunity.id, factKey, value, remember: rememberFact }),
    onSuccess: async (_data, variables) => {
      setSavedKey(variables.factKey);
      setAnswers((current) => ({ ...current, [variables.factKey]: '' }));
      await queryClient.invalidateQueries({ queryKey: ['opportunities', 'profile-match', userId] });
    },
    onError: (error) => Alert.alert('Could not update your match', errorMessage(error)),
  });
  const save = (criterionKey: string) => {
    const raw = answers[criterionKey]?.trim();
    const requirement = requirementMap.get(criterionKey);
    if (!raw || !requirement) return;
    const booleanAnswer = requirement.operator === 'true' || requirement.operator === 'false';
    const numberAnswer = ['greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal'].includes(requirement.operator);
    const value = booleanAnswer ? raw === 'true' : numberAnswer ? Number(raw) : raw;
    if (numberAnswer && (typeof value !== 'number' || !Number.isFinite(value))) return;
    mutation.mutate({ factKey: criterionKey, value, rememberFact: Boolean(remember[criterionKey]) });
  };
  if (!match.missingFacts.length) return null;
  return (
    <View style={[styles.detailPanel, styles.missingFactsPanel]}>
      <Text style={[styles.panelEyebrow, { color: theme.colors.accentText }]}>MAKE YOUR MATCH MORE ACCURATE</Text>
      <Text style={styles.panelTitle}>Answer only what this opportunity needs.</Text>
      <Text style={styles.panelBody}>Your answers stay private. Keep an answer for this application only, or remember it for future matches.</Text>
      <View style={styles.missingAnswerList}>
        {match.missingFacts.slice(0, 4).map((missing) => {
          const requirement = requirementMap.get(missing.criterionKey);
          if (!requirement) return null;
          const booleanAnswer = requirement.operator === 'true' || requirement.operator === 'false';
          const numberAnswer = ['greater_than', 'greater_than_or_equal', 'less_than', 'less_than_or_equal'].includes(requirement.operator);
          const busy = mutation.isPending && mutation.variables?.factKey === missing.criterionKey;
          return (
            <View key={missing.criterionKey} style={styles.missingAnswerCard}>
              <Text style={styles.reasonTitle}>{missing.label}</Text>
              {missing.explanation ? <Text style={styles.reasonBody}>{missing.explanation}</Text> : null}
              {booleanAnswer ? (
                <View style={styles.booleanAnswers}>
                  {[{ value: 'true', label: 'Yes' }, { value: 'false', label: 'No' }].map((option) => <EdPressable key={option.value} accessibilityState={{ selected: answers[missing.criterionKey] === option.value }} accessibilityLabel={`${missing.label}: ${option.label}`} onPress={() => { setSavedKey(null); setAnswers((current) => ({ ...current, [missing.criterionKey]: option.value })); }} style={[styles.booleanAnswer, answers[missing.criterionKey] === option.value && styles.booleanAnswerActive]}><Text style={[styles.booleanAnswerText, answers[missing.criterionKey] === option.value && { color: theme.colors.onAccent }]}>{option.label}</Text></EdPressable>)}
                </View>
              ) : (
                <TextInput value={answers[missing.criterionKey] ?? ''} onChangeText={(value) => { setSavedKey(null); setAnswers((current) => ({ ...current, [missing.criterionKey]: value })); }} keyboardType={numberAnswer ? 'numeric' : 'default'} placeholder="Your answer" placeholderTextColor={theme.colors.textMuted} style={styles.factInput} accessibilityLabel={`Answer ${missing.label}`} />
              )}
              <View style={styles.factActions}>
                <EdPressable accessibilityLabel={`${remember[missing.criterionKey] ? 'Do not remember' : 'Remember'} this answer for future opportunities`} onPress={() => setRemember((current) => ({ ...current, [missing.criterionKey]: !current[missing.criterionKey] }))} style={styles.rememberAnswer}><MaterialIcons name={remember[missing.criterionKey] ? 'check-box' : 'check-box-outline-blank'} size={19} color={remember[missing.criterionKey] ? theme.colors.accentText : theme.colors.textMuted} /><Text style={styles.rememberAnswerText}>Remember for future matches</Text></EdPressable>
                <EdPressable accessibilityLabel={`Save answer for ${missing.label}`} disabled={!answers[missing.criterionKey]?.trim() || busy} onPress={() => save(missing.criterionKey)} style={[styles.saveFactButton, (!answers[missing.criterionKey]?.trim() || busy) && styles.buttonDisabled]}>{busy ? <ActivityIndicator size="small" color={theme.colors.onAccent} /> : <Text style={styles.saveFactButtonText}>{savedKey === missing.criterionKey ? 'Saved' : 'Save answer'}</Text>}</EdPressable>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function PublishedEligibility({
  opportunity,
  requirements,
  match,
}: {
  opportunity: OpportunityRecord;
  requirements: OpportunityRequirementRecord[];
  match?: OpportunityMatchResult;
}) {
  const theme = usePluggdTheme();
  const styles = useOpportunityStyles();
  const published = requirementsForOpportunity(opportunity, requirements);
  if (!published.length) return null;
  const reasonMap = new Map(match?.reasons.map((reason) => [reason.requirementId, reason]));
  return (
    <View style={styles.detailPanel}>
      <Text style={styles.panelEyebrow}>PUBLISHED ELIGIBILITY</Text>
      <Text style={styles.panelTitle}>Check the organiser’s criteria</Text>
      <View style={styles.eligibilityList}>
        {published.map((requirement) => {
          const reason = reasonMap.get(requirement.id);
          return (
            <View key={requirement.id} style={styles.eligibilityRow}>
              <MaterialIcons name={reason?.status === 'pass' ? 'check-circle' : reason?.status === 'fail' ? 'cancel' : 'radio-button-unchecked'} size={19} color={reason?.status === 'pass' ? theme.colors.success : reason?.status === 'fail' ? theme.colors.danger : theme.colors.accentText} />
              <View style={styles.reasonCopy}><Text style={styles.reasonTitle}>{requirement.public_label}</Text>{requirement.public_explanation ? <Text style={styles.reasonBody}>{requirement.public_explanation}</Text> : null}<Text style={styles.requirementLevel}>{requirement.requirement_level.toUpperCase()}</Text></View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function ApplicationWorkspace({
  opportunity,
  userId,
  state,
}: {
  opportunity: OpportunityRecord;
  userId?: string;
  state?: UserOpportunityRecord;
}) {
  const theme = usePluggdTheme();
  const styles = useOpportunityStyles();
  const router = useRouter();
  const queryClient = useQueryClient();
  const items = useQuery({ queryKey: ['opportunities', opportunity.id, 'application-items'], queryFn: () => fetchOpportunityApplicationItems(opportunity.id) });
  const savedItems = useQuery({
    queryKey: ['opportunities', opportunity.id, 'user-items', userId],
    queryFn: () => fetchUserOpportunityItems(userId!, opportunity.id),
    enabled: Boolean(userId),
  });
  const readiness = calculateOpportunityReadiness(items.data ?? [], savedItems.data ?? []);
  const completed = new Set((savedItems.data ?? []).filter((item) => item.is_complete).map((item) => item.application_item_id));
  const statusMutation = useMutation({
    mutationFn: (status: UserOpportunityStatus) => upsertUserOpportunityStatus(userId!, opportunity.id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['opportunities', 'user-states'] }),
    onError: (error) => Alert.alert('Could not update application', errorMessage(error)),
  });
  const itemMutation = useMutation({
    mutationFn: ({ itemId, complete }: { itemId: string; complete: boolean }) => setUserOpportunityItem({ userId: userId!, opportunityId: opportunity.id, applicationItemId: itemId, complete }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['opportunities', opportunity.id, 'user-items', userId] }),
    onError: (error) => Alert.alert('Could not update checklist', errorMessage(error)),
  });
  const requireUser = (action: () => void) => {
    if (!userId) { router.push(`/auth/login?redirect=${encodeURIComponent(`/opportunities/${opportunityIdentifier(opportunity)}`)}` as any); return; }
    action();
  };

  return (
    <View style={styles.detailPanel}>
      <View style={styles.workspaceHeader}>
        <View style={styles.matchHeaderCopy}><Text style={styles.panelEyebrow}>YOUR APPLICATION</Text><Text style={styles.panelTitle}>{state ? statusLabel(state.status) : 'Prepare with PLUGGD'}</Text></View>
        {userId && items.data?.length ? <View style={styles.readinessPill}><Text style={styles.readinessValue}>{readiness.percentage}%</Text><Text style={styles.readinessLabel}>READY</Text></View> : null}
      </View>
      {!userId ? <Text style={styles.panelBody}>Sign in to save this opportunity, track preparation and keep your application checklist with your account.</Text> : null}
      {items.isLoading ? <ActivityIndicator color={theme.colors.accentFill} /> : null}
      {items.isError ? <InlineNotice message="The organiser’s preparation checklist could not load." retry={() => void items.refetch()} /> : null}
      {items.data?.length ? (
        <View style={styles.checklist}>
          {items.data.map((item) => {
            const isComplete = completed.has(item.id);
            return (
              <EdPressable key={item.id} accessibilityLabel={`${isComplete ? 'Mark incomplete' : 'Mark complete'}: ${item.label}`} onPress={() => requireUser(() => itemMutation.mutate({ itemId: item.id, complete: !isComplete }))} style={styles.checklistRow}>
                <MaterialIcons name={isComplete ? 'check-box' : 'check-box-outline-blank'} size={22} color={isComplete ? theme.colors.success : theme.colors.textMuted} />
                <View style={styles.reasonCopy}><Text style={styles.reasonTitle}>{item.label}</Text>{item.description ? <Text style={styles.reasonBody}>{item.description}</Text> : null}</View>
                {item.is_required ? <Text style={styles.requiredMark}>REQUIRED</Text> : null}
              </EdPressable>
            );
          })}
        </View>
      ) : <Text style={styles.panelBody}>The organiser has not published a preparation checklist. Review the official guidance before applying.</Text>}
      <View style={styles.workspaceActions}>
        {(!state || state.status === 'saved') ? <EdPressable accessible accessibilityRole="button" accessibilityLabel="Start preparing this application" accessibilityHint="Creates or opens your private PLUGGD application workspace" accessibilityState={{ busy: statusMutation.isPending, disabled: statusMutation.isPending }} disabled={statusMutation.isPending} onPress={() => requireUser(() => statusMutation.mutate('preparing'))} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Start preparing</Text></EdPressable> : null}
        {state?.status === 'preparing' && !items.isLoading && !items.isError && readiness.complete ? <EdPressable accessibilityLabel="Mark this application ready" onPress={() => statusMutation.mutate('ready')} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Mark ready to apply</Text></EdPressable> : null}
        {userId && state?.status === 'ready' ? <EdPressable accessibilityLabel="Mark this opportunity as applied" onPress={() => statusMutation.mutate('applied')} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Mark as applied</Text></EdPressable> : null}
      </View>
    </View>
  );
}

export function OpportunityDetailScreen({ identifier }: { identifier: string }) {
  const theme = usePluggdTheme();
  const styles = useOpportunityStyles();
  const { user } = useAuth();
  const router = useRouter();
  const bottomInset = useBottomChromeInset();
  const queryClient = useQueryClient();
  const detailScrollRef = useRef<ScrollView>(null);
  const [workspaceY, setWorkspaceY] = useState(0);
  const opportunity = useQuery({ queryKey: ['opportunities', 'detail', identifier], queryFn: () => fetchPublishedOpportunity(identifier), enabled: Boolean(identifier) });
  const record = opportunity.data;
  const requirements = useQuery({ queryKey: ['opportunities', record?.id, 'requirements'], queryFn: () => fetchOpportunityRequirements(record!.id), enabled: Boolean(record?.id) });
  const snapshot = useQuery({ queryKey: ['opportunities', 'profile-match', user?.id], queryFn: () => fetchOpportunityProfileSnapshot(user!.id), enabled: Boolean(user?.id) });
  const stateQuery = useQuery({ queryKey: ['opportunities', 'user-states', user?.id, record?.id], queryFn: () => fetchUserOpportunityStates(user!.id, [record!.id]), enabled: Boolean(user?.id && record?.id) });
  const state = stateQuery.data?.[0];
  const match = useMemo(() => record && snapshot.data ? evaluateOpportunityMatch(record, requirements.data ?? [], snapshot.data) : undefined, [record, requirements.data, snapshot.data]);
  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !record) throw new Error('Sign in to save this opportunity.');
      if (state?.status === 'saved') { await removeSavedOpportunity(user.id, record.id); return null; }
      return upsertUserOpportunityStatus(user.id, record.id, 'saved');
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['opportunities', 'user-states'] }),
    onError: (error) => Alert.alert('Could not save opportunity', errorMessage(error)),
  });
  const prepareMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !record) throw new Error('Sign in to prepare this opportunity.');
      return upsertUserOpportunityStatus(user.id, record.id, 'preparing');
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['opportunities', 'user-states'] });
      requestAnimationFrame(() => detailScrollRef.current?.scrollTo({ y: Math.max(0, workspaceY - 12), animated: true }));
    },
    onError: (error) => Alert.alert('Could not start preparing', errorMessage(error)),
  });
  const openOfficialUrl = async (label: string, value: string | null | undefined) => {
    const url = safeOpportunityExternalUrl(value);
    if (!url) { Alert.alert(`${label} unavailable`, 'The organiser has not supplied a safe link for this action.'); return; }
    try { await Linking.openURL(url); } catch (error) { Alert.alert(`Could not open ${label.toLocaleLowerCase()}`, errorMessage(error)); }
  };

  if (opportunity.isLoading) return <View style={styles.screen}><StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} /><LoadState label="Loading opportunity…" /></View>;
  if (opportunity.isError) return <View style={styles.screen}><StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} /><DetailTopBar title="Opportunity" /><ErrorState message={errorMessage(opportunity.error)} retry={() => void opportunity.refetch()} /></View>;
  if (!record) return <View style={styles.screen}><StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} /><DetailTopBar title="Opportunity" /><View style={styles.emptyState}><MaterialIcons name="search-off" size={30} color={theme.colors.accentText} /><Text style={styles.emptyTitle}>This opportunity is not available</Text><Text style={styles.emptyBody}>It may have closed, moved, or no longer be published.</Text><EdPressable accessibilityLabel="Return to all opportunities" onPress={() => router.replace('/opportunities' as any)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>View open opportunities</Text></EdPressable></View></View>;

  const officialApplication = safeOpportunityExternalUrl(record.official_application_url);
  const guidelines = safeOpportunityExternalUrl(record.guidelines_url);
  const source = safeOpportunityExternalUrl(record.source_url);
  const saved = state?.status === 'saved';
  const openWorkspace = () => {
    if (!user?.id) {
      router.push(`/auth/login?redirect=${encodeURIComponent(`/opportunities/${opportunityIdentifier(record)}`)}` as any);
      return;
    }
    if (!state || state.status === 'saved') {
      prepareMutation.mutate();
      return;
    }
    detailScrollRef.current?.scrollTo({ y: Math.max(0, workspaceY - 12), animated: true });
  };
  const workspaceActionLabel = !user ? 'Prepare with PLUGGD' : !state || state.status === 'saved' ? 'Start preparing' : state.status === 'preparing' ? 'Continue preparing' : state.status === 'ready' ? 'Review application' : 'View application';
  return (
    <View style={styles.screen}>
      <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} translucent />
      <DetailTopBar title={record.title} identifier={opportunityIdentifier(record)} />
      <ScrollView ref={detailScrollRef} style={styles.screen} contentContainerStyle={[styles.detailContent, { paddingBottom: bottomInset + 78 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.heroArtworkShell}>
          <OpportunityArtwork opportunity={record} style={styles.heroArtwork} fallback="creator" />
          <LinearGradient colors={['rgba(7,9,13,0.02)', 'rgba(7,9,13,0.86)']} locations={[0.35, 1]} style={StyleSheet.absoluteFillObject} />
          <View style={styles.heroArtworkBadges}><View style={styles.typeBadge}><Text style={styles.typeBadgeText}>{formatOpportunityType(record.opportunity_type)}</Text></View>{record.featured ? <View style={styles.featuredBadge}><Text style={styles.featuredBadgeText}>FEATURED</Text></View> : null}</View>
        </View>
        <View style={styles.detailIntro}>
          <SourceIdentity opportunity={record} />
          <Text style={styles.detailTitle}>{record.title}</Text>
          <Text style={styles.detailSummary}>{opportunityDescription(record)}</Text>
          <View style={styles.detailFacts}>
            <View style={styles.detailFact}><Text style={styles.detailFactLabel}>VALUE</Text><Text style={styles.detailFactValue}>{formatOpportunityFunding(record) || record.benefit_summary || 'See published details'}</Text></View>
            <View style={styles.detailFact}><Text style={styles.detailFactLabel}>LOCATION</Text><Text style={styles.detailFactValue}>{formatOpportunityLocation(record)}</Text></View>
            <View style={styles.detailFact}><Text style={styles.detailFactLabel}>DEADLINE</Text><Text style={styles.detailFactValue}>{formatOpportunityDeadline(record)}</Text></View>
          </View>
          <View style={styles.primaryActions}>
            {state && !saved ? (
              <View style={[styles.saveButton, styles.saveButtonWide]} accessibilityLabel={`Application status: ${statusLabel(state.status)}`}><MaterialIcons name="task-alt" size={21} color={theme.colors.success} /><Text style={styles.saveButtonText}>{statusLabel(state.status)}</Text></View>
            ) : (
              <EdPressable accessible accessibilityRole="button" accessibilityLabel={saved ? `Remove ${record.title} from saved opportunities` : `Save ${record.title} for later`} accessibilityHint={saved ? 'Removes only the saved bookmark' : 'Saves this opportunity to your private PLUGGD workspace'} accessibilityState={{ busy: saveMutation.isPending, disabled: saveMutation.isPending }} disabled={saveMutation.isPending} onPress={() => { if (!user?.id) { router.push(`/auth/login?redirect=${encodeURIComponent(`/opportunities/${opportunityIdentifier(record)}`)}` as any); return; } saveMutation.mutate(); }} style={[styles.saveButton, styles.saveButtonWide]}><MaterialIcons name={saved ? 'bookmark' : 'bookmark-border'} size={21} color={saved ? theme.colors.accentText : theme.colors.text} /><Text style={styles.saveButtonText}>{saved ? 'Saved' : 'Save for later'}</Text></EdPressable>
            )}
            {!officialApplication ? <View style={styles.noApplication}><MaterialIcons name="info-outline" size={19} color={theme.colors.accentText} /><Text style={styles.noApplicationText}>No direct application link is published. Use the verified official source below.</Text></View> : null}
          </View>
        </View>

        {user ? <DetailMatchPanel match={match} loading={snapshot.isLoading || requirements.isLoading} error={snapshot.isError || requirements.isError} retry={() => void Promise.all([snapshot.refetch(), requirements.refetch()])} /> : (
          <View style={[styles.detailPanel, styles.signedOutMatch]}><Text style={styles.panelEyebrow}>PRIVATE MATCHING</Text><Text style={styles.panelTitle}>See how this fits your work.</Text><Text style={styles.panelBody}>Sign in and PLUGGD will privately check the published criteria against your profile and catalogue—automatically, with reasons and confidence.</Text><EdPressable accessibilityLabel="Sign in to check this opportunity match" onPress={() => router.push(`/auth/login?redirect=${encodeURIComponent(`/opportunities/${opportunityIdentifier(record)}`)}` as any)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Sign in to check your match</Text></EdPressable></View>
        )}
        {user?.id && match?.missingFacts.length ? <MissingFactsPanel userId={user.id} opportunity={record} match={match} requirements={requirements.data ?? []} /> : null}

        <View style={styles.detailPanel}><Text style={styles.panelEyebrow}>ABOUT THIS OPPORTUNITY</Text><Text style={styles.panelTitle}>What the organiser is offering</Text><Text style={styles.aboutBody}>{record.body || record.description_summary || record.summary || 'The organiser has not supplied a longer description. Use the official source for complete details.'}</Text>{record.benefit_summary ? <View style={styles.benefitCallout}><Text style={styles.benefitLabel}>WHAT IT PROVIDES</Text><Text style={styles.benefitBody}>{record.benefit_summary}</Text></View> : null}</View>

        {requirements.isError ? <View style={styles.detailPanel}><InlineNotice message="Some published eligibility criteria could not load. Check the official guidance before applying." retry={() => void requirements.refetch()} /></View> : null}
        <PublishedEligibility opportunity={record} requirements={requirements.data ?? []} match={match} />
        {stateQuery.isError ? <View style={styles.detailPanel}><InlineNotice message="Your saved application status could not load." retry={() => void stateQuery.refetch()} /></View> : null}
        <View onLayout={(event: LayoutChangeEvent) => setWorkspaceY(event.nativeEvent.layout.y)}>
          <ApplicationWorkspace opportunity={record} userId={user?.id} state={state} />
        </View>

        <View style={styles.detailPanel}>
          <Text style={styles.panelEyebrow}>OFFICIAL INFORMATION</Text><Text style={styles.panelTitle}>Verify before you apply</Text>
          <View style={styles.officialFacts}><View style={styles.officialFact}><MaterialIcons name="verified" size={19} color={record.verification_status === 'verified' ? theme.colors.success : theme.colors.accentText} /><Text style={styles.officialFactText}>{record.verification_status === 'verified' ? 'Verified PLUGGD listing' : 'Check the official source before applying'}</Text></View>{record.last_checked_at ? <Text style={styles.lastChecked}>Last checked {new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(record.last_checked_at))}</Text> : null}</View>
          <View style={styles.officialLinks}>
            {guidelines ? <EdPressable accessibilityLabel="Open official opportunity guidelines" onPress={() => void openOfficialUrl('Guidelines', guidelines)} style={styles.officialLink}><Text style={styles.officialLinkText}>Official guidelines</Text><MaterialIcons name="open-in-new" size={18} color={theme.colors.accentText} /></EdPressable> : null}
            {source ? <EdPressable accessibilityLabel="Open original opportunity source" onPress={() => void openOfficialUrl('Original source', source)} style={styles.officialLink}><Text style={styles.officialLinkText}>Original listing</Text><MaterialIcons name="open-in-new" size={18} color={theme.colors.accentText} /></EdPressable> : null}
          </View>
        </View>
      </ScrollView>
      <View style={[styles.stickyActions, { bottom: bottomInset }]}>
        {officialApplication ? <EdPressable accessibilityLabel="Apply on the official organiser website" onPress={() => void openOfficialUrl('Official application', officialApplication)} style={[styles.stickyActionButton, styles.stickyApplyButton]}><Text style={styles.stickyActionText}>Apply now</Text><MaterialIcons name="open-in-new" size={18} color={theme.colors.onAccent} /></EdPressable> : null}
        <EdPressable accessible accessibilityRole="button" accessibilityLabel={workspaceActionLabel} accessibilityHint="Starts or opens your private PLUGGD application workspace" accessibilityState={{ busy: prepareMutation.isPending, disabled: prepareMutation.isPending }} disabled={prepareMutation.isPending} onPress={openWorkspace} style={[styles.stickyActionButton, styles.stickyPrepareButton, !officialApplication && styles.stickyActionWide]}>{prepareMutation.isPending ? <ActivityIndicator color={theme.colors.text} /> : <><Text style={styles.stickyActionTextLight}>{workspaceActionLabel}</Text><MaterialIcons name="arrow-forward" size={18} color={theme.colors.text} /></>}</EdPressable>
      </View>
    </View>
  );
}

function useOpportunityStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  listContent: { paddingHorizontal: 18, paddingTop: 36, gap: 16 },
  pageHeader: { gap: 6, paddingTop: 4 },
  pageEyebrow: { color: theme.colors.accentText, fontFamily: edFonts.bodyBlack, fontSize: 11, letterSpacing: 1.7 },
  pageTitle: { color: theme.colors.text, fontFamily: edFonts.displayExtraBold, fontSize: 29, lineHeight: 33, letterSpacing: -0.7 },
  pageSubtitle: { color: theme.colors.textSecondary, fontFamily: edFonts.bodyMedium, fontSize: 14, lineHeight: 20, maxWidth: 600 },
  snapshotGrid: { flexDirection: 'row', gap: 8 },
  snapshotCard: { flex: 1, minHeight: 74, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 11, justifyContent: 'space-between' },
  snapshotValueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  snapshotValue: { color: theme.colors.text, fontFamily: edFonts.displayBold, fontSize: 20, letterSpacing: -0.4 },
  snapshotLabel: { color: theme.colors.textMuted, fontFamily: edFonts.bodyBlack, fontSize: 8.5, lineHeight: 11, letterSpacing: 0.8 },
  searchRow: { flexDirection: 'row', alignItems: 'stretch', gap: 8 },
  searchShell: { flex: 1, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 14 },
  searchInput: { flex: 1, color: theme.colors.text, fontFamily: edFonts.bodyMedium, fontSize: 14, paddingVertical: 12 },
  clearSearchButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  filterButton: { width: 48, minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  filterCount: { position: 'absolute', top: 5, right: 5, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  filterCountText: { color: theme.colors.onAccent, fontFamily: edFonts.bodyBlack, fontSize: 8 },
  filterRail: { gap: 8, paddingRight: 20 },
  filterChip: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { borderColor: theme.colors.accentFill, backgroundColor: theme.colors.accentFill },
  filterChipDisabled: { opacity: 0.38 },
  filterChipText: { color: theme.colors.textSecondary, fontFamily: edFonts.bodyBold, fontSize: 12 },
  filterChipTextActive: { color: theme.colors.onAccent },
  deliveryRail: { gap: 8, paddingRight: 20, marginTop: -8 },
  deliveryChip: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.controlBorder, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12 },
  deliveryChipActive: { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft },
  deliveryChipText: { color: theme.colors.textSecondary, fontFamily: edFonts.bodyMedium, fontSize: 11.5 },
  sectionHeading: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 2 },
  sectionTitle: { color: theme.colors.text, fontFamily: edFonts.displayBold, fontSize: 19 },
  sectionCount: { color: theme.colors.textMuted, fontFamily: edFonts.bodyBlack, fontSize: 9, letterSpacing: 1.1 },
  sectionAction: { color: theme.colors.accentText, fontFamily: edFonts.bodyBlack, fontSize: 9, letterSpacing: 1.1 },
  featuredCard: { minHeight: 356, borderRadius: 19, overflow: 'hidden', borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.surface },
  featuredMedia: { height: 188, position: 'relative', overflow: 'hidden', backgroundColor: theme.colors.artworkBase },
  featuredImage: { width: '100%', height: '100%' },
  artworkFallback: { backgroundColor: theme.colors.artworkBase, alignItems: 'center', justifyContent: 'center' },
  featuredBadges: { position: 'absolute', top: 12, left: 12, right: 12, flexDirection: 'row', gap: 7 },
  featuredBadge: { borderRadius: 6, backgroundColor: 'rgba(40,16,70,0.88)', borderWidth: 1, borderColor: 'rgba(190,139,255,0.55)', paddingHorizontal: 8, paddingVertical: 5 },
  featuredBadgeText: { color: '#e3cfff', fontFamily: edFonts.bodyBlack, fontSize: 9, letterSpacing: 0.8 },
  typeBadge: { borderRadius: 6, backgroundColor: 'rgba(89,47,151,0.88)', paddingHorizontal: 8, paddingVertical: 5 },
  typeBadgeText: { color: '#fff', fontFamily: edFonts.bodyBlack, fontSize: 9, letterSpacing: 0.5, textTransform: 'uppercase' },
  featuredBody: { minHeight: 166, padding: 14, gap: 7, backgroundColor: theme.colors.surface },
  sourceRow: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7 },
  identityMark: { width: 36, height: 36, flexShrink: 0, borderRadius: 9, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: '#fff', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', padding: 4 },
  identityMarkSmall: { width: 22, height: 22, borderRadius: 6, padding: 2 },
  identityMarkLarge: { width: 82, height: 82, borderRadius: 20, padding: 9 },
  identityMarkDark: { backgroundColor: '#080a0e' },
  identityLogo: { width: '100%', height: '100%' },
  sourceName: { flexShrink: 1, color: theme.colors.text, fontFamily: edFonts.bodyBold, fontSize: 13 },
  sourceNameSmall: { fontSize: 11.5 },
  featuredTitle: { color: theme.colors.text, fontFamily: edFonts.displayExtraBold, fontSize: 21, lineHeight: 24, letterSpacing: -0.4 },
  featuredFunding: { color: theme.colors.text, fontFamily: edFonts.displayBold, fontSize: 18 },
  featuredMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  featuredMeta: { flexShrink: 1, color: theme.colors.textSecondary, fontFamily: edFonts.bodyMedium, fontSize: 11 },
  featuredFooter: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 },
  featuredTags: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  featuredTag: { color: theme.colors.textSecondary, fontFamily: edFonts.bodyBold, fontSize: 9.5, backgroundColor: theme.colors.surfaceAlt, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 4 },
  matchPill: { minWidth: 60, height: 52, borderRadius: 26, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  matchPillPositive: { borderColor: theme.colors.success, backgroundColor: theme.colors.surfaceAlt },
  matchPillNeutral: { borderColor: theme.colors.accentText, backgroundColor: theme.colors.accentSoft },
  matchPillScore: { fontFamily: edFonts.bodyBlack, fontSize: 14, lineHeight: 16 },
  matchPillLabel: { color: theme.colors.textMuted, fontFamily: edFonts.bodyBlack, fontSize: 7, letterSpacing: 0.6 },
  statusPill: { borderRadius: 6, borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft, paddingHorizontal: 6, paddingVertical: 3 },
  statusPillText: { color: theme.colors.accentText, fontFamily: edFonts.bodyBlack, fontSize: 8.5 },
  opportunityRows: { gap: 10 },
  opportunityRow: { minHeight: 112, flexDirection: 'row', gap: 11, borderRadius: 15, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, padding: 10 },
  rowImage: { width: 88, alignSelf: 'stretch', borderRadius: 11, backgroundColor: theme.colors.artworkBase },
  rowBody: { flex: 1, minWidth: 0, gap: 3 },
  rowBadgeLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowType: { color: theme.colors.accentText, fontFamily: edFonts.bodyBlack, fontSize: 8.5, letterSpacing: 0.6 },
  rowTitle: { color: theme.colors.text, fontFamily: edFonts.bodyBlack, fontSize: 14.5, lineHeight: 18 },
  rowOrganiser: { color: theme.colors.textSecondary, fontFamily: edFonts.bodyMedium, fontSize: 11.5 },
  rowMetaLine: { minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  rowMeta: { flexShrink: 1, color: theme.colors.textMuted, fontFamily: edFonts.bodyMedium, fontSize: 9.5 },
  rowDot: { color: theme.colors.textMuted },
  rowValue: { width: 74, alignItems: 'flex-end', justifyContent: 'center', gap: 5 },
  rowMatch: { color: theme.colors.success, fontFamily: edFonts.bodyBlack, fontSize: 13 },
  rowFunding: { color: theme.colors.text, textAlign: 'right', fontFamily: edFonts.bodyBold, fontSize: 10.5, lineHeight: 13 },
  loadState: { flex: 1, minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: 24 },
  loadStateText: { color: theme.colors.textSecondary, fontFamily: edFonts.bodyMedium, fontSize: 14 },
  emptyState: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 26, paddingVertical: 44, margin: 18, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  emptyTitle: { color: theme.colors.text, textAlign: 'center', fontFamily: edFonts.displayBold, fontSize: 19 },
  emptyBody: { color: theme.colors.textSecondary, textAlign: 'center', fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 19 },
  inlineNotice: { minHeight: 50, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft, flexDirection: 'row', alignItems: 'center', gap: 8, padding: 11 },
  inlineNoticeText: { flex: 1, color: theme.colors.textSecondary, fontFamily: edFonts.bodyMedium, fontSize: 11.5, lineHeight: 16 },
  inlineNoticeAction: { color: theme.colors.accentText, fontFamily: edFonts.bodyBlack, fontSize: 11.5 },
  filterModal: { flex: 1, backgroundColor: theme.colors.background },
  filterModalHeader: { minHeight: 142, flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider, paddingHorizontal: 12, paddingBottom: 14, backgroundColor: theme.colors.surfaceRaised },
  filterCloseButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.controlBorder },
  filterModalTitleBlock: { flex: 1, minWidth: 0, gap: 3, paddingTop: 2 },
  filterModalEyebrow: { color: theme.colors.accentText, fontFamily: edFonts.bodyBlack, fontSize: 9, letterSpacing: 1.1 },
  filterModalTitle: { color: theme.colors.text, fontFamily: edFonts.displayExtraBold, fontSize: 23, lineHeight: 27, letterSpacing: -0.4 },
  filterModalSubtitle: { color: theme.colors.textSecondary, fontFamily: edFonts.bodyMedium, fontSize: 11.5, lineHeight: 16 },
  clearFiltersButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 5 },
  clearFiltersText: { color: theme.colors.accentText, fontFamily: edFonts.bodyBlack, fontSize: 11 },
  filterModalContent: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 116, gap: 18 },
  filterGroup: { gap: 9 },
  filterGroupDisabled: { opacity: 0.38 },
  filterGroupLabel: { color: theme.colors.text, fontFamily: edFonts.bodyBlack, fontSize: 13.5 },
  filterGroupOptions: { gap: 8, paddingRight: 20 },
  filterOption: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  filterOptionActive: { borderColor: theme.colors.accentFill, backgroundColor: theme.colors.accentFill },
  filterOptionText: { color: theme.colors.textSecondary, fontFamily: edFonts.bodyBold, fontSize: 11.5 },
  filterOptionTextActive: { color: theme.colors.onAccent },
  filterSnapshot: { gap: 11, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft, padding: 13 },
  filterSnapshotHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  filterSnapshotTitle: { color: theme.colors.text, fontFamily: edFonts.bodyBlack, fontSize: 13 },
  filterSnapshotLive: { color: theme.colors.success, fontFamily: edFonts.bodyBlack, fontSize: 8, letterSpacing: 0.9 },
  filterPriority: { gap: 10 },
  filterPreviewRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, padding: 8 },
  filterPreviewArtwork: { width: 66, height: 66, borderRadius: 9, backgroundColor: theme.colors.artworkBase },
  filterPreviewBody: { flex: 1, minWidth: 0, gap: 3 },
  filterPreviewType: { color: theme.colors.accentText, fontFamily: edFonts.bodyBlack, fontSize: 8, letterSpacing: 0.7 },
  filterPreviewTitle: { color: theme.colors.text, fontFamily: edFonts.bodyBlack, fontSize: 12.5, lineHeight: 16 },
  filterPreviewMeta: { color: theme.colors.textMuted, fontFamily: edFonts.bodyMedium, fontSize: 10 },
  filterPreviewMatch: { color: theme.colors.success, fontFamily: edFonts.bodyBlack, fontSize: 13 },
  filterModalFooter: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.divider, backgroundColor: theme.colors.headerGlass, paddingHorizontal: 18, paddingTop: 12 },
  showResultsButton: { minHeight: 52, borderRadius: 14, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  showResultsText: { color: theme.colors.onAccent, fontFamily: edFonts.bodyBlack, fontSize: 14 },
  secondaryButton: { minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  secondaryButtonText: { color: theme.colors.text, fontFamily: edFonts.bodyBlack, fontSize: 13 },
  detailTopBar: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider, backgroundColor: theme.colors.background },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  detailTopTitle: { flex: 1, color: theme.colors.text, textAlign: 'center', fontFamily: edFonts.bodyBold, fontSize: 13 },
  detailContent: { gap: 12 },
  heroArtworkShell: { height: 156, overflow: 'hidden', backgroundColor: theme.colors.artworkBase },
  heroArtwork: { width: '100%', height: '100%' },
  heroArtworkBadges: { position: 'absolute', left: 18, right: 18, bottom: 18, flexDirection: 'row', gap: 7 },
  detailIntro: { paddingHorizontal: 18, paddingTop: 2, gap: 10 },
  detailTitle: { color: theme.colors.text, fontFamily: edFonts.displayExtraBold, fontSize: 27, lineHeight: 30, letterSpacing: -0.6 },
  detailSummary: { color: theme.colors.textSecondary, fontFamily: edFonts.bodyMedium, fontSize: 13.5, lineHeight: 19 },
  detailFacts: { flexDirection: 'row', gap: 8 },
  detailFact: { flex: 1, minHeight: 68, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 9, gap: 5 },
  detailFactLabel: { color: theme.colors.textMuted, fontFamily: edFonts.bodyBlack, fontSize: 8, letterSpacing: 1 },
  detailFactValue: { color: theme.colors.text, fontFamily: edFonts.bodyBold, fontSize: 11.5, lineHeight: 15 },
  primaryActions: { flexDirection: 'row', gap: 9, alignItems: 'stretch' },
  primaryButton: { flex: 1, minHeight: 50, borderRadius: 13, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 14 },
  primaryButtonText: { color: theme.colors.onAccent, fontFamily: edFonts.bodyBlack, fontSize: 13 },
  saveButton: { minWidth: 92, minHeight: 50, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, paddingHorizontal: 12 },
  saveButtonWide: { flex: 1 },
  saveButtonText: { color: theme.colors.text, fontFamily: edFonts.bodyBold, fontSize: 12 },
  noApplication: { flex: 1, minHeight: 58, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 12 },
  noApplicationText: { flex: 1, color: theme.colors.textSecondary, fontFamily: edFonts.bodyMedium, fontSize: 11.5, lineHeight: 16 },
  detailPanel: { marginHorizontal: 18, borderRadius: 17, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 15, gap: 11 },
  signedOutMatch: { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft },
  matchPanel: { borderColor: theme.colors.success, backgroundColor: theme.colors.surfaceAlt },
  panelEyebrow: { color: theme.colors.accentText, fontFamily: edFonts.bodyBlack, fontSize: 9.5, letterSpacing: 1.2 },
  panelTitle: { color: theme.colors.text, fontFamily: edFonts.displayBold, fontSize: 21, lineHeight: 25 },
  panelBody: { color: theme.colors.textSecondary, fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 19 },
  matchHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  matchHeaderCopy: { flex: 1, minWidth: 0, gap: 5 },
  matchConfidence: { color: theme.colors.textSecondary, fontFamily: edFonts.bodyMedium, fontSize: 11.5, lineHeight: 16 },
  matchRing: { width: 74, height: 74, borderRadius: 37, borderWidth: 6, borderColor: theme.colors.success, backgroundColor: theme.colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  matchRingValue: { color: theme.colors.text, fontFamily: edFonts.bodyBlack, fontSize: 18 },
  matchRingLabel: { color: theme.colors.success, fontFamily: edFonts.bodyBlack, fontSize: 7, letterSpacing: 0.7 },
  reasonList: { gap: 9 },
  reasonRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  reasonCopy: { flex: 1, minWidth: 0, gap: 2 },
  reasonTitle: { color: theme.colors.text, fontFamily: edFonts.bodyBold, fontSize: 13 },
  reasonBody: { color: theme.colors.textSecondary, fontFamily: edFonts.bodyMedium, fontSize: 11.5, lineHeight: 16 },
  missingFactsCta: { minHeight: 62, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.accentSoft, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 12 },
  missingFactsTitle: { color: theme.colors.text, fontFamily: edFonts.bodyBold, fontSize: 12 },
  missingFactsBody: { color: theme.colors.textSecondary, fontFamily: edFonts.bodyMedium, fontSize: 10.5 },
  missingFactsPanel: { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.surfaceAlt },
  missingAnswerList: { gap: 10 },
  missingAnswerCard: { gap: 9, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceRaised, padding: 12 },
  booleanAnswers: { flexDirection: 'row', gap: 8 },
  booleanAnswer: { flex: 1, minHeight: 44, borderRadius: 11, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  booleanAnswerActive: { borderColor: theme.colors.accentFill, backgroundColor: theme.colors.accentFill },
  booleanAnswerText: { color: theme.colors.textSecondary, fontFamily: edFonts.bodyBlack, fontSize: 12 },
  factInput: { minHeight: 46, borderRadius: 11, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, color: theme.colors.text, fontFamily: edFonts.bodyMedium, fontSize: 13, paddingHorizontal: 12 },
  factActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rememberAnswer: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 7 },
  rememberAnswerText: { flex: 1, color: theme.colors.textSecondary, fontFamily: edFonts.bodyMedium, fontSize: 10.5, lineHeight: 14 },
  saveFactButton: { minHeight: 44, borderRadius: 10, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13 },
  saveFactButtonText: { color: theme.colors.onAccent, fontFamily: edFonts.bodyBlack, fontSize: 11 },
  buttonDisabled: { opacity: 0.42 },
  aboutBody: { color: theme.colors.textSecondary, fontFamily: edFonts.bodyMedium, fontSize: 14, lineHeight: 22 },
  benefitCallout: { borderRadius: 12, borderWidth: 1, borderColor: theme.colors.success, backgroundColor: theme.colors.surfaceAlt, padding: 13, gap: 6 },
  benefitLabel: { color: theme.colors.success, fontFamily: edFonts.bodyBlack, fontSize: 9, letterSpacing: 1 },
  benefitBody: { color: theme.colors.text, fontFamily: edFonts.bodyMedium, fontSize: 12.5, lineHeight: 18 },
  eligibilityList: { gap: 8 },
  eligibilityRow: { borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceRaised, flexDirection: 'row', alignItems: 'flex-start', gap: 9, padding: 12 },
  requirementLevel: { color: theme.colors.textMuted, fontFamily: edFonts.bodyBlack, fontSize: 8, letterSpacing: 0.9, marginTop: 3 },
  workspaceHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  readinessPill: { width: 66, height: 66, borderRadius: 33, borderWidth: 5, borderColor: theme.colors.accentFill, backgroundColor: theme.colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  readinessValue: { color: theme.colors.text, fontFamily: edFonts.bodyBlack, fontSize: 15 },
  readinessLabel: { color: theme.colors.accentText, fontFamily: edFonts.bodyBlack, fontSize: 7, letterSpacing: 0.6 },
  checklist: { gap: 8 },
  checklistRow: { minHeight: 58, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.controlBorder, flexDirection: 'row', alignItems: 'center', gap: 9, padding: 11 },
  requiredMark: { color: theme.colors.textMuted, fontFamily: edFonts.bodyBlack, fontSize: 7, letterSpacing: 0.7 },
  workspaceActions: { gap: 8 },
  officialFacts: { gap: 7 },
  officialFact: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  officialFactText: { color: theme.colors.text, fontFamily: edFonts.bodyBold, fontSize: 12.5 },
  lastChecked: { color: theme.colors.textMuted, fontFamily: edFonts.bodyMedium, fontSize: 11 },
  officialLinks: { gap: 8 },
  officialLink: { minHeight: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 13 },
  officialLinkText: { color: theme.colors.text, fontFamily: edFonts.bodyBold, fontSize: 12.5 },
  stickyActions: { position: 'absolute', left: 12, right: 12, minHeight: 62, zIndex: 20, elevation: 20, flexDirection: 'row', alignItems: 'stretch', gap: 8, borderRadius: 17, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.headerGlass, padding: 7, shadowColor: theme.colors.shadow, shadowOpacity: 0.42, shadowRadius: 15, shadowOffset: { width: 0, height: 8 } },
  stickyActionButton: { flex: 1, minHeight: 48, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 11 },
  stickyActionWide: { flex: 1 },
  stickyApplyButton: { backgroundColor: theme.colors.accentFill },
  stickyPrepareButton: { backgroundColor: theme.colors.surfaceStrong, borderWidth: 1, borderColor: theme.colors.controlBorder },
  stickyActionText: { color: theme.colors.onAccent, fontFamily: edFonts.bodyBlack, fontSize: 12.5 },
  stickyActionTextLight: { color: theme.colors.text, fontFamily: edFonts.bodyBlack, fontSize: 12.5 },
  }), [theme]);
}
