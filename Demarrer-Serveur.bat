@echo off
REM Script pour demarrer le serveur HTTP local pour SemiaSB + Vosk

echo ========================================
echo   Serveur HTTP pour SemiaSB + Vosk
echo ========================================
echo.

REM Verifier si PowerShell est disponible
where powershell >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERREUR: PowerShell n'est pas installe
    pause
    exit /b 1
)

REM Executer le script PowerShell
powershell -ExecutionPolicy Bypass -File "%~dp0Demarrer-Serveur.ps1"

pause
