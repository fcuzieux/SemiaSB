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
    });
  });
}

// ===== FONCTION DE CAPTURE D'ONGLET =====
let mediaRecorder = null;
let recordedChunks = [];
let currentStream = null;
let audioContext = null;
let playbackSource = null;

const captureAudio = document.getElementById('captureAudio');
const captureVideo = document.getElementById('captureVideo');
const startBtn = document.getElementById('startCapture');
const stopBtn = document.getElementById('stopCapture');
const videoPreview = document.getElementById('preview');

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

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: "video/webm" });
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '');
    const filename = `capture-onglet-${timestamp}.webm`;
    const url = URL.createObjectURL(blob);

    if (chrome.downloads && chrome.downloads.download) {
      chrome.downloads.download({
        url: url,
        filename: filename,
        saveAs: true
      }, () => {
        if (chrome.runtime.lastError) {
          showStatus('Enregistré ! (mode fallback)', true);
          triggerDownload(url, filename);
        } else {
          showStatus(`✅ Fichier sauvegardé : ${filename}`);
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

  // Reset classes and add the appropriate one
  statusDiv.className = '';
  statusDiv.classList.add(isError ? 'error' : 'success');

  statusDiv.style.display = 'block';
  setTimeout(() => statusDiv.style.display = 'none', 3000);
}

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

      // ✅ SOLUTION : DUPLIQUER L'AUDIO POUR PLAYBACK + ENREGISTREMENT
      if (enableAudio && stream.getAudioTracks()[0]) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        playbackSource = audioContext.createMediaStreamSource(stream);
        playbackSource.connect(audioContext.destination); // 🔊 Son audible
      }

      // MediaRecorder utilise le STREAM ORIGINAL (parfait pour l'enregistrement)
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

stopBtn.onclick = () => {
  if (mediaRecorder && mediaRecorder.state !== "inactive") {
    mediaRecorder.stop();
  }

  if (currentStream) {
    currentStream.getTracks().forEach(t => t.stop());
    currentStream = null;
  }

  // ✅ NETTOYAGE AUDIOContext
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

// ===== INITIALISATION =====
initNavigation();


// Initialiser Note-Capture
if (typeof initNoteCapture !== 'undefined') {
  initNoteCapture();
}

// Initialiser Ask-Semia
if (typeof initAIFunction !== 'undefined') {
  initAIFunction();
}

// Initialiser Settings
if (typeof initSettings !== 'undefined') {
  initSettings();
}

// Initialiser Lucide Icons
if (typeof lucide !== 'undefined') {
  lucide.createIcons();
}

