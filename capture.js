// ===== ÉTAT GLOBAL =====
console.log("capture.js chargé et actif");
let currentStream = null; // Le flux final (mixé)
let mixDestination = null; // Destination du mixage audio
let originalDisplayStream = null; // Le flux écran d'origine
let micStream = null; // Le flux microphone
let micGainNode = null; // Noeud de gain pour le microphone (Mute)
let monitorGainNode = null; // Noeud de gain pour le monitoring (Mode Silencieux)
let mediaRecorder = null;
let recordedChunks = [];
let audioContext = null;
let playbackSource = null;
let recordingStartTime = null;
let lastVideoFrame = null;
let lastDownloadData = null; // Stocke { url, filename } pour fallback en cas d'erreur extension
let analyserNode = null;     // Analyseur pour le VU-mètre
let animationId = null;      // ID de la boucle d'animation

// Chapitrage
let chapters = [];
let chapterCounter = 0;

// Extension Bridge
let extensionBridgeReady = false;
let extensionSettings = {}; // Stocke les clés API, dossiers, etc.
// EXPOSE pour ai-utils.js
window.extensionSettings = extensionSettings;

// DOM
const captureAudio = document.getElementById('captureAudio');
const captureMic = document.getElementById('captureMic');
const silentMode = document.getElementById('silentMode');
const captureVideo = document.getElementById('captureVideo');
const startBtn = document.getElementById('startCapture');
const stopBtn = document.getElementById('stopCapture');
const videoPreview = document.getElementById('preview');

// ===== UTIL =====
function showStatus(message, isError = false) {
  const statusDiv = document.getElementById('status');
  if (!statusDiv) return;
  statusDiv.textContent = message;
  statusDiv.className = '';
  statusDiv.classList.add(isError ? 'error' : 'success');
  statusDiv.style.display = 'block';
  setTimeout(() => statusDiv.style.display = 'none', 3000);
}

function captureThumbnail() {
  if (!videoPreview || videoPreview.videoWidth === 0) return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 90;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(videoPreview, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.7);
  } catch (e) {
    console.error("Erreur capture thumbnail:", e);
    return null;
  }
}

// ===== COMM EXTENSION =====
window.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg) return;

  if (msg.type === "SEMIA_BRIDGE_READY" || msg.type === "SEMIA_HELLO_ACK") {
    console.log("✅ Pont Extension détecté !");
    extensionBridgeReady = true;
    showStatus("✅ Connecté à l'extension SemiaSB (Bridge)");
    // Demander les params
    window.postMessage({ type: "SEMIA_GET_SETTINGS" }, "*");
  } else if (msg.type === "SEMIA_SETTINGS_RESPONSE") {
    console.log("⚙️ Paramètres reçus de l'extension:", msg.data);
    extensionSettings = msg.data || {};
    window.extensionSettings = extensionSettings; // Update global for ai-utils
    // Ici on pourrait pré-remplir des champs si besoin
  } else if (msg.type === "SEMIA_SAVE_SUCCESS") {
    showStatus(`✅ Fichier sauvegardé par l'extension: ${msg.filename}`);
    // Nettoyage stockage après succès
    if (window.CaptureStorage) window.CaptureStorage.clear();
    lastDownloadData = null; // Reset
  } else if (msg.type === "SEMIA_SAVE_ERROR") {
    showStatus(`❌ Erreur sauvegarde extension : ${msg.error}`, true);
    if (lastDownloadData) {
      console.warn("🔄 Tentative de sauvegarde locale suite à l'échec de l'extension...");
      const { url, filename } = lastDownloadData;
      // Fallback manuel simple
      const a = document.createElement('a');
      a.href = url;
      a.download = "SAVE_FALLBACK_" + filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      showStatus("⚠️ Sauvegarde locale effectuée (Fallback)");
      lastDownloadData = null;
    }
  }
});

// Initialisation directe si on est dans l'extension
(async function initExtensionContext() {
  const api = typeof browser !== "undefined" ? browser : chrome;
  if (api && api.storage && api.storage.local) {
    console.log("📦 Contexte Extension direct détecté. Chargement des paramètres...");
    const settingsKeys = ['aiProvider', 'backupFolder', 'ai_semia', 'ai_mistral', 'ai_openai', 'ai_gemini', 'ai_anthropic'];
    const result = await api.storage.local.get(settingsKeys);
    extensionSettings = result || {};
    window.extensionSettings = extensionSettings;
    extensionBridgeReady = true; // On considère que l'API est prête
    showStatus("✅ Extension SemiaSB prête (Direct)");
  } else {
    // TENTATIVE PWA : Charger depuis localStorage si pas d'extension
    console.log("🌐 Contexte Web détecté. Recherche dans localStorage...");
    try {
      const savedSettings = localStorage.getItem('semia_settings');
      if (savedSettings) {
        extensionSettings = JSON.parse(savedSettings);
        window.extensionSettings = extensionSettings;
        console.log("⚙️ Paramètres PWA chargés:", extensionSettings);
      }
    } catch (e) {
      console.warn("Erreur chargement settings PWA:", e);
    }

    // Sinon on attend le bridge (localhost)
    setTimeout(() => {
      if (!extensionSettings.aiProvider) { // Si toujours rien chargé
        console.log("Creation du handshake (SEMIA_HELLO)...");
        window.postMessage({ type: "SEMIA_HELLO" }, "*");
      }
    }, 1000);
  }
})();

// Enregistrement PWA Service Worker + Gestion Installation
let deferredPrompt;
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('🚀 PWA Service Worker enregistré !', reg.scope))
      .catch(err => console.log('❌ Échec enregistrement SW:', err));
  });

  window.addEventListener('beforeinstallprompt', (e) => {
    // Empêcher Chrome d'afficher le mini-info-bar tout de suite
    e.preventDefault();
    // Garder l'événement pour plus tard
    deferredPrompt = e;
    // Afficher notre bouton d'installation
    const installBtn = document.getElementById('pwaInstallBtn');
    if (installBtn) {
      installBtn.style.display = 'inline-block';
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  });

  window.addEventListener('appinstalled', () => {
    console.log('✅ PWA Installée avec succès !');
    deferredPrompt = null;
    const installBtn = document.getElementById('pwaInstallBtn');
    if (installBtn) installBtn.style.display = 'none';
  });
}

// Vérification ROBUSTE de la récupération (Sans délai arbitraire)
async function checkRecovery() {
  if (window.CaptureStorage) {
    try {
      const hasData = await window.CaptureStorage.hasData();
      if (hasData) {
        console.log("⚠️ Données de récupération détectées ! Affichage bannière.");
        const banner = document.getElementById('recovery-banner');
        if (banner) banner.style.display = 'block';
      }
    } catch (e) {
      console.error("Erreur check recovery:", e);
    }
  } else {
    // Si CaptureStorage n'est pas encore là, on réessaie un peu plus tard (rare)
    console.warn("CaptureStorage introuvable, nouvelle tentative dans 500ms...");
    setTimeout(checkRecovery, 500);
  }
}
// Lancer la vérification dès que possible
checkRecovery();

// Binding Recovery
document.getElementById('recoverBtn')?.addEventListener('click', async () => {
  if (!window.CaptureStorage) return;
  const chunks = await window.CaptureStorage.getAllChunks();
  if (chunks.length > 0) {
    const blob = new Blob(chunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const filename = `RECUPERATION-SemiaSB-${new Date().getTime()}.webm`;
    triggerDownload(url, filename);
    showStatus("✅ Vidéo récupérée avec succès.");
  }
  document.getElementById('recovery-banner').style.display = 'none';
});

document.getElementById('discardRecoverBtn')?.addEventListener('click', async () => {
  if (window.CaptureStorage) await window.CaptureStorage.clear();
  document.getElementById('recovery-banner').style.display = 'none';
});

// Helper pour convertir Blob -> DataURL
function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ===== UTIL =====
async function triggerDownload(url, filename, metadata = null) {
  const api = typeof browser !== "undefined" ? browser : chrome;

  // 1. Si on est dans l'extension, on utilise chrome.downloads pour le dossier
  if (api && api.downloads && api.downloads.download) {
    // RECHARGE FORCEE DES REGLAGES : Pour éviter que extensionSettings soit vide ou obsolète
    try {
      if (api.storage && api.storage.local) {
        const freshSettings = await api.storage.local.get(['backupFolder']);
        if (freshSettings && freshSettings.backupFolder) {
          console.log(`[Capture] Dossier de backup détecté (Storage): ${freshSettings.backupFolder}`);
          extensionSettings.backupFolder = freshSettings.backupFolder;
        }
      }
    } catch (e) {
      console.warn("Erreur lecture storage avant download:", e);
    }

    let backupFolder = (extensionSettings && extensionSettings.backupFolder) || '';
    let finalPath = filename;

    if (backupFolder) {
      let cleanFolder = backupFolder;
      if (cleanFolder.includes(':') || cleanFolder.startsWith('/') || cleanFolder.startsWith('\\')) {
        cleanFolder = cleanFolder.split(/[/\\]/).pop();
      }
      cleanFolder = cleanFolder.replace(/\.\./g, '').replace(/[<>:"|?*]/g, '');
      if (cleanFolder) finalPath = `${cleanFolder}/${filename}`;
    }

    console.log(`[Capture] Lancement chrome.downloads vers : ${finalPath}`);

    api.downloads.download({
      url: url,
      filename: finalPath,
      saveAs: false
    }, (downloadId) => {
      if (api.runtime.lastError) {
        console.error("[Capture] Erreur chrome.downloads:", api.runtime.lastError);
        showStatus("❌ Erreur téléchargement extension", true);
      } else {
        console.log(`[Capture] Download démarré (ID: ${downloadId})`);
        // Sauvegarde des métadonnées (uniquement pour les vidéos)
        if (filename.endsWith('.webm') && metadata) {
          // Si on est dans l'extension, on parle au background DIRECTEMENT
          api.runtime.sendMessage({
            action: "SAVE_METADATA",
            filename: finalPath,
            metadata: metadata
          }, (response) => {
            console.log("[Capture] Réponse SAVE_METADATA:", response);
          });
        }
      }
    });
    return;
  }

  // 1b. Si on est en PWA/Web, on tente de sauvegarder les métadonnées dans localStorage (simulé)
  if (!api || !api.downloads) {
    console.log("[Capture] Hors extension, sauvegarde des métadonnées en local...");
    try {
      const pwaVideosKey = 'semia_pwa_videos';
      const pwaVideos = JSON.parse(localStorage.getItem(pwaVideosKey) || '[]');
      if (metadata && !pwaVideos.some(v => v.id === metadata.id)) {
        metadata.filename = filename;
        pwaVideos.push(metadata);
        localStorage.setItem(pwaVideosKey, JSON.stringify(pwaVideos));
      }
    } catch (e) {
      console.error("Erreur sauvegarde métadonnées PWA:", e);
    }
  }

  // 2. Si on est sur localhost (Bridge), on utilise le transfert par morceaux pour les vidéos
  // afin d'éviter le crash "Message size exceeded" tout en respectant le dossier de backup.
  if (extensionBridgeReady) {
    try {
      console.log(`📤 Envoi vers extension (Bridge) : ${filename}`);
      let blob = null;

      // Récupération du Blob
      if (url.startsWith('blob:')) {
        blob = await fetch(url).then(r => r.blob());
      } else {
        // Data URL -> Blob
        const res = await fetch(url);
        blob = await res.blob();
      }

      const CHUNK_SIZE = 1024 * 1024 * 3; // 3 Mo par morceau (Safe pour la limite de 64 Mo)
      const totalChunks = Math.ceil(blob.size / CHUNK_SIZE);
      const transferId = Date.now().toString();

      console.log(`[Capture] Début transfert par morceaux (${totalChunks} chunks)`);
      showStatus(`Envoi vers extension... (0%)`);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(blob.size, start + CHUNK_SIZE);
        const chunkBlob = blob.slice(start, end);

        // Conversion du chunk en Base64
        const base64Chunk = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result;
            // Retirer le préfixe data:video/webm;base64, si présent (FileReader le met)
            const base64 = res.split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(chunkBlob);
        });

        // Envoi du morceau
        window.postMessage({
          type: "SEMIA_SAVE_CHUNK",
          transferId: transferId,
          chunk: base64Chunk,
          index: i,
          total: totalChunks,
          filename: filename,
          metadata: i === totalChunks - 1 ? metadata : null
        }, "*");

        // Mise à jour progression UI
        const percent = Math.round(((i + 1) / totalChunks) * 100);
        showStatus(`Envoi vers extension... (${percent}%)`);

        // Petite pause pour ne pas saturer le bridge
        await new Promise(r => setTimeout(r, 10));
      }

      return;
    } catch (e) {
      console.error("Erreur envoi extension (Chunking), fallback local:", e);
      showStatus("❌ Erreur transfert extension -> Fallback local", true);
    }
  }

  // 3. Fallback final (navigateur natif)
  const a = document.createElement('a');
  a.href = url;

  // Tentative de prepend du dossier pour le téléchargement natif (souvent ignoré par les navigateurs mais worth it)
  let nativeFilename = filename;
  let backupFolder = (extensionSettings && extensionSettings.backupFolder) || '';
  if (backupFolder) {
    let cleanFolder = backupFolder;
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
    showStatus("⚠️ Fichier > 2Go : Seeking et Chapitres désactivés (Anti-Crash)", false);
    return blob;
  }

  console.log("⚙️ Début optimisation WebM via ts-ebml...");
  try {
    const decoder = new lib.Decoder();
    const reader = new lib.Reader();
    reader.logging = false;
    reader.drop_default_duration = false;

    let buf = await blob.arrayBuffer();
    const elms = decoder.decode(buf);
    elms.forEach(elm => reader.read(elm));
    reader.stop();

    console.log(`Durée détectée: ${reader.duration}ms, Éléments: ${elms.length}`);

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
      console.log(`📦 Encrage de ${chaptersArr.length} chapitres dans le WebM...`);
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
      console.log(`📏 Taille des chapitres: ${chaptersBuf.byteLength} octets. Décalage des Cues...`);

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
    // Le Segment ID est 0x18538067 (4 octets).
    const view = new DataView(refinedMetadataBuf);
    let patched = false;
    for (let i = 0; i < refinedMetadataBuf.byteLength - 4; i++) {
      if (view.getUint32(i) === 0x18538067) {
        const sizeOffset = i + 4;
        const uint8 = new Uint8Array(refinedMetadataBuf);
        const firstByte = uint8[sizeOffset];

        // Détection de la longueur du VINT (nombre de bits à 0 avant le premier 1)
        let length = 0;
        for (let b = 0; b < 8; b++) {
          if (firstByte & (0x80 >> b)) { length = b + 1; break; }
        }

        if (length > 0 && length <= 8) {
          console.log(`💉 [fixWebM] Segment trouvé à l'offset ${i}. VINT length: ${length}. Patching "Unknown Size"...`);
          // Pour la taille inconnue, on garde les bits de classe et on met tout le reste à 1
          uint8[sizeOffset] |= ((1 << (8 - length)) - 1);
          for (let j = 1; j < length; j++) {
            uint8[sizeOffset + j] = 0xFF;
          }
          patched = true;
        }
        break;
      }
    }
    if (!patched) console.warn("⚠️ [fixWebM] Attention : Segment non trouvé ou VINT invalide.");

    const body = blob.slice(reader.metadataSize);
    console.log(`📦 [fixWebM] Assemblage final: Metadata(${refinedMetadataBuf.byteLength}) + Chapters(${chaptersBuf.byteLength}) + Body(${body.size})`);

    // 3. CONCATÉNATION FINALE
    const fixedBlob = new Blob([refinedMetadataBuf, chaptersBuf, body], { type: "video/webm" });

    buf = null;
    console.log(`✅ WebM optimisé (Seeking + Chapitres Robustes 2.1). Taille: ${fixedBlob.size}`);
    return fixedBlob;
  } catch (e) {
    console.error("❌ Échec de la réparation EBML:", e);
    showStatus("⚠️ Erreur optimisation WebM (Seeking/Chapitres indisponibles)", true);
    return blob;
  }
}

// ===== MEDIARECORDER =====
async function setupMediaRecorder(stream) {
  try {
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9,opus"
    });
  } catch (e) {
    mediaRecorder = new MediaRecorder(stream);
  }

  // recordedChunks = []; // DÉSACTIVÉ : On ne stocke plus en RAM pour éviter les crashs sur longs records
  // Nettoyer stockage précédent avant de commencer
  if (window.CaptureStorage) await window.CaptureStorage.clear();

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      // recordedChunks.push(event.data); // DÉSACTIVÉ : RAM Save
      // Sauvegarde robuste (IndexedDB uniquement)
      if (window.CaptureStorage) {
        window.CaptureStorage.saveChunk(event.data).catch(err => console.error("Erreur persist storage:", err));
      }
    }
  };


  // ===== MODAL TRAITEMENT =====
  function showProcessingModal() {
    const modal = document.getElementById('processing-modal');
    if (modal) {
      modal.style.display = 'flex';
      // Re-init icones Lucide dans le modal si besoin
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

  mediaRecorder.onstop = async () => {
    console.log("🛑 MediaRecorder ONSTOP déclenché");

    // AFFICHER MODAL DEBUT TRAITEMENT
    showProcessingModal();
    updateProcessingStep("Préparation des fichiers...");

    // Reconstruction depuis IndexedDB (Anti-Crash RAM)
    updateProcessingStep("Récupération des données...");
    let finalBlobData = [];
    if (window.CaptureStorage) {
      finalBlobData = await window.CaptureStorage.getAllChunks();
      console.log(`[Capture] Reconstruction depuis IndexedDB (${finalBlobData.length} chunks)`);
    }

    if (finalBlobData.length === 0) {
      console.error("Aucune donnée vidéo trouvée dans le stockage.");
      showStatus("Erreur : Aucune donnée vidéo trouvée", true);
      hideProcessingModal();
      return;
    }

    const blob = new Blob(finalBlobData, { type: "video/webm" });
    finalBlobData = null; // Libération mémoire immédiate
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '');

    const videoTitleInput = document.getElementById('videoTitle');
    let videoTitle = videoTitleInput?.value.trim() || 'Capture-video';
    videoTitle = videoTitle.replace(/[<>:"/\\|?*]/g, '-');

    const filename = `${videoTitle}-${timestamp}.webm`;

    // REPARATION EBML ( Seeking VLC )
    updateProcessingStep("Optimisation de la vidéo (Seekable)...");
    showStatus("⚙️ Optimisation de la vidéo pour VLC...");

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

    // Récupérer liveTranscript AVANT d'utiliser dans metadata
    const liveTranscript = document.getElementById('liveTranscript');
    const hasTranscript = liveTranscript && liveTranscript.value.trim().length > 0;

    // On passe les métadonnées pour que l'extension puisse l'ajouter à la  liste "Dossiers"
    const metadata = {
      id: Date.now(),
      type: 'video',
      title: videoTitle,
      date: new Date().toISOString(),
      thumbnail: lastVideoFrame, // Capturé au stopRecording
      chapters: chapters.length > 0 ? chapters : null,
      hasTranscript: hasTranscript
    };

    triggerDownload(url, filename, metadata);

    // Download JSON chapitres si présent
    if (chaptersJsonUrl && chapters.length > 0) {
      const chaptersFilename = filename.replace('.webm', '-chapitres.json');
      triggerDownload(chaptersJsonUrl, chaptersFilename);
    }

    // Download Transcript (.txt) si présent
    if (liveTranscript) {
      console.log("Contenu transcript (longueur):", liveTranscript.value.trim().length);
    }

    if (liveTranscript && liveTranscript.value.trim().length > 0) {
      console.log("📝 Génération du fichier transcript .txt...");
      const txtContent = liveTranscript.value.trim();
      const txtBlob = new Blob([txtContent], { type: 'text/plain' });
      const txtUrl = URL.createObjectURL(txtBlob);
      const txtFilename = filename.replace('.webm', '.txt');

      triggerDownload(txtUrl, txtFilename);
      console.log("✅ Transcript téléchargé:", txtFilename);

      // Nettoyage après 1 minute
      setTimeout(() => URL.revokeObjectURL(txtUrl), 60000);
    }

    setTimeout(() => {
      URL.revokeObjectURL(url);
      if (chaptersJsonUrl) URL.revokeObjectURL(chaptersJsonUrl);
    }, 60000);

    const statusMsg = chapters.length > 0
      ? `✅ Fichier sauvegardé : ${filename} (${chapters.length} chapitres)`
      : `✅ Fichier sauvegardé : ${filename}`;
    showStatus(statusMsg);

    // CACHER MODAL FIN
    updateProcessingStep("Terminé !");
    setTimeout(() => {
      hideProcessingModal();
    }, 1500); // Laisser le message "Terminé" 1.5s
  };
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

function addChapter(name) {
  if (!recordingStartTime) {
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

  chapters.push(chapter);
  updateChaptersList();
  hideChapterForm();

  showStatus(`✅ Chapitre ${chapterCounter} ajouté : "${chapter.name}" à ${chapter.formattedTime}`);
}

function updateChaptersList() {
  const container = document.getElementById('chapters-container');
  if (!container) return;

  if (chapters.length === 0) {
    container.innerHTML = '<p style="color:#666; font-size:12px; font-style:italic;">Aucun chapitre pour le moment</p>';
    return;
  }

  container.innerHTML = chapters.map(ch => `
    <div style="padding:8px; margin-bottom:6px; background:white; border:1px solid #ddd; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
      <div>
        <strong style="color:#8b5cf6;">Chapitre ${ch.number}</strong>
        <span style="margin:0 8px; color:#888;">•</span>
        <span>${ch.name}</span>
      </div>
      <span style="color:#666; font-size:12px; font-family:monospace;">${ch.formattedTime}</span>
    </div>
  `).join('');
}

function resetChapters() {
  chapters = [];
  chapterCounter = 0;
  updateChaptersList();
}

// ===== START / STOP =====
// ===== START / STOP =====
async function toggleMicrophone(enabled) {
  console.log("Microphone toggle:", enabled);
  if (!audioContext || !mixDestination || !micGainNode) return;

  if (enabled) {
    // 1. Activer le son dans le mix (Gain 1)
    micGainNode.gain.setValueAtTime(1, audioContext.currentTime);

    if (micStream) {
      // Déjà capturé, on réactive les pistes
      micStream.getAudioTracks().forEach(t => t.enabled = true);
      console.log("🎤 Microphone réactivé");
    } else {
      // Premier ajout : on capture
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true
          }
        });
        micStream = stream;
        const sourceMic = audioContext.createMediaStreamSource(stream);
        sourceMic.connect(micGainNode); // Connecter au GainNode (qui est connecté au mix)
        console.log("🎤 Microphone capturé et ajouté au mix (via GainNode)");
      } catch (err) {
        console.warn("⚠️ Impossible de capturer le microphone:", err);
        if (captureMic) captureMic.checked = false;
        showStatus("Impossible de capturer le micro", true);
        return; // Stop ici
      }
    }
  } else {
    // 1. Couper le son dans le mix (Gain 0) - "Hard Mute"
    micGainNode.gain.setValueAtTime(0, audioContext.currentTime);

    // 2. Désactiver les pistes (Soft Mute)
    if (micStream) {
      micStream.getAudioTracks().forEach(t => t.enabled = false);
      console.log("🎤 Microphone coupé (mute)");
    }
  }

  // 3. Gestion Spéciale STT (Surtout pour Web Speech qui ignore le mix)
  // On ne le fait que si l'enregistrement est déjà lancé (recordingStartTime non null)
  // Sinon startRecording s'en chargera à l'initialisation.
  if (recordingStartTime) {
    const sttEngine = document.querySelector('input[name="sttEngine"]:checked')?.value || 'webspeech';
    console.log(`Mise à jour STT (${sttEngine}) suite toggle micro...`);

    if (sttEngine === 'webspeech') {
      if (enabled) {
        // Redémarrer Web Speech
        if (typeof startWebSpeech === 'function') {
          console.log("🔄 Redémarrage Web Speech...");
          startWebSpeech(currentStream);
        }
      } else {
        // Arrêter Web Speech (sinon il écoute toujours le micro physique)
        if (typeof stopSpeechRecognition === 'function') {
          console.log("🛑 Arrêt temporaire Web Speech (Mute)...");
          stopSpeechRecognition();
        }
      }
    }
    // Pour Vosk/Whisper/WLK : Ils écoutent 'currentStream' qui vient de 'mixDestination'.
    // Comme on a mis le Gain à 0, ils recevront du silence (ou juste le son système). 
    // Donc c'est OK, pas besoin de les arrêter/redémarrer.
  }
}

async function startRecording() {
  const enableSystemAudio = captureAudio.checked;
  const enableVideo = captureVideo.checked;
  const enableMicInitial = captureMic.checked;

  if (!enableSystemAudio && !enableVideo && !enableMicInitial) {
    alert("Il faut au moins une source (Vidéo, Audio Système ou Micro).");
    return;
  }

  try {
    const isSilentRequested = silentMode.checked;
    const isSilentInitialValue = isSilentRequested;
    const constraints = {
      video: enableVideo ? { frameRate: 30 } : false,
      audio: enableSystemAudio ? {
        // Si activé, le navigateur coupe le son de l'onglet localement (évite l'écho)
        // Note: ne fonctionne que pour les "Onglets Chrome" (displaySurface: 'browser')
        suppressLocalAudioPlayback: isSilentRequested,
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false
      } : false
    };

    // 1. Capturer l'écran (Vidéo + Audio système potentiel)
    const displayStream = await navigator.mediaDevices.getDisplayMedia(constraints);
    if (!displayStream) {
      showStatus("Impossible d'obtenir un flux de capture", true);
      return;
    }
    originalDisplayStream = displayStream;

    // Détection du type de source (Onglet, Fenêtre, Écran)
    const videoTrack = displayStream.getVideoTracks()[0];
    if (videoTrack) {
      const settings = videoTrack.getSettings();
      const surface = settings.displaySurface;
      console.log("💎 Surface de capture détectée :", surface);

      // DOM Elements pour l'UI
      const iconContainer = document.getElementById('source-icon-container');
      const iconTab = document.getElementById('icon-tab');
      const iconWindow = document.getElementById('icon-window');
      const iconScreen = document.getElementById('icon-screen');
      const silentWrapper = document.getElementById('silentModeWrapper');

      if (iconContainer) {
        iconContainer.style.display = 'flex';
        // Reset
        if (iconTab) iconTab.style.display = 'none';
        if (iconWindow) iconWindow.style.display = 'none';
        if (iconScreen) iconScreen.style.display = 'none';

        if (surface === 'browser') {
          if (iconTab) iconTab.style.display = 'block';
          if (silentWrapper) silentWrapper.style.display = 'block';
        } else if (surface === 'window') {
          if (iconWindow) iconWindow.style.display = 'block';
          if (silentWrapper) silentWrapper.style.display = 'none';
        } else if (surface === 'monitor') {
          if (iconScreen) iconScreen.style.display = 'block';
          if (silentWrapper) silentWrapper.style.display = 'none';
        }
      }
    }

    // 2. Préparer le Mixage Audio (Toujours, pour permettre l'ajout dynamique du micro)
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
      console.log("🔊 AudioContext repris (resumed)");
    }
    mixDestination = audioContext.createMediaStreamDestination();

    // GainNode pour le contrôle précis du volume/mute du micro
    micGainNode = audioContext.createGain();
    micGainNode.gain.value = 1; // Par défaut actif (si track active)
    micGainNode.connect(mixDestination);

    // 2a. Ajouter Audio Système (si présent)
    const hasSystemAudio = displayStream.getAudioTracks().length > 0;
    if (hasSystemAudio) {
      const sourceDisplay = audioContext.createMediaStreamSource(displayStream);
      // Connexion au mixeur (pour l'enregistrement)
      sourceDisplay.connect(mixDestination);
      console.log("🔊 Audio système ajouté au mix");

      // CAS SPÉCIFIQUE : Onglet Chrome + Mode Silencieux (ou demande de contrôle local)
      const videoTrack = displayStream.getVideoTracks()[0];
      const surface = videoTrack?.getSettings().displaySurface;

      if (surface === 'browser' && isSilentRequested) {
        // suppressLocalAudioPlayback a fonctionné, le navigateur ne joue plus le son.
        // On crée donc un monitoring MANUEL via Web Audio pour permettre le Mute/Unmute.
        monitorGainNode = audioContext.createGain();
        monitorGainNode.gain.value = 0; // Mute par défaut si activé au départ
        sourceDisplay.connect(monitorGainNode);
        monitorGainNode.connect(audioContext.destination);
        console.log("🔇 Mode silencieux optimisé activé (Tab)");
      } else {
        // Pour les fenêtres/écrans ou si non-silencieux :
        // On laisse le navigateur gérer le son par défaut (pour éviter l'écho).
        // Le monitorGainNode restera null, et la checkbox n'aura pas d'effet (comportement standard).
      }

      // Activer la checkbox (elle est déjà activable maintenant, mais on confirme son utilité)
      if (silentMode) silentMode.disabled = false;
    }

    // 2b. Analyseur pour le VU-mètre (branché sur le mix final)
    analyserNode = audioContext.createAnalyser();
    analyserNode.fftSize = 256;
    mixDestination.stream.getAudioTracks()[0]; // Juste pour s'assurer qu'elle existe
    const sourceFinal = audioContext.createMediaStreamSource(mixDestination.stream);
    sourceFinal.connect(analyserNode);
    startAudioLevels();

    // 2b. Ajouter Micro (si demandé au départ)
    if (enableMicInitial) {
      await toggleMicrophone(true);
    }

    // 3. Créer le flux final
    // On combine les pistes vidéo de l'écran avec la piste audio mixée
    const videoTracks = displayStream.getVideoTracks();
    const mixedAudioTrack = mixDestination.stream.getAudioTracks()[0];

    // Note: Même si mixedAudioTrack est silencieuse (pas de source), elle existe.
    // Cela permet d'ajouter du son plus tard sans casser le MediaRecorder.

    const finalStreamTracks = [...videoTracks];
    if (mixedAudioTrack) {
      finalStreamTracks.push(mixedAudioTrack);
    }

    const finalStream = new MediaStream(finalStreamTracks);
    currentStream = finalStream;
    videoPreview.srcObject = finalStream;

    // Si on arrête le partage via le navigateur
    displayStream.getVideoTracks()[0].onended = () => {
      stopRecording();
    };

    // 4. Démarrer STT si nécessaire (basé sur le flux MIXÉ)
    // On lance STT si on a de l'audio "potentiel". Le moteur STT écoutera le mix.
    const sttEngine = document.querySelector('input[name="sttEngine"]:checked')?.value || 'webspeech';
    if (enableSystemAudio || enableMicInitial) {
      // On pourrait vérifier si on a vraiment des tracks, mais on lance quand même.
      // Si stream est silencieux, STT ne transcrira rien, c'est OK.
      if (sttEngine === 'webspeech') {
        if (typeof startWebSpeech === 'function') {
          startWebSpeech(finalStream);
          showStatus("✅ Capture audio + Web Speech (☁️)", false);
        }
      } else if (sttEngine === 'vosk') {
        if (typeof startVoskWithStream === 'function') {
          startVoskWithStream(finalStream).then(() => {
            showStatus("✅ Capture audio + Vosk (🔒)", false);
          }).catch(e => showStatus("⚠️ Erreur Vosk", true));
        }
      } else if (sttEngine === 'whisper') {
        if (typeof startWhisperWithStream === 'function') startWhisperWithStream(finalStream);
      } else if (sttEngine === 'wlk') {
        if (typeof startWLKWithStream === 'function') startWLKWithStream(finalStream);
      } else if (sttEngine === 'parakeet') {
        if (typeof startParakeetWithStream === 'function') startParakeetWithStream(finalStream);
      }
    }

    await setupMediaRecorder(finalStream);
    mediaRecorder.start(500);

    recordingStartTime = Date.now();
    resetChapters();

    const chapterControls = document.getElementById('chapter-controls');
    if (chapterControls) chapterControls.style.display = 'block';

    startBtn.disabled = true;
    stopBtn.disabled = false;

    // On désactive la configuration Audio/Vidéo principale
    captureAudio.disabled = true;
    captureVideo.disabled = true;
    // MAIS on laisse le micro modifiable
    captureMic.disabled = false;

    showStatus("✅ Enregistrement en cours...");

  } catch (error) {
    console.error("Erreur capture:", error);
    showStatus(`Erreur capture: ${error.message}`, true);
  }
}

function stopRecording() {
  lastVideoFrame = captureThumbnail();

  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }

  // Arrêter proprement tous les flux
  if (currentStream) {
    currentStream.getTracks().forEach(t => t.stop());
    currentStream = null;
  }
  if (originalDisplayStream) {
    originalDisplayStream.getTracks().forEach(t => t.stop());
    originalDisplayStream = null;
  }
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
  if (micGainNode) {
    micGainNode.disconnect();
    micGainNode = null;
  }
  if (monitorGainNode) {
    monitorGainNode.disconnect();
    monitorGainNode = null;
  }

  // Arrêter la transcription Vosk si elle est active
  if (typeof stopVosk === 'function') {
    stopVosk();
  }
  // Arrêter Web Speech
  if (typeof stopSpeechRecognition === 'function') {
    stopSpeechRecognition();
  }
  // Arrêter Whisper
  if (typeof stopWhisper === 'function') {
    stopWhisper();
  }
  // Arrêter WLK
  if (typeof stopWLK === 'function') {
    stopWLK();
  }
  // Arrêter Parakeet
  if (typeof stopParakeet === 'function') {
    stopParakeet();
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

  // NE PAS masquer les contrôles tout de suite pour laisser l'utilisateur voir le transcript
  // const chapterControls = document.getElementById('chapter-controls');
  // if (chapterControls) chapterControls.style.display = 'none';

  hideChapterForm();

  recordingStartTime = null;

  startBtn.disabled = false;
  stopBtn.disabled = true;
  captureAudio.disabled = false;
  captureVideo.disabled = false;
  captureMic.disabled = false;
  // Note: On ne désactive plus forcément silentMode ici pour permettre la re-sélection
  // Mais on s'assure qu'il est cohérent
  if (silentMode) {
    // On peut choisir de le laisser tel quel ou de le reset. Le projet reset souvent.
    // silentMode.checked = false; 
  }

  stopAudioLevels();

  // Masquer l'icône de source
  const iconContainer = document.getElementById('source-icon-container');
  if (iconContainer) iconContainer.style.display = 'none';
  // Réafficher le wrapper du mode silencieux (pour le prochain enregistrement)
  const silentWrapper = document.getElementById('silentModeWrapper');
  if (silentWrapper) silentWrapper.style.display = 'block';

  showStatus("⏹️ Capture arrêtée");
}

// ===== DIAGNOSTIC AUDIO (VU-MÈTRE) =====
function startAudioLevels() {
  const canvas = document.getElementById('audio-levels');
  const container = document.getElementById('audio-visualizer-container');
  if (!canvas || !analyserNode) return;

  container.style.display = 'block';
  const ctx = canvas.getContext('2d');
  const bufferLength = analyserNode.frequencyBinCount;
  const dataArray = new Uint8Array(bufferLength);

  function draw() {
    animationId = requestAnimationFrame(draw);
    analyserNode.getByteFrequencyData(dataArray);

    // Calculer le volume moyen (RMS simplifié)
    let sum = 0;
    for (let i = 0; i < bufferLength; i++) {
      sum += dataArray[i];
    }
    const average = sum / bufferLength;
    const level = average / 128; // 0.0 à 1.0 (approximatif)

    // Dessiner la barre
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Fond dégradé vert -> rouge
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
    gradient.addColorStop(0, '#10b981'); // Vert
    gradient.addColorStop(0.7, '#f59e0b'); // Orange
    gradient.addColorStop(0.9, '#ef4444'); // Rouge

    ctx.fillStyle = '#e5e7eb';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width * level, canvas.height);

    // Dépassement (peak indicator)
    if (level > 0.9) {
      ctx.fillStyle = 'red';
      ctx.fillRect(canvas.width - 5, 0, 5, canvas.height);
    }
  }
  draw();
}

function stopAudioLevels() {
  if (animationId) cancelAnimationFrame(animationId);
  const container = document.getElementById('audio-visualizer-container');
  if (container) container.style.display = 'none';
}

// Checkbox Silent Mode Listener
if (silentMode) {
  silentMode.addEventListener('change', (e) => {
    if (monitorGainNode && audioContext) {
      const isSilent = e.target.checked;
      // Transition douce pour éviter les clics audio
      monitorGainNode.gain.setTargetAtTime(isSilent ? 0 : 1, audioContext.currentTime, 0.1);
      console.log(`Mode silencieux : ${isSilent ? 'ACTIVÉ (Mute Speakers)' : 'DÉSACTIVÉ (Play Speakers)'}`);
    }
  });
}

// Checkbox Mic Listener
if (captureMic) {
  console.log("Checkbox mic trouvée");
  captureMic.addEventListener('change', (e) => {
    console.log("Checkbox mic changée");
    // Si on est en cours d'enregistrement (audioContext actif), on applique
    // Sinon ça sera pris en compte au prochain startRecording
    if (audioContext && audioContext.state !== 'closed') {
      console.log("Checkbox mic changée à ", e.target.checked);
      toggleMicrophone(e.target.checked);
    }
  });
}

// ===== BINDING BOUTONS =====
if (startBtn) {
  startBtn.onclick = () => startRecording();
}
if (stopBtn) {
  stopBtn.onclick = () => stopRecording();
}

const pwaInstallBtn = document.getElementById('pwaInstallBtn');
if (pwaInstallBtn) {
  pwaInstallBtn.onclick = async () => {
    if (!deferredPrompt) return;
    // Afficher le prompt natif
    deferredPrompt.prompt();
    // Attendre la réponse
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`L'utilisateur a ${outcome === 'accepted' ? 'accepté' : 'refusé'} l'installation.`);
    deferredPrompt = null;
    pwaInstallBtn.style.display = 'none';
  };
}

// ===== BINDING CHAPITRES =====
const addChapterBtn = document.getElementById('addChapterBtn');
const validateChapterBtn = document.getElementById('validateChapterBtn');
const cancelChapterBtn = document.getElementById('cancelChapterBtn');
const chapterNameInput = document.getElementById('chapterNameInput');

if (addChapterBtn) {
  addChapterBtn.onclick = () => {
    showChapterForm();
  };
}

if (validateChapterBtn) {
  validateChapterBtn.onclick = () => {
    const name = chapterNameInput?.value.trim();
    if (name) addChapter(name);
    else addChapter();
  };
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
      if (name) addChapter(name);
      else addChapter();
    } else if (e.key === 'Escape') {
      hideChapterForm();
    }
  });
}

// Init liste chapitres
resetChapters();

// ===== UI MANAGMENT =====
const sttRadios = document.querySelectorAll('input[name="sttEngine"]');
const sttInfo = document.getElementById('sttInfo');

// Détection du protocole non-serveur (file:// ou chrome-extension://)
const isNonServerProtocol = window.location.protocol === 'file:' || window.location.protocol === 'chrome-extension:';
const isFileProtocol = isNonServerProtocol; // Garder l'ancien nom pour la compatibilité avec le reste du script s'il est réutilisé
const voskRadio = document.getElementById('sttVosk');
const whisperRadio = document.getElementById('sttWhisper');
const wlkRadio = document.getElementById('sttWLK');

if (isFileProtocol) {
  if (voskRadio) {
    voskRadio.disabled = true;
    voskRadio.parentElement.style.opacity = '0.6';
    voskRadio.parentElement.style.cursor = 'not-allowed';
    voskRadio.parentElement.title = "Vosk nécessite le serveur HTTP.";
    const labelSpan = voskRadio.parentElement.querySelector('span');
    if (labelSpan) labelSpan.innerHTML = 'Vosk <span style="color:gray; font-size:11px;">(🚫 HTTP requis)</span>';
  }

  if (whisperRadio) {
    whisperRadio.disabled = true;
    whisperRadio.parentElement.style.opacity = '0.6';
    whisperRadio.parentElement.style.cursor = 'not-allowed';
    whisperRadio.parentElement.title = "Whisper nécessite le serveur HTTP (Web Worker).";
    const labelSpan = whisperRadio.parentElement.querySelector('span');
    if (labelSpan) labelSpan.innerHTML = 'Whisper <span style="color:gray; font-size:11px;">(🚫 HTTP requis)</span>';
  }

  if (wlkRadio) {
    wlkRadio.disabled = true;
    wlkRadio.parentElement.style.opacity = '0.6';
    wlkRadio.parentElement.style.cursor = 'not-allowed';
    wlkRadio.parentElement.title = "WLK nécessite une connexion serveur.";
    const labelSpan = wlkRadio.parentElement.querySelector('span');
    if (labelSpan) labelSpan.innerHTML = 'WLK <span style="color:gray; font-size:11px;">(🚫 Connection req)</span>';
  }
}

if (sttRadios && sttInfo) {
  // Initialisation du message
  if (isFileProtocol) {
    sttInfo.innerHTML = '<strong>Note :</strong> Pour utiliser <strong>Vosk</strong>, <strong>Whisper</strong> ou <strong>WLK</strong>, lancez via le serveur HTTP (<code>Demarrer-Serveur.bat</code>).';
    sttInfo.style.borderLeftColor = '#ffc107';
    sttInfo.style.background = '#2a2513ff';
  }

  sttRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'webspeech') {
        sttInfo.innerHTML = '<strong>Web Speech :</strong> Rapide, excellente qualité. ⚠️🚩<strong> Données envoyées à Google.</strong>';
        sttInfo.style.borderLeftColor = '#0066cc';
        sttInfo.style.background = '#303336ff';
      } else if (e.target.value === 'whisper') {
        sttInfo.innerHTML = '<strong>Whisper :</strong> Qualité IA supérieure. 100% Local. ⚠️ Premier chargement long (~40MB).';
        sttInfo.style.borderLeftColor = '#d63384';
        sttInfo.style.background = '#303336ff';
      } else if (e.target.value === 'wlk') {
        sttInfo.innerHTML = '<strong>WLK :</strong> Serveur Python ultra-rapide. <span style="color:#dc3545;">⚠️ IMPORTANT : Lancez <code>Lancer-WLK-Serveur.bat</code> AVANT de démarrer !</span> <a href="README-WLK.md" target="_blank" style="color:#6610f2; text-decoration:underline;">📖 Guide complet</a>';
        sttInfo.style.borderLeftColor = '#6610f2';
        sttInfo.style.background = '#303336ff';
      } else if (e.target.value === 'nostt') {
        sttInfo.innerHTML = '<strong>Aucune :</strong> Pas de transcription. 🔇';
        sttInfo.style.borderLeftColor = '#3578dc';
        sttInfo.style.background = '#303336ff';
      } else if (e.target.value === 'parakeet') {
        sttInfo.innerHTML = '<strong>Parakeet :</strong> 100% Local (WebGPU). ⚠️ Premier chargement lourd (~600 Mo). Qualité de pointe.';
        sttInfo.style.borderLeftColor = '#ff9800';
        sttInfo.style.background = '#303336ff';
      } else {
        sttInfo.innerHTML = '<strong>Vosk :</strong> 100% Local & Privé. ⚠️ Nécessite le serveur HTTP lancé & modèle téléchargé.';
        sttInfo.style.borderLeftColor = '#28a745';
        sttInfo.style.background = '#303336ff';
      }

      // Gestion visibilité Panneau Réglages Vosk
      const voskSettings = document.getElementById('vosk-settings-panel');
      if (voskSettings) {
        voskSettings.style.display = (e.target.value === 'vosk') ? 'block' : 'none';
      }
      // Gestion visibilité Panneau Réglages Parakeet
      const parakeetSettings = document.getElementById('parakeet-settings-panel');
      if (parakeetSettings) {
        parakeetSettings.style.display = (e.target.value === 'parakeet') ? 'block' : 'none';
      }
      // Gestion visibilité Panneau Réglages Web Speech
      const webSpeechSettings = document.getElementById('webspeech-settings-panel');
      if (webSpeechSettings) {
        webSpeechSettings.style.display = (e.target.value === 'webspeech') ? 'block' : 'none';
      }
      // Gestion visibilité Panneau Réglages Whisper
      const whisperSettings = document.getElementById('whisper-settings-panel');
      if (whisperSettings) {
        whisperSettings.style.display = (e.target.value === 'whisper') ? 'block' : 'none';
      }
      // Gestion visibilité Panneau Réglages WLK
      const wlkSettings = document.getElementById('wlk-settings-panel');
      if (wlkSettings) {
        wlkSettings.style.display = (e.target.value === 'wlk') ? 'block' : 'none';
      }
    });
  });
}

// Listener pour le changement de modèle Vosk (Rechargement automatique)
const voskModelSelect = document.getElementById('voskModelSelect');
if (voskModelSelect) {
  voskModelSelect.addEventListener('change', () => {
    if (typeof resetVosk === 'function') {
      showStatus("🔄 Rechargement du modèle Vosk...", false);
      resetVosk(); // Décharge le modèle actuel

      // Si on est déjà en train d'enregistrer, on relance immédiatement avec le nouveau modèle
      if (mediaRecorder && mediaRecorder.state === 'recording' && currentStream) {
        console.log('Réinitialisation Vosk pendant l\'enregistrement...');
        startVoskWithStream(currentStream).then(() => {
          showStatus("✅ Modèle Vosk mis à jour", false);
        }).catch(e => showStatus("⚠️ Erreur rechargement Vosk", true));
      }
    }
  });
}

// ===== REDIMENSIONNEMENT DYNAMIQUE DE LA VIDÉO =====
const videoContainer = document.getElementById('video-container');
const resizeHandle = document.getElementById('video-resize-handle');

if (videoContainer && resizeHandle) {
  let isResizing = false;
  let startX, startWidth;

  resizeHandle.addEventListener('mousedown', (e) => {
    isResizing = true;
    startX = e.clientX;
    startWidth = videoContainer.offsetWidth;
    // On fixe la largeur en px au premier resize pour éviter les sauts si c'était en %
    videoContainer.style.width = startWidth + "px";
    videoContainer.style.flex = "none"; // Au cas où on est dans un flexbox
    document.body.style.cursor = 'nwse-resize';
    e.preventDefault();
  });

  window.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const diff = e.clientX - startX;
    const newWidth = startWidth + diff;
    if (newWidth > 200) {
      videoContainer.style.width = newWidth + 'px';
    }
  });

  window.addEventListener('mouseup', () => {
    if (isResizing) {
      isResizing = false;
      document.body.style.cursor = 'default';
    }
  });
}

// ===== UI LISTENERS (CSP Compliance) =====
document.addEventListener('DOMContentLoaded', () => {
  // WLK Gain
  const wlkGain = document.getElementById('wlkGain');
  const wlkGainLabel = document.getElementById('wlkGainLabel');
  if (wlkGain && wlkGainLabel) {
    wlkGain.addEventListener('input', () => {
      wlkGainLabel.textContent = wlkGain.value;
    });
  }

  // Vosk Chunk Size
  const voskChunkSize = document.getElementById('voskChunkSize');
  const voskChunkSizeLabel = document.getElementById('voskChunkSizeLabel');
  if (voskChunkSize && voskChunkSizeLabel) {
    voskChunkSize.addEventListener('input', () => {
      const labels = ['Petit (2048)', 'Moyen (4096)', 'Grand (8192)'];
      voskChunkSizeLabel.textContent = labels[voskChunkSize.value];
    });
  }

  // Vosk Gain
  const voskGain = document.getElementById('voskGain');
  const voskGainLabel = document.getElementById('voskGainLabel');
  if (voskGain && voskGainLabel) {
    voskGain.addEventListener('input', () => {
      voskGainLabel.textContent = voskGain.value;
    });
  }

  // Parakeet Chunk Size
  const parakeetChunkSize = document.getElementById('parakeetChunkSize');
  const parakeetChunkLabel = document.getElementById('parakeetChunkLabel');
  if (parakeetChunkSize && parakeetChunkLabel) {
    parakeetChunkSize.addEventListener('input', () => {
      parakeetChunkLabel.textContent = parakeetChunkSize.value + '.0s';
    });
  }

  // Final Lucide Init
  if (typeof lucide !== 'undefined') {
    lucide.createIcons();
  }
});

