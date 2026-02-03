
import { View, Text, Image, TouchableOpacity, TextInput, ScrollView, Switch } from 'react-native';
import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../src/lib/supabase';
import { Database } from '../src/types/supabase';

type Profile = Database['public']['Tables']['profiles']['Row'];

export default function ProfileScreen() {
    const router = useRouter();
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPublic, setIsPublic] = useState(true);

    // Form state
    const [fullName, setFullName] = useState('');
    const [bio, setBio] = useState('');
    const [location, setLocation] = useState('Toronto, Canada'); // Default/Mock

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            // In a real app, we'd get the current user's ID. 
            // For this demo, fetching the first profile found or a specific mockup one.
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .limit(1)
                .single();

            if (data) {
                setProfile(data);
                setFullName(data.full_name || '');
                setBio(data.bio || '');
            }
        } catch (error) {
            console.log('Error fetching profile:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!profile) return;

        // Mock save functionality
        router.back();
    };

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            <StatusBar style="auto" />
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="absolute top-0 left-0 right-0 z-50 px-4 pt-14 pb-4 flex-row items-center justify-between bg-transparent">
                <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-black/20 backdrop-blur-md">
                    <Text className="text-white material-symbols-outlined text-xl">close</Text>
                </TouchableOpacity>
                <Text className="text-white text-lg font-bold shadow-sm">Edit Profile</Text>
                <View className="h-10 w-10" />
            </View>

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Cover Image */}
                <View className="relative w-full h-64 bg-gray-900">
                    {profile?.cover_image_url ? (
                        <Image source={{ uri: profile.cover_image_url }} className="w-full h-full opacity-80" />
                    ) : (
                        <View className="w-full h-full bg-gray-800" />
                    )}
                    <View className="absolute inset-0 bg-black/20" />
                    <TouchableOpacity className="absolute top-20 right-4 bg-primary p-2 rounded-full shadow-lg">
                        <Text className="text-white material-symbols-outlined text-sm">edit</Text>
                    </TouchableOpacity>
                </View>

                {/* Avatar */}
                <View className="relative items-center -mt-16 mb-6">
                    <View className="h-32 w-32 rounded-full border-[6px] border-background-light dark:border-background-dark overflow-hidden bg-gray-800 relative shadow-xl">
                        {profile?.avatar_url ? (
                            <Image source={{ uri: profile.avatar_url }} className="w-full h-full" />
                        ) : (
                            <View className="w-full h-full bg-gray-700 items-center justify-center">
                                <Text className="text-white material-symbols-outlined text-4xl">person</Text>
                            </View>
                        )}
                    </View>
                    <TouchableOpacity className="absolute bottom-0 right-[35%] bg-primary p-2.5 rounded-full border-[4px] border-background-light dark:border-background-dark shadow-sm">
                        <Text className="text-white material-symbols-outlined text-sm">photo_camera</Text>
                    </TouchableOpacity>
                    <Text className="text-sm font-medium text-text-secondary mt-3">Tap icon to change photo</Text>
                </View>

                <View className="mt-6 px-6">
                    <Text className="text-sm font-bold uppercase text-slate-500 dark:text-gray-400 tracking-wider mb-2">Commerce & Learning</Text>
                    <View className="bg-white dark:bg-card-dark rounded-2xl p-4 gap-4">
                        <TouchableOpacity onPress={() => router.push('/commerce/checkout')} className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <Text className="material-symbols-outlined text-slate-600 dark:text-gray-300">shopping_cart</Text>
                                <Text className="text-base font-medium text-slate-900 dark:text-white">Checkout Demo</Text>
                            </View>
                            <Text className="material-symbols-outlined text-slate-400">chevron_right</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/commerce/orders')} className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <Text className="material-symbols-outlined text-slate-600 dark:text-gray-300">receipt</Text>
                                <Text className="text-base font-medium text-slate-900 dark:text-white">Purchase History</Text>
                            </View>
                            <Text className="material-symbols-outlined text-slate-400">chevron_right</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/gamification/quests')} className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <Text className="material-symbols-outlined text-slate-600 dark:text-gray-300">trophy</Text>
                                <Text className="text-base font-medium text-slate-900 dark:text-white">Quests</Text>
                            </View>
                            <Text className="material-symbols-outlined text-slate-400">chevron_right</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/gamification/courses')} className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <Text className="material-symbols-outlined text-slate-600 dark:text-gray-300">school</Text>
                                <Text className="text-base font-medium text-slate-900 dark:text-white">Academy</Text>
                            </View>
                            <Text className="material-symbols-outlined text-slate-400">chevron_right</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Advanced Features (Pro) */}
                <View className="mt-6 px-6">
                    <Text className="text-sm font-bold uppercase text-slate-500 dark:text-gray-400 tracking-wider mb-2">Advanced Features (Pro)</Text>
                    <View className="bg-white dark:bg-card-dark rounded-2xl p-4 gap-4">
                        <TouchableOpacity onPress={() => router.push('/pro/epk')} className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <Text className="material-symbols-outlined text-slate-600 dark:text-gray-300">assignment</Text>
                                <Text className="text-base font-medium text-slate-900 dark:text-white">Press Kit Builder</Text>
                            </View>
                            <Text className="material-symbols-outlined text-slate-400">chevron_right</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/pro/collab')} className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <Text className="material-symbols-outlined text-slate-600 dark:text-gray-300">radar</Text>
                                <Text className="text-base font-medium text-slate-900 dark:text-white">Collab Radar</Text>
                            </View>
                            <Text className="material-symbols-outlined text-slate-400">chevron_right</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/live/session')} className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <Text className="material-symbols-outlined text-slate-600 dark:text-gray-300">videocam</Text>
                                <Text className="text-base font-medium text-slate-900 dark:text-white">Live Session Demo</Text>
                            </View>
                            <Text className="material-symbols-outlined text-slate-400">chevron_right</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Creator Tools (Only if Creator) */}
                <View className="mt-6 px-6">
                    <Text className="text-sm font-bold uppercase text-slate-500 dark:text-gray-400 tracking-wider mb-2">Creator Tools</Text>
                    <View className="bg-white dark:bg-card-dark rounded-2xl p-4 gap-4">
                        <TouchableOpacity onPress={() => router.push('/creator/analytics')} className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <Text className="material-symbols-outlined text-slate-600 dark:text-gray-300">analytics</Text>
                                <Text className="text-base font-medium text-slate-900 dark:text-white">Analytics</Text>
                            </View>
                            <Text className="material-symbols-outlined text-slate-400">chevron_right</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/creator/upload')} className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <Text className="material-symbols-outlined text-slate-600 dark:text-gray-300">upload</Text>
                                <Text className="text-base font-medium text-slate-900 dark:text-white">Upload</Text>
                            </View>
                            <Text className="material-symbols-outlined text-slate-400">chevron_right</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/creator/payouts')} className="flex-row items-center justify-between">
                            <View className="flex-row items-center gap-3">
                                <Text className="material-symbols-outlined text-slate-600 dark:text-gray-300">payments</Text>
                                <Text className="text-base font-medium text-slate-900 dark:text-white">Payouts & Export</Text>
                            </View>
                            <Text className="material-symbols-outlined text-slate-400">chevron_right</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Form */}
                <View className="px-6 space-y-6 mt-6">
                    <Text className="text-xl font-bold text-slate-900 dark:text-white">Basic Info</Text>

                    <View>
                        <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 ml-1">Artist Name</Text>
                        <View className="relative">
                            <TextInput
                                value={fullName}
                                onChangeText={setFullName}
                                className="w-full bg-white dark:bg-card-dark text-slate-900 dark:text-white rounded-2xl px-4 py-4 text-base font-medium shadow-sm"
                                placeholder="Enter your artist name"
                                placeholderTextColor="#9ca3af"
                            />
                            <Text className="absolute right-4 top-4 text-text-secondary material-symbols-outlined">person</Text>
                        </View>
                    </View>

                    <View>
                        <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 ml-1">Bio</Text>
                        <TextInput
                            value={bio}
                            onChangeText={setBio}
                            multiline
                            numberOfLines={3}
                            className="w-full bg-white dark:bg-card-dark text-slate-900 dark:text-white rounded-2xl px-4 py-4 text-base font-medium shadow-sm min-h-[100px]"
                            placeholder="Tell your fans about yourself..."
                            placeholderTextColor="#9ca3af"
                            style={{ textAlignVertical: 'top' }}
                        />
                    </View>

                    <View>
                        <Text className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2 ml-1">Location</Text>
                        <View className="relative">
                            <TextInput
                                value={location}
                                onChangeText={setLocation}
                                className="w-full bg-white dark:bg-card-dark text-slate-900 dark:text-white rounded-2xl px-4 py-4 text-base font-medium shadow-sm"
                                placeholder="City, Country"
                                placeholderTextColor="#9ca3af"
                            />
                            <Text className="absolute right-4 top-4 text-text-secondary material-symbols-outlined">location_on</Text>
                        </View>
                    </View>

                    <View className="h-[1px] bg-gray-200 dark:bg-white/10 my-2" />

                    <View>
                        <Text className="text-xl font-bold text-slate-900 dark:text-white mb-4">Connect Accounts</Text>
                        <View className="flex-row gap-4">
                            <TouchableOpacity className="h-14 w-14 rounded-full bg-white dark:bg-card-dark items-center justify-center shadow-sm">
                                <Text className="text-primary text-2xl material-symbols-outlined">captive_portal</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="h-14 w-14 rounded-full bg-white dark:bg-card-dark items-center justify-center shadow-sm">
                                <Text className="text-text-secondary text-2xl material-symbols-outlined">forum</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="h-14 w-14 rounded-full bg-primary items-center justify-center shadow-lg shadow-primary/20">
                                <Text className="text-white text-2xl material-symbols-outlined">mail</Text>
                            </TouchableOpacity>
                            <TouchableOpacity className="h-14 w-14 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 items-center justify-center">
                                <Text className="text-text-secondary text-2xl material-symbols-outlined">add</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View className="flex-row items-center justify-between py-2 bg-white dark:bg-card-dark rounded-2xl px-5 mt-2">
                        <View className="flex-row items-center gap-3">
                            <View className="bg-primary/10 p-2 rounded-full">
                                <Text className="text-primary material-symbols-outlined">public</Text>
                            </View>
                            <View>
                                <Text className="text-base font-bold text-slate-900 dark:text-white">Public Profile</Text>
                                <Text className="text-xs text-text-secondary">Visible to everyone</Text>
                            </View>
                        </View>
                        <Switch
                            value={isPublic}
                            onValueChange={setIsPublic}
                            trackColor={{ false: '#767577', true: '#ff5500' }}
                            thumbColor={isPublic ? '#fff' : '#f4f3f4'}
                        />
                    </View>

                </View>
            </ScrollView>

            {/* Sticky Save Button */}
            <View className="absolute bottom-0 left-0 right-0 p-4 bg-transparent pt-10 pb-8 bg-gradient-to-t from-background-light via-background-light to-transparent dark:from-background-dark dark:via-background-dark">
                <TouchableOpacity onPress={handleSave} className="w-full bg-primary h-14 rounded-full flex-row items-center justify-center shadow-lg shadow-primary/25">
                    <Text className="text-white material-symbols-outlined mr-2">save</Text>
                    <Text className="text-white font-bold text-lg">Save Changes</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
