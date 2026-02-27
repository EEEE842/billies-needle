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

    const ghostSprites = new Set();
    const killedSprites = new Set(); 

    // --- CSS INJECTION ---
    const style = document.createElement('style');
    style.innerHTML = `
        #billies-needle-menu { position: fixed; top: 50px; right: 20px; width: 360px; max-height: 85vh; background: #1a1a1a; color: #c300ff; border: 2px solid #c300ff; border-radius: 4px; z-index: 999999; font-family: 'Courier New', monospace; overflow-y: auto; padding: 12px; box-shadow: 0 0 20px rgba(195, 0, 255, 0.3); }
        .needle-header { cursor: move; font-weight: bold; border-bottom: 1px solid #c300ff; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
        .section-btn { font-weight:bold; font-size:12px; color:#fff; cursor:pointer; background:#222; padding:6px; margin-top:5px; display:flex; justify-content:space-between; border:1px solid #444; }
        .item-row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px; align-items: center; border-left: 1px solid #c300ff; padding-left: 5px; background: rgba(255,255,255,0.05); padding: 4px; }
        .needle-input { background: #000; color: #00ff00; border: 1px solid #c300ff; padding: 4px; font-family: inherit; }
        .ctrl-btn { padding:2px 4px; cursor:pointer; background:#000; color:#fff; border:1px solid #fff; font-size:9px; margin-left:2px; }
        .activity-dot { width: 8px; height: 8px; border-radius: 50%; background: #444; display: inline-block; margin-right: 5px; }
        .dot-active { background: #00ff00; box-shadow: 0 0 5px #00ff00; }
    `;
    document.head.appendChild(style);

    // --- RENDER MAIN MENU ---
    const menu = document.createElement('div');
    menu.id = "billies-needle-menu";
    menu.innerHTML = `
        <div class="needle-header" id="needle-drag">
            <span>[ BILLIES NEEDLE ]</span>
            <span id="needle-close" style="cursor:pointer; color:red;">[X]</span>
        </div>
        <input type="text" id="needle-search" placeholder="Search..." style="width:100%; margin-bottom:10px;" class="needle-input">
        
        <div class="section-btn" id="toggle-misc"><span>MISC CONTROLS</span><span>[-]</span></div>
        <div id="container-misc" style="padding:10px; background:#111;">
            <label style="font-size:10px;">FPS: <span id="val-fps">30</span></label>
            <input type="range" id="input-fps" min="1" max="120" value="30" style="width:100%;">
            <button id="btn-freeze" class="ctrl-btn" style="width:100%; margin-top:10px; border-color:#c300ff; color:#c300ff;">FREEZE ENGINE</button>
        </div>

        <div class="section-btn" id="toggle-vars"><span>MEMORY MAP (VARS)</span><span>[-]</span></div>
        <div id="container-vars"></div>

        <div class="section-btn" id="toggle-sprites"><span>SPRITE CLUSTERS</span><span>[-]</span></div>
        <div id="container-sprites"></div>
    `;
    document.body.appendChild(menu);

    // --- ENGINE HOOKS ---
    let originalStep = vm.runtime._step.bind(vm.runtime);
    let isFrozen = false;

    // --- CORE FUNCTIONS ---
    const updateList = () => {
        const query = document.getElementById('needle-search').value.toLowerCase();
        const varCont = document.getElementById('container-vars');
        const spriteCont = document.getElementById('container-sprites');

        // Clear only if user isn't typing in an input inside these containers
        if (document.activeElement.tagName === "INPUT" && document.activeElement.id !== "needle-search") return;

        varCont.innerHTML = '';
        spriteCont.innerHTML = '';

        vm.runtime.targets.forEach(target => {
            // Render Variables
            Object.values(target.variables).forEach(v => {
                if (v.name.toLowerCase().includes(query)) {
                    const row = document.createElement('div');
                    row.className = "item-row";
                    row.innerHTML = `
                        <span style="color:#aaa;">${target.isStage ? '' : target.sprite.name + ':'}${v.name}</span>
                        <input type="text" class="needle-input var-edit" data-id="${v.id}" data-target="${target.id}" value="${v.value}" style="width:60px;">
                    `;
                    row.querySelector('input').onchange = (e) => { v.value = e.target.value; };
                    varCont.appendChild(row);
                }
            });

            // Render Sprites
            if (!target.isStage && target.sprite.name.toLowerCase().includes(query)) {
                const isActive = vm.runtime.threads.some(t => t.target.id === target.id);
                const row = document.createElement('div');
                row.className = "item-row";
                row.innerHTML = `
                    <div>
                        <span class="activity-dot ${isActive ? 'dot-active' : ''}"></span>
                        <span>${target.sprite.name}</span>
                    </div>
                    <div>
                        <button class="ctrl-btn" onclick="this.dataset.state = (this.innerText === 'H'); window.needleAction('${target.id}', 'vis')">${target.visible ? 'H' : 'S'}</button>
                        <button class="ctrl-btn" onclick="window.needleAction('${target.id}', 'sz')">SZ</button>
                    </div>
                `;
                spriteCont.appendChild(row);
            }
        });
    };

    window.needleAction = (targetId, action) => {
        const target = vm.runtime.targets.find(t => t.id === targetId);
        if (!target) return;
        if (action === 'vis') target.setVisible(!target.visible);
        if (action === 'sz') { let s = prompt("Size:", target.size); if(s) target.setSize(Number(s)); }
        updateList();
    };

    // --- EVENT LISTENERS ---
    document.getElementById('needle-close').onclick = () => menu.remove();
    
    document.getElementById('input-fps').oninput = (e) => {
        const val = e.target.value;
        document.getElementById('val-fps').innerText = val;
        if (vm.setFramerate) vm.setFramerate(Number(val));
        else vm.runtime.currentStepTime = 1000 / val;
    };

    document.getElementById('btn-freeze').onclick = function() {
        isFrozen = !isFrozen;
        if (isFrozen) {
            vm.runtime._step = function() { this.emit('RUNTIME_STEP_START'); this.emit('RUNTIME_STEP_END'); };
            this.style.background = "#ff0000"; this.innerText = "UNFREEZE";
        } else {
            vm.runtime._step = originalStep;
            this.style.background = "#000"; this.innerText = "FREEZE ENGINE";
        }
    };

    // Toggle Collapsibles
    ['misc', 'vars', 'sprites'].forEach(id => {
        document.getElementById(`toggle-${id}`).onclick = () => {
            const c = document.getElementById(`container-${id}`);
            c.style.display = c.style.display === 'none' ? 'block' : 'none';
        };
    });

    // Dragging
    let isDragging = false, dragOff = [0, 0];
    document.getElementById('needle-drag').onmousedown = (e) => { 
        isDragging = true; 
        dragOff = [menu.offsetLeft - e.clientX, menu.offsetTop - e.clientY]; 
    };
    document.onmousemove = (e) => { 
        if (isDragging) { 
            menu.style.left = (e.clientX + dragOff[0]) + 'px'; 
            menu.style.top = (e.clientY + dragOff[1]) + 'px'; 
        } 
    };
    document.onmouseup = () => isDragging = false;

    // Init
    setInterval(updateList, 2000);
    updateList();
})();
