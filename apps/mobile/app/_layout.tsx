import { Figtree_400Regular } from "@expo-google-fonts/figtree/400Regular";
import { Figtree_600SemiBold } from "@expo-google-fonts/figtree/600SemiBold";
import { Figtree_900Black } from "@expo-google-fonts/figtree/900Black";
import { RedHatDisplay_400Regular } from "@expo-google-fonts/red-hat-display/400Regular";
import { RedHatDisplay_600SemiBold } from "@expo-google-fonts/red-hat-display/600SemiBold";
import { RedHatDisplay_900Black } from "@expo-google-fonts/red-hat-display/900Black";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";

const queryClient = new QueryClient();

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Figtree_400Regular,
    Figtree_600SemiBold,
    Figtree_900Black,
    RedHatDisplay_400Regular,
    RedHatDisplay_600SemiBold,
    RedHatDisplay_900Black,
  });

  // On a font error the app still renders, with the system font.
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }} />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
