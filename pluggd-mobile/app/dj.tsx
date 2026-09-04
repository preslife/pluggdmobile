import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { pluggdFonts } from '../src/design/typography';
import { edFonts } from '../src/design/editorial';
import { usePluggdTheme } from '../src/design/usePluggdTheme';

const DJ_ART = require('../assets/web-parity/discover/pluggd-mixes.jpg');
const ORANGE = '#FF6600';

export default function PluggdDjRoute() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const styles = useDjStyles();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 90 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image source={DJ_ART} resizeMode="cover" style={StyleSheet.absoluteFillObject} />
          <LinearGradient colors={['rgba(7,6,5,0.18)', 'rgba(7,6,5,0.72)', '#080706']} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFillObject} />
          <View style={[styles.top, { paddingTop: insets.top + 76 }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={styles.back}><MaterialIcons name="arrow-back" size={22} color="#FFF" /></Pressable>
          </View>
          <View style={styles.heroCopy}>
            <Text style={styles.kicker}>PLUGGD DJ</Text>
            <Text style={styles.title}>Your library.{`\n`}Ready for the booth.</Text>
            <Text style={styles.body}>Build your mix catalogue on iPhone, then load the full PLUGGD DJ workspace when you are at your Mac.</Text>
          </View>
        </View>
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" accessibilityLabel="Open mix catalogue" onPress={() => router.push('/studio/catalog?tab=mixes' as any)} style={styles.primary}><MaterialIcons name="library-music" size={20} color={theme.colors.onAccent} /><Text style={styles.primaryText}>Open my mix catalogue</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Prepare a new mix" onPress={() => router.push('/creator/upload?type=mix' as any)} style={styles.secondary}><MaterialIcons name="add-circle-outline" size={20} color={theme.colors.text} /><Text style={styles.secondaryText}>Prepare a new mix</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Explore published mixes" onPress={() => router.push('/mixes' as any)} style={styles.textAction}><Text style={styles.textActionLabel}>Explore published mixes</Text><MaterialIcons name="arrow-forward" size={18} color={theme.colors.accentText} /></Pressable>
        </View>
        <View style={styles.featureGrid}>
          {[
            ['graphic-eq', 'Full-colour decks', 'Waveforms, cueing and a focused two-deck mixing surface on Mac.'],
            ['library-music', 'Your PLUGGD library', 'Published releases, beats and mixes ready to load from your account.'],
            ['cloud-done', 'Creator workflow', 'Prepare metadata and publish mixes back through Creator Studio.'],
          ].map(([icon, title, body]) => <View key={title} style={styles.feature}><MaterialIcons name={icon as any} size={23} color={theme.colors.accentText} /><Text style={styles.featureTitle}>{title}</Text><Text style={styles.featureBody}>{body}</Text></View>)}
        </View>
      </ScrollView>
    </View>
  );
}

function useDjStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  hero: { minHeight: 560, justifyContent: 'space-between', overflow: 'hidden' },
  top: { paddingHorizontal: 18, zIndex: 2 },
  back: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(8,7,6,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  heroCopy: { padding: 20, paddingBottom: 28, gap: 10 },
  kicker: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 2 },
  title: { color: '#FFF8ED', fontFamily: edFonts.serif, fontSize: 42, lineHeight: 43, letterSpacing: -0.7 },
  body: { color: 'rgba(255,248,237,0.72)', fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 21, maxWidth: 340 },
  actions: { padding: 20, gap: 10 },
  primary: { minHeight: 54, paddingHorizontal: 16, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13.5 },
  secondary: { minHeight: 54, paddingHorizontal: 16, borderWidth: 1, borderColor: theme.colors.controlBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  secondaryText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13.5 },
  textAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  textActionLabel: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  featureGrid: { paddingHorizontal: 20, gap: 1 },
  feature: { minHeight: 148, padding: 18, backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border, gap: 7 },
  featureTitle: { color: theme.colors.text, fontFamily: edFonts.serif, fontSize: 21 },
  featureBody: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12.5, lineHeight: 18 },
}), [theme]);
}
