@echo off
setlocal EnableDelayedExpansion

title Mushroom Farm - App Launcher

set "ADB=C:\Users\irang\AppData\Local\Android\Sdk\platform-tools\adb.exe"
set "EMULATOR_EXE=C:\Users\irang\AppData\Local\Android\Sdk\emulator\emulator.exe"
set "AVD=Medium_Phone_API_36.0"
set "PROJECT=D:\mushroom\mushroom-farm-mobile-app"
set "EXPO_GO_APK=C:\Users\irang\Downloads\Expo-Go-2.32.20.apk"
set "NODE=C:\Program Files\nodejs\node.exe"
set "PORT=8081"
set "METRO_LOG=C:\Users\irang\metro.log"

echo.
echo  ============================================================
echo    Mushroom Farm Mobile  -  Fresh Start
echo  ============================================================
echo.

:: STEP 0: Kill leftover processes
echo  [0/7] Cleaning up leftover processes...
powershell -NoProfile -NonInteractive -Command "Get-Process node -EA SilentlyContinue | Stop-Process -Force" >nul 2>&1
powershell -NoProfile -NonInteractive -Command "Get-Process qemu-system-x86_64,emulator -EA SilentlyContinue | Stop-Process -Force" >nul 2>&1
powershell -NoProfile -NonInteractive -Command "Get-Process adb -EA SilentlyContinue | Stop-Process -Force" >nul 2>&1
ping -n 4 127.0.0.1 >nul 2>&1
echo        Done.
echo.

:: STEP 1: Detect LAN IP
echo  [1/7] Detecting LAN IP...
set "LAN_IP="
for /f "tokens=2 delims=:" %%A in ('ipconfig ^| findstr /i "IPv4" ^| findstr /v "127.0.0.1" ^| findstr /v "169.254" ^| findstr /v "100\." ^| findstr /v "172\."') do (
    if not defined LAN_IP (
        set "RAWIP=%%A"
        set "LAN_IP=!RAWIP: =!"
    )
)
if not defined LAN_IP (
    echo  ERROR: Could not detect LAN IP. Check your WiFi connection.
    pause
    exit /b 1
)
echo        LAN IP: %LAN_IP%
echo.

:: STEP 2: Start emulator
echo  [2/7] Starting Android emulator...
"%ADB%" start-server >nul 2>&1
"%ADB%" devices 2>nul | findstr /r "emulator.*device" >nul
if %errorlevel%==0 (
    echo        Emulator already running.
    goto emu_done
)

echo        Launching AVD: %AVD%  ^(cold start takes 1-3 min^)
powershell -NoProfile -NonInteractive -Command "([wmiclass]'Win32_Process').Create('%EMULATOR_EXE% -avd %AVD% -no-snapshot-save -no-audio -no-boot-anim -no-window')" >nul 2>&1

echo        Waiting for emulator to connect to adb...
:wait_adb
ping -n 6 127.0.0.1 >nul 2>&1
"%ADB%" devices 2>nul | findstr "emulator" >nul
if %errorlevel% neq 0 goto wait_adb

:wait_device
ping -n 4 127.0.0.1 >nul 2>&1
"%ADB%" devices 2>nul | findstr /r "emulator.*device" >nul
if %errorlevel% neq 0 goto wait_device
echo        Emulator connected to adb.

echo        Waiting for full Android boot...
:wait_boot
ping -n 6 127.0.0.1 >nul 2>&1
for /f "tokens=*" %%B in ('"%ADB%" shell getprop sys.boot_completed 2^>nul') do set "BOOTED=%%B"
if "!BOOTED!" neq "1" goto wait_boot
echo        Emulator fully booted.

:emu_done
echo.

:: STEP 3: Expo Go + adb reverse
echo  [3/7] Preparing emulator...
"%ADB%" shell pm list packages 2>nul | findstr /i "host.exp.exponent" >nul
if %errorlevel% neq 0 (
    echo        Installing Expo Go...
    "%ADB%" install -r "%EXPO_GO_APK%" >nul 2>&1
    echo        Expo Go installed.
) else (
    echo        Expo Go already installed.
)
"%ADB%" reverse tcp:%PORT% tcp:%PORT% >nul 2>&1
echo        adb reverse tcp:%PORT% done.
echo.

:: STEP 4: Firewall
echo  [4/7] Checking firewall...
netsh advfirewall firewall show rule name="Metro 8081" >nul 2>&1
if %errorlevel% neq 0 (
    netsh advfirewall firewall add rule name="Metro 8081" dir=in action=allow protocol=TCP localport=%PORT% profile=any >nul 2>&1
    echo        Firewall rule added for port %PORT%.
) else (
    echo        Firewall rule already present.
)
echo.

:: STEP 5: Start Metro
echo  [5/7] Starting Metro bundler...
(
echo @echo off
echo cd /d %PROJECT%
echo npx expo start --port %PORT% --lan ^> %METRO_LOG% 2^>^&1
) > C:\Users\irang\start_metro.bat

type nul > "%METRO_LOG%" 2>nul
powershell -NoProfile -NonInteractive -Command "([wmiclass]'Win32_Process').Create('cmd.exe /c C:\Users\irang\start_metro.bat', '%PROJECT%')" >nul 2>&1

echo        Waiting for Metro on port %PORT%...
:wait_metro
ping -n 5 127.0.0.1 >nul 2>&1
curl -s --max-time 3 http://localhost:%PORT%/status 2>nul | findstr "running" >nul
if %errorlevel% neq 0 goto wait_metro
echo        Metro is ready.

curl -s --max-time 5 http://%LAN_IP%:%PORT%/status 2>nul | findstr "running" >nul
if %errorlevel%==0 (
    echo        Metro reachable on LAN: http://%LAN_IP%:%PORT%  OK
) else (
    echo  WARNING: Metro NOT reachable on LAN IP %LAN_IP%:%PORT%
    echo  Check firewall and WiFi.
)
echo.

:: STEP 6: Pre-warm Android bundle
echo  [6/7] Pre-warming Android bundle for phone...
echo        ^(compiling JS bundle now so phone loads in seconds^)
curl -s --max-time 120 -o NUL "http://localhost:%PORT%/index.ts.bundle?platform=android&dev=true&hot=false&transform.engine=hermes&transform.bytecode=0&unstable_transformProfile=hermes-stable" >nul 2>&1
echo        Android bundle ready.
echo.

:: STEP 7: Launch on emulator
echo  [7/7] Launching app in Expo Go on emulator...
"%ADB%" shell am force-stop host.exp.exponent >nul 2>&1
ping -n 4 127.0.0.1 >nul 2>&1
"%ADB%" shell am start -a android.intent.action.VIEW -d "exp://127.0.0.1:%PORT%" host.exp.exponent >nul 2>&1
echo        App launched on emulator.
echo.

:: Print QR codes
echo  ============================================================
echo    QR CODES
echo  ============================================================
echo.
echo  QR 1 = Android Emulator ^(this PC^)
echo  QR 2 = Physical Phone   ^(must be on same WiFi as this PC^)
echo.
"%NODE%" "%PROJECT%\print-qr.js" "exp://127.0.0.1:%PORT%" "exp://%LAN_IP%:%PORT%"

echo.
echo  ============================================================
echo   Emulator URL : exp://127.0.0.1:%PORT%
echo   Phone URL    : exp://%LAN_IP%:%PORT%
echo.
echo   HOW TO CONNECT YOUR PHONE:
echo     1. Connect phone to the SAME WiFi as this PC
echo     2. Install Expo Go from Play Store / App Store if needed
echo     3. Open Expo Go
echo     4. Tap "Scan QR code" and scan QR 2 above
echo        OR tap "Enter URL manually" and type:
echo        exp://%LAN_IP%:%PORT%
echo.
echo   Bundle is pre-warmed - phone loads in seconds.
echo   Metro log: %METRO_LOG%
echo  ============================================================
echo.
pause
