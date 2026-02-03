
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function CommunityHub() {
    const router = useRouter();

    const posts = [
        {
            id: 1,
            user: 'BeatsByDre',
            handle: '@beatsbydre',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDWMi8sH-jB2N_Ps5XnZDiOLrKv-qu-kuEkXGMCH7Fg7osG4zmWvhUbUhHufsEL0428W2sYIm5KwhU2i8V3fMdTg6E3LRcZn8s8xC-5x23Ss3wL7bs7cLw3kjpnnmUKoiirDupYuXHsUKMJXZ_t559bHxzN0y9boXyyNgoRVOyFCDkIpF72x80QEqHIKxNqa2J5_SLDKkJCqPDGt6z6fbkXkagiY8fL6luGK1WkJyRy9pt5x15gB3clU0cfo2Q0UI3jEMZl0j5wKng',
            time: '2h',
            verified: true,
            content: "Just dropped a new sample pack in the marketplace! It's got those heavy 808s you've been asking for. Check it out 🎹🔥",
            media: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDLn53ljzSmT_up07t2h_dZ8fJUxDnBjhn0V-s5cIKtIOIhb24RZ9HVZeJbfl8f5KH1ByRag4eFglPBVomyBttDOiDfe9loQOFzBt2TpHtvYNMC2f-kcWmEw2_tSuOh4J3wMGqKzGpDm11CrtJ6uuVOONDoDCM-tu2xVAP-IK0EFwUlc9D1ZzSYQeZg_or5qMKBPOdQtX0RM5z6v171Zfc0maXkKeSeAbEpMkomXUc-pAB8_9dZcc8JPTE_ClgG5txA-749Lwopufk',
            stats: { likes: '1.2k', comments: '48' }
        },
        {
            id: 2,
            user: 'VocalSarah',
            handle: '@sarahvsings',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTHwIufi4P1nVgd-YU4iYMciXf6GFfmzDGW8ASYAWqb7VQanAdYB5BRo4OesV3S4YQdBDHf7w_NLZ_tWOnPkK_3DBe1tvUlyemO4GLYOjyAU9X-RBo5vSRXj0WyDoRviVSTqPY3PKMsiQ7kgqNT4to7CK8dh4gesAiFLR8jh4AM4ljIlLm4Na2qGtESInRn9_89Y0ti8YUb5SGi3SOMJ0VaNhPfNkWuzkkQPlgpa9bhO45MhQOkaV4IgiYJDlt7uXHxvAFY_Qg0w0',
            time: '4h',
            verified: false,
            content: "Listening to the radio right now, this transition was crazy! Had to clip it.",
            hasAudio: true,
            stats: { likes: '857', comments: '24' }
        }
    ];

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="sticky top-0 z-40 w-full bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-b border-gray-200 dark:border-white/10 pt-12 pb-3 px-4">
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                        <TouchableOpacity onPress={() => router.back()}>
                            <Text className="material-symbols-outlined text-2xl text-slate-900 dark:text-white">arrow_back</Text>
                        </TouchableOpacity>
                        <Text className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">Community Hub</Text>
                    </View>
                    <TouchableOpacity className="relative p-2 rounded-full hover:bg-white/10">
                        <Text className="material-symbols-outlined text-slate-600 dark:text-slate-300">notifications</Text>
                        <View className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView className="flex-1">
                {/* Radio Widget */}
                <View className="px-4 py-4">
                    <View className="relative overflow-hidden rounded-xl bg-[#161616] shadow-lg border border-white/10">
                        <LinearGradient
                            colors={['#FF5500', '#18181b', '#000000']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            className="absolute inset-0 opacity-40"
                        />
                        <View className="relative p-4 flex-row items-center justify-between gap-4">
                            <View className="flex-row items-center gap-4 flex-1">
                                <Image
                                    source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD3bVvv3HmK0paZzXNu9vN64ZsELQ8HgIFK47AqdpvgFmRpQSIzTYHL_EaAVl0QofCixR4FsVfO1J-LD-tooFxMlGf_rudvR1oLbGeGc2tuD5TUUmef6Sl7VkZD2s3Yf1f-jyTqlKZ4oGZYt-6A2Ln4vteiQZ2B6rtsZhcM0PE74rj_-wRWI_ry2Kvhns2JlTbbSvDK6AZ4mAFfT8LmGz3dzLAgGnD9uPC9D0uVQnWtgrVQZ8AN1krHha2Kpj3Ybsoj_x4vstVFw84' }}
                                    className="h-14 w-14 rounded-lg bg-black"
                                />
                                <View>
                                    <View className="flex-row items-center gap-2 mb-0.5">
                                        <Text className="text-white font-bold text-base">Pluggd FM</Text>
                                        <View className="flex-row items-center gap-1 px-1.5 py-0.5 rounded bg-primary/20 border border-primary/20">
                                            <View className="h-1.5 w-1.5 rounded-full bg-primary" />
                                            <Text className="text-primary text-[10px] font-bold uppercase">Live</Text>
                                        </View>
                                    </View>
                                    <Text className="text-slate-300 text-sm">Live: DJ K-Slaps</Text>
                                    <Text className="text-primary text-xs font-medium mt-0.5">1,240 Listening</Text>
                                </View>
                            </View>
                            <TouchableOpacity className="h-12 w-12 rounded-full bg-primary items-center justify-center shadow-lg shadow-primary/30">
                                <Text className="material-symbols-outlined text-white text-2xl">play_arrow</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Daily Quest */}
                <View className="px-4 pb-2">
                    <View className="rounded-xl bg-white dark:bg-[#161616] border border-gray-200 dark:border-white/5 p-4 shadow-sm">
                        <View className="flex-row justify-between items-center mb-3">
                            <View className="flex-row items-center gap-2">
                                <Text className="material-symbols-outlined text-primary">bolt</Text>
                                <Text className="text-sm font-bold uppercase tracking-wide text-slate-800 dark:text-slate-100">Daily Quest</Text>
                            </View>
                            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">Resets in 4h</Text>
                        </View>
                        <View className="flex-row justify-between items-end mb-2">
                            <Text className="text-base font-medium text-slate-900 dark:text-white">Vibe Check: Listen for 30m</Text>
                            <Text className="text-primary font-bold text-sm">350<Text className="text-slate-400 font-normal">/500 XP</Text></Text>
                        </View>
                        <View className="h-2 w-full rounded-full bg-gray-200 dark:bg-slate-800 overflow-hidden">
                            <View className="h-full bg-primary rounded-full w-[70%]" />
                        </View>
                    </View>
                </View>

                {/* Filters */}
                <View className="px-4 py-2 mt-2 flex-row items-center justify-between">
                    <Text className="text-lg font-bold text-slate-900 dark:text-white">Latest Drops</Text>
                    <View className="flex-row gap-3">
                        <Text className="text-primary text-sm font-medium">Hot</Text>
                        <Text className="text-slate-500 dark:text-slate-400 text-sm font-medium">New</Text>
                        <Text className="text-slate-500 dark:text-slate-400 text-sm font-medium">Following</Text>
                    </View>
                </View>

                {/* Feed Posts */}
                {posts.map((post) => (
                    <View key={post.id} className="mx-4 mb-4 rounded-xl bg-white dark:bg-[#161616] border border-gray-200 dark:border-white/5 p-4 shadow-sm">
                        <View className="flex-row gap-3">
                            <Image source={{ uri: post.avatar }} className="h-10 w-10 rounded-full bg-gray-700" />
                            <View className="flex-1 min-w-0">
                                <View className="flex-row items-baseline justify-between">
                                    <View className="flex-row items-center gap-1.5 flex-1">
                                        <Text className="font-bold text-slate-900 dark:text-white truncate">{post.user}</Text>
                                        {post.verified && <Text className="material-symbols-outlined text-blue-400 text-[14px]">verified</Text>}
                                        <Text className="text-primary text-sm truncate font-medium">{post.handle}</Text>
                                    </View>
                                    <Text className="text-slate-500 text-xs">{post.time}</Text>
                                </View>

                                <Text className="mt-1 text-slate-800 dark:text-slate-200 text-[15px] leading-relaxed">{post.content}</Text>

                                {post.media && (
                                    <View className="mt-3 overflow-hidden rounded-lg border border-gray-200 dark:border-slate-800 bg-black h-48">
                                        <Image source={{ uri: post.media }} className="w-full h-full" resizeMode="cover" />
                                    </View>
                                )}

                                {post.hasAudio && (
                                    <View className="mt-3 rounded-lg bg-gray-100 dark:bg-black/40 border border-gray-200 dark:border-white/10 p-3 flex-row items-center gap-3">
                                        <TouchableOpacity className="h-8 w-8 rounded-full bg-primary items-center justify-center">
                                            <Text className="material-symbols-outlined text-white text-lg">play_arrow</Text>
                                        </TouchableOpacity>
                                        <View className="flex-1">
                                            {/* Fake Waveform */}
                                            <View className="flex-row items-center gap-0.5 h-4 opacity-60">
                                                {[40, 70, 100, 60, 80, 40, 90, 50, 30, 60, 40, 90, 50, 30, 60].map((h, i) => (
                                                    <View key={i} className="w-0.5 bg-primary rounded-full" style={{ height: `${h}%` }} />
                                                ))}
                                            </View>
                                        </View>
                                        <Text className="text-xs font-mono text-slate-500">0:14</Text>
                                    </View>
                                )}

                                <View className="flex-row items-center justify-between mt-3">
                                    <View className="flex-row gap-4">
                                        <TouchableOpacity className="flex-row items-center gap-1.5">
                                            <Text className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-xl">favorite</Text>
                                            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">{post.stats.likes}</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity className="flex-row items-center gap-1.5">
                                            <Text className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-xl">chat_bubble</Text>
                                            <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">{post.stats.comments}</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <TouchableOpacity className="flex-row items-center gap-1.5">
                                        <Text className="material-symbols-outlined text-slate-500 dark:text-slate-400 text-xl">ios_share</Text>
                                        <Text className="text-xs font-medium text-slate-500 dark:text-slate-400">Share</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                ))}
                <View className="h-20" />
            </ScrollView>

            {/* FAB */}
            <TouchableOpacity className="absolute bottom-24 right-4 h-14 w-14 rounded-full bg-primary shadow-lg shadow-primary/40 items-center justify-center z-40">
                <Text className="material-symbols-outlined text-white text-2xl">add</Text>
            </TouchableOpacity>
        </View>
    );
}
