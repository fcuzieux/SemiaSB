@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

:: ========================================
::   Installation de FFmpeg pour SemiaSB
:: ========================================

color 0B
echo.
echo ╔════════════════════════════════════════════════════════════╗
echo ║                                                            ║
echo ║          Installation de FFmpeg pour SemiaSB              ║
echo ║                                                            ║
echo ╚════════════════════════════════════════════════════════════╝
echo.
echo Ce script va installer FFmpeg sur votre machine.
echo FFmpeg est nécessaire pour convertir vos vidéos avec chapitres.
echo.
echo ⏱️  Durée estimée : 2-3 minutes
echo 💾 Espace requis  : ~100 MB
echo.
pause

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🔍 Vérification de l'installation existante...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

:: Vérifier si FFmpeg est déjà installé
where ffmpeg >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ FFmpeg est déjà installé sur votre système !
    echo.
    echo Version installée :
    ffmpeg -version 2>nul | findstr "ffmpeg version"
    echo.
    echo Voulez-vous réinstaller FFmpeg ? (O/N^)
    set /p reinstall="> "
    if /i not "!reinstall!"=="O" (
        echo.
        echo ℹ️  Installation annulée. FFmpeg est déjà opérationnel.
        goto :end
    )
)

echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🔍 Détection de la méthode d'installation...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

:: Vérifier si winget est disponible
where winget >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Winget détecté - Installation via Windows Package Manager
    goto :install_winget
)

:: Vérifier si chocolatey est disponible
where choco >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Chocolatey détecté - Installation via Chocolatey
    goto :install_choco
)

:: Aucun gestionnaire de paquets trouvé
echo ⚠️  Aucun gestionnaire de paquets détecté.
echo.
echo Méthodes d'installation disponibles :
echo   1. Installer via Winget (recommandé pour Windows 10/11^)
echo   2. Installer via Chocolatey
echo   3. Installation manuelle (téléchargement direct^)
echo   4. Annuler
echo.
set /p method="Choisissez une méthode (1-4): "

if "%method%"=="1" goto :install_winget_first
if "%method%"=="2" goto :install_choco_first
if "%method%"=="3" goto :manual_install
if "%method%"=="4" goto :cancel
echo ❌ Choix invalide.
goto :end

:: ========================================
:: Installation via Winget
:: ========================================
:install_winget
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 📦 Installation de FFmpeg via Winget...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo ⏳ Téléchargement et installation en cours...
echo    (Cela peut prendre quelques minutes)
echo.

winget install --id=Gyan.FFmpeg -e --silent --accept-package-agreements --accept-source-agreements

if %errorlevel% equ 0 (
    echo.
    echo ✅ Installation réussie !
    goto :verify
) else (
    echo.
    echo ❌ Erreur lors de l'installation via Winget.
    echo    Voulez-vous essayer une autre méthode ? (O/N^)
    set /p retry="> "
    if /i "!retry!"=="O" goto :install_choco
    goto :end
)

:: ========================================
:: Installation via Chocolatey
:: ========================================
:install_choco
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 📦 Installation de FFmpeg via Chocolatey...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo ⏳ Téléchargement et installation en cours...
echo.

choco install ffmpeg -y

if %errorlevel% equ 0 (
    echo.
    echo ✅ Installation réussie !
    goto :verify
) else (
    echo.
    echo ❌ Erreur lors de l'installation via Chocolatey.
    goto :manual_install
)

:: ========================================
:: Installer Winget d'abord
:: ========================================
:install_winget_first
echo.
echo ℹ️  Winget n'est pas installé sur votre système.
echo    Winget est inclus dans Windows 10 (version 1809+) et Windows 11.
echo.
echo Pour installer Winget :
echo   1. Ouvrez le Microsoft Store
echo   2. Recherchez "App Installer"
echo   3. Installez ou mettez à jour l'application
echo.
echo Ou téléchargez depuis :
echo https://github.com/microsoft/winget-cli/releases
echo.
pause
goto :end

:: ========================================
:: Installer Chocolatey d'abord
:: ========================================
:install_choco_first
echo.
echo ℹ️  Installation de Chocolatey...
echo.
echo Chocolatey va être installé. Cela nécessite des privilèges administrateur.
echo.
pause

powershell -NoProfile -ExecutionPolicy Bypass -Command "Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))"

if %errorlevel% equ 0 (
    echo.
    echo ✅ Chocolatey installé avec succès !
    echo    Redémarrage du script nécessaire...
    pause
    "%~f0"
    exit
) else (
    echo.
    echo ❌ Erreur lors de l'installation de Chocolatey.
    goto :manual_install
)

:: ========================================
:: Installation manuelle
:: ========================================
:manual_install
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 📥 Installation manuelle de FFmpeg
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo Pour installer FFmpeg manuellement :
echo.
echo 1. Ouvrez votre navigateur et allez sur :
echo    https://www.gyan.dev/ffmpeg/builds/
echo.
echo 2. Téléchargez : ffmpeg-release-essentials.zip
echo.
echo 3. Extrayez l'archive dans un dossier (ex: C:\ffmpeg)
echo.
echo 4. Ajoutez le dossier 'bin' au PATH Windows :
echo    - Recherchez "Variables d'environnement" dans Windows
echo    - Cliquez sur "Variables d'environnement"
echo    - Dans "Variables système", sélectionnez "Path"
echo    - Cliquez "Modifier" puis "Nouveau"
echo    - Ajoutez : C:\ffmpeg\bin (ou votre chemin)
echo    - Cliquez "OK" sur toutes les fenêtres
echo.
echo 5. Redémarrez votre terminal et testez : ffmpeg -version
echo.
echo Voulez-vous ouvrir la page de téléchargement ? (O/N^)
set /p open="> "
if /i "!open!"=="O" (
    start https://www.gyan.dev/ffmpeg/builds/
)
goto :end

:: ========================================
:: Vérification de l'installation
:: ========================================
:verify
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo ✅ Vérification de l'installation...
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.

:: Rafraîchir les variables d'environnement
call :RefreshEnv

:: Vérifier FFmpeg
where ffmpeg >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ FFmpeg est maintenant installé et accessible !
    echo.
    echo 📊 Informations de version :
    ffmpeg -version 2>nul | findstr "ffmpeg version"
    echo.
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo 🎉 Installation terminée avec succès !
    echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    echo.
    echo Vous pouvez maintenant utiliser le script de conversion :
    echo   .\convert-chapters.ps1 -VideoFile "votre-video.webm"
    echo.
    echo Ou glisser-déposer votre vidéo sur :
    echo   Convertir-Video.bat
    echo.
) else (
    echo ⚠️  FFmpeg a été installé mais n'est pas encore accessible.
    echo.
    echo Solutions possibles :
    echo   1. Redémarrez votre terminal/invite de commandes
    echo   2. Redémarrez votre ordinateur
    echo   3. Vérifiez que FFmpeg est dans le PATH
    echo.
    echo Pour tester après redémarrage : ffmpeg -version
    echo.
)
goto :end

:: ========================================
:: Annulation
:: ========================================
:cancel
echo.
echo ℹ️  Installation annulée par l'utilisateur.
goto :end

:: ========================================
:: Rafraîchir les variables d'environnement
:: ========================================
:RefreshEnv
:: Recharger le PATH depuis le registre
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v Path 2^>nul') do set "SysPath=%%b"
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v Path 2^>nul') do set "UserPath=%%b"
set "PATH=%SysPath%;%UserPath%"
goto :eof

:: ========================================
:: Fin du script
:: ========================================
:end
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
pause
