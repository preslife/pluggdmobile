
import { View, Text, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useRouter, Link } from 'expo-router';
import { useState } from 'react';
import { supabase } from '../../src/lib/supabase';

function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: 'Weak', color: '#ef4444' };
  if (score <= 3) return { level: 2, label: 'Medium', color: '#22c55e' };
  return { level: 4, label: 'Strong', color: '#22c55e' };
}

export default function SignUp() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pwStrength = getPasswordStrength(password);

  const handleSignUp = async () => {
    setLoading(true);
    setError('');

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    setLoading(false);

    if (error) {
      setError(error.message);
    } else {
      router.replace('/auth/role');
    }
  };

  return (
    <View className="flex-1 bg-background-dark">
      {/* Header — back + progress dots */}
      <View className="pt-14 px-4 pb-2">
        <View className="flex-row items-center justify-between h-12">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-10 h-10 items-center justify-center rounded-full"
          >
            <Text className="material-symbols-outlined text-white text-2xl">arrow_back</Text>
          </TouchableOpacity>
          {/* Step progress */}
          <View className="flex-row gap-1">
            <View className="w-8 h-1 bg-primary rounded-full" />
            <View className="w-2 h-1 bg-white/10 rounded-full" />
            <View className="w-2 h-1 bg-white/10 rounded-full" />
          </View>
          <View className="w-10" />
        </View>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        <ScrollView
          className="flex-1 px-6"
          contentContainerStyle={{ paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo — tilted icon */}
          <View className="items-center py-8">
            <View
              className="w-16 h-16 bg-primary rounded-xl items-center justify-center"
              style={{
                transform: [{ rotate: '3deg' }],
                shadowColor: '#FF5200',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
              }}
            >
              <Text className="material-symbols-outlined text-white text-4xl">graphic_eq</Text>
            </View>
          </View>

          {/* Headline */}
          <Text className="text-white text-[28px] font-bold leading-tight text-center mb-2 tracking-tight">
            Let's get you pluggd in.
          </Text>
          <Text className="text-white/40 text-sm font-medium text-center mb-8">
            Create an account to start your journey.
          </Text>

          {/* Form */}
          <View className="gap-5">
            {/* Full Name */}
            <View className="gap-1.5">
              <Text className="text-white text-sm font-medium ml-1">Full Name</Text>
              <TextInput
                className="w-full bg-[#27211c] text-white h-14 px-4 rounded-lg text-base border border-[#54473b]"
                placeholder="Enter your full name"
                placeholderTextColor="rgba(185,171,157,1)"
                autoCapitalize="words"
                value={fullName}
                onChangeText={setFullName}
              />
            </View>

            {/* Email */}
            <View className="gap-1.5">
              <Text className="text-white text-sm font-medium ml-1">Email Address</Text>
              <View className="relative">
                <TextInput
                  className="w-full bg-[#27211c] text-white h-14 px-4 pr-12 rounded-lg text-base border border-[#54473b]"
                  placeholder="name@example.com"
                  placeholderTextColor="rgba(185,171,157,1)"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={email}
                  onChangeText={setEmail}
                />
                <View className="absolute right-4 top-0 bottom-0 justify-center">
                  <Text className="material-symbols-outlined text-[#b9ab9d]">mail</Text>
                </View>
              </View>
            </View>

            {/* Password */}
            <View className="gap-1.5">
              <Text className="text-white text-sm font-medium ml-1">Password</Text>
              <View className="relative">
                <TextInput
                  className="w-full bg-[#27211c] text-white h-14 px-4 pr-12 rounded-lg text-base border border-[#54473b]"
                  placeholder="••••••••"
                  placeholderTextColor="rgba(185,171,157,1)"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-0 bottom-0 px-4 justify-center"
                >
                  <Text className="material-symbols-outlined text-[#b9ab9d]">
                    {showPassword ? 'visibility' : 'visibility_off'}
                  </Text>
                </TouchableOpacity>
              </View>
              {/* Password strength bars */}
              {password.length > 0 && (
                <>
                  <View className="flex-row gap-2 mt-1">
                    {[1, 2, 3, 4].map((i) => (
                      <View
                        key={i}
                        className="h-1 flex-1 rounded-full"
                        style={{
                          backgroundColor: i <= pwStrength.level ? pwStrength.color : 'rgba(255,255,255,0.1)',
                        }}
                      />
                    ))}
                  </View>
                  <Text className="text-xs text-white/40 ml-1">
                    Password strength: {pwStrength.label}
                  </Text>
                </>
              )}
            </View>

            {error ? <Text className="text-red-500 text-sm text-center">{error}</Text> : null}

            {/* CTA Button — rounded-full per Stitch */}
            <TouchableOpacity
              onPress={handleSignUp}
              disabled={loading}
              className="w-full bg-primary h-14 rounded-full items-center justify-center flex-row gap-2 mt-4"
              style={{ shadowColor: '#FF5200', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8 }}
            >
              <Text className="text-white text-base font-bold">
                {loading ? 'Creating...' : 'Create Account'}
              </Text>
              {!loading && (
                <Text className="material-symbols-outlined text-white text-[20px]">arrow_forward</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View className="flex-row items-center py-8">
            <View className="flex-1 h-[1px] bg-white/10" />
            <Text className="mx-4 text-white/30 text-sm font-medium">Or continue with</Text>
            <View className="flex-1 h-[1px] bg-white/10" />
          </View>

          {/* Social login — 2 column grid */}
          <View className="flex-row gap-4 mb-8">
            <TouchableOpacity className="flex-1 h-12 flex-row items-center justify-center gap-2 bg-[#27211c] border border-[#54473b] rounded-lg">
              <View className="w-5 h-5 rounded-full border-2 border-white/60 items-center justify-center">
                <Text className="text-white/60 text-[10px] font-bold">G</Text>
              </View>
              <Text className="text-white font-medium text-sm">Google</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1 h-12 flex-row items-center justify-center gap-2 bg-[#27211c] border border-[#54473b] rounded-lg">
              <Text className="material-symbols-outlined text-white text-[22px]">ios</Text>
              <Text className="text-white font-medium text-sm">Apple</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Footer */}
      <View className="px-6 py-4 border-t border-white/5">
        <Text className="text-white/40 text-sm font-medium text-center">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-primary font-bold">
            Login
          </Link>
        </Text>
      </View>
    </View>
  );
}
