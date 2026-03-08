@echo off
:: =============================================================================
::  Mushroom Farm Mobile -- Dev Runner (Windows)
::  Usage: dev.bat
::
::  What it does:
::    1.  TypeScript check (aborts on errors)
::    2.  Kills any process on port 8081
::    3.  Starts Android emulator (Medium_Phone_API_36.0) if not running
::    4.  Waits for emulator to fully boot
::    5.  Installs debug APK if not already installed
::    6.  Sets up adb reverse for Metro
::    7.  Starts Metro in the FOREGROUND (QR code + interactive menu)
::    8.  Background watcher auto-launches the app on the emulator once Metro
::        is ready (real phone: scan the QR code with Expo Go)
::
::  Requirements:
::    - Node.js + npm in PATH
::    - Android SDK: set ANDROID_HOME (e.g. C:\Users\you\AppData\Local\Android\Sdk)
::    - adb.exe in PATH  (or add %ANDROID_HOME%\platform-tools to PATH)
::    - emulator.exe in PATH (or add %ANDROID_HOME%\emulator to PATH)
:: =============================================================================

setlocal EnableDelayedExpansion

:: ── Config ───────────────────────────────────────────────────────────────────
set AVD_NAME=Medium_Phone_API_36.0
set APP_PACKAGE=com.anonymous.mushroomfarmmobile
set APK_PATH=android\app\build\outputs\apk\debug\app-debug.apk
set METRO_PORT=8081
set METRO_LOG=%TEMP%\metro_mushroom.log
set READY_SENTINEL=%TEMP%\.metro_mushroom_ready

:: ── Helpers (colour via ANSI — works on Windows 10 1511+ / Windows 11) ───────
:: Enable virtual terminal processing so ANSI colours render in cmd.exe
for /f "tokens=*" %%i in ('reg query HKCU\Console /v VirtualTerminalLevel 2^>nul') do set _VT=%%i
if not defined _VT (
  reg add HKCU\Console /v VirtualTerminalLevel /t REG_DWORD /d 1 /f >nul 2>&1
)

:: ─────────────────────────────────────────────────────────────────────────────
:: STEP 0 — TypeScript check
:: ─────────────────────────────────────────────────────────────────────────────
echo.
echo [36m[1m^>  TypeScript check[0m
call npx tsc --noEmit
if errorlevel 1 (
  echo    [31m[x] TypeScript errors found -- fix before running[0m
  exit /b 1
)
echo    [32m[v] 0 errors[0m

:: ─────────────────────────────────────────────────────────────────────────────
:: STEP 1 — Kill anything on port 8081
:: ─────────────────────────────────────────────────────────────────────────────
echo.
echo [36m[1m^>  Clearing port %METRO_PORT%[0m

:: Kill node processes running expo (best effort)
taskkill /f /im node.exe /fi "WINDOWTITLE eq expo*" >nul 2>&1

:: Kill whatever is on port 8081
for /f "tokens=5" %%p in ('netstat -ano ^| findstr ":%METRO_PORT% " ^| findstr "LISTENING"') do (
  taskkill /f /pid %%p >nul 2>&1
  echo    [33m[!] Killed PID %%p on port %METRO_PORT%[0m
)

if exist "%READY_SENTINEL%" del "%READY_SENTINEL%" >nul 2>&1
if exist "%METRO_LOG%"      del "%METRO_LOG%"      >nul 2>&1

echo    [32m[v] Port %METRO_PORT% cleared[0m
timeout /t 1 /nobreak >nul

:: ─────────────────────────────────────────────────────────────────────────────
:: STEP 2 — Start emulator if not running
:: ─────────────────────────────────────────────────────────────────────────────
echo.
echo [36m[1m^>  Android emulator[0m

set RUNNING_EMU=
for /f "tokens=1" %%d in ('adb devices 2^>nul ^| findstr /i "emulator"') do set RUNNING_EMU=%%d

if not defined RUNNING_EMU (
  echo    [33m[!] No emulator running -- starting %AVD_NAME%[0m
  if not defined ANDROID_HOME (
    echo    [31m[x] ANDROID_HOME is not set. Set it to your Android SDK path.[0m
    exit /b 1
  )
  start /b "" "%ANDROID_HOME%\emulator\emulator.exe" ^
    -avd %AVD_NAME% ^
    -no-snapshot-save ^
    -no-audio ^
    >"%TEMP%\emulator_mushroom.log" 2>&1

  echo    Waiting for emulator to boot (up to 3 min)...
  set BOOT=0
  for /l %%i in (1,1,60) do (
    if "!BOOT!" == "1" goto :emulator_ready
    timeout /t 3 /nobreak >nul
    for /f "delims=" %%b in ('adb shell getprop sys.boot_completed 2^>nul') do (
      set BOOT_RAW=%%b
      set BOOT_RAW=!BOOT_RAW: =!
      set BOOT_RAW=!BOOT_RAW:	=!
      if "!BOOT_RAW!" == "1" set BOOT=1
    )
    set /a DOT_IDX=%%i %% 5
    if "!DOT_IDX!" == "0" echo    ...%%i checks done
  )
  if "!BOOT!" neq "1" (
    echo    [31m[x] Emulator did not boot within 180s[0m
    exit /b 1
  )
) else (
  echo    [32m[v] Already running: %RUNNING_EMU%[0m
  goto :emulator_ready
)

:emulator_ready
echo    [32m[v] Emulator ready[0m

:: ─────────────────────────────────────────────────────────────────────────────
:: STEP 3 — Install APK if not present
:: ─────────────────────────────────────────────────────────────────────────────
echo.
echo [36m[1m^>  App installation[0m

set INSTALLED=
for /f "tokens=*" %%p in ('adb shell pm list packages 2^>nul ^| findstr "%APP_PACKAGE%"') do set INSTALLED=%%p

if not defined INSTALLED (
  if exist "%APK_PATH%" (
    echo    [33m[!] Not installed -- installing debug APK[0m
    adb install -r "%APK_PATH%"
    echo    [32m[v] APK installed[0m
  ) else (
    echo    [31m[x] APK not found at %APK_PATH%[0m
    echo    [31m    Build first:  cd android ^&^& gradlew.bat assembleDebug[0m
    exit /b 1
  )
) else (
  echo    [32m[v] Already installed[0m
)

:: ─────────────────────────────────────────────────────────────────────────────
:: STEP 4 — adb reverse
:: ─────────────────────────────────────────────────────────────────────────────
echo.
echo [36m[1m^>  adb reverse tcp:%METRO_PORT% -^> tcp:%METRO_PORT%[0m
adb reverse tcp:%METRO_PORT% tcp:%METRO_PORT%
echo    [32m[v] Done[0m

:: ─────────────────────────────────────────────────────────────────────────────
:: STEP 5 — Background watcher (separate window)
::
::  Polls %METRO_LOG% for "Metro waiting on", then:
::    - re-runs adb reverse
::    - force-stops and relaunches the app on the emulator
:: ─────────────────────────────────────────────────────────────────────────────
echo.
echo [36m[1m^>  Starting background watcher[0m

:: Write the watcher script to a temp file then launch it minimised
set WATCHER_SCRIPT=%TEMP%\metro_watcher_mushroom.bat
(
  echo @echo off
  echo setlocal EnableDelayedExpansion
  echo set FOUND=0
  echo for /l %%%%i in (1,1,120^) do (
  echo   if "!FOUND!" == "1" exit /b 0
  echo   timeout /t 2 /nobreak ^>nul
  echo   findstr /i "Metro waiting on\|Waiting on http" "%METRO_LOG%" ^>nul 2^>^&1
  echo   if not errorlevel 1 (
  echo     set FOUND=1
  echo     echo [auto] Metro ready -- launching app on emulator
  echo     adb reverse tcp:%METRO_PORT% tcp:%METRO_PORT% ^>nul 2^>^&1
  echo     adb shell am force-stop %APP_PACKAGE% ^>nul 2^>^&1
  echo     timeout /t 1 /nobreak ^>nul
  echo     adb shell am start -n %APP_PACKAGE%/%APP_PACKAGE%.MainActivity ^>nul 2^>^&1
  echo     echo [auto] App launched -- emulator connecting to Metro
  echo     echo [auto] Real phone: scan the QR code with Expo Go
  echo     exit /b 0
  echo   ^)
  echo ^)
  echo echo [auto] Metro ready signal not seen -- launch the app manually
) > "%WATCHER_SCRIPT%"

start /min "Metro Watcher" cmd /c "%WATCHER_SCRIPT%"
echo    [32m[v] Watcher running in background[0m

:: ─────────────────────────────────────────────────────────────────────────────
:: STEP 6 — Metro in the FOREGROUND
:: ─────────────────────────────────────────────────────────────────────────────
echo.
echo [36m[1m^>  Starting Metro  (QR code + interactive menu below)[0m
echo    [33mExpo Go on real phone -^> scan QR code (same WiFi as this PC)[0m
echo    [33mEmulator           -^> app launches automatically[0m
echo    [33mCtrl+C             -^> stop Metro and exit[0m
echo.

:: Tee Metro output to log AND show it on screen.
:: 'tee' is available via Git for Windows, WSL, or Windows PowerShell.
:: We try PowerShell tee first (always available); fall back to plain output.
where tee >nul 2>&1
if not errorlevel 1 (
  npx expo start --port %METRO_PORT% --clear 2>&1 | tee "%METRO_LOG%"
) else (
  :: No tee -- run Metro and also write log via PowerShell in background
  start /min "" powershell -NoProfile -Command ^
    "Get-Content '%METRO_LOG%' -Wait -ErrorAction SilentlyContinue" >nul 2>&1
  npx expo start --port %METRO_PORT% --clear 2>&1 | ^
    powershell -NoProfile -Command ^
      "$input | Tee-Object -FilePath '%METRO_LOG%'"
)

endlocal
