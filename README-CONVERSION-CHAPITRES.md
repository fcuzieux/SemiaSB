# 🎬 Conversion de vidéos avec chapitres

Ce guide explique comment convertir vos vidéos WebM avec chapitres en fichiers MKV compatibles VLC.

## 📋 Prérequis

### Installation de FFmpeg

**FFmpeg** doit être installé sur votre machine. Voici plusieurs méthodes :

#### Méthode 1 : Avec winget (recommandé)
```powershell
winget install --id=Gyan.FFmpeg -e
```

#### Méthode 2 : Avec Chocolatey
```powershell
choco install ffmpeg
```

#### Méthode 3 : Installation manuelle
1. Télécharger depuis https://ffmpeg.org/download.html
2. Extraire l'archive
3. Ajouter le dossier `bin` au PATH Windows

### Vérifier l'installation
```powershell
ffmpeg -version
```

Si la commande affiche la version de FFmpeg, l'installation est réussie ! ✅

## 🚀 Utilisation du script

### Utilisation basique

Le script détecte automatiquement le fichier de chapitres JSON associé :

```powershell
.\convert-chapters.ps1 -VideoFile "capture-onglet-20251204T125228.webm"
```

**Résultat** :
- Fichier créé : `capture-onglet-20251204T125228-with-chapters.mkv`
- Chapitres intégrés automatiquement

### Utilisation avancée

#### Spécifier le fichier de chapitres
```powershell
.\convert-chapters.ps1 -VideoFile "ma-video.webm" -ChaptersFile "mes-chapitres.json"
```

#### Spécifier le nom du fichier de sortie
```powershell
.\convert-chapters.ps1 -VideoFile "ma-video.webm" -OutputFile "resultat-final.mkv"
```

#### Tout spécifier
```powershell
.\convert-chapters.ps1 `
    -VideoFile "ma-video.webm" `
    -ChaptersFile "mes-chapitres.json" `
    -OutputFile "video-avec-chapitres.mkv"
```

## 📁 Structure des fichiers

Après un enregistrement avec SemiaSB, vous aurez :

```
📂 Dossier de sauvegarde/
├── 📹 capture-onglet-20251204T125228.webm          # Vidéo originale
├── 📑 capture-onglet-20251204T125228-chapitres.json # Métadonnées des chapitres
└── 🎬 capture-onglet-20251204T125228-with-chapters.mkv # Vidéo convertie (après script)
```

## 🎯 Visualiser les chapitres dans VLC

1. **Ouvrir le fichier MKV** dans VLC
2. **Menu** : `Lecture` → `Chapitre`
3. **Sélectionner** le chapitre désiré

Ou utilisez les **raccourcis clavier** :
- **Chapitre suivant** : `Ctrl + →`
- **Chapitre précédent** : `Ctrl + ←`

## 📊 Exemple de sortie du script

```
🎬 Conversion de vidéo avec chapitres
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📹 Vidéo source  : capture-onglet-20251204T125228.webm
📑 Chapitres     : capture-onglet-20251204T125228-chapitres.json
💾 Fichier sortie: capture-onglet-20251204T125228-with-chapters.mkv

✅ FFmpeg détecté : ffmpeg version 2024.11.18

📋 Chapitres détectés : 3
   1. Introduction @ 00:00:15
   2. Démonstration @ 00:02:05
   3. Conclusion @ 00:04:05

✅ Fichier de métadonnées créé

🔄 Conversion en cours...

✅ Conversion réussie !
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Informations du fichier :
   📁 Fichier : capture-onglet-20251204T125228-with-chapters.mkv
   📏 Taille  : 45.32 MB
   📑 Chapitres : 3 intégrés

🎉 Vous pouvez maintenant ouvrir le fichier dans VLC !
   Les chapitres seront accessibles via : Lecture > Chapitre
```

## 🔧 Dépannage

### Erreur : "FFmpeg n'est pas installé"
**Solution** : Installer FFmpeg (voir section Prérequis ci-dessus)

### Erreur : "Le fichier de chapitres n'existe pas"
**Vérifications** :
1. Le fichier JSON existe-t-il ?
2. Le nom correspond-il au format `nom-video-chapitres.json` ?
3. Spécifiez manuellement avec `-ChaptersFile`

### Erreur : "Impossible d'exécuter le script"
**Solution** : Autoriser l'exécution de scripts PowerShell :
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### La conversion est lente
**Normal** : FFmpeg copie les flux sans réencodage, c'est rapide.  
Si c'est lent, vérifiez l'espace disque disponible.

## 💡 Conseils

### Conversion par lot
Pour convertir plusieurs vidéos :

```powershell
Get-ChildItem *.webm | ForEach-Object {
    .\convert-chapters.ps1 -VideoFile $_.FullName
}
```

### Garder l'original
Le script ne supprime jamais le fichier WebM original. Vous pouvez le supprimer manuellement après vérification.

### Qualité
La conversion utilise `-codec copy`, donc **aucune perte de qualité** ! Le fichier est juste repackagé dans un conteneur MKV.

## 📚 Format du fichier JSON

Le fichier de chapitres généré par SemiaSB a cette structure :

```json
{
  "videoFilename": "capture-onglet-20251204T125228.webm",
  "recordingDate": "2025-12-04T12:52:28.123Z",
  "chapters": [
    {
      "number": 1,
      "name": "Introduction",
      "timestamp": 15.234,
      "formattedTime": "00:00:15"
    },
    {
      "number": 2,
      "name": "Démonstration principale",
      "timestamp": 125.678,
      "formattedTime": "00:02:05"
    },
    {
      "number": 3,
      "name": "Conclusion",
      "timestamp": 245.912,
      "formattedTime": "00:04:05"
    }
  ]
}
```

## 🎓 Workflow complet

1. **Enregistrer** une vidéo avec SemiaSB
2. **Ajouter des chapitres** pendant l'enregistrement
3. **Arrêter** l'enregistrement
4. **Exécuter** le script de conversion :
   ```powershell
   .\convert-chapters.ps1 -VideoFile "ma-video.webm"
   ```
5. **Ouvrir** le fichier MKV dans VLC
6. **Naviguer** entre les chapitres avec le menu ou les raccourcis

## 🌟 Fonctionnalités

✅ **Détection automatique** du fichier JSON  
✅ **Conversion sans perte** de qualité  
✅ **Messages colorés** et informatifs  
✅ **Gestion des erreurs** complète  
✅ **Compatible** avec tous les lecteurs supportant MKV  
✅ **Rapide** : copie des flux sans réencodage  
✅ **100% local** : aucune connexion internet requise  

---

**Créé le** : 2025-12-04  
**Auteur** : Antigravity AI Assistant  
**Version** : 1.0
