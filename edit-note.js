const api = (typeof browser !== "undefined") ? browser : chrome;

// Elements
const noteTitleInput = document.getElementById('note-title');
const noteIntroEditor = document.getElementById('note-intro');
const noteConclusionEditor = document.getElementById('note-conclusion');
const imagesGrid = document.getElementById('images-grid');
const saveBtn = document.getElementById('save-btn');
const closeBtn = document.getElementById('close-btn');
const statusMsg = document.getElementById('status-msg');

let currentNoteId = null;
let currentNote = null;

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Get ID from URL
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const urlParams = new URLSearchParams(window.location.search);
    currentNoteId = urlParams.get('id');

    if (!currentNoteId) {
        alert("ID de la note manquant.");
        window.close();
        return;
    }

    loadNote(Number(currentNoteId));
});

function loadNote(id) {
    // 1. Get Metadata List to verify existence and get basic info
    api.storage.local.get(['savedNotes'], (result) => {
        const notes = result.savedNotes || [];
        const meta = notes.find(n => n.id === id);

        if (!meta) {
            alert("Note non trouvée.");
            window.close();
            return;
        }

        currentNote = meta;

        // 2. Get Detailed Content (Split Storage Check)
        const contentKey = `note_content_${id}`;
        api.storage.local.get([contentKey], (contentResult) => {
            const contentData = contentResult[contentKey];

            if (contentData) {
                // Merge separate content into currentNote object for editing
                currentNote.intro = contentData.intro || "";
                currentNote.conclusion = contentData.conclusion || "";
                currentNote.captures = contentData.captures || [];
            } else {
                // LEGACY FALLBACK: 
                // Checks if content was stored in the metadata object (old format)
                currentNote.intro = currentNote.intro || "";
                currentNote.conclusion = currentNote.conclusion || "";
                currentNote.captures = currentNote.captures || [];
            }

            // Populate Fields
            noteTitleInput.value = currentNote.title || "";
            noteIntroEditor.innerHTML = currentNote.intro;
            noteConclusionEditor.innerHTML = currentNote.conclusion;

            // Populate Date
            if (currentNote.date) {
                const creationDate = new Date(currentNote.date);
                const day = String(creationDate.getDate()).padStart(2, '0');
                const month = String(creationDate.getMonth() + 1).padStart(2, '0');
                const year = creationDate.getFullYear();
                const hours = String(creationDate.getHours()).padStart(2, '0');
                const minutes = String(creationDate.getMinutes()).padStart(2, '0');
                const seconds = String(creationDate.getSeconds()).padStart(2, '0');

                const dateContainer = document.getElementById('note-date');
                if (dateContainer) {
                    dateContainer.innerHTML = `<i data-lucide="calendar" style="width:14px; height:14px;"></i> Créé le ${day}/${month}/${year} à ${hours}:${minutes}:${seconds}`;
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            }

            renderImages(currentNote.captures);
        });
    });
}

const TOOLBAR_HTML = `
    <div class="toolbar">
        <button data-action="bold" title="Gras"><i data-lucide="bold"></i></button>
        <button data-action="italic" title="Italique"><i data-lucide="italic"></i></button>
        <button data-action="underline" title="Souligné"><i data-lucide="underline"></i></button>
        <button data-action="code" title="Code"><i data-lucide="code"></i></button>
        <div class="divider"></div>
        <button data-action="h1" title="Titre 1">H1</button>
        <button data-action="h2" title="Titre 2">H2</button>
        <div class="divider"></div>
        <button data-action="list-ul" title="Liste à puces"><i data-lucide="list"></i></button>
        <button data-action="list-ol" title="Liste numérotée"><i data-lucide="list-ordered"></i></button>
        <button data-action="checklist" title="Liste de tâches"><i data-lucide="check-square"></i></button>
        <div class="divider"></div>
        <button data-action="quote" title="Citation"><i data-lucide="quote"></i></button>
        <button data-action="hr" title="Ligne horizontale"><i data-lucide="minus"></i></button>
        <button data-action="table" title="Tableau"><i data-lucide="table"></i></button>
        <div class="divider"></div>
        <button data-action="image" title="Insérer une image par URL"><i data-lucide="image"></i></button>
        <div class="divider"></div>
        <button data-action="undo" title="Annuler"><i data-lucide="undo-2"></i></button>
        <button data-action="redo" title="Refaire"><i data-lucide="redo-2"></i></button>
    </div>
`;

function renderImages(captures) {
    imagesGrid.innerHTML = '';
    captures.forEach((cap, index) => {
        const card = document.createElement('div');
        card.className = 'image-card';

        const imgSrc = typeof cap === 'string' ? cap : cap.image;
        const noteText = (typeof cap === 'object' && cap.note) ? cap.note : "";

        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = `Capture ${index + 1}`;

        // Add Toolbar
        const toolbarDiv = document.createElement('div');
        toolbarDiv.innerHTML = TOOLBAR_HTML;

        // Editable Note
        const editor = document.createElement('div');
        editor.className = 'editor';
        editor.contentEditable = 'true';
        editor.innerHTML = noteText;
        editor.addEventListener('input', (e) => {
            if (typeof cap === 'string') {
                captures[index] = { image: cap, note: e.target.innerHTML };
            } else {
                cap.note = e.target.innerHTML;
            }
        });

        const delBtn = document.createElement('div');
        delBtn.className = 'delete-image-btn';
        delBtn.innerHTML = '<i data-lucide="trash-2" style="width:16px; height:16px;"></i>';
        delBtn.title = "Supprimer cette capture";
        delBtn.addEventListener('click', () => {
            if (confirm("Supprimer cette capture ?")) {
                currentNote.captures.splice(index, 1);
                renderImages(currentNote.captures);
            }
        });

        card.appendChild(img);
        card.appendChild(toolbarDiv);
        card.appendChild(editor);
        card.appendChild(delBtn);
        imagesGrid.appendChild(card);
    });
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

saveBtn.addEventListener('click', () => {
    console.log("Save button clicked - capturing latest data from DOM...");
    if (!currentNote) {
        console.error("No currentNote loaded");
        return;
    }

    // 1. Get latest values from DOM
    const updatedTitle = noteTitleInput.value.trim() || currentNote.title || "Note";
    const updatedIntro = noteIntroEditor.innerHTML;
    const updatedConclusion = noteConclusionEditor.innerHTML;

    // Note: Image notes are already updated in real-time in currentNote.captures 
    // via the 'input' event listener in renderImages.

    console.log("Latest Intro length:", updatedIntro.length);
    console.log("Latest Conclusion length:", updatedConclusion.length);

    // Prepare Data for Storage
    const noteId = currentNote.id;
    const thumbnail = currentNote.captures.length > 0 ?
        (typeof currentNote.captures[0] === 'string' ? currentNote.captures[0] : currentNote.captures[0].image)
        : '';

    // Prepare filename and timestamp for both storage and download
    const safeTitle = updatedTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `${safeTitle}-${timestamp}.html`;

    // Update local object with latest DOM values
    currentNote.title = updatedTitle;
    currentNote.intro = updatedIntro;
    currentNote.conclusion = updatedConclusion;

    const contentToSave = {
        id: noteId,
        intro: updatedIntro,
        conclusion: updatedConclusion,
        captures: currentNote.captures
    };

    api.storage.local.get(['savedNotes'], (result) => {
        let notes = result.savedNotes || [];
        const index = notes.findIndex(n => n.id === noteId);

        if (index !== -1) {
            console.log("Persisting to storage...");
            notes[index].title = updatedTitle;
            notes[index].thumbnail = thumbnail;
            notes[index].date = new Date().toISOString(); // Update date to reflect last modification
            notes[index].filename = filename; // Update filename to the LATEST generated one

            // Cleanup legacy heavy fields in metadata if any
            delete notes[index].intro;
            delete notes[index].conclusion;
            delete notes[index].captures;

            const updates = {
                savedNotes: notes,
                [`note_content_${noteId}`]: contentToSave
            };

            api.storage.local.set(updates, () => {
                if (api.runtime.lastError) {
                    console.error("Storage error:", api.runtime.lastError);
                    alert("Erreur lors de la sauvegarde : " + api.runtime.lastError.message);
                } else {
                    console.log("Storage save successful. Triggering download.");
                    showStatus("Note enregistrée avec succès !");

                    // --- GENERATE AND DOWNLOAD UPDATED FILE ---
                    // Explicitly pass the LATEST values captured from DOM
                    const htmlContent = generateHTML(updatedTitle, updatedIntro, updatedConclusion, currentNote.captures);
                    const blob = new Blob([htmlContent], { type: 'text/html' });
                    const url = URL.createObjectURL(blob);

                    api.storage.local.get(['backupFolder'], (settings) => {
                        const backupFolder = settings.backupFolder || '';
                        let finalFilename = filename;

                        if (backupFolder) {
                            const folderName = backupFolder.split(/[/\\]/).pop() || 'SemiaSB';
                            finalFilename = `${folderName}/${filename}`;
                        }

                        if (api.downloads && api.downloads.download) {
                            api.downloads.download({
                                url: url,
                                filename: finalFilename,
                                saveAs: true
                            }, () => {
                                if (api.runtime.lastError) {
                                    console.error('Download error:', api.runtime.lastError);
                                    triggerDownload(url, finalFilename);
                                }
                                URL.revokeObjectURL(url);
                            });
                        } else {
                            triggerDownload(url, finalFilename);
                            URL.revokeObjectURL(url);
                        }
                    });
                }
            });
        }
    });
});

// Sync checkbox state for innerHTML capture
document.addEventListener('change', (e) => {
    if (e.target.type === 'checkbox') {
        if (e.target.checked) {
            e.target.setAttribute('checked', 'checked');
        } else {
            e.target.removeAttribute('checked');
        }
    }
});

function generateHTML(title, intro, conclusion, captures) {
    // Exactly matches the format expected from Note Capture
    const capturesHTML = captures.map((cap, index) => {
        const imgSrc = typeof cap === 'string' ? cap : cap.image;
        const noteText = (typeof cap === 'object' && cap.note) ? cap.note : "";

        return `
      <div class="capture-block">
        <h2>Capture ${index + 1}</h2>
        <img src="${imgSrc}" alt="Capture ${index + 1}">
        <div class="note">
          <h3>Note :</h3>
          <div>${noteText || '<em>Aucune note</em>'}</div>
        </div>
      </div>
    `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - ${new Date().toLocaleDateString('fr-FR')}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background: #f8f9fa;
      padding: 40px 20px;
      color: #1f2937;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 40px;
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    h1 { color: #6366f1; margin-bottom: 10px; font-size: 32px; }
    .date { color: #6b7280; margin-bottom: 40px; font-size: 14px; }
    .capture-block { margin-bottom: 40px; padding-bottom: 40px; border-bottom: 2px solid #e5e7eb; }
    .capture-block:last-child { border-bottom: none; }
    .capture-block h2 { color: #1f2937; margin-bottom: 20px; font-size: 24px; }
    .capture-block img { width: 100%; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); margin-bottom: 20px; }
    .note { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #6366f1; margin-bottom: 20px; }
    .note h3 { color: #6366f1; margin-bottom: 10px; font-size: 16px; }
    .note div { color: #4b5563; line-height: 1.6; }
    .note em { color: #9ca3af; }
    
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    table td, table th { border: 1px solid #e5e7eb; padding: 10px; text-align: left; }
    img { max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0; }

    blockquote {
      border: 2px solid #e5e7eb;
      padding: 15px;
      margin: 15px 0;
      border-radius: 8px;
      background: #f9fafb;
      font-style: italic;
      color: #4b5563;
    }
    .task-item {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 0;
    }
    .task-item input[type="checkbox"] {
      width: 16px;
      height: 16px;
      cursor: pointer;
    }
    .resizer-handle {
      display: none !important;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📝 Note Capture</h1>
    <p class="date">Créé le ${new Date().toLocaleString('fr-FR')}</p>
    <h1>${title}</h1>
    <div class="note">
      <h3>Introduction :</h3>
      <div>${intro || '<em>Aucune note</em>'}</div>
    </div>
    ${capturesHTML}
    <div class="note">
      <h3>Conclusion :</h3>
      <div>${conclusion || '<em>Aucune note</em>'}</div>
    </div>
  </div>
</body>
</html>`;
}

function triggerDownload(url, filename) {
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

closeBtn.addEventListener('click', () => {
    window.close();
});

const backToFilesBtn = document.getElementById('back-to-files-btn');
if (backToFilesBtn) {
    backToFilesBtn.addEventListener('click', () => {
        window.location.href = 'myfiles.html';
    });
}

function showStatus(msg) {
    statusMsg.textContent = msg;
    statusMsg.style.display = 'block';
    setTimeout(() => {
        statusMsg.style.display = 'none';
    }, 2000);
}
