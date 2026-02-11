@echo off
REM Script d'installation du modèle Vosk pour SemiaSB
REM Ce script lance le script PowerShell d'installation

echo ========================================
echo   Installation du modele Vosk (FR)
echo ========================================
echo.

REM Vérifier si PowerShell est disponible
where powershell >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ERREUR: PowerShell n'est pas installe ou n'est pas dans le PATH
    echo.
    pause
    exit /b 1
)

REM Exécuter le script PowerShell
echo Lancement du script d'installation...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0Installer-Vosk.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo ERREUR: L'installation a echoue
    echo.
    pause
    exit /b 1
)

echo.
echo Installation terminee !
echo.
pause
