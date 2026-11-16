import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { currentLanguage, LANGUAGES, setLanguage } from "../lib/i18n";
import { useMessages } from "../lib/messages";
import { bodyLineHeight, borders, colors, fonts, fontSizes, minTouchSize, spacing } from "../theme/tokens";

// Each language is named in itself, so it can be found whatever is shown now.
export const LanguageSwitcher = () => {
  const { t } = useMessages();
  // Subscribes to language changes, so the checked option follows them.
  useTranslation();
  const active = currentLanguage();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={t("language.label")} style={styles.group}>
      {LANGUAGES.map((language, index) => {
        const checked = language === active;
        return (
          <Pressable
            key={language}
            onPress={() => setLanguage(language)}
            accessibilityRole="radio"
            accessibilityState={{ checked }}
            accessibilityLanguage={language}
            style={({ pressed }) => [
              styles.option,
              index > 0 && styles.next,
              checked ? styles.checked : pressed && styles.pressed,
            ]}
          >
            <Text style={[styles.label, checked && styles.checkedLabel]}>{t(`language.${language}`)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    alignSelf: "center",
  },
  option: {
    minHeight: minTouchSize,
    minWidth: minTouchSize,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[4],
    borderWidth: borders.width,
    borderColor: colors.greenDark,
    backgroundColor: colors.beige10,
  },
  next: {
    borderLeftWidth: 0,
  },
  pressed: {
    backgroundColor: colors.greenDark10,
  },
  checked: {
    backgroundColor: colors.greenDark,
  },
  label: {
    color: colors.greenDark,
    fontFamily: fonts.bodySemibold,
    fontSize: fontSizes.sm,
    lineHeight: bodyLineHeight(fontSizes.sm),
  },
  checkedLabel: {
    color: colors.beige10,
  },
});
