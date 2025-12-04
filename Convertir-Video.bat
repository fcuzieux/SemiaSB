@echo off
echo.
echo ========================================
echo   Conversion Video avec Chapitres
echo ========================================
echo.

if "%~1"=="" (
    echo Usage: Glissez-deposez votre fichier .webm sur ce script
    echo.
    pause
    exit /b
)

powershell.exe -ExecutionPolicy Bypass -File "%~dp0convert-chapters.ps1" -VideoFile "%~1"

echo.
pause
