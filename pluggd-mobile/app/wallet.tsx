import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { usePluggdTheme } from '../src/design/usePluggdTheme';
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
  const theme = usePluggdTheme();
  const isCredit = entry.amount_credits > 0;

  return (
    <View style={[styles.ledgerRow, { borderTopColor: theme.colors.borderSubtle }]}>
      <View style={[styles.ledgerIcon, { backgroundColor: theme.colors.surfaceAlt }]}>
        <MaterialIcons
          name={isCredit ? 'add' : 'remove'}
          size={18}
          color={isCredit ? '#41D17D' : '#FF6B6B'}
        />
      </View>
      <View style={styles.ledgerTextWrap}>
        <Text style={[styles.ledgerTitle, { color: theme.colors.text }]}>
          {LEDGER_LABELS[entry.kind] ?? entry.kind}
        </Text>
        <Text style={[styles.ledgerDate, { color: theme.colors.textSubtle }]}>
          {formatDate(entry.created_at)}
        </Text>
      </View>
      <Text style={[styles.ledgerAmount, isCredit ? styles.ledgerCredit : styles.ledgerDebit]}>
        {isCredit ? '+' : ''}
        {entry.amount_credits.toLocaleString()}
      </Text>
    </View>
  );
}

export default function WalletScreen() {
  const theme = usePluggdTheme();
  const isDark = theme.scheme === 'dark';
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
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <LinearGradient
        colors={isDark ? ['#080808', '#0C0C0C', '#080808'] : ['#FAFAF8', '#FFFFFF', '#F4F2EE']}
        style={StyleSheet.absoluteFill}
      />
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PLUGGD_ORANGE} />
        }
      >
        <View style={styles.pageHeader}>
          <Text style={[styles.pageTitle, { color: theme.colors.text }]}>Wallet</Text>
          <Pressable
            style={[
              styles.infoButton,
              { backgroundColor: theme.colors.glassFallback, borderColor: theme.colors.border },
            ]}
            onPress={() =>
              Alert.alert(
                'Pluggd credits',
                'Credits can be used for eligible in-app purchases, tips, boosts, and platform features.',
              )
            }
          >
            <MaterialIcons name="info-outline" size={22} color={theme.colors.text} />
          </Pressable>
        </View>

        <View
          style={[
            styles.balanceCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
            },
          ]}
        >
          <View
            style={[
              styles.balanceIconBox,
              { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.borderAccent },
            ]}
          >
            <MaterialIcons name="account-balance-wallet" size={30} color={theme.colors.accent} />
          </View>

          <View style={styles.balanceContent}>
            <Text style={[styles.balanceAmount, { color: theme.colors.text }]}>
              {balance.available_credits.toLocaleString()} credits
            </Text>
            <Text style={[styles.balanceLabel, { color: theme.colors.textMuted }]}>
              Available balance
            </Text>

            <Pressable
              style={styles.activityLink}
              onPress={() => setShowActivity((current) => !current)}
            >
              <Text style={styles.activityLinkText}>
                {showActivity ? 'Hide activity' : 'View activity'}
              </Text>
              <MaterialIcons name="chevron-right" size={19} color={theme.colors.accent} />
            </Pressable>
          </View>

          <View style={styles.balanceGraphic}>
            <View style={styles.graphBarSmall} />
            <View style={styles.graphBarMedium} />
            <View style={styles.graphBarTall} />
          </View>
        </View>

        {balance.pending_credits > 0 && (
          <View
            style={[
              styles.pendingCard,
              { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.borderAccent },
            ]}
          >
            <Text style={[styles.pendingText, { color: theme.colors.accent }]}>
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
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Buy credits</Text>
          <Text style={[styles.balanceValue, { color: theme.colors.textSubtle }]}>
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
                style={[
                  styles.packCard,
                  {
                    backgroundColor: selected ? theme.colors.surfaceStrong : theme.colors.surface,
                    borderColor: selected ? theme.colors.accent : theme.colors.border,
                    shadowColor: theme.colors.shadow,
                  },
                ]}
              >
                <View style={[styles.packIconBox, { backgroundColor: theme.colors.surfaceAlt }]}>
                  <MaterialIcons
                    name={icon}
                    size={24}
                    color={selected ? theme.colors.accent : theme.colors.textMuted}
                  />
                </View>

                <View style={styles.packTextWrap}>
                  <View style={styles.packTitleRow}>
                    <Text
                      style={[
                        styles.packName,
                        { color: selected ? theme.colors.accent : theme.colors.text },
                      ]}
                    >
                      {pack.label}
                    </Text>

                    {pack.popular ? (
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>Popular</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={[styles.packCredits, { color: theme.colors.textMuted }]}>
                    {pack.credits.toLocaleString()} credits
                  </Text>

                  {subtext ? (
                    <Text style={[styles.packSubtext, { color: theme.colors.textMuted }]}>
                      {subtext}
                    </Text>
                  ) : null}
                </View>

                <View style={styles.packRight}>
                  <Text style={[styles.packPrice, { color: theme.colors.text }]}>
                    {formatPriceLabel(pack.localizedPrice)}
                  </Text>

                  <View
                    style={[
                      styles.selectCircle,
                      { borderColor: selected ? theme.colors.accent : theme.colors.textSubtle },
                      selected && styles.selectCircleActive,
                    ]}
                  >
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
          <Text style={[styles.restoreText, { color: theme.colors.textSubtle }]}>
            {restoring ? 'Restoring...' : 'Restore Purchases'}
          </Text>
        </Pressable>

        <View
          style={[
            styles.noteCard,
            { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border },
          ]}
        >
          <MaterialIcons name="info-outline" size={20} color={theme.colors.accent} />
          <Text style={[styles.noteText, { color: theme.colors.textMuted }]}>
            Credits can be used for eligible in-app purchases, tips, boosts, and platform features.
          </Text>
        </View>

        {showActivity && (
          <View
            style={[
              styles.activityCard,
              { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
            ]}
          >
            <Text style={[styles.activityTitle, { color: theme.colors.text }]}>Recent activity</Text>
            {loading ? (
              <ActivityIndicator color={theme.colors.accent} style={styles.activityLoader} />
            ) : ledger.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.colors.textSubtle }]}>No transactions yet</Text>
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
    paddingHorizontal: 16,
    paddingTop: 82,
    paddingBottom: 132,
  },
  pageHeader: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 34,
    fontWeight: '700',
    letterSpacing: 1,
  },
  logoAccent: {
    color: PLUGGD_ORANGE,
  },
  infoButton: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 30,
    fontWeight: '800',
  },
  balanceCard: {
    minHeight: 124,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 16,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 12,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 12 },
  },
  balanceIconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
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
    fontSize: 27,
    fontWeight: '800',
  },
  balanceLabel: {
    fontSize: 15,
    fontWeight: '600',
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
    fontWeight: '800',
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
    borderRadius: 13,
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
    borderRadius: 13,
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
    fontSize: 21,
    fontWeight: '800',
  },
  balanceValue: {
    color: '#8F8F8F',
    fontSize: 13,
    fontWeight: '700',
  },
  packList: {
    gap: 9,
  },
  packCard: {
    minHeight: 74,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 14,
    paddingHorizontal: 13,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 7 },
  },
  packCardSelected: {
    borderColor: PLUGGD_ORANGE,
    backgroundColor: '#1A120E',
  },
  packIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
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
    fontSize: 18,
    fontWeight: '800',
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
    fontWeight: '800',
  },
  packCredits: {
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  packSubtext: {
    color: '#9F9F9F',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  packRight: {
    alignItems: 'flex-end',
    marginLeft: 10,
    gap: 8,
  },
  packPrice: {
    fontSize: 22,
    fontWeight: '800',
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
    borderRadius: 16,
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
    fontWeight: '800',
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
    borderRadius: 14,
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
    borderRadius: 16,
    padding: 14,
    marginTop: 16,
  },
  activityTitle: {
    fontSize: 18,
    fontWeight: '800',
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
    borderRadius: 10,
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
    fontWeight: '800',
  },
  ledgerCredit: {
    color: '#41D17D',
  },
  ledgerDebit: {
    color: '#FF6B6B',
  },
});
