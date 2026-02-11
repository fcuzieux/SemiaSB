@echo off
TITLE Serveur WhisperLiveKit (SemiaSB)
COLOR 0A

echo ===================================================
echo   SERVEUR WHISPER LIVE KIT (Option 4)
echo ===================================================
echo.

REM Vérifier Python
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERREUR] Python n'est pas detecte !
    echo Veuillez installer Python 3.10+ et l'ajouter au PATH.
    echo https://www.python.org/downloads/
    pause
    exit
)

echo Verification de l'installation de whisperlivekit...
pip show whisperlivekit >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo [INFO] whisperlivekit n'est pas installe. Installation en cours...
    echo Cela peut prendre du temps (telechargement de PyTorch, etc.)
    echo.
    pip install whisperlivekit
    if %errorlevel% neq 0 (
        echo [ERREUR] L'installation a echoue.
        pause
        exit
    )
    echo [OK] Installation terminee.
) else (
    echo [OK] whisperlivekit est deja installe.
)

echo.
echo ===================================================
echo   LANCEMENT DU SERVEUR
echo ===================================================
echo.
echo Options par defaut : Modèle SMALL, Langue FR
echo.
echo Accedez a l'application via : http://localhost:8080/capture.html
echo (Ou si vous utilisez le serveur HTTP PowerShell)
echo.

REM Choix du modèle
echo Choisissez la taille du modele :
echo 1. Small (Rapide, par defaut)
echo 2. Medium (Meilleure qualite, plus lent)
echo 3. Large-v3 (Qualite maximale, tres lent sur CPU)
set /p modele_choice="Votre choix (1-3) : "

if "%modele_choice%"=="3" (
    set MODEL_NAME=large-v3
) else if "%modele_choice%"=="2" (
    set MODEL_NAME=medium
) else (
    set MODEL_NAME=small
)

echo.
echo Lancement de WhisperLiveKit avec le modele : %MODEL_NAME%
echo (Le premier lancement peut etre long le temps de telecharger le modele)
echo.

REM Lancement du serveur
REM CUDA_VISIBLE_DEVICES=-1 force le mode CPU pour éviter les erreurs de DLL NVIDIA manquantes
set CUDA_VISIBLE_DEVICES=-1
wlk --model %MODEL_NAME% --language fr --host 127.0.0.1 --port 8000

pause
