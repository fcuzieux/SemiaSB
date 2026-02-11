// bridge.js - Pont de communication entre localhost et l'extension SemiaSB

console.log("[SemiaSB-Bridge] Initialisation du pont...");

// Ecouter les messages de la page web (capture.html)
window.addEventListener("message", async (event) => {
    // Sécurité: Verification de la source si nécessaire
    if (event.source !== window) return;

    const msg = event.data;

    // Ignore internal React/Extension messages clutter
    if (msg && typeof msg === 'object' && msg.type && msg.type.startsWith("SEMIA_")) {
        // Eviter de logger nos propres messages sortants si ça boucle
        if (msg.type !== "SEMIA_BRIDGE_READY" && msg.type !== "SEMIA_HELLO_ACK") {
            console.log("[SemiaSB-Bridge] Message reçu:", msg.type);
        }
    }

    if (msg && msg.type === "SEMIA_HELLO") {
        // Handshake
        console.log("[SemiaSB-Bridge] Handshake reçu. Réponse...");
        window.postMessage({ type: "SEMIA_HELLO_ACK", version: "1.0" }, "*");

    } else if (msg && msg.type === "SEMIA_GET_SETTINGS") {
        // Demande de paramètres (AI, Folder, etc.)
        console.log("[SemiaSB-Bridge] Demande de settings...");
        try {
            const response = await chrome.runtime.sendMessage({ action: "GET_SETTINGS" });
            window.postMessage({ type: "SEMIA_SETTINGS_RESPONSE", data: response }, "*");
        } catch (err) {
            console.error("[SemiaSB-Bridge] Erreur GET_SETTINGS:", err);
            window.postMessage({ type: "SEMIA_SETTINGS_ERROR", error: err.message }, "*");
        }

    } else if (msg && msg.type === "SEMIA_SAVE_REQUEST") {
        // Demande de sauvegarde (Vidéo/Texte)
        console.log("[SemiaSB-Bridge] Demande de sauvegarde:", msg.filename);
        try {
            const CHUNK_SIZE = 4 * 1024 * 1024; // 4 Mo (Plus sûr pour éviter les timeouts)
            const dataUrl = msg.dataUrl;

            if (dataUrl.length > CHUNK_SIZE) {
                console.log("[SemiaSB-Bridge] Fichier volumineux détecté, envoi par morceaux...");
                const totalChunks = Math.ceil(dataUrl.length / CHUNK_SIZE);
                const transferId = Date.now().toString();

                for (let i = 0; i < totalChunks; i++) {
                    const chunk = dataUrl.substring(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
                    await chrome.runtime.sendMessage({
                        action: "SAVE_MEDIA_CHUNK",
                        transferId: transferId,
                        chunk: chunk,
                        index: i,
                        total: totalChunks,
                        filename: msg.filename,
                        metadata: i === totalChunks - 1 ? msg.metadata : null // Métadonnées sur le dernier morceau
                    });
                    console.log(`[SemiaSB-Bridge] Morceau ${i + 1}/${totalChunks} envoyé`);
                }
                window.postMessage({ type: "SEMIA_SAVE_SUCCESS", filename: msg.filename }, "*");
            } else {
                // Envoi direct pour les petits fichiers
                const response = await chrome.runtime.sendMessage({
                    action: "SAVE_MEDIA",
                    dataUrl: dataUrl,
                    filename: msg.filename,
                    metadata: msg.metadata
                });

                if (response && response.success) {
                    window.postMessage({ type: "SEMIA_SAVE_SUCCESS", filename: msg.filename }, "*");
                } else {
                    window.postMessage({ type: "SEMIA_SAVE_ERROR", filename: msg.filename, error: response ? response.error : "Erreur inconnue" }, "*");
                }
            }
        } catch (err) {
            console.error("[SemiaSB-Bridge] Erreur SAVE_MEDIA:", err);
            let errorMsg = err.message;
            if (errorMsg.includes("Extension context invalidated")) {
                errorMsg = "L'extension a été mise à jour ou rechargée. Veuillez rafraîchir cette page (F5) pour continuer.";
            }
            window.postMessage({ type: "SEMIA_SAVE_ERROR", filename: msg.filename, error: errorMsg }, "*");
        }

    } else if (msg && msg.type === "SEMIA_SAVE_CHUNK") {
        // Nouvelle action : Transfert par morceaux (Streaming) pour éviter de charger tout le fichier en mémoire
        // Le chunk est déjà en Base64 depuis capture.js
        try {
            await chrome.runtime.sendMessage({
                action: "SAVE_MEDIA_CHUNK",
                transferId: msg.transferId,
                chunk: msg.chunk,
                index: msg.index,
                total: msg.total,
                filename: msg.filename,
                metadata: msg.metadata
            });

            // Ack pour la sync (facultatif mais utile pour la backpressure)
            // window.postMessage({ type: "SEMIA_CHUNK_ACK", index: msg.index }, "*");

            if (msg.index === msg.total - 1) {
                window.postMessage({ type: "SEMIA_SAVE_SUCCESS", filename: msg.filename }, "*");
            }
        } catch (err) {
            console.error("[SemiaSB-Bridge] Erreur SAVE_MEDIA_CHUNK:", err);
            window.postMessage({ type: "SEMIA_SAVE_ERROR", filename: msg.filename, error: err.message }, "*");
        }

    } else if (msg && msg.type === "SEMIA_SAVE_METADATA") {
        // Nouvelle action : Sauvegarder uniquement les métadonnées (Anti-Crash pour gros fichiers)
        console.log("[SemiaSB-Bridge] Demande indexation métadonnées:", msg.filename);
        try {
            const response = await chrome.runtime.sendMessage({
                action: "SAVE_METADATA",
                filename: msg.filename,
                metadata: msg.metadata
            });
            if (response && response.success) {
                window.postMessage({ type: "SEMIA_SAVE_SUCCESS", filename: msg.filename }, "*");
            } else {
                window.postMessage({ type: "SEMIA_SAVE_ERROR", filename: msg.filename, error: response?.error || "Erreur indexation" }, "*");
            }
        } catch (err) {
            console.error("[SemiaSB-Bridge] Erreur SAVE_METADATA:", err);
        }
    }
});

// Signaler présence
window.postMessage({ type: "SEMIA_BRIDGE_READY" }, "*");
