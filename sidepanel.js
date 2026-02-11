// ===== SYSTÈME DE NAVIGATION =====
function initNavigation() {
  const menuItems = document.querySelectorAll('.menu-item');
  const viewContainers = document.querySelectorAll('.view-container');

  menuItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetView = item.getAttribute('data-view');

      // Retirer la classe active de tous les boutons
      menuItems.forEach(btn => btn.classList.remove('active'));

      // Ajouter la classe active au bouton cliqué
      item.classList.add('active');

      // Cacher toutes les vues
      viewContainers.forEach(view => view.classList.remove('active'));

      // Afficher la vue ciblée
      const targetContainer = document.getElementById(`view-${targetView}`);
      if (targetContainer) {
        targetContainer.classList.add('active');
      }

      // Initialiser la vue dossier si demandée
      if (targetView === 'folder') {
        initFolderView();
      }

      // Réinitialiser la vue Ask-Semia (retour au menu outils)
      if (targetView === 'Ask-Semia' && typeof initAIToolsNavigation === 'function') {
        initAIToolsNavigation();
      }
    });
  });
}




// ===== FONCTION DE CAPTURE D'ONGLET =====
let mediaRecorder = null;
// let recordedChunks = []; // DÉSACTIVÉ : On ne stocke plus en RAM pour éviter les crashs
let currentStream = null;
let audioContext = null;
let playbackSource = null;
let lastVideoFrame = null; // Pour la miniature

// Variables pour le chapitrage
let chapters = []; // Tableau des chapitres {number, name, timestamp}
let chapterCounter = 0; // Compteur de chapitres
let recordingStartTime = null; // Temps de début de l'enregistrement

const captureAudio = document.getElementById('captureAudio');
const captureVideo = document.getElementById('captureVideo');
const startBtn = document.getElementById('startCapture');
const startBtnWithTranscription = document.getElementById('startCaptureWithTranscription');
const stopBtn = document.getElementById('stopCapture');
const videoPreview = document.getElementById('preview');

// Fonction pour capturer une frame de la vidéo comme miniature
function captureThumbnail() {
  if (!videoPreview || videoPreview.videoWidth === 0) return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 160; // Petite taille
    canvas.height = 90;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoPreview, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch (e) {
    console.error("Erreur capture thumbnail:", e);
    return null;
  }
}

async function setupMediaRecorder(stream) {
  try {
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9,opus"
    });
  } catch (e) {
    mediaRecorder = new MediaRecorder(stream);
  }

  // recordedChunks = []; // DÉSACTIVÉ
  // Nettoyer stockage précédent
  if (window.CaptureStorage) await window.CaptureStorage.clear();

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      // recordedChunks.push(event.data); // DÉSACTIVÉ
      // Sauvegarde robuste (IndexedDB uniquement)
      if (window.CaptureStorage) {
        window.CaptureStorage.saveChunk(event.data).catch(err => console.error("Erreur persist storage:", err));
      }
    }
  };

  mediaRecorder.onstop = async () => {
    console.log("🛑 MediaRecorder ONSTOP (SidePanel)");

    // AFFICHER MODAL DEBUT TRAITEMENT
    showProcessingModal();
    updateProcessingStep("Préparation des fichiers...");

    // Reconstruction depuis IndexedDB (Anti-Crash RAM)
    updateProcessingStep("Récupération des données...");
    let finalBlobData = [];
    if (window.CaptureStorage) {
      finalBlobData = await window.CaptureStorage.getAllChunks();
      console.log(`[SidePanel] Reconstruction depuis IndexedDB (${finalBlobData.length} chunks)`);
    }

    if (finalBlobData.length === 0) {
      console.error("Aucune donnée vidéo trouvée.");
      showStatus("Erreur : Aucune donnée vidéo trouvée", true);
      hideProcessingModal();
      return;
    }

    const blob = new Blob(finalBlobData, { type: "video/webm" });
    finalBlobData = null; // Libération RAM immédiate

    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '');

    // Récupérer le titre de la vidéo et nettoyer les caractères invalides
    const videoTitleInput = document.getElementById('videoTitle');
    let videoTitle = videoTitleInput?.value.trim() || 'Capture-video';
    videoTitle = videoTitle.replace(/[<>:"/\\|?*]/g, '-');

    const filename = `${videoTitle}-${timestamp}.webm`;

    // RÉPARATION EBML (Seeking VLC)
    updateProcessingStep("Optimisation de la vidéo (Seekable)...");
    showStatus("⚙️ Optimisation de la vidéo (Seeking)...");

    // Petite pause pour laisser le DOM s'afficher
    await new Promise(r => setTimeout(r, 100));

    const fixedBlob = await fixWebM(blob, chapters);
    const url = URL.createObjectURL(fixedBlob);

    // JSON chapitres
    let chaptersJsonUrl = null;
    if (chapters.length > 0) {
      updateProcessingStep("Génération des chapitres...");
      const chaptersMetadata = {
        videoFilename: filename,
        recordingDate: new Date().toISOString(),
        chapters: chapters.map(ch => ({
          number: ch.number,
          name: ch.name,
          timestamp: ch.timestamp,
          formattedTime: ch.formattedTime
        }))
      };

      const chaptersBlob = new Blob(
        [JSON.stringify(chaptersMetadata, null, 2)],
        { type: 'application/json' }
      );
      chaptersJsonUrl = URL.createObjectURL(chaptersBlob);
    }

    // Download vidéo
    updateProcessingStep("Sauvegarde en cours...");

    // On passe les métadonnées pour l'historique et les dossiers
    const metadata = {
      id: Date.now(),
      type: 'video',
      title: videoTitle,
      date: new Date().toISOString(),
      thumbnail: lastVideoFrame, // Capturé au stopRecording
      chapters: chapters.length > 0 ? chapters : null,
      hasTranscript: false // Pas de live transcript direct dans le mode standard sidepanel
    };

    triggerDownload(url, filename, metadata);

    // Download JSON chapitres si présent
    if (chaptersJsonUrl && chapters.length > 0) {
      const chaptersFilename = filename.replace('.webm', '-chapitres.json');
      triggerDownload(chaptersJsonUrl, chaptersFilename);
    }

    setTimeout(() => {
      URL.revokeObjectURL(url);
      if (chaptersJsonUrl) URL.revokeObjectURL(chaptersJsonUrl);
    }, 60000);

    const statusMsg = chapters.length > 0
      ? `✅ Vidéo optimisée : ${filename} (${chapters.length} chapitres)`
      : `✅ Vidéo optimisée : ${filename}`;
    showStatus(statusMsg);

    // CACHER MODAL FIN
    updateProcessingStep("Terminé !");
    setTimeout(() => {
      hideProcessingModal();
    }, 1500);
  };
}

// ===== UTILS TRAITEMENT (MODAL + FIXWEBM) =====

function showProcessingModal() {
  const modal = document.getElementById('processing-modal');
  if (modal) {
    modal.style.display = 'flex';
    if (typeof lucide !== 'undefined') lucide.createIcons();
  }
}

function hideProcessingModal() {
  const modal = document.getElementById('processing-modal');
  if (modal) modal.style.display = 'none';
}

function updateProcessingStep(text) {
  const step = document.getElementById('processing-step');
  if (step) step.textContent = text;
}

/**
 * Répare les métadonnées WebM (durée + index) et injecte les chapitres
 * @param {Blob} blob 
 * @param {Array} chaptersArr Liste des chapitres {timestamp, name}
 * @returns {Promise<Blob>}
 */
async function fixWebM(blob, chaptersArr = []) {
  const lib = window.ebml || window.EBML;
  if (!lib) {
    console.warn("ts-ebml non chargé (ni 'ebml' ni 'EBML' trouvés).");
    return blob;
  }

  // SÉCURITÉ CRASH : Si le fichier dépasse 2 Go, on désactive l'optimisation
  const MAX_SIZE_FOR_FIX = 2024 * 1024 * 1024; // 2 GB
  if (blob.size > MAX_SIZE_FOR_FIX) {
    console.warn(`⚠️ Fichier très volumineux (${(blob.size / 1024 / 1024).toFixed(2)} Mo). Optimisation désactivée.`);
    return blob;
  }

  console.log("⚙️ (SidePanel) Début optimisation WebM via ts-ebml...");
  try {
    const decoder = new lib.Decoder();
    const reader = new lib.Reader();
    reader.logging = false;
    reader.drop_default_duration = false;

    let buf = await blob.arrayBuffer();
    const elms = decoder.decode(buf);
    elms.forEach(elm => reader.read(elm));
    reader.stop();

    console.log(`(SidePanel) Durée détectée: ${reader.duration}ms, Éléments: ${elms.length}`);

    // EXTRACTION ET MODIFICATION DES MÉTADONNÉES
    const metadatas = reader.metadatas;
    const info = lib.tools.extractElement("Info", metadatas);

    // Correction Durée
    lib.tools.removeElement("Duration", info);
    info.splice(1, 0, {
      name: "Duration",
      type: "f",
      data: lib.tools.createFloatBuffer(reader.duration, 8)
    });

    // Génération des Chapitres EBML
    let chaptersElms = [];
    if (chaptersArr && chaptersArr.length > 0) {
      console.log(`📦 (SidePanel) Encrage de ${chaptersArr.length} chapitres dans le WebM...`);
      chaptersElms.push({ name: "Chapters", type: "m", isEnd: false });
      chaptersElms.push({ name: "EditionEntry", type: "m", isEnd: false });

      chaptersArr.forEach(ch => {
        chaptersElms.push({ name: "ChapterAtom", type: "m", isEnd: false });
        const tsNS = Math.round(ch.timestamp * 1000000000);
        chaptersElms.push({ name: "ChapterTimeStart", type: "u", data: lib.tools.createUIntBuffer(tsNS) });
        chaptersElms.push({ name: "ChapterDisplay", type: "m", isEnd: false });
        chaptersElms.push({ name: "ChapString", type: "8", data: new TextEncoder().encode(ch.name) });
        chaptersElms.push({ name: "ChapLanguage", type: "s", data: new TextEncoder().encode("fre") });
        chaptersElms.push({ name: "ChapterDisplay", type: "m", isEnd: true });
        chaptersElms.push({ name: "ChapterAtom", type: "m", isEnd: true });
      });

      chaptersElms.push({ name: "EditionEntry", type: "m", isEnd: true });
      chaptersElms.push({ name: "Chapters", type: "m", isEnd: true });
    }

    // STRATÉGIE ROBUSTE : Concaténation + Décalage des Cues
    const encoder = new lib.Encoder();
    let chaptersBuf = new ArrayBuffer(0);

    if (chaptersElms.length > 0) {
      chaptersBuf = encoder.encode(chaptersElms);
      console.log(`📏 (SidePanel) Taille des chapitres: ${chaptersBuf.byteLength} octets. Décalage des Cues...`);

      if (reader.cues && reader.cues.length > 0) {
        reader.cues.forEach(cue => {
          cue.CueClusterPosition += chaptersBuf.byteLength;
        });
      }
    }

    // 1. Génération du header optimisé (Seeking)
    const refinedMetadataBuf = lib.tools.makeMetadataSeekable(
      reader.metadatas,
      reader.duration,
      reader.cues
    );

    // 2. BUFFER SURGERY : Forcer le Segment en "Taille Inconnue" (Unknown Size)
    const view = new DataView(refinedMetadataBuf);
    let patched = false;
    for (let i = 0; i < refinedMetadataBuf.byteLength - 4; i++) {
      if (view.getUint32(i) === 0x18538067) {
        const sizeOffset = i + 4;
        const uint8 = new Uint8Array(refinedMetadataBuf);
        const firstByte = uint8[sizeOffset];

        let length = 0;
        for (let b = 0; b < 8; b++) {
          if (firstByte & (0x80 >> b)) { length = b + 1; break; }
        }

        if (length > 0 && length <= 8) {
          console.log(`💉 (SidePanel) [fixWebM] Segment trouvé. Patching "Unknown Size"...`);
          uint8[sizeOffset] |= ((1 << (8 - length)) - 1);
          for (let j = 1; j < length; j++) {
            uint8[sizeOffset + j] = 0xFF;
          }
          patched = true;
        }
        break;
      }
    }

    const body = blob.slice(reader.metadataSize);
    const fixedBlob = new Blob([refinedMetadataBuf, chaptersBuf, body], { type: "video/webm" });

    console.log(`✅ (SidePanel) WebM optimisé. Taille: ${fixedBlob.size}`);
    return fixedBlob;
  } catch (e) {
    console.error("❌ Échec de la réparation EBML Sidepanel:", e);
    return blob;
  }
}


async function triggerDownload(url, filename, metadata = null) {
  const api = typeof browser !== "undefined" ? browser : chrome;
  if (api && api.downloads && api.downloads.download) {
    let backupFolder = "";
    try {
      const result = await api.storage.local.get(['backupFolder']);
      backupFolder = result.backupFolder || "";
    } catch (e) { }

    let finalPath = filename;
    if (backupFolder) {
      let cleanFolder = backupFolder.split(/[/\\]/).pop().replace(/[<>:"|?*]/g, '');
      if (cleanFolder) finalPath = `${cleanFolder}/${filename}`;
    }

    api.downloads.download({ url: url, filename: finalPath, saveAs: false }, (downloadId) => {
      if (!api.runtime.lastError && filename.endsWith('.webm') && metadata) {
        api.runtime.sendMessage({ action: "SAVE_METADATA", filename: finalPath, metadata: metadata });
      }
    });
    return;
  }
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
}

// ===== CHAPITRAGE =====

function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function showChapterForm() {
  const form = document.getElementById('chapter-input-form');
  const input = document.getElementById('chapterNameInput');
  const addBtn = document.getElementById('addChapterBtn');
  if (form && input && addBtn) {
    form.style.display = 'block';
    addBtn.disabled = true;
    input.value = '';
    input.focus();
  }
}

function hideChapterForm() {
  const form = document.getElementById('chapter-input-form');
  const addBtn = document.getElementById('addChapterBtn');
  if (form && addBtn) {
    form.style.display = 'none';
    addBtn.disabled = false;
  }
}

// Ajouter un chapitre
function addChapter(name) {
  console.log('addChapter called with name:', name);
  console.log('recordingStartTime:', recordingStartTime);

  if (!recordingStartTime) {
    console.error('Cannot add chapter: recording not started');
    showStatus('❌ Erreur : L\'enregistrement n\'est pas démarré', true);
    return;
  }

  const currentTime = Date.now();
  const elapsedSeconds = (currentTime - recordingStartTime) / 1000;

  chapterCounter++;
  const chapter = {
    number: chapterCounter,
    name: name || `Chapitre n°${chapterCounter}`,
    timestamp: elapsedSeconds,
    formattedTime: formatTime(elapsedSeconds)
  };

  console.log('Chapter created:', chapter);
  chapters.push(chapter);
  updateChaptersList();
  hideChapterForm();

  showStatus(`✅ Chapitre ${chapterCounter} ajouté : "${chapter.name}" à ${chapter.formattedTime}`);
}

// Mettre à jour l'affichage de la liste des chapitres
function updateChaptersList() {
  const container = document.getElementById('chapters-container');
  if (!container) return;

  if (chapters.length === 0) {
    container.innerHTML = '<p style="color: var(--text-secondary); font-size: 12px; font-style: italic;">Aucun chapitre pour le moment</p>';
    return;
  }

  container.innerHTML = chapters.map(ch => `
    <div style="padding: 8px; margin-bottom: 6px; background: white; border: 1px solid var(--border-color); border-radius: 4px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <strong style="color: #8b5cf6;">Chapitre ${ch.number}</strong>
        <span style="margin: 0 8px; color: var(--text-secondary);">•</span>
        <span>${ch.name}</span>
      </div>
      <span style="color: var(--text-secondary); font-size: 12px; font-family: monospace;">${ch.formattedTime}</span>
    </div>
  `).join('');
}

// Réinitialiser les chapitres
function resetChapters() {
  chapters = [];
  chapterCounter = 0;
  // Ne pas réinitialiser recordingStartTime ici car cette fonction est appelée
  // APRÈS l'initialisation de recordingStartTime dans le code de démarrage
  updateChaptersList();
}

// ===== FIN FONCTIONS DE CHAPITRAGE =====

function showStatus(message, isError = false) {
  const statusDiv = document.getElementById('status');
  if (!statusDiv) return;
  statusDiv.textContent = message;
  statusDiv.className = '';
  statusDiv.classList.add(isError ? 'error' : 'success');
  statusDiv.style.display = 'block';
  setTimeout(() => statusDiv.style.display = 'none', 3000);
}

if (startBtn) {
  startBtn.onclick = async () => {
    const enableAudio = captureAudio.checked;
    const enableVideo = captureVideo.checked;

    if (!enableAudio && !enableVideo) {
      alert("Il faut au moins l'audio ou la vidéo.");
      return;
    }

    chrome.tabCapture.capture(
      {
        audio: enableAudio,
        video: enableVideo,
        videoConstraints: {
          mandatory: {
            maxWidth: 1920,
            maxHeight: 1080,
            maxFrameRate: 30
          }
        }
      },
      async (stream) => {
        if (chrome.runtime.lastError || !stream) {
          alert("Impossible de capturer cet onglet : " + (chrome.runtime.lastError?.message || ""));
          return;
        }

        currentStream = stream;
        videoPreview.srcObject = stream;

        if (enableAudio && stream.getAudioTracks()[0]) {
          audioContext = new (window.AudioContext || window.webkitAudioContext)();
          playbackSource = audioContext.createMediaStreamSource(stream);
          playbackSource.connect(audioContext.destination);
        }

        await setupMediaRecorder(stream);
        mediaRecorder.start(500);

        // Initialiser le chapitrage
        recordingStartTime = Date.now();
        console.log('Recording started! recordingStartTime set to:', recordingStartTime);
        console.log('Type of recordingStartTime:', typeof recordingStartTime);
        resetChapters();
        const chapterControls = document.getElementById('chapter-controls');
        if (chapterControls) {
          chapterControls.style.display = 'block';
          console.log('Chapter controls displayed');
          // Réinitialiser les icônes Lucide pour le bouton de chapitrage
          if (typeof lucide !== 'undefined') {
            setTimeout(() => lucide.createIcons(), 100);
          }
        } else {
          console.error('chapter-controls element not found!');
        }

        startBtn.disabled = true;
        stopBtn.disabled = false;
        captureAudio.disabled = true;
        captureVideo.disabled = true;

        showStatus("✅ Capture en cours (audio 🔊 + vidéo live)");
      }
    );
  };
}

if (stopBtn) {
  stopBtn.onclick = () => {
    // Capturer la miniature avant d'arrêter
    lastVideoFrame = captureThumbnail();

    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }

    if (currentStream) {
      currentStream.getTracks().forEach(t => t.stop());
      currentStream = null;
    }

    if (playbackSource) {
      playbackSource.disconnect();
      playbackSource = null;
    }
    if (audioContext && audioContext.state !== 'closed') {
      audioContext.close();
      audioContext = null;
    }

    videoPreview.srcObject = null;

    // Masquer les contrôles de chapitrage
    const chapterControls = document.getElementById('chapter-controls');
    if (chapterControls) chapterControls.style.display = 'none';
    hideChapterForm();

    // Réinitialiser recordingStartTime
    recordingStartTime = null;

    startBtn.disabled = false;
    stopBtn.disabled = true;
    captureAudio.disabled = false;
    captureVideo.disabled = false;
  };
}

/**
 * Vérifie si le serveur local tourne sur localhost:8080
 */
async function checkServerRunning() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1000); // 1s timeout
    const response = await fetch("http://localhost:8080/", {
      method: "HEAD",
      mode: "no-cors",
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return true;
  } catch (e) {
    console.warn("[SidePanel] Serveur local (localhost:8080) non détecté.");
    return false;
  }
}

if (startBtnWithTranscription) {
  startBtnWithTranscription.onclick = async () => {
    // Détection dynamique du serveur
    const isServerUp = await checkServerRunning();

    if (isServerUp) {
      console.log("[SidePanel] 🚀 Redirection vers le serveur local.");
      const url = "http://localhost:8080/capture.html";
      window.open(url, "_blank");
    } else {
      console.log("[SidePanel] 💡 Serveur absent. Ouverture de la page locale de l'extension.");
      // chrome.runtime.getURL nous donne l'URL interne (chrome-extension://...)
      const url = chrome.runtime.getURL("capture.html");
      window.open(url, "_blank");
    }
  };
}

// ===== GESTIONNAIRES DE CHAPITRAGE =====
const addChapterBtn = document.getElementById('addChapterBtn');
const validateChapterBtn = document.getElementById('validateChapterBtn');
const cancelChapterBtn = document.getElementById('cancelChapterBtn');
const chapterNameInput = document.getElementById('chapterNameInput');

console.log('Chapter buttons found:', {
  addChapterBtn: !!addChapterBtn,
  validateChapterBtn: !!validateChapterBtn,
  cancelChapterBtn: !!cancelChapterBtn,
  chapterNameInput: !!chapterNameInput
});

if (addChapterBtn) {
  addChapterBtn.onclick = () => {
    console.log('Add chapter button clicked');
    showChapterForm();
  };
} else {
  console.warn('addChapterBtn not found in DOM');
}

if (validateChapterBtn) {
  validateChapterBtn.onclick = () => {
    console.log('Validate button clicked');
    const name = chapterNameInput?.value.trim();
    console.log('Chapter name:', name);
    console.log('recordingStartTime at validation:', recordingStartTime);
    if (name) {
      addChapter(name);
    } else {
      addChapter(); // Utilise le nom par défaut
    }
  };
} else {
  console.warn('validateChapterBtn not found in DOM');
}

if (cancelChapterBtn) {
  cancelChapterBtn.onclick = () => {
    hideChapterForm();
  };
}

if (chapterNameInput) {
  chapterNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const name = chapterNameInput.value.trim();
      if (name) {
        addChapter(name);
      } else {
        addChapter(); // Utilise le nom par défaut
      }
    } else if (e.key === 'Escape') {
      hideChapterForm();
    }
  });
}

// ===== INITIALISATION =====
initNavigation();

if (typeof initNoteCapture !== 'undefined') initNoteCapture();
if (typeof initAIFunction !== 'undefined') initAIFunction();
if (typeof initSettings !== 'undefined') initSettings();
if (typeof initFolderView !== 'undefined') initFolderView();
if (typeof lucide !== 'undefined') lucide.createIcons();
