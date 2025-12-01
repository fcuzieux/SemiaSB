// ===== EXEMPLE : NOUVELLE FONCTION MODULAIRE =====
// Ce fichier montre comment créer une nouvelle fonctionnalité modulaire

/**
 * Exemple : Fonction de prise de notes
 * Cette fonction sera appelée dans une vue spécifique du menu latéral
 */
function initNotesFunction() {
    // 1. Récupérer les éléments DOM de votre vue
    const notesContainer = document.getElementById('notes-list');
    const addNoteBtn = document.getElementById('add-note-btn');
    const noteInput = document.getElementById('note-input');

    // 2. État local de la fonction
    let notes = [];

    // 3. Charger les données sauvegardées (si applicable)
    function loadNotes() {
        chrome.storage.local.get(['notes'], (result) => {
            notes = result.notes || [];
            renderNotes();
        });
    }

    // 4. Sauvegarder les données
    function saveNotes() {
        chrome.storage.local.set({ notes: notes });
    }

    // 5. Afficher les notes
    function renderNotes() {
        if (!notesContainer) return;

        notesContainer.innerHTML = '';
        notes.forEach((note, index) => {
            const noteElement = document.createElement('div');
            noteElement.className = 'note-item';
            noteElement.innerHTML = `
        <p>${note.text}</p>
        <small>${note.date}</small>
        <button onclick="deleteNote(${index})">Supprimer</button>
      `;
            notesContainer.appendChild(noteElement);
        });
    }

    // 6. Ajouter une note
    function addNote() {
        const text = noteInput?.value.trim();
        if (!text) return;

        notes.push({
            text: text,
            date: new Date().toLocaleString('fr-FR')
        });

        saveNotes();
        renderNotes();
        if (noteInput) noteInput.value = '';
    }

    // 7. Supprimer une note
    window.deleteNote = function (index) {
        notes.splice(index, 1);
        saveNotes();
        renderNotes();
    };

    // 8. Attacher les événements
    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', addNote);
    }

    if (noteInput) {
        noteInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addNote();
            }
        });
    }

    // 9. Initialiser
    loadNotes();
}

/**
 * HTML correspondant à ajouter dans sidepanel.html :
 *
 * <!-- Dans .sidebar-menu -->
 * <button class="menu-item" data-view="notes" title="Notes">
 *   <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
 *     <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
 *     <polyline points="14 2 14 8 20 8"></polyline>
 *     <line x1="16" y1="13" x2="8" y2="13"></line>
 *     <line x1="16" y1="17" x2="8" y2="17"></line>
 *   </svg>
 * </button>
 *
 * <!-- Dans .content-area -->
 * <div id="view-notes" class="view-container">
 *   <div class="view-header">
 *     <h3>📝 Mes Notes</h3>
 *     <p class="view-description">Prenez des notes rapidement</p>
 *   </div>
 *   <div class="view-content">
 *     <div class="notes-input-area">
 *       <input type="text" id="note-input" placeholder="Écrivez une note...">
 *       <button id="add-note-btn">Ajouter</button>
 *     </div>
 *     <div id="notes-list"></div>
 *   </div>
 * </div>
 */

/**
 * CSS correspondant à ajouter dans style.css :
 *
 * .notes-input-area {
 *   display: flex;
 *   gap: 12px;
 *   margin-bottom: 20px;
 * }
 *
 * .notes-input-area input {
 *   flex: 1;
 *   padding: 10px 14px;
 *   border: 1px solid var(--border-color);
 *   border-radius: var(--radius);
 *   font-family: inherit;
 *   font-size: 14px;
 * }
 *
 * .note-item {
 *   background: var(--bg-color);
 *   padding: 16px;
 *   border-radius: var(--radius);
 *   margin-bottom: 12px;
 * }
 *
 * .note-item p {
 *   margin-bottom: 8px;
 *   color: var(--text-main);
 * }
 *
 * .note-item small {
 *   color: var(--text-secondary);
 *   font-size: 12px;
 * }
 */

/**
 * Permissions à ajouter dans manifest.json (si nécessaire) :
 *
 * "permissions": [
 *   "storage"  // Pour sauvegarder les notes
 * ]
 */

// ===== INTÉGRATION DANS sidepanel.js =====
// À la fin du fichier, dans la section initialisation :
// initNavigation();
// initNotesFunction();  // <-- Ajouter cet appel
// loadTabs();
