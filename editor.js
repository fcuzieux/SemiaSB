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

document.addEventListener('DOMContentLoaded', () => {
    // éditeurs
    document.querySelectorAll('.editor').forEach(editor => {
        editor.addEventListener('focus', () => {
            activeEditor = editor;
        });
    });

    // toolbar
    document.querySelectorAll('.toolbar [data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
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

                case 'text-color': {
                    const color = btn.dataset.color || '#000000';
                    document.execCommand('styleWithCSS', false, true);
                    document.execCommand('foreColor', false, color); // couleur du texte
                    break;
                }

                case 'bg-color': {
                    const color = btn.dataset.color || '#ffff00';
                    document.execCommand('styleWithCSS', false, true);
                    // hiliteColor si dispo, sinon backColor (fallback IE / vieux moteurs)
                    if (!document.execCommand('hiliteColor', false, color)) {
                        document.execCommand('backColor', false, color);
                    }
                    break;
                }

                case 'font-bigger':
                    document.execCommand('increaseFontSize', false, null);
                    break;

                case 'font-smaller':
                    document.execCommand('decreaseFontSize', false, null);
                    break;
            }

            activeEditor.focus();
        });
    });
});
