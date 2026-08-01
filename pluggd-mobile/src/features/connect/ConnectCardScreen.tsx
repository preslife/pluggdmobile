import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Contacts from 'expo-contacts';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking as NativeLinking,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { PluggdImage } from '../../components/PluggdImage';
import { selectionHaptic } from '../../design/haptics';
import { pluggdFonts } from '../../design/typography';
import {
  CONNECT_CARD_VIEW_LABELS,
  createConnectCardPreview,
  loadConnectCard,
  type ConnectCardFields,
  type ConnectCardPayload,
  type ConnectCardViewType,
  type ConnectService,
} from './connect-card-data';

const ORANGE = '#FF6700';
const ORANGE_SOFT = '#FF8A3D';
const INK = '#070708';
const PANEL = '#111113';
const PANEL_HIGH = '#17171A';
const LINE = 'rgba(255,255,255,0.11)';
const MUTED = '#A9A6A2';
const PREVIEW_COVER = require('../../../assets/web-parity/home/intimate-vocalist.png');
const LOGO = require('../../../assets/brand/pluggd-logo-light.png');

const viewPath: Record<ConnectCardViewType, string> = {
  public: '',
  business: '/business',
  rates: '/rates',
  collab: '/collab',
  contract: '/contract',
};

const viewMeta: Record<ConnectCardViewType, { icon: string; eyebrow: string; description: string }> = {
  public: { icon: 'language', eyebrow: 'PUBLIC IDENTITY', description: 'Music, contact and creator discovery.' },
  business: { icon: 'business-center', eyebrow: 'BOOKING DESK', description: 'Professional contact and availability.' },
  rates: { icon: 'sell', eyebrow: 'SERVICES', description: 'Starting rates and booking details.' },
  collab: { icon: 'group-work', eyebrow: 'SPLIT READY', description: 'Credits, rights and studio identity.' },
  contract: { icon: 'verified-user', eyebrow: 'SECURE SHARE', description: 'Private legal and company details.' },
};

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readArray(value: unknown) {
  return Array.isArray(value) ? value.map(readString).filter(Boolean) : [];
}

function normalizeUrl(value: unknown) {
  const raw = readString(value);
  if (!raw || /^(javascript|data|file|blob):/i.test(raw)) return '';
  if (/^(https?:|mailto:|tel:)/i.test(raw)) return raw;
  return `https://${raw}`;
}

function money(value: unknown, currency = 'GBP') {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Enquire';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function identityFrom(payload: ConnectCardPayload, fallbackSlug: string) {
  const fields = payload.fields ?? {};
  const profile = payload.profile ?? {};
  const displayName = readString(fields.display_name)
    || readString(fields.artist_name)
    || readString(profile.display_name)
    || 'PLUGGD Creator';
  return {
    displayName,
    handle: readString(profile.slug) ? `@${profile.slug}` : fallbackSlug ? `@${fallbackSlug}` : '',
    role: readString(fields.primary_role) || readString(profile.primary_role) || 'Independent creator',
    roles: readArray(fields.roles).length ? readArray(fields.roles) : readArray(profile.roles),
    bio: readString(fields.bio),
    location: readString(fields.location),
    genre: readString(fields.genre),
    avatar: readString(fields.profile_image_url) || readString(profile.profile_image_url),
    cover: readString(fields.cover_image_url) || readString(profile.cover_image_url),
    verified: Boolean(profile.is_verified),
  };
}

function IconButton({
  icon,
  label,
  onPress,
}: {
  icon: string;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
    >
      <View style={styles.quickActionIcon}>
        <MaterialIcons name={icon as any} size={21} color="#FFFFFF" />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

function PrimaryButton({
  icon,
  label,
  onPress,
  secondary = false,
}: {
  icon: string;
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        selectionHaptic();
        onPress();
      }}
      style={[
        styles.primaryButton,
        secondary ? styles.secondaryButton : undefined,
      ]}
    >
      <MaterialIcons name={icon as any} size={20} color={secondary ? '#FFFFFF' : '#180A02'} />
      <Text style={[styles.primaryButtonText, secondary && styles.secondaryButtonText]}>{label}</Text>
      <MaterialIcons name="arrow-forward" size={18} color={secondary ? '#FFFFFF' : '#180A02'} />
    </Pressable>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  if (!value) return null;
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailIcon}>
        <MaterialIcons name={icon as any} size={19} color={ORANGE_SOFT} />
      </View>
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text style={styles.detailValue}>{value}</Text>
      </View>
    </View>
  );
}

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      {eyebrow ? <Text style={styles.sectionEyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ProfileHero({
  payload,
  slug,
  viewType,
}: {
  payload: ConnectCardPayload;
  slug: string;
  viewType: ConnectCardViewType;
}) {
  const identity = identityFrom(payload, slug);
  return (
    <View style={styles.hero}>
      <View style={styles.cover}>
        <PluggdImage
          uri={identity.cover}
          fallbackSource={PREVIEW_COVER}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          accessibilityLabel={`${identity.displayName} cover`}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.12)', 'rgba(7,7,8,0.30)', '#080809']}
          locations={[0, 0.5, 1]}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.heroTop}>
          <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="PLUGGD" />
          <View style={styles.heroViewChip}>
            <MaterialIcons name={viewMeta[viewType].icon as any} size={14} color={ORANGE_SOFT} />
            <Text style={styles.heroViewChipText}>{CONNECT_CARD_VIEW_LABELS[viewType]}</Text>
          </View>
        </View>
      </View>

      <View style={styles.avatarWrap}>
        <PluggdImage
          uri={identity.avatar}
          fallbackSource={PREVIEW_COVER}
          style={styles.avatar}
          resizeMode="cover"
          accessibilityLabel={identity.displayName}
        />
        {identity.verified ? (
          <View style={styles.verifiedBadge}>
            <MaterialIcons name="check" size={18} color="#FFFFFF" />
          </View>
        ) : null}
      </View>

      <View style={styles.identityBlock}>
        <Text style={styles.identityEyebrow}>{viewMeta[viewType].eyebrow}</Text>
        <View style={styles.nameRow}>
          <Text style={styles.name}>{identity.displayName}</Text>
          {identity.verified ? <MaterialIcons name="verified" size={21} color={ORANGE} /> : null}
        </View>
        <Text style={styles.handle}>{identity.handle}</Text>
        <View style={styles.roleRow}>
          {(identity.roles.length ? identity.roles : [identity.role]).slice(0, 3).map((role) => (
            <View key={role} style={styles.roleChip}>
              <Text style={styles.roleChipText}>{role}</Text>
            </View>
          ))}
        </View>
        {identity.bio ? <Text style={styles.bio}>{identity.bio}</Text> : null}
        <View style={styles.locationRow}>
          {identity.location ? (
            <>
              <MaterialIcons name="place" size={16} color={MUTED} />
              <Text style={styles.locationText}>{identity.location}</Text>
            </>
          ) : null}
          {identity.location && identity.genre ? <View style={styles.dot} /> : null}
          {identity.genre ? <Text style={styles.locationText}>{identity.genre}</Text> : null}
        </View>
      </View>
    </View>
  );
}

function ViewSwitcher({
  slug,
  active,
  token,
}: {
  slug: string;
  active: ConnectCardViewType;
  token?: string | null;
}) {
  const router = useRouter();
  const views: ConnectCardViewType[] = ['public', 'business', 'rates', 'collab', 'contract'];
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.switcher}
      accessibilityRole="tablist"
    >
      {views.map((view) => (
        <Pressable
          key={view}
          accessibilityRole="tab"
          accessibilityState={{ selected: active === view }}
          onPress={() => {
            selectionHaptic();
            const tokenQuery = token ? `?token=${encodeURIComponent(token)}` : '';
            router.replace(`/connect/${slug}${viewPath[view]}${tokenQuery}` as never);
          }}
          style={[styles.switcherPill, active === view && styles.switcherPillActive]}
        >
          <MaterialIcons
            name={viewMeta[view].icon as any}
            size={15}
            color={active === view ? '#170A03' : MUTED}
          />
          <Text style={[styles.switcherText, active === view && styles.switcherTextActive]}>
            {CONNECT_CARD_VIEW_LABELS[view]}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function PublicCardBody({
  payload,
  shareUrl,
  onSaveContact,
}: {
  payload: ConnectCardPayload;
  shareUrl: string;
  onSaveContact: () => void;
}) {
  const fields = payload.fields ?? {};
  const email = readString(fields.email_public) || readString(fields.email_business);
  const website = normalizeUrl(fields.website_url);
  const pluggd = normalizeUrl(fields.pluggd_profile_url);
  const socials = fields.socials && typeof fields.socials === 'object' ? fields.socials : {};
  const socialLinks = Object.entries(socials)
    .filter(([, value]) => readString(value))
    .slice(0, 4);

  return (
    <>
      <View style={styles.actionStack}>
        <PrimaryButton icon="person-add" label="Save Contact" onPress={onSaveContact} />
        {pluggd ? <PrimaryButton secondary icon="play-circle-outline" label="Open on PLUGGD" onPress={() => void NativeLinking.openURL(pluggd)} /> : null}
      </View>
      <View style={styles.quickGrid}>
        {email ? <IconButton icon="mail-outline" label="Email" onPress={() => void NativeLinking.openURL(`mailto:${email}`)} /> : null}
        {website ? <IconButton icon="language" label="Website" onPress={() => void NativeLinking.openURL(website)} /> : null}
        {socialLinks.slice(0, 1).map(([platform, value]) => (
          <IconButton
            key={platform}
            icon="music-note"
            label={platform === 'instagram' ? 'Socials' : platform}
            onPress={() => {
              const normalized = normalizeUrl(
                readString(value).startsWith('@') && platform === 'instagram'
                  ? `instagram.com/${readString(value).slice(1)}`
                  : value,
              );
              if (normalized) void NativeLinking.openURL(normalized);
            }}
          />
        ))}
        <IconButton icon="ios-share" label="Share" onPress={() => void Share.share({ title: 'PLUGGD Connect Card', message: shareUrl, url: shareUrl })} />
      </View>
      {(email || website) ? (
        <Section eyebrow="CONTACT" title="Open a direct line">
          <View style={styles.detailPanel}>
            <DetailRow icon="alternate-email" label="Email" value={email} />
            <DetailRow icon="language" label="Website" value={website.replace(/^https?:\/\//, '')} />
          </View>
        </Section>
      ) : null}
    </>
  );
}

function BusinessCardBody({ fields }: { fields: ConnectCardFields }) {
  const email = readString(fields.email_business);
  const phone = readString(fields.phone_business);
  const booking = normalizeUrl(fields.booking_url);
  const website = normalizeUrl(fields.website_url);
  const portfolios = Array.isArray(fields.portfolio_links) ? fields.portfolio_links : [];
  const primary = booking || (email ? `mailto:${email}` : '') || website;
  return (
    <>
      {primary ? <PrimaryButton icon="calendar-month" label={booking ? 'Check availability' : 'Make an enquiry'} onPress={() => void NativeLinking.openURL(primary)} /> : null}
      <Section eyebrow="BUSINESS CARD" title="Professional contact">
        <View style={styles.detailPanel}>
          <DetailRow icon="mail-outline" label="Business email" value={email} />
          <DetailRow icon="phone" label="Business phone" value={phone} />
          <DetailRow icon="language" label="Website" value={website.replace(/^https?:\/\//, '')} />
          <DetailRow icon="event-available" label="Booking" value={booking ? 'Open for enquiries' : ''} />
        </View>
      </Section>
      {portfolios.length ? (
        <Section eyebrow="SELECTED WORK" title="Portfolio & EPK">
          <View style={styles.linkStack}>
            {portfolios.slice(0, 4).map((item, index) => {
              const url = normalizeUrl(item.url);
              return (
                <Pressable accessibilityRole="link" accessibilityLabel={`Open ${item.label}`} key={`${item.label}-${index}`} onPress={() => url && void NativeLinking.openURL(url)} style={styles.linkRow}>
                  <View style={styles.linkIcon}><MaterialIcons name="north-east" size={18} color={ORANGE_SOFT} /></View>
                  <Text style={styles.linkText}>{readString(item.label) || readString(item.title) || 'View work'}</Text>
                  <MaterialIcons name="chevron-right" size={20} color={MUTED} />
                </Pressable>
              );
            })}
          </View>
        </Section>
      ) : null}
    </>
  );
}

function RatesCardBody({ fields }: { fields: ConnectCardFields }) {
  const services = (Array.isArray(fields.services) ? fields.services : [])
    .filter((service): service is ConnectService => Boolean(service && service.available !== false));
  const booking = normalizeUrl(fields.booking_url);
  const email = readString(fields.email_business) || readString(fields.email_public);
  const primary = booking || (email ? `mailto:${email}` : '');
  return (
    <>
      <Section eyebrow="RATE CARD" title="Services & starting rates">
        <View style={styles.rateTable}>
          {services.map((service, index) => (
            <View key={service.id || `${service.service_name}-${index}`} style={[styles.rateRow, index === services.length - 1 && styles.rateRowLast]}>
              <View style={styles.rateIcon}>
                <MaterialIcons name={index % 2 ? 'graphic-eq' : 'headphones'} size={20} color={ORANGE_SOFT} />
              </View>
              <View style={styles.rateCopy}>
                <Text style={styles.rateName}>{service.service_name}</Text>
                {service.description ? <Text style={styles.rateDescription}>{service.description}</Text> : null}
                {service.turnaround ? <Text style={styles.rateTurnaround}>{service.turnaround}</Text> : null}
              </View>
              <Text style={styles.ratePrice}>{money(service.starting_price, readString(service.currency) || 'GBP')}</Text>
            </View>
          ))}
          {!services.length ? (
            <View style={styles.emptyInline}>
              <MaterialIcons name="schedule" size={20} color={ORANGE_SOFT} />
              <Text style={styles.emptyInlineText}>Rates are shared by enquiry.</Text>
            </View>
          ) : null}
        </View>
      </Section>
      {readString(fields.service_notes) ? (
        <View style={styles.notePanel}>
          <MaterialIcons name="info-outline" size={21} color={ORANGE_SOFT} />
          <Text style={styles.noteText}>{readString(fields.service_notes)}</Text>
        </View>
      ) : null}
      {primary ? <PrimaryButton icon="calendar-month" label="Book / Enquire" onPress={() => void NativeLinking.openURL(primary)} /> : null}
    </>
  );
}

function PrivateCardBody({
  fields,
  viewType,
  shareUrl,
}: {
  fields: ConnectCardFields;
  viewType: 'collab' | 'contract';
  shareUrl: string;
}) {
  const rows = viewType === 'collab'
    ? [
      ['badge', 'Legal name', readString(fields.legal_name)],
      ['music-note', 'Artist / credit name', readString(fields.artist_name) || readString(fields.display_name)],
      ['account-balance', 'PRO', readString(fields.pro_name)],
      ['fingerprint', 'IPI / CAE', readString(fields.ipi_cae_number)],
      ['business', 'Publisher', readString(fields.publisher_name)],
      ['tune', 'Publishing admin', readString(fields.publishing_admin)],
      ['pie-chart', 'Default split role', readString(fields.default_split_role)],
      ['alternate-email', 'Collab contact', readString(fields.contact_email)],
    ]
    : [
      ['badge', 'Legal name', readString(fields.legal_name)],
      ['business', 'Company', readString(fields.company_name)],
      ['numbers', 'Company number', readString(fields.company_number)],
      ['contact-mail', 'Legal contact', readString(fields.contract_contact_name)],
      ['work-outline', 'Contact role', readString(fields.contract_contact_role)],
      ['alternate-email', 'Legal email', readString(fields.contract_email)],
      ['flag', 'Nationality', readString(fields.nationality)],
      ['public', 'Country of residence', readString(fields.country_of_residence)],
    ];

  return (
    <>
      <View style={styles.securityStrip}>
        <MaterialIcons name="lock" size={19} color="#75E0B2" />
        <View style={styles.securityCopy}>
          <Text style={styles.securityTitle}>Access verified</Text>
          <Text style={styles.securityText}>This private view is protected by a secure share link.</Text>
        </View>
      </View>
      <Section
        eyebrow={viewType === 'collab' ? 'COLLABORATOR CARD' : 'LEGAL & ADMIN'}
        title={viewType === 'collab' ? 'Split-ready identity' : 'Legal share details'}
      >
        <View style={styles.detailPanel}>
          {rows.map(([icon, label, value]) => <DetailRow key={label} icon={icon} label={label} value={value} />)}
        </View>
      </Section>
      <PrimaryButton
        icon={viewType === 'collab' ? 'group-add' : 'share'}
        label={viewType === 'collab' ? 'Use for Split Sheet' : 'Share with Legal Team'}
        onPress={() => void Share.share({ title: 'PLUGGD secure card', message: shareUrl, url: shareUrl })}
      />
    </>
  );
}

function LockedState({
  slug,
  viewType,
}: {
  slug: string;
  viewType: ConnectCardViewType;
}) {
  const router = useRouter();
  const isPrivate = viewType === 'collab' || viewType === 'contract';
  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIcon}>
        <MaterialIcons name={isPrivate ? 'lock-outline' : 'visibility-off'} size={30} color={ORANGE_SOFT} />
      </View>
      <Text style={styles.stateEyebrow}>{isPrivate ? 'PRIVATE BY DESIGN' : 'NOT PUBLISHED'}</Text>
      <Text style={styles.stateTitle}>
        {isPrivate ? `${CONNECT_CARD_VIEW_LABELS[viewType]} access required` : `${CONNECT_CARD_VIEW_LABELS[viewType]} is not available`}
      </Text>
      <Text style={styles.stateText}>
        {isPrivate
          ? 'Ask the creator for their secure link. Sensitive identity and legal details never appear on the public card.'
          : 'This creator has not published this card view yet.'}
      </Text>
      <PrimaryButton icon="language" label="View public Connect card" onPress={() => router.replace(`/connect/${slug}` as never)} />
    </View>
  );
}

function QRPanel({
  shareUrl,
  displayName,
}: {
  shareUrl: string;
  displayName: string;
}) {
  return (
    <View style={styles.qrPanel}>
      <View style={styles.qrWrap}>
        <QRCode value={shareUrl} size={112} color="#050505" backgroundColor="#FFFFFF" />
      </View>
      <View style={styles.qrCopy}>
        <Text style={styles.qrEyebrow}>SCAN TO CONNECT</Text>
        <Text style={styles.qrTitle}>{displayName}</Text>
        <Text style={styles.qrUrl} numberOfLines={2}>{shareUrl.replace(/^https?:\/\//, '')}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Share Connect Card" onPress={() => void Share.share({ title: 'PLUGGD Connect Card', message: shareUrl, url: shareUrl })} style={styles.qrShare}>
          <MaterialIcons name="ios-share" size={17} color={ORANGE_SOFT} />
          <Text style={styles.qrShareText}>Share card</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function ConnectCardScreen({ viewType = 'public' }: { viewType?: ConnectCardViewType }) {
  const params = useLocalSearchParams<{ slug?: string; token?: string; preview?: string }>();
  const slug = readString(params.slug);
  const token = readString(params.token) || null;
  const preview = __DEV__ && params.preview === 'creator';
  const [showQR, setShowQR] = useState(false);
  const query = useQuery({
    queryKey: ['connect-card', slug, viewType, token, preview],
    queryFn: () => preview ? Promise.resolve(createConnectCardPreview(viewType)) : loadConnectCard(slug, viewType, token),
    enabled: Boolean(slug || preview),
    retry: 1,
  });
  const payload = query.data;
  const identity = payload ? identityFrom(payload, slug) : null;
  const canonicalSlug = readString(payload?.profile?.slug) || slug || 'creator';
  const shareUrl = useMemo(() => {
    const base = `https://pluggd.fm/connect/${encodeURIComponent(canonicalSlug)}${viewPath[viewType]}`;
    return token && (viewType === 'collab' || viewType === 'contract')
      ? `${base}?token=${encodeURIComponent(token)}`
      : base;
  }, [canonicalSlug, token, viewType]);

  const saveContact = async () => {
    if (!payload || !identity) return;
    const fields = payload.fields ?? {};
    try {
      await Contacts.presentFormAsync(null, {
        firstName: identity.displayName,
        company: 'PLUGGD',
        jobTitle: identity.role,
        emails: [
          readString(fields.email_public) || readString(fields.email_business)
            ? { label: 'PLUGGD', email: readString(fields.email_public) || readString(fields.email_business) }
            : null,
        ].filter(Boolean) as any,
        phoneNumbers: readString(fields.phone_business)
          ? [{ label: 'work', number: readString(fields.phone_business) }]
          : [],
        urlAddresses: [
          { label: 'PLUGGD Connect', url: shareUrl },
          normalizeUrl(fields.website_url) ? { label: 'website', url: normalizeUrl(fields.website_url) } : null,
        ].filter(Boolean) as any,
        note: identity.bio || `${identity.displayName} on PLUGGD`,
      } as any, { isNew: true });
    } catch {
      Alert.alert('Contact card unavailable', 'Share this Connect Card instead.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Share', onPress: () => void Share.share({ message: shareUrl, url: shareUrl }) },
      ]);
    }
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={query.isRefetching} onRefresh={() => void query.refetch()} tintColor={ORANGE} />}
        contentContainerStyle={styles.content}
      >
        {query.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={ORANGE} />
            <Text style={styles.loadingText}>Opening Connect Card</Text>
          </View>
        ) : query.isError ? (
          <View style={styles.stateCard}>
            <View style={styles.stateIcon}><MaterialIcons name="cloud-off" size={30} color={ORANGE_SOFT} /></View>
            <Text style={styles.stateEyebrow}>CONNECTION INTERRUPTED</Text>
            <Text style={styles.stateTitle}>This card could not load</Text>
            <Text style={styles.stateText}>Check your connection and try again. No private card details were exposed.</Text>
            <PrimaryButton icon="refresh" label="Try again" onPress={() => void query.refetch()} />
          </View>
        ) : payload?.status === 'ok' ? (
          <>
            <ProfileHero payload={payload} slug={canonicalSlug} viewType={viewType} />
            <ViewSwitcher slug={canonicalSlug} active={viewType} token={token} />
            <View style={styles.body}>
              {viewType === 'public' ? <PublicCardBody payload={payload} shareUrl={shareUrl} onSaveContact={() => void saveContact()} /> : null}
              {viewType === 'business' ? <BusinessCardBody fields={payload.fields ?? {}} /> : null}
              {viewType === 'rates' ? <RatesCardBody fields={payload.fields ?? {}} /> : null}
              {viewType === 'collab' || viewType === 'contract'
                ? <PrivateCardBody fields={payload.fields ?? {}} viewType={viewType} shareUrl={shareUrl} />
                : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Show Connect Card QR"
                onPress={() => setShowQR(true)}
                style={styles.qrTeaser}
              >
                <View style={styles.qrTeaserIcon}><MaterialIcons name="qr-code-2" size={24} color={ORANGE_SOFT} /></View>
                <View style={styles.qrTeaserCopy}>
                  <Text style={styles.qrTeaserTitle}>Share in the room</Text>
                  <Text style={styles.qrTeaserText}>Open the full-screen QR for fast contact exchange.</Text>
                </View>
                <MaterialIcons name="chevron-right" size={22} color={MUTED} />
              </Pressable>
              <View style={styles.poweredBy}>
                <Text style={styles.poweredByText}>POWERED BY</Text>
                <Image source={LOGO} style={styles.poweredLogo} resizeMode="contain" accessibilityLabel="PLUGGD" />
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.masthead}>
              <Image source={LOGO} style={styles.logo} resizeMode="contain" accessibilityLabel="PLUGGD" />
              <Text style={styles.mastheadLabel}>CONNECT CARD</Text>
            </View>
            <LockedState slug={canonicalSlug} viewType={viewType} />
          </>
        )}
      </ScrollView>

      <Modal visible={showQR} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowQR(false)}>
        <View style={styles.qrModal}>
          <View style={styles.qrModalTop}>
            <View>
              <Text style={styles.qrModalEyebrow}>PLUGGD CONNECT</Text>
              <Text style={styles.qrModalTitle}>Scan. Save. Stay connected.</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close QR" onPress={() => setShowQR(false)} style={styles.closeButton}>
              <MaterialIcons name="close" size={22} color="#FFFFFF" />
            </Pressable>
          </View>
          <View style={styles.qrModalCenter}>
            <QRPanel shareUrl={shareUrl} displayName={identity?.displayName || 'PLUGGD Creator'} />
          </View>
          <PrimaryButton icon="ios-share" label="Share Connect Card" onPress={() => void Share.share({ title: 'PLUGGD Connect Card', message: shareUrl, url: shareUrl })} />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: INK },
  content: { flexGrow: 1, paddingBottom: 48 },
  loading: { minHeight: 680, alignItems: 'center', justifyContent: 'center', gap: 14 },
  loadingText: { color: MUTED, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14 },
  hero: { backgroundColor: INK },
  cover: { height: 304, overflow: 'hidden' },
  heroTop: { position: 'absolute', top: 58, left: 20, right: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  logo: { width: 108, height: 30 },
  heroViewChip: { minHeight: 34, paddingHorizontal: 12, borderRadius: 17, backgroundColor: 'rgba(10,10,11,0.80)', borderWidth: 1, borderColor: 'rgba(255,103,0,0.42)', flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroViewChipText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBold, fontSize: 11, letterSpacing: 0.3 },
  avatarWrap: { width: 108, height: 108, borderRadius: 54, borderWidth: 3, borderColor: ORANGE, padding: 4, backgroundColor: INK, marginTop: -62, marginLeft: 22 },
  avatar: { width: 94, height: 94, borderRadius: 47, backgroundColor: PANEL_HIGH },
  verifiedBadge: { position: 'absolute', right: -3, bottom: 6, width: 31, height: 31, borderRadius: 16, backgroundColor: ORANGE, borderWidth: 3, borderColor: INK, alignItems: 'center', justifyContent: 'center' },
  identityBlock: { paddingHorizontal: 22, paddingTop: 14, paddingBottom: 22 },
  identityEyebrow: { color: ORANGE_SOFT, fontFamily: pluggdFonts.satoshiBold, fontSize: 10, letterSpacing: 1.8, marginBottom: 7 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: '#FFFFFF', fontFamily: pluggdFonts.displayExtraBold, fontSize: 31, lineHeight: 35, flexShrink: 1 },
  handle: { color: ORANGE_SOFT, fontFamily: pluggdFonts.satoshiBold, fontSize: 15, marginTop: 2 },
  roleRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 15 },
  roleChip: { minHeight: 31, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,103,0,0.58)', backgroundColor: 'rgba(255,103,0,0.08)', alignItems: 'center', justifyContent: 'center' },
  roleChipText: { color: '#F9EEE7', fontFamily: pluggdFonts.satoshiMedium, fontSize: 12 },
  bio: { color: '#D7D3CF', fontFamily: pluggdFonts.satoshiRegular, fontSize: 14, lineHeight: 21, marginTop: 16 },
  locationRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 13 },
  locationText: { color: MUTED, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12 },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#66615D' },
  switcher: { paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  switcherPill: { minHeight: 38, borderRadius: 19, paddingHorizontal: 13, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, flexDirection: 'row', alignItems: 'center', gap: 7 },
  switcherPillActive: { backgroundColor: ORANGE, borderColor: ORANGE },
  switcherText: { color: MUTED, fontFamily: pluggdFonts.satoshiBold, fontSize: 11 },
  switcherTextActive: { color: '#170A03' },
  body: { paddingHorizontal: 16, gap: 18 },
  actionStack: { gap: 10 },
  primaryButton: { width: '100%', minHeight: 54, borderRadius: 14, paddingHorizontal: 17, backgroundColor: ORANGE, flexDirection: 'row', alignItems: 'center', gap: 11 },
  secondaryButton: { backgroundColor: PANEL_HIGH, borderWidth: 1, borderColor: LINE },
  primaryButtonText: { color: '#180A02', fontFamily: pluggdFonts.satoshiBlack, fontSize: 14, flex: 1 },
  secondaryButtonText: { color: '#FFFFFF' },
  quickGrid: { flexDirection: 'row', gap: 8 },
  quickAction: { flex: 1, minHeight: 82, borderRadius: 15, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, alignItems: 'center', justifyContent: 'center', gap: 7 },
  quickActionIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(255,103,0,0.14)', alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { color: '#F6F3F0', fontFamily: pluggdFonts.satoshiBold, fontSize: 10, textTransform: 'capitalize' },
  section: { gap: 10, marginTop: 3 },
  sectionEyebrow: { color: ORANGE_SOFT, fontFamily: pluggdFonts.satoshiBold, fontSize: 10, letterSpacing: 1.6 },
  sectionTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.displayBold, fontSize: 21, lineHeight: 25 },
  detailPanel: { borderRadius: 17, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, overflow: 'hidden' },
  detailRow: { minHeight: 67, paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE, flexDirection: 'row', alignItems: 'center', gap: 12 },
  detailIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,103,0,0.10)', alignItems: 'center', justifyContent: 'center' },
  detailCopy: { flex: 1, gap: 3 },
  detailLabel: { color: '#77736F', fontFamily: pluggdFonts.satoshiBold, fontSize: 9, letterSpacing: 1.1, textTransform: 'uppercase' },
  detailValue: { color: '#F7F4F1', fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 18 },
  linkStack: { gap: 8 },
  linkRow: { minHeight: 58, borderRadius: 14, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: 'rgba(255,103,0,0.10)', alignItems: 'center', justifyContent: 'center' },
  linkText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBold, fontSize: 13, flex: 1 },
  rateTable: { borderRadius: 17, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, overflow: 'hidden' },
  rateRow: { minHeight: 90, padding: 13, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: LINE, flexDirection: 'row', alignItems: 'center', gap: 11 },
  rateRowLast: { borderBottomWidth: 0 },
  rateIcon: { width: 38, height: 38, borderRadius: 11, backgroundColor: 'rgba(255,103,0,0.10)', alignItems: 'center', justifyContent: 'center' },
  rateCopy: { flex: 1, gap: 2 },
  rateName: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBold, fontSize: 14 },
  rateDescription: { color: MUTED, fontFamily: pluggdFonts.satoshiRegular, fontSize: 11, lineHeight: 15 },
  rateTurnaround: { color: '#716C67', fontFamily: pluggdFonts.satoshiMedium, fontSize: 10, marginTop: 3 },
  ratePrice: { color: ORANGE_SOFT, fontFamily: pluggdFonts.displayBold, fontSize: 17 },
  emptyInline: { padding: 18, flexDirection: 'row', alignItems: 'center', gap: 10 },
  emptyInlineText: { color: '#D4CFCB', fontFamily: pluggdFonts.satoshiMedium, fontSize: 13 },
  notePanel: { borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,103,0,0.28)', backgroundColor: 'rgba(255,103,0,0.06)', padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noteText: { color: '#CEC8C3', fontFamily: pluggdFonts.satoshiRegular, fontSize: 12, lineHeight: 18, flex: 1 },
  securityStrip: { borderRadius: 15, borderWidth: 1, borderColor: 'rgba(117,224,178,0.28)', backgroundColor: 'rgba(30,103,74,0.13)', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 11 },
  securityCopy: { flex: 1, gap: 2 },
  securityTitle: { color: '#C5F7E0', fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  securityText: { color: '#91B9A7', fontFamily: pluggdFonts.satoshiRegular, fontSize: 11, lineHeight: 16 },
  qrTeaser: { minHeight: 76, borderRadius: 17, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  qrTeaserIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: 'rgba(255,103,0,0.10)', alignItems: 'center', justifyContent: 'center' },
  qrTeaserCopy: { flex: 1, gap: 3 },
  qrTeaserTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  qrTeaserText: { color: MUTED, fontFamily: pluggdFonts.satoshiRegular, fontSize: 11, lineHeight: 15 },
  poweredBy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 8 },
  poweredByText: { color: '#696560', fontFamily: pluggdFonts.satoshiBold, fontSize: 9, letterSpacing: 1.7 },
  poweredLogo: { width: 76, height: 20, opacity: 0.72 },
  masthead: { paddingTop: 58, paddingHorizontal: 20, paddingBottom: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mastheadLabel: { color: MUTED, fontFamily: pluggdFonts.satoshiBold, fontSize: 10, letterSpacing: 1.6 },
  stateCard: { margin: 16, borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,103,0,0.22)', backgroundColor: PANEL, padding: 24, gap: 13 },
  stateIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: 'rgba(255,103,0,0.11)', alignItems: 'center', justifyContent: 'center', marginBottom: 5 },
  stateEyebrow: { color: ORANGE_SOFT, fontFamily: pluggdFonts.satoshiBold, fontSize: 10, letterSpacing: 1.6 },
  stateTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.displayExtraBold, fontSize: 27, lineHeight: 32 },
  stateText: { color: MUTED, fontFamily: pluggdFonts.satoshiRegular, fontSize: 14, lineHeight: 21, marginBottom: 5 },
  qrModal: { flex: 1, backgroundColor: INK, paddingTop: 24, paddingHorizontal: 18, paddingBottom: 34, gap: 20 },
  qrModalTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 15 },
  qrModalEyebrow: { color: ORANGE_SOFT, fontFamily: pluggdFonts.satoshiBold, fontSize: 10, letterSpacing: 1.6, marginBottom: 7 },
  qrModalTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.displayBold, fontSize: 23, lineHeight: 28, maxWidth: 260 },
  closeButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: PANEL_HIGH, borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center' },
  qrModalCenter: { flex: 1, justifyContent: 'center' },
  qrPanel: { borderRadius: 24, borderWidth: 1, borderColor: 'rgba(255,103,0,0.28)', backgroundColor: PANEL, padding: 20, alignItems: 'center', gap: 19 },
  qrWrap: { padding: 14, borderRadius: 15, backgroundColor: '#FFFFFF' },
  qrCopy: { alignItems: 'center', gap: 6 },
  qrEyebrow: { color: ORANGE_SOFT, fontFamily: pluggdFonts.satoshiBold, fontSize: 9, letterSpacing: 1.6 },
  qrTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.displayBold, fontSize: 22 },
  qrUrl: { color: MUTED, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11, textAlign: 'center' },
  qrShare: { minHeight: 40, borderRadius: 20, marginTop: 6, paddingHorizontal: 15, borderWidth: 1, borderColor: LINE, flexDirection: 'row', alignItems: 'center', gap: 7 },
  qrShareText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBold, fontSize: 11 },
  pressed: { opacity: 0.76, transform: [{ scale: 0.99 }] },
});
