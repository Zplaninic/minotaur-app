import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Minotaur",
  slug: "minotaur",
  version: "0.0.0",
  scheme: "minotaur",
  orientation: "portrait",
  userInterfaceStyle: "light",
  plugins: ["expo-router"],
  experiments: {
    typedRoutes: true,
  },
};

export default config;
