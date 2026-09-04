import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PluggdImage } from '../../src/components/PluggdImage';
import { openHostedCheckout } from '../../src/commerce/policy';
import { impactHaptic } from '../../src/design/haptics';
import { pluggdFonts } from '../../src/design/typography';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import {
  physicalBasketCount,
  physicalBasketSubtotal,
  reconcilePhysicalBasketOrder,
  usePhysicalBasketStore,
} from '../../src/features/store/physicalBasket';
import { supabase } from '../../src/lib/supabase';

const ORANGE = '#FF6600';

function formatMoney(value: number) {
  return new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(value);
}

export default function PhysicalBasketRoute() {
  const styles = useBasketStyles();
  const theme = usePluggdTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ status?: string }>();
  const lines = usePhysicalBasketStore((state) => state.lines);
  const setQuantity = usePhysicalBasketStore((state) => state.setQuantity);
  const removeLine = usePhysicalBasketStore((state) => state.removeLine);
  const clear = usePhysicalBasketStore((state) => state.clear);
  const [checkingOut, setCheckingOut] = useState(false);
  const requestIdRef = useRef<string | null>(null);
  const count = useMemo(() => physicalBasketCount(lines), [lines]);
  const subtotal = useMemo(() => physicalBasketSubtotal(lines), [lines]);

  const checkout = async () => {
    if (!lines.length || checkingOut) return;
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      router.push(`/auth?redirect=${encodeURIComponent('/commerce/basket')}` as any);
      return;
    }

    impactHaptic();
    setCheckingOut(true);
    try {
      requestIdRef.current ||= `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const { data, error } = await supabase.functions.invoke('enhanced-store-checkout', {
        body: {
          clientContext: 'ios_physical_basket',
          requestId: requestIdRef.current,
          cartItems: lines.map((line) => ({
            id: line.key,
            productId: line.productId,
            quantity: line.quantity,
            selectedOptions: line.selectedOptions,
          })),
        },
      });
      if (error) throw error;
      const response = (data ?? {}) as Record<string, unknown>;
      const checkoutUrl = typeof response.url === 'string' ? response.url : '';
      const sessionId = typeof (response.sessionId ?? response.session_id) === 'string'
        ? String(response.sessionId ?? response.session_id)
        : '';
      const initialOrderId = typeof (response.orderId ?? response.order_id) === 'string'
        ? String(response.orderId ?? response.order_id)
        : '';
      const result = await openHostedCheckout(checkoutUrl, {
        returnUrl: 'pluggd://commerce/success',
        reconcile: sessionId
          ? async () => (await reconcilePhysicalBasketOrder(sessionId)).state
          : undefined,
      });
      if (result.state === 'cancelled' && sessionId) {
        await supabase.functions.invoke('enhanced-store-checkout', {
          body: { clientContext: 'ios_physical_basket_cancel', sessionId },
        });
      }
      if (result.state === 'success') clear();
      requestIdRef.current = null;
      router.replace({
        pathname: '/commerce/success',
        params: {
          kind: 'store_order',
          status: result.state,
          sessionId,
          orderId: initialOrderId,
        },
      } as any);
    } catch (error) {
      requestIdRef.current = null;
      console.warn('[physical-basket] checkout unavailable', error);
      Alert.alert('Checkout temporarily unavailable', 'Your basket is still here and you have not been charged. Please try again in a moment.');
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.headerButton} onPress={() => (router.canGoBack() ? router.back() : router.replace('/market' as any))}>
          <MaterialIcons name="arrow-back" size={21} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>PHYSICAL GOODS</Text>
          <Text accessibilityRole="header" style={styles.headerTitle}>Your basket</Text>
        </View>
        <View style={styles.countBadge}><Text style={styles.countText}>{count}</Text></View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {params.status === 'cancelled' ? (
          <View style={styles.notice}>
            <MaterialIcons name="info-outline" size={20} color={theme.colors.accentText} />
            <Text style={styles.noticeText}>Checkout was cancelled. Your basket is still here.</Text>
          </View>
        ) : null}

        {!lines.length ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}><MaterialIcons name="shopping-bag" size={30} color={theme.colors.accentText} /></View>
            <Text style={styles.emptyEyebrow}>YOUR STORE EDIT</Text>
            <Text style={styles.emptyTitle}>Nothing in the basket yet.</Text>
            <Text style={styles.emptyBody}>Add approved physical PLUGGD goods, then check out together in one secure order.</Text>
            <Pressable accessibilityRole="button" style={styles.primary} onPress={() => router.replace('/market' as any)}>
              <Text style={styles.primaryText}>Browse the Store</Text>
              <MaterialIcons name="arrow-forward" size={19} color={theme.colors.onAccent} />
            </Pressable>
          </View>
        ) : (
          <>
            <Text style={styles.intro}>{count} physical item{count === 1 ? '' : 's'} selected. Final shipping charges and the verified live total appear before payment.</Text>
            <View style={styles.lines}>
              {lines.map((line) => {
                const maximum = Math.max(1, Math.min(4, line.stockQuantity ?? 4));
                const options = Object.entries(line.selectedOptions);
                return (
                  <View key={line.key} style={styles.line}>
                    <View style={styles.artWrap}>
                      {line.imageUrl ? <PluggdImage uri={line.imageUrl} style={styles.art} /> : <MaterialIcons name="inventory-2" size={25} color={theme.colors.textSubtle} />}
                    </View>
                    <View style={styles.lineCopy}>
                      <Text style={styles.lineType}>{line.productType.replace(/_/g, ' ').toUpperCase()}</Text>
                      <Text style={styles.lineTitle} numberOfLines={2}>{line.title}</Text>
                      {options.length ? <Text style={styles.lineOptions}>{options.map(([key, value]) => `${key}: ${value}`).join(' · ')}</Text> : null}
                      <Text style={styles.linePrice}>{formatMoney(line.unitPrice)} each</Text>
                      <View style={styles.lineActions}>
                        <View style={styles.quantity}>
                          <Pressable accessibilityRole="button" accessibilityLabel={`Decrease ${line.title} quantity`} accessibilityState={{ disabled: line.quantity <= 1 }} disabled={line.quantity <= 1} style={styles.quantityButton} onPress={() => setQuantity(line.key, line.quantity - 1)}>
                            <MaterialIcons name="remove" size={18} color={theme.colors.text} />
                          </Pressable>
                          <Text accessibilityLabel={`Quantity ${line.quantity}`} style={styles.quantityText}>{line.quantity}</Text>
                          <Pressable accessibilityRole="button" accessibilityLabel={`Increase ${line.title} quantity`} accessibilityState={{ disabled: line.quantity >= maximum }} disabled={line.quantity >= maximum} style={styles.quantityButton} onPress={() => setQuantity(line.key, line.quantity + 1)}>
                            <MaterialIcons name="add" size={18} color={theme.colors.text} />
                          </Pressable>
                        </View>
                        <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${line.title}`} style={styles.remove} onPress={() => removeLine(line.key)}>
                          <MaterialIcons name="delete-outline" size={19} color={theme.colors.textMuted} />
                          <Text style={styles.removeText}>Remove</Text>
                        </Pressable>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            <View style={styles.summary}>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>ITEMS</Text><Text style={styles.summaryValue}>{count}</Text></View>
              <View style={styles.summaryRow}><Text style={styles.summaryLabel}>ESTIMATED SUBTOTAL</Text><Text style={styles.summaryTotal}>{formatMoney(subtotal)}</Text></View>
              <Text style={styles.summaryNote}>This local estimate is never sent as a price. The server recalculates every product, option and stock level.</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Continue to secure physical goods checkout" accessibilityState={{ busy: checkingOut }} disabled={checkingOut} style={[styles.primary, checkingOut && styles.disabled]} onPress={checkout}>
              {checkingOut ? <ActivityIndicator color={theme.colors.onAccent} /> : <>
                <Text style={styles.primaryText}>Continue securely</Text>
                <MaterialIcons name="arrow-forward" size={19} color={theme.colors.onAccent} />
              </>}
            </Pressable>
            <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => router.push('/market' as any)}>
              <Text style={styles.secondaryText}>Keep shopping</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function useBasketStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { minHeight: 82, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  headerButton: { width: 44, height: 44, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 },
  headerEyebrow: { color: theme.colors.accentText, fontSize: 9, letterSpacing: 1.4, fontFamily: pluggdFonts.satoshiBlack },
  headerTitle: { color: theme.colors.text, fontSize: 23, lineHeight: 28, fontFamily: pluggdFonts.displayExtraBold, marginTop: 2 },
  countBadge: { minWidth: 44, height: 44, paddingHorizontal: 8, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  countText: { color: theme.colors.onAccent, fontSize: 14, fontFamily: pluggdFonts.satoshiBlack },
  content: { padding: 20, paddingBottom: 80 },
  notice: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft, paddingHorizontal: 14, marginBottom: 18 },
  noticeText: { flex: 1, color: theme.colors.textSecondary, fontSize: 12, lineHeight: 17, fontFamily: pluggdFonts.satoshiBold },
  intro: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19, fontFamily: pluggdFonts.satoshiMedium, marginBottom: 8 },
  lines: { borderTopWidth: 1, borderTopColor: theme.colors.divider },
  line: { minHeight: 158, flexDirection: 'row', gap: 14, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  artWrap: { width: 92, height: 112, backgroundColor: theme.colors.artworkBase, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  art: { width: '100%', height: '100%' },
  lineCopy: { flex: 1, minWidth: 0 },
  lineType: { color: theme.colors.accentText, fontSize: 8.5, letterSpacing: 1.25, fontFamily: pluggdFonts.satoshiBlack },
  lineTitle: { color: theme.colors.text, fontSize: 17, lineHeight: 21, fontFamily: pluggdFonts.displayBold, marginTop: 4 },
  lineOptions: { color: theme.colors.textMuted, fontSize: 10.5, lineHeight: 15, fontFamily: pluggdFonts.satoshiMedium, marginTop: 4, textTransform: 'capitalize' },
  linePrice: { color: theme.colors.text, fontSize: 12, fontFamily: pluggdFonts.satoshiBold, marginTop: 5 },
  lineActions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 10 },
  quantity: { flexDirection: 'row', alignItems: 'center' },
  quantityButton: { width: 44, height: 44, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  quantityText: { width: 34, color: theme.colors.text, textAlign: 'center', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack },
  remove: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 4 },
  removeText: { color: theme.colors.textMuted, fontSize: 11, fontFamily: pluggdFonts.satoshiBold },
  summary: { marginTop: 24, borderTopWidth: 3, borderTopColor: theme.colors.accentFill, borderBottomWidth: 1, borderBottomColor: theme.colors.divider, paddingVertical: 15, gap: 12 },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  summaryLabel: { color: theme.colors.textSubtle, fontSize: 9, letterSpacing: 1.25, fontFamily: pluggdFonts.satoshiBlack },
  summaryValue: { color: theme.colors.text, fontSize: 14, fontFamily: pluggdFonts.satoshiBlack },
  summaryTotal: { color: theme.colors.text, fontSize: 22, fontFamily: pluggdFonts.displayExtraBold },
  summaryNote: { color: theme.colors.textMuted, fontSize: 10, lineHeight: 15, fontFamily: pluggdFonts.satoshiMedium },
  primary: { minHeight: 56, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 20, paddingHorizontal: 18 },
  primaryText: { color: theme.colors.onAccent, fontSize: 14, fontFamily: pluggdFonts.satoshiBlack },
  secondary: { minHeight: 50, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryText: { color: theme.colors.text, fontSize: 13, fontFamily: pluggdFonts.satoshiBlack },
  disabled: { opacity: 0.62 },
  empty: { minHeight: 520, justifyContent: 'center', alignItems: 'flex-start' },
  emptyIcon: { width: 54, height: 54, borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyEyebrow: { color: theme.colors.accentText, fontSize: 9, letterSpacing: 1.5, fontFamily: pluggdFonts.satoshiBlack },
  emptyTitle: { color: theme.colors.text, fontSize: 31, lineHeight: 36, fontFamily: pluggdFonts.displayExtraBold, marginTop: 7 },
  emptyBody: { color: theme.colors.textMuted, fontSize: 14, lineHeight: 21, fontFamily: pluggdFonts.satoshiMedium, marginTop: 9, maxWidth: 330 },
  }), [theme]);
}
