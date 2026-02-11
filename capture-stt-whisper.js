// capture-stt-whisper.js
// Gestion de Whisper via Web Worker (Transformers.js)

let whisperWorker = null;
let isWhisperInitialized = false;

// Initialiser le worker Whisper
async function initWhisperIfNeeded() {
    if (isWhisperInitialized) return true;

    return new Promise((resolve, reject) => {
        try {
            // Créer le worker
            whisperWorker = new Worker('whisper-worker.js', { type: 'module' });

            // Écouter les messages du worker
            whisperWorker.onmessage = (e) => {
                const { status, task, data, result } = e.data;

                if (status === 'ready') {
                    console.log('✅ Worker Whisper prêt !');
                    isWhisperInitialized = true;
                    resolve(true);
                }
                else if (status === 'progress') {
                    // Progression du chargement du modèle
                    if (data && data.status === 'progress') {
                        const percent = Math.round(data.progress || 0);
                        showStatus(`Chargement Whisper: ${percent}%`, false);
                    }
                }
                else if (status === 'complete') {
                    // Transcription reçue
                    handleWhisperResult(result);
                }
            };

            // Démarrer l'initialisation dans le worker
            whisperWorker.postMessage({ type: 'init' });

        } catch (error) {
            console.error("Erreur création worker Whisper:", error);
            reject(error);
        }
    });
}

// Fonction pour traiter le résultat
function handleWhisperResult(text) {
    if (!text) return;

    console.log("📝 Whisper:", text);
    const textarea = document.getElementById('liveTranscript');
    if (textarea) {
        // Enlever les "..." d'attente s'ils existent
        if (textarea.value.endsWith(' ...')) {
            textarea.value = textarea.value.slice(0, -4);
        }

        // Whisper donne souvent des segments complets, on ajoute simplement
        textarea.value += (textarea.value ? ' ' : '') + text.trim();
        textarea.scrollTop = textarea.scrollHeight;
    }
}

// Démarrer la capture et l'envoi vers Whisper
let audioContextWhisper = null;
let scriptProcessor = null;
let sourceWhisper = null;

async function startWhisperWithStream(stream) {
    console.log('🚀 Démarrage de Whisper (Local)...');

    await initWhisperIfNeeded();

    // Configuration Audio
    audioContextWhisper = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    sourceWhisper = audioContextWhisper.createMediaStreamSource(stream);

    // Utiliser un ScriptProcessor pour capturer l'audio brut
    // Note: AudioWorklet serait plus moderne mais plus complexe à mettre en place rapidement en un seul fichier
    const bufferSize = 4096;
    scriptProcessor = audioContextWhisper.createScriptProcessor(bufferSize, 1, 1);

    let audioBufferCache = [];
    const CHUNK_SIZE = 16000 * 4; // Envoyer toutes les 4 secondes (meilleur contexte)

    scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Cloner les données car le buffer est recyclé
        const dataClone = new Float32Array(inputData);
        audioBufferCache.push(dataClone);

        // Calculer la taille actuelle du buffer
        const totalLength = audioBufferCache.reduce((acc, curr) => acc + curr.length, 0);

        // Si on a assez de données, on envoie au worker
        if (totalLength >= CHUNK_SIZE) {
            // Fusionner les buffers
            const mergedBuffer = new Float32Array(totalLength);
            let offset = 0;
            for (const buf of audioBufferCache) {
                mergedBuffer.set(buf, offset);
                offset += buf.length;
            }

            // Indicateur visuel "Traitement en cours"
            const textarea = document.getElementById('liveTranscript');
            if (textarea && !textarea.value.endsWith('...')) {
                textarea.value += ' ...';
                textarea.scrollTop = textarea.scrollHeight;
            }

            // Lecture des réglages UI
            const lang = document.getElementById('whisperLang')?.value || 'french';
            const task = document.getElementById('whisperTask')?.value || 'transcribe';

            // Envoyer au worker
            whisperWorker.postMessage({
                type: 'transcribe',
                audio: mergedBuffer,
                options: { language: lang, task: task }
            });

            // Vider le cache
            audioBufferCache = [];
        }
    };

    sourceWhisper.connect(scriptProcessor);
    scriptProcessor.connect(audioContextWhisper.destination); // Nécessaire pour que le processeur tourne

    showStatus("✅ Capture audio + Whisper (Démarré)", false);
}

function stopWhisper() {
    console.log("⏹️ Arrêt de Whisper");
    if (scriptProcessor && sourceWhisper) {
        sourceWhisper.disconnect();
        scriptProcessor.disconnect();
        scriptProcessor = null;
        sourceWhisper = null;
    }
    if (audioContextWhisper) {
        audioContextWhisper.close();
        audioContextWhisper = null;
    }
}
