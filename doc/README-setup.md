# Mushroom Farm Mobile — Setup & Dev Guide

**Stack:** React Native · Expo SDK 52 · Firebase Realtime DB · TypeScript

---

## Requirements

| Tool | Version | Notes |
|------|---------|-------|
| Node.js | 18+ (20 LTS recommended) | |
| Java | 17 | Temurin recommended |
| Android Studio | Latest | API 36 + NDK 27.1.12297006 |
| Android AVD | `Medium_Phone_API_36.0` | API 36, x86_64 |
| npm | 9+ | bundled with Node |

---

## New Machine Setup

### macOS / Linux / WSL

```bash
git clone <repo>
cd mushroom-farm-mobile
bash setup.sh
```

`setup.sh` automatically:
- Installs Homebrew (macOS) or apt packages (Linux/WSL)
- Installs Node.js 20 LTS via nvm
- Installs Java 17 (Temurin)
- Detects Android SDK, sets `ANDROID_HOME` + `PATH` in shell profile
- Checks NDK `27.1.12297006`
- Creates AVD `Medium_Phone_API_36.0`
- Runs `npm install`
- Runs `npx tsc --noEmit` to verify zero errors

After it finishes:
```bash
source ~/.zshrc   # or ~/.bashrc on Linux/WSL
```

---

### Windows

```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
.\setup.ps1
```

`setup.ps1` automatically:
- Installs Chocolatey
- Installs Node.js 20 LTS, Java 17 (Temurin), Git via choco
- Detects Android SDK, sets `ANDROID_HOME` in User environment
- Checks NDK `27.1.12297006`
- Runs `npm install` + TypeScript check

> **Android Studio** must be installed manually on Windows:
> https://developer.android.com/studio
> Then in SDK Manager install: Android API 36, Emulator, Platform-Tools, NDK 27.1.12297006

---

## Build the debug APK (first time only)

```bash
./build-apk.sh
```

Output: `android/app/build/outputs/apk/debug/app-debug.apk`

Takes ~5 min first time. Required before `./dev.sh` can install the app on the emulator.

---

## Run in Development

```bash
./dev.sh
```

That's it. `dev.sh` does everything:

1. `npx tsc --noEmit` — aborts if TypeScript errors
2. Clears port 8081
3. Starts emulator `Medium_Phone_API_36.0` (if not running)
4. Installs debug APK (if not installed)
5. `adb reverse tcp:8081 tcp:8081`
6. Starts Metro with QR code + interactive menu
7. Auto-launches app on emulator when Metro is ready

**Real phone:** Install **Expo Go** (Play Store / App Store), connect to same WiFi, scan QR code.

**Emulator:** App launches automatically — no action needed.

---

## Key Commands

```bash
./dev.sh                          # start everything
./build-apk.sh                    # build debug APK
npx tsc --noEmit                  # TypeScript check only
pkill -f 'expo start'             # stop Metro
tail -f /tmp/metro_mushroom.log   # live Metro log
```

---

## Project Config

| Item | Value |
|------|-------|
| Firebase project | `project-mushroom-2f8a9` |
| DB URL | `https://project-mushroom-2f8a9-default-rtdb.asia-southeast1.firebasedatabase.app` |
| App package | `com.anonymous.mushroomfarmmobile` |
| NDK version | `27.1.12297006` |
| Metro port | `8081` |
| AVD | `Medium_Phone_API_36.0` |

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Metro won't start | `pkill -f 'expo start'` then `./dev.sh` |
| App not updating | Press `r` in Metro terminal |
| QR code not scanning | Same WiFi? Try `npx expo start --tunnel` |
| TypeScript errors | `npx tsc --noEmit` to see details |
| APK not found | Run `./build-apk.sh` first |
| Emulator won't boot | Open Android Studio → AVD Manager → start manually |
| `ANDROID_HOME` not set | Re-run `bash setup.sh` then `source ~/.zshrc` |
| NDK missing | Android Studio → SDK Manager → SDK Tools → NDK 27.1.12297006 |
