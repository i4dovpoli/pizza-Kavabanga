@echo off
setlocal
cd /d "%~dp0"
javac -encoding UTF-8 java\KitchenOrdersApp.java
java -cp java KitchenOrdersApp
