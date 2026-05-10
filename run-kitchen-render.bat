@echo off
setlocal
cd /d "%~dp0"
if "%KAVABANGA_API_BASE%"=="" (
  set "KAVABANGA_API_BASE=https://pizza-kavabanga.onrender.com"
)
javac -encoding UTF-8 java\KitchenOrdersApp.java
java -Dkavabanga.api=%KAVABANGA_API_BASE% -cp java KitchenOrdersApp
