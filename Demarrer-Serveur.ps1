# Script pour lancer un serveur HTTP local pour Vosk
# Ce serveur permet à Vosk-browser de charger le modèle correctement

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Serveur HTTP pour SemiaSB + Vosk" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$port = 8080
$path = "h:\Developments\SemiaSB"

Write-Host "Demarrage du serveur HTTP..." -ForegroundColor Yellow
Write-Host "Repertoire: $path" -ForegroundColor Gray
Write-Host "Port: $port" -ForegroundColor Gray
Write-Host ""

Write-Host "IMPORTANT:" -ForegroundColor Yellow
Write-Host "1. Ouvrez votre navigateur" -ForegroundColor White
Write-Host "2. Allez a l'adresse: http://localhost:$port/capture.html" -ForegroundColor Green
Write-Host "3. NE fermez PAS cette fenetre tant que vous utilisez l'application" -ForegroundColor Red
Write-Host ""
Write-Host "Pour arreter le serveur, appuyez sur Ctrl+C" -ForegroundColor Gray
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Python est installé
$pythonCmd = $null
if (Get-Command python -ErrorAction SilentlyContinue) {
    $pythonCmd = "python"
}
elseif (Get-Command python3 -ErrorAction SilentlyContinue) {
    $pythonCmd = "python3"
}
elseif (Get-Command py -ErrorAction SilentlyContinue) {
    $pythonCmd = "py"
}

if ($pythonCmd) {
    Write-Host "Utilisation de Python pour le serveur HTTP..." -ForegroundColor Green
    Write-Host ""
    Set-Location $path
    & $pythonCmd -m http.server $port
}
else {
    # Utiliser le serveur HTTP de PowerShell (plus lent mais fonctionne)
    Write-Host "Python non trouve, utilisation du serveur PowerShell..." -ForegroundColor Yellow
    Write-Host "(Note: Le serveur PowerShell est plus lent que Python)" -ForegroundColor Gray
    Write-Host ""
    
    # Créer un listener HTTP simple
    $listener = New-Object System.Net.HttpListener
    $listener.Prefixes.Add("http://localhost:$port/")
    $listener.Start()
    
    Write-Host "Serveur demarre sur http://localhost:$port/" -ForegroundColor Green
    Write-Host "Appuyez sur Ctrl+C pour arreter" -ForegroundColor Gray
    Write-Host ""
    
    try {
        while ($listener.IsListening) {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response
            
            $requestedPath = $request.Url.LocalPath
            if ($requestedPath -eq "/") {
                $requestedPath = "/capture.html"
            }
            
            $filePath = Join-Path $path $requestedPath.TrimStart('/')
            
            if (Test-Path $filePath -PathType Leaf) {
                $content = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentLength64 = $content.Length
                
                # HEADERS DE SECURITE (Indispensables pour Whisper / SharedArrayBuffer)
                $response.AddHeader("Cross-Origin-Opener-Policy", "same-origin")
                $response.AddHeader("Cross-Origin-Embedder-Policy", "require-corp")
                $response.AddHeader("Access-Control-Allow-Origin", "*")
                
                # Définir le type MIME
                $extension = [System.IO.Path]::GetExtension($filePath)
                switch ($extension) {
                    ".html" { $response.ContentType = "text/html" }
                    ".js" { $response.ContentType = "application/javascript" }
                    ".css" { $response.ContentType = "text/css" }
                    ".json" { $response.ContentType = "application/json" }
                    ".png" { $response.ContentType = "image/png" }
                    ".jpg" { $response.ContentType = "image/jpeg" }
                    ".webm" { $response.ContentType = "video/webm" }
                    ".wasm" { $response.ContentType = "application/wasm" }
                    ".tar.gz" { $response.ContentType = "application/gzip" }
                    ".gz" { $response.ContentType = "application/gzip" }
                    default { $response.ContentType = "application/octet-stream" }
                }
                
                $response.OutputStream.Write($content, 0, $content.Length)
            }
            else {
                $response.StatusCode = 404
                $buffer = [System.Text.Encoding]::UTF8.GetBytes("404 - File Not Found")
                $response.OutputStream.Write($buffer, 0, $buffer.Length)
            }
            
            $response.Close()
        }
    }
    finally {
        $listener.Stop()
    }
}
