// ai-minutes.js - Fonctions IA pour la transcription (Résumé, News, Questions)

// Dictionnaire des templates de instructions (Prompts)
const AI_PROMPT_TEMPLATES = {
    minutes: "Merci de générer un COMPTE RENDU STRUCTURÉ contenant :\n1. 📝 Résumé Exécutif (3-4 phrases)\n2. 🔑 Points Clés (Liste à puces)\n3. ✅ Actions / Décisions (Qui fait quoi, Dates clés)\n4. 💡 Idées Principales\n\nUtilise un style Markdown clair et professionnel.",
    summary: "RÉSUMÉ STRUCTURÉ :\n- Analyse le sujet central\n- Extrais les points majeurs (sous-titres gras)\n- Utilise des listes à puces pour les détails.\n\nStyle Markdown.",
    pimp: "Améliore la lisibilité de cette transcription brute tout en restant 100% fidèle au sens original. Ajoute de la ponctuation, corrige les fautes de frappe évidentes, et structure en paragraphes aérés. Ne résume pas, garde tout le contenu."
};

/**
 * Découpe un texte en morceaux de taille maximale, sans couper au milieu d'un mot.
 */
function chunkText(text, maxLength = 12000) {
    const chunks = [];
    let currentPos = 0;

    while (currentPos < text.length) {
        if (text.length - currentPos <= maxLength) {
            chunks.push(text.substring(currentPos));
            break;
        }

        let endPos = currentPos + maxLength;
        // Chercher le dernier point ou retour à la ligne avant la limite pour une coupe propre
        const lastSentence = text.lastIndexOf('. ', endPos);
        const lastNewline = text.lastIndexOf('\n', endPos);
        const bestSplit = Math.max(lastSentence, lastNewline);

        if (bestSplit > currentPos + (maxLength * 0.5)) {
            endPos = bestSplit + 1;
        }

        chunks.push(text.substring(currentPos, endPos).trim());
        currentPos = endPos;
    }
    return chunks;
}

/**
 * Exécute une tâche IA sur le transcript actuel
 */
async function executeAITask(taskType, customQuestion = "") {
    const transcript = document.getElementById('liveTranscript').value.trim();
    if (!transcript) {
        showStatusUtils("❌ Le transcript est vide. Enregistrez d'abord quelque chose.", true);
        return;
    }

    const outputDiv = document.getElementById('ai-minutes-output');
    const contentDiv = document.getElementById('ai-output-content');

    if (outputDiv && contentDiv) {
        contentDiv.innerHTML = 'Analyse du contenu... <span class="spinner">⏳</span>';
        outputDiv.style.display = 'block';
        outputDiv.scrollIntoView({ behavior: 'smooth' });
    }

    // 1. Récupérer la config IA
    const { provider, settings } = await getProviderSettings();

    if (!settings || !settings.apiKey) {
        showStatusUtils("❌ IA non configurée. Veuillez vérifier vos paramètres dans l'extension.", true);
        if (contentDiv) contentDiv.innerHTML = '';
        return;
    }

    const apiKey = settings.apiKey;
    const model = settings.model;

    // 2. Détecter si on doit découper (Seuil à 25000 chars)
    const MAX_CHARS = 25000;
    const chunks = transcript.length > MAX_CHARS ? chunkText(transcript, MAX_CHARS) : [transcript];
    const isChunked = chunks.length > 1;

    console.log(`Traitement AI: ${chunks.length} segments détectés.`);

    let systemRole = "";
    let basePromptTemplate = "";
    let displayTitle = "";

    // Configuration des rôles selon la tâche
    switch (taskType) {
        case 'minutes':
            displayTitle = "📝 Compte Rendu de Réunion";
            systemRole = "Tu es un assistant expert en prise de notes et synthèse de réunions. Ta tâche est de produire un compte rendu structuré et professionnel.";
            basePromptTemplate = AI_PROMPT_TEMPLATES.minutes;
            break;
        case 'pimp':
            displayTitle = "📝 Amélioration de la transcription";
            systemRole = "Tu es un assistant expert en amélioration de la transcription. Ta tâche est de relire et d'améliorer la transcription brute. Reconstruis le texte fidèlement en corrigeant syntaxe et ponctuation sans résumer. Ta réponse ne doit contenir que le texte corrigé sans aucun commentaire ni autre élément.";
            basePromptTemplate = AI_PROMPT_TEMPLATES.pimp;
            break;
        case 'summary':
            displayTitle = "📑 Résumé Structuré";
            systemRole = "Tu es SYNTHESIS PRO, expert en extraction et synthèse ultra-fidèle. Résume strictement le contenu fourni sans rien inventer.";
            basePromptTemplate = AI_PROMPT_TEMPLATES.summary;
            break;
        case 'news':
            displayTitle = "🗞️ News Flash";
            systemRole = "Tu es un journaliste tech dynamique. Transforme le contenu brut en une News percutante avec emojis.";
            basePromptTemplate = AI_PROMPT_TEMPLATES.news;
            break;
        case 'custom':
            displayTitle = "❓ Question sur le contenu";
            systemRole = "Tu es un assistant IA expert. Réponds à la question de l'utilisateur en te basant sur la transcription.";
            basePromptTemplate = customQuestion;
            break;
    }

    try {
        let results = [];

        // PHASE 1: MAP (Traiter chaque morceau)
        for (let i = 0; i < chunks.length; i++) {
            if (isChunked && contentDiv) {
                contentDiv.innerHTML = `Traitement du segment ${i + 1} / ${chunks.length}... <span class="spinner">⏳</span>`;
            }

            let userPrompt = "";
            if (isChunked && taskType !== 'pimp') {
                userPrompt = `Voici une PARTIE (${i + 1}/${chunks.length}) d'une transcription :\n\n"${chunks[i]}"\n\nTask: ${basePromptTemplate}\n\nNote: Produis un résultat partiel cohérent.`;
            } else {
                userPrompt = `Transcription :\n\n"${chunks[i]}"\n\nTask: ${basePromptTemplate}`;
            }

            const chunkResponse = await callAI(provider, apiKey, model, systemRole, displayTitle, userPrompt);
            results.push(chunkResponse);
        }

        // PHASE 2: REDUCE / SYNTHESIS
        let finalResponse = "";

        if (!isChunked) {
            finalResponse = results[0];
        } else {
            if (contentDiv) contentDiv.innerHTML = `Synthèse finale en cours... <span class="spinner">⏳</span>`;

            if (taskType === 'pimp') {
                // Pour Pimp, on recolle simplement
                finalResponse = results.join('\n\n');
            } else {
                // Pour les résumés/comptes-rendus, on demande à l'IA d'unifier
                const synthesisPrompt = `Voici plusieurs analyses partielles d'une longue transcription :\n\n${results.map((r, idx) => `--- SEGMENT ${idx + 1} ---\n${r}`).join('\n\n')}\n\nTask: Fusionne ces éléments en UN SEUL document cohérent, structuré et sans répétitions (Format Markdown). Re-applique scrupuleusement la consigne initiale : ${basePromptTemplate}`;

                finalResponse = await callAI(provider, apiKey, model, systemRole, "Synthèse Globale", synthesisPrompt);
            }
        }

        // 4. Affichage final
        if (contentDiv) {
            outputDiv.dataset.rawResponse = finalResponse;
            contentDiv.innerHTML = `<h3>${displayTitle}</h3><div class="markdown-body">${formatText(finalResponse)}</div>`;
        }
        showStatusUtils(`✅ ${displayTitle} généré !`);

    } catch (err) {
        console.error("Erreur IA:", err);
        showStatusUtils(`❌ Erreur IA: ${err.message}`, true);
        if (contentDiv) contentDiv.innerHTML = `<div style="color:red">Erreur lors du traitement par paquets: ${err.message}</div>`;
    }
}

/**
 * Copie le résultat de l'IA dans le presse-papier avec mise en forme
 */
async function copyAIOutput() {
    const outputDiv = document.getElementById('ai-minutes-output');
    const contentDiv = document.getElementById('ai-output-content');
    const rawText = outputDiv?.dataset.rawResponse;
    const htmlContent = contentDiv?.innerHTML;

    if (!htmlContent) return;

    try {
        // Tentative de copie multi-format (HTML pour Word/Docs, Texte pour le reste)
        const typeHtml = "text/html";
        const typeText = "text/plain";

        const blobHtml = new Blob([htmlContent], { type: typeHtml });
        const blobText = new Blob([rawText || contentDiv.innerText], { type: typeText });

        const data = [new ClipboardItem({
            [typeHtml]: blobHtml,
            [typeText]: blobText
        })];

        await navigator.clipboard.write(data);
        showStatusUtils("📋 Copié avec mise en forme !");
    } catch (err) {
        console.warn("Échec de clipboard riche, repli sur texte brut:", err);
        const text = rawText || contentDiv.innerText;
        await navigator.clipboard.writeText(text);
        showStatusUtils("📋 Texte copié !");
    }
}

// Initialisation des événements
document.addEventListener('DOMContentLoaded', () => {
    // Bouton Compte rendu classique
    const minutesBtn = document.getElementById('btn-minutes');
    if (minutesBtn) minutesBtn.addEventListener('click', () => executeAITask('minutes'));

    // Nouveau bouton Résumé
    const resumeBtn = document.getElementById('btn-ai-resume');
    if (resumeBtn) resumeBtn.addEventListener('click', () => executeAITask('summary'));

    // Nouveau bouton News
    const newsBtn = document.getElementById('btn-ai-news');
    if (newsBtn) newsBtn.addEventListener('click', () => executeAITask('news'));

    // Question personnalisée
    const analyzeBtn = document.getElementById('ai-analyze-btn');
    const questionInput = document.getElementById('ai-question');

    if (analyzeBtn && questionInput) {
        const sendQuestion = () => {
            const question = questionInput.value.trim();
            if (question) executeAITask('custom', question);
        };

        analyzeBtn.addEventListener('click', sendQuestion);

        // Ctrl+Entrée pour envoyer la question
        questionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                sendQuestion();
            }
        });
    }

    // Gestion de l'import de prompt
    const importBtn = document.getElementById('import-prompt-btn');
    const promptSelect = document.getElementById('prompt-helper-select');
    if (importBtn && promptSelect && questionInput) {
        importBtn.addEventListener('click', () => {
            const selectedKey = promptSelect.value;
            const promptText = AI_PROMPT_TEMPLATES[selectedKey];
            if (promptText) {
                questionInput.value = promptText;
                questionInput.focus();
                // Ajuster dynamiquement la hauteur du textarea si nécessaire
                questionInput.style.height = 'auto';
                questionInput.style.height = (questionInput.scrollHeight) + 'px';
                showStatusUtils("📥 Prompt importé ! Vous pouvez le modifier.");
            }
        });
    }

    // Bouton de copie
    const copyBtn = document.getElementById('copy-ai-output');
    if (copyBtn) {
        copyBtn.addEventListener('click', copyAIOutput);
    }
});
