
import { View, Text, TextInput, TouchableOpacity, Image } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../src/lib/supabase';

export default function Login() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async () => {
        setLoading(true);
        setError('');
        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        setLoading(false);

        if (error) {
            setError(error.message);
        } else {
            router.replace('/'); // Go to Home
        }
    };

    return (
        <View className="flex-1 justify-center px-6 py-10 bg-background-dark">
            <View className="items-center mb-12">
                <View className="w-16 h-16 rounded-2xl bg-primary/20 items-center justify-center mb-6">
                    <Text className="text-primary material-symbols-outlined text-4xl">equalizer</Text>
                </View>
                <Text className="text-primary text-5xl font-extrabold mb-2">Pluggd</Text>
                <Text className="text-white/60 text-lg font-medium">Log in to create & connect</Text>
            </View>

            <View className="gap-5">
                <View className="gap-2">
                    <Text className="text-primary text-sm font-bold uppercase ml-1">Email</Text>
                    <View className="relative">
                        <View className="absolute inset-y-0 left-0 pl-4 justify-center pointer-events-none z-10">
                            <Text className="text-white/40 material-symbols-outlined text-xl">mail</Text>
                        </View>
                        <TextInput
                            className="w-full bg-white/5 text-white h-14 pl-12 pr-4 rounded-xl text-base font-medium border border-transparent focus:border-primary focus:bg-white/10"
                            placeholder="enter@email.com"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            autoCapitalize="none"
                            value={email}
                            onChangeText={setEmail}
                        />
                    </View>
                </View>

                <View className="gap-2">
                    <Text className="text-primary text-sm font-bold uppercase ml-1">Password</Text>
                    <View className="relative">
                        <View className="absolute inset-y-0 left-0 pl-4 justify-center pointer-events-none z-10">
                            <Text className="text-white/40 material-symbols-outlined text-xl">lock</Text>
                        </View>
                        <TextInput
                            className="w-full bg-white/5 text-white h-14 pl-12 pr-12 rounded-xl text-base font-medium border border-transparent focus:border-primary focus:bg-white/10"
                            placeholder="••••••••"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                        <TouchableOpacity className="absolute inset-y-0 right-0 pr-4 justify-center">
                            <Text className="text-white/40 material-symbols-outlined text-xl">visibility_off</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {error ? <Text className="text-red-500 text-sm text-center">{error}</Text> : null}

                <View className="flex-row justify-end pt-1">
                    <TouchableOpacity>
                        <Text className="text-primary text-sm font-semibold">Forgot Password?</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    onPress={handleLogin}
                    disabled={loading}
                    className="w-full bg-primary h-14 rounded-xl items-center justify-center shadow-lg shadow-primary/30 active:scale-95"
                >
                    <Text className="text-background-dark text-lg font-bold">{loading ? 'Loading...' : 'LOG IN'}</Text>
                </TouchableOpacity>
            </View>

            <View className="mt-8">
                <View className="flex-row items-center py-4">
                    <View className="flex-1 h-[1px] bg-white/10" />
                    <Text className="mx-4 text-white/40 text-xs font-bold uppercase">Or continue with</Text>
                    <View className="flex-1 h-[1px] bg-white/10" />
                </View>
                <View className="flex-row gap-4 justify-center mt-4">
                    <TouchableOpacity className="w-14 h-14 rounded-full bg-white/5 border border-white/5 items-center justify-center">
                        <Text className="text-white material-symbols-outlined text-2xl">ios</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="w-14 h-14 rounded-full bg-white/5 border border-white/5 items-center justify-center">
                        <View className="w-6 h-6 rounded-full border-2 border-white/60 items-center justify-center">
                            <Text className="text-white/60 text-[10px] font-bold">G</Text>
                        </View>
                    </TouchableOpacity>
                </View>
            </View>

            <View className="mt-12 items-center">
                <Text className="text-white/60 text-sm">
                    Don't have an account? <Link href="/auth/signup" className="text-primary font-bold underline">Sign Up</Link>
                </Text>
            </View>
        </View>
    );
}
