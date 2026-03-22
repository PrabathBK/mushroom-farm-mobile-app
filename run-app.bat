@echo off
setlocal EnableDelayedExpansion

title Mushroom Farm App Launcher

set "ADB=C:\Users\irang\AppData\Local\Android\Sdk\platform-tools\adb.exe"
set "EMULATOR=C:\Users\irang\AppData\Local\Android\Sdk\emulator\emulator.exe"
set "AVD=Medium_Phone_API_36.0"
set "PROJECT=D:\mushroom\mushroom-farm-mobile-app"
set "EXPO_GO_APK=C:\Users\irang\Downloads\Expo-Go-2.32.20.apk"
set "NODE=C:\Program Files\nodejs\node.exe"
set "NPX=C:\Program Files\nodejs\npx.cmd"
set "METRO_LOG=C:\Users\irang\metro.log"

echo ============================================================
echo   Mushroom Farm Mobile App Launcher
echo ============================================================
echo.

:: ── Step 1: Get Windows LAN IP ──────────────────────────────────────────────
echo [1/6] Detecting LAN IP address...
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1" ^| findstr /v "169.254"') do (
    set "LAN_IP=%%A"
    goto :got_ip
)
:got_ip
set "LAN_IP=%LAN_IP: =%"
if "%LAN_IP%"=="" set "LAN_IP=YOUR_PC_IP"
echo     LAN IP: %LAN_IP%
echo.

:: ── Step 2: Start emulator (if not already running) ─────────────────────────
echo [2/6] Checking emulator status...
"%ADB%" devices | findstr "emulator" | findstr "device" >nul 2>&1
if %errorlevel%==0 (
    echo     Emulator already running. Skipping launch.
) else (
    echo     Starting AVD: %AVD% ...
    start /b "" "%EMULATOR%" -avd "%AVD%" -no-snapshot-save -no-audio -no-boot-anim
    echo     Waiting for emulator to boot (this may take 1-3 minutes)...
    :wait_boot
    timeout /t 5 /nobreak >nul
    "%ADB%" shell getprop sys.boot_completed 2>nul | findstr "1" >nul
    if %errorlevel% neq 0 goto :wait_boot
    echo     Emulator booted successfully.
)
echo.

:: ── Step 3: Install Expo Go if not present ──────────────────────────────────
echo [3/6] Checking Expo Go installation...
"%ADB%" shell pm list packages 2>nul | findstr "host.exp.exponent" >nul 2>&1
if %errorlevel%==0 (
    echo     Expo Go already installed.
) else (
    echo     Installing Expo Go from %EXPO_GO_APK% ...
    "%ADB%" install -r "%EXPO_GO_APK%"
    if %errorlevel%==0 (
        echo     Expo Go installed successfully.
    ) else (
        echo     WARNING: Expo Go install failed. Please install manually.
    )
)
echo.

:: ── Step 4: ADB reverse (emulator -> host Metro) ────────────────────────────
echo [4/6] Setting up ADB reverse tunnel (port 8081)...
"%ADB%" reverse tcp:8081 tcp:8081
echo     adb reverse tcp:8081 tcp:8081 done.
echo.

:: ── Step 5: Start Metro bundler in a new window ─────────────────────────────
echo [5/6] Starting Metro bundler...
tasklist /fi "WINDOWTITLE eq Metro Bundler*" 2>nul | findstr "cmd.exe" >nul
if %errorlevel%==0 (
    echo     Metro already appears to be running.
) else (
    start "Metro Bundler" cmd /k "cd /d %PROJECT% && set PATH=C:\Program Files\nodejs;%PATH% && echo Starting Metro... && "%NPX%" expo start --port 8081 2>&1"
    echo     Metro bundler started in new window. Waiting 8 seconds for it to initialise...
    timeout /t 8 /nobreak >nul
)
echo.

:: ── Step 6: Launch Expo Go with the app URL ─────────────────────────────────
echo [6/6] Launching app in Expo Go on emulator...
"%ADB%" shell am start -n host.exp.exponent/.experience.ExperienceActivity --es "url" "exp://127.0.0.1:8081" >nul 2>&1
echo     Expo Go launched with exp://127.0.0.1:8081
echo.

:: ── Summary ─────────────────────────────────────────────────────────────────
echo ============================================================
echo   App is launching in the Android emulator.
echo.
echo   To test on a REAL PHONE:
echo     1. Connect your phone to the SAME WiFi network as this PC
echo     2. Open the Expo Go app on your phone
echo     3. Tap "Enter URL manually" and type:
echo            exp://%LAN_IP%:8081
echo        OR scan the QR code shown in the Metro Bundler window.
echo.
echo   Metro bundler log: %METRO_LOG%
echo ============================================================
echo.
pause
