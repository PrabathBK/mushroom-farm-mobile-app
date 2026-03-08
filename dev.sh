#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
#  Mushroom Farm Mobile — Dev Runner
#  Usage: ./dev.sh
#
#  What it does:
#    1.  TypeScript check (aborts on errors)
#    2.  Kills any process on port 8081
#    3.  Starts Android emulator (Medium_Phone_API_36.0) if not running
#    4.  Waits for emulator to fully boot
#    5.  Installs debug APK if not already installed
#    6.  Sets up adb reverse for Metro
#    7.  Starts Metro in the FOREGROUND via exec — full QR code + interactive
#        menu visible, press a/r/j/m etc. all work normally
#    8.  Background watcher auto-launches the app on the emulator once Metro
#        is ready (real phone: scan the QR code with Expo Go)
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colours ──────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

# ── Config ───────────────────────────────────────────────────────────────────
AVD_NAME="Medium_Phone_API_36.0"
APP_PACKAGE="com.anonymous.mushroomfarmmobile"
APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
METRO_PORT=8081
METRO_LOG="/tmp/metro_mushroom.log"
READY_SENTINEL="/tmp/.metro_mushroom_ready"

step() { echo -e "\n${CYAN}${BOLD}▶  $1${NC}"; }
ok()   { echo -e "   ${GREEN}✔  $1${NC}"; }
warn() { echo -e "   ${YELLOW}⚠  $1${NC}"; }
err()  { echo -e "   ${RED}✖  $1${NC}"; }

# ── 0. TypeScript check ───────────────────────────────────────────────────────
step "TypeScript check"
if npx tsc --noEmit 2>&1; then
  ok "0 errors"
else
  err "TypeScript errors found — fix before running"
  exit 1
fi

# ── 1. Kill anything on port 8081 ────────────────────────────────────────────
step "Clearing port $METRO_PORT"
pkill -f "expo start" 2>/dev/null && warn "Killed previous Metro process" || true
PIDS=$(lsof -ti tcp:$METRO_PORT 2>/dev/null || true)
if [ -n "$PIDS" ]; then
  echo "$PIDS" | xargs kill -9 2>/dev/null
  ok "Port $METRO_PORT cleared"
else
  ok "Port $METRO_PORT already free"
fi
rm -f "$READY_SENTINEL"
sleep 1

# ── 2. Start emulator if not running ─────────────────────────────────────────
step "Android emulator"
RUNNING_EMU=$(adb devices 2>/dev/null | grep "emulator" | awk '{print $1}' || true)
if [ -z "$RUNNING_EMU" ]; then
  warn "No emulator running — starting $AVD_NAME"
  nohup "$ANDROID_HOME/emulator/emulator" \
    -avd "$AVD_NAME" \
    -no-snapshot-save \
    -no-audio \
    > /tmp/emulator_mushroom.log 2>&1 &
  ok "Emulator starting (PID $!)"
  echo -n "   Waiting for boot"
  for i in $(seq 1 60); do
    sleep 3
    BOOT=$(adb shell getprop sys.boot_completed 2>/dev/null | tr -d '\r' || true)
    if [ "$BOOT" = "1" ]; then
      echo ""; ok "Emulator fully booted"
      break
    fi
    echo -n "."
    if [ "$i" -eq 60 ]; then
      echo ""; err "Emulator did not boot within 180s"; exit 1
    fi
  done
else
  ok "Already running: $RUNNING_EMU"
fi

# ── 3. Install APK if not present ────────────────────────────────────────────
step "App installation"
INSTALLED=$(adb shell pm list packages 2>/dev/null | grep "$APP_PACKAGE" || true)
if [ -z "$INSTALLED" ]; then
  if [ -f "$APK_PATH" ]; then
    warn "Not installed — installing debug APK"
    adb install -r "$APK_PATH"
    ok "APK installed"
  else
    err "APK not found at $APK_PATH"
    err "Build first:  cd android && ./gradlew assembleDebug"
    exit 1
  fi
else
  ok "Already installed"
fi

# ── 4. adb reverse ───────────────────────────────────────────────────────────
step "adb reverse tcp:$METRO_PORT → tcp:$METRO_PORT"
adb reverse tcp:$METRO_PORT tcp:$METRO_PORT
ok "Done"

# ── 5. Background watcher ─────────────────────────────────────────────────────
#
#  Polls the Metro log for "Metro waiting on" then:
#    - re-runs adb reverse (Metro can reset it)
#    - force-stops the app and relaunches it so it connects to the new session
# ─────────────────────────────────────────────────────────────────────────────
> "$METRO_LOG"   # clear old log

(
  # Wait until Metro writes to the log
  for i in $(seq 1 120); do
    sleep 2
    if grep -q "Metro waiting on\|Waiting on http" "$METRO_LOG" 2>/dev/null; then
      # Touch sentinel so we know it fired
      touch "$READY_SENTINEL"
      echo ""
      echo -e "   ${BLUE}[auto] Metro ready — launching app on emulator${NC}"
      adb reverse tcp:$METRO_PORT tcp:$METRO_PORT 2>/dev/null || true
      adb shell am force-stop "$APP_PACKAGE" 2>/dev/null || true
      sleep 1
      adb shell am start \
        -n "$APP_PACKAGE/$APP_PACKAGE.MainActivity" \
        2>/dev/null || true
      echo -e "   ${GREEN}[auto] App launched — emulator connecting to Metro${NC}"
      echo -e "   ${YELLOW}[auto] Real phone: scan the QR code above with Expo Go${NC}"
      exit 0
    fi
  done
  echo -e "   ${YELLOW}[auto] Metro ready signal not seen — launch the app manually${NC}"
) &
WATCHER_PID=$!

cleanup() {
  kill "$WATCHER_PID" 2>/dev/null || true
  rm -f "$READY_SENTINEL"
}
trap cleanup EXIT INT TERM

# ── 6. Metro in the FOREGROUND ───────────────────────────────────────────────
#
#  We use a co-process trick: Metro writes to METRO_LOG via 'tee' while still
#  running with a real TTY (via 'script -q') so Expo renders the QR code and
#  interactive menu properly.
#
#  macOS 'script' syntax: script -q /dev/null <cmd>
#  This gives Metro a pseudo-TTY → QR code + colours + key bindings all work.
# ─────────────────────────────────────────────────────────────────────────────
step "Starting Metro  (QR code + interactive menu below)"
echo -e "   ${YELLOW}Expo Go on real phone → scan QR code (same WiFi as this Mac)${NC}"
echo -e "   ${YELLOW}Emulator           → app launches automatically${NC}"
echo -e "   ${YELLOW}Ctrl+C             → stop Metro and exit${NC}"
echo ""

# script -q gives Metro a real PTY so the QR code, colours and key-bindings
# all render correctly; we separately tee the raw output to METRO_LOG so the
# background watcher can grep it.
script -q /dev/null \
  npx expo start \
    --port "$METRO_PORT" \
    --clear \
  2>&1 | tee "$METRO_LOG"
