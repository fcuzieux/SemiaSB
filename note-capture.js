// ===== FONCTION NOTE-CAPTURE =====

let captures = []; // Tableau pour stocker les captures

function initNoteCapture() {
  const captureBtn = document.getElementById('captureScreenshot');
  const capturesList = document.getElementById('capturesList');
  const exportBtn = document.getElementById('exportNote');
  const copyBtn = document.getElementById('copyNote');
  const exportRow = document.getElementById('exportRow');
  const noteTitleInput = document.getElementById('noteTitle');
  const noteIntroInput = document.getElementById('noteIntro');
  const noteConclusionInput = document.getElementById('noteConclusion');

  // Helper namespace
  function getBrowserAPI() {
    if (typeof browser !== 'undefined' && browser.tabs) return browser;
    return chrome;
  }

  // Capturer une capture d'écran
  captureBtn?.addEventListener('click', async () => {
    try {
      const api = getBrowserAPI();

      // 1) Récupérer l'onglet actif (utile pour vérifier l'URL)
      const [tab] = await api.tabs.query({ active: true, currentWindow: true });
      if (!tab) {
        alert("Aucun onglet actif trouvé.");
        return;
      }

      const url = tab.url || "";

      // 2) Bloquer les pages non capturables (Firefox + Chrome)
      if (
        url.startsWith("about:") ||
        url.startsWith("chrome://") ||
        url.startsWith("moz-extension://") ||
        url.startsWith("chrome-extension://")
      ) {
        alert("Impossible de capturer cet onglet (page système / interne).");
        return;
      }

      // 3) Capture visibleTab (Chrome + Firefox)
      //    - Chrome : chrome.tabs.captureVisibleTab
      //    - Firefox : browser.tabs.captureVisibleTab
      const dataUrl = await api.tabs.captureVisibleTab(tab.windowId, {
        format: "png",
        quality: 100
      });
      // const api = typeof browser !== 'undefined' && browser.tabs ? browser : chrome;

      // captureBtn?.addEventListener('click', async () => {
      // try {
      // const [tab] = await api.tabs.query({ active: true, currentWindow: true });
      // if (!tab) {
      // alert("Aucun onglet actif trouvé.");
      // return;
      // }

      // const url = tab.url || "";
      // if (url.startsWith("about:") || url.startsWith("chrome://") ||
      // url.startsWith("moz-extension://") || url.startsWith("chrome-extension://")) {
      // alert("Impossible de capturer cet onglet (page système / interne).");
      // return;
      // }

      // const dataUrl = await api.tabs.captureVisibleTab(tab.windowId, {
      // format: "png",
      // quality: 100
      // });

      // // ... suite inchangée (captures.push, renderCapture, etc.)
      // } catch (e) {
      // console.error("Erreur capture:", e);
      // alert("Impossible de capturer cet onglet : " + (e.message || e));
      // }
      // });

      // Ajouter la capture au tableau
      const capture = {
        id: Date.now(),
        image: dataUrl,
        note: ""
      };
      captures.push(capture);

      // Afficher la capture
      renderCapture(capture);

      // Afficher le bouton d'export
      if (exportRow) {
        exportRow.style.display = "block";
      }
    } catch (error) {
      console.error("Erreur lors de la capture:", error);
      alert("Impossible de capturer cet onglet : " + (error.message || error));
    }
  });


  // Afficher une capture
  function renderCapture(capture) {
    const captureItem = document.createElement('div');
    captureItem.className = 'capture-item';
    captureItem.dataset.id = capture.id;

    captureItem.innerHTML = `
      <button class="delete-capture" data-id="${capture.id}" title="Supprimer">
        <i data-lucide="trash-2"></i>
      </button>
      <img src="${capture.image}" alt="Capture d'écran">
      <textarea placeholder="Ajoutez une note..." data-id="${capture.id}">${capture.note}</textarea>
    `;

    capturesList.appendChild(captureItem);

    // Initialiser l'icône Lucide
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }

    // Gérer la suppression
    const deleteBtn = captureItem.querySelector('.delete-capture');
    deleteBtn.addEventListener('click', () => deleteCapture(capture.id));

    // Gérer la modification de la note
    const textarea = captureItem.querySelector('textarea');
    textarea.addEventListener('input', (e) => {
      const captureToUpdate = captures.find(c => c.id === capture.id);
      if (captureToUpdate) {
        captureToUpdate.note = e.target.value;
      }
    });
  }

  // Supprimer une capture
  function deleteCapture(id) {
    // Retirer du tableau
    captures = captures.filter(c => c.id !== id);

    // Retirer du DOM
    const captureItem = document.querySelector(`.capture-item[data-id="${id}"]`);
    if (captureItem) {
      captureItem.style.animation = 'fadeOut 0.3s ease';
      setTimeout(() => {
        captureItem.remove();

        // Cacher le bouton d'export si plus de captures
        if (captures.length === 0 && exportRow) {
          exportRow.style.display = 'none';
        }
      }, 300);
    }
  }

  // Exporter en HTML
  exportBtn?.addEventListener('click', async () => {
    if (captures.length === 0) {
      alert('Aucune capture à exporter.');
      return;
    }

    // Récupérer le titre
    let title = noteTitleInput.value.trim();
    // Récupérer l'introduction
    let intro = noteIntroInput.innerHTML;// noteIntroInput.value.trim();
    // Récupérer la conclusion
    let conclusion = noteConclusionInput.innerHTML;// noteConclusionInput.value.trim();
    if (!title) {
      title = "Note Capture";
    }

    // Générer le HTML
    const htmlContent = generateHTML(title, intro, conclusion);

    // Créer un blob et télécharger
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    // Nom du fichier basé sur le titre
    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `${safeTitle}-${timestamp}.html`;

    // Récupérer le dossier de sauvegarde configuré
    const settings = await chrome.storage.local.get(['backupFolder']);
    const backupFolder = settings.backupFolder || '';

    // Note: Chrome ne permet pas de spécifier un chemin absolu dans filename
    const downloadOptions = {
      url: url,
      filename: filename,
      saveAs: true
    };

    // Si un dossier de sauvegarde est configuré, créer un sous-dossier relatif
    if (backupFolder) {
      const folderName = backupFolder.split(/[/\\]/).pop() || 'SemiaSB';
      downloadOptions.filename = `${folderName}/${filename}`;
    }

    if (chrome.downloads && chrome.downloads.download) {
      chrome.downloads.download(downloadOptions, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Download error:', chrome.runtime.lastError);
          // Fallback
          triggerDownload(url, filename);
        } else {
          alert(`✅ Note sauvegardée : ${filename}`);

          // --- SAUVEGARDE (Split Storage) ---
          const noteId = Date.now();
          const thumbnail = captures.length > 0 ? captures[0].image : '';

          // 1. Metadata (Léger pour la liste)
          const noteMeta = {
            id: noteId,
            type: 'note',
            title: title,
            date: new Date().toISOString(),
            filename: downloadOptions.filename,
            thumbnail: thumbnail
          };

          // 2. Contenu Lourd (Stocké à part)
          const noteContent = {
            id: noteId,
            intro: intro,
            conclusion: conclusion,
            captures: captures
          };

          chrome.storage.local.get(['savedNotes'], (result) => {
            const notes = result.savedNotes || [];
            notes.push(noteMeta);

            // Sauvegarde atomique : metadonnées + contenu
            chrome.storage.local.set({
              savedNotes: notes,
              [`note_content_${noteId}`]: noteContent
            });
          });
          // -------------------------------------
        }
        URL.revokeObjectURL(url);
      });
    } else {
      triggerDownload(url, filename);
      URL.revokeObjectURL(url);
    }
  });

  copyBtn?.addEventListener('click', async () => {
    if (captures.length === 0) {
      alert('Aucune capture à copier.');
      return;
    }

    let title = noteTitleInput.value.trim();
    let intro = noteIntroInput.innerHTML;
    let conclusion = noteConclusionInput.innerHTML;
    if (!title) {
      title = "Note Capture";
    }

    // Générer le HTML
    const htmlContent = generateHTML(title, intro, conclusion);

    try {
      // Version rich text pour Word / OneNote
      const blob = new Blob([htmlContent], { type: "text/html" });
      const item = new ClipboardItem({ "text/html": blob });
      await navigator.clipboard.write([item]);

      alert('✅ Note copiée dans le presse-papiers (format riche)');
    } catch (e) {
      console.error(e);
      alert('❌ Erreur lors de la copie dans le presse-papiers');
    }
  });

  // Générer le HTML pour l'export
  function generateHTML(title, intro, conclusion) {
    const capturesHTML = captures.map((capture, index) => `
      <div class="capture-block">
        <h2>Capture ${index + 1}</h2>
        <img src="${capture.image}" alt="Capture ${index + 1}">
        <div class="note">
          <h3>Note :</h3>
          <p>${capture.note || '<em>Aucune note</em>'}</p>
        </div>
      </div>
    `).join('');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${new Date().toLocaleDateString('fr-FR')}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8f9fa;
      padding: 40px 20px;
      color: #1f2937;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    h1 {
      color: #6366f1;
      margin-bottom: 10px;
      font-size: 32px;
    }
    .date {
      color: #6b7280;
      margin-bottom: 40px;
      font-size: 14px;
    }
    .capture-block {
      margin-bottom: 40px;
      padding-bottom: 40px;
      border-bottom: 2px solid #e5e7eb;
    }
    .capture-block:last-child {
      border-bottom: none;
    }
    .capture-block h2 {
      color: #1f2937;
      margin-bottom: 20px;
      font-size: 24px;
    }
    .capture-block img {
      width: 100%;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      margin-bottom: 20px;
    }
    .note {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 8px;
      border-left: 4px solid #6366f1;
    }
    .note h3 {
      color: #6366f1;
      margin-bottom: 10px;
      font-size: 16px;
    }
    .note p {
      color: #4b5563;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .note em {
      color: #9ca3af;
    }
    @media print {
      body {
        background: white;
        padding: 0;
      }
      .container {
        box-shadow: none;
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📝 Note Capture</h1>
    <p class="date">Créé le ${new Date().toLocaleString('fr-FR')}</p>
    <h1>${title}</h1>
    <div class="note">
      <h3>Introduction :</h3>
      <p>${intro || '<em>Aucune note</em>'}</p>
    </div>
    ${capturesHTML}
    <div class="note">
      <h3>Conclusion :</h3>
      <p>${conclusion || '<em>Aucune note</em>'}</p>
    </div>
  </div>
</body>
</html>`;
  }

  // Fonction helper pour télécharger
  async function triggerDownload(url, filename) {
    const api = typeof browser !== "undefined" ? browser : chrome;

    // 1. Tenter via l'API downloads de l'extension si dispo
    if (api && api.downloads && api.downloads.download) {
      const result = await api.storage.local.get(['backupFolder']);
      let backupFolder = result.backupFolder || '';
      let finalPath = filename;

      if (backupFolder) {
        let cleanFolder = backupFolder;
        if (cleanFolder.includes(':') || cleanFolder.startsWith('/') || cleanFolder.startsWith('\\')) {
          cleanFolder = cleanFolder.split(/[/\\]/).pop();
        }
        cleanFolder = cleanFolder.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '');
        if (cleanFolder) finalPath = `${cleanFolder}/${filename}`;
      }

      try {
        await api.downloads.download({
          url: url,
          filename: finalPath,
          saveAs: false
        });
        showStatus(`✅ Note sauvegardée dans : ${finalPath}`);
        return;
      } catch (e) {
        console.warn("Erreur chrome.downloads, fallback vers lien direct:", e);
      }
    }

    // 2. Fallback classique (navigateur)
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;

    // Tentative de prepend pour le téléchargement natif
    let nativeFilename = filename;
    const resultFallback = await (typeof chrome !== 'undefined' ? chrome : browser).storage.local.get(['backupFolder']);
    let backupFolderFB = resultFallback.backupFolder || '';
    if (backupFolderFB) {
      let cleanFolder = backupFolderFB;
      if (cleanFolder.includes(':') || cleanFolder.startsWith('/') || cleanFolder.startsWith('\\')) {
        cleanFolder = cleanFolder.split(/[/\\]/).pop();
      }
      cleanFolder = cleanFolder.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '');
      if (cleanFolder) nativeFilename = `${cleanFolder}/${filename}`;
    }

    a.download = nativeFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    alert(`✅ Note sauvegardée : ${nativeFilename}`);
  }

  // Initialiser

}

// Animation fadeOut pour la suppression
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeOut {
    from {
      opacity: 1;
      transform: scale(1);
    }
    to {
      opacity: 0;
      transform: scale(0.95);
    }
  }
`;
document.head.appendChild(style);
