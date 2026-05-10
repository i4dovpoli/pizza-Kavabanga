$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not $env:KAVABANGA_API_BASE) {
  Write-Host "Set KAVABANGA_API_BASE to your Render URL first."
  Write-Host "Example:"
  Write-Host '$env:KAVABANGA_API_BASE="https://kavabanga-api.onrender.com"'
  exit 1
}

javac -encoding UTF-8 java\KitchenOrdersApp.java
java "-Dkavabanga.api=$env:KAVABANGA_API_BASE" -cp java KitchenOrdersApp
