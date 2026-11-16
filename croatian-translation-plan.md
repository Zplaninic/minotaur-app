# Croatian translation (en + hr)

Frontend and mobile get Croatian alongside English, using i18next +
react-i18next. Backend and shared are unchanged: the API returns error codes,
and the clients map them to messages.

## Decisions
- Language: default from the browser/device language (`hr*` → Croatian,
  anything else → English), plus an in-app switcher that remembers the choice.
- Library: `i18next` + `react-i18next`, latest stable, pinned exact, in both apps.
- i18next is configured with `{name}` interpolation, so existing strings and
  placeholders stay as they are. React already escapes, so `escapeValue: false`.
- No current message needs plural forms; Croatian strings keep the same
  plural-free phrasing.

## Structure (each app)
- `src/lib/locales/en.ts`: the current English messages and API error messages.
- `src/lib/locales/hr.ts`: typed as `Record<keyof typeof en, string>`, so a
  missing key is a compile error.
- `src/lib/i18n.ts`: i18next instance, language detection, persistence,
  `setLanguage`, `<html lang>` (frontend) kept in sync.
- `src/lib/messages.ts`: keeps `MessageKey`, the field-error key helpers and
  `weekdayKey`; `t` / `errorMessage` move to a `useMessages()` hook built on
  `useTranslation()` so components re-render when the language changes.
- `src/lib/format.ts`: format helpers take the current i18n language instead
  of the fixed `locale = "en"`.
- Typed keys through `MessageKey` (keys of `en`) on the `t` that
  `useMessages()` returns; `translate` is the same for code outside components
  (helpers, alerts, tests).

## Steps
- [x] 1. Frontend: install i18next + react-i18next, add i18n setup and en/hr
       locale files, Croatian translations.
- [x] 2. Frontend: switch components from module-level `t` to the hook; format
       helpers use the active language.
- [x] 3. Frontend: language switcher in the nav and on the login page; update
       tests (render inside the i18n provider, English in tests).
- [x] 4. Mobile: same setup; device language via `expo-localization`, choice
       stored with `expo-secure-store` (web: localStorage).
- [x] 5. Mobile: switch screens to the hook; switcher on the home screen and
       the login screen; update tests.
- [x] 6. Typecheck, lint, test both apps; commit per app.

## Review
- Croatian wording (club terms: članarina, grupa, trening, dolazak).
- Visual: longer Croatian strings in nav, tables, buttons; both platforms on
  mobile, small and large screens, larger font sizes.
