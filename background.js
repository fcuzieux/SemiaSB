// background.js (MV3 Firefox)
// browser.action.onClicked.addListener(() => {
// // Ouvre la sidebar (SemiaSB) dans la fenêtre active
// browser.sidebarAction.open(); // [web:220][web:222]
// });
// background.js commun Chrome + Firefox

// Détection Firefox (runtime.getBrowserInfo est spécifique Firefox)
const isFirefox =
  typeof browser !== "undefined" &&
  browser.runtime &&
  typeof browser.runtime.getBrowserInfo === "function";

// Namespace unifié
const api = typeof browser !== "undefined" ? browser : chrome;

// Listener sur l'icône d’action
api.action.onClicked.addListener((tab) => {
  if (isFirefox) {
    // Firefox : ouvrir la sidebar declarée via sidebar_action
    // api.sidebarAction.open();
    return;
  }

  // Chrome (et autres Chromium) : ouvrir le side panel
  if (api.sidePanel && typeof api.sidePanel.open === "function") {
    api.sidePanel.open({ windowId: tab.windowId });
  } else {
    // Fallback éventuel : popup ou onglet d’options, si besoin
    // api.runtime.openOptionsPage();
  }
});

// ===== GESTION DES MESSAGES (BRIDGE) =====
const pendingTransfers = {};

async function handleSaveMedia(request) {
  try {
    const { dataUrl, filename } = request;
    console.log(`[Background] handleSaveMedia pour ${filename}`);

    const items = await api.storage.local.get(['backupFolder']);
    let folder = items.backupFolder || '';

    if (folder.includes(':') || folder.startsWith('/') || folder.startsWith('\\')) {
      folder = folder.split(/[/\\]/).pop();
    }
    folder = folder.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '');

    let finalPath = filename;
    if (folder) {
      finalPath = `${folder}/${filename}`;
    }

    const downloadId = await api.downloads.download({
      url: dataUrl,
      filename: finalPath,
      saveAs: false,
      conflictAction: 'uniquify'
    });

    if (request.metadata) {
      await saveVideoMetadata(request.metadata, finalPath);
    }

    return { success: true, id: downloadId };
  } catch (e) {
    console.error("[Background] Erreur handleSaveMedia:", e);
    return { success: false, error: e.message };
  }
}

api.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "GET_SETTINGS") {
    // Ne récupérer que les clés de paramètres (PAS savedVideos qui contient des thumbnails énormes)
    const settingsKeys = ['aiProvider', 'backupFolder', 'ai_semia', 'ai_mistral', 'ai_openai', 'ai_gemini', 'ai_anthropic'];
    api.storage.local.get(settingsKeys, (items) => sendResponse(items));
    return true;
  }

  if (request.action === "SAVE_MEDIA") {
    handleSaveMedia(request).then(sendResponse);
    return true;
  }

  if (request.action === "SAVE_MEDIA_CHUNK") {
    const { transferId, chunk, index, total, filename, metadata } = request;
    if (!pendingTransfers[transferId]) {
      pendingTransfers[transferId] = { chunks: new Array(total), received: 0, filename, metadata };
    }
    pendingTransfers[transferId].chunks[index] = chunk;
    pendingTransfers[transferId].received++;
    if (metadata) pendingTransfers[transferId].metadata = metadata;

    if (pendingTransfers[transferId].received === total) {
      const dataUrl = pendingTransfers[transferId].chunks.join("");
      const finalMetadata = pendingTransfers[transferId].metadata;
      delete pendingTransfers[transferId];

      handleSaveMedia({ dataUrl, filename, metadata: finalMetadata }).then(sendResponse);
      return true;
    } else {
      sendResponse({ success: true, status: "chunk_received" });
    }
  }

  if (request.action === "SAVE_METADATA") {
    saveVideoMetadata(request.metadata, request.filename)
      .then(() => sendResponse({ success: true }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (request.action === "OPEN_VIDEO") {
    // Nouvelle fonctionnalité : Ouvrir la vidéo nativement
    const filename = request.filename;
    console.log(`[Background] Demande ouverture vidéo : ${filename}`);

    // Stratégie 1: Recherche par filename exact (pour ceux qui ont le path complet) mais aussi par query simple
    api.downloads.search({
      query: [filename],
      orderBy: ['-startTime'], // On veut le plus récent
      limit: 1
    }, (results) => {
      if (results && results.length > 0) {
        const item = results[0];
        console.log(`[Background] Fichier trouvé (ID: ${item.id}, Path: ${item.filename}). Ouverture...`);

        if (item.state === 'complete' && item.exists) {
          api.downloads.open(item.id);
          sendResponse({ success: true, method: 'open' });
        } else {
          console.warn(`[Background] Fichier trouvé mais invalide/supprimé (State: ${item.state}, Exists: ${item.exists})`);
          sendResponse({ success: false, error: "Fichier supprimé ou déplacé du disque." });
        }
      } else {
        // Stratégie 2: Essai avec basename (si le fichier avait un path)
        const baseName = filename.split(/[/\\]/).pop();
        if (baseName !== filename) {
          console.log(`[Background] Tentative de recherche fuzzy avec basename: ${baseName}`);
          api.downloads.search({ query: [baseName], orderBy: ['-startTime'], limit: 1 }, (res2) => {
            if (res2 && res2.length > 0 && res2[0].state === 'complete' && res2[0].exists) {
              api.downloads.open(res2[0].id);
              sendResponse({ success: true, method: 'open_fuzzy' });
            } else {
              console.warn(`[Background] Fichier introuvable même en fuzzy.`);
              sendResponse({ success: false, error: "Fichier introuvable dans l'historique." });
            }
          });
          return; // On attend le callback du 2ème search
        }

        console.warn(`[Background] Aucun téléchargement correspondant à : ${filename}`);
        sendResponse({ success: false, error: "Fichier non trouvé dans l'historique." });
      }
    });

    return true; // Async response
  }
});

// Helper pour indexer les vidéos sans forcément les télécharger (Anti-Crash)
async function saveVideoMetadata(metadata, filename) {
  try {
    const finalMetadata = { ...metadata };
    finalMetadata.filename = filename;

    // On s'assure que l'ID est unique
    if (!finalMetadata.id) finalMetadata.id = Date.now();

    const storageData = await api.storage.local.get(['savedVideos']);
    const videos = storageData.savedVideos || [];

    // Eviter les doublons si possible (même filename + même date approximative)
    const exists = videos.some(v => v.filename === filename);
    if (!exists) {
      videos.push(finalMetadata);
      await api.storage.local.set({ savedVideos: videos });
      console.log(`[Background] Métadonnées indexées pour : ${filename}`);
    }
  } catch (e) {
    console.error("[Background] Erreur saveVideoMetadata:", e);
    throw e;
  }
}
