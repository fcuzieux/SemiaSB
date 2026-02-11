// firefox-redirect.js

// Détection Firefox
const isFirefox =
  typeof browser !== "undefined" &&
  browser.runtime &&
  typeof browser.runtime.getBrowserInfo === "function";

function getExtensionURL(path) {
  if (typeof browser !== "undefined" && browser.runtime && browser.runtime.getURL) {
    return browser.runtime.getURL(path);
  }
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
    return chrome.runtime.getURL(path);
  }
  return path;
}

document.addEventListener("DOMContentLoaded", () => {
  const videoMenuBtn = document.querySelector('.menu-item[data-view="Video-Capture"]');
  const menuItems = document.querySelectorAll('.menu-item');
  const viewContainers = document.querySelectorAll('.view-container');
  const videoView = document.getElementById("view-Video-Capture");
  const videoWarning = document.getElementById("video-warning-container");
  const videoChromeContainer = document.getElementById("video-chrome-container");

  if (!videoMenuBtn || !videoView) {
    console.warn("Video menu button or view not found");
    return;
  }

  // Sur Chrome : on masque le warning Firefox si besoin
  if (!isFirefox && videoWarning) {
    videoWarning.style.display = "none";
  } else {
    videoChromeContainer.style.display = "none";
  }

  videoMenuBtn.addEventListener(
    "click",
    (event) => {
      if (!isFirefox) {
        // Chrome / autres : laisser sidepanel.js gérer la vue interne
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      // 1) Activer visuellement le bouton Video-Capture
      menuItems.forEach(btn => btn.classList.remove("active"));
      videoMenuBtn.classList.add("active");

      // 2) Cacher toutes les vues, puis montrer uniquement view-Video-Capture
      viewContainers.forEach(v => v.classList.remove("active"));
      videoView.classList.add("active");

      // 3) S’assurer que le warning est visible sous Firefox
      if (videoWarning) {
        videoWarning.style.display = "block";
      }

      // 4) Ouvrir capture.html dans un nouvel onglet
      const url = getExtensionURL("capture.html");
      window.open(url, "_blank");
    },
    true // capture pour intercepter avant initNavigation() si besoin
  );
});
