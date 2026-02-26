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

    // --- CREATE THE NEEDLE UI ---
    const menu = document.createElement('div');
    menu.id = "billies-needle-menu";
    menu.style = `
        position: fixed; top: 50px; right: 20px; width: 300px; max-height: 85vh;
        background: #1a1a1a; color: #00ff41; border: 2px solid #00ff41; border-radius: 4px;
        z-index: 999999; font-family: 'Courier New', monospace; overflow-y: auto;
        box-shadow: 0 0 15px rgba(0,255,65,0.4); padding: 12px;
    `;
    
    menu.innerHTML = `
        <div id="drag-header" style="cursor: move; font-weight: bold; border-bottom: 1px solid #00ff41; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between;">
            <span>[ BILLIES NEEDLE ]</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor:pointer; color:red;">[X]</span>
        </div>

        <input type="text" id="needle-search" placeholder="Search..." style="width: 100%; background: #000; color: #00ff41; border: 1px solid #00ff41; padding: 4px; margin-bottom: 10px; font-size: 12px; box-sizing: border-box;">
        
        <div id="needle-content">
            <div id="btn-collapse-misc" style="font-weight:bold; font-size:12px; color:#fff; cursor:pointer; background:#222; padding:4px; margin-bottom:2px; display:flex; justify-content:space-between; border:1px solid #444;">
                <span>MISC CONTROLS</span><span id="indicator-misc">[-]</span>
            </div>
            <div id="needle-misc" style="margin-bottom: 10px; padding: 8px; border: 1px solid #222; background: #111;">
                <label style="font-size: 10px; display:block; margin-bottom:5px;">ENGINE SPEED (FPS)</label>
                <input type="range" id="speed-hack" min="1" max="120" value="30" style="width:100%; accent-color:#00ff41; margin-bottom:10px;">
                <button id="btn-freeze" style="width:100%; cursor:pointer; background:#000; color:#00ff41; border:1px solid #00ff41; padding:5px; font-family:inherit; font-size:11px; font-weight:bold;">FREEZE ENGINE</button>
            </div>

            <div id="btn-collapse-vars" style="font-weight:bold; font-size:12px; color:#fff; cursor:pointer; background:#222; padding:4px; margin-bottom:2px; display:flex; justify-content:space-between; border:1px solid #444;">
                <span>MEMORY MAP</span><span id="indicator-vars">[-]</span>
            </div>
            <div id="needle-vars" style="margin-bottom: 10px; overflow:hidden;"></div>

            <div id="btn-collapse-sprites" style="font-weight:bold; font-size:12px; color:#fff; cursor:pointer; background:#222; padding:4px; margin-bottom:2px; display:flex; justify-content:space-between; border:1px solid #444;">
                <span>SPRITE CLUSTERS</span><span id="indicator-sprites">[-]</span>
            </div>
            <div id="needle-sprites" style="overflow:hidden;"></div>
        </div>
    `;
    document.body.appendChild(menu);

    // --- COLLAPSE LOGIC ---
    const toggleSection = (id) => {
        const el = document.getElementById(`needle-${id}`);
        const ind = document.getElementById(`indicator-${id}`);
        const isHidden = el.style.display === 'none';
        el.style.display = isHidden ? 'block' : 'none';
        ind.innerText = isHidden ? '[-]' : '[+]';
    };

    document.getElementById('btn-collapse-misc').onclick = () => toggleSection('misc');
    document.getElementById('btn-collapse-vars').onclick = () => toggleSection('vars');
    document.getElementById('btn-collapse-sprites').onclick = () => toggleSection('sprites');

    // --- DRAG LOGIC ---
    let isDragging = false, offset = [0, 0];
    const header = document.getElementById('drag-header');
    header.onmousedown = (e) => { isDragging = true; offset = [menu.offsetLeft - e.clientX, menu.offsetTop - e.clientY]; };
    document.onmousemove = (e) => { if (isDragging) { menu.style.left = (e.clientX + offset[0]) + 'px'; menu.style.top = (e.clientY + offset[1]) + 'px'; } };
    document.onmouseup = () => isDragging = false;

    // --- ENGINE LOGIC ---
    document.getElementById('speed-hack').oninput = (e) => {
        const fps = Number(e.target.value);
        if (vm.setFramerate) vm.setFramerate(fps);
        else vm.runtime.currentStepTime = 1000 / fps;
    };

    let isFrozen = false;
    document.getElementById('btn-freeze').onclick = function() {
        isFrozen = !isFrozen;
        if (isFrozen) {
            vm.runtime.pause();
            this.innerText = "UNFREEZE ENGINE";
            this.style.color = "#ff4444";
            this.style.borderColor = "#ff4444";
        } else {
            vm.runtime.resume();
            this.innerText = "FREEZE ENGINE";
            this.style.color = "#00ff41";
            this.style.borderColor = "#00ff41";
        }
    };

    // --- REFRESH FUNCTION ---
    function updateNeedle() {
        const searchTerm = document.getElementById('needle-search').value.toLowerCase();
        const varList = document.getElementById('needle-vars');
        const spriteList = document.getElementById('needle-sprites');
        
        if (document.activeElement.tagName === 'INPUT' && document.activeElement.id !== 'needle-search') return;

        varList.innerHTML = '';
        spriteList.innerHTML = '';

        vm.runtime.targets.forEach(target => {
            // 1. Variables
            Object.values(target.variables).forEach(v => {
                if (v.name.toLowerCase().includes(searchTerm)) {
                    const row = document.createElement('div');
                    row.style = "display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 4px; padding: 2px 0;";
                    row.innerHTML = `<span style="color:#00ff41; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:140px;">${v.name}:</span><input type="text" value="${v.value}" style="width:60px; background:#000; color:#fff; border:1px solid #333; text-align:center;">`;
                    row.querySelector('input').onchange = (e) => { v.value = e.target.value; };
                    varList.appendChild(row);
                }
            });

            // 2. Sprites
            if (!target.isStage && target.sprite.name.toLowerCase().includes(searchTerm)) {
                const row = document.createElement('div');
                row.style = "display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 6px; align-items: center; border-left: 1px solid #00ff41; padding-left: 5px;";
                
                const isVisible = target.visible;
                row.innerHTML = `
                    <span style="max-width:90px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${target.sprite.name}</span>
                    <div>
                        <button class="v-btn" style="padding:2px 5px; cursor:pointer; background:#000; color:${isVisible ? '#ff4444' : '#44ff44'}; border:1px solid ${isVisible ? '#ff4444' : '#44ff44'}; font-size:9px;">
                            ${isVisible ? 'HIDE' : 'SHOW'}
                        </button>
                        <button class="r-btn" style="padding:2px 5px; cursor:pointer; background:#000; color:#fff; border:1px solid #fff; font-size:9px; margin-left:3px;">
                            SIZE
                        </button>
                    </div>
                `;

                row.querySelector('.v-btn').onclick = () => {
                    target.setVisible(!target.visible);
                    vm.runtime.requestRedraw();
                    updateNeedle();
                };

                row.querySelector('.r-btn').onclick = () => {
                    let val = prompt(`New size for ${target.sprite.name}:`, target.size);
                    if (val) target.setSize(Number(val));
                };

                spriteList.appendChild(row);
            }
        });
    }

    const loop = setInterval(() => {
        if (!document.getElementById('billies-needle-menu')) return clearInterval(loop);
        updateNeedle();
    }, 3000);

    document.getElementById('needle-search').oninput = updateNeedle;
    updateNeedle();
    console.log("Billies Needle: MISC Section and Freeze Active.");
})();
