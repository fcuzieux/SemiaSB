
document.addEventListener('DOMContentLoaded', () => {
    // Namespace unifié
    const api = typeof browser !== 'undefined' ? browser : chrome;

    if (typeof lucide !== 'undefined') lucide.createIcons();

    // ====== 1. Fonctions d'affichage (Carousel) ======

    function createCard(data, type) {
        const card = document.createElement('div');
        card.className = 'file-card';
        card.dataset.id = data.id;

        // --- Thumbnail ---
        const img = document.createElement('img');
        img.className = 'file-thumbnail';
        if (data.thumbnail) {
            img.src = data.thumbnail;
        } else {
            // Fallback
            img.src = type === 'video' ? 'icons/video-icon.png' : 'icons/note-icon.png';
            img.onerror = () => {
                img.style.display = 'none';
                card.style.background = 'linear-gradient(45deg, #1e293b, #334155)';
            };
        }

        // --- Icone Type ---
        const iconDiv = document.createElement('div');
        iconDiv.className = 'file-type-icon';
        iconDiv.innerHTML = type === 'video'
            ? '<i data-lucide="video" style="color:#cbd5e1; width:20px; height:16px;"></i>'
            : '<i data-lucide="file-text" style="color:#cbd5e1; width:20px; height:16px;"></i>';

        // --- Info Overlay ---
        const infoDiv = document.createElement('div');
        infoDiv.className = 'file-info';

        const title = document.createElement('div');
        title.className = 'file-title';
        title.textContent = data.title || "Sans titre";

        const date = document.createElement('div');
        date.className = 'file-date';
        date.textContent = new Date(data.date).toLocaleString('fr-FR');

        infoDiv.appendChild(title);
        infoDiv.appendChild(date);

        card.appendChild(img);
        card.appendChild(iconDiv);

        // --- Transcript Icon (if present) ---
        // On check data.hasTranscript (nouveau) ou si on détecte un fichier .txt associé (plus dur sans re-scan)
        if (data.hasTranscript) {
            const transDiv = document.createElement('div');
            transDiv.className = 'file-transcript-icon';
            transDiv.innerHTML = '<i data-lucide="file-text" style="color:#cbd5e1; width:20px; height:16px;"></i>';
            transDiv.title = "Transcription disponible";
            card.appendChild(transDiv);
        }

        // --- Action Icons (Edit & Delete) ---
        // Edit Button
        const editBtn = document.createElement('div');
        editBtn.className = 'file-action-icon action-edit';
        editBtn.innerHTML = '<i data-lucide="pencil" style="color:white; width:16px; height:16px;"></i>';
        editBtn.title = "Éditer";
        editBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent opening file
            handleEditItem(data, type);
        });
        card.appendChild(editBtn);

        // Delete Button
        const deleteBtn = document.createElement('div');
        deleteBtn.className = 'file-action-icon action-delete';
        deleteBtn.innerHTML = '<i data-lucide="trash-2" style="color:#ef4444; width:16px; height:16px;"></i>';
        deleteBtn.title = "Supprimer";
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent opening file
            handleDeleteItem(data.id, type);
        });
        card.appendChild(deleteBtn);

        card.appendChild(infoDiv);

        card.addEventListener('click', () => openSavedFile(data));

        return card;
    }

    // --- Handlers Actions ---

    function handleDeleteItem(id, type) {
        if (confirm("Êtes-vous sûr de vouloir supprimer cet élément définitivement de la liste ?")) {
            const storageKey = type === 'video' ? 'savedVideos' : 'savedNotes';

            api.storage.local.get([storageKey], (result) => {
                let items = result[storageKey] || [];
                const initialLength = items.length;
                items = items.filter(item => item.id !== id);

                if (items.length < initialLength) {
                    api.storage.local.set({ [storageKey]: items }, () => {
                        // Refresh UI
                        if (type === 'video') {
                            allVideos = items;
                            const term = document.getElementById('search-videos')?.value.toLowerCase() || "";
                            const filtered = allVideos.filter(item => (item.title || "").toLowerCase().includes(term));
                            renderCarousel(filtered, 'video', 'videos-track', 'videos-section');
                        } else {
                            allNotes = items;
                            const term = document.getElementById('search-notes')?.value.toLowerCase() || "";
                            const filtered = allNotes.filter(item => (item.title || "").toLowerCase().includes(term));
                            renderCarousel(filtered, 'note', 'notes-track', 'notes-section');
                        }
                    });
                }
            });
        }
    }

    function handleEditItem(data, type) {
        if (type === 'note') {
            const url = api.runtime.getURL(`edit-note.html?id=${data.id}`);
            window.open(url, '_blank');
        } else {
            const url = api.runtime.getURL(`edit-video.html?id=${data.id}`);
            window.open(url, '_blank');
        }
    }

    function renderCarousel(items, type, trackId, sectionId) {
        const track = document.getElementById(trackId);
        const section = document.getElementById(sectionId);
        const container = section.querySelector('.carousel-container');
        if (!track || !container) return;

        track.innerHTML = '';

        // Remove ALL existing arrows if re-rendering
        container.querySelectorAll('.nav-arrow').forEach(a => a.remove());

        if (items.length === 0) {
            track.innerHTML = '<div class="empty-state" style="width:100%;">Aucun élément sauvegardé.</div>';
            return;
        }

        // Chunk items by 8
        const chunkSize = 8;
        const chunks = [];
        for (let i = 0; i < items.length; i += chunkSize) {
            chunks.push(items.slice(i, i + chunkSize));
        }

        // Create slides
        chunks.forEach(chunkItems => {
            const slide = document.createElement('div');
            slide.className = 'carousel-slide';

            chunkItems.forEach(item => {
                slide.appendChild(createCard(item, type));
            });

            track.appendChild(slide);
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();

        // Add Navigation Arrows if needed
        if (chunks.length > 1) {
            let currentIndex = 0;

            // --- Previous Button ---
            const prevBtn = document.createElement('button');
            prevBtn.className = 'nav-arrow prev';
            prevBtn.innerHTML = `Back<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`;
            prevBtn.title = "Précédent";
            prevBtn.style.display = 'none'; // Hide initially

            // --- Next Button ---
            const nextBtn = document.createElement('button');
            nextBtn.className = 'nav-arrow';
            nextBtn.innerHTML = 'Next<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>';
            nextBtn.title = "Suivant";

            const updateArrows = () => {
                prevBtn.style.display = currentIndex === 0 ? 'none' : 'flex';
                nextBtn.style.display = currentIndex === chunks.length - 1 ? 'none' : 'flex';
                track.style.transform = `translateX(-${currentIndex * 100}%)`;
            };

            nextBtn.addEventListener('click', () => {
                if (currentIndex < chunks.length - 1) {
                    currentIndex++;
                    updateArrows();
                }
            });

            prevBtn.addEventListener('click', () => {
                if (currentIndex > 0) {
                    currentIndex--;
                    updateArrows();
                }
            });

            container.appendChild(prevBtn);
            container.appendChild(nextBtn);
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    // ====== 2. Logique d'ouverture ======
    async function openSavedFile(data) {
        // Redéclaration pour sûreté ou usage scope local, identique à folder-view.js
        const api = typeof browser !== 'undefined' ? browser : chrome;
        const isFirefox =
            typeof browser !== 'undefined' &&
            browser.runtime &&
            typeof browser.runtime.getBrowserInfo === 'function';

        const filenameOnly = data.filename.split(/[/\\]/).pop();

        // --- 1. Détection du Type ---
        const type = data.type || (data.filename && data.filename.endsWith('.html') ? 'note' : 'video');

        // Note: On laisse couler vers la recherche downloads.search pour les deux (Vidéo et Note)
        // Cela permet d'ouvrir le fichier HTML ou MP4 directement.
        // L'édition reste possible via l'icône "Crayon".

        // --- 2. Gestion des Vidéos (Logique "Folder View") ---
        console.log("🎬 Tentative ouverture native vidéo (Style FolderView) :", filenameOnly);

        // Chrome : logique downloads.search + open
        if (!isFirefox && api.downloads && api.downloads.search) {
            try {
                const settings = await api.storage.local.get(['backupFolder']);
                const backupFolder = settings.backupFolder || '';

                api.downloads.search({ query: [filenameOnly] }, (results) => {
                    if (!results || results.length === 0) {
                        console.warn(`Fichier introuvable dans l'historique : ${filenameOnly}. Fallback vers l'éditeur.`);
                        handleEditItem(data, type);
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
                        api.downloads.open(bestMatch.id, (opened) => {
                            if (api.runtime.lastError || opened === undefined) {
                                console.error("Erreur downloads.open, fallback éditeur");
                                handleEditItem(data, type);
                            }
                        });
                    } else {
                        handleEditItem(data, type);
                    }
                });
            } catch (err) {
                console.error("Erreur lors de l'ouverture (Chrome):", err);
                handleEditItem(data, type); // Fallback
            }
            return;
        }

        // Firefox 
        try {
            if (data.url) {
                window.open(data.url, '_blank');
                return;
            }
            if (api.runtime && api.runtime.getURL && data.filename) {
                const url = api.runtime.getURL(data.filename);
                window.open(url, '_blank');
                return;
            }
            alert("Sous Firefox, l'ouverture directe n'est pas dispo. Ouverture de l'éditeur.");
            handleEditItem(data, type);
        } catch (err) {
            console.error("Erreur Firefox:", err);
            handleEditItem(data, type);
        }
    }

    // ====== 3. Chargement des données et Recherche ======

    let allNotes = [];
    let allVideos = [];

    // --- Notes ---
    api.storage.local.get(['savedNotes'], (result) => {
        allNotes = result.savedNotes || [];
        allNotes.sort((a, b) => new Date(b.date) - new Date(a.date));
        renderCarousel(allNotes, 'note', 'notes-track', 'notes-section');
    });

    const searchNotesInput = document.getElementById('search-notes');
    if (searchNotesInput) {
        searchNotesInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allNotes.filter(item => (item.title || "").toLowerCase().includes(term));
            renderCarousel(filtered, 'note', 'notes-track', 'notes-section');
        });
    }

    // --- Vidéos ---
    api.storage.local.get(['savedVideos'], (result) => {
        allVideos = result.savedVideos || [];
        allVideos.sort((a, b) => new Date(b.date) - new Date(a.date));
        renderCarousel(allVideos, 'video', 'videos-track', 'videos-section');
    });

    const searchVideosInput = document.getElementById('search-videos');
    if (searchVideosInput) {
        searchVideosInput.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const filtered = allVideos.filter(item => (item.title || "").toLowerCase().includes(term));
            renderCarousel(filtered, 'video', 'videos-track', 'videos-section');
        });
    }

    // ====== 4. Logique d'Importation ======

    const importNoteBtn = document.getElementById('import-note-btn');
    const importNoteInput = document.getElementById('import-note-input');
    const importVideoBtn = document.getElementById('import-video-btn');
    const importVideoInput = document.getElementById('import-video-input');
    const importTranscriptInput = document.getElementById('import-transcript-input');

    if (importNoteBtn && importNoteInput) {
        importNoteBtn.addEventListener('click', () => importNoteInput.click());
        importNoteInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const parser = new DOMParser();
                const doc = parser.parseFromString(text, 'text/html');

                // Basique check format SemiaSB
                const captureBlocks = doc.querySelectorAll('.capture-block');
                const noteBlocks = doc.querySelectorAll('.note');

                if (captureBlocks.length === 0 && noteBlocks.length === 0) {
                    alert("Le fichier ne semble pas être une note SemiaSB valide.");
                    return;
                }

                // Extraction Titre
                let title = file.name.replace('.html', '');
                const h1s = doc.querySelectorAll('h1');
                if (h1s.length > 1) title = h1s[1].textContent.trim();

                // Extraction Contenu (Plus robuste - cherche div ou p et ignore le placeholder)
                const getCleanContent = (el) => {
                    if (!el) return "";
                    const contentEl = el.querySelector('div') || el.querySelector('p');
                    let html = contentEl ? contentEl.innerHTML : el.innerHTML;
                    if (html.includes('Aucune note')) return "";
                    return html;
                };

                // Identifie Intro et Conclusion parmi les blocs .note de premier niveau
                const topLevelNotes = Array.from(doc.querySelectorAll('.container > .note'));
                const intro = getCleanContent(topLevelNotes[0]);
                const conclusion = getCleanContent(topLevelNotes[topLevelNotes.length - 1]);

                const captures = Array.from(captureBlocks).map(block => ({
                    image: block.querySelector('img')?.src || "",
                    note: getCleanContent(block.querySelector('.note'))
                }));

                const id = Date.now();
                const newNoteMeta = {
                    id,
                    title,
                    date: new Date().toISOString(),
                    filename: file.name, // Sera mis à jour après download
                    thumbnail: captures[0]?.image || ""
                };

                const contentData = {
                    id,
                    intro,
                    conclusion,
                    captures
                };

                // Sauvegarde storage
                api.storage.local.get(['savedNotes', 'backupFolder'], (result) => {
                    const notes = result.savedNotes || [];
                    const backupFolder = result.backupFolder || '';

                    // On déclenche un nouveau "téléchargement" pour que le fichier soit dans le dossier de backup
                    // et surtout dans l'historique de téléchargement pour le lien "ouvrir".
                    const blob = new Blob([text], { type: 'text/html' });
                    const blobUrl = URL.createObjectURL(blob);

                    let finalPath = file.name;
                    if (backupFolder) {
                        const folderName = backupFolder.split(/[/\\]/).pop() || 'SemiaSB';
                        finalPath = `${folderName}/${file.name}`;
                    }

                    api.downloads.download({
                        url: blobUrl,
                        filename: finalPath,
                        saveAs: false // On impose le backup sans redemander si possible
                    }, (downloadId) => {
                        URL.revokeObjectURL(blobUrl);

                        newNoteMeta.filename = finalPath;
                        notes.unshift(newNoteMeta);

                        api.storage.local.set({
                            savedNotes: notes,
                            [`note_content_${id}`]: contentData
                        }, () => {
                            alert("Note importée et sauvegardée dans votre dossier de backup !");
                            location.reload();
                        });
                    });
                });
            } catch (err) {
                console.error("Erreur import note:", err);
                alert("Erreur lors de l'importation de la note.");
            }
        });
    }

    if (importVideoBtn && importVideoInput) {
        importVideoBtn.addEventListener('click', () => {
            importVideoInput.value = ""; // Reset
            importVideoInput.click();
        });

        importVideoInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            // On cherche le fichier vidéo principal
            const videoFile = files.find(f =>
                f.type.startsWith('video/') ||
                f.name.toLowerCase().endsWith('.webm') ||
                f.name.toLowerCase().endsWith('.mp4') ||
                f.name.toLowerCase().endsWith('.mkv')
            );

            if (!videoFile) {
                alert("Veuillez sélectionner au moins un fichier vidéo (.webm, .mp4, etc.).");
                return;
            }

            // Les autres fichiers sont considérés comme des transcriptions/chapitres
            const transcriptFiles = files.filter(f => f !== videoFile);

            processVideoImport(videoFile, transcriptFiles);
        });
    }

    async function processVideoImport(videoFile, transcriptFiles) {
        try {
            const videoId = Date.now();
            const videoBaseName = videoFile.name.substring(0, videoFile.name.lastIndexOf('.'));

            let chapters = [];
            let mainTranscript = "";
            let hasTranscript = false;

            // On prend tous les fichiers sélectionnés (plus flexible)
            const matchingTranscripts = transcriptFiles;

            const storage = await new Promise(resolve => api.storage.local.get(['savedVideos', 'backupFolder'], resolve));
            const backupFolder = storage.backupFolder || '';
            const videos = storage.savedVideos || [];

            // Lecture des contenus
            for (const f of matchingTranscripts) {
                const text = await f.text();
                if (f.name.toLowerCase().endsWith('.json')) {
                    try {
                        const json = JSON.parse(text);
                        if (json.chapters) {
                            chapters = json.chapters;
                        }
                    } catch (e) { console.error("JSON invalide:", e); }
                } else if (f.name.toLowerCase().endsWith('.txt')) {
                    mainTranscript = text;
                    hasTranscript = true;
                }
            }

            const newVideoMeta = {
                id: videoId,
                title: videoFile.name,
                date: new Date().toISOString(),
                filename: videoFile.name,
                type: 'video',
                chapters: chapters.length > 0 ? chapters : null,
                hasTranscript: hasTranscript
            };

            // Fonction helper pour télécharger dans le bon dossier
            const downloadToBackup = (file) => {
                return new Promise(resolve => {
                    if (!api.downloads || !api.downloads.download) {
                        console.warn("api.downloads.download non disponible");
                        return resolve(null);
                    }

                    const url = URL.createObjectURL(file);
                    let finalPath = file.name;
                    if (backupFolder) {
                        const folderName = backupFolder.split(/[/\\]/).pop() || 'SemiaSB';
                        finalPath = `${folderName}/${file.name}`;
                    }

                    console.log("Tentative download vers:", finalPath);

                    api.downloads.download({ url, filename: finalPath, saveAs: false }, (downloadId) => {
                        URL.revokeObjectURL(url);
                        if (api.runtime.lastError) {
                            console.error("Erreur download:", api.runtime.lastError.message);
                            resolve(null); // On ignore l'erreur mais on resolve pour ne pas bloquer
                        } else {
                            console.log("Download démarré, ID:", downloadId);
                            resolve(finalPath);
                        }
                    });
                });
            };

            // Copie de la vidéo en local
            const finalVideoPath = await downloadToBackup(videoFile);
            if (finalVideoPath) {
                newVideoMeta.filename = finalVideoPath;
            }

            // Copie des fichiers de transcription/chapitres en local
            for (const f of matchingTranscripts) {
                await downloadToBackup(f);
            }

            // Mise à jour du stockage
            videos.unshift(newVideoMeta);
            const updates = { savedVideos: videos };
            if (mainTranscript) {
                updates[`video_transcript_${videoId}`] = mainTranscript;
            }

            api.storage.local.set(updates, () => {
                alert("Vidéo et fichiers associés importés avec succès !");
                location.reload();
            });

        } catch (err) {
            console.error("Erreur import vidéo:", err);
            alert("Erreur lors de l'importation de la vidéo.");
        }
    }

});
