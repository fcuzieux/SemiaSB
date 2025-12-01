
// ===== VUE DOSSIER (FOLDER VIEW) =====
function initFolderView() {
    const notesContainer = document.getElementById('notesList');
    const videosContainer = document.getElementById('videosList');

    if (!notesContainer || !videosContainer) return;

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
        item.style.backgroundColor = '#fff';
        item.style.transition = 'all 0.2s';
        item.style.position = 'relative'; // Pour positionner des éléments si besoin

        item.onmouseover = () => {
            item.style.backgroundColor = '#f9fafb';
            item.style.transform = 'translateY(-2px)';
            item.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
        };
        item.onmouseout = () => {
            item.style.backgroundColor = '#fff';
            item.style.transform = 'none';
            item.style.boxShadow = 'none';
        };

        const dateStr = new Date(data.date).toLocaleString('fr-FR');

        // Container for text
        const textDiv = document.createElement('div');
        textDiv.style.flex = '1';
        textDiv.style.marginRight = '10px';
        textDiv.innerHTML = `
      <div style="font-weight:600; font-size: 14px; margin-bottom: 4px; word-break: break-word;">${data.title}</div>
      <div style="color:var(--text-secondary); font-size:11px;">${dateStr}</div>
    `;

        // Container for right side (Thumbnail + Delete)
        const rightDiv = document.createElement('div');
        rightDiv.style.display = 'flex';
        rightDiv.style.alignItems = 'center';
        rightDiv.style.gap = '10px';

        // Icon/Thumbnail
        const iconImg = document.createElement('img');
        iconImg.style.width = '48px';
        iconImg.style.height = '36px';
        iconImg.style.objectFit = 'cover';
        iconImg.style.borderRadius = '4px';
        iconImg.style.border = '1px solid #eee';

        // Use stored thumbnail or fallback
        if (data.thumbnail) {
            iconImg.src = data.thumbnail;
        } else {
            iconImg.src = data.type === 'video' ? 'icons/video-icon.png' : 'icons/note-icon.png';
            // Fallback if icon missing
            iconImg.onerror = () => { iconImg.style.display = 'none'; };
        }

        // Delete Button
        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i data-lucide="trash-2" style="width: 16px; height: 16px;"></i>';
        deleteBtn.style.background = 'none';
        deleteBtn.style.border = 'none';
        deleteBtn.style.color = '#ef4444'; // Red color
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
            e.stopPropagation(); // Empêcher l'ouverture du fichier
            showDeleteConfirmation(data.id, type);
        });

        rightDiv.appendChild(iconImg);
        rightDiv.appendChild(deleteBtn);

        item.appendChild(textDiv);
        item.appendChild(rightDiv);

        // Click to open file
        item.addEventListener('click', async () => {
            // Tenter d'ouvrir le fichier via chrome.downloads
            const filename = data.filename.split(/[/\\]/).pop(); // Juste le nom

            // Récupérer le dossier de sauvegarde pour vérifier le chemin
            const settings = await chrome.storage.local.get(['backupFolder']);
            const backupFolder = settings.backupFolder || '';

            chrome.downloads.search({ query: [filename] }, (results) => {
                if (results && results.length > 0) {
                    // Filtrer pour trouver celui qui est dans le bon dossier (si configuré)
                    let matches = results;

                    if (backupFolder) {
                        // Normaliser les séparateurs pour la comparaison
                        const normalizedBackup = backupFolder.replace(/\\/g, '/').toLowerCase();

                        matches = results.filter(res => {
                            const resPath = res.filename.replace(/\\/g, '/').toLowerCase();
                            return resPath.includes(normalizedBackup);
                        });
                    }

                    if (matches.length === 0) {
                        matches = results;
                    }

                    const bestMatch = matches.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0];

                    if (bestMatch) {
                        chrome.downloads.open(bestMatch.id);
                    } else {
                        alert(`Fichier introuvable : ${filename}`);
                    }
                } else {
                    alert(`Fichier introuvable dans l'historique des téléchargements : ${filename}`);
                }
            });
        });

        return item;
    }

    // Fonction pour afficher la modale de confirmation
    function showDeleteConfirmation(id, type) {
        // Créer l'overlay
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

        // Créer la boite de dialogue
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

    // Fonction pour supprimer l'élément du storage
    function deleteItem(id, type) {
        const storageKey = type === 'note' ? 'savedNotes' : 'savedVideos';

        chrome.storage.local.get([storageKey], (result) => {
            let items = result[storageKey] || [];
            const initialLength = items.length;

            // Filtrer pour retirer l'élément
            items = items.filter(item => item.id !== id);

            if (items.length < initialLength) {
                chrome.storage.local.set({ [storageKey]: items }, () => {
                    // Rafraîchir la vue
                    initFolderView();
                });
            }
        });
    }

    // Charger les Notes
    chrome.storage.local.get(['savedNotes'], (result) => {
        const notes = result.savedNotes || [];
        notesContainer.innerHTML = '';

        if (notes.length > 0) {
            // Trier par date décroissante
            notes.sort((a, b) => new Date(b.date) - new Date(a.date));
            notes.forEach(note => {
                notesContainer.appendChild(createItem(note, 'note'));
            });
        } else {
            notesContainer.innerHTML = '<p style="color: var(--text-secondary); font-size: 13px; font-style: italic;">Pas de note sauvegardée.</p>';
        }

        // Re-initialiser les icônes Lucide après ajout
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    // Charger les Vidéos
    chrome.storage.local.get(['savedVideos'], (result) => {
        const videos = result.savedVideos || [];
        videosContainer.innerHTML = '';

        if (videos.length > 0) {
            // Trier par date décroissante
            videos.sort((a, b) => new Date(b.date) - new Date(a.date));
            videos.forEach(video => {
                videosContainer.appendChild(createItem(video, 'video'));
            });
        } else {
            videosContainer.innerHTML = '<p style="color: var(--text-secondary); font-size: 13px; font-style: italic;">Pas de vidéo sauvegardée.</p>';
        }

        // Re-initialiser les icônes Lucide après ajout
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });
}