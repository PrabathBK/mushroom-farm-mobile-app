# ═══════════════════════════════════════════════════════════════════════════════
#  Mushroom Farm Mobile — Windows Setup Script (PowerShell)
#  Run in PowerShell as Administrator:
#    Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
#    .\setup.ps1
#
#  What this does:
#    1.  Checks PowerShell version and execution policy
#    2.  Installs Chocolatey (Windows package manager)
#    3.  Installs Node.js 20 LTS
#    4.  Installs Java 17 (Temurin / OpenJDK)
#    5.  Installs Git
#    6.  Detects Android SDK + guides setup if missing
#    7.  npm install
#    8.  TypeScript check
#    9.  Prints quick-start guide
# ═══════════════════════════════════════════════════════════════════════════════

param(
    [switch]$SkipChoco,    # skip Chocolatey install (if you already have it)
    [switch]$SkipAndroid   # skip Android SDK checks
)

$ErrorActionPreference = "Stop"

# ── Colours ───────────────────────────────────────────────────────────────────
function Write-Step  { param($msg) Write-Host "`n━━  $msg  ━━" -ForegroundColor Cyan }
function Write-Ok    { param($msg) Write-Host "  ✔  $msg"      -ForegroundColor Green }
function Write-Warn  { param($msg) Write-Host "  ⚠  $msg"      -ForegroundColor Yellow }
function Write-Err   { param($msg) Write-Host "  ✖  $msg"      -ForegroundColor Red }
function Write-Info  { param($msg) Write-Host "  ℹ  $msg"      -ForegroundColor Blue }

# ── Banner ────────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "╔══════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     Mushroom Farm Mobile — Windows Setup             ║" -ForegroundColor Cyan
Write-Host "║     PowerShell $($PSVersionTable.PSVersion)                         " -ForegroundColor Cyan
Write-Host "╚══════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1 — Check PowerShell version & execution policy
# ═══════════════════════════════════════════════════════════════════════════════
Write-Step "1 / 9  — PowerShell Environment"

if ($PSVersionTable.PSVersion.Major -lt 5) {
    Write-Err "PowerShell 5+ required. Update Windows PowerShell or install PowerShell 7."
    Write-Info "Download: https://github.com/PowerShell/PowerShell/releases"
    exit 1
}
Write-Ok "PowerShell $($PSVersionTable.PSVersion)"

$policy = Get-ExecutionPolicy -Scope CurrentUser
if ($policy -eq "Restricted") {
    Write-Warn "Execution policy is Restricted. Setting to RemoteSigned..."
    Set-ExecutionPolicy RemoteSigned -Scope CurrentUser -Force
    Write-Ok "Execution policy set to RemoteSigned"
} else {
    Write-Ok "Execution policy: $policy"
}

# Check admin rights (recommended)
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Warn "Not running as Administrator. Some installs may require elevation."
    Write-Info "For best results, run PowerShell as Administrator."
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2 — Chocolatey
# ═══════════════════════════════════════════════════════════════════════════════
Write-Step "2 / 9  — Chocolatey (Windows package manager)"

if ($SkipChoco) {
    Write-Info "Skipping Chocolatey install (-SkipChoco flag set)"
} elseif (Get-Command choco -ErrorAction SilentlyContinue) {
    Write-Ok "Chocolatey $(choco --version) already installed"
} else {
    Write-Warn "Chocolatey not found — installing"
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
    # Reload PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Ok "Chocolatey installed"
}

# Helper: install via choco if not present
function Install-ChocoPackage {
    param($name, $packageId = $name, $version = $null)
    if ($version) {
        choco install $packageId --version $version -y --no-progress 2>&1 | Out-Null
    } else {
        choco install $packageId -y --no-progress 2>&1 | Out-Null
    }
    # Reload PATH after install
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    Write-Ok "$name installed"
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3 — Node.js 20 LTS
# ═══════════════════════════════════════════════════════════════════════════════
Write-Step "3 / 9  — Node.js 20 LTS"

$nodeOk = $false
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeVersion = node -e "process.stdout.write(process.versions.node)"
    $nodeMajor   = [int]($nodeVersion -split '\.')[0]
    if ($nodeMajor -ge 18) {
        Write-Ok "Node.js v$nodeVersion (need 18+)"
        $nodeOk = $true
    } else {
        Write-Warn "Node.js v$nodeVersion too old — upgrading to v20"
    }
}

if (-not $nodeOk) {
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Install-ChocoPackage "Node.js 20 LTS" "nodejs-lts"
    } else {
        Write-Warn "Chocolatey not available."
        Write-Info "Download Node.js 20 LTS from: https://nodejs.org/en/download"
        Write-Info "Install it, then re-run this script."
        Read-Host "Press Enter once Node.js is installed to continue..."
    }
}

if (Get-Command node -ErrorAction SilentlyContinue) {
    Write-Ok "Node.js $(node -v)"
    Write-Ok "npm $(npm -v)"
} else {
    Write-Err "Node.js still not found. Install it and re-run."
    exit 1
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4 — Git
# ═══════════════════════════════════════════════════════════════════════════════
Write-Step "4 / 9  — Git"

if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Ok "git $(git --version)"
} else {
    Write-Warn "Git not found — installing"
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Install-ChocoPackage "Git" "git"
    } else {
        Write-Info "Download Git from: https://git-scm.com/download/win"
        Read-Host "Press Enter once Git is installed to continue..."
    }
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5 — Java 17
# ═══════════════════════════════════════════════════════════════════════════════
Write-Step "5 / 9  — Java 17 (required for Android Gradle)"

$javaOk = $false
if (Get-Command java -ErrorAction SilentlyContinue) {
    $javaVer = java -version 2>&1 | Select-String 'version "(\d+)' | ForEach-Object { $_.Matches[0].Groups[1].Value }
    if ([int]$javaVer -ge 17) {
        Write-Ok "Java $javaVer — compatible"
        $javaOk = $true
    } else {
        Write-Warn "Java $javaVer too old — need 17+"
    }
}

if (-not $javaOk) {
    if (Get-Command choco -ErrorAction SilentlyContinue) {
        Write-Info "Installing Eclipse Temurin 17 (OpenJDK)..."
        Install-ChocoPackage "Java 17 (Temurin)" "temurin17"
    } else {
        Write-Info "Download Java 17 (Temurin) from: https://adoptium.net/temurin/releases/?version=17"
        Read-Host "Press Enter once Java 17 is installed to continue..."
    }

    # Reload PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    if (Get-Command java -ErrorAction SilentlyContinue) {
        Write-Ok "Java $(java -version 2>&1 | Select-String 'version' | Select-Object -First 1)"
    } else {
        Write-Warn "Java not on PATH yet — may need to restart terminal"
    }
}

# Set JAVA_HOME if not set
if (-not $env:JAVA_HOME) {
    # Try to find Java installation
    $javaExe = (Get-Command java -ErrorAction SilentlyContinue)?.Source
    if ($javaExe) {
        $javaHome = Split-Path -Parent (Split-Path -Parent $javaExe)
        [System.Environment]::SetEnvironmentVariable("JAVA_HOME", $javaHome, "User")
        $env:JAVA_HOME = $javaHome
        Write-Ok "JAVA_HOME set to $javaHome"
    }
} else {
    Write-Ok "JAVA_HOME=$env:JAVA_HOME"
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6 — Android SDK
# ═══════════════════════════════════════════════════════════════════════════════
Write-Step "6 / 9  — Android SDK"

if (-not $SkipAndroid) {
    $androidHome = $env:ANDROID_HOME
    if (-not $androidHome) {
        # Common Windows locations
        $candidates = @(
            "$env:LOCALAPPDATA\Android\Sdk",
            "$env:USERPROFILE\AppData\Local\Android\Sdk",
            "C:\Android\sdk",
            "C:\Users\$env:USERNAME\AppData\Local\Android\Sdk"
        )
        foreach ($c in $candidates) {
            if (Test-Path $c) {
                $androidHome = $c
                break
            }
        }
    }

    if ($androidHome -and (Test-Path $androidHome)) {
        [System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $androidHome, "User")
        $env:ANDROID_HOME = $androidHome
        $env:Path += ";$androidHome\emulator;$androidHome\platform-tools;$androidHome\tools"
        [System.Environment]::SetEnvironmentVariable("Path",
            [System.Environment]::GetEnvironmentVariable("Path","User") + ";$androidHome\emulator;$androidHome\platform-tools;$androidHome\tools",
            "User")
        Write-Ok "ANDROID_HOME=$androidHome"

        # NDK check
        $ndkTarget = "27.1.12297006"
        if (Test-Path "$androidHome\ndk\$ndkTarget") {
            Write-Ok "NDK $ndkTarget installed"
        } else {
            Write-Warn "NDK $ndkTarget not found"
            Write-Info "Install: Android Studio → SDK Manager → SDK Tools → NDK (Side by side) → $ndkTarget"
        }
    } else {
        Write-Warn "Android SDK not found."
        Write-Host ""
        Write-Host "  Manual steps required:" -ForegroundColor Yellow
        Write-Host "  1. Download Android Studio: https://developer.android.com/studio"
        Write-Host "  2. Install and open it once to complete SDK setup"
        Write-Host "  3. In SDK Manager, install:"
        Write-Host "     - Android API 36"
        Write-Host "     - Android Emulator"
        Write-Host "     - Android SDK Platform-Tools"
        Write-Host "     - NDK version 27.1.12297006"
        Write-Host "  4. Create AVD named:  Medium_Phone_API_36.0"
        Write-Host "     (AVD Manager → Create Virtual Device → Medium Phone → API 36)"
        Write-Host ""
        Write-Info "After Android Studio setup, re-run this script."
    }
} else {
    Write-Info "Skipping Android SDK checks (-SkipAndroid flag)"
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 7 — npm install
# ═══════════════════════════════════════════════════════════════════════════════
Write-Step "7 / 9  — npm install"

Set-Location $ScriptDir
npm install
Write-Ok "Dependencies installed"

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 8 — TypeScript check
# ═══════════════════════════════════════════════════════════════════════════════
Write-Step "8 / 9  — TypeScript check"

$tscResult = npx tsc --noEmit 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Ok "0 TypeScript errors"
} else {
    Write-Warn "TypeScript errors found:"
    $tscResult | ForEach-Object { Write-Host "    $_" -ForegroundColor Yellow }
}

# ═══════════════════════════════════════════════════════════════════════════════
# STEP 9 — APK check
# ═══════════════════════════════════════════════════════════════════════════════
Write-Step "9 / 9  — Debug APK"

$apkPath = Join-Path $ScriptDir "android\app\build\outputs\apk\debug\app-debug.apk"
if (Test-Path $apkPath) {
    Write-Ok "Debug APK found at $apkPath"
} else {
    Write-Warn "Debug APK not built yet."
    Write-Info "Build with: .\build-apk.sh  (in WSL/Git Bash)  OR  cd android && gradlew assembleDebug"
}

# ═══════════════════════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════════════════════════
Write-Host ""
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  Setup complete!  Mushroom Farm Mobile is ready.      " -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Quick-start guide (Windows):" -ForegroundColor White
Write-Host ""
Write-Host "  Option A — WSL (recommended for full dev.sh support):" -ForegroundColor Cyan
Write-Host "    1. Enable WSL2:  wsl --install"
Write-Host "    2. Open Ubuntu terminal"
Write-Host "    3. Navigate to this folder inside WSL"
Write-Host "    4. Run:  bash setup.sh"
Write-Host "    5. Run:  ./dev.sh"
Write-Host ""
Write-Host "  Option B — Native Windows (Expo Go only, no emulator):" -ForegroundColor Cyan
Write-Host "    1. Open terminal in this folder"
Write-Host "    2. Run:  npx expo start --port 8081 --clear"
Write-Host "    3. Install Expo Go on your phone (Play Store)"
Write-Host "    4. Scan the QR code (phone must be on same WiFi)"
Write-Host ""
Write-Host "  Option C — Android emulator on Windows:" -ForegroundColor Cyan
Write-Host "    1. Install Android Studio + create AVD 'Medium_Phone_API_36.0'"
Write-Host "    2. Launch emulator from AVD Manager"
Write-Host "    3. In terminal: adb reverse tcp:8081 tcp:8081"
Write-Host "    4. Run: npx expo start --port 8081 --clear"
Write-Host "    5. Press 'a' in Metro to launch on emulator"
Write-Host ""
Write-Host "  Firebase project:  project-mushroom-2f8a9" -ForegroundColor Blue
Write-Host "  App package:       com.anonymous.mushroomfarmmobile" -ForegroundColor Blue
Write-Host "  NDK required:      27.1.12297006" -ForegroundColor Blue
Write-Host "  AVD name:          Medium_Phone_API_36.0" -ForegroundColor Blue
Write-Host ""

# Status checklist
Write-Host "  Checklist:" -ForegroundColor Yellow
$nodeCheck  = if (Get-Command node -ErrorAction SilentlyContinue) { "✔" } else { " " }
$npmCheck   = if (Get-Command npm  -ErrorAction SilentlyContinue) { "✔" } else { " " }
$javaCheck  = if (Get-Command java -ErrorAction SilentlyContinue) { "✔" } else { " " }
$androidCheck = if ($env:ANDROID_HOME -and (Test-Path $env:ANDROID_HOME)) { "✔" } else { " " }
$nmCheck    = if (Test-Path (Join-Path $ScriptDir "node_modules")) { "✔" } else { " " }
$apkCheck   = if (Test-Path $apkPath) { "✔" } else { " " }

Write-Host "    [$nodeCheck] Node.js  $(node -v 2>$null)"
Write-Host "    [$npmCheck] npm      $(npm -v 2>$null)"
Write-Host "    [$javaCheck] Java     $(java -version 2>&1 | Select-String 'version' | Select-Object -First 1)"
Write-Host "    [$androidCheck] ANDROID_HOME  $($env:ANDROID_HOME ?? 'NOT SET')"
Write-Host "    [$nmCheck] node_modules installed"
Write-Host "    [$apkCheck] Debug APK built"
Write-Host ""
Write-Host "  Restart your terminal/PowerShell to pick up PATH changes." -ForegroundColor Yellow
Write-Host ""
