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

    const linkFolderBtn = document.getElementById('link-folder-btn');
    const linkStatusIcon = document.getElementById('link-status-icon');
    const linkFolderPath = document.getElementById('link-folder-path');

    // Charger l'état du lien au démarrage
    async function loadLinkState() {
        if (typeof CaptureStorage !== 'undefined') {
            const handle = await CaptureStorage.getHandle('backupDirHandle');
            if (handle) {
                updateLinkUI(true);
            }
        }
    }

    function updateLinkUI(isLinked) {
        if (isLinked) {
            linkStatusIcon.innerHTML = '<i data-lucide="link-2"></i>';
            linkStatusIcon.style.color = '#10b981';
            linkStatusIcon.title = "Dossier lié";
            if (linkFolderPath) linkFolderPath.style.display = 'block';
        } else {
            linkStatusIcon.innerHTML = '<i data-lucide="unlink"></i>';
            linkStatusIcon.style.color = '#ef4444';
            linkStatusIcon.title = "Dossier non lié";
            if (linkFolderPath) linkFolderPath.style.display = 'none';
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    // Sélectionner un dossier via File System Access API
    linkFolderBtn?.addEventListener('click', async () => {
        try {
            if (typeof window.showDirectoryPicker !== 'function') {
                alert("Votre navigateur ne supporte pas l'API File System Access.");
                return;
            }

            const handle = await window.showDirectoryPicker({
                mode: 'readwrite'
            });

            if (handle && typeof CaptureStorage !== 'undefined') {
                await CaptureStorage.saveHandle('backupDirHandle', handle);
                updateLinkUI(true);
                showStatus('✅ Dossier lié pour l\'éditeur !');
            }
        } catch (error) {
            if (error.name === 'AbortError') return;
            console.error('Erreur liaison dossier:', error);
            showStatus('❌ Erreur lors de la liaison', true);
        }
    });

    // Sélectionner un dossier de sauvegarde (Nom du dossier relatif)
    selectFolderBtn?.addEventListener('click', async () => {
        try {
            const userInput = prompt('Entrez le nom du dossier de sauvegarde dans Téléchargements (ex: SemiaSB):', selectedBackupFolder);
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

    // Charger les paramètres au démarrage
    chrome.storage.local.get(['aiProvider'], (result) => {
        const currentProvider = result.aiProvider || 'semia';
        providerSelect.value = currentProvider;
        loadProviderSettings(currentProvider);
        loadBackupFolder();
        loadLinkState();
    });

    function showStatus(message, isError = false) {
        if (!statusDiv) return;
        statusDiv.textContent = message;
        statusDiv.style.color = isError ? 'var(--error-text)' : 'var(--success-text)';
        setTimeout(() => {
            statusDiv.textContent = '';
        }, 3000);
    }
}
