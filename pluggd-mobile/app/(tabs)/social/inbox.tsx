
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolIcon } from '../../../components/SymbolIcon';

export default function Inbox() {
    const router = useRouter();

    const threads = [
        {
            id: 1,
            name: 'ProdByJack',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuACVgtwuoEbuw4gaieViTeHWiUgjAWV9afWmyfgrt6WaKoWK830EoiWJNMLuZ10njJL1dEcIt2o96q6hq-lUn7KdMpwYw1rFEGVuTSjzYIkahDVGuOsBrkVvAdGOlyoO3cRJ9vnNty7noghRYi_cDveadd9te_5nqWoV1LeI-P9g3kI9xft6NPWAa8HzQgM6X76hro2Op5s2bJiFxlDezSj66j76wu3iC84YUhU8merKuBviKdNze6IkBnxq6wV2nMa1YLBaN0Tt5o',
            message: 'Yo, did you send those stems? I need them for the mix.',
            time: '2m',
            unread: true,
            isGroup: false,
        },
        {
            id: 2,
            name: 'Album: Neon Nights',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCQghRp7r-0au-UwrT-FNQk1EYyLmX07j2Zqhb-qwAatPc5c-vaBCc1rrdBL4OAuB3RpAOm3jHvWDa27MxGBKWTvEXfYBZ8fvT7ZitACVCEuVZnvcQiJ8I1iLg2U1bU8TR8Q0wAtrAooCYRY7_Ccy_RHxeCxESIRJisiIyxoOvhQW0x5N-4lt7NRo_VuGF8O1R3-Tbc8B1RabyO-dCffjkPHJhOIJ7taT5OPV2NIr11TsrwWv0ycUQtLYjj3CcOBwHQwADG8uegATE',
            message: 'Sarah: Just uploaded the vocal take. Let me know what you think!',
            time: '1h',
            unread: true,
            isGroup: true,
            groupIcon: 'album',
        },
        {
            id: 3,
            name: 'Exclusive License #402',
            initials: 'EL',
            message: 'System: Payment of $500.00 received.',
            time: 'Yesterday',
            unread: false,
            isSystem: true,
            status: 'Sold'
        },
        {
            id: 4,
            name: 'Maya Beats',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBLijjEccFZqOHkWgCkrNaiar4mESfyJil3zAw-dZNriVS51Vj7wALSPkAkfosBr2_6yFDCbkk-toablKAobDUrxqZJZ8Xfz0h_qcEa5mI7O9zLMavfkwzsjdFCXTTnnBqWYODlN0QjFyZXxBCz4xrpq83DwnTp-HyFk95N1VPtpeP1047OK8_3P0yIj4VM4w_534D2kAADYbbUxPjYqhxveLgwRo92oshI0LLV8ui6bUIMFTy9F7z2zl-Hj3hBPCExj0OG8ieprxc',
            message: 'Thanks for the feedback!',
            time: '2d',
            unread: false,
            isGroup: false,
            readReceipt: true,
        }
    ];

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="sticky top-0 z-20 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md pt-12 pb-3 px-4 border-b border-gray-100 dark:border-white/5">
                <View className="flex-row items-center justify-between mb-4">
                    <View className="flex-row items-center gap-2">
                        <TouchableOpacity onPress={() => router.back()} className="p-1">
                            <SymbolIcon name="arrow_back" className="text-slate-800 dark:text-white text-2xl" />
                        </TouchableOpacity>
                        <Text className="text-2xl font-bold text-slate-900 dark:text-white">Inbox</Text>
                    </View>
                    <View className="flex-row items-center gap-3">
                        <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10">
                            <SymbolIcon name="settings" className="text-slate-600 dark:text-gray-300" />
                        </TouchableOpacity>
                        <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-primary shadow-lg shadow-primary/30">
                            <SymbolIcon name="edit_square" className="text-white" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Search */}
                <View className="relative">
                    <View className="absolute inset-y-0 left-0 pl-3 justify-center pointer-events-none z-10">
                        <SymbolIcon name="search" className="text-slate-400 text-xl" />
                    </View>
                    <TextInput
                        className="w-full bg-white dark:bg-surface-dark text-slate-900 dark:text-white h-10 pl-10 pr-4 rounded-lg text-sm font-medium"
                        placeholder="Search messages, projects, or users..."
                        placeholderTextColor="#9ca3af"
                    />
                </View>

                {/* Filters */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-4 gap-2">
                    <TouchableOpacity className="h-8 px-4 bg-primary rounded-full items-center justify-center mr-2">
                        <Text className="text-white text-sm font-medium">All</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="h-8 px-4 bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 rounded-full items-center justify-center flex-row gap-1.5 mr-2">
                        <Text className="text-slate-600 dark:text-gray-300 text-sm font-medium">Unread</Text>
                        <View className="h-4 w-4 bg-primary rounded-full items-center justify-center">
                            <Text className="text-white text-[10px] font-bold">3</Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity className="h-8 px-4 bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 rounded-full items-center justify-center mr-2">
                        <Text className="text-slate-600 dark:text-gray-300 text-sm font-medium">Projects</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="h-8 px-4 bg-white dark:bg-surface-dark border border-gray-200 dark:border-white/10 rounded-full items-center justify-center mr-2">
                        <Text className="text-slate-600 dark:text-gray-300 text-sm font-medium">Commissions</Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>

            {/* Threads */}
            <ScrollView className="flex-1">
                {threads.map((thread) => (
                    <TouchableOpacity key={thread.id} className="flex-row items-center gap-4 p-4 active:bg-slate-50 dark:active:bg-white/5 border-b border-gray-100 dark:border-white/5">
                        {/* Avatar */}
                        <View className="relative shrink-0">
                            {thread.avatar ? (
                                <Image
                                    source={{ uri: thread.avatar }}
                                    className={`h-14 w-14 rounded-${thread.initials || thread.isGroup ? 'lg' : 'full'}`}
                                />
                            ) : (
                                <View className="h-14 w-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 items-center justify-center">
                                    <Text className="text-white font-bold text-lg">{thread.initials}</Text>
                                </View>
                            )}

                            {thread.unread && !thread.isSystem && (
                                <View className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-background-light dark:border-background-dark" />
                            )}

                            {thread.isGroup && (
                                <View className="absolute -bottom-1.5 -right-1.5 h-6 w-6 bg-surface-dark rounded-full items-center justify-center border-2 border-background-dark">
                                    <SymbolIcon name={thread.groupIcon ?? 'groups'} className="text-white text-[14px]" />
                                </View>
                            )}
                        </View>

                        {/* Content */}
                        <View className="flex-1 min-w-0">
                            <View className="flex-row items-center justify-between mb-0.5">
                                <View className="flex-row items-center gap-2 flex-1">
                                    <Text numberOfLines={1} className="text-base font-bold text-slate-900 dark:text-white flex-1">{thread.name}</Text>
                                    {thread.status && (
                                        <View className="bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">
                                            <Text className="text-[10px] font-bold text-green-500 uppercase tracking-wide">{thread.status}</Text>
                                        </View>
                                    )}
                                </View>
                                <Text className="text-xs font-medium text-slate-500 dark:text-gray-400 whitespace-nowrap ml-2">{thread.time}</Text>
                            </View>

                            <View className="flex-row items-center justify-between">
                                <Text numberOfLines={1} className={`text-sm pr-4 flex-1 ${thread.unread ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-500 dark:text-gray-400'}`}>
                                    {thread.message}
                                </Text>
                                {thread.unread && (
                                    <View className="h-2.5 w-2.5 bg-primary rounded-full shrink-0" />
                                )}
                                {thread.readReceipt && (
                                    <SymbolIcon name="done_all" className="text-primary text-base" />
                                )}
                            </View>
                        </View>
                    </TouchableOpacity>
                ))}
                <View className="h-24" />
            </ScrollView>

        </View>
    );
}
