// capture-stt-parakeet.js
import { getParakeetModel, ParakeetModel } from "https://esm.sh/parakeet.js";
import * as ort from "https://esm.sh/onnxruntime-web";

let parakeetModel = null;
let parakeetAudioContext = null;
let parakeetSourceNode = null;
let parakeetProcessorNode = null;
let parakeetCurrentTranscript = "";
let isParakeetRunning = false;

// Configurer le worker ORT (important pour les extensions)
ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
ort.env.wasm.wasmPaths = "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/";

async function initParakeet(modelName = "parakeet-tdt-0.6b-v3") {
    if (parakeetModel) return parakeetModel;

    // Mapping des noms simplifiés vers les repo IDs réels sur Hugging Face
    const modelMap = {
        "parakeet-tdt-0.6b-v3": "istupakov/parakeet-tdt-0.6b-v3-onnx",
        "parakeet-ctc-1.1b-v2": "jenerallee78/parakeet-tdt-1.1b-onnx"
    };

    const repoId = modelMap[modelName] || modelName;

    console.log(`[Parakeet] Initialisation du modèle: ${repoId}...`);
    showStatus(`🦅 Chargement NVIDIA Parakeet (${modelName})...`, false);

    try {
        const config = await getParakeetModel(repoId, {
            ort: ort,
            encoderQuant: "fp32",
            decoderQuant: "int8",
            preprocessor: "nemo128",
            progress: (p) => {
                const percent = Math.round(p.loaded * 100 / p.total);
                updateVoskProgress(percent, `🦅 Téléchargement Parakeet... (${percent}%)`);
            }
        });

        console.log("[Parakeet] Configuration récupérée. Création du modèle...");
        parakeetModel = await ParakeetModel.fromUrls({
            ...config.urls,
            filenames: config.filenames,
            ort: ort
        });

        console.log("[Parakeet] Modèle instancié avec succès.");
        hideVoskProgress();
        return parakeetModel;
    } catch (e) {
        console.error("[Parakeet] Erreur lors du chargement du modèle:", e);
        showStatus(`⚠️ Erreur chargement Parakeet: ${e.message}`, true);
        hideVoskProgress();
        // On ne re-throw pas pour éviter que le débogueur s'arrête si "Pause on exceptions" est actif
        return null;
    }
}

async function startParakeetWithStream(stream) {
    if (isParakeetRunning) return;

    const modelSelect = document.getElementById('parakeetModelSelect');
    const selectedModel = modelSelect ? modelSelect.value : "parakeet-tdt-0.6b-v3";

    try {
        const model = await initParakeet(selectedModel);
        if (!model) {
            isParakeetRunning = false;
            return;
        }
        isParakeetRunning = true;

        parakeetAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
        parakeetSourceNode = parakeetAudioContext.createMediaStreamSource(stream);

        // On utilise un AudioWorklet ou un ScriptProcessor pour bufferiser
        // Parakeet préfère des chunks de ~1-2 secondes pour une transcription fluide
        parakeetProcessorNode = parakeetAudioContext.createScriptProcessor(16384, 1, 1);

        let audioBuffer = [];

        // Taille des chunks dynamique (1.0s à 5.0s) @ 16kHz
        const chunkSetting = parseInt(document.getElementById('parakeetChunkSize')?.value || "2");
        const CHUNK_SAMPLES = 16000 * chunkSetting;

        parakeetProcessorNode.onaudioprocess = async (e) => {
            if (!isParakeetRunning) return;

            const pcmData = e.inputBuffer.getChannelData(0);
            audioBuffer.push(...pcmData);

            // Seuil dynamique basé sur le réglage UI
            if (audioBuffer.length >= CHUNK_SAMPLES) {
                const chunkToTranscribe = new Float32Array(audioBuffer);
                audioBuffer = []; // Reset buffer

                try {
                    const result = await parakeetModel.transcribe(chunkToTranscribe, 16000);
                    console.log("[Parakeet] Resultat transcription:", result);
                    if (result && result.utterance_text) {
                        handleParakeetResult(result.utterance_text);
                    }
                } catch (err) {
                    console.error("[Parakeet] Erreur transcription chunk:", err);
                }
            }
        };

        parakeetSourceNode.connect(parakeetProcessorNode);
        parakeetProcessorNode.connect(parakeetAudioContext.destination);

        console.log("[Parakeet] Écoute en cours...");
    } catch (e) {
        console.error("[Parakeet] Échec au démarrage:", e);
        showStatus("⚠️ Erreur NVIDIA Parakeet", true);
    }
}

function handleParakeetResult(text) {
    if (!text) return;

    // Pour Parakeet, comme c'est du chunk-based, on ajoute au transcript final
    const textarea = document.getElementById('liveTranscript');
    if (textarea) {
        parakeetCurrentTranscript += text + " ";
        textarea.value = parakeetCurrentTranscript;
        textarea.scrollTop = textarea.scrollHeight;
    }
}

function stopParakeet() {
    isParakeetRunning = false;
    if (parakeetSourceNode) parakeetSourceNode.disconnect();
    if (parakeetProcessorNode) parakeetProcessorNode.disconnect();
    if (parakeetAudioContext && parakeetAudioContext.state !== 'closed') {
        parakeetAudioContext.close();
    }
    parakeetAudioContext = null;
    parakeetSourceNode = null;
    parakeetProcessorNode = null;
    console.log("[Parakeet] Arrêté.");
}

// Exposer au reste du système (car c'est un module)
window.startParakeetWithStream = startParakeetWithStream;
window.stopParakeet = stopParakeet;
window.initParakeet = initParakeet;
