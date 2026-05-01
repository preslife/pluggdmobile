/**
 * Creator Membership Manager — Creator-facing screen.
 *
 * Route: /creator/memberships
 *
 * Lets a creator view their membership tiers, see subscriber counts,
 * and manage tier status. Tier creation/editing flows from here.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthProvider';
import { SymbolIcon } from '../../components/SymbolIcon';

const TIER_COLORS: Record<string, string> = {
  Bronze: '#CD7F32',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
  Platinum: '#E5E4E2',
  Diamond: '#B9F2FF',
};

const TIER_ICONS: Record<string, string> = {
  Bronze: 'military_tech',
  Silver: 'workspace_premium',
  Gold: 'emoji_events',
  Platinum: 'diamond',
  Diamond: 'auto_awesome',
};

interface CreatorTier {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tier_order: number;
  price_monthly: number | null;
  price_yearly: number | null;
  features: string[];
  color: string | null;
  status: string;
  current_members: number;
  max_members: number | null;
}

interface SubscriberSummary {
  total: number;
  active: number;
  revenue_cents: number;
}

export default function CreatorMembershipsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [tiers, setTiers] = useState<CreatorTier[]>([]);
  const [summary, setSummary] = useState<SubscriberSummary>({
    total: 0,
    active: 0,
    revenue_cents: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = useCallback(async () => {
    if (!user) return;

    try {
      // Fetch creator's tiers (all statuses so they can manage drafts too)
      const { data: tiersData } = await supabase
        .from('membership_tiers' as any)
        .select(
          'id, name, slug, description, tier_order, price_monthly, price_yearly, features, color, status, current_members, max_members'
        )
        .eq('owner_type', 'profile')
        .eq('owner_id', user.id)
        .order('tier_order', { ascending: true });

      const parsed: CreatorTier[] = (tiersData ?? []).map((t: any) => ({
        ...t,
        features: Array.isArray(t.features) ? t.features : [],
      }));
      setTiers(parsed);

      // Fetch subscriber summary
      const { data: subData, error: subErr } = await supabase
        .from('fan_subscriptions' as any)
        .select('id, status, price_cents')
        .eq('creator_id', user.id);

      if (!subErr && subData) {
        const subs = subData as any[];
        const active = subs.filter((s) => s.status === 'active').length;
        const revenueCents = subs
          .filter((s) => s.status === 'active')
          .reduce((sum: number, s: any) => sum + (s.price_cents ?? 0), 0);
        setSummary({
          total: subs.length,
          active,
          revenue_cents: revenueCents,
        });
      }
    } catch (err) {
      console.error('[CreatorMemberships] load error:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const toggleTierStatus = async (tier: CreatorTier) => {
    const newStatus = tier.status === 'active' ? 'draft' : 'active';
    const label = newStatus === 'active' ? 'Publish' : 'Unpublish';

    Alert.alert(`${label} "${tier.name}"?`, undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: label,
        onPress: async () => {
          const { error } = await supabase
            .from('membership_tiers' as any)
            .update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq('id', tier.id);

          if (error) {
            Alert.alert('Error', error.message);
          } else {
            await loadData();
          }
        },
      },
    ]);
  };

  if (!user) {
    return (
      <View className="flex-1 bg-background-dark items-center justify-center">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="text-zinc-500">Sign in to manage memberships.</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="pt-14 pb-4 px-4 flex-row items-center justify-between border-b border-white/5">
        <TouchableOpacity
          onPress={() => router.back()}
          className="size-10 items-center justify-center rounded-full bg-white/5"
        >
          <SymbolIcon name="arrow_back" className="text-white text-xl" />
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">Memberships</Text>
        <View className="size-10" />
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF5200"
          />
        }
      >
        {loading ? (
          <View className="items-center py-20">
            <ActivityIndicator size="large" color="#FF5200" />
          </View>
        ) : (
          <>
            {/* ── Stats Overview ── */}
            <View className="px-4 pt-6 flex-row gap-3">
              <StatCard
                icon="group"
                label="Subscribers"
                value={String(summary.active)}
                accent="#FF5200"
              />
              <StatCard
                icon="trending_up"
                label="Total ever"
                value={String(summary.total)}
                accent="#22c55e"
              />
              <StatCard
                icon="payments"
                label="MRR"
                value={`£${(summary.revenue_cents / 100).toFixed(0)}`}
                accent="#FFD700"
              />
            </View>

            {/* ── Tiers List ── */}
            <View className="px-4 mt-8">
              <View className="flex-row items-center justify-between mb-4">
                <Text className="text-white text-lg font-bold">Your Tiers</Text>
                <Text className="text-zinc-500 text-sm">
                  {tiers.length} tier{tiers.length !== 1 ? 's' : ''}
                </Text>
              </View>

              {tiers.length === 0 ? (
                <View className="items-center py-12 bg-zinc-900/50 rounded-2xl border border-white/5">
                  <SymbolIcon name="loyalty" className="text-zinc-600 text-5xl mb-3" />
                  <Text className="text-white font-bold text-base mb-1">
                    No tiers set up
                  </Text>
                  <Text className="text-zinc-500 text-sm text-center px-8 mb-4">
                    Create membership tiers so fans can subscribe and support you
                    with exclusive content.
                  </Text>
                  <Text className="text-zinc-600 text-xs text-center px-8">
                    Tier management is available on the web dashboard. Tiers you
                    create there will appear here automatically.
                  </Text>
                </View>
              ) : (
                <View className="gap-3">
                  {tiers.map((tier) => {
                    const accentColor =
                      TIER_COLORS[tier.name] ?? tier.color ?? '#FF5200';
                    const icon = TIER_ICONS[tier.name] ?? 'star';
                    const isDraft = tier.status !== 'active';

                    return (
                      <View
                        key={tier.id}
                        className={`rounded-2xl overflow-hidden border ${
                          isDraft ? 'border-yellow-500/20' : 'border-white/10'
                        } bg-zinc-900/80`}
                      >
                        <View className="p-4 flex-row items-center gap-3">
                          {/* Icon */}
                          <View
                            className="size-12 rounded-full items-center justify-center"
                            style={{
                              backgroundColor: `${accentColor}20`,
                              opacity: isDraft ? 0.5 : 1,
                            }}
                          >
                            <SymbolIcon name={icon} className="text-2xl"
                              style={{ color: accentColor }} />
                          </View>

                          {/* Info */}
                          <View className="flex-1">
                            <View className="flex-row items-center gap-2">
                              <Text
                                className="text-white font-bold text-base"
                                style={{ opacity: isDraft ? 0.5 : 1 }}
                              >
                                {tier.name}
                              </Text>
                              {isDraft && (
                                <View className="px-2 py-0.5 rounded-full bg-yellow-500/20">
                                  <Text className="text-yellow-500 text-[10px] font-bold uppercase">
                                    Draft
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text className="text-zinc-500 text-sm">
                              {tier.current_members} member
                              {tier.current_members !== 1 ? 's' : ''}
                              {tier.price_monthly
                                ? ` · £${(tier.price_monthly / 100).toFixed(2)}/mo`
                                : ''}
                            </Text>
                          </View>

                          {/* Actions */}
                          <TouchableOpacity
                            onPress={() => toggleTierStatus(tier)}
                            className="px-3 py-1.5 rounded-full border border-white/10"
                          >
                            <Text className="text-zinc-400 text-xs font-medium">
                              {isDraft ? 'Publish' : 'Unpublish'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Features preview */}
                        {tier.features.length > 0 && (
                          <View className="px-4 pb-3 -mt-1">
                            <Text
                              className="text-zinc-600 text-xs"
                              numberOfLines={1}
                            >
                              {tier.features.slice(0, 3).join(' · ')}
                              {tier.features.length > 3
                                ? ` +${tier.features.length - 3} more`
                                : ''}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* ── Info note ── */}
            <View className="px-4 mt-8 items-center">
              <View className="flex-row items-start gap-2 bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                <SymbolIcon name="info" className="text-primary text-lg mt-0.5" />
                <Text className="text-zinc-500 text-xs flex-1 leading-relaxed">
                  To create new tiers, set prices, and customise perks, use the Pluggd
                  web dashboard. Tiers sync automatically with the mobile app and are
                  mapped to Apple IAP subscription products.
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Stat Card ───────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: string;
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <View className="flex-1 bg-zinc-900/80 rounded-2xl p-4 border border-white/5">
      <View
        className="size-10 rounded-full items-center justify-center mb-3"
        style={{ backgroundColor: `${accent}15` }}
      >
        <SymbolIcon name={icon} className="text-lg" style={{ color: accent }} />
      </View>
      <Text className="text-white font-bold text-xl">{value}</Text>
      <Text className="text-zinc-500 text-xs mt-0.5">{label}</Text>
    </View>
  );
}
