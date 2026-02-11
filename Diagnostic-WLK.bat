@echo off
TITLE Diagnostic WLK - SemiaSB
COLOR 0E

echo ===================================================
echo   DIAGNOSTIC WHISPERLIVEKIT (WLK)
echo ===================================================
echo.
echo Ce script va verifier que tout est bien configure
echo pour utiliser WLK avec SemiaSB.
echo.
pause

echo.
echo [1/5] Verification de Python...
echo ------------------------------------------------
python --version 2>nul
if %errorlevel% neq 0 (
    echo [ERREUR] Python n'est pas installe ou pas dans le PATH !
    echo.
    echo SOLUTION :
    echo 1. Installez Python depuis : https://www.python.org/downloads/
    echo 2. Cochez "Add Python to PATH" pendant l'installation
    echo 3. Redemarrez votre ordinateur
    echo.
    set PYTHON_OK=0
) else (
    echo [OK] Python est installe
    set PYTHON_OK=1
)

echo.
echo [2/5] Verification de pip...
echo ------------------------------------------------
if %PYTHON_OK%==1 (
    pip --version 2>nul
    if %errorlevel% neq 0 (
        echo [ERREUR] pip n'est pas disponible !
        set PIP_OK=0
    ) else (
        echo [OK] pip est disponible
        set PIP_OK=1
    )
) else (
    echo [IGNORE] Python n'est pas installe
    set PIP_OK=0
)

echo.
echo [3/5] Verification de whisperlivekit...
echo ------------------------------------------------
if %PIP_OK%==1 (
    pip show whisperlivekit >nul 2>&1
    if %errorlevel% neq 0 (
        echo [INFO] whisperlivekit n'est pas installe
        echo.
        echo SOLUTION :
        echo Lancez "Lancer-WLK-Serveur.bat" pour installer automatiquement
        echo OU executez manuellement : pip install whisperlivekit
        echo.
        set WLK_OK=0
    ) else (
        echo [OK] whisperlivekit est installe
        pip show whisperlivekit | findstr "Version"
        set WLK_OK=1
    )
) else (
    echo [IGNORE] pip n'est pas disponible
    set WLK_OK=0
)

echo.
echo [4/5] Test de connexion au serveur WLK...
echo ------------------------------------------------
echo Tentative de connexion a http://localhost:8000/
echo (Si le serveur n'est pas lance, c'est normal)
echo.

REM Utiliser PowerShell pour tester la connexion
powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8000/' -TimeoutSec 2 -ErrorAction Stop; Write-Host '[OK] Serveur WLK est accessible !' -ForegroundColor Green } catch { if ($_.Exception.Message -like '*404*') { Write-Host '[OK] Serveur WLK repond (404 est normal)' -ForegroundColor Green } else { Write-Host '[INFO] Serveur WLK n''est pas lance (c''est normal si vous ne l''avez pas demarre)' -ForegroundColor Yellow } }"

echo.
echo [5/5] Verification du serveur HTTP...
echo ------------------------------------------------
echo Tentative de connexion a http://localhost:8080/
echo.

powershell -Command "try { $response = Invoke-WebRequest -Uri 'http://localhost:8080/' -TimeoutSec 2 -ErrorAction Stop; Write-Host '[OK] Serveur HTTP est accessible !' -ForegroundColor Green } catch { Write-Host '[INFO] Serveur HTTP n''est pas lance' -ForegroundColor Yellow; Write-Host 'Lancez Demarrer-Serveur.bat pour le demarrer' -ForegroundColor Yellow }"

echo.
echo ===================================================
echo   RESUME DU DIAGNOSTIC
echo ===================================================
echo.

if %PYTHON_OK%==1 (
    echo [OK] Python : Installe
) else (
    echo [ERREUR] Python : Non installe
)

if %PIP_OK%==1 (
    echo [OK] pip : Disponible
) else (
    echo [ERREUR] pip : Non disponible
)

if %WLK_OK%==1 (
    echo [OK] whisperlivekit : Installe
) else (
    echo [INFO] whisperlivekit : Non installe
)

echo.
echo ===================================================
echo   PROCHAINES ETAPES
echo ===================================================
echo.

if %PYTHON_OK%==0 (
    echo 1. Installez Python : https://www.python.org/downloads/
    echo    ^(Cochez "Add Python to PATH"^)
    echo 2. Redemarrez votre ordinateur
    echo 3. Relancez ce diagnostic
) else if %WLK_OK%==0 (
    echo 1. Lancez "Lancer-WLK-Serveur.bat"
    echo    ^(L'installation se fera automatiquement^)
) else (
    echo Tout est pret ! Pour utiliser WLK :
    echo.
    echo 1. Lancez "Lancer-WLK-Serveur.bat"
    echo 2. Lancez "Demarrer-Serveur.bat"
    echo 3. Ouvrez Firefox : http://localhost:8080/capture.html
    echo 4. Selectionnez "WLK" et cliquez sur "Demarrer"
    echo.
    echo OU utilisez "Lancer-Tout.bat" pour tout lancer en une fois !
)

echo.
echo ===================================================
echo.
pause
