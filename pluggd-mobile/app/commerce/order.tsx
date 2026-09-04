import { MaterialIcons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PluggdImage } from '../../src/components/PluggdImage';
import { pluggdFonts } from '../../src/design/typography';
import { formatDate, formatGBP } from '../../src/lib/mobileContent';
import { supabase } from '../../src/lib/supabase';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

type CommerceOrder = {
  id: string;
  source: 'purchase' | 'contract' | 'release' | 'ticket' | 'merch' | 'store';
  kind: 'beat_license' | 'release_unlock' | 'event_ticket' | 'physical_merch' | 'store_order';
  itemId: string;
  title: string;
  creator: string;
  licenceType: string;
  status: string;
  amount: number | null;
  currency: string | null;
  createdAt: string | null;
  documentUrl: string | null;
  canDownload: boolean;
  productSource?: 'store_products' | 'creator_merchandise' | null;
  items?: StoreOrderItem[];
};

type StoreOrderItem = {
  id: string;
  productId: string;
  title: string;
  imageUrl: string | null;
  quantity: number;
  unitPrice: number;
  selectedOptions: Record<string, string>;
};

export default function CommerceOrderScreen() {
  const theme = usePluggdTheme();
  const styles = useOrderStyles();
  const router = useRouter();
  const { id, kind } = useLocalSearchParams<{ id?: string; kind?: string }>();
  const [order, setOrder] = useState<CommerceOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    if (!id || !['beat_license', 'release_unlock', 'event_ticket', 'physical_merch', 'store_order'].includes(kind || '')) {
      setOrder(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (kind === 'store_order') {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) {
        setOrder(null);
        setLoading(false);
        return;
      }
      const orderResult = await (supabase as any)
        .from('orders')
        .select('id,user_id,status,total_amount,created_at,paid_at,invoice_pdf_url')
        .eq('id', id)
        .eq('user_id', authData.user.id)
        .maybeSingle();
      if (!orderResult.data) {
        setOrder(null);
        setLoading(false);
        return;
      }
      const itemsResult = await (supabase as any)
        .from('order_items')
        .select('id,product_id,quantity,price,selected_options,store_products:product_id(id,title,image_url)')
        .eq('order_id', orderResult.data.id)
        .order('created_at', { ascending: true });
      if (itemsResult.error) {
        setOrder(null);
        setLoading(false);
        return;
      }
      const items: StoreOrderItem[] = (itemsResult.data ?? []).map((row: any) => {
        const product = Array.isArray(row.store_products) ? row.store_products[0] : row.store_products;
        return {
          id: row.id,
          productId: row.product_id,
          title: product?.title || 'PLUGGD Store item',
          imageUrl: product?.image_url || null,
          quantity: Number(row.quantity || 1),
          unitPrice: Number(row.price || 0),
          selectedOptions: row.selected_options && typeof row.selected_options === 'object' ? row.selected_options : {},
        };
      });
      const itemCount = items.reduce((total, item) => total + item.quantity, 0);
      setOrder({
        id: orderResult.data.id,
        source: 'store',
        kind: 'store_order',
        itemId: items[0]?.productId || '',
        title: `${itemCount} item${itemCount === 1 ? '' : 's'} from PLUGGD Store`,
        creator: 'Physical order',
        licenceType: `${items.length} product line${items.length === 1 ? '' : 's'}`,
        status: orderResult.data.status || 'pending',
        amount: Math.round(Number(orderResult.data.total_amount || 0) * 100),
        currency: 'GBP',
        createdAt: orderResult.data.paid_at || orderResult.data.created_at,
        documentUrl: orderResult.data.invoice_pdf_url || null,
        canDownload: false,
        productSource: 'store_products',
        items,
      });
      setLoading(false);
      return;
    }
    if (kind === 'physical_merch') {
      const session = await (supabase as any)
        .from('external_checkout_sessions')
        .select('id,resource_id,status,quantity,amount_cents,currency,provider_metadata,pricing_snapshot,completed_at,created_at')
        .eq('id', id)
        .eq('purchase_kind', 'physical_merch')
        .maybeSingle();
      if (session.data) {
        const merchOrderId =
          typeof session.data.provider_metadata?.merch_order_id === 'string'
            ? session.data.provider_metadata.merch_order_id
            : null;
        const merchOrder = merchOrderId
          ? await (supabase as any)
            .from('physical_merch_orders')
            .select('id,status,receipt_pdf_url,total_amount_cents,currency,completed_at,created_at')
            .eq('id', merchOrderId)
            .maybeSingle()
          : { data: null };
        const productSource =
          session.data.provider_metadata?.product_source === 'creator_merchandise' ||
            session.data.pricing_snapshot?.product_source === 'creator_merchandise'
            ? 'creator_merchandise'
            : 'store_products';
        const product = await (supabase as any)
          .from(productSource)
          .select('id,title')
          .eq('id', session.data.resource_id)
          .maybeSingle();
        setOrder({
          id: merchOrder.data?.id || session.data.id,
          source: 'merch',
          kind: 'physical_merch',
          itemId: session.data.resource_id,
          title: product.data?.title || 'Merchandise order',
          creator: 'PLUGGD Market',
          licenceType: `${session.data.quantity || 1} physical item${Number(session.data.quantity) === 1 ? '' : 's'}`,
          status: merchOrder.data?.status || session.data.status || 'pending',
          amount: merchOrder.data?.total_amount_cents ?? session.data.amount_cents,
          currency: merchOrder.data?.currency || session.data.currency || null,
          createdAt: merchOrder.data?.completed_at || merchOrder.data?.created_at || session.data.completed_at || session.data.created_at,
          documentUrl: merchOrder.data?.receipt_pdf_url ?? null,
          canDownload: false,
          productSource,
        });
      } else {
        setOrder(null);
      }
      setLoading(false);
      return;
    }
    if (kind === 'release_unlock') {
      const releasePurchase = await (supabase as any)
        .from('release_purchases')
        .select('id,release_id,status,amount_paid,amount_cents,currency,stripe_session_id,receipt_pdf_url,purchased_at,paid_at,releases:release_id(title,artist)')
        .eq('id', id)
        .maybeSingle();
      if (releasePurchase.data) {
        const release = Array.isArray(releasePurchase.data.releases) ? releasePurchase.data.releases[0] : releasePurchase.data.releases;
        setOrder({
          id: releasePurchase.data.id,
          source: 'release',
          kind: 'release_unlock',
          itemId: releasePurchase.data.release_id,
          title: release?.title || 'Release purchase',
          creator: release?.artist || 'Creator',
          licenceType: 'Digital release',
          status: releasePurchase.data.status || 'pending',
          amount: releasePurchase.data.amount_cents ?? null,
          currency: releasePurchase.data.currency ?? null,
          createdAt: releasePurchase.data.paid_at || releasePurchase.data.purchased_at,
          documentUrl: releasePurchase.data.receipt_pdf_url,
          canDownload: releasePurchase.data.status === 'completed',
        });
      } else {
        setOrder(null);
      }
      setLoading(false);
      return;
    }
    if (kind === 'event_ticket') {
      const ticketOrder = await (supabase as any)
        .from('ticket_orders')
        .select('id,event_id,status,quantity,total_amount_cents,currency,receipt_pdf_url,completed_at,created_at,events:event_id(title,location),event_ticket_tiers(name)')
        .eq('id', id)
        .maybeSingle();
      if (ticketOrder.data) {
        const event = Array.isArray(ticketOrder.data.events) ? ticketOrder.data.events[0] : ticketOrder.data.events;
        const tier = Array.isArray(ticketOrder.data.event_ticket_tiers) ? ticketOrder.data.event_ticket_tiers[0] : ticketOrder.data.event_ticket_tiers;
        setOrder({
          id: ticketOrder.data.id,
          source: 'ticket',
          kind: 'event_ticket',
          itemId: ticketOrder.data.event_id,
          title: event?.title || 'Event ticket',
          creator: event?.location || 'Venue to be confirmed',
          licenceType: `${tier?.name || 'Ticket'} · ${ticketOrder.data.quantity || 1}`,
          status: ticketOrder.data.status || 'pending',
          amount: ticketOrder.data.total_amount_cents,
          currency: ticketOrder.data.currency || null,
          createdAt: ticketOrder.data.completed_at || ticketOrder.data.created_at,
          documentUrl: ticketOrder.data.receipt_pdf_url,
          canDownload: false,
        });
      } else {
        setOrder(null);
      }
      setLoading(false);
      return;
    }
    const purchase = await (supabase as any)
      .from('purchases')
      .select('id,beat_id,status,amount,amount_cents,currency,stripe_checkout_session_id,license_type,license_pdf_url,created_at,beats:beat_id(title,producer_name)')
      .eq('id', id)
      .maybeSingle();
    if (purchase.data) {
      const beat = Array.isArray(purchase.data.beats) ? purchase.data.beats[0] : purchase.data.beats;
      const status = String(purchase.data.status || 'completed');
      setOrder({
        id: purchase.data.id,
        source: 'purchase',
        kind: 'beat_license',
        itemId: purchase.data.beat_id,
        title: beat?.title || 'Beat licence',
        creator: beat?.producer_name || 'Producer',
        licenceType: purchase.data.license_type || 'Professional licence',
        status,
        amount: purchase.data.amount_cents ?? null,
        currency: purchase.data.currency ?? null,
        createdAt: purchase.data.created_at,
        documentUrl: purchase.data.license_pdf_url,
        // Professional beat deliverables are consumed off-app. iOS provides
        // the verified licence record, while files are delivered on web/email.
        canDownload: false,
      });
      setLoading(false);
      return;
    }
    const contract = await (supabase as any)
      .from('licensing_contracts')
      .select('id,beat_id,status,license_fee,amount_cents,currency,template_type,contract_pdf_url,created_at,beats:beat_id(title,producer_name)')
      .eq('id', id)
      .maybeSingle();
    if (contract.data) {
      const beat = Array.isArray(contract.data.beats) ? contract.data.beats[0] : contract.data.beats;
      const status = String(contract.data.status || 'pending');
      setOrder({
        id: contract.data.id,
        source: 'contract',
        kind: 'beat_license',
        itemId: contract.data.beat_id,
        title: beat?.title || 'Beat licence',
        creator: beat?.producer_name || 'Producer',
        licenceType: contract.data.template_type || 'Professional licence',
        status,
        amount: contract.data.amount_cents,
        currency: contract.data.currency || null,
        createdAt: contract.data.created_at,
        documentUrl: contract.data.contract_pdf_url,
        canDownload: false,
      });
    } else {
      setOrder(null);
    }
    setLoading(false);
  }, [id, kind]);

  useEffect(() => {
    void load();
  }, [load]);

  const openDocument = async () => {
    if (!order?.documentUrl) {
      Alert.alert('Document is being prepared', 'Your licence PDF will appear after verified payment and document generation.');
      return;
    }
    const { data, error } = await supabase.functions.invoke('commerce-document-url', {
      body: { orderId: order.id, kind: order.kind },
    });
    const signedUrl = typeof data?.signedUrl === 'string' ? data.signedUrl : '';
    if (error || !/^https:\/\//i.test(signedUrl)) {
      Alert.alert('Document unavailable', 'PLUGGD could not issue a secure document link. Please try again.');
      return;
    }
    await WebBrowser.openBrowserAsync(signedUrl, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
  };

  const downloadFiles = async () => {
    if (!order || order.source !== 'release' || downloading) return;
    setDownloading(true);
    const { data, error } = await supabase.functions.invoke('download-signed-url', {
      body: { purchaseId: order.id, purchaseType: 'release' },
    });
    setDownloading(false);
    if (error) {
      Alert.alert('Download unavailable', error.message || 'PLUGGD could not issue a secure download.');
      return;
    }
    const response = (data ?? {}) as Record<string, unknown>;
    const signedUrl = typeof (response.signedUrl ?? response.signed_url) === 'string'
      ? String(response.signedUrl ?? response.signed_url)
      : '';
    if (!/^https:\/\//i.test(signedUrl)) {
      Alert.alert('Download unavailable', 'The secure download link was invalid.');
      return;
    }
    await WebBrowser.openBrowserAsync(signedUrl, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
    });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.back} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={21} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.headerLabel}>PURCHASE RECORD</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {loading ? <ActivityIndicator color={theme.colors.accentFill} style={styles.loader} /> : null}
        {!loading && !order ? (
          <View style={styles.empty}>
            <MaterialIcons name="receipt-long" size={30} color={theme.colors.accentText} />
            <Text style={styles.title}>Record unavailable.</Text>
            <Text style={styles.body}>This purchase is not linked to the signed-in account.</Text>
          </View>
        ) : null}
        {order ? (
          <>
            <Text style={styles.kicker}>{order.kind === 'beat_license' ? 'BEAT LICENCE' : order.kind === 'event_ticket' ? 'EVENT TICKET' : order.kind === 'physical_merch' ? 'MERCHANDISE ORDER' : order.kind === 'store_order' ? 'STORE ORDER' : 'RELEASE PURCHASE'}</Text>
            <Text style={styles.title}>{order.title}</Text>
            <Text style={styles.body}>{order.creator}</Text>
            <View style={styles.rule} />
            <Row label={order.kind === 'event_ticket' ? 'TIER' : order.kind === 'release_unlock' ? 'FORMAT' : order.kind === 'physical_merch' || order.kind === 'store_order' ? 'ORDER' : 'LICENCE'} value={order.licenceType.replace(/_/g, ' ')} />
            <Row label="STATUS" value={order.status} accent />
            <Row label="PURCHASED" value={formatDate(order.createdAt)} />
            <Row label="TOTAL" value={order.amount == null ? 'Recorded at checkout' : formatMoney(order.amount, order.currency)} />
            <Text style={styles.sectionTitle}>{order.kind === 'event_ticket' ? 'Ticket access' : order.kind === 'physical_merch' ? 'Order fulfilment' : order.kind === 'store_order' ? 'Items & fulfilment' : 'Files & documents'}</Text>
            {order.kind === 'event_ticket' ? (<>
              <Pressable accessibilityRole="button" accessibilityLabel="Open ticket wallet" style={styles.fileRow} onPress={() => router.push(`/tickets?eventId=${order.itemId}` as any)}>
                <View style={styles.fileIcon}><MaterialIcons name="confirmation-number" size={21} color={theme.colors.accentText} /></View>
                <View style={styles.fileCopy}>
                  <Text style={styles.fileTitle}>Ticket wallet</Text>
                  <Text style={styles.fileMeta}>{order.status === 'completed' ? 'QR access and entry status' : 'Available after payment confirmation'}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={theme.colors.textMuted} />
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={order.documentUrl ? 'Open ticket receipt' : 'Ticket receipt is being prepared'} style={styles.fileRow} onPress={openDocument}>
                <View style={styles.fileIcon}><MaterialIcons name="description" size={21} color={theme.colors.accentText} /></View>
                <View style={styles.fileCopy}>
                  <Text style={styles.fileTitle}>Payment receipt</Text>
                  <Text style={styles.fileMeta}>{order.documentUrl ? 'Ready to view securely' : 'Being prepared'}</Text>
                </View>
                <MaterialIcons name={order.documentUrl ? 'open-in-new' : 'schedule'} size={20} color={theme.colors.textMuted} />
              </Pressable>
            </>) : order.kind === 'store_order' ? (<>
              <View style={styles.orderItems}>
                {(order.items ?? []).map((item) => (
                  <View key={item.id} style={styles.orderItem}>
                    <View style={styles.orderItemArtWrap}>
                      {item.imageUrl ? <PluggdImage uri={item.imageUrl} style={styles.orderItemArt} /> : <MaterialIcons name="inventory-2" size={22} color={theme.colors.textMuted} />}
                    </View>
                    <View style={styles.fileCopy}>
                      <Text style={styles.fileTitle}>{item.title}</Text>
                      {Object.keys(item.selectedOptions).length ? <Text style={styles.fileMeta}>{Object.entries(item.selectedOptions).map(([key, value]) => `${key}: ${value}`).join(' · ')}</Text> : null}
                      <Text style={styles.fileMeta}>{item.quantity} × {formatMoney(Math.round(item.unitPrice * 100), 'GBP')}</Text>
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.fileRow}>
                <View style={styles.fileIcon}><MaterialIcons name="local-shipping" size={21} color={theme.colors.accentText} /></View>
                <View style={styles.fileCopy}>
                  <Text style={styles.fileTitle}>Physical delivery</Text>
                  <Text style={styles.fileMeta}>{order.status === 'completed' ? 'Paid · fulfilment updates follow from PLUGGD' : 'Begins after verified payment confirmation'}</Text>
                </View>
                <MaterialIcons name={order.status === 'completed' ? 'verified' : 'schedule'} size={20} color={theme.colors.textMuted} />
              </View>
              <View style={styles.fileRow}>
                <View style={styles.fileIcon}><MaterialIcons name="description" size={21} color={theme.colors.accentText} /></View>
                <View style={styles.fileCopy}>
                  <Text style={styles.fileTitle}>Private order record</Text>
                  <Text style={styles.fileMeta}>Linked to this signed-in account</Text>
                </View>
                <MaterialIcons name="lock" size={20} color={theme.colors.textMuted} />
              </View>
            </>) : order.kind === 'physical_merch' ? (<>
              <View style={styles.fileRow}>
                <View style={styles.fileIcon}><MaterialIcons name="local-shipping" size={21} color={theme.colors.accentText} /></View>
                <View style={styles.fileCopy}>
                  <Text style={styles.fileTitle}>Physical delivery</Text>
                  <Text style={styles.fileMeta}>{order.status === 'completed' ? 'Paid · fulfilment details follow from the seller' : 'Begins after payment confirmation'}</Text>
                </View>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={order.documentUrl ? 'Open merchandise receipt' : 'Merchandise receipt is being prepared'} style={styles.fileRow} onPress={openDocument}>
                <View style={styles.fileIcon}><MaterialIcons name="description" size={21} color={theme.colors.accentText} /></View>
                <View style={styles.fileCopy}>
                  <Text style={styles.fileTitle}>Payment receipt</Text>
                  <Text style={styles.fileMeta}>{order.documentUrl ? 'Ready to view securely' : 'Being prepared'}</Text>
                </View>
                <MaterialIcons name={order.documentUrl ? 'open-in-new' : 'schedule'} size={20} color={theme.colors.textMuted} />
              </Pressable>
            </>) : order.kind === 'beat_license' ? <>
            <Pressable accessibilityRole="button" accessibilityLabel={order.documentUrl ? 'Open licence PDF' : 'Licence PDF is being prepared'} style={styles.fileRow} onPress={openDocument}>
              <View style={styles.fileIcon}><MaterialIcons name="description" size={21} color={theme.colors.accentText} /></View>
              <View style={styles.fileCopy}>
                <Text style={styles.fileTitle}>Licence PDF</Text>
                <Text style={styles.fileMeta}>{order.documentUrl ? 'Ready to view' : 'Being prepared'}</Text>
              </View>
              <MaterialIcons name={order.documentUrl ? 'open-in-new' : 'schedule'} size={20} color={theme.colors.textMuted} />
            </Pressable>
            <View style={styles.fileRow}>
              <View style={styles.fileIcon}><MaterialIcons name="outgoing-mail" size={21} color={theme.colors.accentText} /></View>
              <View style={styles.fileCopy}>
                <Text style={styles.fileTitle}>Professional deliverables</Text>
                <Text style={styles.fileMeta}>Secure files are delivered through PLUGGD web and purchase email</Text>
              </View>
              <MaterialIcons name="verified" size={20} color={theme.colors.textMuted} />
            </View>
            </> : <>
            <Pressable accessibilityRole="button" accessibilityLabel={order.documentUrl ? 'Open purchase receipt' : 'Purchase receipt is being prepared'} style={styles.fileRow} onPress={openDocument}>
              <View style={styles.fileIcon}><MaterialIcons name="description" size={21} color={theme.colors.accentText} /></View>
              <View style={styles.fileCopy}>
                <Text style={styles.fileTitle}>Receipt</Text>
                <Text style={styles.fileMeta}>{order.documentUrl ? 'Ready to view' : 'Being prepared'}</Text>
              </View>
              <MaterialIcons name={order.documentUrl ? 'open-in-new' : 'schedule'} size={20} color={theme.colors.textMuted} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={order.canDownload ? 'Download purchased release' : 'Purchased release is not yet available'}
              accessibilityState={{ disabled: !order.canDownload, busy: downloading }}
              disabled={!order.canDownload || downloading}
              style={[styles.fileRow, !order.canDownload && styles.disabled]}
              onPress={downloadFiles}
            >
              <View style={styles.fileIcon}><MaterialIcons name="download" size={21} color={theme.colors.accentText} /></View>
              <View style={styles.fileCopy}>
                <Text style={styles.fileTitle}>Purchased release</Text>
                <Text style={styles.fileMeta}>{order.canDownload ? 'Secure, time-limited download' : 'Available after verified payment'}</Text>
              </View>
              {downloading ? <ActivityIndicator color={theme.colors.accentFill} /> : <MaterialIcons name="chevron-right" size={22} color={theme.colors.textMuted} />}
            </Pressable>
            </>}
            <Pressable accessibilityRole="button" style={styles.primary} onPress={() => router.push((order.kind === 'beat_license' ? `/beat/${order.itemId}` : order.kind === 'event_ticket' ? `/events/${order.itemId}` : order.kind === 'physical_merch' ? `/product/${order.itemId}?source=${order.productSource || 'store_products'}` : order.kind === 'store_order' ? '/market' : `/release/${order.itemId}`) as any)}>
              <Text style={styles.primaryText}>Open {order.kind === 'beat_license' ? 'beat' : order.kind === 'event_ticket' ? 'event' : order.kind === 'physical_merch' ? 'product' : order.kind === 'store_order' ? 'Store' : 'release'}</Text>
              <MaterialIcons name="arrow-forward" size={19} color={theme.colors.onAccent} />
            </Pressable>
            <Text style={styles.footer}>
              {order.kind === 'beat_license'
                ? 'Licence documents are private. Beat files and stems are delivered for off-app professional use through PLUGGD web and purchase email.'
                : order.kind === 'store_order'
                  ? 'This private record is read from the verified server order. Shipping and fulfilment updates remain linked to the purchasing account.'
                : 'Secure links are issued only to the account that owns this purchase and may expire for security.'}
            </Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  const styles = useOrderStyles();
  return <View style={styles.row}><Text style={styles.rowLabel}>{label}</Text><Text style={[styles.rowValue, accent && styles.rowAccent]}>{value}</Text></View>;
}

function formatMoney(amountCents: number, currency: string | null) {
  const code = currency && /^[A-Z]{3}$/.test(currency) ? currency : 'GBP';
  try {
    return new Intl.NumberFormat('en-GB', { style: 'currency', currency: code }).format(amountCents / 100);
  } catch {
    return formatGBP(amountCents, { cents: true });
  }
}

function useOrderStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { height: 64, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderColor: theme.colors.divider },
  back: { width: 44, height: 44, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerLabel: { color: theme.colors.textMuted, fontSize: 10, letterSpacing: 1.5, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  content: { padding: 22, paddingBottom: 100 },
  loader: { minHeight: 300 },
  empty: { minHeight: 450, alignItems: 'center', justifyContent: 'center' },
  kicker: { color: theme.colors.accentText, fontSize: 10, letterSpacing: 1.8, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', marginTop: 14 },
  title: { color: theme.colors.text, fontSize: 34, lineHeight: 39, letterSpacing: -1.2, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', marginTop: 7 },
  body: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: pluggdFonts.satoshiMedium, marginTop: 7 },
  rule: { height: 1, backgroundColor: theme.colors.divider, marginTop: 25 },
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: theme.colors.divider, gap: 16 },
  rowLabel: { color: theme.colors.textMuted, fontSize: 9, letterSpacing: 1.3, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  rowValue: { flex: 1, color: theme.colors.text, textAlign: 'right', textTransform: 'capitalize', fontSize: 13, fontFamily: pluggdFonts.satoshiBold },
  rowAccent: { color: theme.colors.accentText },
  sectionTitle: { color: theme.colors.text, fontSize: 21, fontFamily: pluggdFonts.displayBold, marginTop: 28, marginBottom: 8 },
  fileRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: theme.colors.divider, gap: 12 },
  fileIcon: { width: 44, height: 44, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  fileCopy: { flex: 1 },
  fileTitle: { color: theme.colors.text, fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  fileMeta: { color: theme.colors.textMuted, fontSize: 11, fontFamily: pluggdFonts.satoshiMedium, marginTop: 3 },
  orderItems: { borderTopWidth: 1, borderTopColor: theme.colors.divider },
  orderItem: { minHeight: 94, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: theme.colors.divider, gap: 12, paddingVertical: 12 },
  orderItemArtWrap: { width: 58, height: 70, backgroundColor: theme.colors.artworkBase, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  orderItemArt: { width: '100%', height: '100%' },
  disabled: { opacity: 0.48 },
  primary: { minHeight: 54, borderRadius: 5, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 24 },
  primaryText: { color: theme.colors.onAccent, fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  footer: { color: theme.colors.textMuted, fontSize: 10, lineHeight: 15, fontFamily: pluggdFonts.satoshiMedium, textAlign: 'center', marginTop: 15 },
  }), [theme]);
}
