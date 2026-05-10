@echo off
setlocal
cd /d "%~dp0"
set "PY=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%PY%" (
  "%PY%" app.py
  exit /b %ERRORLEVEL%
)
python app.py
