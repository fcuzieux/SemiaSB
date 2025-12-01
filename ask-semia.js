import OpenAI from 'openai'
// ===== FONCTION MODULAIRE : ANALYSE IA DE PAGE =====

function initAIFunction() {
    const scrapeBtn = document.getElementById('ai-scrape-btn');
    const questionInput = document.getElementById('ai-question');
    const analyzeBtn = document.getElementById('ai-analyze-btn');
    const answerDiv = document.getElementById('ai-answer');
    const statusDiv = document.getElementById('ai-status');

    let pageContent = '';

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
        const settings = await chrome.storage.local.get(['aiProvider', 'aiApiKey', 'aiModel']);
        if (!settings.aiApiKey) {
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

            if (settings.aiProvider === 'semia') {
                answer = await callSemiaAI(settings.aiApiKey, settings.aiModel || 'gpt-oss:120b', pageContent, question);
            } else if (settings.aiProvider === 'openai') {
                answer = await callOpenAI(settings.aiApiKey, settings.aiModel || 'gpt-4o-mini', pageContent, question);
            } else if (settings.aiProvider === 'gemini') {
                answer = await callGemini(settings.aiApiKey, settings.aiModel || 'gemini-1.5-flash', pageContent, question);
            } else if (settings.aiProvider === 'anthropic') {
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
        const semia = new OpenAI({
            apiKey: apiKey,
            baseURL: 'http://semia:8080/api',
        });
        const response = await semia.chat.completions.create({
            model: model,
            messages: [
                { role: "system", content: "Tu es un assistant utile qui analyse le contenu d'une page web fourni." },
                { role: "user", content: `Voici le contenu de la page :\n\n${context}\n\nQuestion : ${prompt}` }
            ]
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || 'Erreur API OpenAI-SEMIA');
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
        if (!response.ok) throw new Error(data.error?.message || 'Erreur API OpenAI-SEMIA');
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
