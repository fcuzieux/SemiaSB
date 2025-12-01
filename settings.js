// ===== GESTION DES PARAMÈTRES =====

function initSettings() {
    const providerSelect = document.getElementById('settings-provider');
    const apiKeyInput = document.getElementById('settings-api-key');
    const modelInput = document.getElementById('settings-model');
    const saveBtn = document.getElementById('settings-save-btn');
    const statusDiv = document.getElementById('settings-status');

    // Charger les paramètres existants
    chrome.storage.local.get(['aiProvider', 'aiApiKey', 'aiModel'], (result) => {
        if (result.aiProvider) providerSelect.value = result.aiProvider;
        if (result.aiApiKey) apiKeyInput.value = result.aiApiKey;
        if (result.aiModel) modelInput.value = result.aiModel;
    });

    // Sauvegarder les paramètres
    saveBtn?.addEventListener('click', () => {
        const provider = providerSelect.value;
        const apiKey = apiKeyInput.value.trim();
        const model = modelInput.value.trim();

        if (!apiKey) {
            showStatus('❌ La clé API est requise', true);
            return;
        }

        chrome.storage.local.set({
            aiProvider: provider,
            aiApiKey: apiKey,
            aiModel: model
        }, () => {
            showStatus('✅ Paramètres sauvegardés !');

            // Réinitialiser Ask Semia si nécessaire
            if (typeof initAIFunction === 'function') {
                // On pourrait recharger la config ici si besoin
            }
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
