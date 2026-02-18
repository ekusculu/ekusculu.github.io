// shared/viewer.js
// Loading overlay auto-hide after model is fully loaded.
// Safe even if elements are missing.

(function () {
  function $(sel, root) { return (root || document).querySelector(sel); }

  function setupOne(modelViewer) {
    // Prefer overlay inside same card/page; fallback to global id.
    const overlay =
      $("#loadingOverlay", modelViewer.parentElement) ||
      $("#loadingOverlay") ||
      $(".loading-overlay", modelViewer.parentElement) ||
      $(".loading-overlay");

    if (!overlay) return;

    let hidden = false;

    function hideOverlay() {
      if (hidden) return;
      hidden = true;

      // Smooth fade-out if CSS class exists.
      overlay.classList.add("hidden");

      // Hard remove from layout after a short delay (prevents covering buttons).
      window.setTimeout(() => {
        overlay.style.display = "none";
      }, 250);
    }

    // Some model-viewer versions emit 'progress' with totalProgress 0..1
    modelViewer.addEventListener("progress", (event) => {
      const tp = event?.detail?.totalProgress;
      if (typeof tp === "number" && tp >= 1) hideOverlay();
    });

    // 'load' fires when the model is ready.
    modelViewer.addEventListener("load", hideOverlay);

    // Fallback: if it's already loaded (edge cases), hide shortly after.
    window.setTimeout(() => {
      // If model-viewer exposes 'loaded' state (not always), try it; otherwise do nothing.
      // We keep this conservative.
      try {
        if (modelViewer.loaded) hideOverlay();
      } catch (e) {}
    }, 800);
  }

  function init() {
    document.querySelectorAll("model-viewer").forEach(setupOne);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
