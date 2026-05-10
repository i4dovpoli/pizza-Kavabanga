$ErrorActionPreference = "Stop"

$BundledPython = "$env:USERPROFILE\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"

if (Test-Path $BundledPython) {
  & $BundledPython app.py
  exit $LASTEXITCODE
}

if (Get-Command python -ErrorAction SilentlyContinue) {
  python app.py
  exit $LASTEXITCODE
}

if (Get-Command py -ErrorAction SilentlyContinue) {
  py app.py
  exit $LASTEXITCODE
}

Write-Error "Python не знайдено. Встанови Python або запусти через bundled Python Codex."
