// Only paths inside this app are followed after login, never another site
// (a link like /login?redirect=https://evil.example must not leave the app),
// and never the login page itself.
export const safeRedirect = (value: string | undefined): string =>
  value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\") && !value.startsWith("/login")
    ? value
    : "/";
