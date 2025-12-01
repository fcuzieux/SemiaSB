# SemiaSB - Extension Chrome avec Menu Latéral

## 📋 Description

Extension Chrome avec une interface moderne à menu latéral (sidebar) permettant de naviguer entre différentes fonctionnalités.

## 🎨 Architecture

### Structure Modulaire

L'application utilise une **architecture modulaire** avec :

1. **Menu latéral vertical** (`sidebar`) avec icônes
2. **Zone de contenu** (`content-area`) qui affiche différentes vues
3. **Système de navigation** qui gère l'affichage des vues

### Fonctionnalités Actuelles

#### 📹 Capture d'Onglet
- Enregistrement audio et vidéo d'un onglet Chrome
- Prévisualisation en temps réel
- Téléchargement automatique du fichier WebM

#### 🎤 Enregistrement Audio (À venir)
- Placeholder pour future fonctionnalité

#### 📝 Notes REC (À venir)
- Placeholder pour future fonctionnalité

#### ⚙️ Paramètres (À venir)
- Placeholder pour future fonctionnalité

## 📁 Structure des Fichiers

```
SemiaSB/
├── manifest.json          # Configuration de l'extension Chrome
├── sidepanel.html         # Interface HTML avec sidebar
├── sidepanel.js           # Logique JavaScript (navigation + fonctionnalités)
├── style.css              # Styles CSS modernes
├── background.js          # Service worker
└── icons/                 # Icônes de l'extension
```

## 🔧 Comment Ajouter une Nouvelle Fonctionnalité

### 1. Ajouter un bouton dans le menu (HTML)

Dans `sidepanel.html`, ajoutez un nouveau bouton dans `.sidebar-menu` :

```html
<button class="menu-item" data-view="ma-fonction" title="Ma Fonction">
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <!-- Votre icône SVG ici -->
  </svg>
</button>
```

### 2. Créer la vue correspondante (HTML)

Dans `sidepanel.html`, dans `.content-area`, ajoutez :

```html
<div id="view-ma-fonction" class="view-container">
  <div class="view-header">
    <h3>🎯 Ma Fonction</h3>
    <p class="view-description">Description de ma fonction</p>
  </div>
  <div class="view-content">
    <!-- Contenu de votre fonctionnalité -->
  </div>
</div>
```

### 3. Ajouter la logique JavaScript

Dans `sidepanel.js`, créez une nouvelle section :

```javascript
// ===== MA NOUVELLE FONCTION =====
function initMaFonction() {
  // Votre code ici
}

// Dans l'initialisation :
initNavigation();
initMaFonction(); // Ajouter l'appel
loadTabs();
```

## 🎨 Personnalisation du Style

Les variables CSS sont définies dans `:root` dans `style.css` :

```css
:root {
    --primary: #6366f1;           /* Couleur principale */
    --primary-hover: #4f46e5;     /* Couleur au survol */
    --primary-light: #eef2ff;     /* Couleur claire */
    --bg-color: #f8f9fa;          /* Fond de l'app */
    --sidebar-bg: #ffffff;        /* Fond de la sidebar */
    /* ... */
}
```

## 🚀 Installation

1. Ouvrez Chrome et allez dans `chrome://extensions/`
2. Activez le "Mode développeur"
3. Cliquez sur "Charger l'extension non empaquetée"
4. Sélectionnez le dossier `SemiaSB`

## 💡 Utilisation

1. Cliquez sur l'icône de l'extension dans Chrome
2. Le panneau latéral s'ouvre
3. Utilisez les icônes du menu pour naviguer entre les fonctionnalités
4. Pour la capture d'onglet :
   - Sélectionnez un onglet
   - Choisissez audio/vidéo
   - Cliquez sur "Démarrer"
   - Cliquez sur "Arrêter" pour sauvegarder

## 📝 Notes Techniques

### Navigation
- Le système de navigation utilise des attributs `data-view` pour identifier les vues
- Les classes `active` sont gérées automatiquement
- Les transitions CSS créent des animations fluides

### Capture d'Onglet
- Utilise l'API `chrome.tabCapture`
- Duplique l'audio pour le playback ET l'enregistrement
- Sauvegarde au format WebM avec codec VP9 + Opus

## 🔮 Prochaines Étapes

- [ ] Implémenter l'enregistrement audio
- [ ] Ajouter un système de notes REC
- [ ] Créer une page de paramètres
- [ ] Ajouter la sauvegarde locale des préférences
- [ ] Implémenter l'export/import de données
