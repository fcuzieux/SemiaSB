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


// --- ALBERT WHISPER TRANSCRIPTION ---

// ── Popup de progression ──────────────────────────────────────────────────────

let _albertProgressOverlay = null;
let _albertStepEls = {};

const ALBERT_STEPS = [
    { id: 'cfg',    label: 'Vérification de la configuration Albert' },
    { id: 'file',   label: 'Fichier vidéo chargé' },
    { id: 'model',  label: 'Modèle openai/whisper-large-v3 disponible' },
    { id: 'audio',  label: 'Extraction audio (16 kHz mono)' },
    { id: 'upload', label: 'Envoi vers Albert' },
    { id: 'result', label: 'Réception de la transcription' },
];

function showAlbertProgress() {
    const existing = document.getElementById('albert-progress-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'albert-progress-overlay';
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(0,0,0,0.75); backdrop-filter: blur(6px);
        display: flex; align-items: center; justify-content: center;
        font-family: 'Inter', sans-serif;
    `;

    const stepsHtml = ALBERT_STEPS.map(s => `
        <div id="albert-step-${s.id}" style="
            display: flex; align-items: center; gap: 12px;
            padding: 10px 14px; border-radius: 8px;
            transition: background 0.3s;
        ">
            <span id="albert-step-${s.id}-icon" style="font-size:1.2rem; width:24px; text-align:center;">⬜</span>
            <div>
                <div id="albert-step-${s.id}-label" style="font-size:0.88rem; color:#e2e8f0;">${s.label}</div>
                <div id="albert-step-${s.id}-detail" style="font-size:0.75rem; color:#64748b; margin-top:2px;"></div>
            </div>
        </div>
    `).join('');

    overlay.innerHTML = `
        <div style="
            background: linear-gradient(160deg, #1e293b 0%, #0f172a 100%);
            border: 1px solid rgba(99,102,241,0.35);
            border-radius: 18px; padding: 28px 32px; width: 480px; max-width: 95vw;
            box-shadow: 0 25px 70px rgba(0,0,0,0.6);
        ">
            <div style="display:flex; align-items:center; gap:12px; margin-bottom:22px;">
                <span style="font-size:1.8rem;">🎙️</span>
                <div>
                    <h2 style="margin:0; font-size:1.1rem; color:#818cf8; font-weight:700;">Transcription avec Albert</h2>
                    <p style="margin:0; font-size:0.8rem; color:#64748b;">openai/whisper-large-v3</p>
                </div>
            </div>

            <div id="albert-steps-container" style="display:flex; flex-direction:column; gap:4px; margin-bottom:20px;">
                ${stepsHtml}
            </div>

            <div id="albert-progress-bar-wrap" style="
                height: 4px; background: rgba(255,255,255,0.06); border-radius: 2px;
                overflow:hidden; margin-bottom:16px;
            ">
                <div id="albert-progress-bar" style="
                    height:100%; width:0%; border-radius:2px;
                    background: linear-gradient(90deg, #4f46e5, #7c3aed);
                    transition: width 0.4s ease;
                "></div>
            </div>

            <div id="albert-progress-status" style="
                font-size:0.8rem; color:#94a3b8; text-align:center; min-height:18px;
            ">Démarrage…</div>

            <div style="text-align:center; margin-top:16px;">
                <button id="albert-progress-close" style="
                    padding: 8px 22px; border-radius: 8px;
                    border: 1px solid rgba(255,255,255,0.12);
                    background: rgba(255,255,255,0.05); color: #94a3b8;
                    cursor: pointer; font-size: 0.85rem; display:none;
                ">Fermer</button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
    _albertProgressOverlay = overlay;

    // Cache step elements
    ALBERT_STEPS.forEach(s => {
        _albertStepEls[s.id] = {
            row:    document.getElementById(`albert-step-${s.id}`),
            icon:   document.getElementById(`albert-step-${s.id}-icon`),
            label:  document.getElementById(`albert-step-${s.id}-label`),
            detail: document.getElementById(`albert-step-${s.id}-detail`),
        };
    });

    document.getElementById('albert-progress-close').addEventListener('click', () => overlay.remove());
}

/**
 * Met à jour une étape dans le popup.
 * state: 'pending' | 'loading' | 'ok' | 'error'
 */
function albertStepUpdate(stepId, state, detail = '') {
    const el = _albertStepEls[stepId];
    if (!el) return;

    const icons = { pending: '⬜', loading: '⏳', ok: '✅', error: '❌' };
    const colors = { pending: 'transparent', loading: 'rgba(99,102,241,0.08)', ok: 'rgba(16,185,129,0.08)', error: 'rgba(239,68,68,0.08)' };
    const labelColors = { pending: '#94a3b8', loading: '#c7d2fe', ok: '#6ee7b7', error: '#fca5a5' };

    el.icon.textContent = icons[state] || '⬜';
    el.row.style.background = colors[state] || 'transparent';
    el.label.style.color = labelColors[state] || '#e2e8f0';
    if (detail) el.detail.textContent = detail;

    // Update progress bar
    const doneCount = ALBERT_STEPS.filter(s => {
        const icon = _albertStepEls[s.id]?.icon?.textContent;
        return icon === '✅';
    }).length;
    const bar = document.getElementById('albert-progress-bar');
    if (bar) bar.style.width = `${Math.round((doneCount / ALBERT_STEPS.length) * 100)}%`;
}

function albertProgressStatus(msg) {
    const el = document.getElementById('albert-progress-status');
    if (el) el.textContent = msg;
}

function albertProgressDone(success) {
    const closeBtn = document.getElementById('albert-progress-close');
    if (closeBtn) closeBtn.style.display = 'inline-block';
    const statusEl = document.getElementById('albert-progress-status');
    if (statusEl) {
        statusEl.textContent = success ? '✅ Transcription terminée avec succès !' : '❌ Une erreur est survenue.';
        statusEl.style.color = success ? '#6ee7b7' : '#fca5a5';
    }
    const bar = document.getElementById('albert-progress-bar');
    if (bar) bar.style.width = success ? '100%' : bar.style.width;
}

// ── Logique principale ────────────────────────────────────────────────────────

async function checkAlbertConfig() {
    return new Promise((resolve) => {
        const storageApi = typeof browser !== 'undefined' ? browser : chrome;
        storageApi.storage.local.get(['ai_albert'], (result) => {
            const apiKey = result.ai_albert;
            if (!apiKey || String(apiKey).trim() === '') {
                resolve({ ok: false, reason: 'no_key' });
            } else {
                resolve({ ok: true, apiKey: String(apiKey).trim() });
            }
        });
    });
}

async function albertHasWhisperModel(apiKey) {
    try {
        const resp = await fetch('https://albert.api.etalab.gouv.fr/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!resp.ok) return { found: false, error: `HTTP ${resp.status}` };
        const data = await resp.json();
        const models = data.data || data.models || [];
        const found = models.some(m => {
            const id = (m.id || m.name || '').toLowerCase();
            return id.includes('whisper-large-v3') || id.includes('openai/whisper');
        });
        return { found, modelList: models.map(m => m.id || m.name).join(', ') };
    } catch (e) {
        return { found: false, error: e.message };
    }
}

function pcmToWavBlob(pcmData, sampleRate) {
    const numSamples    = pcmData.length;
    const numChannels   = 1;
    const bitsPerSample = 16;
    const byteRate      = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign    = numChannels * bitsPerSample / 8;
    const dataSize      = numSamples * blockAlign;
    const buffer        = new ArrayBuffer(44 + dataSize);
    const view          = new DataView(buffer);

    const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
    writeStr(0, 'RIFF');  view.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');  writeStr(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true); writeStr(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
        const s = Math.max(-1, Math.min(1, pcmData[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        offset += 2;
    }
    return new Blob([buffer], { type: 'audio/wav' });
}

async function startAlbertTranscription() {
    // Ouvrir le popup de progression immédiatement
    showAlbertProgress();

    const transcribeBtn = document.getElementById('transcribe-albert-btn');
    if (transcribeBtn) transcribeBtn.disabled = true;

    try {
        // ── Étape 1 : Configuration ───────────────────────────────────────────
        albertStepUpdate('cfg', 'loading', 'Lecture du stockage extension...');
        albertProgressStatus('Vérification de la configuration...');

        const config = await checkAlbertConfig();
        if (!config.ok) {
            albertStepUpdate('cfg', 'error', 'Clé API Albert introuvable dans les paramètres');
            albertProgressStatus('Configure Albert dans les Paramètres de SemiaSB, puis réessaie.');
            albertProgressDone(false);
            return;
        }
        albertStepUpdate('cfg', 'ok', `Clé API trouvée (${config.apiKey.substring(0,8)}…)`);

        // ── Étape 2 : Fichier vidéo ───────────────────────────────────────────
        albertStepUpdate('file', 'loading', 'Vérification du fichier chargé...');
        albertProgressStatus('Vérification du fichier vidéo...');

        if (!currentVideoFile) {
            albertStepUpdate('file', 'error', 'Aucun fichier vidéo chargé. Utilisez "Charger le fichier .webm" d\'abord.');
            albertProgressDone(false);
            return;
        }
        albertStepUpdate('file', 'ok', `${currentVideoFile.name} (${(currentVideoFile.size / 1024 / 1024).toFixed(1)} Mo)`);

        // ── Étape 3 : Modèle Whisper ──────────────────────────────────────────
        albertStepUpdate('model', 'loading', 'Interrogation de l\'API Albert /v1/models...');
        albertProgressStatus('Vérification du modèle whisper-large-v3...');

        const modelCheck = await albertHasWhisperModel(config.apiKey);
        if (!modelCheck.found) {
            const detail = modelCheck.error
                ? `Erreur API : ${modelCheck.error}`
                : 'openai/whisper-large-v3 non trouvé dans la liste des modèles';
            albertStepUpdate('model', 'error', detail);
            albertProgressDone(false);
            return;
        }
        albertStepUpdate('model', 'ok', 'openai/whisper-large-v3 ✓');

        // ── Étape 4 : Extraction audio ────────────────────────────────────────
        albertStepUpdate('audio', 'loading', 'Décodage et ré-échantillonnage à 16 kHz...');
        albertProgressStatus('Extraction audio en cours (peut prendre quelques secondes)...');

        const arrayBuffer = await currentVideoFile.arrayBuffer();
        const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        let audioBuffer;
        try {
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        } catch(decodeErr) {
            albertStepUpdate('audio', 'error', `Échec du décodage audio : ${decodeErr.message}`);
            albertProgressDone(false);
            return;
        }

        const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, 16000);
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineCtx.destination);
        source.start();
        const rendered = await offlineCtx.startRendering();
        const pcmData  = rendered.getChannelData(0);
        const wavBlob  = pcmToWavBlob(pcmData, 16000);

        const durationSec = Math.round(audioBuffer.duration);
        const sizeMb      = (wavBlob.size / 1024 / 1024).toFixed(1);
        albertStepUpdate('audio', 'ok', `${durationSec}s audio, WAV ${sizeMb} Mo prêt`);

        // ── Étape 5 : Envoi vers Albert ───────────────────────────────────────
        albertStepUpdate('upload', 'loading', `Envoi de ${sizeMb} Mo vers albert.api.etalab.gouv.fr...`);
        albertProgressStatus('Envoi du fichier audio vers Albert...');

        const formData = new FormData();
        formData.append('file', wavBlob, 'audio.wav');
        formData.append('model', 'openai/whisper-large-v3');
        formData.append('language', 'fr');
        formData.append('response_format', 'json');

        let response;
        try {
            response = await fetch('https://albert.api.etalab.gouv.fr/v1/audio/transcriptions', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${config.apiKey}` },
                body: formData
            });
        } catch(netErr) {
            albertStepUpdate('upload', 'error', `Erreur réseau : ${netErr.message}`);
            albertProgressDone(false);
            return;
        }

        if (!response.ok) {
            const errText = await response.text().catch(() => '(réponse vide)');
            albertStepUpdate('upload', 'error', `HTTP ${response.status} — ${errText.substring(0, 120)}`);
            albertProgressDone(false);
            return;
        }
        albertStepUpdate('upload', 'ok', `Réponse reçue (HTTP ${response.status})`);

        // ── Étape 6 : Résultat ────────────────────────────────────────────────
        albertStepUpdate('result', 'loading', 'Décodage de la réponse JSON...');
        albertProgressStatus('Traitement de la transcription...');

        let result;
        try {
            result = await response.json();
        } catch(jsonErr) {
            albertStepUpdate('result', 'error', `Réponse invalide (non-JSON) : ${jsonErr.message}`);
            albertProgressDone(false);
            return;
        }

        const transcript = result.text || result.transcript || '';
        if (!transcript) {
            albertStepUpdate('result', 'error', 'Transcription vide reçue. Vérifiez que la vidéo contient de l\'audio.');
            albertProgressDone(false);
            return;
        }

        const wordCount = transcript.split(/\s+/).length;
        albertStepUpdate('result', 'ok', `${wordCount} mots transcrits`);
        albertProgressStatus(`Transcription terminée — ${wordCount} mots.`);
        albertProgressDone(true);

        // Injecter la transcription dans l'interface
        const transcriptPlaceholder = document.getElementById('transcript-placeholder');
        const transcriptArea        = document.getElementById('liveTranscript');
        if (transcriptPlaceholder) transcriptPlaceholder.style.display = 'none';
        if (transcriptArea) {
            transcriptArea.style.display = 'block';
            transcriptArea.value = transcript;
            transcriptArea.scrollTop = transcriptArea.scrollHeight;
        }
        if (currentVideoData) currentVideoData.transcription = transcript;
        showStatus('✅ Transcription Albert terminée !');

    } catch (unexpectedErr) {
        console.error('[Albert Transcription] Erreur inattendue:', unexpectedErr);
        albertProgressStatus(`Erreur inattendue : ${unexpectedErr.message}`);
        albertProgressDone(false);
    } finally {
        if (transcribeBtn) {
            transcribeBtn.disabled = false;
            transcribeBtn.innerHTML = '<i data-lucide="mic" style="width:14px;height:14px;"></i> 🎙️ Transcrire avec Albert';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
}

// ── Binding direct du bouton (le script est chargé en bas de <body>,
//    le DOM est déjà prêt — pas besoin de DOMContentLoaded) ───────────────────
(function bindAlbertButton() {
    const btn = document.getElementById('transcribe-albert-btn');
    if (btn) {
        btn.addEventListener('click', startAlbertTranscription);
        console.log('[Albert] Bouton de transcription lié.');
    } else {
        // Fallback si le DOM n'est pas encore prêt (cas improbable)
        document.addEventListener('DOMContentLoaded', () => {
            const b = document.getElementById('transcribe-albert-btn');
            if (b) b.addEventListener('click', startAlbertTranscription);
        });
    }
})();


/**
 * Vérifie que le fournisseur Albert est configuré et que le modèle
 * openai/whisper-large-v3 est disponible.
 * Retourne { ok: true, apiKey } ou { ok: false, reason: '...' }
 */
async function checkAlbertConfig() {
    return new Promise((resolve) => {
        const api = typeof browser !== 'undefined' ? browser : chrome;
        api.storage.local.get(['ai_provider', 'ai_albert', 'ai_albert_model'], (result) => {
            const provider = result.ai_provider;
            const apiKey   = result.ai_albert;
            const model    = result.ai_albert_model || '';

            if (provider !== 'albert' && !apiKey) {
                resolve({ ok: false, reason: 'not_configured' });
                return;
            }
            if (!apiKey || apiKey.trim() === '') {
                resolve({ ok: false, reason: 'no_key' });
                return;
            }
            resolve({ ok: true, apiKey: apiKey.trim(), savedModel: model });
        });
    });
}

/**
 * Interroge l'API Albert pour lister les modèles et vérifie la présence
 * du modèle whisper-large-v3.
 */
async function albertHasWhisperModel(apiKey) {
    try {
        const resp = await fetch('https://albert.api.etalab.gouv.fr/v1/models', {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });
        if (!resp.ok) return false;
        const data = await resp.json();
        const models = data.data || data.models || [];
        return models.some(m => {
            const id = (m.id || m.name || '').toLowerCase();
            return id.includes('whisper-large-v3') || id.includes('openai/whisper');
        });
    } catch {
        return false;
    }
}

/**
 * Lance la transcription audio via l'endpoint audio/transcriptions d'Albert.
 */
async function startAlbertTranscription() {
    const transcribeBtn = document.getElementById('transcribe-albert-btn');

    // 1) Vérifier la configuration Albert
    const config = await checkAlbertConfig();
    if (!config.ok) {
        showAlbertConfigPopup();
        return;
    }

    const { apiKey } = config;

    // 2) Vérifier que le fichier vidéo est chargé
    if (!currentVideoFile) {
        showStatus('⚠️ Veuillez d\'abord charger le fichier vidéo.');
        return;
    }

    // 3) Vérifier que le modèle whisper-large-v3 est disponible
    if (transcribeBtn) {
        transcribeBtn.disabled = true;
        transcribeBtn.textContent = '🔍 Vérification du modèle...';
    }

    const hasWhisper = await albertHasWhisperModel(apiKey);
    if (!hasWhisper) {
        showAlbertConfigPopup('whisper_missing');
        if (transcribeBtn) {
            transcribeBtn.disabled = false;
            transcribeBtn.innerHTML = '<i data-lucide="mic" style="width:14px;height:14px;"></i> 🎙️ Transcrire avec Albert';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
        return;
    }

    // 4) Extraire l'audio en WAV 16kHz mono
    const transcriptPlaceholder = document.getElementById('transcript-placeholder');
    const transcriptArea = document.getElementById('liveTranscript');

    if (transcriptPlaceholder) transcriptPlaceholder.style.display = 'none';
    if (transcriptArea) {
        transcriptArea.style.display = 'block';
        transcriptArea.value = '⏳ Extraction audio en cours...\n';
    }
    if (transcribeBtn) transcribeBtn.textContent = '⏳ Extraction audio...';

    try {
        const arrayBuffer = await currentVideoFile.arrayBuffer();

        const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        const audioBuffer  = await audioContext.decodeAudioData(arrayBuffer);

        const offlineCtx = new OfflineAudioContext(1, audioBuffer.length, 16000);
        const source = offlineCtx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(offlineCtx.destination);
        source.start();
        const rendered = await offlineCtx.startRendering();
        const pcmData  = rendered.getChannelData(0);

        // Encoder en WAV
        const wavBlob = pcmToWavBlob(pcmData, 16000);

        if (transcriptArea) transcriptArea.value += '✅ Audio extrait. Envoi vers Albert...\n';
        if (transcribeBtn) transcribeBtn.textContent = '📡 Envoi vers Albert...';

        // 5) Appel à l'API Albert audio/transcriptions
        const formData = new FormData();
        formData.append('file', wavBlob, 'audio.wav');
        formData.append('model', 'openai/whisper-large-v3');
        formData.append('language', 'fr');
        formData.append('response_format', 'json');

        const response = await fetch('https://albert.api.etalab.gouv.fr/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}` },
            body: formData
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Albert API error ${response.status}: ${errText}`);
        }

        const result = await response.json();
        const transcript = result.text || result.transcript || '';

        if (transcriptArea) {
            transcriptArea.value = transcript;
            transcriptArea.scrollTop = transcriptArea.scrollHeight;
        }
        if (currentVideoData) {
            currentVideoData.transcription = transcript;
        }
        showStatus('✅ Transcription Albert terminée !');

    } catch (error) {
        console.error('[Albert Transcription] Erreur:', error);
        if (transcriptArea) {
            transcriptArea.value += `\n❌ Erreur : ${error.message}`;
        }
        showStatus('❌ Erreur lors de la transcription.');
    } finally {
        if (transcribeBtn) {
            transcribeBtn.disabled = false;
            transcribeBtn.innerHTML = '<i data-lucide="mic" style="width:14px;height:14px;"></i> 🎙️ Transcrire avec Albert';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }
}

/**
 * Convertit un buffer PCM Float32 en Blob WAV.
 */
function pcmToWavBlob(pcmData, sampleRate) {
    const numSamples  = pcmData.length;
    const numChannels = 1;
    const bitsPerSample = 16;
    const byteRate     = sampleRate * numChannels * bitsPerSample / 8;
    const blockAlign   = numChannels * bitsPerSample / 8;
    const dataSize     = numSamples * blockAlign;
    const buffer       = new ArrayBuffer(44 + dataSize);
    const view         = new DataView(buffer);

    const writeStr = (off, str) => { for (let i = 0; i < str.length; i++) view.setUint8(off + i, str.charCodeAt(i)); };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitsPerSample, true);
    writeStr(36, 'data');
    view.setUint32(40, dataSize, true);

    let offset = 44;
    for (let i = 0; i < numSamples; i++) {
        const s = Math.max(-1, Math.min(1, pcmData[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
        offset += 2;
    }
    return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * Affiche un popup informatif demandant à l'utilisateur de configurer Albert.
 */
function showAlbertConfigPopup(reason = 'not_configured') {
    // Créer un overlay modal
    const existing = document.getElementById('albert-config-popup');
    if (existing) existing.remove();

    const isWisperMissing = reason === 'whisper_missing';

    const overlay = document.createElement('div');
    overlay.id = 'albert-config-popup';
    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 9999;
        background: rgba(0,0,0,0.7); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center;
    `;

    const title   = isWisperMissing
        ? '⚠️ Modèle Whisper non disponible'
        : '⚙️ Configuration Albert requise';
    const message = isWisperMissing
        ? `Le modèle <strong>openai/whisper-large-v3</strong> n'est pas disponible
           sur votre compte Albert.<br><br>
           Vérifiez que votre clé API donne accès à ce modèle ou contactez
           l'administrateur de votre organisation Albert.`
        : `Le fournisseur IA <strong>Albert</strong> n'est pas encore configuré.<br><br>
           Rendez-vous dans <strong>⚙️ Paramètres</strong> de SemiaSB, choisissez
           le fournisseur <em>Albert</em>, saisissez votre clé API, puis revenez
           ici pour transcrire votre vidéo.`;

    overlay.innerHTML = `
        <div style="
            background: linear-gradient(135deg, #1e293b, #0f172a);
            border: 1px solid rgba(99,102,241,0.4);
            border-radius: 16px; padding: 32px; max-width: 420px; width: 90%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
            font-family: 'Inter', sans-serif; color: #e2e8f0; text-align: center;
        ">
            <div style="font-size: 2.5rem; margin-bottom: 12px;">🎙️</div>
            <h2 style="margin: 0 0 16px; color: #818cf8; font-size: 1.2rem;">${title}</h2>
            <p style="color: #94a3b8; font-size: 0.9rem; line-height: 1.6; margin-bottom: 24px;">${message}</p>
            <div style="display: flex; gap: 10px; justify-content: center;">
                <button id="albert-popup-close" style="
                    padding: 10px 20px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15);
                    background: rgba(255,255,255,0.05); color: white; cursor: pointer; font-size: 0.9rem;
                ">Fermer</button>
                ${!isWisperMissing ? `<button id="albert-popup-settings" style="
                    padding: 10px 20px; border-radius: 8px; border: none;
                    background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white;
                    cursor: pointer; font-size: 0.9rem; font-weight: 600;
                ">Ouvrir les Paramètres</button>` : ''}
            </div>
        </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById('albert-popup-close').addEventListener('click', () => overlay.remove());
    overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

    const settingsBtn = document.getElementById('albert-popup-settings');
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            overlay.remove();
            // Ouvrir la page paramètres de l'extension
            const api = typeof browser !== 'undefined' ? browser : chrome;
            if (api?.runtime?.openOptionsPage) {
                api.runtime.openOptionsPage();
            } else {
                api.tabs.create({ url: api.runtime.getURL('sidepanel.html') });
            }
        });
    }
}

// Attacher le bouton Albert au chargement
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const transcribeAlbertBtn = document.getElementById('transcribe-albert-btn');
        if (transcribeAlbertBtn) {
            transcribeAlbertBtn.addEventListener('click', startAlbertTranscription);
        }
    }, 1000);
});
