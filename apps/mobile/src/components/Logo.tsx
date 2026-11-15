import { Image, StyleSheet } from "react-native";
import { logoWidth, spacing } from "../theme/tokens";

const sources = {
  app: require("../../assets/minotaur_logo.png"),
  // Adds the "Sportsko penjački klub" tagline.
  club: require("../../assets/spk_minotaur_logo.png"),
};

type LogoProps = {
  variant: keyof typeof sources;
  label: string;
  // Lets the logo serve as the screen heading.
  isHeader?: boolean;
  // Navigation header size: a 2:1 box that crops only the file's transparent padding.
  compact?: boolean;
};

export const Logo = ({ variant, label, isHeader = false, compact = false }: LogoProps) => (
  <Image
    source={sources[variant]}
    accessible
    accessibilityRole={isHeader ? "header" : "image"}
    accessibilityLabel={label}
    style={compact ? styles.compact : styles.logo}
    resizeMode={compact ? "cover" : "contain"}
  />
);

const styles = StyleSheet.create({
  logo: {
    width: logoWidth,
    // Both files are 1200x1133.
    aspectRatio: 1200 / 1133,
    alignSelf: "center",
  },
  // The artwork sits in the middle half of the file's height, so a centered
  // 2:1 crop removes only empty space.
  compact: {
    width: spacing[12] * 2,
    height: spacing[12],
  },
});
