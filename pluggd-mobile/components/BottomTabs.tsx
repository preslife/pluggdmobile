import { View, TouchableOpacity, Text } from "react-native";
import { usePathname, useRouter } from "expo-router";
import { MaterialIcons } from "@expo/vector-icons";

type Tab = {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  route: string;
};

const tabs: Tab[] = [
  { label: "Home", icon: "home-filled", route: "/" },
  { label: "Market", icon: "shopping-bag", route: "/marketplace" },
  { label: "Live", icon: "videocam", route: "/live" },
  { label: "Social", icon: "chat-bubble", route: "/social/hub" },
  { label: "Profile", icon: "person", route: "/profile" },
];

export function BottomTabs() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <View className="absolute bottom-0 left-0 right-0 pb-6 pt-3 px-5 bg-black/60 dark:bg-black/70 backdrop-blur-lg border-t border-white/10 flex-row justify-between z-40">
      {tabs.map((tab) => {
        const active = pathname === tab.route || pathname?.startsWith(tab.route + "/");
        return (
          <TouchableOpacity
            key={tab.route}
            onPress={() => router.push(tab.route as any)}
            className="flex-1 items-center gap-1"
          >
            <MaterialIcons
              name={tab.icon}
              size={24}
              color={active ? "#FF5200" : "rgba(255,255,255,0.7)"}
            />
            <Text className={`text-[11px] ${active ? "text-primary" : "text-white/70"} font-semibold`}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
