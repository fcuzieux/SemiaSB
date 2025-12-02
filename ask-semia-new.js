// ===== POINT D'ENTRÉE PRINCIPAL POUR LES FONCTIONS IA =====
// Ce fichier initialise toutes les fonctions IA et gère le titre dynamique

// Fonction principale d'initialisation de l'IA
function initAIFunction() {
    // Initialiser les différentes fonctions IA
    initAnalyzeFunction();
    initTranslateFunction();

    // Initialiser la mise à jour du titre dynamique
    initDynamicTitle();
}

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
