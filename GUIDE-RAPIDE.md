# 🚀 Guide de Démarrage Rapide - SemiaSB

## 📋 Résumé de la Restructuration

Votre extension **SemiaSB** a été transformée d'une simple page de capture d'onglet en une **application modulaire avec menu latéral à icônes**, similaire à l'interface REC Notes que vous avez fournie.

## ✨ Nouveautés

### Interface avec Sidebar
- ✅ Menu latéral vertical avec 4 icônes
- ✅ Navigation fluide entre différentes vues
- ✅ Design moderne avec animations
- ✅ Architecture modulaire et extensible

### Fonction Capture d'Onglet
- ✅ Maintenant une sous-fonction modulaire
- ✅ Accessible via l'icône 📹 dans le menu
- ✅ Fonctionne exactement comme avant
- ✅ Isolée dans sa propre vue

## 🎯 Comment Utiliser

### 1. Recharger l'Extension

```
1. Ouvrez chrome://extensions/
2. Trouvez "SemiaSB"
3. Cliquez sur l'icône de rechargement 🔄
```

### 2. Ouvrir le Side Panel

```
1. Cliquez sur l'icône SemiaSB dans Chrome
2. Le panneau latéral s'ouvre
3. Vous voyez le menu avec 4 icônes
```

### 3. Naviguer entre les Vues

```
📹 Capture d'onglet    → Fonctionnelle
🎤 Enregistrement audio → À venir
📝 Notes REC           → À venir
⚙️ Paramètres          → À venir
```

## 🛠️ Ajouter une Nouvelle Fonction (3 Étapes)

### Étape 1 : HTML - Ajouter le bouton du menu

Ouvrez `sidepanel.html` et ajoutez dans `.sidebar-menu` :

```html
<button class="menu-item" data-view="timer" title="Minuteur">
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="13" r="8"></circle>
    <path d="M12 9v4l2 2"></path>
    <path d="M16.51 17.35l-.35 3.83a2 2 0 0 1-2 1.82H9.83a2 2 0 0 1-2-1.82l-.35-3.83m.01-10.7l.35-3.83A2 2 0 0 1 9.83 1h4.35a2 2 0 0 1 2 1.82l.35 3.83"></path>
  </svg>
</button>
```

### Étape 2 : HTML - Créer la vue

Dans `.content-area`, ajoutez :

```html
<div id="view-timer" class="view-container">
  <div class="view-header">
    <h3>⏱️ Minuteur</h3>
    <p class="view-description">Gérez votre temps d'enregistrement</p>
  </div>
  <div class="view-content">
    <div id="timer-display">00:00:00</div>
    <button id="start-timer">Démarrer</button>
    <button id="stop-timer">Arrêter</button>
  </div>
</div>
```

### Étape 3 : JavaScript - Ajouter la logique

Dans `sidepanel.js`, ajoutez avant l'initialisation :

```javascript
// ===== FONCTION MINUTEUR =====
function initTimer() {
  const display = document.getElementById('timer-display');
  const startBtn = document.getElementById('start-timer');
  const stopBtn = document.getElementById('stop-timer');
  
  let seconds = 0;
  let interval = null;
  
  function updateDisplay() {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    display.textContent = 
      `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  
  startBtn?.addEventListener('click', () => {
    if (interval) return;
    interval = setInterval(() => {
      seconds++;
      updateDisplay();
    }, 1000);
  });
  
  stopBtn?.addEventListener('click', () => {
    clearInterval(interval);
    interval = null;
    seconds = 0;
    updateDisplay();
  });
}

// Dans la section INITIALISATION
initNavigation();
initTimer();  // <-- Ajouter cet appel
loadTabs();
```

## 📁 Structure des Fichiers

```
SemiaSB/
├── sidepanel.html          ← Interface (menu + vues)
├── sidepanel.js            ← Logique (navigation + fonctions)
├── style.css               ← Styles (sidebar + vues)
├── manifest.json           ← Configuration Chrome
├── background.js           ← Service worker
├── README.md               ← Documentation complète
├── RESTRUCTURATION.md      ← Ce qui a été fait
├── example-new-function.js ← Exemple de fonction
└── icons/                  ← Icônes de l'extension
```

## 🎨 Personnalisation des Couleurs

Dans `style.css`, modifiez les variables CSS :

```css
:root {
    --primary: #6366f1;        /* Couleur principale */
    --primary-hover: #4f46e5;  /* Au survol */
    --primary-light: #eef2ff;  /* Fond clair */
    /* Changez ces valeurs pour personnaliser */
}
```

### Exemples de palettes :

**Bleu :**
```css
--primary: #3b82f6;
--primary-hover: #2563eb;
--primary-light: #dbeafe;
```

**Vert :**
```css
--primary: #10b981;
--primary-hover: #059669;
--primary-light: #d1fae5;
```

**Rose :**
```css
--primary: #ec4899;
--primary-hover: #db2777;
--primary-light: #fce7f3;
```

## 🔍 Débogage

### La navigation ne fonctionne pas ?
1. Vérifiez que `initNavigation()` est appelé
2. Vérifiez les attributs `data-view` des boutons
3. Vérifiez les IDs des vues (`view-xxx`)

### Une fonction ne s'initialise pas ?
1. Vérifiez que la fonction est appelée dans l'initialisation
2. Vérifiez que les IDs des éléments DOM existent
3. Ouvrez la console (F12) pour voir les erreurs

### Le style ne s'applique pas ?
1. Rechargez l'extension
2. Videz le cache du navigateur
3. Vérifiez qu'il n'y a pas d'erreurs CSS

## 📚 Documentation Complète

- **README.md** : Documentation détaillée de l'architecture
- **RESTRUCTURATION.md** : Récapitulatif de la restructuration
- **example-new-function.js** : Exemple complet de fonction

## 💡 Conseils

### Pour une nouvelle fonction simple :
1. Copiez le code de `example-new-function.js`
2. Adaptez-le à vos besoins
3. Suivez les 3 étapes ci-dessus

### Pour une fonction complexe :
1. Créez un fichier JS séparé (ex: `timer.js`)
2. Incluez-le dans `sidepanel.html` : `<script src="timer.js"></script>`
3. Appelez la fonction d'initialisation dans `sidepanel.js`

### Bonnes pratiques :
- ✅ Utilisez des IDs uniques pour chaque élément
- ✅ Isolez la logique de chaque fonction
- ✅ Commentez votre code
- ✅ Testez chaque fonction séparément

## 🎉 Félicitations !

Votre extension est maintenant **modulaire**, **extensible** et **facile à maintenir** !

---

**Besoin d'aide ?** Consultez les fichiers de documentation ou les exemples fournis.
