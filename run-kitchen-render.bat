@echo off
setlocal
cd /d "%~dp0"
if "%KAVABANGA_API_BASE%"=="" (
  echo Set KAVABANGA_API_BASE to your Render URL first.
  echo Example:
  echo set KAVABANGA_API_BASE=https://kavabanga-api.onrender.com
  exit /b 1
)
javac -encoding UTF-8 java\KitchenOrdersApp.java
java -Dkavabanga.api=%KAVABANGA_API_BASE% -cp java KitchenOrdersApp
