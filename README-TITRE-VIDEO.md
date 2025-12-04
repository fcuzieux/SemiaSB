# 📝 Ajout du champ "Titre de la vidéo"

## ✅ Modifications effectuées

### 1. JavaScript (sidepanel.js) - ✅ TERMINÉ

Le code JavaScript a été modifié pour utiliser le titre saisi par l'utilisateur :

```javascript
// Récupérer le titre de la vidéo et nettoyer les caractères invalides
const videoTitleInput = document.getElementById('videoTitle');
let videoTitle = videoTitleInput?.value.trim() || 'Capture-video';
// Remplacer les caractères invalides pour un nom de fichier
videoTitle = videoTitle.replace(/[<>:"/\\|?*]/g, '-');

const filename = `${videoTitle}-${timestamp}.webm`;
```

**Fonctionnalités** :
- ✅ Récupère le titre depuis l'input `videoTitle`
- ✅ Utilise "Capture-video" par défaut si le champ est vide
- ✅ Nettoie les caractères invalides (`< > : " / \ | ? *`)
- ✅ Format du fichier : `Titre-20251204T132112.webm`

### 2. HTML (sidepanel.html) - ⚠️ À AJOUTER MANUELLEMENT

**Ajoutez ce code dans `sidepanel.html` :**

**Position** : Après la ligne 67 (`</label>`) et avant `<div class="row">`

```html
          <label style="display: block; margin-top: 15px;">
            <i data-lucide="file-video" style="width: 18px; height: 18px;"></i>
            Titre de la vidéo
          </label>
          <input type="text" id="videoTitle" value="Capture-video" 
            placeholder="Nom de la vidéo..."
            style="width: 100%; padding: 8px; margin-top: 5px; margin-bottom: 10px; border: 1px solid var(--border-color); border-radius: var(--radius);">
```

## 📋 Instructions d'installation

### Étape 1 : Modifier le HTML

1. Ouvrez `h:\Developments\SemiaSB\sidepanel.html`
2. Trouvez la ligne 67 qui contient `</label>` (après "Live transcription")
3. Ajoutez le code HTML ci-dessus juste après cette ligne
4. Sauvegardez le fichier

### Étape 2 : Recharger l'extension

1. Allez dans `chrome://extensions/`
2. Trouvez votre extension SemiaSB
3. Cliquez sur le bouton de rechargement ⟳

### Étape 3 : Tester

1. Ouvrez le sidepanel
2. Allez dans "Video Capture"
3. Vous devriez voir le nouveau champ "Titre de la vidéo"
4. Modifiez le titre (ex: "Ma-reunion")
5. Enregistrez une vidéo
6. Le fichier sera nommé : `Ma-reunion-20251204T132112.webm`

## 🎯 Exemples d'utilisation

### Exemple 1 : Réunion
```
Titre : "Reunion-equipe"
Fichier : Reunion-equipe-20251204T132112.webm
```

### Exemple 2 : Tutoriel
```
Titre : "Tuto-installation"
Fichier : Tuto-installation-20251204T132112.webm
```

### Exemple 3 : Démonstration
```
Titre : "Demo-produit-v2"
Fichier : Demo-produit-v2-20251204T132112.webm
```

## 🔧 Caractères invalides

Les caractères suivants sont automatiquement remplacés par `-` :
- `<` `>` `:` `"` `/` `\` `|` `?` `*`

**Exemple** :
```
Titre saisi : "Réunion: 04/12/2024"
Fichier créé : "Réunion- 04-12-2024-20251204T132112.webm"
```

## ✨ Fonctionnalités

- ✅ **Valeur par défaut** : "Capture-video"
- ✅ **Nettoyage automatique** des caractères invalides
- ✅ **Timestamp ajouté** automatiquement
- ✅ **Icône** file-video pour une meilleure UX
- ✅ **Placeholder** pour guider l'utilisateur

## 📊 Structure du fichier final

```
Titre-saisi-20251204T132112.webm
Titre-saisi-20251204T132112-chapitres.json (si des chapitres existent)
```

---

**Créé le** : 2025-12-04  
**Version** : 1.0
