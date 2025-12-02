// ===== UTILITAIRES COMMUNS POUR LES FONCTIONS IA =====

// Afficher un message de statut
function showStatusUtils(msg, isError = false) {
    const statusDiv = document.getElementById('ai-status');
    console.log('showStatusUtils called:', msg, 'statusDiv found:', !!statusDiv);
    if (!statusDiv) return;

    statusDiv.textContent = msg;
    statusDiv.style.background = isError ? '#fee2e2' : '#dcfce7';
    statusDiv.style.color = isError ? '#991b1b' : '#166534';
    statusDiv.style.border = `1px solid ${isError ? '#fca5a5' : '#86efac'}`;
    statusDiv.style.display = 'block';
    statusDiv.style.padding = '8px';
    statusDiv.style.borderRadius = '6px';
    statusDiv.style.fontSize = '12px';
    statusDiv.style.marginTop = '8px';
    if (isError) {
        setTimeout(() => {
            statusDiv.style.display = 'none';
        }, 5000);
    }

}

// Formatage simple (Markdown basic -> HTML)
function formatText(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')
        .replace(/\n/g, '<br>');
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

// Récupérer les paramètres du provider actuel
async function getProviderSettings() {
    const result = await chrome.storage.local.get(['aiProvider']);
    const provider = result.aiProvider || 'semia';
    const storageKey = `ai_${provider}`;
    const providerSettings = await chrome.storage.local.get([storageKey]);
    const settings = providerSettings[storageKey] || {};

    return { provider, settings };
}

// Exposer les fonctions globalement pour qu'elles soient accessibles entre les fichiers
window.showStatusUtils = showStatusUtils;
window.formatText = formatText;
window.checkProviderReady = checkProviderReady;
window.getProviderSettings = getProviderSettings;
