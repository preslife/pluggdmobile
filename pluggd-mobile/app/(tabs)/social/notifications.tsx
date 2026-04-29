
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function Notifications() {
    const router = useRouter();

    const notifications = [
        {
            id: 1,
            title: 'Payout Successful',
            message: 'Your monthly earnings of $450.00 have been deposited.',
            time: '2m ago',
            type: 'revenue', // icon: attach_money, color: primary
            unread: true,
            highlight: '$450.00'
        },
        {
            id: 2,
            title: 'Beat Purchased',
            message: 'User @TrapStar purchased an Exclusive License for "Nightmare".',
            time: '1h ago',
            type: 'sale', // icon: shopping_cart, color: white/gray
            unread: false,
            highlight: '@TrapStar'
        },
        {
            id: 3,
            title: 'New Follower',
            message: 'DjKhaledFan joined your network.',
            time: '3h ago',
            type: 'social', // icon: person_add
            unread: false,
            highlight: 'DjKhaledFan'
        },
        {
            id: 4,
            title: 'Reply in Hub',
            message: 'ProducerMike replied to your thread "Mixing Vocals".',
            time: '5h ago',
            type: 'reply', // icon: forum
            unread: false,
            highlight: 'ProducerMike'
        },
        {
            id: 5,
            title: 'System Update',
            message: 'Pluggd Studio v2.4 is now available. Check out the new features.',
            time: '1d ago',
            type: 'system', // icon: info
            unread: false,
            isOld: true
        }
    ];

    const getIcon = (type: string) => {
        switch (type) {
            case 'revenue': return 'attach_money';
            case 'sale': return 'shopping_cart';
            case 'social': return 'person_add';
            case 'reply': return 'forum';
            default: return 'info';
        }
    };

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="sticky top-0 z-20 bg-background-light dark:bg-background-dark pt-12 px-5 pb-2">
                <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center gap-2">
                        <TouchableOpacity onPress={() => router.back()} className="p-1">
                            <Text className="material-symbols-outlined text-slate-800 dark:text-white text-2xl">arrow_back</Text>
                        </TouchableOpacity>
                        <Text className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Notifications</Text>
                    </View>
                    <TouchableOpacity className="flex-row items-center">
                        <Text className="text-primary text-sm font-bold mr-4">Mark all read</Text>
                        <Text className="material-symbols-outlined text-slate-900 dark:text-white text-2xl">settings</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Filters (Sticky below header) */}
            <View className="z-10 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-sm pt-2 pb-4">
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 gap-3">
                    <TouchableOpacity className="h-9 px-5 bg-primary rounded-full items-center justify-center shadow-lg shadow-primary/20 mr-3">
                        <Text className="text-white text-sm font-bold">All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="h-9 px-5 bg-gray-200 dark:bg-white/5 rounded-full items-center justify-center mr-3">
                        <Text className="text-gray-700 dark:text-gray-300 text-sm font-medium">Sales</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="h-9 px-5 bg-gray-200 dark:bg-white/5 rounded-full items-center justify-center mr-3">
                        <Text className="text-gray-700 dark:text-gray-300 text-sm font-medium">Social</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="h-9 px-5 bg-gray-200 dark:bg-white/5 rounded-full items-center justify-center mr-3">
                        <Text className="text-gray-700 dark:text-gray-300 text-sm font-medium">System</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* Feed */}
            <ScrollView className="flex-1">
                <View className="px-5 pt-2 pb-2">
                    <Text className="text-gray-500 dark:text-text-secondary text-sm font-bold uppercase tracking-wider">Today</Text>
                </View>

                {notifications.filter(n => !n.isOld).map((n) => (
                    <TouchableOpacity key={n.id} className="flex-row items-start gap-4 px-5 py-4 border-b border-gray-100 dark:border-white/5 bg-transparent active:bg-white/5">
                        <View className={`relative shrink-0 flex items-center justify-center h-12 w-12 rounded-2xl ${n.type === 'revenue' ? 'bg-primary/15' : 'bg-gray-100 dark:bg-[#1c1c1c] border border-transparent dark:border-white/5'}`}>
                            <Text className={`material-symbols-outlined text-2xl ${n.type === 'revenue' ? 'text-primary' : (n.type === 'sale' ? 'text-primary' : 'text-gray-400 dark:text-white')}`}>{getIcon(n.type)}</Text>
                            {n.unread && (
                                <View className="absolute top-0 right-0 -mt-1 -mr-1 h-3 w-3 rounded-full bg-primary ring-2 ring-white dark:ring-background-dark" />
                            )}
                        </View>
                        <View className="flex-1 gap-1">
                            <View className="flex-row justify-between items-start">
                                <Text className="text-base font-bold text-slate-900 dark:text-white leading-tight">{n.title}</Text>
                                <Text className="text-gray-400 dark:text-zinc-500 text-xs font-medium ml-2">{n.time}</Text>
                            </View>
                            <Text className="text-gray-600 dark:text-gray-400 text-sm leading-normal">
                                {n.message}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}

                <View className="px-5 pt-6 pb-2">
                    <Text className="text-gray-500 dark:text-text-secondary text-sm font-bold uppercase tracking-wider">Yesterday</Text>
                </View>

                {notifications.filter(n => n.isOld).map((n) => (
                    <TouchableOpacity key={n.id} className="flex-row items-start gap-4 px-5 py-4 opacity-75 active:bg-white/5">
                        <View className="relative shrink-0 flex items-center justify-center h-12 w-12 rounded-2xl bg-gray-100 dark:bg-[#1c1c1c] border border-transparent dark:border-white/5">
                            <Text className="material-symbols-outlined text-gray-400 text-2xl">info</Text>
                        </View>
                        <View className="flex-1 gap-1">
                            <View className="flex-row justify-between items-start">
                                <Text className="text-base font-bold text-slate-900 dark:text-white leading-tight">{n.title}</Text>
                                <Text className="text-gray-400 dark:text-zinc-500 text-xs font-medium ml-2">{n.time}</Text>
                            </View>
                            <Text className="text-gray-600 dark:text-gray-400 text-sm leading-normal">
                                {n.message}
                            </Text>
                        </View>
                    </TouchableOpacity>
                ))}

                <View className="items-center py-10 opacity-50">
                    <View className="bg-gray-200 dark:bg-[#1c1c1c] rounded-full p-4 mb-3">
                        <Text className="material-symbols-outlined text-primary text-3xl">check</Text>
                    </View>
                    <Text className="text-sm text-gray-500">You're all caught up</Text>
                </View>
            </ScrollView>

        </View>
    );
}
