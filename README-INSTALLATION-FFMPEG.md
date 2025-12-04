# 🎬 Guide d'installation FFmpeg pour SemiaSB

## 🚀 Installation rapide (1 clic)

**Double-cliquez sur** : `Installer-FFmpeg.bat`

Le script détectera automatiquement la meilleure méthode d'installation pour votre système !

## 📋 Que fait le script ?

1. ✅ **Détecte** si FFmpeg est déjà installé
2. ✅ **Choisit** automatiquement la meilleure méthode (Winget ou Chocolatey)
3. ✅ **Installe** FFmpeg sans intervention
4. ✅ **Vérifie** que l'installation fonctionne

## 🎯 Méthodes d'installation supportées

Le script essaie dans cet ordre :

### 1️⃣ Winget (Windows Package Manager)
- ✅ Recommandé pour Windows 10/11
- ✅ Installation officielle Microsoft
- ✅ Mises à jour automatiques

### 2️⃣ Chocolatey
- ✅ Alternative si Winget n'est pas disponible
- ✅ Gestionnaire de paquets populaire
- ✅ Installation simple

### 3️⃣ Installation manuelle
- ✅ Guide pas-à-pas fourni
- ✅ Téléchargement direct depuis le site officiel
- ✅ Instructions détaillées

## 💡 Utilisation après installation

Une fois FFmpeg installé, vous pouvez :

### Convertir une vidéo avec chapitres

**Méthode 1 - Glisser-Déposer** (le plus simple) :
```
Glissez votre fichier .webm sur : Convertir-Video.bat
```

**Méthode 2 - PowerShell** :
```powershell
.\convert-chapters.ps1 -VideoFile "ma-video.webm"
```

## 🔧 Vérifier l'installation

Ouvrez PowerShell ou l'invite de commandes et tapez :
```
ffmpeg -version
```

Si vous voyez la version de FFmpeg, l'installation est réussie ! ✅

## ❓ Problèmes courants

### "FFmpeg n'est pas reconnu..."

**Solution** : Redémarrez votre terminal ou votre ordinateur.

Le PATH Windows doit être rechargé pour que FFmpeg soit accessible.

### L'installation échoue

**Solutions** :
1. Exécutez le script **en tant qu'administrateur** (clic droit → "Exécuter en tant qu'administrateur")
2. Vérifiez votre connexion internet
3. Essayez l'installation manuelle (option 3 dans le script)

### Winget n'est pas trouvé

**Solution** : 
1. Ouvrez le **Microsoft Store**
2. Recherchez **"App Installer"**
3. Installez ou mettez à jour
4. Relancez le script

## 📊 Configuration requise

- **Système** : Windows 10 (1809+) ou Windows 11
- **Espace disque** : ~100 MB
- **Connexion internet** : Requise pour le téléchargement
- **Droits** : Administrateur (pour certaines méthodes)

## 🎓 Workflow complet

1. **Installer FFmpeg** : Double-clic sur `Installer-FFmpeg.bat`
2. **Enregistrer une vidéo** avec SemiaSB
3. **Ajouter des chapitres** pendant l'enregistrement
4. **Convertir** : Glisser-déposer sur `Convertir-Video.bat`
5. **Regarder** dans VLC avec navigation par chapitres ! 🎉

## 📚 Documentation complète

Pour plus de détails sur la conversion, consultez :
- `README-CONVERSION-CHAPITRES.md` - Guide de conversion
- `README-CHAPITRAGE-VIDEO.md` - Guide du chapitrage

## 🆘 Besoin d'aide ?

Si vous rencontrez des problèmes :

1. Vérifiez que vous avez une connexion internet
2. Essayez d'exécuter le script en tant qu'administrateur
3. Consultez les logs affichés par le script
4. Essayez l'installation manuelle (option 3)

---

**Version** : 1.0  
**Dernière mise à jour** : 2025-12-04
