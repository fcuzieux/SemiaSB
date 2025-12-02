// ===== GESTION DES PARAMÈTRES =====

function initSettings() {
    const providerSelect = document.getElementById('settings-provider');
    const apiKeyInput = document.getElementById('settings-api-key');
    const modelInput = document.getElementById('settings-model');
    const backupFolderInput = document.getElementById('settings-backup-folder');
    const selectFolderBtn = document.getElementById('select-folder-btn');
    const saveBtn = document.getElementById('settings-save-btn');
    const statusDiv = document.getElementById('settings-status');

    let selectedBackupFolder = '';

    // Charger les paramètres du provider actuel
    async function loadProviderSettings(provider) {
        const storageKey = `ai_${provider}`;
        const result = await chrome.storage.local.get([storageKey, 'aiProvider']);

        const providerData = result[storageKey] || {};
        apiKeyInput.value = providerData.apiKey || '';
        modelInput.value = providerData.model || '';

        // Mettre à jour le placeholder du modèle selon le provider
        updateModelPlaceholder(provider);
    }

    // Charger le dossier de sauvegarde
    async function loadBackupFolder() {
        const result = await chrome.storage.local.get(['backupFolder']);
        if (result.backupFolder) {
            selectedBackupFolder = result.backupFolder;
            backupFolderInput.value = result.backupFolder;
        }
    }

    // Mettre à jour le placeholder du champ modèle
    function updateModelPlaceholder(provider) {
        const placeholders = {
            'semia': 'gpt-oss:120b',
            'mistral': 'open-mistral-nemo',
            'openai': 'gpt-4o-mini',
            'gemini': 'gemini-2.5-flash',
            'anthropic': 'claude-3-5-sonnet-20241022'
        };
        modelInput.placeholder = placeholders[provider] || 'Modèle par défaut';
    }

    // Charger les paramètres au démarrage
    chrome.storage.local.get(['aiProvider'], (result) => {
        const currentProvider = result.aiProvider || 'semia';
        providerSelect.value = currentProvider;
        loadProviderSettings(currentProvider);
        loadBackupFolder();
    });

    // Écouter le changement de provider
    providerSelect?.addEventListener('change', () => {
        const selectedProvider = providerSelect.value;
        loadProviderSettings(selectedProvider);
    });

    // Sélectionner un dossier de sauvegarde
    selectFolderBtn?.addEventListener('click', async () => {
        try {
            // Note: Chrome extensions ne peuvent pas directement ouvrir un sélecteur de dossier
            // On utilise chrome.downloads.setShelfEnabled pour suggérer un dossier
            // L'utilisateur devra entrer manuellement le chemin
            const userInput = prompt('Entrez le chemin du dossier de sauvegarde (ex: C:\\Users\\YourName\\Downloads\\SemiaSB):', selectedBackupFolder);
            if (userInput !== null && userInput.trim() !== '') {
                selectedBackupFolder = userInput.trim();
                backupFolderInput.value = selectedBackupFolder;
            }
        } catch (error) {
            console.error('Erreur lors de la sélection du dossier:', error);
            showStatus('❌ Erreur lors de la sélection du dossier', true);
        }
    });

    // Sauvegarder les paramètres
    saveBtn?.addEventListener('click', async () => {
        const provider = providerSelect.value;
        const apiKey = apiKeyInput.value.trim();
        const model = modelInput.value.trim();

        if (!apiKey) {
            showStatus('❌ La clé API est requise', true);
            return;
        }

        // Sauvegarder les données du provider actuel et le dossier de sauvegarde
        const storageKey = `ai_${provider}`;
        const dataToSave = {
            aiProvider: provider,
            [storageKey]: {
                apiKey: apiKey,
                model: model
            },
            backupFolder: selectedBackupFolder
        };

        chrome.storage.local.set(dataToSave, () => {
            showStatus('✅ Tous les paramètres sauvegardés !');
        });
    });

    function showStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.style.color = isError ? 'var(--error-text)' : 'var(--success-text)';
        setTimeout(() => {
            statusDiv.textContent = '';
        }, 3000);
    }
}
