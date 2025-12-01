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
    });
  });
}

// ===== VUE DOSSIER (FOLDER VIEW) =====
function initFolderView() {
  const notesContainer = document.getElementById('notesList');
  const videosContainer = document.getElementById('videosList');

  if (!notesContainer || !videosContainer) return;

  // Helper to create item element
  function createItem(data) {
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

    item.appendChild(textDiv);
    item.appendChild(iconImg);

    item.addEventListener('click', () => {
      // Tenter d'ouvrir le fichier via chrome.downloads
      // On cherche par nom de fichier car l'ID peut changer ou expirer
      const filename = data.filename.split(/[/\\]/).pop(); // Juste le nom

      chrome.downloads.search({ query: [filename] }, (results) => {
        if (results && results.length > 0) {
          // On prend le plus récent qui correspond
          const bestMatch = results.sort((a, b) => new Date(b.startTime) - new Date(a.startTime))[0];
          chrome.downloads.open(bestMatch.id);
        } else {
          alert(`Fichier introuvable dans l'historique des téléchargements : ${filename}`);
        }
      });
    });

    return item;
  }

  // Charger les Notes
  chrome.storage.local.get(['savedNotes'], (result) => {
    const notes = result.savedNotes || [];
    notesContainer.innerHTML = '';

    if (notes.length > 0) {
      // Trier par date décroissante
      notes.sort((a, b) => new Date(b.date) - new Date(a.date));
      notes.forEach(note => {
        notesContainer.appendChild(createItem(note));
      });
    } else {
      notesContainer.innerHTML = '<p style="color: var(--text-secondary); font-size: 13px; font-style: italic;">Pas de note sauvegardée.</p>';
    }
  });

  // Charger les Vidéos
  chrome.storage.local.get(['savedVideos'], (result) => {
    const videos = result.savedVideos || [];
    videosContainer.innerHTML = '';

    if (videos.length > 0) {
      // Trier par date décroissante
      videos.sort((a, b) => new Date(b.date) - new Date(a.date));
      videos.forEach(video => {
        videosContainer.appendChild(createItem(video));
      });
    } else {
      videosContainer.innerHTML = '<p style="color: var(--text-secondary); font-size: 13px; font-style: italic;">Pas de vidéo sauvegardée.</p>';
    }
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
if (typeof lucide !== 'undefined') lucide.createIcons();
