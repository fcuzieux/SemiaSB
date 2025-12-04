# 🔧 Guide de débogage - Chapitrage vidéo

## ❌ Problème rencontré

Le bouton "Valider" ne répond pas lors de l'ajout d'un chapitre.

## 🔍 Étapes de débogage

### 1. Ouvrir la console du navigateur
- Appuyez sur **F12** pour ouvrir les outils de développement
- Allez dans l'onglet **Console**

### 2. Démarrer un enregistrement vidéo
- Cliquez sur "Démarrer" pour lancer la capture
- Les contrôles de chapitrage devraient apparaître

### 3. Tester l'ajout d'un chapitre
- Cliquez sur "Ajouter un chapitre"
- Le formulaire devrait s'afficher
- Entrez un nom de chapitre
- Cliquez sur "✓ Valider"

### 4. Vérifier les logs dans la console

Vous devriez voir les messages suivants :
```
Validate button clicked
Chapter name: [votre nom de chapitre]
addChapter called with name: [votre nom de chapitre]
recordingStartTime: [timestamp]
Chapter created: {number: 1, name: "...", timestamp: ..., formattedTime: "..."}
```

## 🐛 Messages d'erreur possibles

### Si vous voyez : "Cannot add chapter: recording not started"
**Cause** : `recordingStartTime` n'est pas défini  
**Solution** : Vérifiez que l'enregistrement a bien démarré

### Si vous ne voyez aucun log
**Cause** : Le gestionnaire d'événement n'est pas attaché  
**Solutions possibles** :
1. Recharger l'extension
2. Vérifier que les IDs des éléments HTML correspondent
3. Vérifier que le script `sidepanel.js` est bien chargé

### Si le formulaire ne s'affiche pas
**Cause** : L'élément `chapter-input-form` n'existe pas dans le HTML  
**Solution** : Vérifier que le HTML contient bien le formulaire

## ✅ Corrections apportées

1. **Ajout de logs de débogage** dans `sidepanel.js` :
   - Log lors du clic sur "Valider"
   - Log du nom du chapitre
   - Log de `recordingStartTime`
   - Log du chapitre créé

2. **Message d'erreur explicite** :
   - Si l'enregistrement n'est pas démarré, un message s'affiche

3. **Amélioration du style des boutons** :
   - Ajout de `type="button"` pour éviter la soumission de formulaire
   - Ajout de `cursor: pointer`
   - Ajout de `border: none` et `border-radius`

4. **Initialisation des icônes Lucide** :
   - Appel à `lucide.createIcons()` après l'affichage des contrôles

## 📝 Checklist de vérification

- [ ] L'enregistrement est démarré
- [ ] Les contrôles de chapitrage sont visibles
- [ ] Le bouton "Ajouter un chapitre" fonctionne
- [ ] Le formulaire s'affiche
- [ ] Le champ de saisie est actif
- [ ] Le bouton "Valider" est cliquable
- [ ] Les logs apparaissent dans la console
- [ ] Le chapitre est ajouté à la liste
- [ ] Le formulaire se ferme après validation

## 🔄 Si le problème persiste

1. **Recharger l'extension** :
   - Allez dans `chrome://extensions/`
   - Cliquez sur le bouton de rechargement de l'extension

2. **Vérifier les fichiers** :
   - `sidepanel.html` contient bien le formulaire
   - `sidepanel.js` contient bien les gestionnaires d'événements

3. **Tester manuellement dans la console** :
   ```javascript
   // Vérifier que les éléments existent
   console.log(document.getElementById('validateChapterBtn'));
   console.log(document.getElementById('chapterNameInput'));
   
   // Vérifier que recordingStartTime est défini
   console.log(recordingStartTime);
   
   // Tester la fonction addChapter
   addChapter("Test");
   ```

## 📞 Informations à fournir si le problème persiste

1. Copie des logs de la console
2. Capture d'écran de l'interface
3. Version du navigateur
4. Messages d'erreur éventuels

---

**Créé le** : 2025-12-04  
**Auteur** : Antigravity AI Assistant
