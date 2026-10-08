@echo off
set ANDROID_HOME=C:\Users\admin\AppData\Local\Android\Sdk
set JAVA_HOME=C:\Program Files\Microsoft\jdk-21.0.10.7-hotspot
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%ANDROID_HOME%\cmdline-tools\latest\bin;%PATH%
cd /d C:\Users\admin\Scolaria
echo === Android SDK check ===
adb devices
echo.
echo === Starting Expo run:android ===
echo.
npx expo run:android -d
pause
