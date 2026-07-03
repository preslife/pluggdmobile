import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { PremiumScreenBackdrop } from '../../components/PluggdPrimitives';
import { EditorialTitle } from '../../components/EditorialTitle';
import { selectionHaptic } from '../../src/design/haptics';
import { pluggdFonts } from '../../src/design/typography';
import { formatCompact, formatDate } from '../../src/lib/mobileContent';
import { safeList } from '../../src/features/culture/mobileServices';
import { supabase } from '../../src/lib/supabase';

const ORANGE = '#FF5A00';

type CollabRow = {
  id: string;
  title: string;
  description: string;
  genre: string;
  project_type?: string | null;
  skills_needed: string[];
  budget_range?: string | null;
  deadline?: string | null;
  status: string;
  votes: number;
  user_id: string;
  is_featured?: boolean | null;
  created_at?: string | null;
};

function CollabCard({ collab }: { collab: CollabRow }) {
  const router = useRouter();
  return (
    <View style={[styles.card, collab.is_featured && styles.cardFeatured]}>
      <View style={styles.headRow}>
        <Text style={styles.kind} numberOfLines={1}>
          {(collab.project_type || collab.genre || 'Collab').toUpperCase()}
        </Text>
        {collab.is_featured ? (
          <View style={styles.featuredChip}>
            <MaterialIcons name="star" size={11} color="#0E0E12" />
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>{collab.title}</Text>
      <Text style={styles.desc} numberOfLines={3}>{collab.description}</Text>

      {collab.skills_needed?.length ? (
        <View style={styles.skills}>
          {collab.skills_needed.slice(0, 4).map((skill) => (
            <View key={skill} style={styles.skillChip}>
              <Text style={styles.skillText} numberOfLines={1}>{skill}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.metaRow}>
        {collab.budget_range ? (
          <View style={styles.metaItem}>
            <MaterialIcons name="payments" size={13} color="#FF8A4C" />
            <Text style={styles.metaText}>{collab.budget_range}</Text>
          </View>
        ) : null}
        {collab.deadline ? (
          <View style={styles.metaItem}>
            <MaterialIcons name="schedule" size={13} color="#FF8A4C" />
            <Text style={styles.metaText}>Due {formatDate(collab.deadline)}</Text>
          </View>
        ) : null}
        {collab.votes ? (
          <View style={styles.metaItem}>
            <MaterialIcons name="thumb-up-off-alt" size={13} color="#FF8A4C" />
            <Text style={styles.metaText}>{formatCompact(collab.votes)}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open the creator behind ${collab.title}`}
          onPress={() => {
            selectionHaptic();
            router.push(`/user/${collab.user_id}` as any);
          }}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <View style={styles.primary}>
            <MaterialIcons name="person" size={15} color="#0E0E12" />
            <Text style={styles.primaryText}>View creator</Text>
          </View>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Share ${collab.title}`}
          onPress={() => {
            selectionHaptic();
            void Share.share({ message: `Open collab brief on PLUGGD: "${collab.title}" — ${collab.genre}` });
          }}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <View style={styles.secondary}>
            <MaterialIcons name="ios-share" size={15} color="#FFFFFF" />
            <Text style={styles.secondaryText}>Share</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

export default function CollabHubScreen() {
  const query = useQuery({
    queryKey: ['pro', 'collab-hub'],
    queryFn: async () =>
      safeList<CollabRow>(
        (supabase as any)
          .from('collaboration_projects')
          .select('id,title,description,genre,project_type,skills_needed,budget_range,deadline,status,votes,user_id,is_featured,created_at')
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(24),
      ),
    staleTime: 1000 * 60,
  });

  const collabs = (query.data ?? []).filter((collab) => !/closed|archived|deleted/i.test(collab.status || ''));

  return (
    <PremiumScreenBackdrop>
      <Stack.Screen options={{ title: 'Collab Hub', headerShown: false }} />
      <StatusBar style="light" />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.pageKicker}>CREATOR OPPORTUNITIES</Text>
        <EditorialTitle
          segments={[{ text: 'The Collab ' }, { text: 'Hub', accent: true }]}
          size={32}
          color="#FFFFFF"
          accentColor={ORANGE}
        />
        <Text style={styles.summary}>
          Open briefs from artists, producers, and DJs looking to build together — skills, budgets, and deadlines up front.
        </Text>

        {query.isLoading ? (
          <View style={styles.center}>
            <ActivityIndicator color={ORANGE} />
          </View>
        ) : collabs.length ? (
          collabs.map((collab) => <CollabCard key={collab.id} collab={collab} />)
        ) : (
          <View style={styles.empty}>
            <MaterialIcons name="handshake" size={26} color={ORANGE} />
            <Text style={styles.emptyTitle}>No open collab briefs yet</Text>
            <Text style={styles.emptyBody}>Creator collaboration briefs appear here as soon as they are published.</Text>
          </View>
        )}
      </ScrollView>
    </PremiumScreenBackdrop>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 108, paddingBottom: 226, gap: 14 },
  pageKicker: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 11, letterSpacing: 1.2 },
  summary: { color: '#B9B9C7', fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 20, marginBottom: 6 },
  card: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#101018',
    padding: 15,
    gap: 9,
  },
  cardFeatured: {
    borderColor: 'rgba(255,90,0,0.42)',
  },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  kind: { color: ORANGE, fontFamily: pluggdFonts.satoshiBold, fontSize: 10, letterSpacing: 1.2, flexShrink: 1 },
  featuredChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 999,
    backgroundColor: ORANGE,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  featuredText: { color: '#0E0E12', fontFamily: pluggdFonts.satoshiBold, fontSize: 9.5 },
  title: { color: '#FFFFFF', fontFamily: pluggdFonts.displayBold, fontSize: 17.5, lineHeight: 22, letterSpacing: -0.3 },
  desc: { color: '#B9B9C7', fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 19 },
  skills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  skillChip: {
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.16)',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  skillText: { color: '#E4E4E9', fontFamily: pluggdFonts.satoshiMedium, fontSize: 11 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { color: '#B9B9C7', fontFamily: pluggdFonts.satoshiMedium, fontSize: 12 },
  actions: { flexDirection: 'row', gap: 9, marginTop: 3 },
  pressed: { opacity: 0.9 },
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  primaryText: { color: '#0E0E12', fontFamily: pluggdFonts.satoshiBold, fontSize: 12.5 },
  secondary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  secondaryText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBold, fontSize: 12.5 },
  center: { minHeight: 180, alignItems: 'center', justifyContent: 'center' },
  empty: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: '#101018',
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBold, fontSize: 15 },
  emptyBody: { color: '#8E8E9F', fontFamily: pluggdFonts.satoshiMedium, fontSize: 12.5, lineHeight: 18, textAlign: 'center' },
});
