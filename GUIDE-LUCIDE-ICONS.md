# 🎨 Guide Lucide Icons - SemiaSB

## ✅ Intégration Réussie !

Votre extension utilise maintenant **Lucide Icons**, une bibliothèque d'icônes modernes et élégantes.

## 📦 Ce qui a été fait

### 1. Ajout du CDN Lucide
Dans le `<head>` de `sidepanel.html` :
```html
<script src="https://unpkg.com/lucide@latest"></script>
```

### 2. Remplacement des SVG
Les icônes SVG inline ont été remplacées par des éléments `<i>` avec l'attribut `data-lucide` :

```html
<!-- Avant (SVG inline) -->
<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24">
  <circle cx="12" cy="12" r="10"></circle>
</svg>

<!-- Après (Lucide) -->
<i data-lucide="video"></i>
```

### 3. Initialisation
À la fin du `<body>` :
```html
<script>
  lucide.createIcons();
</script>
```

## 🎯 Icônes Actuelles

| Fonction | Icône Lucide | Nom |
|----------|--------------|-----|
| Capture d'onglet | `video` | 📹 Caméra vidéo |
| Enregistrement audio | `mic` | 🎤 Microphone |
| Notes REC | `file-text` | 📝 Document texte |
| Paramètres | `settings` | ⚙️ Engrenage |

## 🔍 Catalogue Lucide Icons

Voici les icônes les plus utiles pour votre extension :

### 📹 Vidéo & Enregistrement
- `video` - Caméra vidéo
- `video-off` - Vidéo désactivée
- `camera` - Appareil photo
- `film` - Pellicule
- `play-circle` - Lecture
- `pause-circle` - Pause
- `stop-circle` - Stop
- `record` - Enregistrement (point rouge)

### 🎤 Audio
- `mic` - Microphone
- `mic-off` - Micro coupé
- `volume-2` - Volume haut
- `volume-x` - Volume muet
- `headphones` - Casque audio
- `speaker` - Haut-parleur

### 📝 Documents & Notes
- `file-text` - Document texte
- `file` - Fichier
- `folder` - Dossier
- `edit` - Éditer
- `pen-tool` - Stylo
- `clipboard` - Presse-papier
- `sticky-note` - Note adhésive

### ⚙️ Interface & Navigation
- `settings` - Paramètres
- `menu` - Menu hamburger
- `more-vertical` - Plus (vertical)
- `more-horizontal` - Plus (horizontal)
- `x` - Fermer
- `check` - Valider
- `chevron-right` - Flèche droite
- `chevron-left` - Flèche gauche

### 📊 Statut & Actions
- `download` - Télécharger
- `upload` - Uploader
- `save` - Sauvegarder
- `trash-2` - Supprimer
- `refresh-cw` - Rafraîchir
- `loader` - Chargement
- `alert-circle` - Alerte
- `check-circle` - Succès
- `x-circle` - Erreur

### 🕐 Temps
- `clock` - Horloge
- `calendar` - Calendrier
- `timer` - Minuteur
- `stopwatch` - Chronomètre

### 👤 Utilisateur
- `user` - Utilisateur
- `users` - Utilisateurs
- `user-plus` - Ajouter utilisateur
- `user-check` - Utilisateur validé

## 🎨 Comment Changer une Icône

### Méthode Simple
1. Ouvrez `sidepanel.html`
2. Trouvez le bouton concerné
3. Changez la valeur de `data-lucide`

**Exemple :** Changer l'icône de capture d'onglet
```html
<!-- Avant -->
<button class="menu-item" data-view="tab-capture">
  <i data-lucide="video"></i>
</button>

<!-- Après (utiliser "camera" au lieu de "video") -->
<button class="menu-item" data-view="tab-capture">
  <i data-lucide="camera"></i>
</button>
```

## 📚 Catalogue Complet

Pour voir **toutes les icônes disponibles**, visitez :
👉 **https://lucide.dev/icons/**

Vous y trouverez :
- ✅ Plus de 1000 icônes
- ✅ Recherche par nom
- ✅ Prévisualisation en direct
- ✅ Code à copier-coller

## 🔧 Personnalisation Avancée

### Taille des Icônes
Les icônes héritent de la taille définie dans le CSS. Pour changer la taille :

**Dans `style.css`** :
```css
.menu-item svg {
    width: 24px;   /* Changer cette valeur */
    height: 24px;  /* Changer cette valeur */
}
```

### Couleur des Icônes
Les icônes héritent de la couleur du texte (`color`). Elles changent automatiquement avec les états :
- Normal : `var(--text-secondary)`
- Hover : `var(--primary)`
- Active : `white`

### Épaisseur du Trait
Pour changer l'épaisseur du trait des icônes :

**Dans `sidepanel.html`**, après `lucide.createIcons()` :
```html
<script>
  lucide.createIcons({
    strokeWidth: 2,  // Valeur par défaut
    // strokeWidth: 1.5,  // Plus fin
    // strokeWidth: 3,    // Plus épais
  });
</script>
```

## 🚀 Ajouter une Nouvelle Icône

### Étape 1 : Trouver l'icône
1. Allez sur https://lucide.dev/icons/
2. Cherchez l'icône souhaitée
3. Notez son nom (ex: `heart`, `star`, `bell`)

### Étape 2 : Ajouter dans le HTML
```html
<button class="menu-item" data-view="ma-vue">
  <i data-lucide="heart"></i>  <!-- Remplacez "heart" par le nom -->
</button>
```

### Étape 3 : Aucune autre action nécessaire !
Lucide détecte automatiquement les nouveaux éléments `data-lucide` et les transforme en icônes.

## 💡 Exemples Pratiques

### Bouton avec Icône et Texte
```html
<button id="download-btn">
  <i data-lucide="download"></i>
  Télécharger
</button>
```

### Icône dans un Titre
```html
<h3>
  <i data-lucide="video"></i>
  Capture d'onglet
</h3>
```

### Icône de Statut
```html
<div class="status">
  <i data-lucide="check-circle"></i>
  Enregistrement réussi
</div>
```

### Icône Animée (Chargement)
```html
<i data-lucide="loader" class="spinning"></i>
```

**CSS pour l'animation** :
```css
.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

## 🎯 Icônes Recommandées pour SemiaSB

### Pour la Capture d'Onglet
- `video` ✅ (actuel)
- `camera` - Alternative
- `film` - Style pellicule
- `monitor` - Écran d'ordinateur

### Pour l'Enregistrement Audio
- `mic` ✅ (actuel)
- `radio` - Style radio
- `headphones` - Casque
- `music` - Note de musique

### Pour les Notes
- `file-text` ✅ (actuel)
- `sticky-note` - Post-it
- `clipboard` - Presse-papier
- `edit-3` - Crayon

### Pour les Paramètres
- `settings` ✅ (actuel)
- `sliders` - Curseurs
- `tool` - Clé à molette
- `cog` - Engrenage simple

## 🔄 Rafraîchir les Icônes

Si vous ajoutez des icônes dynamiquement avec JavaScript, appelez :
```javascript
lucide.createIcons();
```

Cela scannera le DOM et créera toutes les nouvelles icônes.

## ⚡ Performance

### Avantages de Lucide
- ✅ Léger (~25 KB gzippé)
- ✅ SVG optimisés
- ✅ Pas de dépendances
- ✅ Compatible avec tous les navigateurs modernes

### Chargement
Le CDN charge la bibliothèque depuis unpkg.com. Pour une utilisation hors ligne, vous pouvez :
1. Télécharger `lucide.min.js`
2. Le placer dans votre dossier
3. Changer le `<script src="lucide.min.js">`

## 🎨 Alternatives à Lucide

Si vous voulez essayer d'autres bibliothèques d'icônes :

### Feather Icons
```html
<script src="https://unpkg.com/feather-icons"></script>
<i data-feather="video"></i>
<script>feather.replace()</script>
```

### Heroicons (via SVG)
```html
<svg class="w-6 h-6" fill="none" stroke="currentColor">
  <path d="..."/>
</svg>
```

### Font Awesome (nécessite compte)
```html
<i class="fas fa-video"></i>
```

## 📝 Résumé

### Ce que vous avez maintenant
- ✅ Lucide Icons intégré via CDN
- ✅ 4 icônes dans le menu latéral
- ✅ Icônes modernes et élégantes
- ✅ Facile à changer et personnaliser

### Pour changer une icône
1. Visitez https://lucide.dev/icons/
2. Trouvez l'icône souhaitée
3. Changez `data-lucide="nom-icone"`
4. Rechargez l'extension

### Pour ajouter une icône
```html
<i data-lucide="nom-icone"></i>
```

---

**🎉 Profitez de vos nouvelles icônes Lucide !**

Pour toute question, consultez la documentation officielle :
👉 https://lucide.dev/guide/
