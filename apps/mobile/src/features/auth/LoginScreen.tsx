import { loginBody } from "@repo/shared";
import { toErrorCode } from "@repo/shared/client";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useLogin } from "../../api/auth";
import { Button } from "../../components/Button";
import { fieldStyles } from "../../components/fieldStyles";
import { LanguageSwitcher } from "../../components/LanguageSwitcher";
import { Logo } from "../../components/Logo";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { type MessageKey, useMessages } from "../../lib/messages";
import {
  bodyLineHeight,
  borders,
  colors,
  fonts,
  fontSizes,
  headingLineHeight,
  minTouchSize,
  radii,
  shadows,
  spacing,
} from "../../theme/tokens";

const fieldErrorKeys: Record<string, MessageKey> = {
  email: "login.error.email",
  password: "login.error.password",
};

// After a successful login the root navigator switches to the app screens on its own.
export const LoginScreen = () => {
  const { errorMessage, t } = useMessages();
  const login = useLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const validation = loginBody.safeParse({ email, password });
  const fieldErrors: Partial<Record<string, string>> = {};
  if (submitted && !validation.success) {
    for (const issue of validation.error.issues) {
      const field = String(issue.path[0]);
      const key = fieldErrorKeys[field];
      if (key) {
        fieldErrors[field] ??= t(key);
      }
    }
  }

  const serverCode = login.error ? toErrorCode(login.error) : undefined;
  const formError =
    serverCode === "UNAUTHORIZED"
      ? t("login.error.credentials")
      : serverCode === "RATE_LIMITED"
        ? t("login.error.rateLimited")
        : serverCode
          ? errorMessage(serverCode)
          : undefined;

  const submit = () => {
    setSubmitted(true);
    if (validation.success) {
      login.mutate({ email, password });
    }
  };

  return (
    <Screen>
      <View style={styles.content}>
        <Logo variant="club" label={t("app.clubName")} />
        <Text accessibilityRole="header" style={styles.title}>
          {t("login.title")}
        </Text>
        <TextField
          label={t("login.email")}
          value={email}
          onChangeText={setEmail}
          error={fieldErrors["email"]}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="username"
        />
        <TextField
          label={t("login.password")}
          value={password}
          onChangeText={setPassword}
          error={fieldErrors["password"]}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
        />
        <Pressable
          onPress={() => setShowPassword((current) => !current)}
          accessibilityRole="switch"
          accessibilityLabel={t("login.showPassword")}
          accessibilityState={{ checked: showPassword }}
          style={styles.toggle}
        >
          <View style={[styles.box, showPassword && styles.boxChecked]} />
          <Text style={fieldStyles.value}>{t("login.showPassword")}</Text>
        </Pressable>
        {formError ? (
          <Text style={styles.formError} accessibilityLiveRegion="polite">
            {formError}
          </Text>
        ) : null}
        <Button
          label={login.isPending ? t("login.submitting") : t("login.submit")}
          onPress={submit}
          disabled={login.isPending}
        />
        <LanguageSwitcher />
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  content: {
    gap: spacing[4],
    marginTop: spacing[4],
    padding: spacing[6],
    borderRadius: radii.lg,
    backgroundColor: colors.beige10,
    ...shadows.raised,
  },
  title: {
    color: colors.greenDark,
    fontFamily: fonts.displayBlack,
    fontSize: fontSizes.xxl,
    lineHeight: headingLineHeight(fontSizes.xxl),
  },
  toggle: {
    minHeight: minTouchSize,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  box: {
    width: spacing[4],
    height: spacing[4],
    borderRadius: spacing[1],
    borderWidth: borders.width,
    borderColor: colors.greenDark,
  },
  boxChecked: {
    backgroundColor: colors.greenDark,
  },
  formError: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radii.md,
    overflow: "hidden",
    borderLeftWidth: spacing[1],
    borderLeftColor: colors.red,
    backgroundColor: colors.red10,
    color: colors.greenDark,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.md,
    lineHeight: bodyLineHeight(fontSizes.md),
  },
});
