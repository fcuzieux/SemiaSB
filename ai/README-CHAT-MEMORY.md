# 💬 Mémoire de Conversation - Chat IA

## 📋 Vue d'ensemble

Le chat IA de SemiaSB dispose maintenant d'une **mémoire de conversation** qui permet à l'IA de se souvenir de tous les échanges précédents dans une session.

## 🔧 Comment ça fonctionne

### Architecture

1. **Historique stocké en mémoire** : Un tableau `chatHistory` stocke tous les messages de la conversation
2. **Format des messages** : Chaque message a un `role` (system/user/assistant) et un `content`
3. **Envoi contextuel** : À chaque nouvelle question, tout l'historique est envoyé à l'IA

### Structure d'un message

```javascript
{
  role: "system" | "user" | "assistant",
  content: "Le contenu du message"
}
```

### Flux de conversation

```
1. Premier message → Ajout du message système ("Tu es un assistant de l'ONERA")
2. Question utilisateur → Ajout à l'historique
3. Appel API → Envoi de TOUT l'historique
4. Réponse IA → Ajout à l'historique
5. Affichage → Toute la conversation est affichée
```

## 🎨 Fonctionnalités

### ✅ Ce qui est implémenté

- ✅ **Mémoire persistante** : L'IA se souvient de toute la conversation
- ✅ **Affichage stylisé** : Messages utilisateur (bleu) et assistant (violet)
- ✅ **Auto-scroll** : La conversation défile automatiquement vers le bas
- ✅ **Effacement de l'historique** : Bouton pour recommencer une nouvelle conversation
- ✅ **Raccourci clavier** : Ctrl+Entrée pour envoyer un message
- ✅ **Gestion d'erreurs** : Retrait du message utilisateur en cas d'erreur API
- ✅ **Multi-provider** : Fonctionne avec tous les providers (SEMIA, OpenAI, Mistral, Gemini)

### 🎯 Utilisation

1. **Poser une question** : Tapez votre question dans le champ de texte
2. **Envoyer** : Cliquez sur ✨➤ ou appuyez sur Ctrl+Entrée
3. **Continuer la conversation** : L'IA se souvient du contexte
4. **Effacer** : Cliquez sur 🗑️ pour recommencer

## 📁 Fichiers modifiés

### `ai-providers.js`
- Ajout de `callAIWithHistory()` : Fonction principale pour gérer l'historique
- Ajout de fonctions spécifiques par provider :
  - `callSemiaAIWithHistory()`
  - `callOpenAIWithHistory()`
  - `callMistralWithHistory()`
  - `callGeminiWithHistory()`

### `ai-chat.js`
- Variable globale `chatHistory` pour stocker la conversation
- `chatWithAI()` : Gestion de l'ajout des messages à l'historique
- `displayChatHistory()` : Affichage stylisé de la conversation
- `clearChatHistory()` : Effacement de l'historique
- `initChatFunction()` : Initialisation avec événements (clic, Ctrl+Entrée)

### `sidepanel.html`
- Ajout du bouton "🗑️ Effacer l'historique"
- Ajout de `max-height` et `overflow-y: auto` pour le scroll
- Mise à jour de la description

## 🔄 Différence avec l'ancienne version

### Avant (sans mémoire)
```javascript
// Chaque appel était indépendant
callAI(provider, apiKey, model, systemrole, userrole, prompt)
```

### Maintenant (avec mémoire)
```javascript
// L'historique complet est envoyé
callAIWithHistory(provider, apiKey, model, [
  { role: "system", content: "Tu es un assistant..." },
  { role: "user", content: "Question 1" },
  { role: "assistant", content: "Réponse 1" },
  { role: "user", content: "Question 2" },
  // ...
])
```

## 🚀 Améliorations futures possibles

1. **Persistance** : Sauvegarder l'historique dans `chrome.storage.local`
2. **Limite de tokens** : Tronquer l'historique si trop long
3. **Export** : Exporter la conversation en Markdown/PDF
4. **Conversations multiples** : Gérer plusieurs conversations parallèles
5. **Résumé automatique** : Résumer l'historique pour économiser des tokens
6. **Édition** : Permettre de modifier/supprimer des messages spécifiques

## 💡 Exemple d'utilisation

```
👤 Vous : Quelle est la capitale de la France ?
🤖 Assistant : La capitale de la France est Paris.

👤 Vous : Et combien d'habitants y vivent ?
🤖 Assistant : Paris compte environ 2,2 millions d'habitants...
              [L'IA se souvient qu'on parle de Paris]
```

## 🐛 Gestion des erreurs

- Si l'API échoue, le message utilisateur est retiré de l'historique
- Les erreurs sont affichées en rouge dans la conversation
- L'historique reste cohérent même en cas d'erreur

---

**Créé le** : 2025-12-04  
**Auteur** : Antigravity AI Assistant
