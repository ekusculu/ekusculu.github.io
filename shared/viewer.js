// shared/viewer.js (ES Module)
// Exports: setupTabbedViewer({ items: [...] })
// Expects in page:
// - <model-viewer id="mv" ...> ... </model-viewer>
// - <div id="tabs"></div>
// - buttons: #btn-rotate, #btn-reset
// - status span: #status

export function setupTabbedViewer({ items = [] } = {}) {
  const mv = document.getElementById("mv");
  const tabs = document.getElementById("tabs");
  const btnRotate = document.getElementById("btn-rotate");
  const btnReset = document.getElementById("btn-reset");
  const status = document.getElementById("status");

  if (!mv) {
    console.error("[viewer] #mv not found");
    return;
  }
  if (!Array.isArray(items) || items.length === 0) {
    console.error("[viewer] items missing/empty");
    if (status) status.textContent = "No items configured";
    return;
  }

  // --- helpers
  const setStatus = (t) => { if (status) status.textContent = t; };

  const setActiveTab = (key) => {
    if (!tabs) return;
    [...tabs.querySelectorAll("button")].forEach((b) => {
      b.classList.toggle("active", b.dataset.key === key);
    });
  };

  const selectItem = (item) => {
    if (!item?.src) return;

    setStatus("Loading…");

    // model-viewer expects src; keep relative (assets/xxx.glb) which your pages use
    mv.setAttribute("src", item.src);

    // nice defaults
    if (!mv.hasAttribute("camera-controls")) mv.setAttribute("camera-controls", "");
    if (!mv.hasAttribute("environment-image")) mv.setAttribute("environment-image", "neutral");

    setActiveTab(item.key);
  };

  // --- tabs UI
  if (tabs) {
    tabs.innerHTML = "";
    items.forEach((it, idx) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "tab btn small"; // your CSS already styles .btn .small; tab class is optional
      b.dataset.key = it.key || `tab${idx}`;
      b.textContent = it.tab || it.label || `Item ${idx + 1}`;
      b.addEventListener("click", () => selectItem(it));
      tabs.appendChild(b);
    });
  }

  // --- model events
  mv.addEventListener("load", () => setStatus("Ready"));
  mv.addEventListener("error", (e) => {
    console.error("[viewer] model-viewer error", e);
    setStatus("Error (check Console/Network)");
  });
  mv.addEventListener("progress", (e) => {
    const p = e?.detail?.totalProgress;
    if (typeof p === "number") {
      const pct = Math.round(p * 100);
      setStatus(pct >= 100 ? "Finalizing…" : `Loading… ${pct}%`);
    }
  });

  // --- buttons
  if (btnRotate) {
    btnRotate.addEventListener("click", () => {
      if (mv.hasAttribute("auto-rotate")) {
        mv.removeAttribute("auto-rotate");
        btnRotate.textContent = "Rotate";
      } else {
        mv.setAttribute("auto-rotate", "");
        btnRotate.textContent = "Stop";
      }
    });
  }

  if (btnReset) {
    btnReset.addEventListener("click", () => {
      // Reset camera to initial position
      try {
        mv.resetTurntableRotation?.();
      } catch {}
      try {
        mv.resetCameraOrbit?.();
      } catch {}
      // Force re-select active to reload model if needed
      const active = items.find((it) => (tabs?.querySelector("button.active")?.dataset.key === (it.key || "")));
      selectItem(active || items[0]);
    });
  }

  // --- initial select
  selectItem(items[0]);
}
