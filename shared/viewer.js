// shared/viewer.js (GitHub Pages compatible ES Module)
//
// Provides setupTabbedViewer() for product pages.
// Also includes safe loading-status handling for <model-viewer>.
//
// Usage in product pages (already present):
//   import { setupTabbedViewer } from "../../shared/viewer.js";
//   setupTabbedViewer({ items: [...] });

function $(sel, root=document){ return root.querySelector(sel); }

function setActiveButton(container, activeKey){
  container.querySelectorAll('button[data-key]').forEach(btn=>{
    btn.classList.toggle('primary', btn.dataset.key === activeKey);
  });
}

export function setupTabbedViewer(opts = {}) {
  const items = Array.isArray(opts.items) ? opts.items : [];
  const modelViewerId = opts.modelViewerId || "mv";
  const tabsId = opts.tabsId || "tabs";
  const statusId = opts.statusId || "status";
  const rotateBtnId = opts.rotateBtnId || "btn-rotate";
  const resetBtnId  = opts.resetBtnId  || "btn-reset";
  const modeId      = opts.modeId      || "mode";

  const mv = document.getElementById(modelViewerId);
  const tabs = document.getElementById(tabsId);
  const statusEl = document.getElementById(statusId);
  const modeEl = document.getElementById(modeId);

  if (!mv || !tabs || items.length === 0) {
    if (statusEl) statusEl.textContent = "Viewer not initialized (missing elements).";
    return;
  }

  // Save initial camera settings for Reset.
  const initial = {
    cameraOrbit: mv.getAttribute("camera-orbit") || null,
    fieldOfView: mv.getAttribute("field-of-view") || null,
    autoRotate: mv.hasAttribute("auto-rotate"),
    exposure: mv.getAttribute("exposure") || null,
  };

  function setStatus(text){ if (statusEl) statusEl.textContent = text; }

  // Build tab buttons.
  tabs.innerHTML = "";
  items.forEach((it) => {
    const btn = document.createElement("button");
    btn.className = "btn small";
    btn.type = "button";
    btn.dataset.key = it.key || it.label || "item";
    btn.textContent = it.label || it.tab || it.key || "View";
    btn.addEventListener("click", () => {
      const key = btn.dataset.key;
      setActiveButton(tabs, key);
      if (modeEl) modeEl.textContent = it.tab || it.label || it.key || "";
      setStatus("Loading…");

      // Set model source (relative paths recommended).
      if (it.src) mv.setAttribute("src", it.src);
    });
    tabs.appendChild(btn);
  });

  // Rotate toggle
  const rotateBtn = document.getElementById(rotateBtnId);
  if (rotateBtn) {
    rotateBtn.addEventListener("click", () => {
      const enabled = mv.hasAttribute("auto-rotate");
      if (enabled) mv.removeAttribute("auto-rotate");
      else mv.setAttribute("auto-rotate", "");
      rotateBtn.classList.toggle("primary", !enabled);
    });
    // initial UI
    rotateBtn.classList.toggle("primary", mv.hasAttribute("auto-rotate"));
  }

  // Reset
  const resetBtn = document.getElementById(resetBtnId);
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      try {
        if (typeof mv.resetTurntableRotation === "function") mv.resetTurntableRotation();
      } catch (e) {}

      // Restore camera / fov if present
      try {
        if (initial.cameraOrbit !== null) mv.setAttribute("camera-orbit", initial.cameraOrbit);
        if (initial.fieldOfView !== null) mv.setAttribute("field-of-view", initial.fieldOfView);
      } catch (e) {}

      // Restore autorotate
      try {
        if (initial.autoRotate) mv.setAttribute("auto-rotate", "");
        else mv.removeAttribute("auto-rotate");
      } catch (e) {}

      setStatus("Reset.");
    });
  }

  // Loading progress / load / error
  mv.addEventListener("progress", (event) => {
    const tp = event?.detail?.totalProgress;
    if (typeof tp === "number") {
      const pct = Math.round(tp * 100);
      setStatus(pct >= 100 ? "Finalizing…" : `Loading… ${pct}%`);
    }
  });

  mv.addEventListener("load", () => setStatus("Loaded."));
  mv.addEventListener("error", () => setStatus("Error loading model."));

  // Select initial item
  const first = items[0];
  const initialKey = opts.initialKey || first.key || first.label;
  const firstBtn = tabs.querySelector(`button[data-key="${CSS.escape(String(initialKey))}"]`) || tabs.querySelector("button[data-key]");
  if (firstBtn) firstBtn.click();
}

// Optional helper: hide overlay elements safely (kept from previous version)
export function autoHideLoadingOverlay() {
  document.querySelectorAll("model-viewer").forEach((modelViewer) => {
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
      overlay.classList.add("hidden");
      window.setTimeout(() => { overlay.style.display = "none"; }, 250);
    }

    modelViewer.addEventListener("progress", (event) => {
      const tp = event?.detail?.totalProgress;
      if (typeof tp === "number" && tp >= 1) hideOverlay();
    });
    modelViewer.addEventListener("load", hideOverlay);
    window.setTimeout(() => {
      try { if (modelViewer.loaded) hideOverlay(); } catch (e) {}
    }, 800);
  });
}
