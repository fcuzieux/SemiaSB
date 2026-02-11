// document.addEventListener('DOMContentLoaded', () => {
//     const editor = document.getElementById('editor');

//     document.getElementById('btn-bold')
//         .addEventListener('click', () => {
//             document.execCommand('bold', false, null);
//             editor.focus();
//         });

//     document.getElementById('btn-italic')
//         .addEventListener('click', () => {
//             document.execCommand('italic', false, null);
//             editor.focus();
//         });
// });
// let activeEditor = null;

// document.addEventListener('DOMContentLoaded', () => {
//     // 1) Tous les éditeurs partagent la même logique
//     document.querySelectorAll('.editor').forEach(editor => {
//         editor.addEventListener('focus', () => {
//             activeEditor = editor;
//         });
//     });

//     // 2) Tous les boutons utilisent data-action
//     document.querySelectorAll('.toolbar [data-action]').forEach(btn => {
//         btn.addEventListener('click', () => {
//             if (!activeEditor) return;     // aucun éditeur sélectionné
//             const action = btn.dataset.action;

//             if (action === 'bold') {
//                 document.execCommand('bold', false, null);
//             } else if (action === 'italic') {
//                 document.execCommand('italic', false, null);
//             }

//             activeEditor.focus();
//         });
//     });
// });
let activeEditor = null;

document.addEventListener('focusin', (e) => {
    if (e.target.classList.contains('editor')) {
        activeEditor = e.target;
    }
});

document.addEventListener('click', (e) => {
    const btn = e.target.closest('.toolbar [data-action]');
    if (!btn) return;

    e.preventDefault();
    if (!activeEditor) return;

    const action = btn.dataset.action;

    switch (action) {
        case 'bold':
            document.execCommand('bold', false, null);
            break;
        case 'italic':
            document.execCommand('italic', false, null);
            break;
        case 'underline':
            document.execCommand('underline', false, null);
            break;
        case 'code':
            document.execCommand('formatBlock', false, 'PRE');
            break;
        case 'h1':
            document.execCommand('formatBlock', false, 'H1');
            break;
        case 'h2':
            document.execCommand('formatBlock', false, 'H2');
            break;
        case 'list-ul':
            document.execCommand('insertUnorderedList', false, null);
            break;
        case 'list-ol':
            document.execCommand('insertOrderedList', false, null);
            break;
        case 'quote':
            document.execCommand('formatBlock', false, 'BLOCKQUOTE');
            break;
        case 'hr':
            document.execCommand('insertHorizontalRule', false, null);
            break;
        case 'undo':
            document.execCommand('undo', false, null);
            break;
        case 'redo':
            document.execCommand('redo', false, null);
            break;
        case 'checklist': {
            const checklistItem = '<div class="task-item" style="display:flex; align-items:center; gap:8px; margin: 4px 0;"><input type="checkbox" style="width:16px; height:16px; margin:0;"><span>&nbsp;</span></div>';
            document.execCommand('insertHTML', false, checklistItem);
            break;
        }
        case 'table': {
            const rows = parseInt(prompt("Nombre de lignes :", "3")) || 3;
            const cols = parseInt(prompt("Nombre de colonnes :", "3")) || 3;

            let table = `<table style="width:100%; border-collapse:collapse; margin:10px 0;">`;
            for (let i = 0; i < rows; i++) {
                table += "<tr>";
                for (let j = 0; j < cols; j++) {
                    table += `<td style="border:1px solid #475569; padding:8px;">&nbsp;</td>`;
                }
                table += "</tr>";
            }
            table += `</table>`;

            document.execCommand('insertHTML', false, table);
            break;
        }
        case 'image': {
            let fileInput = document.getElementById('editor-image-upload');
            if (!fileInput) {
                fileInput = document.createElement('input');
                fileInput.type = 'file';
                fileInput.id = 'editor-image-upload';
                fileInput.accept = 'image/*';
                fileInput.style.display = 'none';
                document.body.appendChild(fileInput);

                fileInput.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (file && activeEditor) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            activeEditor.focus();
                            // Insert image wrapped in a resizable container
                            const imgHtml = `
                                <div class="resizable-img" style="display:inline-block; position:relative; margin:10px; vertical-align:bottom;">
                                    <img src="${event.target.result}" style="display:block; min-width:50px; min-height:50px; width:200px;">
                                    <div class="resizer-handle" style="width:12px; height:12px; background:#6366f1; position:absolute; right:-5px; bottom:-5px; cursor:nwse-resize; border:2px solid white; border-radius:3px; z-index:5;"></div>
                                </div>&nbsp;
                            `;
                            document.execCommand('insertHTML', false, imgHtml);
                        };
                        reader.readAsDataURL(file);
                    }
                    // Reset value to allow same file upload
                    fileInput.value = '';
                });
            }
            fileInput.click();
            break;
        }
        case 'text-color': {
            const color = btn.dataset.color || '#000000';
            document.execCommand('styleWithCSS', false, true);
            document.execCommand('foreColor', false, color);
            break;
        }
        case 'bg-color': {
            const color = btn.dataset.color || '#ffff00';
            document.execCommand('styleWithCSS', false, true);
            if (!document.execCommand('hiliteColor', false, color)) {
                document.execCommand('backColor', false, color);
            }
            break;
        }
    }

    activeEditor.focus();
});

// Resizing Logic
let resizableImg = null;
let startX, startY, startWidth;

document.addEventListener('mousedown', (e) => {
    if (e.target.classList.contains('resizer-handle')) {
        e.preventDefault();
        const container = e.target.parentElement;
        resizableImg = container.querySelector('img');

        startX = e.clientX;
        startWidth = resizableImg.clientWidth;

        document.addEventListener('mousemove', handleResizeMove);
        document.addEventListener('mouseup', handleResizeUp);
    }
});

function handleResizeMove(e) {
    if (!resizableImg) return;
    const deltaX = e.clientX - startX;
    resizableImg.style.width = Math.max(50, startWidth + deltaX) + 'px';
    resizableImg.style.height = 'auto'; // Aspect ratio preserved
}

function handleResizeUp() {
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeUp);
    resizableImg = null;
}
