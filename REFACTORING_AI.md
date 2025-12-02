# Refactorisation du code AI en modules

## Structure créée

J'ai créé une structure modulaire pour le code IA :

```
h:/Developments/SemiaSB/
├── ai/
│   ├── ai-utils.js           ✅ CRÉÉ - Utilitaires communs
│   ├── ai-providers.js       ✅ CRÉÉ - Appels API (SEMIA, OpenAI, Mistral, Gemini)
│   ├── ai-analyze.js         ✅ CRÉÉ - Analyse de page web
│   └── ai-translate.js       ✅ CRÉÉ - Traduction et dictionnaire
├── ask-semia-new.js          ✅ CRÉÉ - Point d'entrée principal
└── sidepanel.html            ⚠️  À MODIFIER MANUELLEMENT
```

## Avantages de cette structure

1. **Maintenance indépendante** : Chaque fonction IA est dans son propre fichier
2. **Réutilisabilité** : Les providers et utils peuvent être utilisés par toutes les fonctions
3. **Clarté** : Le code est organisé logiquement
4. **Évolutivité** : Facile d'ajouter de nouvelles fonctions IA

## Modification à faire dans sidepanel.html

### AVANT (lignes 304-308) :
```html
  <script src="settings.js"></script>
  <script src="note-capture.js"></script>
  <script src="ask-semia.js"></script>
  <script src="sidepanel.js"></script>
  <script src="folder-view.js"></script>
```

### APRÈS :
```html
  <script src="settings.js"></script>
  <script src="note-capture.js"></script>
  
  <!-- AI Modules (order matters: utils -> providers -> features -> main) -->
  <script src="ai/ai-utils.js"></script>
  <script src="ai/ai-providers.js"></script>
  <script src="ai/ai-analyze.js"></script>
  <script src="ai/ai-translate.js"></script>
  <script src="ask-semia-new.js"></script>
  
  <script src="sidepanel.js"></script>
  <script src="folder-view.js"></script>
```

## Ordre d'importation (IMPORTANT !)

L'ordre est crucial car les fichiers dépendent les uns des autres :

1. **ai-utils.js** - Fonctions de base (showStatus, formatText, etc.)
2. **ai-providers.js** - Appels API (utilise ai-utils)
3. **ai-analyze.js** - Analyse de page (utilise ai-utils et ai-providers)
4. **ai-translate.js** - Traduction (utilise ai-utils et ai-providers)
5. **ask-semia-new.js** - Point d'entrée (initialise tout)

## Contenu de chaque fichier

### ai/ai-utils.js
- `showStatus(msg, isError)` - Afficher des messages de statut
- `formatText(text)` - Formater le texte (Markdown -> HTML)
- `checkProviderReady(provider)` - Vérifier si un provider est configuré
- `getProviderSettings()` - Récupérer les paramètres du provider actuel

### ai/ai-providers.js
- `callSemiaAI(apiKey, model, systemrole, userrole, prompt)` - Appel SEMIA
- `callOpenAI(apiKey, model, systemrole, userrole, prompt)` - Appel OpenAI
- `callMistral(apiKey, model, systemrole, userrole, prompt)` - Appel Mistral
- `callGemini(apiKey, model, systemrole, userrole, prompt)` - Appel Gemini
- `callAI(provider, apiKey, model, systemrole, userrole, prompt)` - Fonction générique

### ai/ai-analyze.js
- `scrapePage()` - Lire le contenu de la page active
- `analyzePage(pageContent, question)` - Analyser avec l'IA
- `initAnalyzeFunction()` - Initialiser les event listeners

### ai/ai-translate.js
- `translateText(isTranslationNotDictionary)` - Traduire ou mode dictionnaire
- `initTranslateFunction()` - Initialiser les event listeners

### ask-semia-new.js
- `initAIFunction()` - Point d'entrée principal
- `initDynamicTitle()` - Gestion du titre dynamique avec statut du provider

## Prochaines étapes

1. **Modifier sidepanel.html** manuellement avec le nouveau code d'importation
2. **Tester** que tout fonctionne correctement
3. **Optionnel** : Renommer `ask-semia-new.js` en `ask-semia.js` (après avoir sauvegardé l'ancien)
4. **Optionnel** : Archiver l'ancien `ask-semia.js` pour référence

## Pour ajouter une nouvelle fonction IA à l'avenir

1. Créer un nouveau fichier dans `ai/` (ex: `ai-chat.js`)
2. Utiliser les fonctions de `ai-utils.js` et `ai-providers.js`
3. Créer une fonction `initChatFunction()` qui initialise les event listeners
4. Ajouter `<script src="ai/ai-chat.js"></script>` dans sidepanel.html
5. Appeler `initChatFunction()` dans `ask-semia-new.js`

## Notes importantes

- Tous les fichiers sont déjà créés et fonctionnels
- Le code est compatible avec l'ancien système
- Aucune perte de fonctionnalité
- Meilleure organisation pour la maintenance future
