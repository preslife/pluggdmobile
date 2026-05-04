import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ContextRail, EmptyState, ListCard, ScreenShell, SectionTitle } from '../../components/ContentUI';
import { useAuth } from '../../src/context/AuthProvider';
import { supabase } from '../../src/lib/supabase';
import { FanMapPlugItem, PLUGGD_ORANGE, SocialPostItem, formatCompact } from '../../src/lib/mobileContent';

const TABS = ['Feed', 'Forum', 'Map', 'Hubs'];

export default function CommunityScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Feed');
  const [posts, setPosts] = useState<SocialPostItem[]>([]);
  const [plugs, setPlugs] = useState<FanMapPlugItem[]>([]);
  const [composer, setComposer] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [postRes, plugRes] = await Promise.all([
      (supabase as any)
        .from('social_posts')
        .select('id,body,user_id,destinations,media_paths,status,created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(40),
      (supabase as any)
        .from('fan_map_plugs')
        .select('id,display_name,city,country,lat,lng,message,tip_amount,creator_id,user_id,is_featured,created_at')
        .order('created_at', { ascending: false })
        .limit(40),
    ]);
    setPosts(Array.isArray(postRes.data) ? (postRes.data as SocialPostItem[]) : []);
    setPlugs(Array.isArray(plugRes.data) ? (plugRes.data as FanMapPlugItem[]) : []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const publishPost = async () => {
    if (!user?.id || !composer.trim()) return;
    const body = composer.trim();
    setComposer('');
    await (supabase as any).from('social_posts').insert({
      user_id: user.id,
      body,
      destinations: ['pluggd'],
      status: 'published',
    });
    await load();
  };

  return (
    <ScreenShell
      title="Community"
      subtitle="Feed, forum signals, fan map, and scene activity from across Pluggd."
      action={
        <Pressable style={styles.actionButton} onPress={() => setActiveTab('Map')}>
          <MaterialIcons name="map" size={19} color="#FFFFFF" />
          <Text style={styles.actionText}>Map</Text>
        </Pressable>
      }
    >
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <ContextRail tabs={TABS} active={activeTab} onChange={setActiveTab} />

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={PLUGGD_ORANGE} />
        </View>
      ) : null}

      {!loading && activeTab === 'Feed' ? (
        <>
          {user ? (
            <View style={styles.composerCard}>
              <TextInput
                value={composer}
                onChangeText={setComposer}
                placeholder="Post to the Pluggd community..."
                placeholderTextColor="#777777"
                style={styles.composerInput}
                multiline
              />
              <View style={styles.composerFooter}>
                <Text style={styles.composerHint}>Hashtags, updates, drops, events</Text>
                <Pressable style={styles.postButton} onPress={publishPost}>
                  <Text style={styles.postButtonText}>Post</Text>
                </Pressable>
              </View>
            </View>
          ) : null}

          <SectionTitle title="Live feed" />
          {posts.length === 0 ? <EmptyState title="No posts yet" body="Creator posts and community updates will appear here." /> : null}
          {posts.map((post) => (
            <Pressable key={post.id} style={styles.postCard}>
              <View style={styles.avatar}>
                <MaterialIcons name="person" size={21} color={PLUGGD_ORANGE} />
              </View>
              <View style={styles.postText}>
                <Text style={styles.postAuthor}>Pluggd member</Text>
                <Text style={styles.postBody}>{post.body}</Text>
                <View style={styles.postActions}>
                  <Text style={styles.postAction}>Like</Text>
                  <Text style={styles.postAction}>Comment</Text>
                  <Text style={styles.postAction}>Repost</Text>
                </View>
              </View>
            </Pressable>
          ))}
        </>
      ) : null}

      {!loading && activeTab === 'Forum' ? (
        <>
          <SectionTitle title="Forum signals" />
          <ListCard title="Collaboration requests" subtitle="Find producers, vocalists, DJs and promoters" meta={`${formatCompact(posts.length)} recent community posts`} icon="chevron-right" onPress={() => router.push('/pro/collab' as any)} />
          <ListCard title="Trending hashtags" subtitle="#newmusic #opendecks #beats #soundboards" meta="Community topics" icon="chevron-right" />
          <ListCard title="Daily prompt" subtitle="What are you working on today?" meta="Post to join the thread" icon="chevron-right" />
        </>
      ) : null}

      {!loading && activeTab === 'Map' ? (
        <>
          <SectionTitle title="Fan Map" />
          <View style={styles.mapFallback}>
            <MaterialIcons name="public" size={38} color={PLUGGD_ORANGE} />
            <Text style={styles.mapTitle}>Pluggd Map</Text>
            <Text style={styles.mapBody}>
              Native map rendering can be enabled once the production map token is wired. This list uses the live Fan Map data.
            </Text>
          </View>
          {plugs.length === 0 ? <EmptyState title="No map plugs yet" /> : null}
          {plugs.map((plug) => (
            <ListCard
              key={plug.id}
              title={plug.display_name}
              subtitle={plug.message || `${plug.city}, ${plug.country}`}
              meta={`${plug.city}, ${plug.country}${plug.tip_amount ? ` · ${plug.tip_amount} credits tipped` : ''}`}
              icon="place"
            />
          ))}
        </>
      ) : null}

      {!loading && activeTab === 'Hubs' ? (
        <>
          <SectionTitle title="Scene hubs" />
          <ListCard title="Soundboards" subtitle="Open creator boards and process rooms" meta="Community workspace" onPress={() => router.push('/soundboards' as any)} />
          <ListCard title="Events" subtitle="Local scenes, venues and promoters" meta="Find what is happening" onPress={() => router.push('/events' as any)} />
          <ListCard title="Academy" subtitle="Courses, quests and learning paths" meta="Learn and level up" onPress={() => router.push('/gamification/courses' as any)} />
        </>
      ) : null}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  actionButton: {
    minHeight: 42,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  loading: {
    minHeight: 160,
    alignItems: 'center',
    justifyContent: 'center',
  },
  composerCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    padding: 12,
    marginBottom: 16,
  },
  composerInput: {
    minHeight: 76,
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    textAlignVertical: 'top',
  },
  composerFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 8,
  },
  composerHint: {
    flex: 1,
    color: '#888888',
    fontSize: 12,
    fontWeight: '700',
  },
  postButton: {
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  postButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  postCard: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    padding: 12,
    flexDirection: 'row',
    marginBottom: 9,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#21130E',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
  },
  postText: {
    flex: 1,
  },
  postAuthor: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  postBody: {
    color: '#D8D8D8',
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '600',
    marginTop: 5,
  },
  postActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  postAction: {
    color: PLUGGD_ORANGE,
    fontSize: 12,
    fontWeight: '900',
  },
  mapFallback: {
    minHeight: 150,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    marginBottom: 12,
  },
  mapTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginTop: 8,
  },
  mapBody: {
    color: '#AFAFAF',
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
});

