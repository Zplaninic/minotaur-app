# Desktop app (Windows + macOS) with Tauri

A new `apps/desktop` (`@repo/desktop`) wraps the existing web frontend in a
Tauri v2 shell and produces installers for Windows (`.msi`, NSIS `.exe`) and
macOS (`.dmg`, `.app`). The UI stays in `apps/frontend`; desktop holds only the
Rust shell, its config, icons, and capabilities. The backend does not change.

## Decisions
- **Shell:** Tauri v2, latest stable. Tauri crates are pinned exactly in
  `Cargo.toml` (`=x.y.z`), npm packages are pinned exactly in `package.json`.
- **Frontend reuse:** desktop does not import frontend source. Its
  `tauri.conf.json` runs `pnpm --filter @repo/frontend build:desktop` and
  serves `apps/frontend/dist-desktop`. In dev it points `devUrl` at the Vite
  dev server started with `--mode desktop`.
- **Platform adapter in the frontend:** `src/platform/` exposes one
  interface, `{ authTransport, fetch, getSessionToken, saveSessionToken,
  clearSessionToken }`. `web.ts` uses the cookie transport, global `fetch`, and
  no token. `desktop.ts` uses the token transport, the Tauri HTTP plugin's
  `fetch`, and the keychain. The adapter is picked by
  `import.meta.env.MODE === "desktop"` in one place, so the web bundle drops
  the desktop code during tree shaking.
- **Auth:** the bearer token transport (`transport: "token"`), the same one
  mobile uses. The backend already supports it, so the API contract and the
  CSRF origin check on cookies stay the same.
- **Token storage:** the OS keychain (macOS Keychain, Windows Credential
  Manager) through the `keyring` crate, behind three Rust commands:
  `session_token_get`, `session_token_set`, `session_token_clear`. The token
  never touches `localStorage`.
- **HTTP:** `@tauri-apps/plugin-http` sends requests from Rust, so the
  webview's origin (`tauri://localhost` / `http://tauri.localhost`) never makes
  a cross-origin request. This avoids adding CORS to the backend. The plugin's
  URL scope allows only the API URL: `http://127.0.0.1:3000/*` in dev and the
  production API in release builds.
- **Shared change:** `ApiClientOptions` gets an optional `fetch` (defaulting
  to the global `fetch`), so the desktop build can pass the plugin's `fetch` to
  `createApiClient`. No schema or contract change.
- **Config:** `apps/frontend/.env.desktop` (committed, no secrets) sets
  `VITE_API_URL` for dev, and `.env.desktop.production` sets the production API
  URL. Both are validated by the existing zod `env.ts`.
- **Updates:** `tauri-plugin-updater` with a signed update manifest. The
  updater key pair is created with `tauri signer generate`; the private key
  lives only in CI secrets.
- **Signing:** macOS uses an Apple Developer ID Application certificate plus
  notarization. Windows uses a code-signing certificate (Azure Trusted
  Signing or OV/EV). All credentials are CI secrets.

## Structure
```
apps/desktop/
  package.json              @repo/desktop: scripts dev, build, lint, typecheck; @tauri-apps/cli
  src-tauri/
    Cargo.toml              tauri, tauri-plugin-http, tauri-plugin-updater, keyring
    build.rs
    tauri.conf.json         identifier, window, frontendDist, devUrl, bundle targets, updater
    capabilities/
      default.json          core window perms, http scope (API URL only), updater
    icons/                  generated with `tauri icon` from the brand logo
    src/
      main.rs               entry point
      lib.rs                builder, plugins, command registration
      session_token.rs      keychain commands
apps/frontend/
  .env.desktop
  .env.desktop.production
  src/platform/
    platform.ts             the interface and the MODE switch
    web.ts
    desktop.ts              plugin-http fetch, invoke() for the token commands
```

## Prerequisites (each dev machine)
- Rust stable via `rustup`.
- macOS: Xcode Command Line Tools.
- Windows: MSVC Build Tools ("Desktop development with C++") and WebView2
  (preinstalled on Windows 10/11).

## Steps
- [ ] 1. Shared: add the optional `fetch` to `ApiClientOptions` with a test,
       then run the shared build and the typecheck of every app (CLAUDE.md
       order).
- [ ] 2. Frontend: add `src/platform/` (web + desktop adapters), and use it in
       `api/client.ts` (`fetch`, `getHeaders`) and `api/auth.ts` (transport;
       on desktop, save the token on login and clear it on logout, as in
       mobile `api/auth.ts`). Add the `build:desktop` script
       (`tsc --noEmit && vite build --mode desktop --outDir dist-desktop`),
       the `.env.desktop*` files, `@tauri-apps/api`, and
       `@tauri-apps/plugin-http`. Add tests for both adapters' auth flows with
       the Tauri modules mocked. The web build must behave exactly as before.
- [ ] 3. Desktop: scaffold `apps/desktop` with `pnpm create tauri-app`
       (or `tauri init` inside `apps/desktop`), then trim it to the structure
       above. Set `identifier` (e.g. `hr.minotaur.app`), the window title and
       minimum size, `beforeDevCommand` / `beforeBuildCommand` pointing at the
       frontend, `frontendDist: ../../frontend/dist-desktop`, and generate the
       icons.
- [ ] 4. Desktop: add the http plugin with a scoped capability, and the
       keychain commands in `session_token.rs` (`keyring` entry with service
       `hr.minotaur.app` and user `session-token`). Add Rust unit tests for
       the command logic.
- [ ] 5. Run `pnpm --filter @repo/desktop dev` against the local backend.
       Check login, reload, relaunch (still logged in through the keychain),
       logout, a 401 after session expiry, and deep reload on a nested route.
       If a reload on a nested route shows a blank page, switch the desktop
       build to hash history in `routes/router`.
- [ ] 6. Updater: generate the signer key pair, add the public key and the
       update endpoint to `tauri.conf.json`, and add an "update available"
       check on startup with its strings in the messages file (en + hr).
- [ ] 7. CI: GitHub Actions workflow with `tauri-apps/tauri-action` on
       `macos-latest` (universal: `aarch64` + `x86_64`) and `windows-latest`.
       It is triggered by a `desktop-v*` tag, signs and notarizes, and uploads
       the installers and `latest.json` to a draft GitHub release.
- [ ] 8. Docs: add `apps/desktop` to the CLAUDE.md structure and its
       boundary (the shell over the frontend build; Tauri JS packages only in
       `src/platform/desktop.ts`), and the desktop commands to README.
- [ ] 9. Typecheck, lint, test shared, frontend, and desktop
       (`cargo clippy`, `cargo test`); commit per package.

## Review
- The web build is unchanged: cookie login and no Tauri code in the
  `dist/` bundle (grep for `@tauri-apps`).
- The token is in the keychain and not in webview storage (check DevTools
  Application tab).
- The http scope rejects any URL other than the API.
- Visual, on both platforms: window chrome, minimum window size, fonts
  (Figtree / Red Hat Display bundled, so no network font loading), focus
  states, and WebKit (macOS) vs WebView2 (Windows) rendering differences.
- Installer flow: SmartScreen on Windows, Gatekeeper on macOS, and
  auto-update from one tagged version to the next.
