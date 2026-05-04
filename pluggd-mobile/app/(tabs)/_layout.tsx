import { Tabs } from "expo-router";
import { View } from "react-native";

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: "#000" }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            display: "none",
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: "Explore",
          }}
        />
        <Tabs.Screen
          name="drops"
          options={{
            title: "Drops",
          }}
        />
        <Tabs.Screen
          name="marketplace"
          options={{
            title: "Market",
          }}
        />
        <Tabs.Screen
          name="mixes"
          options={{
            title: "Mixes",
          }}
        />
        <Tabs.Screen
          name="events"
          options={{
            title: "Events",
          }}
        />
        <Tabs.Screen
          name="live"
          options={{
            title: "Live",
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            title: "Wallet",
            href: null,
          }}
        />
        <Tabs.Screen
          name="social"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="community"
          options={{
            title: "Community",
          }}
        />
        <Tabs.Screen
          name="soundboards"
          options={{
            title: "Soundboards",
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: "Profile",
          }}
        />
      </Tabs>
    </View>
  );
}
