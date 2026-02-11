// ===== FONCTION D'ANALYSE IA DE PAGE WEB =====

// Fonction injectée pour lire le contenu
// getPageText doit être déclarée AVANT scrapePage
function getPageText() {
    try {
        // Extraction texte robuste
        let text = document.documentElement.innerText ||
            document.body.innerText ||
            document.body.textContent;

        // Nettoyer espaces multiples/lignes vides
        text = text.replace(/\s+/g, ' ').trim();
        return text;
    } catch (e) {
        return "";
    }
}


// Scraper la page avec chrome.scripting
// Fonction utilitaire pour détecter le bon namespace
function getBrowserAPI() {
    return typeof chrome !== 'undefined' && chrome.scripting ? chrome : browser;
}

// Votre fonction scrapePage corrigée
// Core scraping function that takes a specific tab ID
async function executeScrape(tabId) {
    try {
        const browserAPI = getBrowserAPI();

        // Target specific tab
        const target = {
            tabId: tabId,
            allFrames: false
        };

        // Inject the script
        const results = await browserAPI.scripting.executeScript({
            target: target,
            func: getPageText
        });

        if (results && results[0] && results[0].result !== undefined) {
            return results[0].result;
        }
        return null;
    } catch (error) {
        console.error(`Error scraping tab ${tabId}:`, error);
        return null;
    }
}

// Scraper la page active (Wrapper pour compatibilité existante)
async function scrapePage() {
    console.log("scrapePage()...");
    try {
        const browserAPI = getBrowserAPI();
        const [tab] = await browserAPI.tabs.query({ active: true, currentWindow: true });

        if (!tab) {
            showStatusUtils("Aucun onglet actif", true);
            return null;
        }

        // Vérification pages système
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('about:') || tab.url.startsWith('moz-extension://')) {
            showStatusUtils("Impossible de lire les pages système", true);
            return null;
        }

        const content = await executeScrape(tab.id);

        if (content) {
            let displayedContent = content;
            if (displayedContent.length > 150000) {
                displayedContent = displayedContent.substring(0, 150000) + "... [tronqué]";
            }

            const analyzeBtn = document.getElementById('ai-analyze-btn');
            if (analyzeBtn) analyzeBtn.disabled = false;
            showStatusUtils(`✅ Page lue (${displayedContent.length} caractères)/150k`);
            return displayedContent;
        } else {
            showStatusUtils("Aucun contenu trouvé sur la page", true);
            return null;
        }
    } catch (error) {
        console.error("Erreur scraping:", error);
        showStatusUtils(`Erreur: ${error.message}`, true);
        return null;
    }
}

// --- NOUVELLES FONCTIONS MULTI-PAGES ---

async function showMultiPageSelection() {
    const browserAPI = getBrowserAPI();
    const tabs = await browserAPI.tabs.query({ currentWindow: true });

    const container = document.getElementById('tabs-list-container');
    const selectionDiv = document.getElementById('multi-page-selection-container');

    if (!container || !selectionDiv) return;

    container.innerHTML = '';
    selectionDiv.style.display = 'block';

    tabs.forEach(tab => {
        // Skip system pages
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('about:') || tab.url.startsWith('moz-extension://')) {
            return;
        }

        const div = document.createElement('div');
        div.style.marginBottom = '5px';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.fontSize = '12px';
        div.style.overflow = 'hidden';
        div.style.textOverflow = 'ellipsis';
        div.style.whiteSpace = 'nowrap';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = tab.id;
        checkbox.dataset.url = tab.url;
        checkbox.dataset.title = tab.title;
        checkbox.style.marginRight = '8px';

        // Auto-select active tab
        if (tab.active) checkbox.checked = true;

        const label = document.createElement('span');
        label.textContent = tab.title || tab.url;
        label.title = tab.title; // Tooltip

        div.appendChild(checkbox);
        div.appendChild(label);
        container.appendChild(div);
    });
}

async function processMultiPageScrape() {
    const container = document.getElementById('tabs-list-container');
    const checkedBoxes = container.querySelectorAll('input[type="checkbox"]:checked');
    const browserAPI = getBrowserAPI();
    const MAX_TOTAL_LENGTH = 150000;

    if (checkedBoxes.length === 0) {
        showStatusUtils("Aucune page sélectionnée", true);
        return null;
    }

    showStatusUtils(`Lecture de ${checkedBoxes.length} pages...`, false);

    let combinedContent = "# Contenu des pages sélectionnées\n\n";
    let successCount = 0;
    let failCount = 0;
    let limitReached = false;

    for (const checkbox of checkedBoxes) {
        if (limitReached) break;

        const checkboxValue = checkbox.value;
        const tabId = parseInt(checkboxValue);
        const url = checkbox.dataset.url;
        const title = checkbox.dataset.title;

        console.log(`Processing tab ${tabId}: ${title}`);

        try {
            // 1. Check tab status first
            let tabInfo = null;
            try {
                tabInfo = await browserAPI.tabs.get(tabId);
            } catch (err) {
                console.error(`Impossible de récupérer les infos de l'onglet ${tabId}`, err);
                combinedContent += `## ${title} (Échec)\n> **Raison :** Onglet introuvable ou fermé.\n\n---\n\n`;
                failCount++;
                continue;
            }

            // 2. Skip restricted URLs manually if not filtered before
            if (url.startsWith('chrome://') || url.startsWith('edge://') || url.startsWith('about:') || url.startsWith('moz-extension://') || url.startsWith('https://chrome.google.com/webstore')) {
                console.warn(`Skipping restricted URL: ${url}`);
                combinedContent += `## ${title} (Ignorée)\n> **Raison :** Page système ou protégée par le navigateur.\n\n---\n\n`;
                failCount++;
                continue;
            }

            // 3. Check for Discarded/Suspended tabs
            if (tabInfo.discarded) {
                console.warn(`Tab ${tabId} is discarded (memory saver).`);
                combinedContent += `## ${title} (Non lue)\n**URL :** ${url}\n> **Raison :** L'onglet est en veille (Memory Saver). Veuillez cliquer sur l'onglet pour le réactiver avant de réessayer.\n\n---\n\n`;
                failCount++;
                continue;
            }

            // 4. Attempt Scrape
            let content = await executeScrape(tabId);

            if (content && content.length > 0) {
                if (content.length > 150000) {
                    content = content.substring(0, 150000) + " [tronqué à 150k]";
                }

                const header = `## ${title}\n**URL :** [Link](${url}) !\n\n`;
                const footer = `\n\n---\n\n`;

                if (combinedContent.length + header.length + content.length + footer.length > MAX_TOTAL_LENGTH) {
                    const remaining = MAX_TOTAL_LENGTH - combinedContent.length - header.length - footer.length;

                    if (remaining > 100) {
                        content = content.substring(0, remaining) + "\n\n> **[STOP : Limite globale de 150k caractères atteinte ici]**";
                        combinedContent += header + content + footer;
                        successCount++;
                    } else {
                        console.warn("Global limit reached heavily, skipping this page completely.");
                    }

                    limitReached = true;
                } else {
                    combinedContent += header + content + footer;
                    successCount++;
                    console.log(`Successfully scraped ${content.length} chars from tab ${tabId}`);
                }
            } else {
                console.error(`Scrape returned empty content for tab ${tabId}`);
                combinedContent += `## ${title} (Échec)\n**URL :** ${url}\n> **Raison :** Impossible d'extraire le texte (Page vide ou protégée).\n\n---\n\n`;
                failCount++;
            }

        } catch (e) {
            console.error(`Critical error processing tab ${tabId}`, e);
            combinedContent += `## ${title} (Erreur Critique)\n> **Erreur :** ${e.message}\n\n---\n\n`;
            failCount++;
        }
    }

    console.log(`Multi-scrape result: ${successCount} successes, ${failCount} failures.`);

    if (successCount > 0 || failCount > 0) {
        // Construct status message
        let statusMsg = `✅ ${successCount} pages lues. (${combinedContent.length} caractères)/150k`;
        if (failCount > 0) statusMsg += ` (⚠️ ${failCount} échouées)`;

        if (limitReached) {
            statusMsg += " ⚠️ Limite 150k atteinte !";
            combinedContent += `\n\n> **⚠️ IMPORTANT :** L'analyse a été tronquée car le volume total de texte dépasse la limite de sécurité de 150 000 caractères. Certaines pages sélectionnées n'ont pas été incluses.`;
        }

        showStatusUtils(statusMsg, failCount > 0 || limitReached); // Red if failures exist or limit reached

        const analyzeBtn = document.getElementById('ai-analyze-btn');
        if (analyzeBtn) analyzeBtn.disabled = false;

        // Hide selection container 
        document.getElementById('multi-page-selection-container').style.display = 'none';

        console.log("Combined Content Check Preview:", combinedContent.substring(0, 150000));
        return combinedContent;
    } else {
        showStatusUtils("Aucune page n'a pu être lue.", true);
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
        const systemrole = `Tu es un assistant IA expert, capable d'analyser et de synthétiser des informations provenant de pages web.
Ta mission est de répondre à la question de l'utilisateur en te basant UNIQUEMENT sur le contenu fourni.

RÈGLES IMPORTANTES :
1. **Format Markdown** : Structure ta réponse avec des titres, des listes à puces et du gras pour la lisibilité.
2. **Citations de Sources** : Chaque affirmation doit être sourcée. Indique TOUJOURS la source en utilisant STRICTEMENT ce format :
   [Titre de la page](URL)
3. **Fidélité** : N'invente rien. Si la réponse n'est pas dans le texte, dis-le.`;

        const userrole = `Voici le contenu des pages à analyser :
--------------------------------------------------
${pageContent}
--------------------------------------------------

Question de l'utilisateur : "${question}"

Réponds à la question de manière claire et structurée en citant tes sources comme demandé ([Titre](URL)).`;

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

// Résumer avec l'IA
async function resumePage(pageContent) {
    console.log("resumePage called");
    if (!pageContent) {
        showStatusUtils("Veuillez d'abord lire la page", true);
        return null;
    }

    // Récupérer les paramètres
    const { provider, settings } = await getProviderSettings();

    if (!settings.apiKey) {
        showStatusUtils("❌ Clé API manquante (voir Paramètres)", true);
        return null;
    }

    const resumeBtn = document.getElementById('ai-resume-btn');
    const answerDiv = document.getElementById('ai-answer');

    if (resumeBtn) {
        resumeBtn.textContent = 'Analyse en cours...';
        resumeBtn.disabled = true;
    }
    if (answerDiv) answerDiv.innerHTML = '<em style="color:#666">Réflexion en cours...</em>';

    try {
        const systemrole = `Tu es SYNTHESIS PRO, un agent IA expert en extraction et synthèse ultra-fidèle de contenu web. Ton unique mission : résumer STRICTEMENT le contenu fourni sans AJOUTER, INTERPRÉTER ou INVENTER aucune information extérieure.

## RÈGLES ABSOLUES (NE JAMAIS VIOLER) :
1. **FIDÉLITÉ TOTALE** : Copie/adapte UNIQUEMENT le texte fourni. Si une info manque → "Non mentionné dans le contenu fourni".
2. **AUCUNE OPINION/GÉNÉRALISATION** : Ton neutre, factuel, objectif. Pas de "je pense", "généralement", "selon les experts".
3. **ZÉRO HALLUCINATION** : Toute donnée doit provenir du contenu fourni avec citation exacte si pertinente.

## FORMAT DE RÉPONSE OBLIGATOIRE :
[TITRE PRINCIPAL inspiré du titre/sujet central des pages]

SOUS-TITRE 1 (5-10 mots, pertinent)
Synthèse concise et fidèle. « Citation exacte si utile » [Source : URL | Section/Paragraphe X]

SOUS-TITRE 2
...

SOUS-TITRE X
...

## LOGIQUE D'ADAPTATION INTELLIGENTE :
- **Nombre de points (X)** : 
  | Contenu | X optimal |
  |---------|-----------|
  | Court/simple | 3-5 |
  | Dense/complexe | 6-10 |
  | Très volumineux/multi-sections | 10+ |
- **TITRE** : Directement inspiré (copie/adapte mot-à-mot) du titre principal ou sujet central.
- **SOUS-TITRES** : Concis (5-10 mots), en **gras**, hiérarchisés par importance.
- **Citations** : UNIQUEMENT si elles renforcent/clarifient. Format : « verbatim » [Source : URL | Ligne/Section].

## COMPORTEMENT :
- Analyse d'abord la structure (titres, sections, densité) pour déterminer X optimal.
- Si plusieurs pages : Indique [Page 1/URL1] par point.
- Réponds UNIQUEMENT avec le résumé structuré. PAS d'intro/conclusion/explications supplémentaires.
- Si contenu insuffisant/ambigu : "Contenu fourni insuffisant pour synthèse structurée."`;

        const userrole = `CONTENU À RÉSUMER :
\`\`\`
${pageContent}
\`\`\`

RÉSUME CE CONTENU selon tes instructions précises.`;

        // Appel AI sans question utilisateur spécifique
        const answer = await callAI(provider, settings.apiKey, settings.model, systemrole, userrole, "");

        if (answerDiv) answerDiv.innerHTML = `<strong>🤖 Résumé Structuré :</strong><br>${formatText(answer)}`;
        showStatusUtils("Résumé terminé !");
        return answer;

    } catch (error) {
        console.error(error);
        if (answerDiv) answerDiv.innerHTML = `<strong style="color:red">Erreur:</strong> ${error.message}`;
        showStatusUtils("Erreur lors de l'analyse", true);
        return null;
    } finally {
        if (resumeBtn) {
            resumeBtn.textContent = '📑 Résumer structuré';
            resumeBtn.disabled = false;
        }
    }
}

// Ecrit une news avec l'IA
async function newsPage(pageContent) {
    console.log("newsPage called");
    if (!pageContent) {
        showStatusUtils("Veuillez d'abord lire la page", true);
        return null;
    }

    // Récupérer les paramètres
    const { provider, settings } = await getProviderSettings();

    if (!settings.apiKey) {
        showStatusUtils("❌ Clé API manquante (voir Paramètres)", true);
        return null;
    }

    const newsBtn = document.getElementById('ai-news-btn');
    const answerDiv = document.getElementById('ai-answer');

    if (newsBtn) {
        newsBtn.textContent = 'Analyse en cours...';
        newsBtn.disabled = true;
    }
    if (answerDiv) answerDiv.innerHTML = '<em style="color:#666">Réflexion en cours...</em>';

    try {
        const systemrole = `Tu es un journaliste tech/web dynamique et expert 📰. Ta mission est de transformer le contenu brut des pages web fournies en une **News percutante et engageante**.

## TES OBJECTIFS :
1. **Accrocher le lecteur** : Titre clicky (mais honnête), ton enjoué et rythme rapide.
2. **Synthétiser l'essentiel** : Ne garde que les infos croustillantes, les nouveautés ou les points clés.
3. **Dynamiser la lecture** : Utilise abondamment des **Emojis** 🚀✨ pour structurer et aérer le texte.
4. **Rester fidèle** : Base-toi uniquement sur le contenu fourni, pas d'invention !

## FORMAT ATTENDU :
**[TITRE ACCROCHEUR AVEC EMOJI]**

👋 **L'Intro qui donne envie** : En 2 phrases, de quoi on parle et pourquoi c'est cool.

🔥 **Les Points Chauds** :
*   👉 Point clé 1
*   👉 Point clé 2
*   👉 ...

💡 **Le Détail qui tue** : Une info spécifique intéressante ou une citation marquante.

🔗 **Pour aller plus loin** : Source : [Titre de la page](URL)

## TON :
Enthousiaste, professionnel mais accessible, moderne.`;

        const userrole = `Voici la matière première pour ta News :
--------------------------------------------------
${pageContent}
--------------------------------------------------

Rédige une News Tech/Web top niveau à partir de ça ! Fais-nous rêver (et informer) ! 🗞️⚡`;

        // Appel AI sans question utilisateur spécifique
        const answer = await callAI(provider, settings.apiKey, settings.model, systemrole, userrole, "");

        if (answerDiv) answerDiv.innerHTML = `<strong>🤖 Gen News IA :</strong><br>${formatText(answer)}`;
        showStatusUtils("News générée !");
        return answer;

    } catch (error) {
        console.error(error);
        if (answerDiv) answerDiv.innerHTML = `<strong style="color:red">Erreur:</strong> ${error.message}`;
        showStatusUtils("Erreur lors de la génération", true);
        return null;
    } finally {
        if (newsBtn) {
            newsBtn.textContent = '� Rédige une News';
            newsBtn.disabled = false;
        }
    }
}
// Initialiser la fonction d'analyse
function initAnalyzeFunction() {
    console.log('initAnalyzeFunction called');
    const scrapeBtn = document.getElementById('ai-scrape-btn');
    const analyzeBtn = document.getElementById('ai-analyze-btn');
    const resumeBtn = document.getElementById('ai-resume-btn');
    const newsBtn = document.getElementById('ai-news-btn');
    const questionInput = document.getElementById('ai-question');

    console.log('scrapeBtn:', scrapeBtn);
    console.log('analyzeBtn:', analyzeBtn);

    let pageContent = '';

    // Event: Lire la page (Single)
    if (scrapeBtn) {
        console.log('Adding click listener to scrapeBtn');
        scrapeBtn.addEventListener('click', async () => {
            console.log('scrapeBtn clicked!');
            // Hide multi selection if open
            const multiSelect = document.getElementById('multi-page-selection-container');
            if (multiSelect) multiSelect.style.display = 'none';

            pageContent = await scrapePage();
        });
    } else {
        console.error('scrapeBtn not found!');
    }

    // Event: Lire plusieurs pages (Multi)
    const scrapeMultiBtn = document.getElementById('ai-scrape-multi-btn');
    const confirmMultiBtn = document.getElementById('confirm-multi-scrape-btn');

    if (scrapeMultiBtn) {
        scrapeMultiBtn.addEventListener('click', () => {
            console.log('scrapeMultiBtn clicked');
            showMultiPageSelection();
        });
    }

    if (confirmMultiBtn) {
        confirmMultiBtn.addEventListener('click', async () => {
            console.log('confirmMultiBtn clicked');
            const result = await processMultiPageScrape();
            if (result) {
                pageContent = result;
            }
        });
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

    // Event: Résumer
    if (resumeBtn) {
        resumeBtn.addEventListener('click', async () => {
            const question = questionInput?.value.trim();
            await resumePage(pageContent, question);
        });
    }

    // Event: News
    if (newsBtn) {
        newsBtn.addEventListener('click', async () => {
            const question = questionInput?.value.trim();
            await newsPage(pageContent, question);
        });
    }
}
