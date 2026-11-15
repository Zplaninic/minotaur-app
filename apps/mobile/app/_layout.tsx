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
import { t } from "../src/lib/messages";
import { colors, fonts } from "../src/theme/tokens";

// Native headers only on the members screens; other screens draw their own heading.
const headerOptions = {
  headerShown: true,
  headerTintColor: colors.greenDark,
  headerStyle: { backgroundColor: colors.beige10 },
  headerTitleStyle: { fontFamily: fonts.displayBlack },
  headerBackButtonDisplayMode: "minimal",
} as const;

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
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="members/index" options={{ ...headerOptions, title: t("members.title") }} />
          <Stack.Screen
            name="members/new"
            options={{ ...headerOptions, title: t("memberForm.title"), presentation: "modal" }}
          />
        </Stack>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
