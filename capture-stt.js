// capture-stt.js

let voskModel = null;
let voskRecognizer = null;
let voskAudioContext = null;
let voskSourceNode = null;
let voskProcessorNode = null;
let voskFinalTranscript = ""; // Stocke le texte validé (global pour être reset)
let voskLoadAborted = false; // Flag pour annuler le chargement

// Fonctions pour la barre de progression
function showVoskProgress() {
    const container = document.getElementById('vosk-progress-container');
    if (container) {
        container.style.display = 'block';
        updateVoskProgress(0, 'Initialisation...');
    }
}

function updateVoskProgress(percent, message) {
    const bar = document.getElementById('vosk-progress-bar');
    const text = document.getElementById('vosk-progress-text');
    const percentText = document.getElementById('vosk-progress-percent');

    if (bar) bar.style.width = percent + '%';
    if (text && message) text.textContent = message;
    if (percentText) percentText.textContent = Math.round(percent) + '%';
}

function hideVoskProgress() {
    const container = document.getElementById('vosk-progress-container');
    if (container) {
        // Animation de disparition
        setTimeout(() => {
            container.style.opacity = '0';
            container.style.transition = 'opacity 0.5s ease';
            setTimeout(() => {
                container.style.display = 'none';
                container.style.opacity = '1';
            }, 500);
        }, 1000); // Attendre 1 seconde avant de masquer
    }
}

async function initVoskIfNeeded() {
    if (voskModel && voskRecognizer) {
        console.log('Vosk déjà initialisé');
        return;
    }

    // Vérifier que Vosk est chargé
    if (typeof Vosk === 'undefined') {
        throw new Error('La bibliothèque Vosk n\'est pas chargée. Vérifiez que le script vosk.js est bien chargé.');
    }

    console.log('Initialisation de Vosk...');

    // Afficher la barre de progression
    showVoskProgress();

    try {
        // Chemin du modèle dans ton extension (à adapter)
        // IMPORTANT: Vosk-browser nécessite le fichier .tar.gz, PAS le dossier extrait !
        // Le script Installer-Vosk.bat téléchargera le fichier .tar.gz
        const modelSelect = document.getElementById('voskModelSelect');
        const selectedModel = modelSelect ? modelSelect.value : 'small';
        const modelPath = selectedModel === 'large'
            ? 'models/fr/vosk-model-fr-0.22.tar.gz'
            : 'models/fr/vosk-model-small-fr-0.22.tar.gz';
        // const modelPath = 'models/fr/vosk-model-small-fr-0.22.tar.gz';


        updateVoskProgress(10, 'Chargement du modèle Vosk...');
        console.log(`Chargement du modèle Vosk depuis: ${modelPath}`);

        // Simuler la progression pendant le chargement
        let progress = 10;
        const progressInterval = setInterval(() => {
            progress += 3; // Ralenti pour donner plus de temps
            if (progress < 85) { // Augmenté à 85% pour laisser de la marge
                updateVoskProgress(progress, 'Chargement du modèle en cours...');
                console.log(`Progression: ${progress}%`);
            }
        }, 300); // Ralenti à 300ms

        console.log('Appel à Vosk.createModel...');
        const modelLoadStart = Date.now();

        // Reset du flag d'annulation
        voskLoadAborted = false;

        // Configurer le bouton annuler
        const cancelBtn = document.getElementById('vosk-cancel-btn');
        const cancelHandler = () => {
            voskLoadAborted = true;
            clearInterval(progressInterval);
            updateVoskProgress(0, '❌ Chargement annulé par l\'utilisateur');
            console.log('⚠️ Chargement du modèle Vosk annulé');
            setTimeout(() => hideVoskProgress(), 2000);
        };
        if (cancelBtn) {
            cancelBtn.addEventListener('click', cancelHandler);
        }

        // Charger le modèle (sans timeout, l'utilisateur peut annuler manuellement)
        const modelPromise = Vosk.createModel(modelPath);
        const abortPromise = new Promise((_, reject) => {
            const checkAbort = setInterval(() => {
                if (voskLoadAborted) {
                    clearInterval(checkAbort);
                    reject(new Error('Chargement annulé par l\'utilisateur'));
                }
            }, 100);
        });

        voskModel = await Promise.race([modelPromise, abortPromise]);

        // Nettoyer le listener
        if (cancelBtn) {
            cancelBtn.removeEventListener('click', cancelHandler);
        }

        const modelLoadTime = ((Date.now() - modelLoadStart) / 1000).toFixed(2);
        console.log(`Modèle chargé en ${modelLoadTime} secondes`);

        clearInterval(progressInterval);

        updateVoskProgress(90, 'Modèle chargé, initialisation du recognizer...');
        console.log('Modèle Vosk chargé avec succès');

        // Récupérer les paramètres avancés depuis l'UI
        const sampleRateSelect = document.getElementById('voskSampleRate');
        const sampleRate = sampleRateSelect ? parseInt(sampleRateSelect.value) : 16000;

        const maxAltSelect = document.getElementById('voskMaxAlternatives');
        const maxAlternatives = maxAltSelect ? parseInt(maxAltSelect.value) : 1;

        console.log(`Initialisation Recognizer: sampleRate=${sampleRate}, maxAlternatives=${maxAlternatives}`);

        // Créer le recognizer avec les paramètres
        if (maxAlternatives > 1) {
            voskRecognizer = new voskModel.KaldiRecognizer(sampleRate, JSON.stringify(["[unk]"], maxAlternatives));
        } else {
            voskRecognizer = new voskModel.KaldiRecognizer(sampleRate);
        }

        // Appliquer la grammaire si présente
        const grammarInput = document.getElementById('voskGrammar');
        if (grammarInput && grammarInput.value.trim()) {
            const phrases = grammarInput.value.split(',').map(s => s.trim()).filter(s => s !== "");
            if (phrases.length > 0) {
                console.log('Application de la grammaire Vosk:', phrases);
                try {
                    voskRecognizer.setWords(true);
                } catch (e) { console.error("Erreur setWords", e); }
            }
        }

        updateVoskProgress(95, 'Configuration des événements...');
        console.log('Recognizer Vosk créé avec succès');

        const textarea = document.getElementById('liveTranscript');

        voskRecognizer.on('result', (msg) => {
            if (!textarea) return;
            const text = msg.result?.text || '';
            if (text) {
                console.log('Vosk result:', text);
                // Ajouter au texte final validé
                voskFinalTranscript += (voskFinalTranscript ? ' ' : '') + text + '. ';
                // Mettre à jour la textarea avec uniquement le texte final
                textarea.value = voskFinalTranscript;
                textarea.scrollTop = textarea.scrollHeight;
            }
        });

        // Événement partial result (si activé dans l'UI)
        const partialToggle = document.getElementById('voskPartialToggle');
        const enablePartial = partialToggle ? partialToggle.checked : true;

        if (enablePartial) {
            voskRecognizer.on('partialresult', (msg) => {
                if (!textarea) return;
                const partial = msg.result?.partial || '';
                if (partial) {
                    console.log('Vosk partial:', partial);
                    // Mettre à jour la textarea : Final validé + partiel en cours
                    const prefix = voskFinalTranscript ? (voskFinalTranscript + ' ') : '';
                    textarea.value = prefix + partial + "...";
                    textarea.scrollTop = textarea.scrollHeight;
                }
            });
            console.log('✅ Résultats partiels activés');
        } else {
            console.log('⚠️ Résultats partiels désactivés');
        }

        updateVoskProgress(100, '✅ Reconnaissance vocale prête !');
        console.log('✅ Vosk initialisé avec succès');

        // Masquer la barre après un court délai
        hideVoskProgress();

    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation de Vosk:', error);
        console.error('Détails de l\'erreur:', error.message, error.stack);
        updateVoskProgress(0, '❌ Erreur de chargement');
        setTimeout(() => hideVoskProgress(), 3000);
        throw error;
    }
}

// Appelée depuis startRecording avec le MediaStream de getDisplayMedia
async function startVoskWithStream(stream) {
    console.log('startVoskWithStream appelé');

    // Récupérer le contenu actuel si on veut continuer après l'ancien texte
    const textarea = document.getElementById('liveTranscript');
    if (textarea && textarea.value) {
        voskFinalTranscript = textarea.value + (textarea.value.endsWith(' ') ? '' : ' ');
    } else {
        voskFinalTranscript = "";
    }

    try {
        await initVoskIfNeeded();
    } catch (error) {
        console.error('Impossible d\'initialiser Vosk:', error);
        throw error;
    }

    // Piste audio ?
    if (!stream.getAudioTracks || stream.getAudioTracks().length === 0) {
        console.warn('⚠️ Pas de piste audio dans le stream pour Vosk');
        return;
    }

    console.log(`✅ ${stream.getAudioTracks().length} piste(s) audio détectée(s) pour Vosk`);

    try {
        if (!voskAudioContext) {
            // Récupérer le sample rate depuis l'UI
            const sampleRateSelect = document.getElementById('voskSampleRate');
            const sampleRate = sampleRateSelect ? parseInt(sampleRateSelect.value) : 16000;

            voskAudioContext = new (window.AudioContext || window.webkitAudioContext)({
                sampleRate: sampleRate
            });
            console.log(`AudioContext créé pour Vosk (${sampleRate}Hz)`);
        }

        // Source audio du stream de capture
        voskSourceNode = voskAudioContext.createMediaStreamSource(stream);
        console.log('MediaStreamSource créé pour Vosk');

        // Récupérer la taille du buffer depuis l'UI
        const chunkSizeSlider = document.getElementById('voskChunkSize');
        const chunkSizes = [2048, 4096, 8192];
        const bufferSize = chunkSizeSlider ? chunkSizes[parseInt(chunkSizeSlider.value)] : 4096;

        // Récupérer le gain depuis l'UI
        const gainSlider = document.getElementById('voskGain');
        const gainValue = gainSlider ? parseFloat(gainSlider.value) : 1.0;

        // Récupérer le nombre d'alternatives maximales depuis l'UI
        const maxAltSelect = document.getElementById('voskMaxAlternatives');
        const maxAlternatives = maxAltSelect ? parseInt(maxAltSelect.value) : 1;

        // ScriptProcessor avec taille de buffer configurable
        voskProcessorNode = voskAudioContext.createScriptProcessor(bufferSize, 1, 1);
        console.log(`ScriptProcessor créé: bufferSize=${bufferSize}, gain=${gainValue}, maxAlternatives=${maxAlternatives}`);

        // Appliquer le gain si différent de 1.0
        let processNode = voskSourceNode;
        if (gainValue !== 1.0) {
            const gainNode = voskAudioContext.createGain();
            gainNode.gain.value = gainValue;
            voskSourceNode.connect(gainNode);
            processNode = gainNode;
            console.log(`Gain audio appliqué: ${gainValue}`);
        }
        voskProcessorNode.onaudioprocess = (event) => {
            try {
                if (voskRecognizer) {
                    voskRecognizer.acceptWaveform(event.inputBuffer);
                }
            } catch (e) {
                console.error('acceptWaveform error', e);
            }
        };

        processNode.connect(voskProcessorNode);
        // On ne route pas vers les HP, pas besoin de connecter à destination
        // mais certains navigateurs exigent une destination; si problème, active la ligne suivante:
        voskProcessorNode.connect(voskAudioContext.destination);

        console.log('✅ Vosk connecté au stream audio et prêt à transcrire');
    } catch (error) {
        console.error('❌ Erreur lors de la connexion de Vosk au stream:', error);
        throw error;
    }
}

// À appeler dans stopRecording
function stopVosk() {
    console.log('Arrêt de Vosk...');
    try {
        if (voskProcessorNode) {
            voskProcessorNode.disconnect();
            voskProcessorNode = null;
            console.log('ProcessorNode déconnecté');
        }
        if (voskSourceNode) {
            voskSourceNode.disconnect();
            voskSourceNode = null;
            console.log('SourceNode déconnecté');
        }
        if (voskAudioContext && voskAudioContext.state !== 'closed') {
            voskAudioContext.close();
            console.log('AudioContext fermé');
        }
        voskAudioContext = null;
        console.log('✅ Vosk arrêté');
    } catch (e) {
        console.error('Erreur stopVosk', e);
    }
}

// Réinitialise Vosk pour forcer le rechargement (ex: changement de modèle)
function resetVosk() {
    console.log('🔄 Réinitialisation de Vosk sollicitée...');
    stopVosk();
    voskModel = null;
    voskRecognizer = null;
    voskFinalTranscript = ""; // Reset du texte
}
