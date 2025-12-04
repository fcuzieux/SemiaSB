# 📑 Chapitrage Vidéo - Guide Complet

## 🎯 Vue d'ensemble

Cette fonctionnalité permet d'ajouter des **chapitres** à vos enregistrements vidéo pour faciliter la navigation dans VLC et autres lecteurs vidéo.

## 🚀 Démarrage rapide

### 1️⃣ Installer FFmpeg (une seule fois)

**Double-cliquez sur** : `Installer-FFmpeg.bat`

Le script installera automatiquement FFmpeg sur votre machine.

### 2️⃣ Enregistrer une vidéo avec chapitres

1. Ouvrez SemiaSB
2. Allez dans **Video Capture**
3. Cliquez sur **"Démarrer"**
4. Pendant l'enregistrement, cliquez sur **"Ajouter un chapitre"** (🕐)
5. Entrez le nom du chapitre (ex: "Introduction")
6. Cliquez sur **"✓ Valider"**
7. Répétez pour chaque section importante
8. Cliquez sur **"Arrêter"**

### 3️⃣ Convertir la vidéo

**Glissez-déposez** votre fichier `.webm` sur : `Convertir-Video.bat`

### 4️⃣ Regarder dans VLC

Ouvrez le fichier `.mkv` dans VLC :
- **Menu** : Lecture → Chapitre
- **Raccourcis** : `Ctrl + →` (suivant) / `Ctrl + ←` (précédent)

## 📁 Structure des fichiers

Après un enregistrement, vous obtiendrez :

```
📂 Dossier de sauvegarde/
├── 📹 capture-onglet-20251204T125228.webm          # Vidéo originale
├── 📑 capture-onglet-20251204T125228-chapitres.json # Métadonnées
└── 🎬 capture-onglet-20251204T125228-with-chapters.mkv # Après conversion
```

## 🎬 Fonctionnalités

### Interface de chapitrage

- **Bouton "Ajouter un chapitre"** : Marque un point dans la vidéo
- **Formulaire de saisie** : Nommez votre chapitre
- **Liste en temps réel** : Visualisez tous vos chapitres
- **Horodatage automatique** : Format HH:MM:SS

### Raccourcis clavier

- **Entrée** : Valider le chapitre
- **Échap** : Annuler

### Sauvegarde

- **Fichier JSON** : Métadonnées exportées automatiquement
- **Historique local** : Chapitres sauvegardés dans Chrome
- **Conversion MKV** : Chapitres intégrés pour VLC

## 📚 Documentation détaillée

### Installation
- 📖 [README-INSTALLATION-FFMPEG.md](README-INSTALLATION-FFMPEG.md) - Guide d'installation FFmpeg

### Utilisation
- 📖 [README-CHAPITRAGE-VIDEO.md](README-CHAPITRAGE-VIDEO.md) - Guide du chapitrage
- 📖 [README-CONVERSION-CHAPITRES.md](README-CONVERSION-CHAPITRES.md) - Guide de conversion

## 🛠️ Scripts disponibles

### `Installer-FFmpeg.bat`
Script d'installation automatique de FFmpeg.
- ✅ Détection automatique de la méthode
- ✅ Installation via Winget ou Chocolatey
- ✅ Guide d'installation manuelle si besoin

### `Convertir-Video.bat`
Conversion rapide par glisser-déposer.
- ✅ Glissez votre `.webm` sur le script
- ✅ Conversion automatique en `.mkv`
- ✅ Chapitres intégrés

### `convert-chapters.ps1`
Script PowerShell de conversion avancée.
```powershell
.\convert-chapters.ps1 -VideoFile "ma-video.webm"
```

## 🎯 Cas d'usage

### Réunions
```
📑 Introduction et tour de table (00:00:00)
📑 Présentation du projet (00:05:30)
📑 Discussion technique (00:15:45)
📑 Questions/Réponses (00:35:20)
📑 Conclusion (00:45:00)
```

### Tutoriels
```
📑 Installation (00:00:00)
📑 Configuration (00:03:15)
📑 Premier exemple (00:08:30)
📑 Fonctionnalités avancées (00:15:00)
```

### Démonstrations
```
📑 Vue d'ensemble (00:00:00)
📑 Fonctionnalité A (00:02:30)
📑 Fonctionnalité B (00:07:45)
📑 Cas d'erreur (00:12:00)
```

## 💡 Conseils

### Nommage des chapitres
- ✅ Utilisez des noms courts et descriptifs
- ✅ Soyez cohérent dans votre nomenclature
- ✅ Évitez les caractères spéciaux

### Fréquence des chapitres
- 📌 Toutes les 2-5 minutes pour les vidéos longues
- 📌 À chaque changement de sujet
- 📌 Aux moments clés de la présentation

### Organisation
- 📁 Gardez les fichiers `.webm` et `.json` ensemble
- 📁 Archivez les fichiers `.mkv` après vérification
- 📁 Utilisez des noms de fichiers explicites

## 🔧 Dépannage

### Le bouton "Ajouter un chapitre" ne s'affiche pas
**Solution** : Démarrez l'enregistrement. Les contrôles apparaissent automatiquement.

### Erreur "L'enregistrement n'est pas démarré"
**Solution** : Rechargez l'extension Chrome et redémarrez l'enregistrement.

### Le fichier JSON n'est pas créé
**Vérification** : Avez-vous ajouté au moins un chapitre avant d'arrêter ?

### La conversion échoue
**Solutions** :
1. Vérifiez que FFmpeg est installé : `ffmpeg -version`
2. Vérifiez que le fichier JSON existe
3. Consultez les messages d'erreur du script

## 📊 Format du fichier JSON

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
      "name": "Démonstration",
      "timestamp": 125.678,
      "formattedTime": "00:02:05"
    }
  ]
}
```

## 🚀 Workflow complet

```
1. Installer FFmpeg (une fois)
   ↓
2. Démarrer l'enregistrement
   ↓
3. Ajouter des chapitres
   ↓
4. Arrêter l'enregistrement
   ↓
5. Convertir en MKV
   ↓
6. Regarder dans VLC
```

## 🎉 Fonctionnalités futures

- [ ] Édition de chapitres existants
- [ ] Suppression de chapitres
- [ ] Export au format SRT
- [ ] Miniatures par chapitre
- [ ] Détection automatique de scènes
- [ ] Intégration WebM native

## 📞 Support

Pour toute question ou problème :
1. Consultez la documentation appropriée
2. Vérifiez les messages d'erreur
3. Testez avec une vidéo courte d'abord

---

**Version** : 1.0  
**Créé le** : 2025-12-04  
**Auteur** : Antigravity AI Assistant  
**Licence** : Open Source
