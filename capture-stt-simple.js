// capture-stt-simple.js
// Version simplifiée utilisant l'API Web Speech (fonctionne sans Vosk)

let recognition = null;
let isRecognizing = false;
let finalTranscriptText = ''; // Texte final accumulé (global)

// Initialiser la reconnaissance vocale
function initSpeechRecognition() {
    // Vérifier si l'API est disponible
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        console.warn('⚠️ API Web Speech non disponible dans ce navigateur');
        return false;
    }

    recognition = new SpeechRecognition();

    // Lecture des réglages depuis l'UI
    const lang = document.getElementById('webSpeechLang')?.value || 'fr-FR';
    const continuous = document.getElementById('webSpeechContinuous')?.checked ?? true;
    const interimResults = document.getElementById('webSpeechInterim')?.checked ?? true;
    const maxAlternatives = parseInt(document.getElementById('webSpeechMaxAlternatives')?.value || '1');
    const keywords = document.getElementById('webSpeechGrammar')?.value.trim();

    // Configuration
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = maxAlternatives;

    // Support optionnel de la grammaire (mots-clés)
    const SpeechGrammarList = window.SpeechGrammarList || window.webkitSpeechGrammarList;
    if (SpeechGrammarList && keywords) {
        const grammarList = new SpeechGrammarList();
        // Format JSGF très basique pour les mots clés
        const grammar = '#JSGF V1.0; grammar keywords; public <keyword> = ' + keywords.split(/[,;]/).map(k => k.trim()).join(' | ') + ' ;';
        grammarList.addFromString(grammar, 1);
        recognition.grammars = grammarList;
        console.log('[WebSpeech] Grammaire appliquée:', grammar);
    }

    const textarea = document.getElementById('liveTranscript');

    // Événement: résultat (final et intermédiaire)
    recognition.onresult = (event) => {
        if (!textarea) return;

        let interimTranscript = '';
        let finalTranscript = '';

        // Parcourir tous les résultats
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
                console.log('Transcription finale:', transcript);
            } else {
                interimTranscript += transcript;
                console.log('Transcription partielle:', transcript);
            }
        }

        // Ajouter le texte final à l'accumulateur
        if (finalTranscript) {
            finalTranscriptText += finalTranscript;
        }

        // Afficher immédiatement : texte final + texte intermédiaire (en italique)
        if (interimTranscript) {
            // Afficher le texte final + le texte en cours (partiel)
            textarea.value = finalTranscriptText + interimTranscript;
        } else {
            // Afficher seulement le texte final
            textarea.value = finalTranscriptText;
        }

        // Scroller automatiquement vers le bas
        textarea.scrollTop = textarea.scrollHeight;
    };

    // Événement: démarrage
    recognition.onstart = () => {
        console.log('✅ Reconnaissance vocale démarrée');
        isRecognizing = true;
    };

    // Événement: fin
    recognition.onend = () => {
        console.log('⏹️ Reconnaissance vocale arrêtée');
        isRecognizing = false;

        // Redémarrer automatiquement si on est en cours d'enregistrement
        if (mediaRecorder && mediaRecorder.state === 'recording') {
            try {
                recognition.start();
            } catch (e) {
                console.error('Erreur redémarrage reconnaissance:', e);
            }
        }
    };

    // Événement: erreur
    recognition.onerror = (event) => {
        console.error('❌ Erreur reconnaissance vocale:', event.error);

        if (event.error === 'no-speech') {
            console.log('Pas de parole détectée, redémarrage...');
        } else if (event.error === 'audio-capture') {
            console.error('Impossible de capturer l\'audio');
        } else if (event.error === 'not-allowed') {
            console.error('Permission microphone refusée');
        }
    };

    console.log('✅ API Web Speech initialisée');
    return true;
}

// Démarrer la reconnaissance vocale
function startSpeechRecognition() {
    if (!recognition) {
        const initialized = initSpeechRecognition();
        if (!initialized) {
            throw new Error('API Web Speech non disponible');
        }
    }

    if (isRecognizing) {
        console.log('Reconnaissance vocale déjà en cours');
        return;
    }

    // Réinitialiser le texte accumulé pour une nouvelle session
    finalTranscriptText = '';
    const textarea = document.getElementById('liveTranscript');
    if (textarea) {
        textarea.value = '';
    }

    try {
        recognition.start();
        console.log('🎤 Démarrage de la reconnaissance vocale...');
    } catch (e) {
        console.error('Erreur démarrage reconnaissance:', e);
        throw e;
    }
}

// Arrêter la reconnaissance vocale
function stopSpeechRecognition() {
    if (recognition && isRecognizing) {
        recognition.stop();
        console.log('⏹️ Arrêt de la reconnaissance vocale');
    }
}

// Fonction explicite pour Web Speech
async function startWebSpeech(stream) {
    console.log('startWebSpeech appelé');

    // Vérifier qu'il y a de l'audio
    if (!stream.getAudioTracks || stream.getAudioTracks().length === 0) {
        console.warn('⚠️ Pas de piste audio dans le stream');
        return;
    }

    // Démarrer la reconnaissance vocale
    startSpeechRecognition();
}

// Fonction compatible avec l'ancien code
function stopVosk() {
    console.log('Arrêt de la reconnaissance vocale...');
    stopSpeechRecognition();
}
