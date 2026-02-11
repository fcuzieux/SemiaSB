// whisper-worker.js
import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.14.0/dist/transformers.min.js';

// Configuration pour éviter de chercher les fichiers locaux partout
env.allowLocalModels = false;
env.useBrowserCache = true;

let transcriber = null;

// Initialisation du modèle (téléchargement unique)
async function loadModel() {
    if (transcriber) return;

    // On notifie que ça charge
    self.postMessage({ status: 'progress', data: { status: 'init', name: 'whisper-tiny' } });

    try {
        // Chargement du pipeline ASR (Automatic Speech Recognition)
        // Utilisation de 'Xenova/whisper-tiny' + quantifié pour la vitesse
        transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny', {
            quantized: true, // Force le format int8 (plus rapide)
            progress_callback: (data) => {
                self.postMessage({ status: 'progress', data });
            }
        });

        self.postMessage({ status: 'ready' });
    } catch (e) {
        console.error("Erreur worker:", e);
        self.postMessage({ status: 'error', error: e.message });
    }
}

// Écoute des messages venant du script principal
self.onmessage = async (e) => {
    const { type, audio } = e.data;

    if (type === 'init') {
        await loadModel();
    }
    else if (type === 'transcribe') {
        if (!transcriber) await loadModel();

        try {
            // Transcription
            // On attend un Float32Array
            const whisperOptions = e.data.options || {};
            const lang = whisperOptions.language === 'auto' ? null : whisperOptions.language;

            const output = await transcriber(audio, {
                language: lang || 'french',
                task: whisperOptions.task || 'transcribe',
                chunk_length_s: 30,
                stride_length_s: 5
            });

            // Renvoyer le texte
            if (output && output.text && output.text.length > 0) {
                self.postMessage({ status: 'complete', result: output.text });
            }
        } catch (e) {
            console.error("Erreur transcription:", e);
        }
    }
};
