# 📚 Index de Documentation - SemiaSB

Bienvenue dans la documentation de **SemiaSB** ! Voici un guide pour vous orienter dans les différents fichiers.

## 🚀 Par où commencer ?

### Nouveau sur le projet ?
1. 📖 Lisez d'abord **[GUIDE-RAPIDE.md](GUIDE-RAPIDE.md)** - Guide de démarrage rapide
2. 🎨 Consultez **[APERCU-VISUEL.md](APERCU-VISUEL.md)** - Aperçu visuel de l'interface
3. 📝 Parcourez **[RESTRUCTURATION.md](RESTRUCTURATION.md)** - Ce qui a été fait

### Vous voulez ajouter une fonction ?
1. 📖 Consultez **[README.md](README.md)** - Section "Comment Ajouter une Nouvelle Fonctionnalité"
2. 💡 Étudiez **[example-new-function.js](example-new-function.js)** - Exemple complet
3. 🚀 Suivez **[GUIDE-RAPIDE.md](GUIDE-RAPIDE.md)** - Section "Ajouter une Nouvelle Fonction"

### Vous voulez comprendre l'architecture ?
1. 📖 Lisez **[README.md](README.md)** - Architecture complète
2. 🎨 Visualisez **[APERCU-VISUEL.md](APERCU-VISUEL.md)** - Diagrammes et schémas
3. 📝 Consultez **[RESTRUCTURATION.md](RESTRUCTURATION.md)** - Détails de la restructuration

## 📁 Liste des Fichiers

### 📖 Documentation

| Fichier | Description | Quand le lire ? |
|---------|-------------|-----------------|
| **[README.md](README.md)** | Documentation complète de l'architecture | Pour comprendre le projet |
| **[GUIDE-RAPIDE.md](GUIDE-RAPIDE.md)** | Guide de démarrage rapide | Pour commencer rapidement |
| **[GUIDE-LUCIDE-ICONS.md](GUIDE-LUCIDE-ICONS.md)** | Guide des icônes Lucide | Pour changer les icônes |
| **[GUIDE-NOTE-CAPTURE.md](GUIDE-NOTE-CAPTURE.md)** | Guide Note-Capture | Pour utiliser la capture de notes |
| **[RESTRUCTURATION.md](RESTRUCTURATION.md)** | Récapitulatif de la restructuration | Pour voir ce qui a changé |
| **[APERCU-VISUEL.md](APERCU-VISUEL.md)** | Aperçu visuel et design | Pour voir l'interface |
| **[CHANGELOG.md](CHANGELOG.md)** | Historique des versions | Pour suivre l'évolution |
| **[INDEX.md](INDEX.md)** | Ce fichier | Pour naviguer dans la doc |

### 💻 Code Source

| Fichier | Description | Rôle |
|---------|-------------|------|
| **[sidepanel.html](sidepanel.html)** | Interface HTML | Structure de l'UI |
| **[sidepanel.js](sidepanel.js)** | Logique JavaScript | Navigation + Fonctions |
| **[style.css](style.css)** | Styles CSS | Design et animations |
| **[manifest.json](manifest.json)** | Configuration Chrome | Permissions et métadonnées |
| **[background.js](background.js)** | Service worker | Tâches en arrière-plan |

### 📝 Exemples

| Fichier | Description | Utilité |
|---------|-------------|---------|
| **[example-new-function.js](example-new-function.js)** | Exemple de fonction modulaire | Template pour nouvelles fonctions |

### 🖼️ Ressources

| Dossier/Fichier | Description |
|-----------------|-------------|
| **icons/** | Icônes de l'extension |
| **sidebar_interface_demo.png** | Aperçu de l'interface |
| **architecture_diagram.png** | Diagramme d'architecture |

## 🎯 Guides par Objectif

### Je veux utiliser l'extension
```
1. GUIDE-RAPIDE.md → Section "Comment Utiliser"
2. Recharger l'extension dans Chrome
3. Ouvrir le side panel
4. Naviguer entre les vues
```

### Je veux ajouter une fonction
```
1. README.md → Section "Comment Ajouter une Nouvelle Fonctionnalité"
2. example-new-function.js → Étudier l'exemple
3. GUIDE-RAPIDE.md → Section "Ajouter une Nouvelle Fonction"
4. Suivre les 3 étapes (HTML + JS)
```

### Je veux personnaliser le design
```
1. APERCU-VISUEL.md → Section "Palette de Couleurs"
2. style.css → Modifier les variables CSS
3. GUIDE-RAPIDE.md → Section "Personnalisation des Couleurs"
```

### Je veux comprendre l'architecture
```
1. README.md → Section "Architecture"
2. APERCU-VISUEL.md → Diagramme d'architecture
3. RESTRUCTURATION.md → Détails techniques
4. sidepanel.js → Code commenté
```

### Je veux déboguer un problème
```
1. GUIDE-RAPIDE.md → Section "Débogage"
2. Console Chrome (F12)
3. Vérifier les IDs et attributs data-view
4. Consulter le code dans sidepanel.js
```

## 📊 Résumé du Projet

### Statistiques
- **Fichiers de code** : 5
- **Fichiers de documentation** : 6
- **Lignes de code** : ~600
- **Vues disponibles** : 4
- **Fonctionnalités actives** : 1
- **Fonctionnalités planifiées** : 3

### Technologies
- **HTML5** - Structure
- **CSS3** - Design et animations
- **JavaScript ES6+** - Logique
- **Chrome Extension API** - Intégration Chrome

### Compatibilité
- Chrome 88+
- Edge 88+
- Brave
- Opera

## 🗺️ Plan de Lecture Recommandé

### Pour les débutants
```
1. GUIDE-RAPIDE.md (10 min)
2. APERCU-VISUEL.md (5 min)
3. README.md - Section "Utilisation" (5 min)
```

### Pour les développeurs
```
1. README.md (15 min)
2. RESTRUCTURATION.md (10 min)
3. example-new-function.js (10 min)
4. sidepanel.js - Code commenté (15 min)
```

### Pour les designers
```
1. APERCU-VISUEL.md (10 min)
2. style.css - Variables CSS (5 min)
3. GUIDE-RAPIDE.md - Personnalisation (5 min)
```

## 🔍 Recherche Rapide

### Mots-clés et Fichiers Associés

| Mot-clé | Fichier(s) |
|---------|-----------|
| **Navigation** | README.md, sidepanel.js |
| **Sidebar** | APERCU-VISUEL.md, style.css |
| **Capture d'onglet** | sidepanel.js, README.md |
| **Ajouter fonction** | README.md, GUIDE-RAPIDE.md, example-new-function.js |
| **Design** | APERCU-VISUEL.md, style.css |
| **Couleurs** | APERCU-VISUEL.md, GUIDE-RAPIDE.md, style.css |
| **Architecture** | README.md, RESTRUCTURATION.md, APERCU-VISUEL.md |
| **Installation** | README.md, GUIDE-RAPIDE.md |
| **Débogage** | GUIDE-RAPIDE.md |
| **Changelog** | CHANGELOG.md |

## 💡 Conseils de Navigation

### Lecture Linéaire
Si vous préférez lire dans l'ordre :
```
1. GUIDE-RAPIDE.md
2. README.md
3. RESTRUCTURATION.md
4. APERCU-VISUEL.md
5. example-new-function.js
6. CHANGELOG.md
```

### Lecture par Besoin
Utilisez le tableau "Guides par Objectif" ci-dessus pour trouver rapidement ce dont vous avez besoin.

### Lecture Approfondie
Pour une compréhension complète :
```
1. Tous les fichiers .md dans l'ordre
2. Étude du code source (HTML, JS, CSS)
3. Expérimentation avec l'extension
4. Création d'une fonction test
```

## 📞 Support

### Problème avec la documentation ?
- Vérifiez que vous avez la dernière version
- Consultez le CHANGELOG.md pour les mises à jour
- Relisez la section concernée

### Problème avec le code ?
- Consultez GUIDE-RAPIDE.md → Section "Débogage"
- Vérifiez la console Chrome (F12)
- Relisez example-new-function.js

### Besoin d'inspiration ?
- Consultez APERCU-VISUEL.md pour le design
- Étudiez example-new-function.js pour le code
- Lisez RESTRUCTURATION.md pour l'architecture

## 🎉 Bon Développement !

Cette documentation a été créée pour vous aider à comprendre, utiliser et étendre **SemiaSB**.

N'hésitez pas à explorer les différents fichiers selon vos besoins !

---

**Version de la documentation : 2.0.0**  
**Dernière mise à jour : 30 novembre 2025**
