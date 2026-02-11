// ===== FONCTION DIALOGUER AVEC PDF =====

let pdfChunks = []; // Stocke les morceaux de texte du PDF
let pdfFullText = ''; // Stocke tout le texte
let pdfChatHistory = []; // Historique de conversation pour le PDF

// Configuration PDF.js
// Nous définissons le workerSrc. Dans une extension, nous devons utiliser chrome.runtime.getURL
// Si pdfjsLib est chargé globalement via le script tag
if (typeof pdfjsLib !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'libs/pdfjs/pdf.worker.min.js';
}

// Initialiser la fonction
function initPDFChat() {
    const pdfUpload = document.getElementById('pdf-upload');
    const pdfAskBtn = document.getElementById('pdf-ask-btn');
    const pdfClearBtn = document.getElementById('pdf-clear-btn');
    const pdfQuestion = document.getElementById('pdf-question');

    // Event: Upload PDF
    if (pdfUpload) {
        pdfUpload.addEventListener('change', handleFileUpload);
    }

    // Event: Poser une question
    if (pdfAskBtn) {
        pdfAskBtn.addEventListener('click', handlePDFQuestion);
    }

    // Event: Nouvelle conversation
    if (pdfClearBtn) {
        pdfClearBtn.addEventListener('click', clearPDFChat);
    }

    // Event: Entrée pour envoyer
    if (pdfQuestion) {
        pdfQuestion.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                handlePDFQuestion();
            }
        });
    }
}

// Gérer l'upload du fichier
async function handleFileUpload(event) {
    const file = event.target.files[0];
    const statusDiv = document.getElementById('pdf-status');
    const filenameSpan = document.getElementById('pdf-filename');
    const askBtn = document.getElementById('pdf-ask-btn');

    if (!file) return;

    if (file.type !== 'application/pdf') {
        statusDiv.textContent = '❌ Veuillez sélectionner un fichier PDF valide.';
        statusDiv.style.color = 'red';
        return;
    }

    filenameSpan.textContent = file.name;
    statusDiv.textContent = '⏳ Analyse du PDF en cours...';
    statusDiv.style.color = '#666';

    // Désactiver le bouton pendant l'analyse
    if (askBtn) askBtn.disabled = true;

    try {
        const arrayBuffer = await readFileAsArrayBuffer(file);
        pdfFullText = await extractTextFromPDF(arrayBuffer);

        // Chunk le texte (2000 caractères, overlap 200 comme dans l'exemple)
        pdfChunks = chunkText(pdfFullText, 2000, 200);

        console.log(`${pdfChunks.length} chunks créés.`);
        statusDiv.textContent = `✅ PDF chargé ! ${pdfChunks.length} segments analysés.`;
        statusDiv.style.color = 'green';

        // Activer le bouton
        if (askBtn) askBtn.disabled = false;

        // Initialiser l'historique avec le contexte système incluant le PDF
        // On intègre le contexte une seule fois dans le System Prompt pour qu'il soit "en mémoire"
        const context = pdfChunks.slice(0, 8).join('\n\n---\n\n');

        pdfChatHistory = [{
            role: "system",
            content: `Tu es un assistant expert pour analyser des documents PDF. Voici le contenu du document que tu dois analyser :\n\n${context}\n\nRéponds en français de manière précise et concise en te basant uniquement sur ce contexte.`
        }];

    } catch (error) {
        console.error('Erreur lecture PDF:', error);
        statusDiv.textContent = '❌ Erreur lors de la lecture du PDF : ' + error.message;
        statusDiv.style.color = 'red';
    }
}

// Lire le fichier comme ArrayBuffer
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// Extraire le texte du PDF (adapté pour navigateur)
async function extractTextFromPDF(arrayBuffer) {
    if (typeof pdfjsLib === 'undefined') {
        throw new Error("La librairie PDF.js n'est pas chargée. Veuillez vérifier votre connexion ou les fichiers libs.");
    }

    const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
    let fullText = '';

    // Pour une meilleure UX, on pourrait mettre à jour une barre de progression ici
    const statusDiv = document.getElementById('pdf-status');

    for (let i = 1; i <= pdf.numPages; i++) {
        if (statusDiv) statusDiv.textContent = `⏳ Lecture page ${i} sur ${pdf.numPages}...`;

        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n\n';
    }

    return fullText;
}

// Découper le texte en morceaux
function chunkText(text, chunkSize = 2000, overlap = 200) {
    const chunks = [];
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
        chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
}

// Gérer la question de l'utilisateur
async function handlePDFQuestion() {
    const pdfQuestion = document.getElementById('pdf-question');
    const pdfAnswer = document.getElementById('pdf-answer');
    const pdfAskBtn = document.getElementById('pdf-ask-btn');

    const question = pdfQuestion?.value.trim();
    if (!question) {
        showStatusUtils("Veuillez poser une question", true);
        return;
    }

    if (pdfChunks.length === 0) {
        showStatusUtils("Veuillez d'abord charger un PDF", true);
        return;
    }

    // Récupérer les paramètres
    const { provider, settings } = await getProviderSettings();

    if (!settings.apiKey) {
        showStatusUtils("❌ Clé API manquante (voir Paramètres)", true);
        return;
    }

    if (pdfAskBtn) {
        pdfAskBtn.textContent = '⏳';
        pdfAskBtn.disabled = true;
    }

    try {
        // Ajouter le message de l'utilisateur à l'historique (Mémoire)
        pdfChatHistory.push({
            role: "user",
            content: question
        });

        // Afficher "Vous: ..."
        appendMessageToChat(pdfAnswer, "user", question);

        // Vider l'input tout de suite
        if (pdfQuestion) pdfQuestion.value = '';

        // Appeler l'IA avec TOUT l'historique (System + User + Assistant + User...)
        const answer = await callAIWithHistory(provider, settings.apiKey, settings.model, pdfChatHistory);

        // Ajouter la réponse à l'historique
        pdfChatHistory.push({ role: "assistant", content: answer });

        // Afficher la réponse
        appendMessageToChat(pdfAnswer, "assistant", answer);

        showStatusUtils("Réponse reçue !");

    } catch (error) {
        console.error(error);
        appendMessageToChat(pdfAnswer, "error", error.message);
        showStatusUtils("Erreur lors de l'analyse", true);
        // Retirer le dernier message user si échec
        if (pdfChatHistory.length > 0 && pdfChatHistory[pdfChatHistory.length - 1].role === 'user') {
            pdfChatHistory.pop();
        }
    } finally {
        if (pdfAskBtn) {
            pdfAskBtn.textContent = '✨➤';
            pdfAskBtn.disabled = false;
        }
    }
}

// Helper pour afficher un message
function appendMessageToChat(container, role, text) {
    let html = '';
    if (role === 'user') {
        html = `
            <div style="margin: 15px 0; padding: 10px; background: #e3f2fd; border-left: 3px solid #2196f3; border-radius: 4px;">
                <strong>👤 Vous :</strong><br>
                ${formatText(text)}
            </div>
        `;
    } else if (role === 'assistant') {
        html = `
            <div style="margin: 15px 0; padding: 10px; background: #f3e5f5; border-left: 3px solid #9c27b0; border-radius: 4px;">
                <strong>🤖 Assistant :</strong><br>
                ${formatText(text)}
            </div>
        `;
    } else if (role === 'error') {
        html = `<div style="color:red; margin-top: 10px;"><strong>❌ Erreur:</strong> ${text}</div>`;
    }

    container.innerHTML += html;
    container.scrollTop = container.scrollHeight;
}

// Effacer la conversation
function clearPDFChat() {
    // On réinitialise l'historique au moment de la conversation, mais on garde le contexte PDF
    // Le contexte est rechargé uniquement si on re-upload un fichier ou si on le stocke globalement au chargement file. 
    // Ici clearPDFChat = "Nouvelle conversation", donc on veut peut-être réinitialiser la conversation MAIS garder le contexte.

    if (pdfChunks.length > 0) {
        const context = pdfChunks.slice(0, 8).join('\n\n---\n\n');
        pdfChatHistory = [{
            role: "system",
            content: `Tu es un assistant expert pour analyser des documents PDF. Voici le contenu du document que tu dois analyser :\n\n${context}\n\nRéponds en français de manière précise et concise en te basant uniquement sur ce contexte.`
        }];
    } else {
        pdfChatHistory = [];
    }

    const pdfAnswer = document.getElementById('pdf-answer');
    if (pdfAnswer) {
        pdfAnswer.innerHTML = '<p style="color: #666; font-style: italic;">Conversation effacée.</p>';
    }
    showStatusUtils("Conversation réinitialisée");
}

// Exposer init pour sidepanel.js si besoin (mais c'est un scope global ici dans une extension sans modules)
window.initPDFChat = initPDFChat;
