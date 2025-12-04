# 📑 Chapitrage Vidéo - Documentation

## 🎯 Vue d'ensemble

La fonctionnalité de **chapitrage vidéo** permet d'ajouter des marqueurs temporels (chapitres) pendant l'enregistrement d'une vidéo. Ces chapitres facilitent la navigation dans les vidéos longues et servent de points de repère pour identifier les différentes sections.

## 🎬 Comment utiliser

### 1. Démarrer l'enregistrement
- Cliquez sur **"Démarrer"** pour commencer la capture vidéo
- Les contrôles de chapitrage apparaissent automatiquement sous la vidéo

### 2. Ajouter un chapitre
1. Pendant l'enregistrement, cliquez sur **"Ajouter un chapitre"** (icône 🕐)
2. Un formulaire de saisie apparaît
3. Entrez le nom du chapitre (ex: "Introduction", "Démonstration", "Conclusion")
4. Cliquez sur **"✓ Valider"** ou appuyez sur **Entrée**
5. Le chapitre est ajouté avec l'horodatage actuel

### 3. Raccourcis clavier
- **Entrée** : Valider le nom du chapitre
- **Échap** : Annuler l'ajout du chapitre

### 4. Visualiser les chapitres
- La liste des chapitres s'affiche en temps réel
- Chaque chapitre montre :
  - Son numéro (Chapitre 1, 2, 3...)
  - Son nom personnalisé
  - Son horodatage (HH:MM:SS)

### 5. Arrêter l'enregistrement
- Cliquez sur **"Arrêter"**
- La vidéo est sauvegardée avec :
  - Le fichier vidéo `.webm`
  - Un fichier JSON `-chapitres.json` contenant les métadonnées

## 📁 Fichiers générés

### Fichier vidéo
```
capture-onglet-20251204T004245.webm
```

### Fichier de chapitres (si des chapitres ont été ajoutés)
```
capture-onglet-20251204T004245-chapitres.json
```

**Contenu du fichier JSON :**
```json
{
  "videoFilename": "capture-onglet-20251204T004245.webm",
  "recordingDate": "2025-12-04T00:42:45.123Z",
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

## 🔧 Fonctionnalités techniques

### Variables globales
```javascript
let chapters = [];              // Tableau des chapitres
let chapterCounter = 0;         // Compteur auto-incrémenté
let recordingStartTime = null;  // Timestamp de début
```

### Structure d'un chapitre
```javascript
{
  number: 1,                    // Numéro du chapitre
  name: "Introduction",         // Nom personnalisé
  timestamp: 15.234,            // Temps en secondes depuis le début
  formattedTime: "00:00:15"     // Temps formaté HH:MM:SS
}
```

### Fonctions principales

#### `addChapter(name)`
Ajoute un chapitre à l'horodatage actuel
```javascript
addChapter("Introduction");
```

#### `formatTime(seconds)`
Convertit les secondes en format HH:MM:SS
```javascript
formatTime(125.5) // => "00:02:05"
```

#### `updateChaptersList()`
Met à jour l'affichage de la liste des chapitres dans l'interface

#### `resetChapters()`
Réinitialise tous les chapitres (appelé au démarrage d'un nouvel enregistrement)

## 🎨 Interface utilisateur

### Bouton d'ajout
```html
<button id="addChapterBtn">
  <i data-lucide="file-clock"></i>
  Ajouter un chapitre
</button>
```

### Formulaire de saisie
- Champ de texte pour le nom du chapitre
- Bouton **✓ Valider** (vert)
- Bouton **✗ Annuler** (rouge)

### Liste des chapitres
Affichage en temps réel avec :
- Numéro du chapitre (violet)
- Nom du chapitre
- Horodatage (format HH:MM:SS)

## 💾 Sauvegarde

### Dans l'historique local
Les chapitres sont sauvegardés dans `chrome.storage.local` :
```javascript
{
  id: 1733271765123,
  type: 'video',
  title: 'capture-onglet-20251204T004245.webm',
  date: '2025-12-04T00:42:45.123Z',
  filename: 'SemiaSB/capture-onglet-20251204T004245.webm',
  thumbnail: 'data:image/jpeg;base64,...',
  chapters: [...]  // Tableau des chapitres
}
```

### Fichiers téléchargés
1. **Vidéo principale** : Téléchargée avec dialogue "Enregistrer sous"
2. **Fichier chapitres** : Téléchargé automatiquement (sans dialogue)

## 🚀 Cas d'usage

### Réunions
```
Chapitre 1: Introduction et tour de table (00:00:00)
Chapitre 2: Présentation du projet (00:05:30)
Chapitre 3: Discussion technique (00:15:45)
Chapitre 4: Questions/Réponses (00:35:20)
Chapitre 5: Conclusion (00:45:00)
```

### Tutoriels
```
Chapitre 1: Installation (00:00:00)
Chapitre 2: Configuration (00:03:15)
Chapitre 3: Premier exemple (00:08:30)
Chapitre 4: Fonctionnalités avancées (00:15:00)
```

### Démonstrations
```
Chapitre 1: Vue d'ensemble (00:00:00)
Chapitre 2: Fonctionnalité A (00:02:30)
Chapitre 3: Fonctionnalité B (00:07:45)
Chapitre 4: Cas d'erreur (00:12:00)
```

## 📊 Statistiques

Lors de la sauvegarde, le message de statut affiche :
```
✅ Fichier sauvegardé : capture-onglet-20251204T004245.webm (3 chapitres)
```

## 🔄 Workflow complet

```
1. Utilisateur clique "Démarrer"
   ↓
2. recordingStartTime = Date.now()
   ↓
3. Contrôles de chapitrage affichés
   ↓
4. Utilisateur clique "Ajouter un chapitre"
   ↓
5. Formulaire de saisie affiché
   ↓
6. Utilisateur entre "Introduction"
   ↓
7. Chapitre créé avec timestamp actuel
   ↓
8. Chapitre ajouté à la liste
   ↓
9. Répéter 4-8 pour chaque chapitre
   ↓
10. Utilisateur clique "Arrêter"
    ↓
11. Vidéo .webm sauvegardée
    ↓
12. Fichier -chapitres.json créé et téléchargé
    ↓
13. Chapitres sauvegardés dans l'historique
    ↓
14. Contrôles de chapitrage masqués
```

## 🎯 Améliorations futures possibles

1. **Intégration WebM native** : Écrire les chapitres directement dans le fichier WebM (format Matroska)
2. **Édition de chapitres** : Modifier ou supprimer des chapitres existants
3. **Export SRT** : Générer un fichier de sous-titres avec les chapitres
4. **Miniatures par chapitre** : Capturer une image à chaque chapitre
5. **Import/Export** : Importer des chapitres depuis un fichier JSON
6. **Chapitres automatiques** : Détection automatique de scènes
7. **Navigation vidéo** : Lecteur vidéo intégré avec navigation par chapitres

## 🐛 Gestion des erreurs

- Si aucun nom n'est saisi, le chapitre prend le nom par défaut : `"Chapitre n°X"`
- Les chapitres sont réinitialisés à chaque nouvel enregistrement
- Les contrôles sont masqués automatiquement à l'arrêt
- Le fichier JSON n'est créé que si au moins un chapitre existe

---

**Créé le** : 2025-12-04  
**Auteur** : Antigravity AI Assistant  
**Version** : 1.0
