import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { pluggdFonts } from '../../../src/design/typography';
import { loadCarnivalHub, loadCarnivalStoryHtml } from '../../../src/features/carnival/carnivalService';
import { EdPressable } from '../../../src/features/editorial/EditorialBits';

const ORANGE = '#FF6600';

export default function CarnivalStoryRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const readerRef = useRef<WebView>(null);
  const { slug } = useLocalSearchParams<{ slug?: string }>();
  const storySlug = typeof slug === 'string' ? slug : '';
  const bundle = useQuery({ queryKey: ['carnival-hub', 1], queryFn: loadCarnivalHub, staleTime: 1000 * 60 * 5 });
  const story = bundle.data?.stories.find((item) => item.slug === storySlug);
  const article = useQuery({
    queryKey: ['carnival-story', story?.articleUrl],
    queryFn: () => loadCarnivalStoryHtml(story!.articleUrl),
    enabled: Boolean(story?.articleUrl),
    staleTime: 1000 * 60 * 30,
  });
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/hubs/notting-hill-carnival-2026' as any));

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <View style={[styles.header, { paddingTop: insets.top + 6, height: insets.top + 60 }]}>
        <EdPressable accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={21} color="#FFFFFF" />
        </EdPressable>
        <View style={styles.headerCopy}>
          <Text style={styles.headerEyebrow}>THE PLUG · CARNIVAL EDITION</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{story?.title ?? 'Carnival story'}</Text>
        </View>
        <EdPressable accessibilityRole="button" accessibilityLabel="Share Carnival story" onPress={() => story && Linking.openURL(story.articleUrl)} style={styles.iconButton}>
          <MaterialIcons name="open-in-new" size={19} color="#FFFFFF" />
        </EdPressable>
      </View>
      {bundle.isLoading || article.isLoading ? (
        <View style={styles.center}><ActivityIndicator color={ORANGE} /></View>
      ) : story && article.data ? (
        <WebView
          ref={readerRef}
          style={styles.reader}
          source={{ html: article.data, baseUrl: story.articleUrl }}
          originWhitelist={['about:blank', 'https://*']}
          javaScriptEnabled={false}
          domStorageEnabled={false}
          setSupportMultipleWindows={false}
          allowsLinkPreview={false}
          showsVerticalScrollIndicator={false}
          startInLoadingState
          renderLoading={() => <View style={styles.center}><ActivityIndicator color={ORANGE} /></View>}
          onShouldStartLoadWithRequest={(request) => {
            if (request.url === 'about:blank' || request.navigationType === 'other') return true;
            if (request.url.startsWith('https://')) Linking.openURL(request.url);
            return false;
          }}
          renderError={() => (
            <View style={styles.center}>
              <Text style={styles.errorTitle}>This story did not finish loading.</Text>
              <Text style={styles.errorCopy}>Check your connection, then reload the article.</Text>
              <EdPressable accessibilityRole="button" accessibilityLabel="Reload Carnival story" onPress={() => article.refetch()} style={styles.reload}><Text style={styles.reloadText}>Reload story</Text></EdPressable>
            </View>
          )}
        />
      ) : (
        <View style={styles.center}>
          <Text style={styles.errorTitle}>{story ? 'Story unavailable' : 'Story not found'}</Text>
          <Text style={styles.errorCopy}>{story ? 'Check your connection, then try this story again.' : 'This Carnival field note is not part of the current published guide.'}</Text>
          {story ? <EdPressable accessibilityRole="button" accessibilityLabel="Reload Carnival story" onPress={() => article.refetch()} style={styles.reload}><Text style={styles.reloadText}>Try again</Text></EdPressable> : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#080706' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.14)' },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, minWidth: 0 },
  headerEyebrow: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8.5, letterSpacing: 1.1 },
  headerTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.displayBold, fontSize: 14.5, marginTop: 2 },
  reader: { flex: 1, backgroundColor: '#F4EADB' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 28, backgroundColor: '#080706' },
  errorTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.displayBold, fontSize: 20, textAlign: 'center' },
  errorCopy: { color: 'rgba(255,255,255,0.62)', fontFamily: pluggdFonts.satoshiRegular, fontSize: 13.5, lineHeight: 20, textAlign: 'center' },
  reload: { minHeight: 48, paddingHorizontal: 20, borderRadius: 14, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  reloadText: { color: '#080706', fontFamily: pluggdFonts.satoshiBlack, fontSize: 13, textTransform: 'uppercase' },
});
