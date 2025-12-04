<#
.SYNOPSIS
    Convertit une vidéo WebM avec son fichier de chapitres JSON en MKV avec chapitres intégrés.

.DESCRIPTION
    Ce script lit un fichier vidéo WebM et son fichier JSON de chapitres associé,
    génère un fichier de métadonnées FFmpeg, puis convertit la vidéo en MKV avec
    les chapitres intégrés pour une navigation facile dans VLC.

.PARAMETER VideoFile
    Chemin vers le fichier vidéo WebM à convertir.

.PARAMETER ChaptersFile
    (Optionnel) Chemin vers le fichier JSON des chapitres. Si non spécifié,
    le script cherchera automatiquement un fichier avec le même nom + "-chapitres.json".

.PARAMETER OutputFile
    (Optionnel) Chemin du fichier MKV de sortie. Par défaut : nom original + "-with-chapters.mkv".

.EXAMPLE
    .\convert-chapters.ps1 -VideoFile "capture-onglet-20251204T125228.webm"
    
.EXAMPLE
    .\convert-chapters.ps1 -VideoFile "ma-video.webm" -ChaptersFile "mes-chapitres.json" -OutputFile "resultat.mkv"
#>

param(
    [Parameter(Mandatory=$true, HelpMessage="Chemin vers le fichier vidéo WebM")]
    [string]$VideoFile,
    
    [Parameter(Mandatory=$false, HelpMessage="Chemin vers le fichier JSON des chapitres")]
    [string]$ChaptersFile = "",
    
    [Parameter(Mandatory=$false, HelpMessage="Chemin du fichier MKV de sortie")]
    [string]$OutputFile = ""
)

# Fonction pour afficher des messages colorés
function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

# Vérifier que le fichier vidéo existe
if (-not (Test-Path $VideoFile)) {
    Write-ColorOutput "❌ Erreur : Le fichier vidéo '$VideoFile' n'existe pas." "Red"
    exit 1
}

# Déterminer le fichier de chapitres
if ($ChaptersFile -eq "") {
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($VideoFile)
    $directory = [System.IO.Path]::GetDirectoryName($VideoFile)
    if ($directory -eq "") { $directory = "." }
    $ChaptersFile = Join-Path $directory "$baseName-chapitres.json"
}

# Vérifier que le fichier de chapitres existe
if (-not (Test-Path $ChaptersFile)) {
    Write-ColorOutput "⚠️  Attention : Aucun fichier de chapitres trouvé à '$ChaptersFile'" "Yellow"
    Write-ColorOutput "   La vidéo sera convertie en MKV sans chapitres." "Yellow"
    $hasChapters = $false
} else {
    $hasChapters = $true
    Write-ColorOutput "✅ Fichier de chapitres trouvé : $ChaptersFile" "Green"
}

# Déterminer le fichier de sortie
if ($OutputFile -eq "") {
    $baseName = [System.IO.Path]::GetFileNameWithoutExtension($VideoFile)
    $directory = [System.IO.Path]::GetDirectoryName($VideoFile)
    if ($directory -eq "") { $directory = "." }
    $OutputFile = Join-Path $directory "$baseName-with-chapters.mkv"
}

Write-ColorOutput "`n🎬 Conversion de vidéo avec chapitres" "Cyan"
Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Cyan"
Write-ColorOutput "📹 Vidéo source  : $VideoFile" "White"
if ($hasChapters) {
    Write-ColorOutput "📑 Chapitres     : $ChaptersFile" "White"
}
Write-ColorOutput "💾 Fichier sortie: $OutputFile" "White"
Write-ColorOutput ""

# Vérifier que FFmpeg est installé
try {
    $ffmpegVersion = & ffmpeg -version 2>&1 | Select-Object -First 1
    Write-ColorOutput "✅ FFmpeg détecté : $ffmpegVersion" "Green"
} catch {
    Write-ColorOutput "❌ Erreur : FFmpeg n'est pas installé ou n'est pas dans le PATH." "Red"
    Write-ColorOutput "   Installez FFmpeg avec : winget install ffmpeg" "Yellow"
    exit 1
}

# Traiter les chapitres si présents
$metadataFile = ""
if ($hasChapters) {
    try {
        # Lire le fichier JSON
        $chaptersData = Get-Content $ChaptersFile -Raw | ConvertFrom-Json
        
        if ($chaptersData.chapters.Count -eq 0) {
            Write-ColorOutput "⚠️  Le fichier de chapitres est vide, conversion sans chapitres." "Yellow"
            $hasChapters = $false
        } else {
            Write-ColorOutput "`n📋 Chapitres détectés : $($chaptersData.chapters.Count)" "Cyan"
            
            # Créer le fichier de métadonnées FFmpeg
            $metadataFile = [System.IO.Path]::GetTempFileName()
            $metadata = ";FFMETADATA1`n"
            
            # Ajouter chaque chapitre
            for ($i = 0; $i -lt $chaptersData.chapters.Count; $i++) {
                $chapter = $chaptersData.chapters[$i]
                $startMs = [int]($chapter.timestamp * 1000)
                
                # Calculer la fin du chapitre (début du suivant ou fin de la vidéo)
                if ($i -lt $chaptersData.chapters.Count - 1) {
                    $endMs = [int]($chaptersData.chapters[$i + 1].timestamp * 1000)
                } else {
                    # Pour le dernier chapitre, on met une durée très longue
                    $endMs = $startMs + 3600000  # +1 heure
                }
                
                $metadata += "[CHAPTER]`n"
                $metadata += "TIMEBASE=1/1000`n"
                $metadata += "START=$startMs`n"
                $metadata += "END=$endMs`n"
                $metadata += "title=$($chapter.name)`n`n"
                
                Write-ColorOutput "   $($chapter.number). $($chapter.name) @ $($chapter.formattedTime)" "Gray"
            }
            
            # Écrire le fichier de métadonnées
            $metadata | Out-File -FilePath $metadataFile -Encoding UTF8
            Write-ColorOutput "`n✅ Fichier de métadonnées créé" "Green"
        }
    } catch {
        Write-ColorOutput "❌ Erreur lors de la lecture du fichier JSON : $_" "Red"
        $hasChapters = $false
    }
}

# Construire la commande FFmpeg
Write-ColorOutput "`n🔄 Conversion en cours..." "Cyan"

if ($hasChapters -and $metadataFile -ne "") {
    # Conversion avec chapitres
    $ffmpegArgs = @(
        "-i", $VideoFile,
        "-i", $metadataFile,
        "-map_metadata", "1",
        "-map_chapters", "1",
        "-codec", "copy",
        "-y",
        $OutputFile
    )
} else {
    # Conversion simple sans chapitres
    $ffmpegArgs = @(
        "-i", $VideoFile,
        "-codec", "copy",
        "-y",
        $OutputFile
    )
}

try {
    # Exécuter FFmpeg
    $process = Start-Process -FilePath "ffmpeg" -ArgumentList $ffmpegArgs -NoNewWindow -Wait -PassThru
    
    if ($process.ExitCode -eq 0) {
        Write-ColorOutput "`n✅ Conversion réussie !" "Green"
        Write-ColorOutput "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" "Green"
        
        # Afficher les informations du fichier
        $fileInfo = Get-Item $OutputFile
        $fileSizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
        
        Write-ColorOutput "`n📊 Informations du fichier :" "Cyan"
        Write-ColorOutput "   📁 Fichier : $OutputFile" "White"
        Write-ColorOutput "   📏 Taille  : $fileSizeMB MB" "White"
        if ($hasChapters) {
            Write-ColorOutput "   📑 Chapitres : $($chaptersData.chapters.Count) intégrés" "White"
        }
        
        Write-ColorOutput "`n🎉 Vous pouvez maintenant ouvrir le fichier dans VLC !" "Green"
        Write-ColorOutput "   Les chapitres seront accessibles via : Lecture > Chapitre" "Gray"
        
    } else {
        Write-ColorOutput "`n❌ Erreur lors de la conversion (code: $($process.ExitCode))" "Red"
        exit 1
    }
    
} catch {
    Write-ColorOutput "`n❌ Erreur lors de l'exécution de FFmpeg : $_" "Red"
    exit 1
} finally {
    # Nettoyer le fichier temporaire
    if ($metadataFile -ne "" -and (Test-Path $metadataFile)) {
        Remove-Item $metadataFile -Force
    }
}

Write-ColorOutput ""
