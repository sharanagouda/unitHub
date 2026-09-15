# UnitHub — setup

Bare React Native 0.87.1 / React 19.2.3 / TypeScript 6, `@react-native-firebase`.

## What is already done

- Project scaffolded, `com.unithub.app`
- TypeScript strict + `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- Path aliases (`@domain`, `@data`, `@features`, `@ui`, `@navigation`, `@lib`)
  wired in tsconfig, babel and jest
- ESLint rule enforcing that `src/domain` imports no Firebase, no data layer, no React
- Pure-TS rent engine + 15 passing tests reproducing PRD §10, §11 and §12
- `firestore.rules`, `storage.rules`, `firestore.indexes.json`
- Rules test suite against the Firestore emulator
- `src/data`: zod schemas + Firestore converters for `User`/`Tenancy`/`RentPeriod`/
  `Payment`, typed collection/doc refs, `useDoc`/`useCollection`
- `functions/`: a separate npm package (own `package.json`, own `tsconfig.json` —
  see its `exclude` in the root `tsconfig.json`) implementing
  `createTenantInvite` and `claimTenantInvite` — see docs/tenant-claim.md and
  the "tenant invite" decisions in docs/DECISIONS.md

## Scripts

| command | what it does |
|---|---|
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:domain` | rent engine tests (pure node, ~0.5s) |
| `npm run test:data` | data-layer schema/converter tests (pure node) |
| `npm run test:watch` | the domain tests, in watch mode |
| `npm run test:rules` | security rules against the Firestore emulator |
| `npm run emulators` | full emulator suite + UI on :4000 |
| `npm run lint` | eslint |
| `npm run pods` | `bundle exec pod install` |
| `npm run functions:test` | `functions/`'s own pure-logic tests |
| `npm run functions:typecheck` | `functions/`'s own `tsc --noEmit` |
| `npm run functions:build` | compiles `functions/src` → `functions/lib` |

`functions/` isn't part of the root npm project — run `npm install` inside it
once before its scripts (or the emulator's `functions` codebase) will work.

### JDK note

Gradle needs JDK 17 (your global `JAVA_HOME`); firebase-tools 15.x needs JDK 21+.
The emulator scripts prepend a 21+ JDK to `PATH` themselves, so both work without
you switching anything.

---

## What only you can do

### 1. Create the Firebase projects

Two of them — never develop against production data.

- `unithub-dev`
- `unithub-prod`

Both need Firestore (Native mode), Authentication, Storage, and the **Blaze
plan** (Cloud Functions requires it).

### 2. Register the apps and drop in the config files

For each project, register an iOS app (`com.unithub.app`) and an Android app
(`com.unithub.app`), then:

**iOS** — add `GoogleService-Info.plist` **through Xcode**:
File → Add Files to "UnitHub" → check *Copy items if needed* → check the app
target. Dragging it into the folder in Finder is not enough; it must appear in
Build Phases → Copy Bundle Resources or Firebase will fail at runtime with no
useful error.

**Android** — `google-services.json` into `android/app/`.

### 3. Native wiring

**`ios/UnitHub/AppDelegate.swift`** — configure Firebase before RN boots:

```swift
import FirebaseCore
// first line of didFinishLaunchingWithOptions:
FirebaseApp.configure()
```

**`ios/Podfile`** — if `pod install` fails with Swift/static-framework errors
(common once Crashlytics or Analytics are added), add at the top:

```ruby
$RNFirebaseAsStaticFramework = true
use_frameworks! :linkage => :static
```

**`android/build.gradle`** (project level):
```gradle
classpath 'com.google.gms:google-services:4.4.2'
```

**`android/app/build.gradle`**:
```gradle
apply plugin: 'com.google.gms.google-services'
android { defaultConfig { multiDexEnabled true } }   // Firestore pushes past 64k methods
```

Then `npm run pods`.

### 4. Phone auth (do this now, not at release)

- **iOS**: upload an APNs auth key to Firebase. Phone auth uses a silent push to
  verify the device; without it every sign-in falls back to a reCAPTCHA webview.
- **Android**: register **three** SHA-256 fingerprints — debug keystore, your
  release keystore, and **Play App Signing**. Missing the last one is why
  "works in my build, fails from the Play Store" happens.
- Enable Play Integrity API.
- Add **test phone numbers with fixed OTPs** in the Firebase console. Apple's
  reviewers cannot receive an Indian SMS; this is a common rejection cause.

### 5. Deploy rules before writing any data

```bash
firebase deploy --only firestore:rules,firestore:indexes,storage --project unithub-dev
```

### 6. Cloud Functions dependencies

```bash
cd functions && npm install
```

Needed before `npm run emulators` will actually serve `createTenantInvite` /
`claimTenantInvite`, and before `firebase deploy --only functions` will work.

---

## Layout

```
src/
  domain/      pure TS. money, dates, ids, types, rent/. No Firebase, no React.
  data/        firestore refs, zod schemas, converters, useDoc/useCollection
  features/    owner/ tenant/ public/
  ui/          design system
  navigation/  typed param lists, deep links, role router
  lib/         analytics, errors, formatting
tests/rules/   security rules tests
functions/     Cloud Functions — its own npm package, deployed separately
docs/
```

The one hard boundary: **`domain/` may not import `data/`**, enforced by ESLint.
It is what keeps the money logic testable without an emulator, and stops a
Firestore schema change from quietly altering a rent calculation.
