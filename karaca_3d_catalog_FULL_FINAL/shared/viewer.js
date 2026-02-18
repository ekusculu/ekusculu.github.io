export function setupTabbedViewer(cfg){
  const mv=document.getElementById('mv');
  const status=document.getElementById('status');
  const tabsEl=document.getElementById('tabs');
  const titleEl=document.getElementById('mode');
  const netHintEl=document.getElementById('netHint');
  const items=(cfg.items||[]).map(it=>({heavy:false, ...it}));

  // --- Network detection (best-effort) ---
  function connection(){
    return navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
  }
  function isLikelyCellular(){
    const c = connection();
    if(!c) return false;
    if(c.saveData) return true;
    if(c.type && String(c.type).toLowerCase()==='cellular') return true;
    if(c.effectiveType && /(^|\s)(2g|3g)(\s|$)/i.test(c.effectiveType)) return true;
    return false;
  }

  // --- Loading UI (overlay + progress bar) ---
  function ensureLoadingUI(){
    let wrap=document.getElementById('loadingOverlay');
    if(wrap) return wrap;

    const host = mv?.parentElement || document.body;
    wrap=document.createElement('div');
    wrap.id='loadingOverlay';
    wrap.className='loading-overlay hidden';
    wrap.innerHTML = `
      <div class="loading-card">
        <div class="loading-title">Loading 3D model</div>
        <div class="loading-sub" id="loadingSub"></div>
        <div class="loading-bar"><div class="loading-bar__fill" id="loadingFill"></div></div>
        <div class="loading-pct" id="loadingPct">0%</div>
      </div>
    `;
    host.style.position = host.style.position || 'relative';
    host.appendChild(wrap);
    return wrap;
  }
  function setLoadingVisible(visible){
    const wrap=ensureLoadingUI();
    wrap.classList.toggle('hidden', !visible);
  }
  function setLoadingProgress(pct){
    const wrap=ensureLoadingUI();
    const fill=wrap.querySelector('#loadingFill');
    const pctEl=wrap.querySelector('#loadingPct');
    const sub=wrap.querySelector('#loadingSub');
    const clamped=Math.max(0, Math.min(100, pct));
    if(fill) fill.style.width = clamped + '%';
    if(pctEl) pctEl.textContent = clamped + '%';
    if(sub){
      // Show a helpful hint on slow connections
      if(isLikelyCellular()){
        sub.textContent = cfg.netHintText || 'Tip: Wi‑Fi will load large models faster.';
      }else{
        sub.textContent = '';
      }
    }
  }

  function updateNetHint(it){
    if(!netHintEl) return;
    const show = Boolean(cfg.netHintText) && isLikelyCellular() && Boolean(it?.heavy);
    netHintEl.textContent = cfg.netHintText || '';
    netHintEl.style.display = show ? 'block' : 'none';
  }

  function bust(url){
    const u=new URL(url, window.location.href);
    u.searchParams.set('v', Date.now().toString());
    return u.pathname + u.search;
  }
  function reframe(){
    mv.cameraOrbit="auto auto auto";
    mv.cameraTarget="auto auto auto";
    mv.fieldOfView="auto";
    requestAnimationFrame(()=>mv.jumpCameraToGoal());
  }
  function setIOS(_it){
    // AR disabled in this build
    mv.removeAttribute("ios-src");
  }

  let activeKey=null;
  function setActive(key){
    const it=items.find(x=>x.key===key)||items[0];
    if(!it) return;
    activeKey=it.key;

    titleEl.textContent=it.label || "";
    [...tabsEl.querySelectorAll('button')].forEach(b=>b.classList.toggle('primary', b.dataset.key===it.key));

    // loading UI
    setLoadingVisible(true);
    setLoadingProgress(0);
    status.textContent="Loading…";
    updateNetHint(it);

    setIOS(it);
    mv.src=bust(it.src);
    reframe();
  }

  // Tabs
  tabsEl.innerHTML = items.map((it,i)=>`<button class="btn small ${i===0?'primary':''}" data-key="${it.key}">${it.tab}</button>`).join('');
  tabsEl.addEventListener('click',(e)=>{
    const b=e.target.closest('button[data-key]');
    if(b) setActive(b.dataset.key);
  });

  // Buttons
  document.getElementById('btn-rotate')?.addEventListener('click',()=>mv.autoRotate=!mv.autoRotate);
  document.getElementById('btn-reset')?.addEventListener('click',()=>reframe());

  // model-viewer progress events
  mv.addEventListener('progress',(e)=>{
    const p = (e.detail && typeof e.detail.totalProgress==='number') ? e.detail.totalProgress : 0;
    const pct = Math.round(p*100);
    status.textContent = pct >= 100 ? "Finalizing…" : `Loading… ${pct}%`;
    setLoadingProgress(pct);
    if(pct >= 100) setLoadingVisible(true);
  });

  mv.addEventListener('load',()=>{
    status.textContent="Loaded ✅";
    setLoadingVisible(false);
    reframe();
    // Update hint after load (in case connection changes)
    const it=items.find(x=>x.key===activeKey);
    updateNetHint(it);
  });

  mv.addEventListener('error',()=>{
    status.textContent="Error loading model ❌";
    setLoadingVisible(false);
    const it=items.find(x=>x.key===activeKey);
    updateNetHint(it);
  });

  // React to network changes (if supported)
  const c=connection();
  if(c && typeof c.addEventListener==='function'){
    c.addEventListener('change', ()=>{
      const it=items.find(x=>x.key===activeKey);
      updateNetHint(it);
    });
  }

  if(items.length) setActive(items[0].key);
}
