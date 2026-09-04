import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { EditorialTitle } from '../../components/EditorialTitle';
import { PluggdImage } from '../../src/components/PluggdImage';
import { selectionHaptic } from '../../src/design/haptics';
import { pluggdFonts } from '../../src/design/typography';
import { formatCompact, formatDate } from '../../src/lib/mobileContent';
import { safeList } from '../../src/features/culture/mobileServices';
import { supabase } from '../../src/lib/supabase';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

type CampaignRow = {
  id: string;
  slug?: string | null;
  title: string;
  status: string;
  cover_url?: string | null;
  goal: number;
  raised: number;
  ends_at?: string | null;
  owner_id: string;
  creator_id?: string | null;
  created_at?: string | null;
};

function progressPct(campaign: CampaignRow) {
  if (!campaign.goal || campaign.goal <= 0) return 0;
  return Math.min(100, Math.round((campaign.raised / campaign.goal) * 100));
}

function CampaignCard({ campaign }: { campaign: CampaignRow }) {
  const theme = usePluggdTheme();
  const styles = useCrowdfundingStyles();
  const router = useRouter();
  const pct = progressPct(campaign);
  const ended = campaign.status === 'success' || campaign.status === 'fulfilled';
  return (
    <View style={styles.card}>
      <View style={styles.cover}>
        {campaign.cover_url ? (
          <PluggdImage uri={campaign.cover_url} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel={campaign.title} />
        ) : (
          <View style={[StyleSheet.absoluteFill, styles.coverFallback]}>
            <MaterialIcons name="favorite" size={30} color={theme.colors.accentText} />
          </View>
        )}
        <View style={styles.statusChip}>
          <Text style={styles.statusText}>{ended ? 'FUNDED' : 'LIVE CAMPAIGN'}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{campaign.title}</Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.max(pct, 2)}%` }]} />
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.pct}>{pct}% funded</Text>
          {campaign.goal > 0 ? (
            <Text style={styles.goal}>£{formatCompact(campaign.raised)} of £{formatCompact(campaign.goal)}</Text>
          ) : null}
        </View>
        {campaign.ends_at ? <Text style={styles.ends}>{ended ? 'Completed' : `Ends ${formatDate(campaign.ends_at)}`}</Text> : null}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Open the creator behind ${campaign.title}`}
            onPress={() => {
              selectionHaptic();
              router.push(`/user/${campaign.creator_id || campaign.owner_id}` as any);
            }}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <View style={styles.primary}>
              <MaterialIcons name="person" size={15} color={theme.colors.onAccent} />
              <Text style={styles.primaryText}>View creator</Text>
            </View>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Share ${campaign.title}`}
            onPress={() => {
              selectionHaptic();
              void Share.share({ message: `Back "${campaign.title}" on PLUGGD${campaign.slug ? `: https://www.pluggd.fm/c/${campaign.slug}` : ''}` });
            }}
            style={({ pressed }) => pressed && styles.pressed}
          >
            <View style={styles.secondary}>
              <MaterialIcons name="ios-share" size={15} color={theme.colors.text} />
              <Text style={styles.secondaryText}>Share</Text>
            </View>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function CrowdfundingScreen() {
  const theme = usePluggdTheme();
  const styles = useCrowdfundingStyles();
  const query = useQuery({
    queryKey: ['commerce', 'crowdfunding'],
    queryFn: async () =>
      safeList<CampaignRow>(
        (supabase as any)
          .from('campaigns')
          .select('id,slug,title,status,cover_url,goal,raised,ends_at,owner_id,creator_id,created_at')
          .in('status', ['live', 'success', 'fulfilled'])
          .order('created_at', { ascending: false })
          .limit(20),
      ),
    staleTime: 1000 * 60,
  });

  const campaigns = query.data ?? [];

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Crowdfunding', headerShown: false }} />
      <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>COMMUNITY FUNDING</Text>
        <EditorialTitle
          segments={[{ text: 'Crowdfund the ' }, { text: 'culture', accent: true }]}
          size={32}
          color={theme.colors.text}
          accentColor={theme.colors.accentText}
        />
        <Text style={styles.summary}>
          Community-backed campaigns from PLUGGD creators — listening parties, releases, and moments fans fund together.
        </Text>

        {query.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={theme.colors.accentFill} />
          </View>
        ) : campaigns.length ? (
          campaigns.map((campaign) => <CampaignCard key={campaign.id} campaign={campaign} />)
        ) : (
          <View style={styles.empty}>
            <MaterialIcons name="favorite-border" size={26} color={theme.colors.accentText} />
            <Text style={styles.emptyTitle}>No live campaigns right now</Text>
            <Text style={styles.emptyBody}>Creator campaigns appear here the moment they go live.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function useCrowdfundingStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.background },
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 128, paddingBottom: 226, gap: 14 },
  kicker: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 11, letterSpacing: 1.2 },
  summary: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 20, marginBottom: 6 },
  card: {
    borderRadius: 5,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
  },
  cover: { height: 150, backgroundColor: theme.colors.artworkBase },
  coverFallback: { alignItems: 'center', justifyContent: 'center' },
  statusChip: {
    position: 'absolute',
    top: 12,
    left: 12,
    borderRadius: 4,
    backgroundColor: 'rgba(10,8,6,0.62)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusText: { color: theme.colors.mediaText, fontFamily: pluggdFonts.satoshiBold, fontSize: 9.5, letterSpacing: 1 },
  body: { padding: 15, gap: 9 },
  title: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 18, lineHeight: 23, letterSpacing: -0.3 },
  track: { height: 7, borderRadius: 4, backgroundColor: theme.colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4, backgroundColor: theme.colors.accentFill },
  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pct: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  goal: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12.5 },
  ends: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 3 },
  pressed: { opacity: 0.9 },
  primary: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 5,
    backgroundColor: theme.colors.accentFill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  primaryText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBold, fontSize: 12.5 },
  secondary: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 5,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.controlBorder,
    backgroundColor: theme.colors.surfaceRaised,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  secondaryText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 12.5 },
  center: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  empty: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.colors.divider,
    paddingVertical: 22,
    alignItems: 'flex-start',
    gap: 8,
  },
  emptyTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 18 },
  emptyBody: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12.5, lineHeight: 18, textAlign: 'left' },
  }), [theme]);
}
