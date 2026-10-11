# Releasing EGX Analytics (mobile)

Everything here is run by a person with the Expo / Apple / Google accounts. Nothing
in this file has been executed by an agent beyond the preview build, if the user
asked for it.

## 0. Once per machine / project

1. Confirm the bundle id `com.markbotros.egxanalytics` (an UNCONFIRMED proposal; app.json `ios.bundleIdentifier`,
   `android.package`). It cannot change after the first store upload.
2. `npx eas-cli@latest login` (interactive).
3. `npx eas-cli@latest init` — creates the EAS project and writes
   `expo.extra.eas.projectId` (and `owner`) into `app.json`. Commit that change.
4. Create the public env vars in each EAS environment (`.env` is not uploaded).
   Check the subcommand name first with `npx eas-cli@latest env --help`
   (`env:create` in current CLIs):
   ```bash
   for ENV in development preview production; do
     npx eas-cli@latest env:create --environment $ENV --name EXPO_PUBLIC_API_BASE_URL \
       --value https://<backend-host>/api --visibility plaintext
     npx eas-cli@latest env:create --environment $ENV --name EXPO_PUBLIC_FE_BASE_URL \
       --value https://<web-app-host> --visibility plaintext
   done
   ```
   These are public values (inlined into the bundle), not secrets.

## 1. Internal Android preview (APK)

```bash
mkdir -p ~/logs
tmux kill-session -t egx-mobile-eas-preview 2>/dev/null
tmux new -d -s egx-mobile-eas-preview \
  "cd /home/mark/projects/egx-api/egx-api-mobile && npx eas-cli@latest build --profile preview --platform android 2>&1 | tee ~/logs/egx-mobile-eas-preview.log"
tmux attach -t egx-mobile-eas-preview   # answer the first-run keystore prompt ("Generate new keystore": yes), then Ctrl-b d
```
When it finishes the log ends with a build URL and an install QR code; open it on the
phone, download the APK, allow "install unknown apps" for the browser. Later runs can
add `--non-interactive` (credentials then exist on EAS).

## 2. Development build (only if a native module outside Expo Go is ever added)

`npx expo install expo-dev-client`, commit, then
`npx eas-cli@latest build --profile development --platform android`. Note that with
`expo-dev-client` installed `npx expo start` opens dev-client mode by default (press `s`
to switch to Expo Go).

## 3. Production builds

```bash
npx eas-cli@latest build --profile production --platform android   # .aab
npx eas-cli@latest build --profile production --platform ios        # needs Apple Developer membership
```
Build numbers are remote and auto-incremented (`appVersionSource: remote`); bump
`expo.version` in app.json for a user-visible version change.

## 4. Store submission (documented, not executed)

**Google Play**
1. Play Console → Create app "EGX Analytics", default language, app/free.
2. Complete App content: privacy policy URL (the app stores a username, portfolio
   holdings, sales, dividends and a watchlist on the EGX Analytics backend; no ads, no
   third-party analytics), Data safety form to match, content rating questionnaire,
   target audience (adults), "financial features": informational only — the app gives
   no investment advice (the composite score is educational).
3. Store listing: short/full description, 512×512 icon (`../egx-api-fe/public/icons/egx-logo-512.png`),
   1024×500 feature graphic, ≥ 2 phone screenshots (Dashboard, Stock, Portfolio, Learn).
4. The FIRST upload of a new app must be manual: upload the production `.aab` to an
   Internal testing track in the console.
5. For later uploads create a Google Cloud service account with Play access, download
   its JSON key (never commit it), set `submit.production.android.serviceAccountKeyPath`
   in eas.json to its local path, then `npx eas-cli@latest submit -p android --latest`.
6. Promote Internal → Closed → Production after testing. New personal developer
   accounts must run a closed test with testers for the required period before
   production access is granted — check the current Play policy.

**Apple App Store**
1. Apple Developer Program membership; App Store Connect → New App, bundle id
   `com.markbotros.egxanalytics`, name "EGX Analytics" (must be unique on the store).
2. `npx eas-cli@latest submit -p ios --latest` (EAS asks for the Apple ID / creates an
   App Store Connect API key) → build appears in TestFlight.
3. App Privacy answers (same data as above, linked to the user, not used for tracking),
   screenshots for 6.9" and 6.5" iPhones, review notes with a demo account (accounts
   are admin-created; there is no sign-up), export compliance already declared via
   `usesNonExemptEncryption: false`.
4. Submit for review.
