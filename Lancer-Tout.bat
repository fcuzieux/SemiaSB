@echo off
TITLE Lancement de tous les serveurs SemiaSB
COLOR 0B

echo ===================================================
echo   LANCEMENT DE TOUS LES SERVEURS
echo ===================================================
echo.
echo Ce script va lancer :
echo   1. Serveur HTTP (pour l'interface web)
echo   2. Serveur WLK (pour la reconnaissance vocale)
echo.
echo Deux fenetres vont s'ouvrir. NE LES FERMEZ PAS !
echo.
pause

echo.
echo [1/2] Lancement du serveur HTTP...
start "Serveur HTTP SemiaSB" cmd /k "Demarrer-Serveur.bat"

echo [2/2] Attente de 3 secondes...
timeout /t 3 /nobreak >nul

echo [2/2] Lancement du serveur WLK...
start "Serveur WLK SemiaSB" cmd /k "Lancer-WLK-Serveur.bat"

echo.
echo ===================================================
echo   SERVEURS LANCES !
echo ===================================================
echo.
echo Deux fenetres sont maintenant ouvertes :
echo   - Serveur HTTP : http://localhost:8080
echo   - Serveur WLK   : ws://localhost:8000
echo.
echo Ouvrez Firefox et allez sur :
echo   http://localhost:8080/capture.html
echo.
echo Pour arreter les serveurs, fermez les deux fenetres.
echo.
pause
