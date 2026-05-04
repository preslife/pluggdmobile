import { MaterialIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BrandLogo } from '../components/BrandLogo';
import { useCredits, type CreditPack } from '../src/hooks/useCredits';
import { creditsToGBP, useWallet, type WalletLedgerEntry } from '../src/hooks/useWallet';

const PLUGGD_ORANGE = '#FF5200';

const PACK_ICONS: Record<string, keyof typeof MaterialIcons.glyphMap> = {
  Starter: 'rocket-launch',
  Plus: 'star-border',
  Value: 'diamond',
  Premium: 'workspace-premium',
  Ultimate: 'emoji-events',
};

const LEDGER_LABELS: Record<string, string> = {
  topup: 'Top Up',
  topup_iap: 'Credit Purchase',
  spend_tip: 'Artist Tip',
  spend_purchase: 'Purchase',
  spend_unlock: 'Release Unlock',
  spend_battle: 'Battle Entry',
  award_prize: 'Prize Won',
  convert_cashout: 'Cash Out',
  convert_sub_applied: 'Subscription Applied',
  spend_gift: 'Gift Sent',
  earn_gift: 'Gift Received',
};

function PluggdWordmark() {
  return <BrandLogo variant="dark" width={112} height={34} />;
}

function formatPriceLabel(price: string) {
  return price.replace(/\.00$/, '');
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildPackSubtext(pack: CreditPack) {
  if (pack.bonusCredits <= 0) return undefined;
  return `Includes ${pack.bonusCredits.toLocaleString()} bonus`;
}

function LedgerRow({ entry }: { entry: WalletLedgerEntry }) {
  const isCredit = entry.amount_credits > 0;

  return (
    <View style={styles.ledgerRow}>
      <View style={styles.ledgerIcon}>
        <MaterialIcons
          name={isCredit ? 'add' : 'remove'}
          size={18}
          color={isCredit ? '#41D17D' : '#FF6B6B'}
        />
      </View>
      <View style={styles.ledgerTextWrap}>
        <Text style={styles.ledgerTitle}>{LEDGER_LABELS[entry.kind] ?? entry.kind}</Text>
        <Text style={styles.ledgerDate}>{formatDate(entry.created_at)}</Text>
      </View>
      <Text style={[styles.ledgerAmount, isCredit ? styles.ledgerCredit : styles.ledgerDebit]}>
        {isCredit ? '+' : ''}
        {entry.amount_credits.toLocaleString()}
      </Text>
    </View>
  );
}

export default function WalletScreen() {
  const { balance, ledger, loading, refreshBalance, refreshLedger } = useWallet();
  const {
    packs,
    purchasing,
    restoring,
    error: iapError,
    purchaseCredits,
    restorePurchases,
  } = useCredits();
  const [selectedSku, setSelectedSku] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showActivity, setShowActivity] = useState(false);

  const selectedPack = useMemo(
    () =>
      packs.find((pack) => pack.sku === selectedSku) ??
      packs.find((pack) => pack.popular) ??
      packs[0],
    [packs, selectedSku],
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshBalance(), refreshLedger()]);
    setRefreshing(false);
  }, [refreshBalance, refreshLedger]);

  const handlePurchase = () => {
    if (!selectedPack) return;

    Alert.alert(
      'Buy credits',
      `Purchase ${selectedPack.credits.toLocaleString()} credits for ${formatPriceLabel(selectedPack.localizedPrice)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Buy',
          onPress: () => purchaseCredits(selectedPack.sku),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PLUGGD_ORANGE} />
        }
      >
        <View style={styles.topBar}>
          <PluggdWordmark />

          <Pressable
            style={styles.infoButton}
            onPress={() =>
              Alert.alert(
                'Pluggd credits',
                'Credits can be used for eligible in-app purchases, tips, boosts, and platform features.',
              )
            }
          >
            <MaterialIcons name="info-outline" size={22} color="#FFFFFF" />
          </Pressable>
        </View>

        <Text style={styles.pageTitle}>Wallet</Text>

        <View style={styles.balanceCard}>
          <View style={styles.balanceIconBox}>
            <MaterialIcons name="account-balance-wallet" size={30} color={PLUGGD_ORANGE} />
          </View>

          <View style={styles.balanceContent}>
            <Text style={styles.balanceAmount}>
              {balance.available_credits.toLocaleString()} credits
            </Text>
            <Text style={styles.balanceLabel}>Available balance</Text>

            <Pressable
              style={styles.activityLink}
              onPress={() => setShowActivity((current) => !current)}
            >
              <Text style={styles.activityLinkText}>
                {showActivity ? 'Hide activity' : 'View activity'}
              </Text>
              <MaterialIcons name="chevron-right" size={19} color={PLUGGD_ORANGE} />
            </Pressable>
          </View>

          <View style={styles.balanceGraphic}>
            <View style={styles.graphBarSmall} />
            <View style={styles.graphBarMedium} />
            <View style={styles.graphBarTall} />
          </View>
        </View>

        {balance.pending_credits > 0 && (
          <View style={styles.pendingCard}>
            <Text style={styles.pendingText}>
              {balance.pending_credits.toLocaleString()} credits pending
            </Text>
          </View>
        )}

        {iapError ? (
          <View style={styles.errorCard}>
            <MaterialIcons name="error-outline" size={20} color="#FF6B6B" />
            <Text style={styles.errorText}>{iapError}</Text>
          </View>
        ) : null}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Buy credits</Text>
          <Text style={styles.balanceValue}>
            ~£{creditsToGBP(balance.available_credits).toFixed(2)}
          </Text>
        </View>

        <View style={styles.packList}>
          {packs.map((pack) => {
            const selected = selectedPack?.sku === pack.sku;
            const subtext = buildPackSubtext(pack);
            const icon = PACK_ICONS[pack.label] ?? 'paid';

            return (
              <Pressable
                key={pack.sku}
                onPress={() => setSelectedSku(pack.sku)}
                style={[styles.packCard, selected && styles.packCardSelected]}
              >
                <View style={styles.packIconBox}>
                  <MaterialIcons
                    name={icon}
                    size={24}
                    color={selected ? PLUGGD_ORANGE : '#D8D8D8'}
                  />
                </View>

                <View style={styles.packTextWrap}>
                  <View style={styles.packTitleRow}>
                    <Text style={[styles.packName, selected && styles.packNameSelected]}>
                      {pack.label}
                    </Text>

                    {pack.popular ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>Popular</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.packCredits}>
                    {pack.credits.toLocaleString()} credits
                  </Text>

                  {subtext ? <Text style={styles.packSubtext}>{subtext}</Text> : null}
                </View>

                <View style={styles.packRight}>
                  <Text style={styles.packPrice}>{formatPriceLabel(pack.localizedPrice)}</Text>

                  <View style={[styles.selectCircle, selected && styles.selectCircleActive]}>
                    {selected ? <MaterialIcons name="check" size={16} color="#080808" /> : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={[styles.cta, (!selectedPack || purchasing) && styles.ctaDisabled]}
          onPress={handlePurchase}
          disabled={!selectedPack || purchasing}
        >
          {purchasing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaText}>Buy credits</Text>
          )}
        </Pressable>

        <Pressable onPress={restorePurchases} disabled={restoring} style={styles.restoreButton}>
          <Text style={styles.restoreText}>
            {restoring ? 'Restoring...' : 'Restore Purchases'}
          </Text>
        </Pressable>

        <View style={styles.noteCard}>
          <MaterialIcons name="info-outline" size={20} color={PLUGGD_ORANGE} />
          <Text style={styles.noteText}>
            Credits can be used for eligible in-app purchases, tips, boosts, and platform features.
          </Text>
        </View>

        {showActivity && (
          <View style={styles.activityCard}>
            <Text style={styles.activityTitle}>Recent activity</Text>
            {loading ? (
              <ActivityIndicator color={PLUGGD_ORANGE} style={styles.activityLoader} />
            ) : ledger.length === 0 ? (
              <Text style={styles.emptyText}>No transactions yet</Text>
            ) : (
              ledger.slice(0, 8).map((entry) => <LedgerRow key={entry.id} entry={entry} />)
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 100,
    paddingBottom: 128,
  },
  topBar: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '900',
    letterSpacing: 1,
  },
  logoAccent: {
    color: PLUGGD_ORANGE,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '900',
    marginTop: 6,
    marginBottom: 14,
  },
  balanceCard: {
    minHeight: 124,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 12,
  },
  balanceIconBox: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#21130E',
    borderWidth: 1,
    borderColor: '#3B261A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  balanceContent: {
    flex: 1,
    minWidth: 0,
  },
  balanceAmount: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '900',
  },
  balanceLabel: {
    color: '#A8A8A8',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  activityLink: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 11,
  },
  activityLinkText: {
    color: PLUGGD_ORANGE,
    fontSize: 15,
    fontWeight: '900',
  },
  balanceGraphic: {
    width: 50,
    height: 78,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 5,
    opacity: 0.95,
  },
  graphBarSmall: {
    width: 8,
    height: 24,
    borderRadius: 8,
    backgroundColor: '#FF8A3D',
  },
  graphBarMedium: {
    width: 8,
    height: 46,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
  },
  graphBarTall: {
    width: 8,
    height: 66,
    borderRadius: 8,
    backgroundColor: '#FFB089',
  },
  pendingCard: {
    backgroundColor: '#21130E',
    borderWidth: 1,
    borderColor: '#3B261A',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  pendingText: {
    color: '#FFB089',
    fontSize: 13,
    fontWeight: '800',
  },
  errorCard: {
    backgroundColor: '#2A1111',
    borderWidth: 1,
    borderColor: '#5A2424',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    color: '#FFB4B4',
    flex: 1,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
  },
  balanceValue: {
    color: '#8F8F8F',
    fontSize: 13,
    fontWeight: '800',
  },
  packList: {
    gap: 9,
  },
  packCard: {
    minHeight: 74,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  packCardSelected: {
    borderColor: PLUGGD_ORANGE,
    backgroundColor: '#1A120E',
  },
  packIconBox: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  packTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  packTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  packName: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  packNameSelected: {
    color: PLUGGD_ORANGE,
  },
  badge: {
    backgroundColor: '#3A1D0E',
    borderWidth: 1,
    borderColor: PLUGGD_ORANGE,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeText: {
    color: PLUGGD_ORANGE,
    fontSize: 11,
    fontWeight: '900',
  },
  packCredits: {
    color: '#D7D7D7',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  packSubtext: {
    color: '#9F9F9F',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  packRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
    gap: 8,
  },
  packPrice: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
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
  cta: {
    height: 54,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  ctaDisabled: {
    opacity: 0.7,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  restoreButton: {
    paddingVertical: 12,
  },
  restoreText: {
    color: '#8F8F8F',
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
  noteCard: {
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  noteText: {
    flex: 1,
    color: '#AFAFAF',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  activityCard: {
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    padding: 14,
    marginTop: 16,
  },
  activityTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 8,
  },
  activityLoader: {
    paddingVertical: 18,
  },
  emptyText: {
    color: '#8F8F8F',
    textAlign: 'center',
    paddingVertical: 18,
    fontSize: 13,
    fontWeight: '700',
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#242424',
    paddingVertical: 12,
  },
  ledgerIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#202020',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  ledgerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  ledgerTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  ledgerDate: {
    color: '#8F8F8F',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  ledgerAmount: {
    fontSize: 14,
    fontWeight: '900',
  },
  ledgerCredit: {
    color: '#41D17D',
  },
  ledgerDebit: {
    color: '#FF6B6B',
  },
});
