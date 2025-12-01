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
    const filename = `capture-onglet-${timestamp}.webm`;
    const url = URL.createObjectURL(blob);

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
          showStatus(`✅ Fichier sauvegardé : ${filename}`);

          // --- SAUVEGARDE DANS L'HISTORIQUE ---
          const videoData = {
            id: Date.now(),
            type: 'video',
            title: filename,
            date: new Date().toISOString(),
            filename: downloadOptions.filename,
            thumbnail: lastVideoFrame // Utiliser la frame capturée au stop
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

    setTimeout(() => URL.revokeObjectURL(url), 60000);
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

    startBtn.disabled = false;
    stopBtn.disabled = true;
    captureAudio.disabled = false;
    captureVideo.disabled = false;
  };
}

// ===== INITIALISATION =====
initNavigation();

if (typeof initNoteCapture !== 'undefined') initNoteCapture();
if (typeof initAIFunction !== 'undefined') initAIFunction();
if (typeof initSettings !== 'undefined') initSettings();
if (typeof initFolderView !== 'undefined') initFolderView();
if (typeof lucide !== 'undefined') lucide.createIcons();
