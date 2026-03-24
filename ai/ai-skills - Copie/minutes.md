## title: "Prompt pour Minutes Condensées"  
description: "Un modèle ultra-synthétique pour résumer un texte en 4 sections clés : Résumé Exécutif, Points Clés, Actions/Décisions, et Idées Principales."  
date: 2026-03-23

```markdown
# **Minutes Condensées : [Titre du Sujet]**
*Format : Résumé exécutif + points clés + actions + idées principales*

---

### **📝 Résumé Exécutif** *(3-4 phrases max)*
[Résumé ultra-concis du contexte, des enjeux et des objectifs principaux.
**Exemple** :
*"Réunion du 20/03/2026 sur le plan d’action UE pour la sécurité des drones, animée par Christine Berg (DG MOVE). Objectifs : renforcer la détection des drones malveillants tout en préservant l’innovation du secteur. Principales mesures : abaissement du seuil d’enregistrement à 100g, création d’un label 'Drone de Confiance', et harmonisation des zones géographiques via IAMHUB. Échéance clé : adoption du paquet sécurité fin 2026."*

---

### **🔑 Points Clés** *(Liste à puces, 5-7 éléments max)*
- [Point 1 en **1 phrase** + donnée chiffrée si pertinent]
  **Exemple** : *"Menaces en hausse : +30% d’incidents liés aux drones en 2025 (source : Eurocontrol), ciblant surtout les aéroports et sites militaires."*
- [Point 2]
  **Exemple** : *"Nouveau seuil d’enregistrement : **100g** (vs 250g auparavant), aligné sur le Royaume-Uni (janvier 2026)."*
- [Point 3]
  **Exemple** : *"Label 'Drone de Confiance' : certification pour les opérateurs fiables, critères finaux attendus **Q4 2026**."*
- [Point 4]
  **Exemple** : *"Détection cellulaire : utilisation des réseaux **5G/6G** pour trianguler les drones (tests en cours avec DigiConnect)."*
- [Point 5]
  **Exemple** : *"Financement : appels à projets **COSME** pour startups (1ère date limite : **16 mars 2026**)."*

---

### **✅ Actions / Décisions** *(Tableau : Qui | Quoi | Quand)*
| **Responsable**       | **Action**                                                                 | **Échéance**       |
|------------------------|---------------------------------------------------------------------------|--------------------|
| EASA                   | Proposer le paquet sécurité (seuil 100g, Remote ID, blocage au décollage) | **Fin 2026**      |
| États membres          | Mettre à jour les cartes des zones interdites via **IAMHUB**           | **Début 2026**    |
| Commission européenne  | Finaliser les critères du **label 'Drone de Confiance'**               | **Q4 2026**       |
| Industrie (startups)   | Postuler aux financements **COSME** (dual-use, innovation)              | **16/03 & juin 2026** |
| DG HOME                | Évaluer la nécessité d’un nouveau cadre réglementaire pour les contre-mesures | **2027**          |

---

### **💡 Idées Principales** *(2-3 insights ou questions ouvertes)*
- [Idée/Question 1]
  **Exemple** : *"Le géorepérage (geofencing) pourrait réduire de 40% les incursions accidentelles, mais sa mise en œuvre dépendra de la couverture 5G — un défi pour les zones rurales."*
- [Idée/Question 2]
  **Exemple** : *"Comment concilier **sécurité** (détection stricte) et **innovation** (flexibilité pour les PME) ? Le label 'Drone de Confiance' est une piste, mais son adoption reste incertaine."*
- [Idée/Question 3]
  **Exemple** : *"Opportunité pour les startups : les appels COSME ciblent explicitement les technologies **dual-use** (civil/militaire) — un créneau porteur en 2026-2027."*

---
**📌 Notes Complémentaires** *(Optionnel)*
- *Défis mentionnés* : [Ex. : "Manque de coordination entre États membres sur le partage des données d’incidents."]
- *Prochaine réunion* : [Date/Sujet si pertinent]
- *Documents de référence* : [Liens ou titres, ex. : "Plan d’action UE (février 2026)", "Rapport Eurocontrol 2025"]

---
```

---

## **Instructions d'Utilisation**

1. **Copier ce template** dans un fichier `.md` (ex. : `minutes_condensees.md`).
2. **Remplacer les exemples** par le contenu réel du texte à analyser.
3. **Personnaliser les sections** :
  - **Résumé Exécutif** : 3-4 phrases **maximales** pour capturer l’essentiel.
  - **Points Clés** : 5-7 puces **priorisées** (pas de détails superflus).
  - **Actions** : Tableau **Qui | Quoi | Quand** pour une clarté immédiate.
  - **Idées Principales** : 2-3 **insights stratégiques** ou questions critiques.
4. **Style Markdown** :
  - Utilise les emojis (🔑, ✅) pour une lecture visuelle rapide.
  - Gras (`**texte**`) pour les **dates, chiffres et acteurs clés**.
  - Tableaux pour les actions (colonne "Échéance" à droite pour une vue chronologique).

---

## **Exemple d'Output Final**

*(Pour le texte sur le plan d’action UE des drones)*

```markdown
# **Minutes Condensées : Plan d’Action UE – Sécurité des Drones (2026)**
*Réunion du 20/03/2026 – Animée par Christine Berg (DG MOVE) et Jukka (EASA)*

---
### **📝 Résumé Exécutif**
La Commission européenne a présenté son **plan d’action pour la sécurité des drones** (adopté le **11/02/2026**), en réponse à l’augmentation des **incidents malveillants** (+30% en 2025). Le plan vise à **renforcer la détection et la traçabilité** (ex. : seuil d’enregistrement abaissé à **100g**, Remote ID obligatoire) tout en **préservant l’innovation** (label "Drone de Confiance", financements COSME). **Échéance clé** : adoption du paquet sécurité **fin 2026**.

---
### **🔑 Points Clés**
- **Menaces** : Drones utilisés pour l’**espionnage** (sites militaires) et les **perturbations** (aéroports), avec un impact sur la **perception publique** du secteur.
- **Mesures phares** :
  - **Seuil d’enregistrement** : **100g** (vs 250g) pour les drones avec caméra (alignement sur le **Royaume-Uni**).
  - **Remote ID** : Obligation pour tous les drones >100g + **blocage au décollage** si l’ID opérateur est invalide.
  - **Détection** : Utilisation des réseaux **5G/6G** pour trianguler les drones (tests avec **DigiConnect**).
- **Outils** :
  - **IAMHUB** (EASA) : Plateforme centralisée pour les **zones géographiques interdites**.
  - **Label "Drone de Confiance"** : Certification pour les opérateurs fiables (critères finaux **Q4 2026**).
- **Financements** : Appels à projets **COSME** pour startups (1ère date limite : **16 mars 2026**).

---
### **✅ Actions / Décisions**

| **Responsable**       | **Action**                                                                 | **Échéance**       |
|------------------------|---------------------------------------------------------------------------|--------------------|
| **EASA**              | Soumettre le paquet sécurité (seuil 100g, Remote ID, blocage décollage) | **Fin 2026**      |
| **États membres**     | Publier les cartes des zones interdites via **IAMHUB**                  | **Début 2026**    |
| **Commission UE**     | Finaliser les critères du **label "Drone de Confiance"**                | **Q4 2026**       |
| **Startups**          | Postuler aux financements **COSME** (dual-use, innovation)             | **16/03 & juin 2026** |
| **DG HOME**           | Évaluer un nouveau cadre pour les **contre-mesures** (brouilleurs, lasers) | **2027**          |

---
### **💡 Idées Principales**
- **Défis techniques** : Le **géorepérage** (geofencing) dépendra de la couverture **5G** — un obstacle pour les zones rurales.
- **Équilibre sécurité/innovation** : Le label "Drone de Confiance" pourrait **avantager les grands opérateurs** au détriment des PME.
- **Opportunité pour les startups** : Les appels **COSME** ciblent les technologies **dual-use** (civil/militaire) — un marché en croissance en 2026-2027.

---
**📌 Notes Complémentaires**
- **Prochaine étape** : Consultation sur la **Drone Strategy 2.0** (été 2026).
- **Document clé** : [Plan d’action UE (février 2026)](lien_hypothétique)
- **Contact** : Pour les questions, contacter **fabrice.cuzieux@onera.fr** (expert drone ONERA).
```
