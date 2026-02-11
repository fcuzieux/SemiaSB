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

// Formatage plus complet (Markdown -> HTML)
function formatText(text) {
    if (!text) return '';

    // 1. Protection XSS basique (on échappe < et > sauf si on veut autoriser du HTML sûr, mais ici on convertit MD->HTML)
    // On va faire la conversion en HTML, donc on n'échappe pas tout brutalement à la fin, mais on traite le texte.
    // Idéalement, on échappe d'abord les caractères spéciaux HTML qui ne sont pas du markdown
    let html = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    // 2. Code blocks (```code```)
    html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

    // 3. Inline code (`code`)
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // 4. Headers (## Title)
    // On commence par le h1..h6
    html = html.replace(/^###### (.*$)/gm, '<h6>$1</h6>');
    html = html.replace(/^##### (.*$)/gm, '<h5>$1</h5>');
    html = html.replace(/^#### (.*$)/gm, '<h4>$1</h4>');
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

    // 5. Bold (**text**)
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // 5bis. Bold (__text__)
    html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');

    // 6. Italic (*text*) - Attention à ne pas casser le bold
    html = html.replace(/\*([^\*]+)\*/g, '<em>$1</em>');

    // 7. Lists
    // Unordered list (- item)
    // On remplace les tirets en début de ligne par des puces. 
    // Pour faire propre, il faudrait wrapper dans <ul> mais sur une regex simple c'est dur.
    // On va simuler avec des divs ou juste • 
    // Mieux: utiliser replace avec une fonction pour wrapper si possible, sinon simple substitution
    html = html.replace(/^\s*-\s+(.*$)/gm, '<li>$1</li>');
    // Si on a des <li> qui se suivent, on pourrait essayer de les wrapper, mais pour l'instant :
    // On va laisser les <li> tels quels, le navigateur gère souvent mal les <li> orphelins hors <ul>.
    // Astuce simple : remplacer par "• $1<br>" si on ne veut pas gérer les <ul>
    // Ou alors on tente le wrap global des listes.

    // Approche simple et robuste pour l'affichage style chat : 
    // On remplace - item par <div style="margin-left:20px;">• $1</div>
    html = html.replace(/^\s*-\s+(.*$)/gm, '<div style="margin-left: 20px; display: list-item; list-style-type: disc;">$1</div>');


    // 8. Links ([text](url))
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    // 9. Citations / Blockquotes (> text)
    html = html.replace(/^\> (.*$)/gm, '<blockquote style="border-left: 3px solid #ccc; margin-left:10px; padding-left:10px; color:#555;">$1</blockquote>');

    // 10. Line breaks
    // On remplace les \n restants par <br>, mais on essaie de ne pas casser les balises blocs qu'on vient d'insérer
    // (h1-h6, pre, div, blockquote finissent déjà la ligne visuellement)

    // On remplace les \n par <br> sauf s'ils suivent une fermeture de bloc
    html = html.replace(/\n/g, '<br>');

    // Nettoyage des <br> superflus après des headers ou blocs
    html = html.replace(/(<\/(h[1-6]|pre|div|blockquote)>)<br>/g, '$1');

    return html;
}

// Vérifier si le provider est configuré et prêt
async function checkProviderReady(provider) {
    if (!provider) return false;

    // Support Localhost (via Bridge)
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
        if (window.extensionSettings) {
            const storageKey = `ai_${provider}`;
            const settings = window.extensionSettings[storageKey] || {};
            return !!settings.apiKey;
        }
        return false;
    }

    const storageKey = `ai_${provider}`;
    const result = await chrome.storage.local.get([storageKey]);
    const settings = result[storageKey] || {};

    // Un provider est prêt s'il a au minimum une clé API
    return !!settings.apiKey;
}

// Récupérer les paramètres du provider actuel
async function getProviderSettings() {
    // Support Localhost (via Bridge)
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
        if (window.extensionSettings) {
            const provider = window.extensionSettings.aiProvider || 'semia';
            const storageKey = `ai_${provider}`;
            const settings = window.extensionSettings[storageKey] || {};
            return { provider, settings };
        }
        console.warn("getProviderSettings: chrome.storage absent et window.extensionSettings vide.");
        return { provider: 'semia', settings: {} };
    }

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
