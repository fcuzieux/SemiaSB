# Script d'installation du modele Vosk pour SemiaSB
# Ce script telecharge le modele de reconnaissance vocale francais au format .tar.gz

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Installation du modele Vosk (FR)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$extensionPath = "h:\Developments\SemiaSB"
$modelsDir = Join-Path $extensionPath "models\fr"
$tempDir = Join-Path $env:TEMP "vosk-download"

# Choix du modele
Write-Host "Quel modele souhaitez-vous installer ?" -ForegroundColor Yellow
Write-Host "1. Modele leger (41 MB) - Recommande pour debuter" -ForegroundColor Green
Write-Host "2. Modele complet (1.5 GB) - Meilleure qualite" -ForegroundColor Green
Write-Host ""
$choice = Read-Host "Votre choix (1 ou 2)"

if ($choice -eq "1") {
    $modelName = "vosk-model-small-fr-0.22"
    $modelUrl = "https://alphacephei.com/vosk/models/vosk-model-small-fr-0.22.zip"
    $modelSize = "41 MB"
    $needsConversion = $true
}
elseif ($choice -eq "2") {
    $modelName = "vosk-model-fr-0.22"
    $modelUrl = "https://alphacephei.com/vosk/models/vosk-model-fr-0.22.zip"
    $modelSize = "1.5 GB"
    $needsConversion = $true
}
else {
    Write-Host "Choix invalide. Abandon." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Modele selectionne : $modelName ($modelSize)" -ForegroundColor Cyan
Write-Host "URL : $modelUrl" -ForegroundColor Gray
Write-Host ""

# Creer les dossiers necessaires
Write-Host "Creation des dossiers..." -ForegroundColor Yellow
New-Item -ItemType Directory -Force -Path $modelsDir | Out-Null
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null
Write-Host "OK Dossiers crees" -ForegroundColor Green

# Telecharger le modele
$zipPath = Join-Path $tempDir "$modelName.zip"
$targzPath = Join-Path $modelsDir "$modelName.tar.gz"

Write-Host ""
Write-Host "Telechargement du modele ($modelSize)..." -ForegroundColor Yellow
Write-Host "Cela peut prendre plusieurs minutes selon votre connexion..." -ForegroundColor Gray

try {
    # Utiliser WebClient pour afficher la progression
    $webClient = New-Object System.Net.WebClient
    
    # Event handler pour la progression
    Register-ObjectEvent -InputObject $webClient -EventName DownloadProgressChanged -SourceIdentifier WebClient.DownloadProgressChanged -Action {
        $percent = $EventArgs.ProgressPercentage
        $received = [math]::Round($EventArgs.BytesReceived / 1MB, 2)
        $total = [math]::Round($EventArgs.TotalBytesToReceive / 1MB, 2)
        Write-Progress -Activity "Telechargement du modele Vosk" -Status "$percent% - $received MB / $total MB" -PercentComplete $percent
    } | Out-Null
    
    # Telecharger
    $webClient.DownloadFileAsync($modelUrl, $zipPath)
    
    # Attendre la fin du telechargement
    while ($webClient.IsBusy) {
        Start-Sleep -Milliseconds 100
    }
    
    # Nettoyer
    Unregister-Event -SourceIdentifier WebClient.DownloadProgressChanged
    $webClient.Dispose()
    
    Write-Progress -Activity "Telechargement du modele Vosk" -Completed
    Write-Host "OK Telechargement termine" -ForegroundColor Green
    
}
catch {
    Write-Host "ERREUR lors du telechargement : $_" -ForegroundColor Red
    exit 1
}

# Extraire temporairement pour recompresser en .tar.gz
Write-Host ""
Write-Host "Extraction du modele..." -ForegroundColor Yellow

$extractDir = Join-Path $tempDir "extracted"
New-Item -ItemType Directory -Force -Path $extractDir | Out-Null

try {
    Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force
    Write-Host "OK Extraction terminee" -ForegroundColor Green
}
catch {
    Write-Host "ERREUR lors de l'extraction : $_" -ForegroundColor Red
    exit 1
}

# Trouver le dossier du modele
$modelDir = Get-ChildItem -Path $extractDir -Directory | Select-Object -First 1

if (-not $modelDir) {
    Write-Host "ERREUR: Impossible de trouver le dossier du modele" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Creation de l'archive .tar.gz..." -ForegroundColor Yellow
Write-Host "IMPORTANT: Vosk-browser necessite le format .tar.gz" -ForegroundColor Gray

# Verifier si tar est disponible (Windows 10+)
if (Get-Command tar -ErrorAction SilentlyContinue) {
    Write-Host "Utilisation de tar natif Windows..." -ForegroundColor Green
    # Aller DANS le dossier extrait
    Push-Location $modelDir.FullName
    
    # Creer le .tar.gz avec les fichiers à la racine (archive plate)
    # "." signifie "tout le contenu du dossier courant"
    if (Test-Path $targzPath) { Remove-Item $targzPath -Force }
    & tar -czf $targzPath .
    
    Pop-Location
    
    if (Test-Path $targzPath) {
        Write-Host "OK Archive .tar.gz creee avec succes" -ForegroundColor Green
    }
    else {
        Write-Host "ERREUR: Impossible de creer l'archive .tar.gz" -ForegroundColor Red
        exit 1
    }
}
else {
    Write-Host "ATTENTION: tar n'est pas disponible sur votre systeme" -ForegroundColor Yellow
    Write-Host "Telechargement direct du fichier .tar.gz depuis le serveur..." -ForegroundColor Yellow
    
    # URL alternative pour .tar.gz (si disponible)
    $targzUrl = $modelUrl -replace '\.zip$', '.tar.gz'
    
    Write-Host "Tentative de telechargement depuis: $targzUrl" -ForegroundColor Gray
    
    try {
        $webClient2 = New-Object System.Net.WebClient
        $webClient2.DownloadFile($targzUrl, $targzPath)
        $webClient2.Dispose()
        Write-Host "OK Fichier .tar.gz telecharge" -ForegroundColor Green
    }
    catch {
        Write-Host "ERREUR: Impossible de telecharger le .tar.gz" -ForegroundColor Red
        Write-Host "Veuillez installer tar ou telecharger manuellement le fichier .tar.gz" -ForegroundColor Yellow
        Write-Host "URL: $targzUrl" -ForegroundColor White
        exit 1
    }
}

# Verifier l'installation
if (Test-Path $targzPath) {
    $fileSize = [math]::Round((Get-Item $targzPath).Length / 1MB, 2)
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  Installation reussie !" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Le modele a ete installe dans :" -ForegroundColor Cyan
    Write-Host $targzPath -ForegroundColor White
    Write-Host "Taille: $fileSize MB" -ForegroundColor Gray
    Write-Host ""
    
    # Mettre a jour capture-stt.js
    $captureSttPath = Join-Path $extensionPath "capture-stt.js"
    if (Test-Path $captureSttPath) {
        Write-Host "Mise a jour de capture-stt.js..." -ForegroundColor Yellow
        
        $content = Get-Content $captureSttPath -Raw
        $oldPattern = "const modelPath = '.*?';"
        $newPath = "const modelPath = 'models/fr/$modelName.tar.gz';"
        
        if ($content -match $oldPattern) {
            $content = $content -replace $oldPattern, $newPath
            Set-Content -Path $captureSttPath -Value $content -NoNewline
            Write-Host "OK capture-stt.js mis a jour avec le bon chemin" -ForegroundColor Green
        }
        else {
            Write-Host "ATTENTION Impossible de mettre a jour automatiquement capture-stt.js" -ForegroundColor Yellow
            Write-Host "Veuillez mettre a jour manuellement la ligne 63 avec :" -ForegroundColor Yellow
            Write-Host $newPath -ForegroundColor White
        }
    }
    
    Write-Host ""
    Write-Host "Prochaines etapes :" -ForegroundColor Cyan
    Write-Host "1. Double-cliquez sur 'Demarrer-Serveur.bat'" -ForegroundColor White
    Write-Host "2. Ouvrez Firefox" -ForegroundColor White
    Write-Host "3. Allez a: http://localhost:8080/capture.html" -ForegroundColor Green
    Write-Host "4. Cochez 'Capturer l'audio'" -ForegroundColor White
    Write-Host "5. Cliquez sur 'Demarrer'" -ForegroundColor White
    Write-Host "6. La transcription apparaitra dans la zone de texte" -ForegroundColor White
    Write-Host ""
    Write-Host "IMPORTANT: Utilisez http://localhost:8080/... et NON file://..." -ForegroundColor Red
    Write-Host ""
    
}
else {
    Write-Host ""
    Write-Host "ERREUR Le modele n'a pas ete trouve apres l'installation" -ForegroundColor Red
    Write-Host "Chemin attendu : $targzPath" -ForegroundColor Gray
    exit 1
}

# Nettoyer les fichiers temporaires
Write-Host "Nettoyage des fichiers temporaires..." -ForegroundColor Yellow
Remove-Item -Path $tempDir -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "OK Nettoyage termine" -ForegroundColor Green

Write-Host ""
Write-Host "Installation terminee avec succes !" -ForegroundColor Green
Write-Host ""

# Pause pour que l'utilisateur puisse lire les messages
Read-Host "Appuyez sur Entree pour fermer"
