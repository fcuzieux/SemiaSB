// ===== FONCTION MODULAIRE : ANALYSE IA DE PAGE =====
// Fonction principale d'initialisation de l'IA
function initAIFunction() {
    const scrapeBtn = document.getElementById('ai-scrape-btn');
    const questionInput = document.getElementById('ai-question');
    const analyzeBtn = document.getElementById('ai-analyze-btn');
    const answerDiv = document.getElementById('ai-answer');
    const statusDiv = document.getElementById('ai-status');
    const aiTranslateBtn = document.getElementById('ai-translate-btn');
    const aiDictionaryBtn = document.getElementById('ai-dictionary-btn');
    const aiTextToTranslate = document.getElementById('ai-text-to-translate');
    const aiTranslation = document.getElementById('ai-translation');
    const aiTargetLanguage = document.getElementById('ai-target-language');
    const aiSourceLanguage = document.getElementById('ai-source-language');

    let pageContent = '';

    // --- MISE À JOUR DU TITRE DYNAMIQUE ---
    const viewAskSemia = document.getElementById('view-Ask-Semia');
    const titleElement = viewAskSemia?.querySelector('.view-header h3');
    const subtitleElement = viewAskSemia?.querySelector('.view-header p');

    async function updateHeaderTitle(provider) {
        if (!titleElement) return;

        let providerName = 'an IA';
        let providerRemark = '';
        if (provider === 'openai') {
            providerName = 'OpenAI';
            providerRemark = 'Attention c\'est OpenAI tout de même🚨';
        } else if (provider === 'gemini') {
            providerName = 'Gemini';
            providerRemark = 'Attention c\'est Google tout de même🚨';
        } else if (provider === 'anthropic') {
            providerName = 'Anthropic';
            providerRemark = 'Bientôt disponible...⛔';
        } else if (provider === 'semia') {
            providerName = 'SEMIA';
            providerRemark = 'IA conseillée par l\'ONERA✌️';
        } else if (provider === 'mistral') {
            providerName = 'Mistral';
            providerRemark = 'Au moins c\'est français🥖';
        }

        // Vérifier si le provider est prêt
        const isReady = await checkProviderReady(provider);

        // Construire le titre avec le statut
        let statusHTML = '';
        if (isReady) {
            statusHTML = '<span style="color: #16a34a; font-size: 14px; margin-left: 10px;">(Ready)</span>';
        } else {
            statusHTML = `
                <span style="color: #dc2626; font-size: 14px; margin-left: 10px;">(Not ready)</span>
                <button id="goto-settings-btn" style="background: none; border: none; cursor: pointer; margin-left: 5px;" title="Aller aux paramètres">
                    <i data-lucide="settings" style="width: 18px; height: 18px; color: #dc2626;"></i>
                </button>
            `;
        }

        titleElement.innerHTML = `🧠 Ask ${providerName} ${statusHTML}`;
        subtitleElement.innerHTML = providerRemark;

        // Réinitialiser les icônes Lucide
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // Ajouter l'event listener pour le bouton settings
        const gotoSettingsBtn = document.getElementById('goto-settings-btn');
        if (gotoSettingsBtn) {
            gotoSettingsBtn.addEventListener('click', () => {
                // Naviguer vers la page des paramètres
                const settingsMenuItem = document.querySelector('[data-view="settings"]');
                if (settingsMenuItem) {
                    settingsMenuItem.click();
                }
            });
        }

        // Gérer le sous-titre SEMIA
        const existingSubtitle = document.getElementById('semia-subtitle');
        if (existingSubtitle) existingSubtitle.remove();

        if (provider === 'semia') {
            const subtitle = document.createElement('div');
            subtitle.id = 'semia-subtitle';
            subtitle.style.color = '#dc2626'; // Rouge
            subtitle.style.fontSize = '12px';
            subtitle.style.marginTop = '-5px';
            subtitle.style.marginBottom = '5px';
            subtitle.style.fontWeight = 'bold';
            subtitle.textContent = '(Secured @ONERA)';
            titleElement.after(subtitle);
        }
    }

    // Vérifier si le provider est configuré et prêt
    async function checkProviderReady(provider) {
        if (!provider) return false;

        const storageKey = `ai_${provider}`;
        const result = await chrome.storage.local.get([storageKey]);
        const settings = result[storageKey] || {};

        // Un provider est prêt s'il a au minimum une clé API
        return !!settings.apiKey;
    }

    // Charger le provider au démarrage
    chrome.storage.local.get(['aiProvider'], async (result) => {
        await updateHeaderTitle(result.aiProvider || 'semia');
    });

    // Écouter les changements de paramètres
    chrome.storage.onChanged.addListener(async (changes, namespace) => {
        if (namespace === 'local') {
            // Recharger le titre si le provider change ou si les settings changent
            if (changes.aiProvider) {
                await updateHeaderTitle(changes.aiProvider.newValue);
            } else {
                // Vérifier si un des ai_* a changé
                const currentProvider = await chrome.storage.local.get(['aiProvider']);
                await updateHeaderTitle(currentProvider.aiProvider || 'semia');
            }
        }
    });
    // --------------------------------------

    function showStatus(msg, isError = false) {
        if (!statusDiv) return;
        statusDiv.textContent = msg;
        statusDiv.style.background = isError ? '#fee2e2' : '#dcfce7';
        statusDiv.style.color = isError ? '#991b1b' : '#166534';
        statusDiv.style.display = 'block';
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }

    // Fonction injectée pour lire le contenu
    function getPageText() {
        return document.body.innerText;
    }

    // 1. Scraper la page avec chrome.scripting
    async function scrapePage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) {
                showStatus("Aucun onglet actif", true);
                return;
            }

            // Vérifier si on peut scripter cette page
            if (tab.url.startsWith('chrome://')) {
                showStatus("Impossible de lire les pages système Chrome", true);
                return;
            }

            // Injecter un script pour récupérer le texte
            const results = await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: getPageText
            });

            if (results && results[0] && results[0].result) {
                pageContent = results[0].result;
                // Limiter la taille pour éviter de dépasser les tokens (ex: 15k chars)
                if (pageContent.length > 15000) {
                    pageContent = pageContent.substring(0, 15000) + "... [tronqué]";
                }

                if (analyzeBtn) analyzeBtn.disabled = false;
                showStatus(`✅ Page lue (${pageContent.length} caractères)`);
            } else {
                showStatus("Impossible de lire le contenu", true);
            }
        } catch (error) {
            console.error(error);
            showStatus("Erreur de lecture (Permission?)", true);
        }
    }

    // 2. Analyser avec l'IA
    async function analyzePage() {
        const question = questionInput?.value.trim();
        if (!pageContent) {
            showStatus("Veuillez d'abord lire la page", true);
            return;
        }
        if (!question) {
            showStatus("Posez une question", true);
            return;
        }

        // Récupérer les paramètres
        const result = await chrome.storage.local.get(['aiProvider']);
        const provider = result.aiProvider || 'semia';
        const storageKey = `ai_${provider}`;
        const providerSettings = await chrome.storage.local.get([storageKey]);
        const settings = providerSettings[storageKey] || {};

        if (!settings.apiKey) {
            showStatus("❌ Clé API manquante (voir Paramètres)", true);
            return;
        }

        if (analyzeBtn) {
            analyzeBtn.textContent = 'Analyse en cours...';
            analyzeBtn.disabled = true;
        }
        if (answerDiv) answerDiv.innerHTML = '<em style="color:#666">Réflexion en cours...</em>';

        try {
            let answer = '';

            const systemrole = `Tu es un assistant utile qui analyse le contenu d'une page web fourni.`;
            const userrole = `Voici le contenu de la page :\n\n${pageContent}\n\nQuestion :`;

            if (provider === 'semia') {
                answer = await callSemiaAI(settings.apiKey, settings.model || 'gpt-oss:120b', systemrole, userrole, question);
            } else if (provider === 'mistral') {
                answer = await callMistral(settings.apiKey, settings.model || 'open-mistral-nemo', systemrole, userrole, question);
            } else if (provider === 'openai') {
                answer = await callOpenAI(settings.apiKey, settings.model || 'gpt-4o-mini', systemrole, userrole, question);
            } else if (provider === 'gemini') {
                answer = await callGemini(settings.apiKey, settings.model || 'gemini-1.5-flash', systemrole, userrole, question);
            } else if (provider === 'anthropic') {
                answer = "L'intégration Anthropic arrive bientôt.";
            } else {
                answer = "Fournisseur non supporté.";
            }

            if (answerDiv) answerDiv.innerHTML = `<strong>🤖 Réponse :</strong><br>${formatText(answer)}`;
            showStatus("Analyse terminée !");

        } catch (error) {
            console.error(error);
            if (answerDiv) answerDiv.innerHTML = `<strong style="color:red">Erreur:</strong> ${error.message}`;
            showStatus("Erreur lors de l'analyse", true);
        } finally {
            if (analyzeBtn) {
                analyzeBtn.textContent = '✨ Analyser avec IA';
                analyzeBtn.disabled = false;
            }
        }
    }


    // 3. Traduire avec l'IA
    async function translateText(tranlationNOTdictionary) {
        const textToTranslate = aiTextToTranslate?.value.trim();
        if (!textToTranslate) {
            showStatus("Veuillez d'abord entrer le texte", true);
            return;
        }
        if (!aiTargetLanguage) {
            showStatus("Veuillez d'abord sélectionner la langue cible", true);
            return;
        }
        if (!aiSourceLanguage) {
            showStatus("Veuillez d'abord sélectionner la langue source", true);
            return;
        }

        // Récupérer les paramètres
        const result = await chrome.storage.local.get(['aiProvider']);
        const provider = result.aiProvider || 'semia';
        const storageKey = `ai_${provider}`;
        const providerSettings = await chrome.storage.local.get([storageKey]);
        const settings = providerSettings[storageKey] || {};

        if (!settings.apiKey) {
            showStatus("❌ Clé API manquante (voir Paramètres)", true);
            return;
        }
        const systemrole = `Tu es un assistant utile qui traduit le texte fourni.`;
        let userrole = ``;
        if (tranlationNOTdictionary) {
            userrole = `Traduis le texte suivant de ${aiSourceLanguage.value} vers ${aiTargetLanguage.value} en appliquant une équivalence dynamique (adaptation naturelle du sens et du contexte culturel, sans littéralisme).
            Respecte ces contraintes :

            Ton neutre : Évite les biais émotionnels ou stylistiques, privilégie la clarté et la précision.
            Complexité experte : Utilise un registre technique ou spécialisé si nécessaire, mais reste accessible à un public averti.
        Longueur standard : Conserve la concision du texte original sans ajouter ni omettre dinformations essentielles.
        Fidélité sémantique : Transmets les nuances, les sous-entendus et les références culturelles avec des équivalents adaptés à ${aiTargetLanguage.value}.
        Cohérence terminologique : Si le texte contient des termes techniques, utilise les équivalents standardisés dans ${aiTargetLanguage.value} (précise si un glossaire est disponible).
        Exemple de style attendu :

        Pour un texte juridique : termes précis, structure logique.
        Pour un texte scientifique : rigueur terminologique, phrases fluides.
        Pour un texte littéraire : adaptation des images et des rythmes, sans perte de profondeur.
        Texte à traduire :`;
        } else {
            userrole = `Traduis les termes suivants un à un en donnant les définitions pour chacun d'entre eux de ${aiSourceLanguage.value} vers ${aiTargetLanguage.value}.
            Respecte ces contraintes :

            Ton neutre : Évite les biais émotionnels ou stylistiques, privilégie la clarté et la précision des définitions.
            Complexité experte : Utilise un registre technique ou spécialisé si nécessaire, mais reste accessible à un public averti.
        
        Fidélité sémantique : Transmets les nuances, les sous-entendus et les références culturelles avec des équivalents adaptés à ${aiTargetLanguage.value}.
        Cohérence terminologique : Si nécessaire, utilise les équivalents standardisés dans ${aiTargetLanguage.value} (précise si un glossaire est disponible).
        Termes à traduire :`;
        }

        if (tranlationNOTdictionary && aiTranslateBtn) {
            aiTranslateBtn.textContent = 'Traduction en cours...';
            aiTranslateBtn.disabled = true;
        } else if (!tranlationNOTdictionary && aiDictionaryBtn) {
            aiDictionaryBtn.textContent = 'Traduction en cours...';
            aiDictionaryBtn.disabled = true;
        }

        if (aiTranslation) aiTranslation.innerHTML = '<em style="color:#666">Traduction en cours...</em>';

        try {
            let answer = '';

            if (provider === 'semia') {
                answer = await callSemiaAI(settings.apiKey, settings.model || 'gpt-oss:120b', systemrole, userrole, textToTranslate);
            } else if (provider === 'mistral') {
                answer = await callMistral(settings.apiKey, settings.model || 'open-mistral-nemo', systemrole, userrole, textToTranslate);
            } else if (provider === 'openai') {
                answer = await callOpenAI(settings.apiKey, settings.model || 'gpt-4o-mini', systemrole, userrole, textToTranslate);
            } else if (provider === 'gemini') {
                answer = await callGemini(settings.apiKey, settings.model || 'gemini-1.5-flash', systemrole, userrole, textToTranslate);
            } else if (provider === 'anthropic') {
                answer = "L'intégration Anthropic arrive bientôt.";
            } else {
                answer = "Fournisseur non supporté.";
            }

            if (aiTranslation) aiTranslation.innerHTML = `<strong>🤖 Réponse :</strong><br>${formatText(answer)}`;
            showStatus("Analyse terminée !");

        } catch (error) {
            console.error(error);
            if (aiTranslation) aiTranslation.innerHTML = `<strong style="color:red">Erreur:</strong> ${error.message}`;
            showStatus("Erreur lors de l'analyse", true);
        } finally {
            if (tranlationNOTdictionary && aiTranslateBtn) {
                aiTranslateBtn.textContent = '✨ Traduire avec IA';
                aiTranslateBtn.disabled = false;
            } else if (!tranlationNOTdictionary && aiDictionaryBtn) {
                aiDictionaryBtn.textContent = '✨ Dictionnaire IA';
                aiDictionaryBtn.disabled = false;
            }
        }
    }


    // Appel SEMIA
    async function callSemiaAI(apiKey, model, systemrole, userrole, prompt) {
        const response = await fetch('http://semia:8080/api/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: systemrole },
                    { role: "user", content: `${userrole}\n\n${prompt}` }
                ]
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Erreur API SEMIA');
        return data.choices[0].message.content;
    }

    // Appel OpenAI
    async function callOpenAI(apiKey, model, systemrole, userrole, prompt) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: "system",
                        content: `${systemrole}`
                    },
                    {
                        role: "user",
                        content: `${userrole}\n\n${prompt}`
                    }
                ],
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Erreur API OpenAI');
        return data.choices[0].message.content;
    }

    // Appel Mistral
    /**
     * Appel API Mistral AI pour analyse de page web
     * @param {string} apiKey - Clé API Mistral (https://console.mistral.ai)
     * @param {string} model - Modèle Mistral (ex: "mistral-large-latest", "mistral-small", "open-mistral-nemo")
     * @param {string} systemrole - Rôle système
     * @param {string} userrole - Rôle utilisateur
     * @param {string} prompt - Question de l'utilisateur
     * @returns {Promise<string>} Réponse de l'IA
     */
    async function callMistral(apiKey, model, systemrole, userrole, prompt) {
        const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    {
                        role: "system",
                        content: `${systemrole}`
                    },
                    {
                        role: "user",
                        content: `${userrole}\n\n${prompt}`
                    }
                ],
                max_tokens: 2000,
                temperature: 0.3
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || `Erreur API Mistral: ${response.status} \n${systemrole}\n${userrole}\n${prompt}`);
        }
        return data.choices[0].message.content;
    }

    // Appel Gemini
    async function callGemini(apiKey, model, systemrole, userrole, prompt) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: {
                    parts: [{ text: systemrole }]
                },
                contents: [{
                    role: "user",
                    parts: [{ text: `${userrole}\n\n${prompt}` }]
                }]
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || `Erreur API Gemini: ${response.status}`);
        }

        // Vérifier si la réponse contient du contenu
        if (!data.candidates || data.candidates.length === 0) {
            throw new Error("Gemini n'a pas retourné de réponse. Le contenu a peut-être été filtré.");
        }

        const candidate = data.candidates[0];
        if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
            throw new Error("Réponse vide de Gemini. Le contenu a peut-être été filtré pour des raisons de sécurité.");
        }

        return candidate.content.parts[0].text;
    }

    // Formatage simple (Markdown basic -> HTML)
    function formatText(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
            .replace(/\n/g, '<br>');
    }

    // Events
    if (scrapeBtn) scrapeBtn.addEventListener('click', scrapePage);
    if (analyzeBtn) analyzeBtn.addEventListener('click', analyzePage);
    if (aiTranslateBtn) aiTranslateBtn.addEventListener('click', () => translateText(true));
    if (aiDictionaryBtn) aiDictionaryBtn.addEventListener('click', () => translateText(false));

    if (questionInput) {
        questionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) { // Ctrl+Enter pour envoyer
                analyzePage();
            }
        });
    }

    // Initialiser la navigation aussi ici pour être sûr
    if (typeof initAIToolsNavigation === 'function') {
        initAIToolsNavigation();
    }
}

// Initialisation de la navigation des outils IA
function initAIToolsNavigation() {
    console.log("Initialisation navigation outils IA...");

    const toolCards = document.querySelectorAll('.tool-card[data-target]');
    const toolsGrid = document.querySelector('.tools-grid');
    const mainToolsView = toolsGrid ? toolsGrid.closest('.view-content') : null;

    // Liste explicite des sous-vues pour être sûr
    const subViewIds = ['view-Ask-Webpage', 'view-Chat-IA', 'view-Translation-IA', 'view-Ecrire-IA'];

    // Masquer les sous-vues au démarrage
    subViewIds.forEach(id => {
        const view = document.getElementById(id);
        if (view) view.style.display = 'none';
    });

    if (mainToolsView) {
        mainToolsView.style.display = 'block';
    }

    // Fonction pour afficher une vue spécifique
    function showView(targetId) {
        // Cacher le menu principal
        if (mainToolsView) mainToolsView.style.display = 'none';

        // Cacher toutes les sous-vues
        subViewIds.forEach(id => {
            const view = document.getElementById(id);
            if (view) view.style.display = 'none';
        });

        // Afficher la vue cible
        const targetView = document.getElementById(targetId);
        if (targetView) {
            targetView.style.display = 'block';

            // Ajouter un bouton retour si pas déjà présent
            if (!targetView.querySelector('.back-btn')) {
                const backBtn = document.createElement('button');
                backBtn.className = 'back-btn';
                backBtn.innerHTML = '← Retour aux outils';
                backBtn.style.marginBottom = '15px';
                backBtn.style.background = 'none';
                backBtn.style.border = 'none';
                backBtn.style.color = 'var(--primary-color)';
                backBtn.style.cursor = 'pointer';
                backBtn.style.padding = '0';
                backBtn.style.fontSize = '14px';
                backBtn.style.fontWeight = 'bold';

                backBtn.onclick = () => {
                    targetView.style.display = 'none';
                    if (mainToolsView) mainToolsView.style.display = 'block';
                };

                targetView.insertBefore(backBtn, targetView.firstChild);
            }
        }
    }

    // Attacher les événements aux cartes
    toolCards.forEach(card => {
        // Cloner le noeud pour supprimer les anciens event listeners si on ré-initialise
        const newCard = card.cloneNode(true);
        card.parentNode.replaceChild(newCard, card);

        newCard.addEventListener('click', () => {
            const targetId = newCard.getAttribute('data-target');
            if (targetId) {
                showView(targetId);
            }
        });
    });
}

// Appeler l'initialisation
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAIToolsNavigation);
} else {
    initAIToolsNavigation();
}

// Exposer globalement
window.initAIToolsNavigation = initAIToolsNavigation;
