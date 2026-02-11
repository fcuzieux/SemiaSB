# Script pour telecharger les bibliotheques Vosk pour un usage hors ligne

$baseUrl = "https://cdn.jsdelivr.net/npm/vosk-browser@0.0.3/dist"
$destPath = "h:\Developments\SemiaSBChrome"

$files = @("vosk.js", "vosk.wasm")

Write-Host "Telechargement des bibliotheques Vosk locales..." -ForegroundColor Cyan

foreach ($file in $files) {
    $url = "$baseUrl/$file"
    $output = Join-Path $destPath $file
    
    Write-Host "Telechargement de $file ..." -NoNewline
    try {
        Invoke-WebRequest -Uri $url -OutFile $output
        Write-Host " OK" -ForegroundColor Green
    }
    catch {
        Write-Host " ERREUR" -ForegroundColor Red
        Write-Error $_
    }
}

Write-Host "Termine." -ForegroundColor Green
