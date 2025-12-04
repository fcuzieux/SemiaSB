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
let recordedChunks = [];
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

function setupMediaRecorder(stream) {
  try {
    mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp9,opus"
    });
  } catch (e) {
    mediaRecorder = new MediaRecorder(stream);
  }

  recordedChunks = [];

  mediaRecorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      recordedChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = async () => {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '');

    // Récupérer le titre de la vidéo et nettoyer les caractères invalides
    const videoTitleInput = document.getElementById('videoTitle');
    let videoTitle = videoTitleInput?.value.trim() || 'Capture-video';
    // Remplacer les caractères invalides pour un nom de fichier
    videoTitle = videoTitle.replace(/[<>:"/\\|?*]/g, '-');

    const filename = `${videoTitle}-${timestamp}.webm`;
    const url = URL.createObjectURL(blob);

    // Créer un fichier JSON avec les métadonnées des chapitres
    let chaptersJsonUrl = null;
    if (chapters.length > 0) {
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

      const chaptersBlob = new Blob([JSON.stringify(chaptersMetadata, null, 2)], { type: 'application/json' });
      chaptersJsonUrl = URL.createObjectURL(chaptersBlob);
    }

    // Récupérer le dossier de sauvegarde configuré
    const settings = await chrome.storage.local.get(['backupFolder']);
    const backupFolder = settings.backupFolder || '';

    const downloadOptions = {
      url: url,
      filename: filename,
      saveAs: true
    };

    if (backupFolder) {
      const folderName = backupFolder.split(/[/\\]/).pop() || 'SemiaSB';
      downloadOptions.filename = `${folderName}/${filename}`;
    }

    if (chrome.downloads && chrome.downloads.download) {
      chrome.downloads.download(downloadOptions, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('Download error:', chrome.runtime.lastError);
          showStatus('Enregistré ! (mode fallback)', true);
          triggerDownload(url, filename);
        } else {
          const statusMsg = chapters.length > 0
            ? `✅ Fichier sauvegardé : ${filename} (${chapters.length} chapitres)`
            : `✅ Fichier sauvegardé : ${filename}`;
          showStatus(statusMsg);

          // Télécharger aussi le fichier JSON des chapitres si présent
          if (chaptersJsonUrl && chapters.length > 0) {
            const chaptersFilename = filename.replace('.webm', '-chapitres.json');
            const chaptersDownloadOptions = {
              url: chaptersJsonUrl,
              filename: backupFolder ? `${backupFolder.split(/[/\\]/).pop() || 'SemiaSB'}/${chaptersFilename}` : chaptersFilename,
              saveAs: false // Télécharger automatiquement sans demander
            };

            chrome.downloads.download(chaptersDownloadOptions, () => {
              if (!chrome.runtime.lastError) {
                console.log('Fichier chapitres sauvegardé:', chaptersFilename);
              }
            });
          }

          // --- SAUVEGARDE DANS L'HISTORIQUE ---
          const videoData = {
            id: Date.now(),
            type: 'video',
            title: filename,
            date: new Date().toISOString(),
            filename: downloadOptions.filename,
            thumbnail: lastVideoFrame, // Utiliser la frame capturée au stop
            chapters: chapters.length > 0 ? chapters : null // Sauvegarder les chapitres
          };

          chrome.storage.local.get(['savedVideos'], (result) => {
            const videos = result.savedVideos || [];
            videos.push(videoData);
            chrome.storage.local.set({ savedVideos: videos });
          });
          // -------------------------------------
        }
      });
    } else {
      showStatus('Enregistré ! (mode direct)');
      triggerDownload(url, filename);
    }

    setTimeout(() => {
      URL.revokeObjectURL(url);
      if (chaptersJsonUrl) URL.revokeObjectURL(chaptersJsonUrl);
    }, 60000);
  };
}

function triggerDownload(url, filename = 'capture-tab.webm') {
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ===== FONCTIONS DE CHAPITRAGE =====

// Formater le temps en HH:MM:SS
function formatTime(seconds) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Afficher le formulaire d'ajout de chapitre
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

// Masquer le formulaire d'ajout de chapitre
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
      (stream) => {
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

        setupMediaRecorder(stream);
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
