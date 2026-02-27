(function () {
    function getVM() {
        if (window.vm) return window.vm;
        if (window.__TW_VM__) return window.__TW_VM__;
        const app = document.getElementById("app");
        if (app) {
            const key = Object.keys(app).find(k => k.startsWith("__reactContainer"));
            if (key) {
                let node = app[key].child;
                while (node) {
                    if (node.memoizedProps?.store) return node.memoizedProps.store.getState().scratchGui.vm;
                    node = node.child;
                }
            }
        }
        return null;
    }
    const vm = getVM();
    if (!vm) return alert("Billies Needle: VM not found!");

    // --- PIN STATE ---
    const pinnedItems = new Set();

    // --- INJECT PULSE ANIMATION & LOGO CSS ---
    const style = document.createElement('style');
    style.innerHTML = `
        @keyframes needlePulse {
            0% { border-color: #c300ff; box-shadow: 0 0 15px rgba(195, 0, 255, 0.4); color: #c300ff; }
            50% { border-color: #ff00ff; box-shadow: 0 0 25px rgba(255, 0, 255, 0.6); color: #ff00ff; }
            100% { border-color: #c300ff; box-shadow: 0 0 15px rgba(195, 0, 255, 0.4); color: #c300ff; }
        }
        .needle-pulsing { animation: needlePulse 4s infinite ease-in-out !important; }
        .menu-logo-img { width: 22px; height: 22px; image-rendering: pixelated; margin-left: 10px; filter: drop-shadow(0 0 5px rgba(195, 0, 255, 0.5)); }
        .pin-btn { cursor: pointer; background: none; border: none; font-size: 10px; padding: 0 5px; color: #444; transition: 0.2s; }
        .pin-btn.active { color: #ff00ff; text-shadow: 0 0 5px #ff00ff; }
    `;
    document.head.appendChild(style);

    // --- CAM LOGIC ---
    let camX = 0; let camY = 0;
    const applyCam = () => {
        const stage = vm.runtime.getTargetForStage();
        if (stage && vm.runtime.renderer) {
            vm.runtime.renderer.setStageSize(camX, camY, 480, 360);
            vm.runtime.requestRedraw();
        }
    };

    // --- UI SETUP ---
    const menu = document.createElement('div');
    menu.id = "billies-needle-menu";
    menu.className = "needle-pulsing"; 
    menu.style = `position: fixed; top: 50px; right: 20px; width: 300px; max-height: 85vh; background: #1a1a1a; color: #c300ff; border: 2px solid #c300ff; border-radius: 4px; z-index: 999999; font-family: 'Courier New', monospace; overflow-y: auto; padding: 12px;`;
    
    const LOGO_URL = "https://raw.githubusercontent.com/EEEE842/billies-needle/main/costume1.png";

    menu.innerHTML = `
        <div id="drag-header" style="cursor: move; font-weight: bold; border-bottom: 1px solid #c300ff; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center;">
                <span class="needle-pulsing" style="font-size: 14px;">[ BILLIES NEEDLE ]</span>
                <img src="${LOGO_URL}" class="menu-logo-img" alt="logo">
            </div>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor:pointer; color:red; font-size: 16px;">[X]</span>
        </div>

        <input type="text" id="needle-search" class="needle-pulsing" placeholder="Search..." style="width: 100%; background: #000; color: #c300ff; border: 1px solid #c300ff; padding: 4px; margin-bottom: 10px; font-size: 12px; box-sizing: border-box;">
        
        <div id="needle-content">
            <div id="btn-collapse-pins" style="font-weight:bold; font-size:12px; color:#ff00ff; cursor:pointer; background:#220022; padding:4px; margin-bottom:2px; display:flex; justify-content:space-between; border:1px solid #ff00ff;">
                <span>★ PINNED ACCESS</span><span id="indicator-pins">[-]</span>
            </div>
            <div id="needle-pins" style="margin-bottom: 10px; padding: 5px; background: rgba(255,0,255,0.05); border: 1px solid #330033;"></div>

            <div id="btn-collapse-misc" style="font-weight:bold; font-size:12px; color:#fff; cursor:pointer; background:#222; padding:4px; margin-bottom:2px; display:flex; justify-content:space-between; border:1px solid #444;">
                <span>MISC CONTROLS</span><span id="indicator-misc">[-]</span>
            </div>
            <div id="needle-misc" style="margin-bottom: 10px; padding: 8px; border: 1px solid #222; background: #111;">
                <div id="row-speed" style="display:flex; align-items:center;">
                    <button class="pin-btn" onclick="togglePin('row-speed')">📌</button>
                    <div style="flex-grow:1;">
                        <label style="font-size: 10px; display:block;">ENGINE SPEED (FPS)</label>
                        <input type="range" id="speed-hack" min="1" max="120" value="30" style="width:100%; accent-color:#c300ff;">
                    </div>
                </div>
                <div id="row-freeze" style="margin-top:10px; display:flex; align-items:center;">
                     <button class="pin-btn" onclick="togglePin('row-freeze')">📌</button>
                     <button id="btn-freeze" class="needle-pulsing" style="flex-grow:1; cursor:pointer; background:#000; color:#c300ff; border:1px solid #c300ff; padding:5px; font-family:inherit; font-size:11px; font-weight:bold;">FREEZE ENGINE</button>
                </div>
            </div>

            <div id="btn-collapse-vars" style="font-weight:bold; font-size:12px; color:#fff; cursor:pointer; background:#222; padding:4px; margin-bottom:2px; display:flex; justify-content:space-between; border:1px solid #444;">
                <span>MEMORY MAP</span><span id="indicator-vars">[-]</span>
            </div>
            <div id="needle-vars" style="margin-bottom: 10px;"></div>

            <div id="btn-collapse-sprites" style="font-weight:bold; font-size:12px; color:#fff; cursor:pointer; background:#222; padding:4px; margin-bottom:2px; display:flex; justify-content:space-between; border:1px solid #444;">
                <span>SPRITE CLUSTERS</span><span id="indicator-sprites">[-]</span>
            </div>
            <div id="needle-sprites"></div>
        </div>
    `;
    document.body.appendChild(menu);

    // --- GLOBAL PIN TOGGLE ---
    window.togglePin = (id) => {
        if (pinnedItems.has(id)) pinnedItems.delete(id);
        else pinnedItems.add(id);
        updateNeedle();
    };

    // --- LOGIC HANDLERS ---
    const toggle = (id) => {
        const el = document.getElementById(`needle-${id}`);
        const ind = document.getElementById(`indicator-${id}`);
        const hide = el.style.display !== 'none';
        el.style.display = hide ? 'none' : 'block';
        ind.innerText = hide ? '[+]' : '[-]';
    };
    document.getElementById('btn-collapse-pins').onclick = () => toggle('pins');
    document.getElementById('btn-collapse-misc').onclick = () => toggle('misc');
    document.getElementById('btn-collapse-vars').onclick = () => toggle('vars');
    document.getElementById('btn-collapse-sprites').onclick = () => toggle('sprites');

    // Drag Logic
    let isDragging = false, offset = [0, 0];
    const header = document.getElementById('drag-header');
    header.onmousedown = (e) => { isDragging = true; offset = [menu.offsetLeft - e.clientX, menu.offsetTop - e.clientY]; };
    document.onmousemove = (e) => { if (isDragging) { menu.style.left = (e.clientX + offset[0]) + 'px'; menu.style.top = (e.clientY + offset[1]) + 'px'; } };
    document.onmouseup = () => isDragging = false;

    // Freeze Logic
    let originalStep = vm.runtime._step.bind(vm.runtime); let isFrozen = false;
    document.getElementById('btn-freeze').onclick = function() {
        isFrozen = !isFrozen;
        if (isFrozen) {
            vm.runtime._step = function() { this.emit('RUNTIME_STEP_START'); this.emit('RUNTIME_STEP_END'); };
            this.innerText = "UNFREEZE ENGINE"; this.style.color = "#ff4444";
            this.classList.remove('needle-pulsing'); 
        } else {
            vm.runtime._step = originalStep;
            this.innerText = "FREEZE ENGINE"; this.style.color = "#c300ff";
            this.classList.add('needle-pulsing'); 
        }
    };

    document.getElementById('speed-hack').oninput = (e) => {
        const fps = Number(e.target.value);
        if (vm.setFramerate) vm.setFramerate(fps);
        else vm.runtime.currentStepTime = 1000 / fps;
    };

    function createVarRow(target, v, isPinned) {
        const row = document.createElement('div');
        const pinId = `var-${target.id}-${v.id}`;
        row.style = "display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; align-items:center;";
        row.innerHTML = `
            <div style="display:flex; align-items:center;">
                <button class="pin-btn ${isPinned ? 'active' : ''}" onclick="togglePin('${pinId}')">📌</button>
                <span style="color:#c300ff;">${v.name}:</span>
            </div>
            <input type="text" value="${v.value}" style="width:60px; background:#000; color:#fff; border:1px solid #333; text-align:center;">`;
        row.querySelector('input').onchange = (e) => { v.value = e.target.value; };
        return row;
    }

    function createSpriteRow(target, isPinned) {
        const row = document.createElement('div');
        const pinId = `sprite-${target.id}`;
        row.style = "display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px; align-items: center; border-left: 1px solid #c300ff; padding-left: 5px;";
        const isVisible = target.visible;
        row.innerHTML = `
            <div style="display:flex; align-items:center;">
                <button class="pin-btn ${isPinned ? 'active' : ''}" onclick="togglePin('${pinId}')">📌</button>
                <span style="max-width:80px; overflow:hidden;">${target.sprite.name}</span>
            </div>
            <div>
                <button class="v-btn" style="padding:2px 5px; cursor:pointer; background:#000; color:${isVisible ? '#ff4444' : '#44ff44'}; border:1px solid ${isVisible ? '#ff4444' : '#44ff44'}; font-size:9px;">${isVisible ? 'HIDE' : 'SHOW'}</button>
                <button class="r-btn" style="padding:2px 5px; cursor:pointer; background:#000; color:#fff; border:1px solid #fff; font-size:9px; margin-left:3px;">SIZE</button>
            </div>`;
        row.querySelector('.v-btn').onclick = () => { target.setVisible(!target.visible); vm.runtime.requestRedraw(); updateNeedle(); };
        row.querySelector('.r-btn').onclick = () => { let val = prompt(`New size:`, target.size); if (val) target.setSize(Number(val)); };
        return row;
    }

    function updateNeedle() {
        const searchTerm = document.getElementById('needle-search').value.toLowerCase();
        const pinList = document.getElementById('needle-pins');
        const varList = document.getElementById('needle-vars');
        const spriteList = document.getElementById('needle-sprites');
        
        if (document.activeElement.tagName === 'INPUT' && document.activeElement.id !== 'needle-search') return;
        
        pinList.innerHTML = ''; varList.innerHTML = ''; spriteList.innerHTML = '';

        // Handle Misc Pins
        if (pinnedItems.has('row-speed')) pinList.appendChild(document.getElementById('row-speed').cloneNode(true));
        if (pinnedItems.has('row-freeze')) pinList.appendChild(document.getElementById('row-freeze').cloneNode(true));

        vm.runtime.targets.forEach(target => {
            Object.values(target.variables).forEach(v => {
                const pinId = `var-${target.id}-${v.id}`;
                const isPinned = pinnedItems.has(pinId);
                const row = createVarRow(target, v, isPinned);
                
                if (isPinned) pinList.appendChild(row.cloneNode(true));
                if (v.name.toLowerCase().includes(searchTerm)) varList.appendChild(row);
            });

            if (!target.isStage) {
                const pinId = `sprite-${target.id}`;
                const isPinned = pinnedItems.has(pinId);
                const row = createSpriteRow(target, isPinned);
                
                if (isPinned) pinList.appendChild(row.cloneNode(true));
                if (target.sprite.name.toLowerCase().includes(searchTerm)) spriteList.appendChild(row);
            }
        });
        
        if (pinList.innerHTML === '') pinList.innerHTML = '<div style="font-size:9px; color:#444; text-align:center;">No items pinned.</div>';
    }

    setInterval(() => { if (document.getElementById('billies-needle-menu')) updateNeedle(); }, 3000);
    document.getElementById('needle-search').oninput = updateNeedle;
    updateNeedle();
})();
