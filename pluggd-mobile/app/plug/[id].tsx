import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

/** Strips basic HTML so stored rich text reads cleanly in the app. */
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
  const params = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const storyId = typeof params.id === 'string' ? params.id : '';

  const story = useQuery({
    queryKey: ['plug-story', storyId],
    enabled: Boolean(storyId),
    queryFn: () =>
      safeMaybe<BlogPostDetail>(
        (supabase as any)
          .from('blog_posts')
          .select('id,title,excerpt,content,featured_image_url,tags,created_at')
          .eq('id', storyId)
          .eq('is_published', true)
          .maybeSingle(),
      ),
    staleTime: 1000 * 60 * 5,
  });

  const post = story.data;
  const body = plainText(post?.content) || post?.excerpt || '';

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="dark" />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 120 }}
      >
        <View style={styles.topRow}>
          <EdPressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/' as any))}
            style={styles.backButton}
          >
            <MaterialIcons name="arrow-back" size={20} color={ed.ink} />
          </EdPressable>
          <Eyebrow text="The Plug" />
          <View style={{ width: 40 }} />
        </View>
        {story.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={ed.orange} />
          </View>
        ) : post ? (
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
            <Text style={styles.body}>{body}</Text>
          </View>
        ) : (
          <View style={styles.article}>
            <Text style={styles.title}>Story unavailable</Text>
            <Text style={styles.body}>This story is no longer published. Fresh dispatches land on the home feed.</Text>
          </View>
        )}
      </ScrollView>
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
    marginBottom: 10,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,23,15,0.06)',
  },
  loading: { paddingVertical: 80, alignItems: 'center' },
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
});
