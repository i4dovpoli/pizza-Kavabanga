$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not $env:KAVABANGA_API_BASE) {
  $env:KAVABANGA_API_BASE = "https://pizza-kavabanga.onrender.com"
}

javac -encoding UTF-8 java\KitchenOrdersApp.java
java "-Dkavabanga.api=$env:KAVABANGA_API_BASE" -cp java KitchenOrdersApp
