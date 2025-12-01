// ===== FONCTION MODULAIRE : ANALYSE IA DE PAGE =====

function initAIFunction() {
    const scrapeBtn = document.getElementById('ai-scrape-btn');
    const questionInput = document.getElementById('ai-question');
    const analyzeBtn = document.getElementById('ai-analyze-btn');
    const answerDiv = document.getElementById('ai-answer');
    const statusDiv = document.getElementById('ai-status');

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

    function showStatus(message, isError = false) {
        if (!statusDiv) return;
        statusDiv.textContent = message;
        statusDiv.style.background = isError ? '#fee2e2' : '#dcfce7';
        statusDiv.style.color = isError ? '#991b1b' : '#166534';
        statusDiv.style.display = 'block';
        setTimeout(() => statusDiv.style.display = 'none', 4000);
    }

    // Fonction injectée pour lire le contenu
    function getPageText() {
        return document.body.innerText;
    }

    // 1. Scraper la page avec chrome.scripting
    async function scrapePage() {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (!tab) return;

            // Vérifier si on peut scripter cette page
            if (tab.url.startsWith('chrome://')) {
                showStatus("Impossible de lire les pages système Chrome", true);
                return;
            }

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

            if (provider === 'semia') {
                answer = await callSemiaAI(settings.apiKey, settings.model || 'gpt-oss:120b', pageContent, question);
            } else if (provider === 'mistral') {
                answer = await callMistral(settings.apiKey, settings.model || 'mistral', pageContent, question);
            } else if (provider === 'openai') {
                answer = await callOpenAI(settings.apiKey, settings.model || 'gpt-4o-mini', pageContent, question);
            } else if (provider === 'gemini') {
                answer = await callGemini(settings.apiKey, settings.model || 'gemini-1.5-flash', pageContent, question);
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

    // Appel SEMIA
    async function callSemiaAI(apiKey, model, context, prompt) {
        const response = await fetch('http://semia:8080/api/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: "Tu es un assistant utile qui analyse le contenu d'une page web fourni." },
                    { role: "user", content: `Voici le contenu de la page :\n\n${context}\n\nQuestion : ${prompt}` }
                ]
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Erreur API SEMIA');
        return data.choices[0].message.content;
    }

    // Appel OpenAI
    async function callOpenAI(apiKey, model, context, prompt) {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: "system", content: "Tu es un assistant utile qui analyse le contenu d'une page web fourni." },
                    { role: "user", content: `Voici le contenu de la page :\n\n${context}\n\nQuestion : ${prompt}` }
                ]
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
     * @param {string} context - Contenu scrapé de la page
     * @param {string} prompt - Question de l'utilisateur
     * @returns {Promise<string>} Réponse de l'IA
     */
    async function callMistral(apiKey, model, context, prompt) {
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
                        content: "Tu es un assistant utile qui analyse le contenu d'une page web fourni. Réponds de manière concise et précise en français."
                    },
                    {
                        role: "user",
                        content: `Voici le contenu de la page :\n\n${context}\n\nQuestion : ${prompt}`
                    }
                ],
                max_tokens: 2000,
                temperature: 0.3
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || `Erreur API Mistral: ${response.status}`);
        }
        return data.choices[0].message.content;
    }

    // Appel Gemini
    async function callGemini(apiKey, model, context, prompt) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: `Contexte (Page Web):\n${context}\n\nQuestion: ${prompt}` }]
                }]
            })
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Erreur API Gemini');
        return data.candidates[0].content.parts[0].text;
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

    if (questionInput) {
        questionInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) { // Ctrl+Enter pour envoyer
                analyzePage();
            }
        });
    }
}
