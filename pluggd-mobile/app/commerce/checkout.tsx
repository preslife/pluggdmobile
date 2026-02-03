
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function Checkout() {
    const router = useRouter();
    const [paymentMethod, setPaymentMethod] = useState('apple_pay');

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="sticky top-0 z-10 flex-row items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm p-4 pt-12 pb-2 justify-between border-b border-zinc-200 dark:border-white/10">
                <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
                    <Text className="material-symbols-outlined text-2xl text-slate-900 dark:text-white">arrow_back_ios_new</Text>
                </TouchableOpacity>
                <Text className="text-slate-900 dark:text-white text-lg font-bold">Checkout</Text>
                <View className="w-10" />
            </View>

            <ScrollView className="flex-1 px-4 pt-6 gap-6 pb-24">
                {/* Item Card */}
                <View className="bg-white dark:bg-surface-dark rounded-xl p-4 shadow-sm border border-slate-200 dark:border-white/5 flex-row gap-4 items-center">
                    <View className="h-[70px] w-[70px] rounded-lg bg-zinc-800 shadow-lg overflow-hidden">
                        {/* Placeholder for cover art */}
                        <View className="w-full h-full bg-primary/20 items-center justify-center">
                            <Text className="material-symbols-outlined text-primary text-2xl">music_note</Text>
                        </View>
                    </View>
                    <View className="flex-1 justify-center">
                        <View className="flex-row justify-between items-start mb-1">
                            <Text className="text-slate-900 dark:text-white text-base font-bold flex-1 mr-2" numberOfLines={1}>Midnight City (Beat)</Text>
                            <Text className="text-slate-900 dark:text-white text-base font-bold">$29.99</Text>
                        </View>
                        <Text className="text-slate-500 dark:text-zinc-400 text-sm mb-2" numberOfLines={1}>Prod. by Xylo</Text>
                        <View className="self-start bg-primary/10 px-2 py-1 rounded-md border border-primary/20">
                            <Text className="text-primary text-xs font-medium">Basic Lease - MP3</Text>
                        </View>
                    </View>
                </View>

                {/* Discount Code */}
                <View className="relative flex-row items-center bg-white dark:bg-surface-dark rounded-xl overflow-hidden border border-slate-200 dark:border-white/5 h-14 px-4">
                    <Text className="material-symbols-outlined text-slate-400 text-xl mr-3">sell</Text>
                    <TextInput
                        className="flex-1 text-base text-slate-900 dark:text-white h-full"
                        placeholder="Enter discount code"
                        placeholderTextColor="#9ca3af"
                    />
                    <TouchableOpacity className="bg-primary/10 px-4 py-1.5 rounded-lg">
                        <Text className="text-primary text-sm font-semibold">Apply</Text>
                    </TouchableOpacity>
                </View>

                {/* Payment Method */}
                <View>
                    <Text className="text-slate-900 dark:text-white text-lg font-bold mb-3">Payment Method</Text>
                    <View className="gap-3">
                        {/* Apple Pay */}
                        <TouchableOpacity
                            onPress={() => setPaymentMethod('apple_pay')}
                            className={`flex-row items-center justify-between p-4 rounded-xl border ${paymentMethod === 'apple_pay' ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-white/5 bg-white dark:bg-surface-dark'}`}
                        >
                            <View className="flex-row items-center gap-4">
                                <View className="bg-white w-12 h-8 rounded border border-slate-200 items-center justify-center">
                                    <Text className="material-symbols-outlined text-xl text-black">ios</Text>
                                </View>
                                <Text className="text-slate-900 dark:text-white font-medium">Apple Pay</Text>
                            </View>
                            <View className={`w-5 h-5 rounded-full border items-center justify-center ${paymentMethod === 'apple_pay' ? 'border-primary' : 'border-slate-300'}`}>
                                {paymentMethod === 'apple_pay' && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
                            </View>
                        </TouchableOpacity>

                        {/* Credit Card */}
                        <TouchableOpacity
                            onPress={() => setPaymentMethod('card')}
                            className={`flex-row items-center justify-between p-4 rounded-xl border ${paymentMethod === 'card' ? 'border-primary bg-primary/5' : 'border-slate-200 dark:border-white/5 bg-white dark:bg-surface-dark'}`}
                        >
                            <View className="flex-row items-center gap-4">
                                <View className="bg-white w-12 h-8 rounded border border-slate-200 items-center justify-center">
                                    <Text className="material-symbols-outlined text-xl text-slate-700">credit_card</Text>
                                </View>
                                <View>
                                    <Text className="text-slate-900 dark:text-white font-medium">Visa ending in 4242</Text>
                                    <Text className="text-xs text-slate-500 dark:text-zinc-400">Expires 12/26</Text>
                                </View>
                            </View>
                            <View className={`w-5 h-5 rounded-full border items-center justify-center ${paymentMethod === 'card' ? 'border-primary' : 'border-slate-300'}`}>
                                {paymentMethod === 'card' && <View className="w-2.5 h-2.5 rounded-full bg-primary" />}
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Order Summary */}
                <View className="mb-6">
                    <Text className="text-slate-900 dark:text-white text-lg font-bold mb-3">Order Summary</Text>
                    <View className="bg-white dark:bg-surface-dark rounded-xl p-5 border border-slate-200 dark:border-white/5 gap-4">
                        <View className="flex-row justify-between">
                            <Text className="text-slate-500 dark:text-zinc-400 text-sm">Subtotal</Text>
                            <Text className="text-slate-900 dark:text-white text-sm font-medium">$29.99</Text>
                        </View>
                        <View className="flex-row justify-between">
                            <Text className="text-slate-500 dark:text-zinc-400 text-sm">Platform Fee</Text>
                            <Text className="text-slate-900 dark:text-white text-sm font-medium">$2.00</Text>
                        </View>
                        <View className="h-px bg-slate-200 dark:bg-white/5 my-1" />
                        <View className="flex-row justify-between items-center">
                            <Text className="text-slate-900 dark:text-white text-base font-semibold">Total</Text>
                            <Text className="text-primary text-xl font-bold">$31.99</Text>
                        </View>
                    </View>
                </View>

                {/* Secure Badge */}
                <View className="flex-row justify-center items-center gap-2 mb-8 opacity-60">
                    <Text className="material-symbols-outlined text-slate-400 text-sm">lock</Text>
                    <Text className="text-xs text-slate-400">Payments are secure and encrypted</Text>
                </View>
            </ScrollView>

            {/* Footer CTA */}
            <View className="absolute bottom-0 left-0 w-full bg-background-light dark:bg-background-dark border-t border-zinc-200 dark:border-white/10 p-4 pb-8 z-20">
                <TouchableOpacity className="w-full bg-primary h-14 rounded-2xl flex-row items-center justify-center gap-2 shadow-lg shadow-primary/20">
                    <Text className="text-white font-bold text-lg">Pay $31.99</Text>
                    <Text className="material-symbols-outlined text-white text-xl">arrow_forward</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
