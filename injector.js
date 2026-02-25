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
    if (!vm) return alert("Billies Needle: VM not found. Open a project first!");

    // --- CREATE THE NEEDLE UI ---
    const menu = document.createElement('div');
    menu.id = "billies-needle-menu";
    menu.style = `
        position: fixed; top: 50px; right: 20px; width: 280px; max-height: 85vh;
        background: #1a1a1a; color: #00ff41; border: 2px solid #00ff41; border-radius: 4px;
        z-index: 999999; font-family: 'Courier New', monospace; overflow-y: auto;
        box-shadow: 0 0 15px rgba(0,255,65,0.4); padding: 12px;
    `;

    menu.innerHTML = `
        <div id="drag-header" style="cursor: move; font-weight: bold; border-bottom: 1px solid #00ff41; padding-bottom: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; font-size: 14px;">
            <span>[ BILLIES NEEDLE ]</span>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor:pointer; color:red;">[X]</span>
        </div>
        
        <div style="margin-bottom: 10px;">
            <label style="font-size: 11px;">GAME SPEED (TEMPO)</label>
            <input type="range" id="speed-hack" min="10" max="500" value="100" style="width:100%; accent-color:#00ff41;">
        </div>

        <input type="text" id="needle-search" placeholder="Search variables..." style="width: 100%; background: #000; color: #00ff41; border: 1px solid #00ff41; padding: 4px; margin-bottom: 10px; font-size: 12px;">

        <div id="needle-content">
            <div style="font-weight:bold; font-size:12px; text-decoration:underline;">MEMORY MAP (VARS)</div>
            <div id="needle-vars" style="margin-bottom: 10px;"></div>
            <div style="font-weight:bold; font-size:12px; text-decoration:underline;">SPRITE CLUSTERS</div>
            <div id="needle-sprites"></div>
        </div>
    `;

    document.body.appendChild(menu);

    // --- DRAG LOGIC ---
    let isDragging = false, offset = [0, 0];
    const header = document.getElementById('drag-header');
    header.onmousedown = (e) => { isDragging = true; offset = [menu.offsetLeft - e.clientX, menu.offsetTop - e.clientY]; };
    document.onmousemove = (e) => { if (isDragging) { menu.style.left = (e.clientX + offset[0]) + 'px'; menu.style.top = (e.clientY + offset[1]) + 'px'; } };
    document.onmouseup = () => isDragging = false;

    // --- SPEED HACK LOGIC ---
    document.getElementById('speed-hack').oninput = (e) => {
        // Manipulates the internal runtime step 
        vm.runtime.setTempo(Number(e.target.value)); 
    };

    // --- RENDER REFRESH ---
    function updateNeedle() {
        const searchTerm = document.getElementById('needle-search').value.toLowerCase();
        const varList = document.getElementById('needle-vars');
        const spriteList = document.getElementById('needle-sprites');
        
        varList.innerHTML = '';
        spriteList.innerHTML = '';

        vm.runtime.targets.forEach(target => {
            // Render Variables
            Object.values(target.variables).forEach(v => {
                if (v.name.toLowerCase().includes(searchTerm)) {
                    const row = document.createElement('div');
                    row.style = "display: flex; justify-content: space-between; font-size: 11px; margin: 3px 0;";
                    row.innerHTML = `<span>${v.name}:</span><input type="text" value="${v.value}" style="width:50px; background:#000; color:#fff; border:1px solid #333;">`;
                    row.querySelector('input').onchange = (e) => { v.value = e.target.value; };
                    varList.appendChild(row);
                }
            });

            // Render Sprites
            if (!target.isStage && target.sprite.name.toLowerCase().includes(searchTerm)) {
                const row = document.createElement('div');
                row.style = "display: flex; justify-content: space-between; font-size: 11px; margin: 3px 0;";
                row.innerHTML = `<span>${target.sprite.name}</span><button style="font-size:10px; cursor:pointer;">RESIZE</button>`;
                row.querySelector('button').onclick = () => {
                    let newSize = prompt(`Set size for ${target.sprite.name}:`, target.size);
                    if (newSize) target.setSize(Number(newSize));
                };
                spriteList.appendChild(row);
            }
        });
    }

    // Refresh every 3 seconds to catch dynamic changes
    const refreshLoop = setInterval(() => {
        if (!document.getElementById('billies-needle-menu')) return clearInterval(refreshLoop);
        updateNeedle();
    }, 3000);

    updateNeedle();
    console.log("Billies Needle Injected Successfully.");
})();
