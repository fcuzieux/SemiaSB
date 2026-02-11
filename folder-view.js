// ===== VUE DOSSIER (FOLDER VIEW) =====
function initFolderView() {
  const notesContainer = document.getElementById('notesList');
  const videosContainer = document.getElementById('videosList');
  if (!notesContainer || !videosContainer) return;

  const detailBtn = document.getElementById('open-detailed-view-btn');
  if (detailBtn) {
    detailBtn.addEventListener('click', () => {
      window.open('myfiles.html', '_blank');
    });
  }

  // Namespace unifié
  const api = typeof browser !== 'undefined' ? browser : chrome;
  const hasDownloadsApi = !!(api.downloads && api.downloads.search);

  // Helper pour ouverture du fichier sauvegardé
  async function openSavedFile(data) {
    const api = typeof browser !== 'undefined' ? browser : chrome;
    const isFirefox =
      typeof browser !== 'undefined' &&
      browser.runtime &&
      typeof browser.runtime.getBrowserInfo === 'function';

    const filenameOnly = data.filename.split(/[/\\]/).pop();

    // Chrome : garder la logique actuelle avec downloads.search + open
    if (!isFirefox && api.downloads && api.downloads.search) {
      try {
        const settings = await api.storage.local.get(['backupFolder']);
        const backupFolder = settings.backupFolder || '';

        api.downloads.search({ query: [filenameOnly] }, (results) => {
          if (!results || results.length === 0) {
            // Uniquement pour les notes : fallback vers l'éditeur
            const type = data.type || (data.filename && data.filename.endsWith('.html') ? 'note' : 'video');
            if (type === 'note') {
              console.log(`[FolderView] Note introuvable dans l'historique : ${filenameOnly}. Fallback éditeur.`);
              const url = api.runtime.getURL(`edit-note.html?id=${data.id}`);
              window.open(url, '_blank');
              return;
            }
            alert(`Fichier introuvable dans l'historique des téléchargements : ${filenameOnly}`);
            return;
          }

          let matches = results;

          if (backupFolder) {
            const normalizedBackup = backupFolder.replace(/\\/g, '/').toLowerCase();
            matches = results.filter(res => {
              const resPath = res.filename.replace(/\\/g, '/').toLowerCase();
              return resPath.includes(normalizedBackup);
            });
            if (matches.length === 0) {
              matches = results;
            }
          }

          const bestMatch = matches.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0];
          if (bestMatch && api.downloads.open) {
            api.downloads.open(bestMatch.id);
          } else {
            const type = data.type || (data.filename && data.filename.endsWith('.html') ? 'note' : 'video');
            if (type === 'note') {
              const url = api.runtime.getURL(`edit-note.html?id=${data.id}`);
              window.open(url, '_blank');
            } else {
              alert(`Fichier introuvable : ${filenameOnly}`);
            }
          }
        });
      } catch (err) {
        console.error("Erreur lors de l'ouverture (Chrome):", err);
        alert(`Erreur lors de l'ouverture : ${err.message || err}`);
      }
      return;
    }

    // Firefox : on ne passe plus par l'historique des téléchargements
    try {
      // 1) Si tu as stocké l'URL source dans data (ex: data.url), tu peux la rouvrir :
      if (data.url) {
        window.open(data.url, '_blank');
        return;
      }

      // 2) Sinon, retélécharger depuis l'extension si le fichier est packagé,
      //    ou simplement redemander un téléchargement du fichier existant.

      // Si tu as sauvegardé les fichiers dans l'extension : utiliser runtime.getURL
      if (api.runtime && api.runtime.getURL && data.filename) {
        const url = api.runtime.getURL(data.filename); // ex: "captures/xxx.webm"
        window.open(url, '_blank');
        return;
      }

      alert("Sous Firefox, l'ouverture directe du fichier téléchargé n'est pas disponible.\nTu peux l'ouvrir depuis ton dossier de téléchargements.");
    } catch (err) {
      console.error("Erreur lors de l'ouverture (Firefox):", err);
      alert(`Erreur lors de l'ouverture : ${err.message || err}`);
    }
  }

  // Helper to create item element
  function createItem(data, type) {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.style.display = 'flex';
    item.style.justifyContent = 'space-between';
    item.style.alignItems = 'center';
    item.style.padding = '10px';
    item.style.border = '1px solid var(--border-color)';
    item.style.borderRadius = 'var(--radius)';
    item.style.marginBottom = '8px';
    item.style.cursor = 'pointer';
    item.style.backgroundColor = '#3a3a4dff';
    item.style.transition = 'all 0.2s';
    item.style.position = 'relative';

    item.onmouseover = () => {
      item.style.backgroundColor = '#17324dff';
      item.style.transform = 'translateY(-2px)';
      item.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
    };
    item.onmouseout = () => {
      item.style.backgroundColor = '#3a3a4dff';
      item.style.transform = 'none';
      item.style.boxShadow = 'none';
    };

    const dateStr = new Date(data.date).toLocaleString('fr-FR');

    const textDiv = document.createElement('div');
    textDiv.style.flex = '1';
    textDiv.style.marginRight = '10px';
    textDiv.innerHTML = `
      <div style="font-weight:600; font-size: 14px; margin-bottom: 4px; word-break: break-word;">${data.title}</div>
      <div style="color:var(--text-secondary); font-size:11px;">${dateStr}</div>
    `;

    const rightDiv = document.createElement('div');
    rightDiv.style.display = 'flex';
    rightDiv.style.alignItems = 'center';
    rightDiv.style.gap = '10px';

    const iconImg = document.createElement('img');
    iconImg.style.width = '48px';
    iconImg.style.height = '36px';
    iconImg.style.objectFit = 'cover';
    iconImg.style.borderRadius = '4px';
    iconImg.style.border = '1px solid #eee';

    if (data.thumbnail) {
      iconImg.src = data.thumbnail;
    } else {
      iconImg.src = data.type === 'video' ? 'icons/video-icon.png' : 'icons/note-icon.png';
      iconImg.onerror = () => { iconImg.style.display = 'none'; };
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.innerHTML = '<i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>';
    deleteBtn.style.background = 'none';
    deleteBtn.style.border = 'none';
    deleteBtn.style.color = '#ef4444';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.style.padding = '4px';
    deleteBtn.style.borderRadius = '4px';
    deleteBtn.style.display = 'flex';
    deleteBtn.style.alignItems = 'center';
    deleteBtn.style.justifyContent = 'center';
    deleteBtn.title = "Supprimer de la liste";

    deleteBtn.onmouseover = () => deleteBtn.style.backgroundColor = '#fee2e2';
    deleteBtn.onmouseout = () => deleteBtn.style.backgroundColor = 'transparent';

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      showDeleteConfirmation(data.id, type);
    });

    rightDiv.appendChild(iconImg);
    rightDiv.appendChild(deleteBtn);

    item.appendChild(textDiv);
    item.appendChild(rightDiv);

    // Click to open file
    item.addEventListener('click', async () => {
      await openSavedFile(data);
    });


    return item;
  }

  function showDeleteConfirmation(id, type) {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    overlay.style.zIndex = '1000';
    overlay.style.display = 'flex';
    overlay.style.justifyContent = 'center';
    overlay.style.alignItems = 'center';

    const dialog = document.createElement('div');
    dialog.style.backgroundColor = '#fff';
    dialog.style.padding = '20px';
    dialog.style.borderRadius = '8px';
    dialog.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
    dialog.style.maxWidth = '300px';
    dialog.style.textAlign = 'center';

    const text = document.createElement('p');
    text.textContent = "Voulez-vous vraiment effacer ce contenu de vos dossiers ?";
    text.style.marginBottom = '20px';
    text.style.color = '#374151';

    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.display = 'flex';
    buttonsDiv.style.justifyContent = 'center';
    buttonsDiv.style.gap = '10px';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Abandonner';
    cancelBtn.style.padding = '8px 16px';
    cancelBtn.style.border = '1px solid #d1d5db';
    cancelBtn.style.borderRadius = '4px';
    cancelBtn.style.backgroundColor = '#fff';
    cancelBtn.style.cursor = 'pointer';
    cancelBtn.onclick = () => document.body.removeChild(overlay);

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Supprimer';
    deleteBtn.style.padding = '8px 16px';
    deleteBtn.style.border = 'none';
    deleteBtn.style.borderRadius = '4px';
    deleteBtn.style.backgroundColor = '#ef4444';
    deleteBtn.style.color = '#fff';
    deleteBtn.style.cursor = 'pointer';
    deleteBtn.onclick = () => {
      deleteItem(id, type);
      document.body.removeChild(overlay);
    };

    buttonsDiv.appendChild(cancelBtn);
    buttonsDiv.appendChild(deleteBtn);

    dialog.appendChild(text);
    dialog.appendChild(buttonsDiv);
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);
  }

  function deleteItem(id, type) {
    const storageKey = type === 'note' ? 'savedNotes' : 'savedVideos';
    api.storage.local.get([storageKey], (result) => {
      let items = result[storageKey] || [];
      const initialLength = items.length;
      items = items.filter(item => item.id !== id);
      if (items.length < initialLength) {
        api.storage.local.set({ [storageKey]: items }, () => {
          initFolderView();
        });
      }
    });
  }

  // Charger les Notes
  api.storage.local.get(['savedNotes'], (result) => {
    const notes = result.savedNotes || [];
    notesContainer.innerHTML = '';

    if (notes.length > 0) {
      notes.sort((a, b) => new Date(b.date) - new Date(a.date));
      notes.forEach(note => {
        notesContainer.appendChild(createItem(note, 'note'));
      });
    } else {
      notesContainer.innerHTML = '<p style="color: var(--text-secondary); font-size: 13px; font-style: italic;">Pas de note sauvegardée.</p>';
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
  });

  // Charger les Vidéos
  api.storage.local.get(['savedVideos'], (result) => {
    const videos = result.savedVideos || [];
    console.log("[FolderView] Vidéos chargées du stockage:", videos);
    videosContainer.innerHTML = '';

    if (videos.length > 0) {
      videos.sort((a, b) => new Date(b.date) - new Date(a.date));
      videos.forEach(video => {
        videosContainer.appendChild(createItem(video, 'video'));
      });
    } else {
      videosContainer.innerHTML = '<p style="color: var(--text-secondary); font-size: 13px; font-style: italic;">Pas de vidéo sauvegardée.</p>';
    }

    if (typeof lucide !== 'undefined') lucide.createIcons();
  });
}
