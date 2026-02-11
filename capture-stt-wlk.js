// capture-stt-wlk.js
// Intégration de WhisperLiveKit (Option 4) via WebSocket
// Mode: Raw PCM 16kHz (plus compatible avec les backends Python AI)

let wlkSocket = null;
let wlkAudioContext = null;
let wlkScriptProcessor = null;
let wlkSource = null;

async function startWLKWithStream(stream) {
    console.log('🚀 Démarrage de WhisperLiveKit (Option 4)...');

    // Essayer localhost, souvent plus permissif sur Windows pour les WS locaux
    const wsUrl = 'ws://localhost:8000/asr';
    showStatus(`Connexion WLK (${wsUrl})...`, false);

    return new Promise((resolve, reject) => {
        try {
            console.log(`Tentative de connexion WS vers: ${wsUrl}`);

            // Timeout de 5 secondes pour la connexion
            const connectionTimeout = setTimeout(() => {
                if (wlkSocket && wlkSocket.readyState !== WebSocket.OPEN) {
                    console.error('❌ Timeout de connexion WLK');
                    wlkSocket.close();
                    showStatus("❌ Impossible de se connecter au serveur WLK. Lancez 'Lancer-WLK-Serveur.bat' d'abord !", true);
                    reject(new Error('Timeout de connexion au serveur WLK'));
                }
            }, 5000);

            // 1. Connexion WS
            wlkSocket = new WebSocket(wsUrl);
            wlkSocket.binaryType = 'arraybuffer'; // Crucial pour s'assurer que les données PCM sont traitées comme du binaire

            wlkSocket.onopen = () => {
                clearTimeout(connectionTimeout);
                console.log('✅ Connecté au serveur WLK');
                showStatus("✅ WLK Connecté. Parlez !", false);

                // Message d'initialisation recommandé pour WhisperLive
                const config = {
                    uid: "semia_" + Math.random().toString(36).substring(7),
                    language: "fr",
                    task: "transcribe",
                    model_size: "small"
                };
                wlkSocket.send(JSON.stringify(config));
                console.log("[WLK-Debug] Config envoyée:", config);

                // 2. Démarrer l'enregistrement et l'envoi (Format PCM)
                startSendingAudioPCM(stream);
                resolve();
            };

            wlkSocket.onmessage = (event) => {
                handleWLKMessage(event.data);
            };

            wlkSocket.onerror = (error) => {
                clearTimeout(connectionTimeout);
                console.error('WebSocket WLK Erreur:', error);
                console.error('⚠️ Assurez-vous que le serveur WLK est lancé (Lancer-WLK-Serveur.bat)');
                showStatus("❌ Erreur connexion WLK. Lancez 'Lancer-WLK-Serveur.bat' d'abord !", true);
                // Ne pas reject ici si c'est APRÈS l'ouverture, mais bon au start c'est critique
                if (wlkSocket.readyState !== WebSocket.OPEN) {
                    reject(new Error('Impossible de se connecter au serveur WLK. Vérifiez que Lancer-WLK-Serveur.bat est lancé.'));
                }
            };

            wlkSocket.onclose = (event) => {
                clearTimeout(connectionTimeout);
                console.log('WLK Déconnecté', event.code);
                if (event.code !== 1000) {
                    showStatus("⚠️ Connexion WLK fermée.", true);
                }
                stopWLK(); // Nettoyage
            };

        } catch (e) {
            console.error(e);
            reject(e);
        }
    });
}

function startSendingAudioPCM(stream) {
    // Configuration AudioContext pour du 16kHz (Standard Whisper)
    wlkAudioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    wlkSource = wlkAudioContext.createMediaStreamSource(stream);

    // Processeur pour récupérer les données brutes
    // Buffer plus grand (16384) pour plus de stabilité et moins de messages réseau
    const bufferSize = 16384;
    wlkScriptProcessor = wlkAudioContext.createScriptProcessor(bufferSize, 1, 1);

    wlkScriptProcessor.onaudioprocess = (e) => {
        if (!wlkSocket || wlkSocket.readyState !== WebSocket.OPEN) return;

        const inputData = e.inputBuffer.getChannelData(0); // Float32Array

        // Récupérer le gain depuis l'UI
        const gain = parseFloat(document.getElementById('wlkGain')?.value || "1.0");

        // WhisperLiveKit (et FFmpeg) attendent du PCM Int16
        // Conversion Float32 [-1.0, 1.0] -> Int16 [-32768, 32767]
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
            // Appliquer le gain et clamp la valeur entre -1 et 1, puis convertir en Int16
            let s = inputData[i] * gain;
            s = Math.max(-1, Math.min(1, s));
            int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }

        // Envoyer les données Int16 en tant qu'ArrayBuffer
        wlkSocket.send(int16Data.buffer);
    };

    wlkSource.connect(wlkScriptProcessor);
    wlkScriptProcessor.connect(wlkAudioContext.destination);
}

function handleWLKMessage(data) {
    try {
        const response = JSON.parse(data);
        console.log("[WLK-Debug] Rx (Original):", response);

        // Gestion des erreurs du serveur
        if (response.status === 'error') {
            console.error('❌ Erreur serveur WLK:', response.error);
            showStatus(`❌ Erreur WLK: ${response.error}`, true);
            return;
        }

        const textarea = document.getElementById('liveTranscript');
        if (!textarea) return;

        // Extraction exhaustive
        let text = response.text || "";
        if (!text && response.segment) text = response.segment.text || "";
        if (!text && response.segments && response.segments.length > 0) {
            text = response.segments.map(s => s.text).join(' ');
        }

        // Support pour le format avec 'lines' (utilisé par certains serveurs Faster-Whisper/WLK)
        if (!text && response.lines && Array.isArray(response.lines)) {
            text = response.lines.map(l => l.text).join(' ');
            console.log("[WLK-Debug] Texte extrait depuis 'lines':", text);
        }

        // Support pour les résultats partiels (buffer_transcription)
        const partial = response.buffer_transcription || "";
        if (partial) console.log("[WLK-Debug] Résultat partiel (buffer):", partial);

        console.log(`[WLK-Debug] Analyse finale -> text: "${text}", partial: "${partial}"`);

        if ((text && text.trim().length > 0) || (partial && partial.trim().length > 0)) {
            // Si on a reçu un tableau de lignes, ou si le serveur gère un buffer, 
            // on traite cela comme un état complet pour éviter les doublons.
            if (response.lines || response.buffer_transcription !== undefined || response.segments) {
                const fullText = (text.trim() + ' ' + partial.trim()).trim();
                console.log("[WLK-Debug] Mise à jour complète du textarea:", fullText);
                textarea.value = fullText;
            } else {
                // Ancien format (incrémental)
                console.log("[WLK-Debug] Ajout incrémental au textarea:", text.trim());
                textarea.value += (textarea.value ? ' ' : '') + text.trim();
            }
            textarea.scrollTop = textarea.scrollHeight;
        } else {
            console.log("[WLK-Debug] Aucun texte valide à afficher dans ce message.");
        }

    } catch (e) {
        // Si ce n'est pas du JSON, c'est peut-être un message texte brut
        console.log('WLK message (non-JSON):', data);
        const textarea = document.getElementById('liveTranscript');
        if (textarea && typeof data === 'string' && data.length > 0) {
            textarea.value += (textarea.value ? ' ' : '') + data.trim();
        }
    }
}

function stopWLK() {
    console.log("⏹️ Arrêt WLK");

    if (wlkScriptProcessor && wlkSource) {
        wlkSource.disconnect();
        wlkScriptProcessor.disconnect();
        wlkScriptProcessor = null;
        wlkSource = null;
    }

    if (wlkAudioContext) {
        wlkAudioContext.close();
        wlkAudioContext = null;
    }

    if (wlkSocket) {
        wlkSocket.close();
        wlkSocket = null;
    }
}
