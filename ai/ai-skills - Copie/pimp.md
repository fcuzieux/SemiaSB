## title: "Prompt pour Amélioration de Transcription Brute"  
description: "Un modèle pour nettoyer et structurer une transcription brute (audio, réunion, entretien) en conservant 100% du contenu original. Ajoute ponctuation, paragraphes aérés, et corrige les fautes de frappe évidentes, sans altérer le sens."  
date: 2026-03-23

```markdown
# **Prompt : Amélioration de Transcription Brute**
**Objectif** :
Transformer une **transcription brute** (ex. : sortie d'un outil de reconnaissance vocale, notes rapides, ou texte non structuré) en un **texte clair, aéré et professionnel**, **sans modifier le sens original**, **sans résumer**, et **sans omettre aucun contenu**.

**Règles strictes** :
1. **Conservation intégrale du contenu** : Aucun mot, aucune idée ne doit être supprimé ou résumé.
2. **Fidélité au sens** : Aucune interprétation ou reformulation qui altérerait la signification originale.
3. **Améliorations autorisées** :
   - Ajout de **ponctuation** (points, virgules, deux-points, guillemets, etc.).
   - Correction des **fautes de frappe évidentes** (ex. : "et" → "est", "a" → "à").
   - **Structuration en paragraphes** pour clarifier les changements de sujet ou d'intervenant.
   - Ajout de **sauts de ligne** et d'**espaces** pour aérer le texte.
   - Mise en forme des **listes** (puces ou numérotées) si le contexte le suggère clairement.
   - **Mise en gras** des noms propres, dates, ou termes techniques **uniquement s'ils sont explicitement mentionnés dans le texte original**.
4. **Interdictions** :
   - Ne **pas reformuler** les phrases (sauf pour corriger une faute évidente).
   - Ne **pas ajouter** d'informations ou d'explications absentes du texte original.
   - Ne **pas supprimer** de répétitions ou de redondances (sauf si clairement dues à une erreur de transcription).
   - Ne **pas modifier** l'ordre des idées ou des interventions.

---

## **Structure du Texte Amélioré**
*(À appliquer systématiquement)*

### **1. Identification des Intervenants** *(si applicable)*
- Si la transcription contient des **dialogues** ou des **interventions multiples**, sépare chaque prise de parole par un **saut de ligne + nom en gras**.
  **Exemple** :
```

  **Christine Berg** : [texte corrigé et ponctué]

  **Jukka** : [texte corrigé et ponctué]

  Les mesures sont :

1. Abaisser le seuil à 100 g ;
2. Ajouter une identification à distance ;
3. Bloquer le décollage si l’ID est invalide.

Bonjour à tous, merci d’être là aujourd’hui.

Nous allons parler du **plan d’action pour les drones**, adopté le **11 février 2026**. Il comprend trois points principaux :

1. Le seuil d’enregistrement ;
2. L’identification ;
3. Les contre-mesures.

**Christine Berg**, de la Commission européenne, va nous en dire plus.

```

---

## **Consignes pour l'Outils d'IA**
*(À coller tel quel dans ton outil d'IA avec le texte brut)*

```

Analyse le texte brut ci-dessous et applique les règles suivantes pour produire une version améliorée :

### Règles Strictes :

1. **Conserve 100% du contenu original** : Aucun mot, aucune idée ne doit être omis ou résumé.
2. **Ne reformule pas** : Garde les tournures de phrase originales, sauf pour corriger des fautes de frappe **évidentes** (ex. : "a" → "à").
3. **Ajoute une ponctuation logique** :
  - Points (.) pour les phrases complètes.
  - Virgules (,) pour les énumérations ou les pauses naturelles.
  - Deux-points (:) avant une liste ou une explication.
  - Guillemets (« ») pour les citations directes.
4. **Structure en paragraphes** :
  - Sépare les idées par des sauts de ligne.
  - Utilise des paragraphes pour les changements de sujet ou d'intervenant.
5. **Corrige uniquement les erreurs manifestes** :
  - Fautes de frappe (ex. : "et" → "est").
  - Majuscules manquantes (noms propres, début de phrase).
  - Espaces manquants (ex. : "100g" → "100 g" sauf si unité standard).
6. **Ne modifie pas** :
  - L'ordre des idées.
  - Les répétitions (sauf si clairement dues à une erreur de transcription).
  - Les termes techniques ou spécifiques (même s'ils semblent mal orthographiés).

### Mise en Forme :

- **Dialogues** : Si plusieurs intervenants, sépare leurs prises de parole par un saut de ligne + **Nom en gras**.
- **Listes** : Si le texte contient une énumération claire, structure-la avec des puces (-) ou des numéros (1.).
- **Gras** : Utilise le gras (**texte**) uniquement pour les **noms propres**, **dates**, ou **termes techniques** explicitement mentionnés.

### Texte Brut à Améliorer :

[COLLER ICI LE TEXTE BRUT À TRAITER]

```

---

## **Exemple d'Application sur ton Texte**
*(Extrait du texte sur les drones, avant/après)*

**Texte Brut Original** :
```

okay good then welcome to this ad hoc informal expert group on drones and thank you for joining us on this friday afternoon were myself christine berg dealing with aviation safety in the european commission and my team led by luca sabo looking into innovative air mobility are pleased to take you through an action plan that was adopted by the european commission not that long ago namely on the 11th of february 2026

```

**Version Améliorée** :
```

Okay, good. Then welcome to this **ad hoc informal expert group on drones**, and thank you for joining us on this Friday afternoon.

We are **myself, Christine Berg**, dealing with aviation safety in the **European Commission**, and **my team**, led by **Luca Sabo**, looking into innovative air mobility. We are pleased to take you through an **action plan** that was adopted by the **European Commission** not that long ago, namely on the **11th of February 2026**.

```

---
## **Cas Particuliers**
1. **Transcriptions avec horodatage** :
   - Conserve les horodatages (`[00:05:23]`) en début de ligne si présents.
   - **Exemple** :
     ```
     [00:05:23]
     **Christine Berg** : Le plan a été adopté le 11 février 2026. Trois points clés...
     ```

2. **Mots incompréhensibles** :
   - Si un mot est illisible (ex. : `[inaudible 00:12:45]`), le **conserver tel quel** et ne pas tenter de deviner.

3. **Abréviations** :
   - Ne pas développer les abréviations sauf si leur sens est **explicitement donné** dans le texte (ex. : "UE" reste "UE" sauf si le texte dit "Union Européenne (UE)").

4. **Mots incompréhensibles** :
   - Si un mot est illisible (ex. : `[inaudible 00:12:45]`), le **conserver tel quel** et ne pas tenter de deviner.

5. **Texte très technique** :
   - Ne corrige pas les termes techniques même s'ils semblent mal orthographiés (ex. : 'geofencing' reste 'geofencing').

6. **Dialogue** :
   - Si tu discerne un dialogue, sépare chaque intervention par un saut de ligne + **Nom:** en gras si connu, sinon par un saut de ligne + **Intervenant X:** en gras.
   