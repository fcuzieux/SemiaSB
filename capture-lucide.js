// capture-lucide.js
document.addEventListener("DOMContentLoaded", () => {
  if (window.lucide && typeof lucide.createIcons === "function") {
    lucide.createIcons();
  } else {
    console.warn("Lucide non disponible sur capture.html");
  }
});
