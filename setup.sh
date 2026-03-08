#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  Mushroom Farm Mobile — New Machine Setup Script
#  macOS / Linux / Windows WSL
#
#  Usage:
#    macOS / Linux / WSL:   bash setup.sh
#    Windows (native):      Use setup.ps1 in PowerShell instead
#
#  What this does (fully automated):
#    1.  Detects OS (macOS / Linux / Windows WSL)
#    2.  Installs Homebrew (macOS) / apt packages (Linux/WSL)
#    3.  Installs Node.js 20 LTS (via nvm or brew)
#    4.  Installs Java 17 (required for Android Gradle)
#    5.  Detects Android SDK + sets ANDROID_HOME / PATH in shell profile
#    6.  Creates Android AVD  Medium_Phone_API_36.0  (if SDK tools present)
#    7.  npm install — all JS/TS dependencies
#    8.  Expo CLI check
#    9.  Watchman (macOS — speeds up Metro)
#   10.  npx tsc --noEmit — verifies TypeScript compiles cleanly
#   11.  Prints final checklist + quick-start guide
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ── Colours ───────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

step()  { echo -e "\n${CYAN}${BOLD}━━  $1  ━━${NC}"; }
ok()    { echo -e "  ${GREEN}✔  $1${NC}"; }
warn()  { echo -e "  ${YELLOW}⚠  $1${NC}"; }
err()   { echo -e "  ${RED}✖  $1${NC}"; }
info()  { echo -e "  ${BLUE}ℹ  $1${NC}"; }

# ── Detect OS ─────────────────────────────────────────────────────────────────
OS="unknown"
if [[ "$OSTYPE" == "darwin"* ]]; then
  OS="macos"
elif [[ "$OSTYPE" == "linux-gnu"* || "$OSTYPE" == "linux"* ]]; then
  if grep -qi microsoft /proc/version 2>/dev/null; then
    OS="wsl"
  else
    OS="linux"
  fi
fi

echo -e "\n${BOLD}${CYAN}╔══════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${CYAN}║     Mushroom Farm Mobile — New Machine Setup         ║${NC}"
echo -e "${BOLD}${CYAN}║     OS: ${OS}$(printf '%*s' $((44 - ${#OS})) '')║${NC}"
echo -e "${BOLD}${CYAN}╚══════════════════════════════════════════════════════╝${NC}"

if [[ "$OS" == "unknown" ]]; then
  warn "Unknown OS. If you are on Windows, run setup.ps1 in PowerShell instead."
  warn "Continuing anyway — some steps may fail."
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Choose shell profile file
PROFILE_FILE="$HOME/.zshrc"
[[ -f "$HOME/.bashrc" && ! -f "$HOME/.zshrc" ]] && PROFILE_FILE="$HOME/.bashrc"
[[ "$OS" == "wsl" ]] && PROFILE_FILE="$HOME/.bashrc"

add_to_profile() {
  local line="$1"
  local comment="$2"
  if ! grep -qF "$line" "$PROFILE_FILE" 2>/dev/null; then
    { echo ""; echo "# $comment"; echo "$line"; } >> "$PROFILE_FILE"
    ok "Added to $PROFILE_FILE: $comment"
  else
    ok "Already in profile: $comment"
  fi
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1 — Package manager
# ═══════════════════════════════════════════════════════════════════════════════
step "1 / 10  — Package Manager"

if [[ "$OS" == "macos" ]]; then
  if ! command -v brew &>/dev/null; then
    warn "Homebrew not found — installing"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # Apple Silicon path
    [[ -f /opt/homebrew/bin/brew ]] && eval "$(/opt/homebrew/bin/brew shellenv)"
    add_to_profile 'eval "$(/opt/homebrew/bin/brew shellenv)"' "Homebrew (Apple Silicon)"
    ok "Homebrew installed"
  else
    ok "Homebrew $(brew --version | head -1)"
    brew update --quiet || true
  fi
elif [[ "$OS" == "linux" || "$OS" == "wsl" ]]; then
  if command -v apt-get &>/dev/null; then
    ok "apt-get available"
    sudo apt-get update -qq
    sudo apt-get install -y -qq curl git unzip wget zip build-essential libssl-dev
    ok "Core apt packages installed"
  elif command -v dnf &>/dev/null; then
    ok "dnf available"
    sudo dnf install -y curl git unzip wget zip gcc gcc-c++ make openssl-devel
    ok "Core dnf packages installed"
  else
    warn "No supported package manager found — install curl, git, unzip manually"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2 — Node.js 20 LTS
# ═══════════════════════════════════════════════════════════════════════════════
step "2 / 10  — Node.js 20 LTS"

NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

install_node_via_nvm() {
  if [[ ! -d "$NVM_DIR" ]]; then
    warn "nvm not found — installing"
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
    ok "nvm installed"
  fi
  # shellcheck disable=SC1090
  [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
  nvm install 20
  nvm use 20
  nvm alias default 20
  ok "Node $(node -v) set as default via nvm"
  add_to_profile "export NVM_DIR=\"\$HOME/.nvm\"" "nvm"
  add_to_profile '[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"' "nvm loader"
}

if command -v node &>/dev/null; then
  NODE_MAJOR=$(node -e "process.stdout.write(process.versions.node.split('.')[0])")
  if [[ "$NODE_MAJOR" -ge 18 ]]; then
    ok "Node $(node -v) — compatible (need 18+)"
  else
    warn "Node $(node -v) is too old. Upgrading via nvm..."
    install_node_via_nvm
  fi
else
  if [[ "$OS" == "macos" ]]; then
    warn "Node.js not found — installing via nvm (recommended over brew for version management)"
    install_node_via_nvm
  else
    install_node_via_nvm
  fi
fi

ok "npm $(npm -v)"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3 — Java 17
# ═══════════════════════════════════════════════════════════════════════════════
step "3 / 10  — Java 17 (required for Android Gradle)"

JAVA_OK=false
if command -v java &>/dev/null; then
  JAVA_VERSION=$(java -version 2>&1 | head -1 | sed 's/.*version "\([0-9]*\).*/\1/')
  if [[ "$JAVA_VERSION" -ge 17 ]] 2>/dev/null; then
    ok "Java $JAVA_VERSION — compatible"
    JAVA_OK=true
  else
    warn "Java $JAVA_VERSION found — need 17+, will upgrade"
  fi
fi

if [[ "$JAVA_OK" == "false" ]]; then
  if [[ "$OS" == "macos" ]]; then
    brew install --cask temurin@17 2>/dev/null || brew install openjdk@17
    JAVA_HOME_PATH=$(/usr/libexec/java_home -v 17 2>/dev/null \
      || echo "/opt/homebrew/opt/openjdk@17" \
      || echo "/usr/local/opt/openjdk@17")
    add_to_profile "export JAVA_HOME=\"$JAVA_HOME_PATH\"" "Java 17 home"
    add_to_profile "export PATH=\"\$JAVA_HOME/bin:\$PATH\"" "Java 17 on PATH"
    export JAVA_HOME="$JAVA_HOME_PATH"
    export PATH="$JAVA_HOME/bin:$PATH"
    ok "Java 17 installed via Homebrew Temurin"
  elif [[ "$OS" == "linux" || "$OS" == "wsl" ]]; then
    sudo apt-get install -y -qq openjdk-17-jdk 2>/dev/null || \
      sudo dnf install -y java-17-openjdk-devel 2>/dev/null || \
      warn "Could not auto-install Java 17 — download from https://adoptium.net/"
    if command -v java &>/dev/null; then
      JAVA_HOME_PATH=$(dirname "$(dirname "$(readlink -f "$(which java)")")")
      add_to_profile "export JAVA_HOME=\"$JAVA_HOME_PATH\"" "Java 17 home"
      add_to_profile "export PATH=\"\$JAVA_HOME/bin:\$PATH\"" "Java 17 on PATH"
      export JAVA_HOME="$JAVA_HOME_PATH"
      ok "Java 17 installed"
    fi
  else
    warn "Please install Java 17 manually from https://adoptium.net/"
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4 — Android SDK
# ═══════════════════════════════════════════════════════════════════════════════
step "4 / 10  — Android SDK"

ANDROID_SDK_OK=false
if [[ -n "${ANDROID_HOME:-}" && -d "$ANDROID_HOME" ]]; then
  ok "ANDROID_HOME=$ANDROID_HOME"
  ANDROID_SDK_OK=true
else
  for candidate in \
    "$HOME/Library/Android/sdk" \
    "$HOME/Android/Sdk" \
    "$HOME/android-sdk" \
    "/opt/android-sdk" \
    "$HOME/.android/sdk" \
    "/usr/local/lib/android/sdk"
  do
    if [[ -d "$candidate" ]]; then
      export ANDROID_HOME="$candidate"
      ANDROID_SDK_OK=true
      ok "Found Android SDK at $ANDROID_HOME"
      break
    fi
  done
fi

if [[ "$ANDROID_SDK_OK" == "false" ]]; then
  warn "Android SDK not found."
  echo ""
  echo -e "  ${YELLOW}Manual steps required — install Android Studio:${NC}"
  echo "  • macOS/Windows: https://developer.android.com/studio"
  echo "  • Linux/WSL: https://developer.android.com/studio  (or use command-line tools)"
  echo ""
  echo "  After install, open Android Studio once and in SDK Manager install:"
  echo "    ✦ Android API 36 (Android 15)"
  echo "    ✦ Android Emulator"
  echo "    ✦ Android SDK Platform-Tools"
  echo "    ✦ NDK version 27.1.12297006 (SDK Tools → NDK Side by side)"
  echo ""
  echo "  Then re-run this script, or set ANDROID_HOME manually:"
  echo "    export ANDROID_HOME=\$HOME/Android/Sdk   (Linux/WSL)"
  echo "    export ANDROID_HOME=\$HOME/Library/Android/sdk   (macOS)"
  echo ""
else
  add_to_profile "export ANDROID_HOME=\"$ANDROID_HOME\"" "Android SDK"
  add_to_profile "export PATH=\"\$ANDROID_HOME/emulator:\$ANDROID_HOME/platform-tools:\$ANDROID_HOME/tools:\$ANDROID_HOME/cmdline-tools/latest/bin:\$PATH\"" "Android tools on PATH"
  export PATH="$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$ANDROID_HOME/tools:${ANDROID_HOME}/cmdline-tools/latest/bin:$PATH"

  # NDK check
  NDK_TARGET="27.1.12297006"
  if [[ -d "$ANDROID_HOME/ndk/$NDK_TARGET" ]]; then
    ok "NDK $NDK_TARGET installed"
  else
    warn "NDK $NDK_TARGET not found"
    info "Install: Android Studio → SDK Manager → SDK Tools → NDK (Side by side) → $NDK_TARGET"
    # Try command line
    SDKMGR=$(find "$ANDROID_HOME" -name "sdkmanager" 2>/dev/null | head -1 || true)
    if [[ -n "$SDKMGR" ]]; then
      info "Attempting SDK manager install..."
      yes | "$SDKMGR" --licenses >/dev/null 2>&1 || true
      "$SDKMGR" "ndk;$NDK_TARGET" 2>/dev/null && ok "NDK installed via sdkmanager" || \
        warn "Automatic NDK install failed — install manually in Android Studio"
    fi
  fi
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5 — Android AVD
# ═══════════════════════════════════════════════════════════════════════════════
step "5 / 10  — Android AVD (Medium_Phone_API_36.0)"

AVD_NAME="Medium_Phone_API_36.0"

if [[ "$ANDROID_SDK_OK" == "true" ]]; then
  AVDMANAGER=$(find "$ANDROID_HOME" -name "avdmanager" 2>/dev/null | head -1 || true)
  SDKMANAGER=$(find "$ANDROID_HOME" -name "sdkmanager" 2>/dev/null | head -1 || true)

  if [[ -z "$AVDMANAGER" || -z "$SDKMANAGER" ]]; then
    warn "avdmanager/sdkmanager not found — skipping AVD creation"
    info "Install: Android Studio → SDK Manager → SDK Tools → Android SDK Command-line Tools"
  else
    if "$AVDMANAGER" list avd 2>/dev/null | grep -q "$AVD_NAME"; then
      ok "AVD '$AVD_NAME' already exists"
    else
      info "Creating AVD '$AVD_NAME'..."
      yes | "$SDKMANAGER" --licenses >/dev/null 2>&1 || true
      "$SDKMANAGER" "system-images;android-36;google_apis_playstore;x86_64" 2>/dev/null || \
        warn "System image install failed — try in Android Studio AVD Manager"
      echo "no" | "$AVDMANAGER" create avd \
        --name "$AVD_NAME" \
        --package "system-images;android-36;google_apis_playstore;x86_64" \
        --device "medium_phone" \
        --force 2>/dev/null && ok "AVD '$AVD_NAME' created" || \
        warn "AVD creation failed — create manually in Android Studio → AVD Manager"
    fi
  fi
else
  warn "Skipping AVD (Android SDK not found)"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6 — npm install
# ═══════════════════════════════════════════════════════════════════════════════
step "6 / 10  — npm install"

cd "$SCRIPT_DIR"
npm install
ok "Dependencies installed"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 7 — Expo CLI
# ═══════════════════════════════════════════════════════════════════════════════
step "7 / 10  — Expo CLI"

if ! command -v expo &>/dev/null; then
  info "Expo CLI not found globally — npx expo will be used (no install needed)"
  info "Optional global install: npm install -g expo-cli"
else
  ok "Expo CLI $(expo --version 2>/dev/null || echo 'installed')"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 8 — Watchman (macOS / Linux — speeds up Metro file watching)
# ═══════════════════════════════════════════════════════════════════════════════
step "8 / 10  — Watchman"

if [[ "$OS" == "macos" ]]; then
  if ! command -v watchman &>/dev/null; then
    warn "Watchman not found — installing (recommended for faster Metro)"
    brew install watchman
    ok "Watchman installed"
  else
    ok "Watchman $(watchman --version)"
  fi
elif [[ "$OS" == "linux" ]]; then
  if ! command -v watchman &>/dev/null; then
    info "Watchman not found on Linux — optional but recommended"
    info "Build from source: https://facebook.github.io/watchman/docs/install"
  else
    ok "Watchman $(watchman --version)"
  fi
else
  info "Watchman skipped (WSL/unknown OS)"
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 9 — Build APK check
# ═══════════════════════════════════════════════════════════════════════════════
step "9 / 10  — Debug APK"

APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"
if [[ -f "$SCRIPT_DIR/$APK_PATH" ]]; then
  ok "Debug APK exists at $APK_PATH"
else
  warn "Debug APK not found — build it once before running dev.sh:"
  echo ""
  echo -e "  ${BOLD}./build-apk.sh${NC}    (first build ~5 min, subsequent builds faster)"
  echo ""
fi

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 10 — TypeScript check
# ═══════════════════════════════════════════════════════════════════════════════
step "10 / 10  — TypeScript check"

if npx tsc --noEmit 2>&1; then
  ok "0 TypeScript errors — project compiles cleanly"
else
  warn "TypeScript errors detected. Run 'npx tsc --noEmit' to see details."
fi

# ═══════════════════════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${BOLD}${GREEN}  Setup complete!  Mushroom Farm Mobile is ready.      ${NC}"
echo -e "${BOLD}${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Quick-start guide:${NC}"
echo ""
echo -e "  ${CYAN}Start dev server (canonical):${NC}"
echo -e "    ${BOLD}./dev.sh${NC}"
echo ""
echo -e "  ${CYAN}What dev.sh does automatically:${NC}"
echo "    1. TypeScript check (aborts on errors)"
echo "    2. Clears port 8081"
echo "    3. Starts Android emulator (Medium_Phone_API_36.0)"
echo "    4. Installs debug APK if not already installed"
echo "    5. Sets up adb reverse"
echo "    6. Starts Metro with QR code + interactive menu"
echo "    7. Auto-launches app on emulator when Metro is ready"
echo ""
echo -e "  ${CYAN}Real phone (Expo Go):${NC}"
echo "    • Install 'Expo Go' from Play Store / App Store"
echo "    • Connect phone to same WiFi as this computer"
echo "    • Run ./dev.sh and scan the QR code"
echo ""
echo -e "  ${CYAN}Build debug APK:${NC}"
echo -e "    ${BOLD}./build-apk.sh${NC}"
echo "    Output: android/app/build/outputs/apk/debug/app-debug.apk"
echo ""
echo -e "  ${CYAN}TypeScript check only:${NC}  npx tsc --noEmit"
echo -e "  ${CYAN}Stop Metro:${NC}             pkill -f 'expo start'"
echo -e "  ${CYAN}Live Metro log:${NC}         tail -f /tmp/metro_mushroom.log"
echo ""
echo -e "  ${CYAN}Firebase project:${NC}  project-mushroom-2f8a9"
echo -e "  ${CYAN}App package:${NC}       com.anonymous.mushroomfarmmobile"
echo -e "  ${CYAN}NDK required:${NC}      27.1.12297006"
echo -e "  ${CYAN}AVD name:${NC}          Medium_Phone_API_36.0"
echo ""
echo -e "  ${YELLOW}Current status checklist:${NC}"
printf "    [%s] Node.js  %s\n" "$(command -v node &>/dev/null && echo '✔' || echo ' ')" "$(node -v 2>/dev/null || echo 'NOT FOUND')"
printf "    [%s] npm     %s\n"  "$(command -v npm  &>/dev/null && echo '✔' || echo ' ')" "$(npm -v  2>/dev/null || echo 'NOT FOUND')"
printf "    [%s] Java    %s\n"  "$(command -v java &>/dev/null && echo '✔' || echo ' ')" "$(java -version 2>&1 | head -1 | awk -F'"' '{print $2}' || echo 'NOT FOUND')"
printf "    [%s] ANDROID_HOME  %s\n" "$([ -n "${ANDROID_HOME:-}" ] && echo '✔' || echo ' ')" "${ANDROID_HOME:-NOT SET}"
printf "    [%s] node_modules installed\n" "$([ -d node_modules ] && echo '✔' || echo ' ')"
printf "    [%s] Debug APK built\n"        "$([ -f "$APK_PATH" ]   && echo '✔' || echo ' ')"
echo ""
echo -e "  ${BOLD}Reload your shell to apply PATH changes:${NC}"
echo -e "    ${BOLD}source $PROFILE_FILE${NC}"
echo ""
echo -e "  ${YELLOW}Windows users:${NC} Run ${BOLD}setup.ps1${NC} in PowerShell (Administrator) instead of this script."
echo ""
