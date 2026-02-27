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

    const pinnedItems = new Set();
    const ghostSprites = new Set();
    const killedSprites = new Set(); 

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
        .activity-dot { width: 6px; height: 6px; border-radius: 50%; display: inline-block; margin-right: 5px; background: #333; transition: 0.3s; }
        .activity-active { background: #00ff00; box-shadow: 0 0 5px #00ff00; }
        .var-input { width: 80px; background: #000; color: #fff; border: 1px solid #333; text-align: center; font-family: inherit; font-size: 10px; }
        #billies-needle-menu::-webkit-scrollbar { width: 6px; }
        #billies-needle-menu::-webkit-scrollbar-track { background: #111; }
        #billies-needle-menu::-webkit-scrollbar-thumb { background: #c300ff; border-radius: 10px; }
    `;
    document.head.appendChild(style);

    const menu = document.createElement('div');
    menu.id = "billies-needle-menu";
    menu.className = "needle-pulsing"; 
    menu.style = `position: fixed; top: 50px; right: 20px; width: 360px; max-height: 85vh; background: #1a1a1a; color: #c300ff; border: 2px solid #c300ff; border-radius: 4px; z-index: 999999; font-family: 'Courier New', monospace; overflow-y: auto; padding: 12px;`;
    
    const LOGO_URL = "https://raw.githubusercontent.com/EEEE842/billies-needle/main/costume1.png";

    menu.innerHTML = `
        <div id="drag-header" style="cursor: move; font-weight: bold; border-bottom: 1px solid #c300ff; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center;">
                <span class="needle-pulsing" style="font-size: 14px;">[ BILLIES NEEDLE ]</span>
                <img src="${LOGO_URL}" class="menu-logo-img" alt="logo">
            </div>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor:pointer; color:red; font-size: 16px;">[X]</span>
        </div>
        <input type="text" id="needle-search" class="needle-pulsing" placeholder="Search sprites/vars..." style="width: 100%; background: #000; color: #c300ff; border: 1px solid #c300ff; padding: 4px; margin-bottom: 10px; font-size: 12px; box-sizing: border-box;">
        
        <div id="needle-content">
            <div id="btn-collapse-pins" style="font-weight:bold; font-size:12px; color:#ff00ff; cursor:pointer; background:#220022; padding:4px; margin-bottom:2px; display:flex; justify-content:space-between; border:1px solid #ff00ff;">
                <span>★ PINNED ACCESS</span><span id="indicator-pins">[-]</span>
            </div>
            <div id="needle-pins" style="margin-bottom: 10px; padding: 8px; border: 1px solid #330033; background: #110011;"></div>

            <div id="btn-collapse-misc" style="font-weight:bold; font-size:12px; color:#fff; cursor:pointer; background:#222; padding:4px; margin-bottom:2px; display:flex; justify-content:space-between; border:1px solid #444;">
                <span>MISC CONTROLS</span><span id="indicator-misc">[-]</span>
            </div>
            <div id="needle-misc" style="margin-bottom: 10px; padding: 8px; border: 1px solid #222; background: #111;">
                <div id="row-speed" style="display:flex; align-items:center; margin-bottom:10px;">
                    <button class="pin-btn" onclick="togglePin('row-speed')">📌</button>
                    <div style="flex-grow:1;">
                        <label style="font-size: 10px; display:block;">ENGINE SPEED (FPS)</label>
                        <input type="range" class="speed-hack-input" min="1" max="120" value="30" style="width:100%; accent-color:#c300ff;">
                    </div>
                </div>
                <div id="row-clones" style="display:flex; align-items:center; margin-bottom:10px;">
                    <button class="pin-btn" onclick="togglePin('row-clones')">📌</button>
                    <div style="flex-grow:1;">
                        <label style="font-size: 10px; display:block;">CLONE LIMIT: <span class="clone-display">300</span></label>
                        <input type="range" class="clone-input" min="0" max="5000" value="300" style="width:100%; accent-color:#ff00ff;">
                    </div>
                </div>
                <div id="row-volume" style="display:flex; align-items:center; margin-bottom:10px;">
                    <button class="pin-btn" onclick="togglePin('row-volume')">📌</button>
                    <div style="flex-grow:1;">
                        <label style="font-size: 10px; display:block;">MASTER VOLUME: <span class="vol-display">100%</span></label>
                        <input type="range" class="volume-input" min="0" max="200" value="100" style="width:100%; accent-color:#00ffcc;">
                    </div>
                </div>
                <div id="row-freeze" style="display:flex; align-items:center;">
                     <button class="pin-btn" onclick="togglePin('row-freeze')">📌</button>
                     <button class="freeze-btn needle-pulsing" style="flex-grow:1; cursor:pointer; background:#000; color:#c300ff; border:1px solid #c300ff; padding:5px; font-family:inherit; font-size:11px; font-weight:bold;">FREEZE ENGINE</button>
                </div>
            </div>

            <div id="btn-collapse-vars" style="font-weight:bold; font-size:12px; color:#fff; cursor:pointer; background:#222; padding:4px; margin-bottom:2px; display:flex; justify-content:space-between; border:1px solid #444;">
                <span>MEMORY MAP</span><span id="indicator-vars">[-]</span>
            </div>
            <div id="needle-vars" style="margin-bottom: 10px; padding: 5px; border: 1px solid #222; background: #111;"></div>

            <div id="btn-collapse-sprites" style="font-weight:bold; font-size:12px; color:#fff; cursor:pointer; background:#222; padding:4px; margin-bottom:2px; display:flex; justify-content:space-between; border:1px solid #444;">
                <span>SPRITE CLUSTERS</span><span id="indicator-sprites">[-]</span>
            </div>
            <div id="needle-sprites" style="padding: 5px; border: 1px solid #222; background: #111;"></div>
        </div>
    `;
    document.body.appendChild(menu);

    // --- ENGINE PATCHES ---
    const originalTouching = vm.runtime.isTouchingSprite;
    vm.runtime.isTouchingSprite = function(a, b) {
        if (ghostSprites.has(a) || ghostSprites.has(b)) return false;
        return originalTouching.apply(this, arguments);
    };

    const originalStepThreads = vm.runtime._stepThreads.bind(vm.runtime);
    vm.runtime._stepThreads = function() {
        const filteredThreads = this.threads.filter(t => !killedSprites.has(t.target.id));
        const realThreads = this.threads;
        this.threads = filteredThreads;
        originalStepThreads();
        this.threads = realThreads;
    };

    let originalStep = vm.runtime._step.bind(vm.runtime);
    let isFrozen = false;

    window.togglePin = (id) => {
        if (pinnedItems.has(id)) pinnedItems.delete(id);
        else pinnedItems.add(id);
        updateNeedle();
    };

    const setupMiscEvents = (container) => {
        container.querySelectorAll('.freeze-btn').forEach(b => b.onclick = () => {
            isFrozen = !isFrozen;
            vm.runtime._step = isFrozen ? function() { this.emit('RUNTIME_STEP_START'); this.emit('RUNTIME_STEP_END'); } : originalStep;
            updateNeedle();
        });
        container.querySelectorAll('.speed-hack-input').forEach(i => i.oninput = (e) => {
            if (vm.setFramerate) vm.setFramerate(Number(e.target.value));
            else vm.runtime.currentStepTime = 1000 / Number(e.target.value);
        });
        container.querySelectorAll('.volume-input').forEach(i => i.oninput = (e) => {
            if (vm.runtime.audioEngine) vm.runtime.audioEngine.setMasterVolume(Number(e.target.value) / 100);
        });
        container.querySelectorAll('.clone-input').forEach(i => i.oninput = (e) => {
            vm.runtime.MAX_CLONES = Number(e.target.value);
        });
    };
    setupMiscEvents(menu);

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

    function createVarRow(target, v, isPinned) {
        const row = document.createElement('div');
        const pinId = `var-${target.id}-${v.id}`;
        row.style = "display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; align-items:center;";
        row.innerHTML = `
            <div style="display:flex; align-items:center;">
                <button class="pin-btn ${isPinned ? 'active' : ''}" onclick="togglePin('${pinId}')">📌</button>
                <span style="color:#c300ff; max-width:180px; overflow:hidden; white-space:nowrap;">${target.isStage ? '' : target.sprite.name + ':'}${v.name}</span>
            </div>
            <input type="text" class="var-input" value="${v.value}">`;
        
        const input = row.querySelector('input');
        input.onchange = (e) => { v.value = e.target.value; };
        // Update value live if not focused
        setInterval(() => { if (document.activeElement !== input) input.value = v.value; }, 1000);
        return row;
    }

    function createSpriteRow(target, isPinned) {
        const row = document.createElement('div');
        const pinId = `sprite-${target.id}`;
        row.style = "display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px; align-items: center; border-left: 1px solid #c300ff; padding-left: 5px;";
        
        const isVisible = target.visible;
        const isGhost = ghostSprites.has(target.id);
        const isKilled = killedSprites.has(target.id);
        const isActive = vm.runtime.threads.some(t => t.target.id === target.id);

        row.innerHTML = `
            <div style="display:flex; align-items:center;">
                <span class="activity-dot ${isActive ? 'activity-active' : ''}"></span>
                <span style="max-width:85px; overflow:hidden; white-space:nowrap;">${target.sprite.name}</span>
            </div>
            <div style="display:flex; align-items:center;">
                <button class="v-btn" style="padding:2px 4px; cursor:pointer; background:#000; color:${isVisible ? '#ff4444' : '#44ff44'}; border:1px solid ${isVisible ? '#ff4444' : '#44ff44'}; font-size:9px;">${isVisible ? 'H' : 'S'}</button>
                <button class="r-btn" style="padding:2px 4px; cursor:pointer; background:#000; color:#fff; border:1px solid #fff; font-size:9px; margin-left:2px;">SZ</button>
                <button class="d-btn" style="padding:2px 4px; cursor:pointer; background:#440000; color:#ff4444; border:1px solid #ff4444; font-size:9px; margin-left:2px; font-weight:bold;">DEL</button>
                <button class="g-btn" style="padding:2px 4px; cursor:pointer; background:#000; color:${isGhost ? '#00ff00' : '#888'}; border:1px solid ${isGhost ? '#00ff00' : '#888'}; font-size:9px; margin-left:2px;">GHO</button>
                <button class="k-btn" style="padding:2px 4px; cursor:pointer; background:#000; color:${isKilled ? '#ff0000' : '#fff'}; border:1px solid ${isKilled ? '#ff0000' : '#fff'}; font-size:9px; margin-left:2px;">KILL</button>
                <button class="pin-btn ${isPinned ? 'active' : ''}" onclick="togglePin('${pinId}')" style="margin-left:2px;">📌</button>
            </div>`;
        
        row.querySelector('.v-btn').onclick = () => { target.setVisible(!target.visible); updateNeedle(); };
        row.querySelector('.r-btn').onclick = () => { let val = prompt(`New size:`, target.size); if (val) target.setSize(Number(val)); };
        row.querySelector('.d-btn').onclick = () => { if(confirm(`Delete "${target.sprite.name}"?`)) { vm.runtime.disposeTarget(target); updateNeedle(); } };
        row.querySelector('.g-btn').onclick = () => { if (ghostSprites.has(target.id)) ghostSprites.delete(target.id); else ghostSprites.add(target.id); updateNeedle(); };
        row.querySelector('.k-btn').onclick = () => { if (killedSprites.has(target.id)) killedSprites.delete(target.id); else killedSprites.add(target.id); updateNeedle(); };
        return row;
    }

    function updateNeedle() {
        const searchTerm = document.getElementById('needle-search').value.toLowerCase();
        const pinList = document.getElementById('needle-pins');
        const varList = document.getElementById('needle-vars');
        const spriteList = document.getElementById('needle-sprites');
        
        // Don't refresh content if user is typing in a variable field
        if (document.activeElement.classList.contains('var-input')) return;

        pinList.innerHTML = ''; varList.innerHTML = ''; spriteList.innerHTML = '';

        // Pinned Misc
        ['row-speed', 'row-clones', 'row-volume', 'row-freeze'].forEach(id => {
            if (pinnedItems.has(id)) pinList.appendChild(document.getElementById(id).cloneNode(true));
        });
        setupMiscEvents(pinList);

        vm.runtime.targets.forEach(target => {
            // Variables
            Object.values(target.variables).forEach(v => {
                const pinId = `var-${target.id}-${v.id}`;
                const isPinned = pinnedItems.has(pinId);
                if (isPinned || v.name.toLowerCase().includes(searchTerm)) {
                    const row = createVarRow(target, v, isPinned);
                    if (isPinned) pinList.appendChild(row.cloneNode(true));
                    if (v.name.toLowerCase().includes(searchTerm)) varList.appendChild(row);
                }
            });

            // Sprites
            if (!target.isStage) {
                const pinId = `sprite-${target.id}`;
                const isPinned = pinnedItems.has(pinId);
                if (isPinned || target.sprite.name.toLowerCase().includes(searchTerm)) {
                    const row = createSpriteRow(target, isPinned);
                    if (isPinned) pinList.appendChild(row.cloneNode(true));
                    if (target.sprite.name.toLowerCase().includes(searchTerm)) spriteList.appendChild(row);
                }
            }
        });
    }

    setInterval(updateNeedle, 2000);
    document.getElementById('needle-search').oninput = updateNeedle;
    updateNeedle();

    // Draggable Logic
    let isDragging = false, offset = [0, 0];
    const header = document.getElementById('drag-header');
    header.onmousedown = (e) => { isDragging = true; offset = [menu.offsetLeft - e.clientX, menu.offsetTop - e.clientY]; };
    document.onmousemove = (e) => { if (isDragging) { menu.style.left = (e.clientX + offset[0]) + 'px'; menu.style.top = (e.clientY + offset[1]) + 'px'; } };
    document.onmouseup = () => isDragging = false;
})();
