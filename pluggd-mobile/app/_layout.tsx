import { Slot } from "expo-router";
import { StripeProvider } from "@stripe/stripe-react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";
import { AuthProvider } from "../src/context/AuthProvider";

const publishableKey = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider publishableKey={publishableKey} merchantIdentifier="merchant.com.pluggd.app">
        <AuthProvider>
          <Slot />
        </AuthProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
