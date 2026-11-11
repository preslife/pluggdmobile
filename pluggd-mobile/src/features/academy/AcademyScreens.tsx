import { MaterialIcons } from '@expo/vector-icons';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, AppState, Image, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAuth } from '../../context/AuthProvider';
import { usePlayback } from '../../context/PlaybackProvider';
import { edFonts } from '../../design/editorial';
import { useBottomChromeInset } from '../../design/useBottomChromeInset';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { DiscoveryHeader } from '../discovery/DiscoveryHeader';
import { AcademyUnavailableError } from './academyApi';
import { academyApi } from './client';
import { academyCopy as c } from './copy';
import { resumeLesson, safeAcademyUrl, type AcademyCourse, type AcademyDetail, type AcademyLesson, type AcademyProgress } from './contracts';
import { nativeLessonText, practiceQuestions } from './lessonText';

function Action({ children, onPress, disabled = false, primary = false, label }: {
  children: ReactNode; onPress: () => void; disabled?: boolean; primary?: boolean; label?: string;
}) {
  const { colors } = usePluggdTheme();
  // These inline style callbacks must reach the native Pressable unchanged.
  return <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }} disabled={disabled} onPress={onPress}
    style={({ pressed }) => [styles.action, { backgroundColor: primary ? colors.accentFill : colors.surfaceStrong,
      borderColor: colors.controlBorder, opacity: disabled ? 0.5 : pressed ? 0.75 : 1 }]}>
    <Text style={[styles.actionText, { color: primary ? colors.onAccent : colors.text }]}>{children}</Text>
  </Pressable>;
}

function Message({ title, help, retry, loading = false }: { title: string; help?: string; retry?: () => void; loading?: boolean }) {
  const { colors } = usePluggdTheme();
  return <View style={[styles.message, { backgroundColor: colors.surface, borderColor: colors.border }]} accessibilityLiveRegion="polite">
    {loading && <ActivityIndicator color={colors.accentText} accessibilityLabel={title} />}
    <Text style={[styles.heading, { color: colors.text }]}>{title}</Text>
    {help && <Text style={[styles.body, { color: colors.textSecondary }]}>{help}</Text>}
    {retry && <Action onPress={retry}>{c.retry}</Action>}
  </View>;
}

function Shell({ children, refresh, refreshing = false }: { children: ReactNode; refresh?: () => void; refreshing?: boolean }) {
  const theme = usePluggdTheme(); const bottom = useBottomChromeInset();
  return <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: bottom + 24 }}
      refreshControl={refresh ? <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.accentText} /> : undefined}>
      <DiscoveryHeader />
      <View style={styles.page}>{children}</View>
    </ScrollView>
  </View>;
}

function CourseCard({ course }: { course: AcademyCourse }) {
  const router = useRouter(); const { colors } = usePluggdTheme(); const [imageFailed, setImageFailed] = useState(false);
  return <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={`${course.title}, ${c.free}, ${course.lessonCount} lessons`}
    onPress={() => router.push(`/learn/${encodeURIComponent(course.identifier)}` as any)}
    style={({ pressed }) => [styles.course, { backgroundColor: colors.surfaceStrong, borderColor: colors.border, opacity: pressed ? 0.8 : 1 }]}>
    {course.image && !imageFailed ? <Image source={{ uri: course.image }} style={styles.artwork} onError={() => setImageFailed(true)} accessibilityIgnoresInvertColors />
      : <View style={[styles.artwork, styles.artworkPlaceholder, { backgroundColor: colors.accentSoft }]}><MaterialIcons name="school" size={42} color={colors.accentText} /></View>}
    <View style={styles.cardCopy}>
      <Text style={[styles.eyebrow, { color: colors.accentText }]}>{c.free}</Text>
      <Text style={[styles.heading, { color: colors.text }]}>{course.title}</Text>
      {!!course.description && <Text numberOfLines={3} style={[styles.body, { color: colors.textSecondary }]}>{course.description}</Text>}
      <Text style={[styles.meta, { color: colors.textMuted }]}>{[course.difficulty, `${course.lessonCount} lessons`, course.minutes ? `${Math.round(course.minutes)} min` : ''].filter(Boolean).join(' · ')}</Text>
      <Text style={[styles.actionText, { color: colors.accentText }]}>Explore course →</Text>
    </View>
  </Pressable>;
}

export function AcademyCatalogueScreen() {
  const { user, loading } = useAuth();
  return <Catalogue key={user?.id ?? 'guest'} actor={loading ? undefined : user?.id ?? null} />;
}

function Catalogue({ actor }: { actor: string | null | undefined }) {
  const { colors } = usePluggdTheme(); const [search, setSearch] = useState('');
  const [settledSearch, setSettledSearch] = useState('');
  useEffect(() => { const timer = setTimeout(() => setSettledSearch(search.trim()), 300); return () => clearTimeout(timer); }, [search]);
  const query = useInfiniteQuery({ queryKey: ['academy', actor, 'catalogue', settledSearch], initialPageParam: 0,
    queryFn: ({ pageParam }) => academyApi.catalogue(pageParam, settledSearch), getNextPageParam: page => page.nextOffset,
    enabled: actor !== undefined, staleTime: 0, gcTime: 0, retry: 1 });
  const refresh = useCallback(() => { if (actor !== undefined) void query.refetch(); }, [actor, query.refetch]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  useEffect(() => { const sub = AppState.addEventListener('change', state => { if (state === 'active') refresh(); }); return () => sub.remove(); }, [refresh]);
  const rows = [...new Map(query.data?.pages.flatMap(page => page.courses).map(course => [`${course.system}:${course.id}`, course])).values()];
  const filtered = rows;
  return <Shell refresh={refresh} refreshing={query.isRefetching}>
    <View style={styles.hero}>
      <Text style={[styles.eyebrow, { color: colors.accentText }]}>{c.eyebrow}</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{c.title}</Text>
      <Text style={[styles.lead, { color: colors.text }]}>{c.intro}</Text>
      <Text style={[styles.body, { color: colors.textSecondary }]}>{c.subtitle}</Text>
    </View>
    <TextInput accessibilityLabel={c.search} placeholder={c.search} placeholderTextColor={colors.textMuted} value={search} onChangeText={setSearch}
      style={[styles.search, { color: colors.text, backgroundColor: colors.surfaceStrong, borderColor: colors.controlBorder }]} returnKeyType="search" />
    {(query.isPending || actor === undefined) ? <Message title={c.loading} loading /> : query.isError && !query.isFetchNextPageError ? <Message title={c.loadFailed} retry={refresh} /> : <>
      <View style={styles.grid}>{filtered.map(course => <CourseCard key={`${course.system}:${course.id}`} course={course} />)}</View>
      {!filtered.length && <Message title={settledSearch ? c.noMatches : c.empty} help={query.hasNextPage ? c.exploreMore : settledSearch ? undefined : c.emptyHelp} />}
      {query.isFetchNextPageError && <Message title={c.loadFailed} retry={() => { void query.fetchNextPage(); }} />}
      {query.hasNextPage && <Action disabled={query.isFetchingNextPage} onPress={() => { void query.fetchNextPage(); }}>{query.isFetchingNextPage ? c.loading : c.more}</Action>}
    </>}
  </Shell>;
}

export function AcademyCourseScreen({ identifier }: { identifier: string }) {
  const { user, loading } = useAuth();
  return <Course key={`${user?.id ?? 'guest'}:${identifier}`} identifier={identifier} actor={loading ? undefined : user?.id ?? null} />;
}

function Course({ identifier, actor }: { identifier: string; actor: string | null | undefined }) {
  const router = useRouter();
  const query = useQuery({ queryKey: ['academy', actor, 'detail', identifier], queryFn: () => academyApi.detail(identifier),
    enabled: actor !== undefined && !!identifier, gcTime: 0, staleTime: 0, retry: (attempt, error) => !(error instanceof AcademyUnavailableError) && attempt < 1 });
  const refresh = useCallback(() => { void query.refetch(); }, [query.refetch]);
  useFocusEffect(useCallback(() => { if (actor !== undefined) refresh(); }, [actor, refresh]));
  useEffect(() => { const sub = AppState.addEventListener('change', state => { if (state === 'active') refresh(); }); return () => sub.remove(); }, [refresh]);
  const unavailable = query.error instanceof AcademyUnavailableError;
  return <Shell refresh={refresh} refreshing={query.isRefetching}>
    <Action onPress={() => router.replace('/learn' as any)}>{c.back}</Action>
    {query.isPending || actor === undefined ? <Message title={c.loading} loading /> : query.isError ? <Message title={unavailable ? c.unavailable : c.detailFailed}
      help={unavailable ? c.unavailableHelp : undefined} retry={unavailable ? undefined : refresh} />
      : query.data && <Reader key={`${query.data.course.system}:${query.data.course.id}`} detail={query.data} actor={actor ?? null} />}
  </Shell>;
}

function Reader({ detail, actor }: { detail: AcademyDetail; actor: string | null }) {
  const { colors } = usePluggdTheme(); const router = useRouter(); const client = useQueryClient();
  const [selected, setSelected] = useState<string>(); const [saving, setSaving] = useState(false); const [saved, setSaved] = useState(false);
  const [failed, setFailed] = useState<{ id: string; completed: boolean | null }>(); const [mediaReady, setMediaReady] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const active = useRef(true); const busy = useRef(false);
  useEffect(() => { active.current = true; return () => { active.current = false; }; }, []);
  const progressKey = ['academy', actor, 'progress', detail.course.system, detail.course.id];
  const progress = useQuery({ queryKey: progressKey, queryFn: () => academyApi.progress(actor!, detail),
    enabled: !!actor && !!detail.lessons.length, gcTime: 0, staleTime: 0, retry: 1 });
  const refresh = useCallback(() => { if (actor && !busy.current) void progress.refetch(); }, [actor, progress.refetch]);
  useFocusEffect(useCallback(() => { refresh(); }, [refresh]));
  useEffect(() => { const sub = AppState.addEventListener('change', state => { if (state === 'active') refresh(); }); return () => sub.remove(); }, [refresh]);
  const save = async (id: string, completed: boolean | null) => {
    if (!actor || busy.current || !progress.isSuccess) return;
    busy.current = true; setSaving(true); setSaved(false); setFailed(undefined);
    try {
      await client.cancelQueries({ queryKey: progressKey, exact: true });
      if (!active.current) return;
      const result = await academyApi.save(actor, detail, id, completed);
      if (active.current) { client.setQueryData<AcademyProgress>(progressKey, result); setSaved(true); }
    } catch (error) {
      if (active.current) {
        if (error instanceof AcademyUnavailableError) setBlocked(true);
        else setFailed({ id, completed });
      }
    }
    finally { busy.current = false; if (active.current) setSaving(false); }
  };
  const select = (id?: string) => { if (!id || busy.current) return; setSelected(id); setMediaReady(false); void save(id, null); };
  const lesson = detail.lessons.find(item => item.id === selected); const index = detail.lessons.findIndex(item => item.id === selected);
  const completed = progress.data?.completed ?? [];
  const contentAvailable = !!lesson && (lesson.format === 'quiz' ? !!practiceQuestions(lesson) : !!nativeLessonText(lesson).trim()) || mediaReady || !!lesson?.resources.length;
  if (blocked) return <Message title={c.unavailable} help={c.unavailableHelp} />;
  return <>
    <View style={styles.hero}>
      <Text style={[styles.eyebrow, { color: colors.accentText }]}>{c.free}</Text>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>{detail.course.title}</Text>
      {!!detail.course.description && <Text style={[styles.body, { color: colors.textSecondary }]}>{detail.course.description}</Text>}
      <Text style={[styles.meta, { color: colors.textMuted }]}>{detail.lessons.length} lessons{detail.course.minutes ? ` · ${Math.round(detail.course.minutes)} min` : ''}</Text>
    </View>
    {detail.lessons.length === 0 ? <Message title={c.noLessons} /> : <>
      {actor ? <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>{c.progress}</Text>
        {progress.isPending ? <Text style={[styles.body, { color: colors.textSecondary }]}>{c.progressLoading}</Text> : progress.isError ? <Message title={c.progressFailed} retry={() => { void progress.refetch(); }} /> : <>
          <Text style={[styles.body, { color: colors.textSecondary }]}>{completed.length} of {detail.lessons.length} lessons completed · {Math.round(progress.data.percent)}%</Text>
          <View accessibilityRole="progressbar" accessibilityLabel={c.progress} accessibilityValue={{ min: 0, max: 100, now: progress.data.percent }} style={[styles.progressTrack, { backgroundColor: colors.borderStrong }]}>
            <View style={{ height: 6, width: `${progress.data.percent}%`, backgroundColor: colors.accentFill }} />
          </View>
          <Text style={[styles.meta, { color: colors.textSecondary }]} accessibilityLiveRegion="polite">{saving ? c.saving : saved ? c.saved : c.progressHelp}</Text>
          <View style={styles.actions}><Action primary disabled={saving} onPress={() => select(resumeLesson(detail, progress.data))}>{completed.length || progress.data.lastLessonId ? c.continue : c.start}</Action>
            <Action disabled={saving || progress.isFetching} onPress={refresh}>{c.sync}</Action></View>
        </>}
      </View> : <Message title={c.signInHelp} />}
      {!actor && <Action onPress={() => router.push('/auth/login' as any)}>{c.signIn}</Action>}
      {failed && <Message title={c.saveFailed} retry={() => { void save(failed.id, failed.completed); }} />}
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>{c.lessonPlan}</Text>
      <View style={styles.lessons}>{detail.lessons.map((item, position) => <Pressable key={item.id} accessibilityRole="button"
        accessibilityLabel={`${position + 1}. ${item.title}${completed.includes(item.id) ? `, ${c.completed}` : ''}`}
        accessibilityState={{ selected: item.id === selected, disabled: saving }} disabled={saving} onPress={() => select(item.id)}
        style={[styles.lessonRow, { backgroundColor: item.id === selected ? colors.accentSoft : colors.surfaceStrong, borderColor: item.id === selected ? colors.accentText : colors.border }]}>
        <Text style={[styles.number, { color: colors.accentText }]}>{String(position + 1).padStart(2, '0')}</Text>
        <Text style={[styles.lessonTitle, { color: colors.text }]}>{item.title}</Text>
        {completed.includes(item.id) && <MaterialIcons name="check-circle" size={22} color={colors.success} />}
      </Pressable>)}</View>
      {lesson && <View style={[styles.panel, { backgroundColor: colors.surfaceStrong, borderColor: colors.border }]}>
        <Text style={[styles.meta, { color: colors.textMuted }]}>Lesson {index + 1} of {detail.lessons.length}</Text>
        <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={[styles.lessonHeading, { color: colors.text }]}>{lesson.title}</Text>
        {!!lesson.summary && <Text style={[styles.body, { color: colors.textSecondary }]}>{lesson.summary}</Text>}
        <LessonBody key={lesson.id} lesson={lesson} onMediaReady={() => setMediaReady(true)} />
        <View style={styles.actions}>
          <Action disabled={saving || index <= 0} onPress={() => select(detail.lessons[index - 1]?.id)}>{c.previous}</Action>
          <Action disabled={saving || index >= detail.lessons.length - 1} onPress={() => select(detail.lessons[index + 1]?.id)}>{c.next}</Action>
          {actor && <Action primary disabled={saving || !progress.isSuccess || !contentAvailable || !!failed} onPress={() => { void save(lesson.id, !completed.includes(lesson.id)); }}>{completed.includes(lesson.id) ? c.incomplete : c.complete}</Action>}
        </View>
      </View>}
    </>}
  </>;
}

async function openResource(value: string) {
  const safe = safeAcademyUrl(value); if (!safe) return;
  try { await Linking.openURL(safe); } catch { Alert.alert(c.linkFailed); }
}

function LessonBody({ lesson, onMediaReady }: { lesson: AcademyLesson; onMediaReady: () => void }) {
  const { colors } = usePluggdTheme(); const [attempt, setAttempt] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const text = nativeLessonText(lesson); const questions = lesson.format === 'quiz' ? practiceQuestions(lesson) : null;
  return <View style={styles.content}>
    {lesson.format === 'quiz' ? questions ? <>
      <Text style={[styles.heading, { color: colors.text }]}>{c.practice}</Text>
      {questions.map((question, number) => <View key={number} style={styles.content}>
        <Text style={[styles.bodyBold, { color: colors.text }]}>{number + 1}. {question.question}</Text>
        {question.options.map((option, position) => <Pressable key={position} accessibilityRole="radio" accessibilityState={{ checked: answers[number] === position }} onPress={() => setAnswers(value => ({ ...value, [number]: position }))}
          style={[styles.lessonRow, { borderColor: answers[number] === position ? colors.accentText : colors.border, backgroundColor: colors.surface }]}>
          <MaterialIcons name={answers[number] === position ? 'radio-button-checked' : 'radio-button-unchecked'} size={24} color={colors.accentText} />
          <Text style={[styles.lessonTitle, { color: colors.text }]}>{option}</Text>
        </Pressable>)}
      </View>)}
    </> : <Text style={[styles.body, { color: colors.textSecondary }]}>{c.questionsFailed}</Text>
      : text.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => {
        const heading = /^#{1,6}\s/.test(paragraph); const value = paragraph.replace(/^#{1,6}\s/, '').replace(/^\s*[-*]\s+/gm, '• ');
        return <Text key={index} selectable accessibilityRole={heading ? 'header' : undefined} style={[heading ? styles.heading : styles.lessonText, { color: colors.text }]}>{value.split(/(\[[^\]]+\]\(https?:\/\/[^)]+\))/).map((part, i) => {
          const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/); const safe = link && safeAcademyUrl(link[2]);
          return safe ? <Text key={i} accessibilityRole="link" style={{ color: colors.accentText, textDecorationLine: 'underline' }} onPress={() => { void openResource(safe); }}>{link![1]}</Text>
            : part.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/).map((inline, j) => /^\*\*.*\*\*$/.test(inline)
              ? <Text key={`${i}:${j}`} style={{ fontFamily: edFonts.bodyBold }}>{inline.slice(2, -2)}</Text>
              : /^\*.*\*$/.test(inline) ? <Text key={`${i}:${j}`} style={{ fontStyle: 'italic' }}>{inline.slice(1, -1)}</Text>
                : /^`.*`$/.test(inline) ? <Text key={`${i}:${j}`} style={{ backgroundColor: colors.accentSoft }}>{inline.slice(1, -1)}</Text> : inline);
        })}</Text>;
      })}
    {lesson.video && <LessonMedia key={`v:${attempt}`} url={lesson.video} onReady={onMediaReady} retry={() => setAttempt(attempt + 1)} />}
    {lesson.audio && <LessonMedia key={`a:${attempt}`} url={lesson.audio} onReady={onMediaReady} retry={() => setAttempt(attempt + 1)} audio />}
    {!!lesson.resources.length && <><Text style={[styles.heading, { color: colors.text }]}>{c.resources}</Text>
      {lesson.resources.map((resource, index) => <Action key={resource} onPress={() => { void openResource(resource); }}>{c.resource} {index + 1} ↗</Action>)}</>}
    {!text && !lesson.video && !lesson.audio && !lesson.resources.length && <Text style={[styles.body, { color: colors.textSecondary }]}>{c.contentUnavailable}</Text>}
  </View>;
}

function LessonMedia({ url, audio = false, onReady, retry }: { url: string; audio?: boolean; onReady: () => void; retry: () => void }) {
  const { colors } = usePluggdTheme(); const { pause } = usePlayback(); const [status, setStatus] = useState('loading');
  const player = useVideoPlayer(url, value => { value.loop = false; });
  useFocusEffect(useCallback(() => () => { player.pause(); }, [player]));
  const ready = useRef(onReady); ready.current = onReady;
  useEffect(() => {
    const update = () => { setStatus(player.status); if (player.status === 'readyToPlay') ready.current(); };
    update(); const sub = player.addListener('statusChange', update);
    const playing = player.addListener('playingChange', event => { if (event.isPlaying) void pause().catch(() => undefined); });
    return () => { sub.remove(); playing.remove(); player.pause(); };
  }, [player, pause]);
  return <View style={styles.content}>
    {status === 'error' ? <Message title={c.mediaFailed} retry={retry} /> : <>
      <VideoView player={player} nativeControls allowsFullscreen allowsPictureInPicture={false} style={{ height: audio ? 110 : 230, width: '100%', borderRadius: 12, backgroundColor: '#000' }} />
      {(status === 'idle' || status === 'loading') && <View style={styles.actions}><ActivityIndicator color={colors.accentText} /><Text style={[styles.meta, { color: colors.textSecondary }]}>{c.mediaLoading}</Text></View>}
    </>}
  </View>;
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 980, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 20 },
  hero: { gap: 12, paddingVertical: 16 }, title: { fontFamily: edFonts.displayBold, fontSize: 34, lineHeight: 42, letterSpacing: -0.7 },
  eyebrow: { fontFamily: edFonts.bodyBlack, fontSize: 11, letterSpacing: 1.7, textTransform: 'uppercase' },
  lead: { fontFamily: edFonts.serif, fontSize: 22, lineHeight: 30 }, heading: { fontFamily: edFonts.bodyBold, fontSize: 20, lineHeight: 28 },
  body: { fontFamily: edFonts.body, fontSize: 16, lineHeight: 25 }, bodyBold: { fontFamily: edFonts.bodyBold, fontSize: 17, lineHeight: 26 },
  meta: { fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 20 }, actionText: { fontFamily: edFonts.bodyBold, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  action: { minHeight: 48, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, justifyContent: 'center', alignItems: 'center', flexShrink: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' },
  message: { padding: 24, borderRadius: 16, borderWidth: 1, gap: 12 }, panel: { padding: 20, borderRadius: 16, borderWidth: 1, gap: 18 },
  search: { borderWidth: 1, borderRadius: 12, minHeight: 52, paddingHorizontal: 16, paddingVertical: 12, fontFamily: edFonts.body, fontSize: 16 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 }, course: { flexGrow: 1, flexShrink: 1, minWidth: 0, flexBasis: 280, maxWidth: 460, borderWidth: 1, borderRadius: 16, overflow: 'hidden' },
  artwork: { width: '100%', height: 170 }, artworkPlaceholder: { justifyContent: 'center', alignItems: 'center' }, cardCopy: { padding: 20, gap: 12 },
  lessons: { gap: 10 }, lessonRow: { flexDirection: 'row', alignItems: 'center', minHeight: 60, gap: 14, padding: 16, borderWidth: 1, borderRadius: 12 },
  number: { fontFamily: edFonts.mono, fontSize: 13 }, lessonTitle: { flex: 1, fontFamily: edFonts.bodyBold, fontSize: 16, lineHeight: 23 },
  lessonHeading: { fontFamily: edFonts.serif, fontSize: 25, lineHeight: 34 }, lessonText: { fontFamily: edFonts.body, fontSize: 17, lineHeight: 29 },
  content: { gap: 18 }, progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
});
