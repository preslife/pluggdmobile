
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../src/lib/supabase';

export default function RoleSelection() {
    const router = useRouter();
    const [selectedRole, setSelectedRole] = useState<'fan' | 'creator' | null>(null);
    const [loading, setLoading] = useState(false);

    const handleContinue = async () => {
        if (!selectedRole) return;
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (user) {
                // Update profile with role
                const isCreator = selectedRole === 'creator';
                const { error } = await supabase
                    .from('profiles')
                    .update({
                        is_creator: isCreator,
                        // If creator, default user_type to 'artist' for now, else 'fan' isn't an enum but user_type is nullable or has specific values
                        user_type: isCreator ? 'artist' : null
                    })
                    .eq('id', user.id);

                if (error) throw error;
            }

            router.replace('/');
        } catch (error) {
            console.error('Error updating role:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="px-6 pt-14 pb-6">
                <Text className="text-3xl font-extrabold text-slate-900 dark:text-white mb-2">Select Your Role</Text>
                <Text className="text-slate-500 dark:text-[#b9ab9d] text-base">Choose your path to get the best experience customized for you.</Text>
            </View>

            <View className="flex-1 px-4 gap-5">
                {/* Fan Card */}
                <TouchableOpacity
                    className={`relative overflow-hidden rounded-xl border-2 bg-white dark:bg-[#2c241b] transition-all p-5 ${selectedRole === 'fan' ? 'border-primary shadow-xl shadow-primary/10' : 'border-transparent'}`}
                    onPress={() => setSelectedRole('fan')}
                >
                    <View className="flex-row items-center gap-4 mb-5">
                        <View className="h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-[#3d332a]">
                            <Text className="text-primary material-symbols-outlined text-2xl">headphones</Text>
                        </View>
                        <Text className="text-xl font-bold text-slate-900 dark:text-white">Fan</Text>
                        {selectedRole === 'fan' && (
                            <View className="ml-auto bg-primary h-6 w-6 rounded-full items-center justify-center">
                                <Text className="text-white font-bold material-symbols-outlined text-xs">check</Text>
                            </View>
                        )}
                    </View>
                    <View className="gap-2">
                        <View className="flex-row items-center gap-3">
                            <Text className="text-primary material-symbols-outlined text-lg">check_circle</Text>
                            <Text className="text-sm font-medium text-slate-600 dark:text-[#cdc4bb]">Discover exclusive tracks</Text>
                        </View>
                        <View className="flex-row items-center gap-3">
                            <Text className="text-primary material-symbols-outlined text-lg">check_circle</Text>
                            <Text className="text-sm font-medium text-slate-600 dark:text-[#cdc4bb]">Support artists directly</Text>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Creator Card */}
                <TouchableOpacity
                    className={`relative overflow-hidden rounded-xl border-2 bg-white dark:bg-[#2c241b] transition-all p-5 ${selectedRole === 'creator' ? 'border-primary shadow-xl shadow-primary/10' : 'border-transparent'}`}
                    onPress={() => setSelectedRole('creator')}
                >
                    <View className="flex-row items-center gap-4 mb-5">
                        <View className="h-12 w-12 items-center justify-center rounded-lg bg-primary text-white shadow-lg shadow-primary/30">
                            <Text className="text-white material-symbols-outlined text-2xl">mic</Text>
                        </View>
                        <Text className="text-xl font-bold text-slate-900 dark:text-white">Creator</Text>
                        {selectedRole === 'creator' && (
                            <View className="ml-auto bg-primary h-6 w-6 rounded-full items-center justify-center">
                                <Text className="text-white font-bold material-symbols-outlined text-xs">check</Text>
                            </View>
                        )}
                    </View>
                    <View className="gap-2">
                        <View className="flex-row items-center gap-3">
                            <Text className="text-primary material-symbols-outlined text-lg">check_circle</Text>
                            <Text className="text-sm font-medium text-slate-600 dark:text-[#cdc4bb]">Upload high-fidelity audio</Text>
                        </View>
                        <View className="flex-row items-center gap-3">
                            <Text className="text-primary material-symbols-outlined text-lg">check_circle</Text>
                            <Text className="text-sm font-medium text-slate-600 dark:text-[#cdc4bb]">Monetize your fanbase</Text>
                        </View>
                        <View className="flex-row items-center gap-3">
                            <Text className="text-primary material-symbols-outlined text-lg">check_circle</Text>
                            <Text className="text-sm font-medium text-slate-600 dark:text-[#cdc4bb]">Access analytics tools</Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>

            <View className="p-6">
                <TouchableOpacity
                    onPress={handleContinue}
                    disabled={!selectedRole || loading}
                    className={`w-full h-14 rounded-xl items-center justify-center flex-row gap-2 shadow-lg ${!selectedRole ? 'bg-gray-500 opacity-50' : 'bg-primary shadow-primary/25'}`}
                >
                    <Text className="text-white font-bold text-lg">Get Started</Text>
                    <Text className="text-white material-symbols-outlined text-xl">arrow_forward</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
