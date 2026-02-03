
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../src/lib/supabase';

export default function SignUp() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSignUp = async () => {
        setLoading(true);
        setError('');

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        setLoading(false);

        if (error) {
            setError(error.message);
        } else {
            // Navigate to Role Selection after successful signup
            router.replace('/auth/role');
        }
    };

    return (
        <View className="flex-1 justify-center px-6 py-10 bg-background-dark">
            <View className="items-center mb-10">
                <Text className="text-primary text-4xl font-extrabold mb-2">Create Account</Text>
                <Text className="text-white/60 text-lg font-medium text-center">Join the community of artists and fans</Text>
            </View>

            <View className="gap-5">
                <View className="gap-2">
                    <Text className="text-primary text-sm font-bold uppercase ml-1">Email</Text>
                    <View className="relative">
                        <TextInput
                            className="w-full bg-white/5 text-white h-14 pl-4 pr-4 rounded-xl text-base font-medium border border-transparent focus:border-primary focus:bg-white/10"
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
                        <TextInput
                            className="w-full bg-white/5 text-white h-14 pl-4 pr-4 rounded-xl text-base font-medium border border-transparent focus:border-primary focus:bg-white/10"
                            placeholder="••••••••"
                            placeholderTextColor="rgba(255,255,255,0.3)"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                    </View>
                </View>

                {error ? <Text className="text-red-500 text-sm text-center">{error}</Text> : null}

                <TouchableOpacity
                    onPress={handleSignUp}
                    disabled={loading}
                    className="w-full bg-primary h-14 rounded-xl items-center justify-center shadow-lg shadow-primary/30 active:scale-95 mt-4"
                >
                    <Text className="text-background-dark text-lg font-bold">{loading ? 'Creating...' : 'SIGN UP'}</Text>
                </TouchableOpacity>
            </View>

            <View className="mt-8 items-center">
                <Text className="text-white/60 text-sm">
                    Already have an account? <Link href="/auth/login" className="text-primary font-bold underline">Log In</Link>
                </Text>
            </View>
        </View>
    );
}
