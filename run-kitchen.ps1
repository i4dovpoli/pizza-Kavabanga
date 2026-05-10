$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

javac -encoding UTF-8 java\KitchenOrdersApp.java

java -cp java KitchenOrdersApp
