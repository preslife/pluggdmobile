import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { PluggdImage } from '../../src/components/PluggdImage';
import { ed, edFonts } from '../../src/design/editorial';
import { EdPressable, Eyebrow } from '../../src/features/editorial/EditorialBits';
import { toggleSavedContent } from '../../src/features/culture/mobileServices';
import {
  loadThePlugArticle,
  prepareThePlugArticleHtml,
  type ThePlugArticleDetail,
} from '../../src/features/editorial/thePlugArticleService';
import { classifyThePlugNavigation } from '../../src/features/editorial/thePlugNavigation';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

function publishedLabel(value?: string | null) {
  if (!value) return 'PLUGGD editorial';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'PLUGGD editorial';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function plainText(value?: string | null) {
  if (!value) return '';
  return value
    .replace(/<br\s*\/?>(\s*)/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li)>/gi, '\n\n')
    .replace(/<li[^>]*>/gi, '— ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export default function PlugStoryRoute() {
  const theme = usePluggdTheme();
  const styles = usePlugStoryStyles();
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const insets = useSafeAreaInsets();
  const readerRef = useRef<WebView>(null);
  const [saving, setSaving] = useState(false);
  const storyId = typeof params.id === 'string' ? params.id : '';

  const story = useQuery({
    queryKey: ['plug-story', storyId],
    enabled: Boolean(storyId),
    queryFn: () => loadThePlugArticle(storyId),
    staleTime: 1000 * 60 * 5,
  });

  const post = story.data;
  const body = plainText(post?.content);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/' as any));
  const storyUrl = post ? `https://pluggd.fm/discover/the-plug/${encodeURIComponent(post.slug || post.id)}` : null;
  const shareStory = async () => {
    if (!post || !storyUrl) return;
    await Share.share({ title: post.title, message: `${post.title}\n${storyUrl}`, url: storyUrl });
  };
  const saveStory = async () => {
    if (!post || saving) return;
    setSaving(true);
    const result = await toggleSavedContent('blog_post', post.id);
    setSaving(false);
    if (!result.success) {
      if (result.error?.toLocaleLowerCase('en-GB').includes('sign in')) {
        Alert.alert('Sign in to save stories', 'Your saved stories stay in your PLUGGD Library.', [
          { text: 'Not now', style: 'cancel' },
          { text: 'Sign in', onPress: () => router.push({ pathname: '/auth/login', params: { redirect: `/plug/${post.id}` } } as never) },
        ]);
        return;
      }
      Alert.alert('Could not update saved stories', result.error || 'Try again in a moment.');
      return;
    }
    queryClient.setQueryData<ThePlugArticleDetail | null>(['plug-story', storyId], (current) => current ? { ...current, saved: Boolean(result.saved) } : current);
  };
  const openExternalLink = (url: string) => {
    let host = 'external site';
    try { host = new URL(url).hostname.replace(/^www\./, ''); } catch { /* keep safe label */ }
    Alert.alert('Open external link?', `This story links to ${host}.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open', onPress: () => void Linking.openURL(url) },
    ]);
  };

  const header = (
    <View style={[styles.topRow, { height: insets.top + 58, paddingTop: insets.top + 6 }]}>
      <EdPressable accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={20} color={theme.colors.text} />
      </EdPressable>
      <EdPressable accessibilityRole="link" accessibilityLabel="Open THE PLUG" onPress={() => router.push('/plug' as any)} style={styles.headerTitle}>
        <Eyebrow text={post?.publication?.name || 'The Plug'} />
      </EdPressable>
      <View style={styles.headerActions}>
        <EdPressable accessibilityRole="button" accessibilityLabel={post?.saved ? 'Remove story from saved' : 'Save story'} accessibilityState={{ selected: Boolean(post?.saved), busy: saving }} disabled={!post || saving} onPress={() => void saveStory()} style={styles.headerButton}>
          {saving ? <ActivityIndicator size="small" color={theme.colors.text} /> : <MaterialIcons name={post?.saved ? 'bookmark' : 'bookmark-border'} size={20} color={theme.colors.text} />}
        </EdPressable>
        <EdPressable accessibilityRole="button" accessibilityLabel="Share story" disabled={!post} onPress={() => void shareStory()} style={styles.headerButton}>
          <MaterialIcons name="ios-share" size={20} color={theme.colors.text} />
        </EdPressable>
      </View>
    </View>
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} />
      {header}
      {story.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.accentFill} />
        </View>
      ) : story.isError ? (
        <View style={styles.readerError}>
          <MaterialIcons name="cloud-off" size={34} color={theme.colors.accentText} />
          <Text style={styles.readerErrorTitle}>This story could not load.</Text>
          <Text style={styles.readerErrorCopy}>Check your connection, then try the article again.</Text>
          <EdPressable accessibilityRole="button" accessibilityLabel="Try loading story again" onPress={() => void story.refetch()} style={styles.reloadButton}>
            <Text style={styles.reloadText}>Try again</Text>
          </EdPressable>
        </View>
      ) : post?.completeHtml ? (
        <WebView
          ref={readerRef}
          accessibilityLabel={`${post.title || 'THE PLUG'} article`}
          style={styles.webReader}
          containerStyle={styles.webReader}
          source={{ html: prepareThePlugArticleHtml(post.completeHtml, post.baseUrl), baseUrl: post.baseUrl }}
          originWhitelist={['http://*', 'https://*', 'about:blank', 'data:text/html*']}
          javaScriptEnabled={false}
          domStorageEnabled={false}
          allowFileAccess={false}
          allowUniversalAccessFromFileURLs={false}
          setSupportMultipleWindows={false}
          allowsLinkPreview={false}
          automaticallyAdjustContentInsets={false}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={false}
          startInLoadingState
          renderLoading={() => (
            <View style={styles.webLoading}>
              <ActivityIndicator color={theme.colors.accentFill} />
            </View>
          )}
          renderError={() => (
            <View style={styles.readerError}>
              <Text style={styles.readerErrorTitle}>This story did not finish loading.</Text>
              <Text style={styles.readerErrorCopy}>Your connection may have changed while the article was opening.</Text>
              <EdPressable accessibilityRole="button" accessibilityLabel="Reload article" onPress={() => readerRef.current?.reload()} style={styles.reloadButton}>
                <Text style={styles.reloadText}>Reload story</Text>
              </EdPressable>
            </View>
          )}
          onShouldStartLoadWithRequest={({ url }) => {
            const decision = classifyThePlugNavigation(url);
            if (decision.kind === 'reader') return true;
            if (decision.kind === 'native') router.push(decision.route as any);
            if (decision.kind === 'external') openExternalLink(decision.url);
            return false;
          }}
          onContentProcessDidTerminate={() => readerRef.current?.reload()}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 120 }}
        >
          {post ? (
          <View style={styles.article}>
            <Text style={styles.title}>{post.title}</Text>
            {post.dek ? <Text style={styles.dek}>{post.dek}</Text> : null}
            <Text style={styles.meta}>{[
              post.authorName ? `By ${post.authorName}` : null,
              post.publication?.name,
              post.edition,
              publishedLabel(post.publishedAt || post.createdAt),
              post.readTimeMinutes ? `${post.readTimeMinutes} min read` : null,
            ].filter(Boolean).join(' · ')}</Text>
            {post.featuredImageUrl ? (
              <View style={styles.imageWrap}>
                <PluggdImage uri={post.featuredImageUrl} style={styles.image} />
              </View>
            ) : null}
            {post.tags?.length ? (
              <View style={styles.tagRow}>
                {post.tags.slice(0, 4).map((tag) => (
                  <View key={tag} style={styles.tag}>
                    <Text style={styles.tagText}>{tag.toUpperCase()}</Text>
                  </View>
                ))}
              </View>
            ) : null}
            <Text style={styles.body}>{body}</Text>
          </View>
          ) : (
          <View style={styles.article}>
            <Text style={styles.title}>Story unavailable</Text>
            <Text style={styles.body}>This story is no longer published. Fresh dispatches land on the home feed.</Text>
          </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}

function usePlugStoryStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.divider,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
  },
  headerTitle: { position: 'absolute', left: 78, right: 78, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  headerActions: { flexDirection: 'row', gap: 4 },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.controlBorder,
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  webReader: { flex: 1, backgroundColor: theme.colors.background },
  webLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  readerError: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 9, backgroundColor: theme.colors.background },
  readerErrorTitle: { fontFamily: edFonts.serif, fontSize: 25, lineHeight: 30, textAlign: 'center', color: theme.colors.text },
  readerErrorCopy: { fontFamily: edFonts.bodyMedium, fontSize: 14, lineHeight: 20, textAlign: 'center', color: theme.colors.textSecondary },
  reloadButton: { minHeight: 48, marginTop: 8, paddingHorizontal: 20, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentFill },
  reloadText: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: theme.colors.onAccent },
  article: { paddingHorizontal: 20, gap: 14 },
  title: {
    fontFamily: edFonts.serif,
    fontSize: 34,
    lineHeight: 37,
    letterSpacing: -0.5,
    color: theme.colors.text,
    marginTop: 8,
  },
  dek: { fontFamily: edFonts.bodyMedium, fontSize: 18, lineHeight: 27, color: theme.colors.textSecondary },
  meta: { fontFamily: edFonts.mono, fontSize: 11, letterSpacing: 1.6, color: theme.colors.textMuted, textTransform: 'uppercase' },
  imageWrap: { borderRadius: ed.radius, overflow: 'hidden', marginTop: 4 },
  image: { width: '100%', height: 230 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { fontFamily: edFonts.bodyBlack, fontSize: 9.5, letterSpacing: 1, color: theme.colors.textSecondary },
  body: {
    fontFamily: edFonts.bodyMedium,
    fontSize: 16,
    lineHeight: 26,
    color: theme.colors.text,
    marginTop: 4,
  },
  }), [theme]);
}
