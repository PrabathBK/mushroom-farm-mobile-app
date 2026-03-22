schtasks /Delete /TN "StartEmulator" /F
schtasks /Create /TN "StartEmulator" /TR "C:\Users\irang\start_emulator.bat" /SC ONCE /ST 00:00 /RL HIGHEST /RU irang /F
Write-Output "StartEmulator task recreated OK"
schtasks /Query /TN "StartEmulator" /FO LIST /V
