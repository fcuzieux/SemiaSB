// ===== FONCTION DE CHAT IA =====

// Historique de conversation (mémoire de l'IA)
let chatHistory = [];

// Chat avec l'IA
async function chatWithAI() {
    const aiTextToChat = document.getElementById('ai-text-to-chat');
    const aiChatBtn = document.getElementById('ai-chat-btn');
    const aiAnswerChat = document.getElementById('ai-answer-chat');

    const textToChat = aiTextToChat?.value.trim();
    if (!textToChat) {
        showStatusUtils("Veuillez d'abord entrer le texte", true);
        return;
    }

    // Récupérer les paramètres
    const { provider, settings } = await getProviderSettings();

    if (!settings.apiKey) {
        showStatusUtils("❌ Clé API manquante (voir Paramètres)", true);
        return;
    }

    if (aiChatBtn) {
        aiChatBtn.textContent = '⏳';
        aiChatBtn.disabled = true;
    }

    try {
        // Si c'est le premier message, ajouter le message système
        if (chatHistory.length === 0) {
            chatHistory.push({
                role: "system",
                content: "Tu es un assistant designé pour les ingénieurs de l'ONERA. Tu dois donc répondre poliment et avec une connaissance approfondie de l'ONERA, de l'aéronautique de la défense et de l'Espace lorsque mes question peuvent s'y rapporter."
            });
        }

        // Ajouter le message de l'utilisateur à l'historique
        chatHistory.push({
            role: "user",
            content: textToChat
        });

        // Appeler l'IA avec tout l'historique
        const answer = await callAIWithHistory(provider, settings.apiKey, settings.model, chatHistory);

        // Ajouter la réponse de l'IA à l'historique
        chatHistory.push({
            role: "assistant",
            content: answer
        });

        // Afficher toute la conversation
        displayChatHistory(aiAnswerChat);

        // Vider le champ de saisie
        if (aiTextToChat) aiTextToChat.value = '';

        showStatusUtils(`Chat terminé ! (${chatHistory.length - 1} messages)`);
    } catch (error) {
        console.error(error);
        if (aiAnswerChat) {
            const errorMsg = `<div style="color:red; margin-top: 10px;"><strong>❌ Erreur:</strong> ${error.message}</div>`;
            aiAnswerChat.innerHTML += errorMsg;
        }
        showStatusUtils("Erreur lors du chat", true);
        // Retirer le dernier message utilisateur en cas d'erreur
        if (chatHistory.length > 0 && chatHistory[chatHistory.length - 1].role === 'user') {
            chatHistory.pop();
        }
    } finally {
        if (aiChatBtn) {
            aiChatBtn.textContent = '✨➤';
            aiChatBtn.disabled = false;
        }
    }
}

// Afficher l'historique de conversation
function displayChatHistory(container) {
    if (!container) return;

    let html = '';

    // Parcourir l'historique (en sautant le message système)
    for (let i = 1; i < chatHistory.length; i++) {
        const msg = chatHistory[i];

        if (msg.role === 'user') {
            html += `
                <div style="margin: 15px 0; padding: 10px; background: #e3f2fd; border-left: 3px solid #2196f3; border-radius: 4px;">
                    <strong>👤 Vous :</strong><br>
                    ${formatText(msg.content)}
                </div>
            `;
        } else if (msg.role === 'assistant') {
            html += `
                <div style="margin: 15px 0; padding: 10px; background: #f3e5f5; border-left: 3px solid #9c27b0; border-radius: 4px;">
                    <strong>🤖 Assistant :</strong><br>
                    ${formatText(msg.content)}
                </div>
            `;
        }
    }

    container.innerHTML = html;

    // Scroller vers le bas
    container.scrollTop = container.scrollHeight;
}

// Effacer l'historique de conversation
function clearChatHistory() {
    chatHistory = [];
    const aiAnswerChat = document.getElementById('ai-answer-chat');
    if (aiAnswerChat) {
        aiAnswerChat.innerHTML = '<p style="color: #666; font-style: italic;">Historique effacé. Nouvelle conversation démarrée.</p>';
    }
    showStatusUtils("Historique effacé");
}

// Initialiser la fonction de chat
function initChatFunction() {
    const aiChatBtn = document.getElementById('ai-chat-btn');
    const aiClearHistoryBtn = document.getElementById('ai-clear-history-btn');
    const aiTextToChat = document.getElementById('ai-text-to-chat');

    // Event: Chat
    if (aiChatBtn) {
        aiChatBtn.addEventListener('click', () => chatWithAI());
    }

    // Event: Effacer l'historique
    if (aiClearHistoryBtn) {
        aiClearHistoryBtn.addEventListener('click', () => clearChatHistory());
    }

    // Event: Entrée pour envoyer
    if (aiTextToChat) {
        aiTextToChat.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                chatWithAI();
            }
        });
    }

}

