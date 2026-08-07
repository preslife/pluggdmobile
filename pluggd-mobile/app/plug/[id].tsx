import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useRef } from 'react';
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { PluggdImage } from '../../src/components/PluggdImage';
import { ed, edFonts } from '../../src/design/editorial';
import { EdPressable, Eyebrow } from '../../src/features/editorial/EditorialBits';
import { safeMaybe } from '../../src/features/culture/mobileServices';
import { supabase } from '../../src/lib/supabase';

type BlogPostDetail = {
  id: string;
  title: string | null;
  excerpt: string | null;
  content: string | null;
  html_content: string | null;
  featured_image_url: string | null;
  tags: string[] | null;
  created_at: string | null;
};

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

function mobileReaderHtml(value: string) {
  const overrides = `
    <style id="pluggd-reader-overrides">
      @media (max-width: 760px) {
        .lede-sidebar,
        .lede-divider { display: none !important; }
        .lede-block { display: block !important; }
        .lede-text { width: 100% !important; max-width: none !important; }
      }
    </style>
  `;
  return /<\/head>/i.test(value)
    ? value.replace(/<\/head>/i, `${overrides}</head>`)
    : `${overrides}${value}`;
}

export default function PlugStoryRoute() {
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const readerRef = useRef<WebView>(null);
  const storyId = typeof params.id === 'string' ? params.id : '';

  const story = useQuery({
    queryKey: ['plug-story', storyId],
    enabled: Boolean(storyId),
    queryFn: () =>
      safeMaybe<BlogPostDetail>(
        (supabase as any)
          .from('blog_posts')
          .select('id,title,excerpt,content,html_content,featured_image_url,tags,created_at')
          .eq('id', storyId)
          .eq('is_published', true)
          .maybeSingle(),
      ),
    staleTime: 1000 * 60 * 5,
  });

  const post = story.data;
  const body = plainText(post?.content) || post?.excerpt || '';
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/' as any));

  const header = (
    <View style={[styles.topRow, { height: insets.top + 58, paddingTop: insets.top + 6 }]}>
      <EdPressable accessibilityRole="button" accessibilityLabel="Go back" onPress={goBack} style={styles.backButton}>
        <MaterialIcons name="arrow-back" size={20} color={ed.ink} />
      </EdPressable>
      <Eyebrow text="The Plug" />
      <View style={{ width: 44 }} />
    </View>
  );

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      {header}
      {story.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={ed.orange} />
        </View>
      ) : post?.html_content ? (
        <WebView
          ref={readerRef}
          accessibilityLabel={`${post.title || 'THE PLUG'} article`}
          style={styles.webReader}
          containerStyle={styles.webReader}
          source={{ html: mobileReaderHtml(post.html_content) }}
          originWhitelist={['*']}
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
              <ActivityIndicator color={ed.orange} />
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
            if (url.startsWith('about:blank') || url.startsWith('data:text/html')) return true;
            if (url.startsWith('https://') || url.startsWith('http://')) {
              void Linking.openURL(url);
            }
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
            <Text style={styles.title}>{post.title || 'PLUGGD story'}</Text>
            <Text style={styles.meta}>{publishedLabel(post.created_at)}</Text>
            {post.featured_image_url ? (
              <View style={styles.imageWrap}>
                <PluggdImage uri={post.featured_image_url} style={styles.image} />
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
            {body ? <Text style={styles.body}>{body}</Text> : (
              <View style={styles.bodyUnavailable}>
                <Text style={styles.bodyUnavailableTitle}>This dispatch is being prepared.</Text>
                <Text style={styles.bodyUnavailableCopy}>Return to THE PLUG for the latest published stories.</Text>
              </View>
            )}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: ed.paper },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ed.paperLine,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,23,15,0.06)',
  },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  webReader: { flex: 1, backgroundColor: ed.paper },
  webLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ed.paper,
  },
  readerError: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28, gap: 9, backgroundColor: ed.paper },
  readerErrorTitle: { fontFamily: edFonts.serif, fontSize: 25, lineHeight: 30, textAlign: 'center', color: ed.ink },
  readerErrorCopy: { fontFamily: edFonts.bodyMedium, fontSize: 14, lineHeight: 20, textAlign: 'center', color: ed.inkMuted },
  reloadButton: { minHeight: 48, marginTop: 8, paddingHorizontal: 20, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: ed.orange },
  reloadText: { fontFamily: edFonts.bodyBlack, fontSize: 13, color: ed.onOrange },
  article: { paddingHorizontal: 20, gap: 14 },
  title: {
    fontFamily: edFonts.serif,
    fontSize: 34,
    lineHeight: 37,
    letterSpacing: -0.5,
    color: ed.ink,
    marginTop: 8,
  },
  meta: { fontFamily: edFonts.mono, fontSize: 11, letterSpacing: 1.6, color: ed.inkSoft, textTransform: 'uppercase' },
  imageWrap: { borderRadius: ed.radius, overflow: 'hidden', marginTop: 4 },
  image: { width: '100%', height: 230 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: ed.paperLine,
    backgroundColor: 'rgba(255,255,255,0.6)',
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  tagText: { fontFamily: edFonts.bodyBlack, fontSize: 9.5, letterSpacing: 1, color: ed.inkMuted },
  body: {
    fontFamily: edFonts.bodyMedium,
    fontSize: 16,
    lineHeight: 26,
    color: 'rgba(34,23,15,0.88)',
    marginTop: 4,
  },
  bodyUnavailable: {
    gap: 6,
    marginTop: 6,
    padding: 18,
    borderRadius: ed.radius,
    borderWidth: 1,
    borderColor: ed.paperLine,
    backgroundColor: 'rgba(255,255,255,0.46)',
  },
  bodyUnavailableTitle: { fontFamily: edFonts.bodyBlack, fontSize: 16, color: ed.ink },
  bodyUnavailableCopy: { fontFamily: edFonts.bodyMedium, fontSize: 14, lineHeight: 20, color: ed.inkMuted },
});
