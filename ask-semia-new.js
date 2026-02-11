// ===== POINT D'ENTRÉE PRINCIPAL POUR LES FONCTIONS IA =====
// Ce fichier initialise toutes les fonctions IA et gère le titre dynamique

// Fonction principale d'initialisation de l'IA
function initAIFunction() {
    // Initialiser les différentes fonctions IA
    initAnalyzeFunction();
    initTranslateFunction();
    initChatFunction();
    initPDFChat();

    // Initialiser la mise à jour du titre dynamique
    initDynamicTitle();

    // Initialiser la navigation entre les outils IA
    initAIToolsNavigation();
}

// --- NAVIGATION ENTRE LES OUTILS IA ---
function initAIToolsNavigation() {
    console.log("Initialisation navigation outils IA...");

    const toolCards = document.querySelectorAll('.tool-card[data-target]');
    const toolsGrid = document.querySelector('.tools-grid');
    const mainToolsView = toolsGrid ? toolsGrid.closest('.view-content') : null;

    // Liste explicite des sous-vues pour être sûr
    const subViewIds = ['view-Ask-Webpage', 'view-Chat-IA', 'view-Translation-IA', 'view-Ecrire-IA', 'view-Chat-PDF'];

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

// Exposer globalement pour que sidepanel.js puisse l'appeler
window.initAIToolsNavigation = initAIToolsNavigation;


// --- MISE À JOUR DU TITRE DYNAMIQUE ---
function initDynamicTitle() {
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

        titleElement.innerHTML = `<i data-lucide="sparkles"></i> Ask ${providerName} ${statusHTML}`;
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
}
