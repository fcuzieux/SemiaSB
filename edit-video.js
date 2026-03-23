const api = typeof browser !== 'undefined' ? browser : chrome;

// Éléments
const videoPlayer = document.getElementById('video-player');
const fileOverlay = document.getElementById('file-overlay');
const selectFileBtn = document.getElementById('select-file-btn');
const hiddenFileInput = document.getElementById('hidden-file-input');

const videoTitleInput = document.getElementById('video-title');
const videoDateSpan = document.getElementById('video-date');
const videoDurationSpan = document.getElementById('video-duration');
const videoIdSpan = document.getElementById('video-id');

// Garder une référence à l'URL propre pour pouvoir recharger avec des fragments
let currentVideoUrl = null;
let currentVideoFile = null;

// Écouteur d'erreurs pour diagnostic
function attachVideoListeners(player) {
    player.addEventListener('error', () => {
        const err = player.error;
        console.error("Erreur Vidéo:", err);
        if (err) {
            console.error(`- Code: ${err.code}`);
            console.error(`- Message: ${err.message}`);

            // Gérer le bug PIPELINE_ERROR_DECODE de Chrome sur certains WebM
            if (err.code === 3 && err.message.includes('PIPELINE_ERROR_DECODE')) {
                console.error("[Décodeur Chrome] Le navigateur a planté en essayant de chercher (seek) dans ce fichier WebM.");
                showStatus("Erreur navigateur : Impossible de naviguer dans cette vidéo. Le décodeur Chrome a planté (fichier WebM non standard).", 5000, "#ef4444");

                // On remet la vidéo à zéro pour qu'elle soit au moins lisible depuis le début 
                // sans bloquer complètement l'interface utilisateur.
                setTimeout(() => {
                    if (currentVideoUrl) {
                        player.src = currentVideoUrl;
                        player.load();
                    }
                }, 1000);
            }
        }
    });

    // Diagnostic de progression du décodage
    let lastTimeUpdate = 0;
    player.addEventListener('timeupdate', () => {
        const now = Date.now();
        if (now - lastTimeUpdate > 2000 && !player.paused) {
            console.log(`[Diagnostic Video] En cours de lecture... currentTime: ${player.currentTime.toFixed(2)}s`);
        }
        lastTimeUpdate = now;
    });

    player.addEventListener('stalled', () => {
        console.warn("[Diagnostic Video] stalled event: Le navigateur essaie de lire les données mais elles ne sont pas disponibles.");
    });

    player.addEventListener('waiting', () => {
        console.warn(`[Diagnostic Video] waiting event: Attente de données à ${player.currentTime.toFixed(2)}s...`);
    });
}

// Charger une vidéo directement
async function loadVideoBlob(file) {
    currentVideoFile = file;
    console.log(`[Diagnostic Fichier] ---------- NOUVEAU FICHIER ----------`);
    console.log(`[Diagnostic Fichier] Nom: ${file.name}`);
    console.log(`[Diagnostic Fichier] Type MIME: ${file.type}`);
    console.log(`[Diagnostic Fichier] Taille: ${(file.size / (1024 * 1024)).toFixed(2)} Mo`);

    if (currentVideoUrl) URL.revokeObjectURL(currentVideoUrl);
    currentVideoUrl = URL.createObjectURL(file);
    const player = document.getElementById('video-player');
    player.src = currentVideoUrl;
    fileOverlay.style.display = 'none';

    player.onloadedmetadata = () => {
        const d = player.duration;
        videoDurationSpan.textContent = `${Math.floor(d / 60)}:${Math.floor(d % 60).toString().padStart(2, '0')}`;

        console.log(`[Diagnostic Fichier] Durée détectée par le navigateur: ${d}s`);
        console.log(`[Diagnostic Fichier] Dimensions: ${player.videoWidth}x${player.videoHeight}`);

        const sr = player.seekable;
        if (sr.length > 0) {
            console.log(`[Diagnostic Fichier] Plages seekable: ${sr.start(0)} -> ${sr.end(sr.length - 1)}`);
        } else {
            console.warn(`[Diagnostic Fichier] ATTENTION: Aucune plage seekable détectée !`);
        }
    };
    attachVideoListeners(player);
}

const chaptersTab = document.getElementById('chapters-content');
const chaptersContent = document.getElementById('chapters-list-inner');
const transcriptContent = document.getElementById('transcript-content');
const tabButtons = document.querySelectorAll('.tab-btn');

const saveBtn = document.getElementById('save-btn');
const closeBtn = document.getElementById('close-btn');
const statusMsg = document.getElementById('status-msg');

const aiSummaryBtn = document.getElementById('ai-summary-btn');
const aiPimpBtn = document.getElementById('ai-pimp-btn');
const aiMinutesBtn = document.getElementById('ai-minutes-btn');
const aiNewsBtn = document.getElementById('ai-news-btn');
const aiChatBtn = document.getElementById('ai-chat-btn');
const aiOutputContainer = document.getElementById('ai-minutes-output');
const aiOutputText = document.getElementById('ai-output-content');
const closeAiBtn = document.getElementById('close-ai-btn');

let currentVideoId = null;
let currentVideoData = null;
let transcriptText = "";

// Initialisation
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    currentVideoId = params.get('id');

    if (!currentVideoId) {
        alert("ID vidéo manquant.");
        window.close();
        return;
    }

    loadVideoData(Number(currentVideoId));
    initTabs();
    initIcons();
    setTimeout(tryAutoLoadVideo, 800);
});

// Charger les données depuis le stockage
function loadVideoData(id) {
    api.storage.local.get(['savedVideos'], (result) => {
        const videos = result.savedVideos || [];
        currentVideoData = videos.find(v => v.id === id);

        if (!currentVideoData) {
            alert("Vidéo non trouvée dans l'historique.");
            window.close();
            return;
        }

        renderMetadata();
        renderChapters();

        // Auto-trigger file selection
        const filenameOnly = currentVideoData.filename ? currentVideoData.filename.split(/[/\\]/).pop() : "vidéo";
        const overlayHint = document.querySelector('#file-overlay p');
        if (overlayHint) {
            overlayHint.innerHTML = `Veuillez sélectionner le fichier : <br><strong style="color:white; font-family:monospace;">${filenameOnly}</strong><br><br><small style="color:#94a3b8">(Astuce: Sélectionnez aussi le fichier .txt pour l'IA)</small>`;
        }

        /* 
        // DÉSACTIVÉ : Provoque un warning Chrome (User Activation) car lancé hors d'un geste utilisateur
        setTimeout(() => {
            hiddenFileInput.click();
        }, 500);
        */
    });
}

function renderMetadata() {
    videoTitleInput.value = currentVideoData.title || "Sans titre";
    videoDateSpan.textContent = currentVideoData.date ? new Date(currentVideoData.date).toLocaleDateString('fr-FR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }) : "--/--/----";
    videoIdSpan.textContent = `ID: ${currentVideoData.id}`;

    // Si on a un filename, on peut essayer de deviner le chemin (juste informatif)
    if (currentVideoData.filename) {
        console.log("Nom de fichier attendu:", currentVideoData.filename);
    }
}

function renderChapters() {
    chaptersContent.innerHTML = '';
    const chapters = currentVideoData.chapters || [];

    if (chapters.length === 0) {
        chaptersContent.innerHTML = '<p style="color: #64748b; font-style: italic; text-align: center; margin-top: 20px;">Aucun chapitre.</p>';
        return;
    }

    chapters.forEach((chap, index) => {
        const item = document.createElement('div');
        item.className = 'chapter-item';

        // Formatage temps (s -> mm:ss) - Supporte 'time' ou 'timestamp'
        const rawTime = chap.time !== undefined ? chap.time : chap.timestamp;
        const chapTitle = chap.title !== undefined ? chap.title : chap.name;

        const min = Math.floor(rawTime / 60);
        const sec = Math.floor(rawTime % 60);
        const timeStr = `${isNaN(min) ? '0' : min}:${isNaN(sec) ? '00' : sec.toString().padStart(2, '0')}`;

        item.innerHTML = `
            <div class="chapter-time">${timeStr}</div>
            <div class="chapter-title" contenteditable="true">${chapTitle || "Sans titre"}</div>
            <button class="delete-chap-btn" style="background:none; border:none; color:#ef4444; cursor:pointer;" title="Supprimer">
                <i data-lucide="x-circle" style="width:16px; height:16px;"></i>
            </button>
        `;

        // Navigation au clic sur le temps
        item.querySelector('.chapter-time').addEventListener('click', () => {
            if (!currentVideoUrl) return;

            const player = document.getElementById('video-player');
            const wasPlaying = !player.paused;

            // Pause if playing to stabilize pipeline before seek
            if (wasPlaying) {
                player.pause();
            }

            // Small delay to ensure pause state is settled before seeking
            setTimeout(() => {
                player.currentTime = rawTime;

                // Only resume play after the seek has completed
                if (wasPlaying) {
                    player.addEventListener('seeked', function onSeeked() {
                        player.removeEventListener('seeked', onSeeked);
                        player.play().catch(() => { });
                    }, { once: true });
                }
            }, 50);
        });

        // Mise à jour titre
        const titleEl = item.querySelector('.chapter-title');
        titleEl.addEventListener('blur', () => {
            if (chap.title !== undefined) chap.title = titleEl.innerText;
            if (chap.name !== undefined) chap.name = titleEl.innerText;
        });

        // Suppression
        item.querySelector('.delete-chap-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            currentVideoData.chapters.splice(index, 1);
            renderChapters();
        });

        chaptersContent.appendChild(item);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Gestion du fichier vidéo (Bridge pour lecture locale)
selectFileBtn.addEventListener('click', () => {
    hiddenFileInput.click();
});

const transcriptPlaceholder = document.getElementById('transcript-placeholder');
const transcriptArea = document.getElementById('liveTranscript');

function loadTranscriptFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        const text = e.target.result;
        transcriptArea.value = text;

        // Hide placeholder, show textarea
        if (transcriptPlaceholder) transcriptPlaceholder.style.display = 'none';
        if (transcriptArea) transcriptArea.style.display = 'block';

        showStatus("Transcription chargée !");
    };
    reader.readAsText(file);
}

// Update file selection to handle both or just video
hiddenFileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    files.forEach(file => {
        if (file.name.toLowerCase().endsWith('.txt')) {
            loadTranscriptFile(file);
        } else if (file.type.startsWith('video/') || file.name.toLowerCase().endsWith('.webm')) {
            loadVideoBlob(file);
        }
    });
});

// Onglets
function initTabs() {
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tab = btn.dataset.tab;
            if (tab === 'chapters') {
                chaptersTab.style.display = 'block';
                transcriptContent.style.display = 'none';
            } else {
                chaptersTab.style.display = 'none';
                transcriptContent.style.display = 'block';
            }
        });
    });
}

// Chargement manuel des fichiers
function initManualLoaders() {
    const loadChaptersBtn = document.getElementById('load-chapters-btn');
    const chaptersFileInput = document.getElementById('chapters-file-input');
    const loadTranscriptBtn = document.getElementById('load-transcript-btn');
    const transcriptFileInput = document.getElementById('transcript-file-input');

    if (loadChaptersBtn && chaptersFileInput) {
        loadChaptersBtn.addEventListener('click', () => chaptersFileInput.click());
        chaptersFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    // On supporte plusieurs formats possibles
                    let extractedChapters = [];
                    if (Array.isArray(data)) {
                        extractedChapters = data;
                    } else if (data.chapters && Array.isArray(data.chapters)) {
                        extractedChapters = data.chapters;
                    }

                    if (extractedChapters.length > 0) {
                        currentVideoData.chapters = extractedChapters;
                        renderChapters();
                        showStatus("Chapitres chargés avec succès !");
                    } else {
                        alert("Aucun chapitre trouvé dans ce fichier.");
                    }
                } catch (err) {
                    console.error("Erreur parsing JSON chapitres:", err);
                    alert("Erreur lors de la lecture du fichier JSON.");
                }
            };
            reader.readAsText(file);
        });
    }

    if (loadTranscriptBtn && transcriptFileInput) {
        loadTranscriptBtn.addEventListener('click', () => transcriptFileInput.click());
        transcriptFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) loadTranscriptFile(file);
        });
    }
}

// Sauvegarde
saveBtn.addEventListener('click', () => {
    if (!currentVideoData) return;

    currentVideoData.title = videoTitleInput.value;
    // Les chapitres sont déjà mis à jour via blur event

    api.storage.local.get(['savedVideos'], (result) => {
        let videos = result.savedVideos || [];
        const index = videos.findIndex(v => v.id === currentVideoData.id);

        if (index !== -1) {
            videos[index] = currentVideoData;
            api.storage.local.set({ savedVideos: videos }, () => {
                showStatus("Modifications enregistrées !");
            });
        }
    });
});

closeBtn.addEventListener('click', () => {
    window.close();
});

function showStatus(msg) {
    statusMsg.textContent = msg;
    statusMsg.style.display = 'block';
    setTimeout(() => {
        statusMsg.style.display = 'none';
    }, 2000);
}

// --- Gestion du chargement automatique via File System Access ---
async function tryAutoLoadVideo() {
    console.log("[AutoLoad] Tentative de check AutoLoad...");
    if (typeof CaptureStorage === 'undefined') {
        console.error("[AutoLoad] CaptureStorage est indéfini ! Assurez-vous que capture-storage.js est chargé.");
        return;
    }

    try {
        const handle = await CaptureStorage.getHandle('backupDirHandle');
        if (!handle) {
            console.log("[AutoLoad] Aucun dossier lié trouvé dans IndexedDB.");
            return;
        }

        console.log("[AutoLoad] Dossier lié trouvé. Vérification des permissions...");

        // Attendre que loadVideoData ait fini pour avoir l'overlay prêt (max 3s)
        let attempts = 0;
        while (!currentVideoData && attempts < 15) {
            await new Promise(r => setTimeout(r, 200));
            attempts++;
        }

        if (!currentVideoData) {
            console.warn("[AutoLoad] Données vidéo non chargées après attente.");
        }

        const overlayHint = document.querySelector('#file-overlay p');
        const selectBtn = document.getElementById('select-file-btn');

        if (overlayHint && selectBtn) {
            // Vérifier si le bouton existe déjà pour éviter les doublons
            if (document.getElementById('auth-folder-btn')) return;

            const authBtn = document.createElement('button');
            authBtn.id = "auth-folder-btn";
            authBtn.className = "btn btn-primary";
            authBtn.style.width = "100%";
            authBtn.style.marginTop = "15px";
            authBtn.style.justifyContent = "center";
            authBtn.innerHTML = '<i data-lucide="unlock"></i> &nbsp; Autoriser l\'accès au dossier';

            overlayHint.appendChild(authBtn);
            if (typeof lucide !== 'undefined') lucide.createIcons();

            console.log("[AutoLoad] Bouton d'autorisation injecté dans l'overlay.");

            authBtn.addEventListener('click', async () => {
                try {
                    console.log("[AutoLoad] Geste utilisateur détecté : demande de permission...");
                    const permission = await handle.requestPermission({ mode: 'readwrite' });
                    if (permission === 'granted') {
                        console.log("[AutoLoad] Permission accordée par l'utilisateur.");
                        await performAutoLoad(handle);
                    } else {
                        alert("Accès refusé. Veuillez sélectionner le fichier manuellement.");
                    }
                } catch (err) {
                    console.error("[AutoLoad] Erreur lors de la demande de permission:", err);
                    alert("Erreur lors de l'accès au dossier. Vérifiez les paramètres de sécurité.");
                }
            });
        } else {
            console.error("[AutoLoad] Éléments DOM (overlayHint ou selectBtn) introuvables.");
        }

    } catch (err) {
        console.error("[AutoLoad] Erreur globale dans tryAutoLoadVideo:", err);
    }
}

async function performAutoLoad(dirHandle) {
    if (!currentVideoData || !currentVideoData.filename) return;

    try {
        const filenameOnly = currentVideoData.filename.split(/[/\\]/).pop();
        console.log(`[AutoLoad] Recherche du fichier: ${filenameOnly}`);

        const fileHandle = await dirHandle.getFileHandle(filenameOnly);
        const file = await fileHandle.getFile();

        if (file) {
            console.log("[AutoLoad] Fichier vidéo trouvé et chargé !");
            await loadVideoBlob(file);

            showStatus("Vidéo chargée automatiquement !");

            // --- NOUVEAU : Auto-Load de la transcription (.txt) ---
            try {
                const transcriptFilename = filenameOnly.replace(/\.[^/.]+$/, "") + ".txt";
                console.log(`[AutoLoad] Recherche de la transcription: ${transcriptFilename}`);
                const transcriptHandle = await dirHandle.getFileHandle(transcriptFilename);
                const transcriptFile = await transcriptHandle.getFile();
                if (transcriptFile) {
                    loadTranscriptFile(transcriptFile);
                    console.log("[AutoLoad] Transcription chargée automatiquement !");
                }
            } catch (txtErr) {
                console.log("[AutoLoad] Pas de fichier de transcription trouvé ou erreur.");
            }
        }
    } catch (err) {
        console.warn("[AutoLoad] Fichier non trouvé dans le dossier lié:", err);
        // On ne fait rien,
    }
}

// Initialiser les icônes
function initIcons() {
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// Exécuter le check auto-load après le chargement des données
document.addEventListener('DOMContentLoaded', () => {
    loadVideoData(Number(currentVideoId));
    initTabs();
    initManualLoaders();
    initIcons();
    setTimeout(tryAutoLoadVideo, 800);
});

// AI Integration
aiPimpBtn.addEventListener('click', () => {
    if (typeof executeAITask === 'function') {
        executeAITask('pimp');
    } else {
        alert("Outil IA non chargé.");
    }
});

aiSummaryBtn.addEventListener('click', () => {
    if (typeof executeAITask === 'function') {
        executeAITask('summary');
    } else {
        alert("Outil IA non chargé.");
    }
});

aiMinutesBtn.addEventListener('click', () => {
    if (typeof executeAITask === 'function') {
        executeAITask('minutes');
    } else {
        alert("Outil IA non chargé.");
    }
});

aiNewsBtn.addEventListener('click', () => {
    if (typeof executeAITask === 'function') {
        executeAITask('news');
    } else {
        alert("Outil IA non chargé.");
    }
});

aiChatBtn.addEventListener('click', () => {
    // Basic chat trigger or focus on transcription tab?
    // For now, let's trigger a custom question if we want, or just a generic analysis.
    if (typeof executeAITask === 'function') {
        const question = prompt("Quelle question voulez-vous poser sur cette vidéo ?");
        if (question) executeAITask('custom', question);
    } else {
        alert("Outil IA non chargé.");
    }
});

closeAiBtn.addEventListener('click', () => {
    const outputDiv = document.getElementById('ai-minutes-output');
    if (outputDiv) outputDiv.style.display = 'none';
});

// Helper for status (used by AI scripts)
window.showStatusUtils = (msg, isError) => {
    showStatus(msg); // Reuses existing statusMsg
};

// --- WHISPER OFFLINE TRANSCRIPTION (edit-video) ---
let localWhisperWorker = null;

async function startLocalWhisperTranscription() {
    if (!currentVideoFile) {
        showStatus("Veuillez d'abord charger le fichier vidéo local.");
        return;
    }

    const transcribeBtn = document.getElementById('transcribe-whisper-btn');
    if (transcribeBtn) transcribeBtn.disabled = true;

    const transcriptPlaceholder = document.getElementById('transcript-placeholder');
    const transcriptArea = document.getElementById('liveTranscript');
    
    if (transcriptPlaceholder) transcriptPlaceholder.style.display = 'none';
    if (transcriptArea) {
        transcriptArea.style.display = 'block';
        transcriptArea.value = "Préparation de l'extraction audio...\\n";
    }

    try {
        transcriptArea.value += "Extraction audio en cours (cela peut prendre quelques secondes)...\\n";
        
        const arrayBuffer = await currentVideoFile.arrayBuffer();

        transcriptArea.value += "Décodage de l'audio à 16kHz...\\n";
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        transcriptArea.value += "Fusion des canaux audio...\\n";
        const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, 16000);
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineCtx.destination);
        source.start();
        const renderedBuffer = await offlineCtx.startRendering();
        const pcmData = renderedBuffer.getChannelData(0);

        transcriptArea.value += "Audio extrait avec succès! Chargement de Whisper...\\n";

        if (!localWhisperWorker) {
            localWhisperWorker = new Worker('whisper-worker.js', { type: 'module' });
            
            localWhisperWorker.onmessage = (e) => {
                const msg = e.data;
                if (msg.status === 'ready') {
                    transcriptArea.value += "Modèle Whisper prêt ! Démarrage de la transcription...\\n---\\n";
                } else if (msg.status === 'progress' && msg.data?.status === 'progress') {
                    const pct = Math.round(msg.data.progress || 0);
                    showStatus(`Chargement IA : ${pct}%`);
                } else if (msg.status === 'chunk') {
                    transcriptArea.value += (transcriptArea.value.endsWith('\\n') ? '' : ' ') + msg.result.trim() + '\\n';
                    transcriptArea.scrollTop = transcriptArea.scrollHeight;
                } else if (msg.status === 'complete') {
                    transcriptArea.value += "\\n\\n--- Transcription Terminée ---";
                    transcriptArea.scrollTop = transcriptArea.scrollHeight;
                    if (transcribeBtn) transcribeBtn.disabled = false;
                    showStatus("Transcription terminée !");
                    if (currentVideoData) {
                        currentVideoData.transcription = transcriptArea.value;
                    }
                } else if (msg.status === 'error') {
                    transcriptArea.value += `\nErreur Whisper: ${msg.error}`;
                    if (transcribeBtn) transcribeBtn.disabled = false;
                }
            };
            localWhisperWorker.postMessage({ type: 'init' });
        }

        localWhisperWorker.postMessage({
            type: 'transcribe',
            audio: pcmData,
            options: { language: 'french', task: 'transcribe' }
        });

    } catch (error) {
        console.error("Erreur de transcription locale:", error);
        transcriptArea.value += `\nErreur lors de l'extraction: ${error.message}`;
        if (transcribeBtn) transcribeBtn.disabled = false;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const transcribeBtn = document.getElementById('transcribe-whisper-btn');
        if (transcribeBtn) {
            transcribeBtn.addEventListener('click', startLocalWhisperTranscription);
        }
    }, 1000);
});
