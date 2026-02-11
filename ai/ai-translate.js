// ===== FONCTION DE TRADUCTION IA =====

// Traduire avec l'IA
async function translateText(isTranslationNotDictionary) {
    const aiTextToTranslate = document.getElementById('ai-text-to-translate');
    const aiTranslation = document.getElementById('ai-translation');
    const aiTargetLanguage = document.getElementById('ai-target-language');
    const aiSourceLanguage = document.getElementById('ai-source-language');
    const aiTranslateBtn = document.getElementById('ai-translate-btn');
    const aiDictionaryBtn = document.getElementById('ai-dictionary-btn');

    const textToTranslate = aiTextToTranslate?.value.trim();
    if (!textToTranslate) {
        showStatusUtils("Veuillez d'abord entrer le texte", true);
        return;
    }
    if (!aiTargetLanguage) {
        showStatusUtils("Veuillez d'abord sélectionner la langue cible", true);
        return;
    }
    if (!aiSourceLanguage) {
        showStatusUtils("Veuillez d'abord sélectionner la langue source", true);
        return;
    }

    // Récupérer les paramètres
    const { provider, settings } = await getProviderSettings();

    if (!settings.apiKey) {
        showStatusUtils("❌ Clé API manquante (voir Paramètres)", true);
        return;
    }

    const systemrole = `Tu es un assistant utile qui traduit le texte fourni. Tu dois UNIQUEMENT traduire le texte fourni entre les balises <text_to_translate> et </text_to_translate>, sans ajouter de commentaires ou d'explications supplémentaires.`;
    let userrole = ``;

    if (isTranslationNotDictionary) {
        userrole = `Traduis le texte suivant de ${aiSourceLanguage.value} vers ${aiTargetLanguage.value} en appliquant une équivalence dynamique (adaptation naturelle du sens et du contexte culturel, sans littéralisme).

Respecte ces contraintes :
- Ton neutre : Évite les biais émotionnels ou stylistiques, privilégie la clarté et la précision.
- Complexité experte : Utilise un registre technique ou spécialisé si nécessaire, mais reste accessible à un public averti.
- Longueur standard : Conserve la concision du texte original sans ajouter ni omettre d'informations essentielles.
- Fidélité sémantique : Transmets les nuances, les sous-entendus et les références culturelles avec des équivalents adaptés à ${aiTargetLanguage.value}.
- Cohérence terminologique : Si le texte contient des termes techniques, utilise les équivalents standardisés dans ${aiTargetLanguage.value}.

Exemples de style attendu :
- Pour un texte juridique : termes précis, structure logique.
- Pour un texte scientifique : rigueur terminologique, phrases fluides.
- Pour un texte littéraire : adaptation des images et des rythmes, sans perte de profondeur.

IMPORTANT : Fournis UNIQUEMENT la traduction, sans introduction ni explication.

<text_to_translate>
${textToTranslate}
</text_to_translate>`;
    } else {
        userrole = `Traduis les termes suivants un à un en donnant les définitions pour chacun d'entre eux de ${aiSourceLanguage.value} vers ${aiTargetLanguage.value}.

Respecte ces contraintes :
- Ton neutre : Évite les biais émotionnels ou stylistiques, privilégie la clarté et la précision des définitions.
- Complexité experte : Utilise un registre technique ou spécialisé si nécessaire, mais reste accessible à un public averti.
- Fidélité sémantique : Transmets les nuances, les sous-entendus et les références culturelles avec des équivalents adaptés à ${aiTargetLanguage.value}.
- Cohérence terminologique : Si nécessaire, utilise les équivalents standardisés dans ${aiTargetLanguage.value}.

Format de réponse attendu pour chaque terme :
**[Terme original]** → **[Traduction]**
Définition : [Explication claire et concise]

<text_to_translate>
${textToTranslate}
</text_to_translate>`;
    }

    if (isTranslationNotDictionary && aiTranslateBtn) {
        aiTranslateBtn.textContent = 'Traduction en cours...';
        aiTranslateBtn.disabled = true;
    } else if (!isTranslationNotDictionary && aiDictionaryBtn) {
        aiDictionaryBtn.textContent = 'Traduction en cours...';
        aiDictionaryBtn.disabled = true;
    }

    if (aiTranslation) aiTranslation.innerHTML = '<em style="color:#666">Traduction en cours...</em>';

    try {
        // Le texte est déjà inclus dans userrole avec les balises <text_to_translate>
        // On passe une chaîne vide comme prompt pour éviter la duplication
        const answer = await callAI(provider, settings.apiKey, settings.model, systemrole, userrole, '');
        if (isTranslationNotDictionary) {
            if (aiTranslation) aiTranslation.innerHTML = `<strong>🤖 Réponse :</strong><br>Voici la traduction de votre texte en ${aiTargetLanguage.value} :<br> ${formatText(answer)}`;
            showStatusUtils("Traduction terminée !");
        } else {
            if (aiTranslation) aiTranslation.innerHTML = `<strong>🤖 Réponse :</strong><br>Voici la traduction de votre texte selon le dictionnaire en ${aiTargetLanguage.value} :<br> ${formatText(answer)}`;
            showStatusUtils("Traduction terminée !");
        }
    } catch (error) {
        console.error(error);
        if (aiTranslation) aiTranslation.innerHTML = `<strong style="color:red">Erreur:</strong> ${error.message}`;
        showStatusUtils("Erreur lors de la traduction", true);
    } finally {
        if (isTranslationNotDictionary && aiTranslateBtn) {
            aiTranslateBtn.textContent = '✨ Traduire avec IA';
            aiTranslateBtn.disabled = false;
        } else if (!isTranslationNotDictionary && aiDictionaryBtn) {
            aiDictionaryBtn.textContent = '✨ Dictionnaire IA';
            aiDictionaryBtn.disabled = false;
        }
    }
}

// Initialiser la fonction de traduction
function initTranslateFunction() {
    const aiTranslateBtn = document.getElementById('ai-translate-btn');
    const aiDictionaryBtn = document.getElementById('ai-dictionary-btn');

    // Event: Traduire
    if (aiTranslateBtn) {
        aiTranslateBtn.addEventListener('click', () => translateText(true));
    }

    // Event: Dictionnaire
    if (aiDictionaryBtn) {
        aiDictionaryBtn.addEventListener('click', () => translateText(false));
    }
}
