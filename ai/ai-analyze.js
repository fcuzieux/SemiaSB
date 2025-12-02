// ===== FONCTION D'ANALYSE IA DE PAGE WEB =====

// Fonction injectée pour lire le contenu
function getPageText() {
    return document.body.innerText;
}

// Scraper la page avec chrome.scripting
async function scrapePage() {

    console.log("scrapePage()...");
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) {
            console.log("Aucun onglet actif");
            showStatusUtils("Aucun onglet actif", true);
            return null;
        }

        // Vérifier si on peut scripter cette page
        if (tab.url.startsWith('chrome://')) {
            console.log("Impossible de lire les pages système Chrome");
            showStatusUtils("Impossible de lire les pages système Chrome", true);
            return null;
        }

        // Injecter un script pour récupérer le texte
        const results = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: getPageText
        });

        console.log("results:", results);
        if (results && results[0] && results[0].result) {
            let pageContent = results[0].result;
            console.log("pageContent:", pageContent);
            // Limiter la taille pour éviter de dépasser les tokens (ex: 15k chars)
            if (pageContent.length > 15000) {
                pageContent = pageContent.substring(0, 15000) + "... [tronqué]";
            }

            const analyzeBtn = document.getElementById('ai-analyze-btn');

            if (analyzeBtn) analyzeBtn.disabled = false;
            showStatusUtils(`✅ Page lue (${pageContent.length} caractères)/15k`);
            return pageContent;
        } else {
            console.log("Impossible de lire le contenu");
            showStatusUtils("Impossible de lire le contenu", true);
            return null;
        }
    } catch (error) {
        console.error(error);
        console.log("Erreur de lecture (Permission?)");
        showStatusUtils("Erreur de lecture (Permission?)", true);
        return null;
    }
}

// Analyser avec l'IA
async function analyzePage(pageContent, question) {
    if (!pageContent) {
        showStatusUtils("Veuillez d'abord lire la page", true);
        return null;
    }
    if (!question) {
        showStatusUtils("Posez une question", true);
        return null;
    }

    // Récupérer les paramètres
    const { provider, settings } = await getProviderSettings();

    if (!settings.apiKey) {
        showStatusUtils("❌ Clé API manquante (voir Paramètres)", true);
        return null;
    }

    const analyzeBtn = document.getElementById('ai-analyze-btn');
    const answerDiv = document.getElementById('ai-answer');

    if (analyzeBtn) {
        analyzeBtn.textContent = 'Analyse en cours...';
        analyzeBtn.disabled = true;
    }
    if (answerDiv) answerDiv.innerHTML = '<em style="color:#666">Réflexion en cours...</em>';

    try {
        const systemrole = `Tu es un assistant utile qui analyse le contenu d'une page web fourni.`;
        const userrole = `Voici le contenu de la page :\n\n${pageContent}\n\nQuestion :`;

        const answer = await callAI(provider, settings.apiKey, settings.model, systemrole, userrole, question);

        if (answerDiv) answerDiv.innerHTML = `<strong>🤖 Réponse :</strong><br>${formatText(answer)}`;
        showStatusUtils("Analyse terminée !");
        return answer;

    } catch (error) {
        console.error(error);
        if (answerDiv) answerDiv.innerHTML = `<strong style="color:red">Erreur:</strong> ${error.message}`;
        showStatusUtils("Erreur lors de l'analyse", true);
        return null;
    } finally {
        if (analyzeBtn) {
            analyzeBtn.textContent = '✨ Analyser avec IA';
            analyzeBtn.disabled = false;
        }
    }
}

// Initialiser la fonction d'analyse
function initAnalyzeFunction() {
    console.log('initAnalyzeFunction called');
    const scrapeBtn = document.getElementById('ai-scrape-btn');
    const analyzeBtn = document.getElementById('ai-analyze-btn');
    const questionInput = document.getElementById('ai-question');

    console.log('scrapeBtn:', scrapeBtn);
    console.log('analyzeBtn:', analyzeBtn);

    let pageContent = '';

    // Event: Lire la page
    if (scrapeBtn) {
        console.log('Adding click listener to scrapeBtn');
        scrapeBtn.addEventListener('click', async () => {
            console.log('scrapeBtn clicked!');
            pageContent = await scrapePage();
        });
    } else {
        console.error('scrapeBtn not found!');
    }

    // Event: Analyser
    if (analyzeBtn) {
        analyzeBtn.addEventListener('click', async () => {
            const question = questionInput?.value.trim();
            await analyzePage(pageContent, question);
        });
    }

    // Event: Ctrl+Enter pour analyser
    if (questionInput) {
        questionInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                const question = questionInput.value.trim();
                await analyzePage(pageContent, question);
            }
        });
    }
}
