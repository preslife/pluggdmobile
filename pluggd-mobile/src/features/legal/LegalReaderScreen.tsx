import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pluggdFonts } from '../../design/typography';
import { useBottomChromeInset } from '../../design/useBottomChromeInset';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import type { NativeLegalBlock, NativeLegalDocument } from './legalContent';

function LegalBlock({ block }: { block: NativeLegalBlock }) {
  const theme = usePluggdTheme();

  if (block.type === 'paragraph') {
    return (
      <Text
        style={[
          styles.paragraph,
          { color: block.tone === 'muted' ? theme.colors.textSubtle : theme.colors.textMuted },
          block.tone === 'strong' && styles.strong,
          block.tone === 'italic' && styles.italic,
        ]}
      >
        {block.text}
      </Text>
    );
  }

  if (block.type === 'bullets') {
    return (
      <View style={styles.blockStack}>
        {block.heading ? <Text style={[styles.label, { color: theme.colors.text }]}>{block.heading}</Text> : null}
        {block.intro ? <Text style={[styles.paragraph, { color: theme.colors.textMuted }]}>{block.intro}</Text> : null}
        {block.items.map((item, index) => (
          <View key={`${item}-${index}`} style={styles.bulletRow}>
            <View style={[styles.bullet, { backgroundColor: theme.colors.accentFill }]} />
            <Text style={[styles.bulletText, { color: theme.colors.textMuted }]}>{item}</Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <View style={styles.labelledList}>
      {block.items.map((item) => (
        <View key={item.label} style={[styles.labelledItem, { borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }]}>
          <Text style={[styles.label, { color: theme.colors.text }]}>{item.label}</Text>
          <Text style={[styles.labelledText, { color: theme.colors.textMuted }]}>{item.text}</Text>
        </View>
      ))}
    </View>
  );
}

export function LegalReaderScreen({ document }: { document: NativeLegalDocument }) {
  const router = useRouter();
  const theme = usePluggdTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomChromeInset();

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/' as any);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12), borderBottomColor: theme.colors.border, backgroundColor: theme.colors.background }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Close ${document.title}`}
          onPress={close}
          style={({ pressed }) => [styles.closeButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }, pressed && styles.pressed]}
        >
          <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.colors.text} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={[styles.headerEyebrow, { color: theme.colors.accent }]}>PLUGGD LEGAL</Text>
          <Text style={[styles.headerTitle, { color: theme.colors.text }]} numberOfLines={1}>{document.title}</Text>
        </View>
        <View style={styles.headerBalance} />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}
      >
        <View style={styles.hero}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.colors.text }]}>{document.title}</Text>
          <Text style={[styles.updated, { color: theme.colors.textSubtle }]}>{document.lastUpdated}</Text>
          {document.intro.map((block, index) => <LegalBlock key={`intro-${index}`} block={block} />)}
        </View>

        {document.sections.map((section) => (
          <View key={`${section.number}-${section.title}`} style={[styles.section, { borderTopColor: theme.colors.border }]}>
            <Text style={[styles.sectionNumber, { color: theme.colors.accent }]}>SECTION {section.number}</Text>
            <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.colors.text }]}>{section.title}</Text>
            <View style={styles.blockStack}>
              {section.blocks.map((block, index) => <LegalBlock key={`${section.number}-${index}`} block={block} />)}
            </View>
          </View>
        ))}

        {document.contact ? (
          <View
            style={[styles.contact, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}
          >
            {document.contact.number ? <Text style={[styles.sectionNumber, { color: theme.colors.accent }]}>SECTION {document.contact.number}</Text> : null}
            <Text accessibilityRole="header" style={[styles.contactTitle, { color: theme.colors.text }]}>{document.contact.title}</Text>
            <Text style={[styles.paragraph, { color: theme.colors.textMuted }]}>{document.contact.body}</Text>
            <Text selectable style={[styles.email, { color: theme.colors.accent }]}>{document.contact.emailLabel}: {document.contact.email}</Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { minHeight: 74, paddingHorizontal: 14, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-end', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  closeButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  headerCopy: { flex: 1, minWidth: 0, paddingBottom: 2 },
  headerEyebrow: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.4 },
  headerTitle: { marginTop: 2, fontFamily: pluggdFonts.satoshiBold, fontSize: 16, lineHeight: 20 },
  headerBalance: { width: 44 },
  content: { paddingHorizontal: 18, paddingTop: 26, gap: 28 },
  hero: { gap: 12, paddingBottom: 6 },
  title: { fontFamily: pluggdFonts.displayExtraBold, fontSize: 38, lineHeight: 42, letterSpacing: -0.8 },
  updated: { fontFamily: pluggdFonts.satoshiBold, fontSize: 11, lineHeight: 16, letterSpacing: 0.5, textTransform: 'uppercase' },
  section: { paddingTop: 22, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
  sectionNumber: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, lineHeight: 13, letterSpacing: 1.35 },
  sectionTitle: { fontFamily: pluggdFonts.displayBold, fontSize: 25, lineHeight: 30, letterSpacing: -0.25 },
  blockStack: { gap: 11 },
  paragraph: { fontFamily: pluggdFonts.satoshiRegular, fontSize: 14, lineHeight: 22 },
  strong: { fontFamily: pluggdFonts.satoshiBold },
  italic: { fontStyle: 'italic' },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingRight: 4 },
  bullet: { width: 5, height: 5, borderRadius: 3, marginTop: 8 },
  bulletText: { flex: 1, fontFamily: pluggdFonts.satoshiRegular, fontSize: 14, lineHeight: 21 },
  labelledList: { gap: 8 },
  labelledItem: { borderWidth: StyleSheet.hairlineWidth, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, gap: 4 },
  label: { fontFamily: pluggdFonts.satoshiBold, fontSize: 13, lineHeight: 17 },
  labelledText: { fontFamily: pluggdFonts.satoshiRegular, fontSize: 13.5, lineHeight: 20 },
  contact: { marginTop: 2, borderWidth: 1, borderRadius: 18, padding: 18, gap: 7 },
  contactTitle: { fontFamily: pluggdFonts.displayBold, fontSize: 23, lineHeight: 28 },
  email: { fontFamily: pluggdFonts.satoshiBold, fontSize: 14, lineHeight: 20 },
});
